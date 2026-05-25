import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { MULTIPLAYER_EVENTS } from "./lib/multiplayer/events";
import { LobbyRoomStore } from "./lib/multiplayer/room-store";
import {
  CreateRoomRequest,
  GameStartedPayload,
  JoinRoomRequest,
  LeaveRoomRequest,
  LobbyJoinSuccess,
  LobbyRoom,
  PassTurnRequest,
  PlayCardsRequest,
  PrivateHandPayload,
  PublicGameState,
  RestartGameRequest,
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
  io.to(room.code).emit(MULTIPLAYER_EVENTS.roomUpdated, room);
};

const emitError = (socketId: string, message: string) => {
  io.to(socketId).emit(MULTIPLAYER_EVENTS.errorMessage, message);
};

const emitInvalidMove = (socketId: string, message: string) => {
  io.to(socketId).emit(MULTIPLAYER_EVENTS.invalidMove, { message });
};

const emitGameState = (roomCode: string, state: PublicGameState) => {
  io.to(roomCode).emit(MULTIPLAYER_EVENTS.gameStateUpdated, state);
};

const emitPrivateHand = (payload: PrivateHandPayload) => {
  const room = store.getRoom(payload.roomCode);
  const player = room?.players.find((entry) => entry.id === payload.playerId);

  if (!player?.socketId) {
    return;
  }

  io.to(player.socketId).emit(MULTIPLAYER_EVENTS.privateHandUpdated, payload);
};

const emitAllPrivateHands = (room: LobbyRoom) => {
  for (const player of room.players) {
    const payload = store.getPrivateHand(room.code, player.id);

    if (payload) {
      emitPrivateHand(payload);
    }
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

const fail = <T>(ack: (response: SocketAck<T>) => void, socketId: string, message: string) => {
  emitError(socketId, message);
  ack({
    error: message,
    ok: false,
  });
};

const syncGameStateForSocket = (socketId: string, roomCode: string, playerId: string) => {
  const state = store.getPublicGameState(roomCode);
  const hand = store.getPrivateHand(roomCode, playerId);

  if (state) {
    emitGameState(roomCode, state);
  }

  if (hand) {
    emitPrivateHand(hand);
  }

  const room = store.getRoom(roomCode);

  if (room) {
    emitRoomUpdate(room);
  }

  if (!state) {
    emitError(socketId, "This room does not currently have an active game.");
  }
};

const emitGameBundle = (roomCode: string, state: PublicGameState) => {
  emitGameState(roomCode, state);
  const room = store.getRoom(roomCode);

  if (room) {
    emitAllPrivateHands(room);
  }
};

const detachSocketFromTrackedRoom = (socketId: string) => {
  const removal = store.removeSocket(socketId);

  if (!removal || removal.deleted || !removal.room) {
    return;
  }

  if (removal.disconnectEvent) {
    io.to(removal.room.code).emit(MULTIPLAYER_EVENTS.playerDisconnected, removal.disconnectEvent);
  }

  emitRoomUpdate(removal.room);

  if (removal.state) {
    emitGameState(removal.room.code, removal.state);
  }
};

const validateActingPlayer = (socketId: string, playerId: string) => {
  const boundPlayerId = store.getPlayerIdForSocket(socketId);

  if (!boundPlayerId || boundPlayerId !== playerId) {
    throw new Error("This socket is not authorized for that player session.");
  }
};

io.on("connection", (socket) => {
  socket.on(MULTIPLAYER_EVENTS.createRoom, (payload: CreateRoomRequest, ack: (response: SocketAck<LobbyJoinSuccess>) => void) => {
    const name = sanitizeDisplayName(payload.name);
    const nameValidation = validateDisplayName(name);

    if (!nameValidation.valid) {
      fail(ack, socket.id, nameValidation.message);
      return;
    }

    try {
      detachSocketFromTrackedRoom(socket.id);
      const result = store.createRoom(name, socket.id, payload.playerId);
      bindSocketToRoom(socket.id, result.room.code);
      succeed(ack, result);
      emitRoomUpdate(result.room);
    } catch (error) {
      fail(ack, socket.id, error instanceof Error ? error.message : "Unable to create that room.");
    }
  });

  socket.on(MULTIPLAYER_EVENTS.joinRoom, (payload: JoinRoomRequest, ack: (response: SocketAck<LobbyJoinSuccess>) => void) => {
    const name = sanitizeDisplayName(payload.name);
    const nameValidation = validateDisplayName(name);
    const roomCodeValidation = validateRoomCode(payload.roomCode);

    if (!nameValidation.valid) {
      fail(ack, socket.id, nameValidation.message);
      return;
    }

    if (!roomCodeValidation.valid) {
      fail(ack, socket.id, roomCodeValidation.message);
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
      fail(ack, socket.id, error instanceof Error ? error.message : "Unable to join that room.");
    }
  });

  socket.on(MULTIPLAYER_EVENTS.resumeSession, (payload: JoinRoomRequest, ack: (response: SocketAck<LobbyJoinSuccess>) => void) => {
    const name = sanitizeDisplayName(payload.name);
    const nameValidation = validateDisplayName(name);
    const roomCodeValidation = validateRoomCode(payload.roomCode);

    if (!payload.playerId) {
      fail(ack, socket.id, "No saved player session was provided.");
      return;
    }

    if (!nameValidation.valid) {
      fail(ack, socket.id, nameValidation.message);
      return;
    }

    if (!roomCodeValidation.valid) {
      fail(ack, socket.id, roomCodeValidation.message);
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

      if (result.room.status === "game") {
        syncGameStateForSocket(socket.id, result.room.code, result.player.id);
      }
    } catch (error) {
      fail(ack, socket.id, error instanceof Error ? error.message : "Unable to restore that room session.");
    }
  });

  socket.on(MULTIPLAYER_EVENTS.startGame, (payload: StartGameRequest, ack: (response: SocketAck<GameStartedPayload>) => void) => {
    try {
      validateActingPlayer(socket.id, payload.playerId);
      const result = store.startGame(payload.roomCode, payload.playerId);
      succeed(ack, result);
      io.to(result.room.code).emit(MULTIPLAYER_EVENTS.roundStarted, result);
      emitRoomUpdate(result.room);
      emitGameBundle(result.room.code, result.state);
    } catch (error) {
      fail(ack, socket.id, error instanceof Error ? error.message : "Unable to start the game.");
    }
  });

  socket.on(MULTIPLAYER_EVENTS.restartGame, (payload: RestartGameRequest, ack: (response: SocketAck<GameStartedPayload>) => void) => {
    try {
      validateActingPlayer(socket.id, payload.playerId);
      const result = store.restartGame(payload.roomCode, payload.playerId);
      succeed(ack, result);
      io.to(result.room.code).emit(MULTIPLAYER_EVENTS.roundStarted, result);
      emitRoomUpdate(result.room);
      emitGameBundle(result.room.code, result.state);
    } catch (error) {
      fail(ack, socket.id, error instanceof Error ? error.message : "Unable to deal a new round.");
    }
  });

  socket.on(MULTIPLAYER_EVENTS.playCards, (payload: PlayCardsRequest, ack: (response: SocketAck<PublicGameState>) => void) => {
    try {
      validateActingPlayer(socket.id, payload.playerId);
      const result = store.playCards(payload.roomCode, payload.playerId, payload.cardIds);
      succeed(ack, result.state!);
      emitGameBundle(result.room.code, result.state!);

      if (result.finished) {
        io.to(result.room.code).emit(MULTIPLAYER_EVENTS.gameFinished, result.finished);
      }
    } catch (error) {
      if (error instanceof Error && "code" in error && (error as { code?: string }).code === "INVALID_MOVE") {
        emitInvalidMove(socket.id, error.message);
        ack({ error: error.message, ok: false });
        return;
      }

      fail(ack, socket.id, error instanceof Error ? error.message : "Unable to play those cards.");
    }
  });

  socket.on(MULTIPLAYER_EVENTS.passTurn, (payload: PassTurnRequest, ack: (response: SocketAck<PublicGameState>) => void) => {
    try {
      validateActingPlayer(socket.id, payload.playerId);
      const result = store.passTurn(payload.roomCode, payload.playerId);
      succeed(ack, result.state!);
      emitGameBundle(result.room.code, result.state!);
    } catch (error) {
      if (error instanceof Error && "code" in error && (error as { code?: string }).code === "INVALID_MOVE") {
        emitInvalidMove(socket.id, error.message);
        ack({ error: error.message, ok: false });
        return;
      }

      fail(ack, socket.id, error instanceof Error ? error.message : "Unable to pass right now.");
    }
  });

  socket.on(MULTIPLAYER_EVENTS.leaveRoom, (payload: LeaveRoomRequest, ack: (response: SocketAck<{ ok: true }>) => void) => {
    try {
      validateActingPlayer(socket.id, payload.playerId);
      const result = store.leaveRoom(payload.roomCode, payload.playerId, socket.id);
      succeed(ack, { ok: true });

      if (result.disconnectEvent && result.room) {
        io.to(result.room.code).emit(MULTIPLAYER_EVENTS.playerDisconnected, result.disconnectEvent);
        emitRoomUpdate(result.room);

        if (result.state) {
          emitGameState(result.room.code, result.state);
        }
      }
    } catch (error) {
      fail(ack, socket.id, error instanceof Error ? error.message : "Unable to leave the room.");
    }
  });

  socket.on("disconnect", () => {
    const removal = store.removeSocket(socket.id);

    if (!removal || removal.deleted) {
      return;
    }

    if (removal.disconnectEvent && removal.room) {
      io.to(removal.room.code).emit(MULTIPLAYER_EVENTS.playerDisconnected, removal.disconnectEvent);
      emitRoomUpdate(removal.room);

      if (removal.state) {
        emitGameState(removal.room.code, removal.state);
      }
    }
  });
});

httpServer.listen(port, hostname, () => {
  console.log(`> Big 2 lobby backend ready on http://${hostname}:${port}`);
  console.log(`> Allowing frontend origins: ${allowedOrigins.join(", ")}`);
});
