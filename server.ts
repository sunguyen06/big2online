import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { LobbyRoomStore } from "./lib/multiplayer/room-store";
import {
  CreateRoomRequest,
  GameStartedPayload,
  JoinRoomRequest,
  LobbyJoinSuccess,
  LobbyRoom,
  SocketAck,
  StartGameRequest,
} from "./lib/multiplayer/types";
import { sanitizeDisplayName, validateDisplayName, validateRoomCode } from "./lib/multiplayer/utils";

const hostname = process.env.LOBBY_HOST || "localhost";
const port = Number(process.env.LOBBY_PORT ?? 8000);
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
const allowedOrigins = [frontendOrigin, "http://127.0.0.1:3000"];
const store = new LobbyRoomStore();

const httpServer = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: true, service: "big2online-lobby" }));
    return;
  }

  response.writeHead(404, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ error: "Not found" }));
});

const io = new SocketIOServer(httpServer, {
  cors: {
    credentials: false,
    methods: ["GET", "POST"],
    origin: allowedOrigins,
  },
  path: "/socket.io",
});

const emitRoomUpdate = (room: LobbyRoom) => {
  io.to(room.code).emit("lobby:room-updated", room);
};

const detachSocketFromTrackedRoom = (socketId: string) => {
  const removal = store.removeSocket(socketId);

  if (removal && !removal.deleted && removal.room) {
    emitRoomUpdate(removal.room);
  }
};

const bindSocketToRoom = (socketId: string, roomCode: string) => {
  const socket = io.sockets.sockets.get(socketId);

  if (!socket) {
    return;
  }

  for (const joinedRoom of socket.rooms) {
    if (joinedRoom !== socket.id) {
      socket.leave(joinedRoom);
    }
  }

  socket.join(roomCode);
};

const succeed = <T>(ack: (response: SocketAck<T>) => void, data: T) => {
  ack({
    data,
    ok: true,
  });
};

const fail = <T>(ack: (response: SocketAck<T>) => void, message: string) => {
  ack({
    error: message,
    ok: false,
  });
};

io.on("connection", (socket) => {
  socket.on("lobby:create-room", (payload: CreateRoomRequest, ack: (response: SocketAck<LobbyJoinSuccess>) => void) => {
    const name = sanitizeDisplayName(payload.name);
    const nameValidation = validateDisplayName(name);

    if (!nameValidation.valid) {
      fail(ack, nameValidation.message);
      return;
    }

    try {
      detachSocketFromTrackedRoom(socket.id);
      const result = store.createRoom(name, socket.id, payload.playerId);
      bindSocketToRoom(socket.id, result.room.code);
      succeed(ack, result);
      emitRoomUpdate(result.room);
    } catch (error) {
      fail(ack, error instanceof Error ? error.message : "Unable to create that room.");
    }
  });

  socket.on("lobby:join-room", (payload: JoinRoomRequest, ack: (response: SocketAck<LobbyJoinSuccess>) => void) => {
    const name = sanitizeDisplayName(payload.name);
    const nameValidation = validateDisplayName(name);
    const roomCodeValidation = validateRoomCode(payload.roomCode);

    if (!nameValidation.valid) {
      fail(ack, nameValidation.message);
      return;
    }

    if (!roomCodeValidation.valid) {
      fail(ack, roomCodeValidation.message);
      return;
    }

    try {
      detachSocketFromTrackedRoom(socket.id);
      const result = store.joinRoom({
        name,
        preferredSeatIndex: payload.preferredSeatIndex,
        requestedPlayerId: payload.playerId,
        roomCode: payload.roomCode,
        socketId: socket.id,
      });
      bindSocketToRoom(socket.id, result.room.code);
      succeed(ack, result);
      emitRoomUpdate(result.room);
    } catch (error) {
      fail(ack, error instanceof Error ? error.message : "Unable to join that room.");
    }
  });

  socket.on("lobby:resume-session", (payload: JoinRoomRequest, ack: (response: SocketAck<LobbyJoinSuccess>) => void) => {
    const name = sanitizeDisplayName(payload.name);
    const nameValidation = validateDisplayName(name);
    const roomCodeValidation = validateRoomCode(payload.roomCode);

    if (!payload.playerId) {
      fail(ack, "No saved player session was provided.");
      return;
    }

    if (!nameValidation.valid) {
      fail(ack, nameValidation.message);
      return;
    }

    if (!roomCodeValidation.valid) {
      fail(ack, roomCodeValidation.message);
      return;
    }

    try {
      const result = store.resumeSession({
        name,
        playerId: payload.playerId,
        preferredSeatIndex: payload.preferredSeatIndex,
        roomCode: payload.roomCode,
        socketId: socket.id,
      });
      bindSocketToRoom(socket.id, result.room.code);
      succeed(ack, result);
      emitRoomUpdate(result.room);
    } catch (error) {
      fail(ack, error instanceof Error ? error.message : "Unable to restore that room session.");
    }
  });

  socket.on("lobby:start-game", (payload: StartGameRequest, ack: (response: SocketAck<LobbyRoom>) => void) => {
    try {
      const room = store.startGame(payload.roomCode, payload.playerId);
      const gamePayload: GameStartedPayload = {
        room,
        startedByPlayerId: payload.playerId,
      };

      succeed(ack, room);
      io.to(room.code).emit("lobby:game-started", gamePayload);
      emitRoomUpdate(room);
    } catch (error) {
      fail(ack, error instanceof Error ? error.message : "Unable to start the game.");
    }
  });

  socket.on("disconnect", () => {
    detachSocketFromTrackedRoom(socket.id);
  });
});

httpServer.listen(port, hostname, () => {
  console.log(`> Big 2 lobby backend ready on http://${hostname}:${port}`);
  console.log(`> Allowing frontend origins: ${allowedOrigins.join(", ")}`);
});
