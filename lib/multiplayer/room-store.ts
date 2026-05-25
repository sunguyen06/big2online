import { randomUUID } from "node:crypto";
import { createRoomCode, normalizeRoomCode, ROOM_CAPACITY, sanitizeDisplayName } from "./utils";
import { LobbyPlayer, LobbyRoom } from "./types";

interface RoomState extends LobbyRoom {}

interface SocketMembership {
  playerId: string;
  roomCode: string;
}

export class LobbyRoomStore {
  private readonly rooms = new Map<string, RoomState>();
  private readonly socketMembership = new Map<string, SocketMembership>();

  createRoom(name: string, socketId: string, requestedPlayerId?: string | null) {
    const roomCode = createRoomCode(new Set(this.rooms.keys()));
    const player = this.createPlayer({
      id: this.createPlayerId(requestedPlayerId),
      isHost: true,
      name,
      seatIndex: 0,
      socketId,
    });

    const room: RoomState = {
      code: roomCode,
      createdAt: Date.now(),
      maxPlayers: ROOM_CAPACITY,
      players: [player],
      status: "lobby",
    };

    this.rooms.set(roomCode, room);
    this.bindSocket(roomCode, player.id, socketId);

    return {
      player: this.clonePlayer(player),
      room: this.toSnapshot(room),
    };
  }

  joinRoom({
    name,
    preferredSeatIndex,
    requestedPlayerId,
    roomCode,
    socketId,
  }: {
    name: string;
    preferredSeatIndex?: number | null;
    requestedPlayerId?: string | null;
    roomCode: string;
    socketId: string;
  }) {
    const room = this.getRoomOrThrow(roomCode);
    this.ensureLobbyJoinable(room);

    if (room.players.length >= ROOM_CAPACITY) {
      throw new Error("That room is already full.");
    }

    const seatIndex = this.getNextSeat(room, preferredSeatIndex ?? undefined);

    if (seatIndex === null) {
      throw new Error("No seats are available in that room.");
    }

    const player = this.createPlayer({
      id: this.createPlayerId(requestedPlayerId),
      isHost: false,
      name,
      seatIndex,
      socketId,
    });

    room.players.push(player);
    this.sortPlayers(room);
    this.bindSocket(room.code, player.id, socketId);
    this.reassignHost(room);

    return {
      player: this.clonePlayer(player),
      room: this.toSnapshot(room),
    };
  }

  resumeSession({
    name,
    playerId,
    preferredSeatIndex,
    roomCode,
    socketId,
  }: {
    name: string;
    playerId: string;
    preferredSeatIndex?: number | null;
    roomCode: string;
    socketId: string;
  }) {
    const room = this.getRoomOrThrow(roomCode);
    const existingPlayer = room.players.find((player) => player.id === playerId);

    if (existingPlayer) {
      this.unbindSocket(existingPlayer.socketId);
      existingPlayer.connected = true;
      existingPlayer.name = sanitizeDisplayName(name);
      existingPlayer.socketId = socketId;
      this.bindSocket(room.code, existingPlayer.id, socketId);
      this.sortPlayers(room);

      return {
        player: this.clonePlayer(existingPlayer),
        room: this.toSnapshot(room),
      };
    }

    if (room.status !== "lobby") {
      throw new Error("The game is already in progress, and that player session is no longer in the room.");
    }

    if (room.players.length >= ROOM_CAPACITY) {
      throw new Error("That room is full, so the previous session could not be restored.");
    }

    // TODO: Add a short disconnect grace period if we want stronger seat reclaim guarantees.
    const seatIndex = this.getNextSeat(room, preferredSeatIndex ?? undefined);

    if (seatIndex === null) {
      throw new Error("No seat is available to restore that session.");
    }

    const player = this.createPlayer({
      id: playerId,
      isHost: room.players.length === 0,
      name,
      seatIndex,
      socketId,
    });

    room.players.push(player);
    this.sortPlayers(room);
    this.bindSocket(room.code, player.id, socketId);
    this.reassignHost(room);

    return {
      player: this.clonePlayer(player),
      room: this.toSnapshot(room),
    };
  }

  startGame(roomCode: string, playerId: string) {
    const room = this.getRoomOrThrow(roomCode);
    const player = room.players.find((entry) => entry.id === playerId);

    if (!player) {
      throw new Error("You are no longer in that room.");
    }

    if (!player.isHost) {
      throw new Error("Only the host can start the game.");
    }

    if (room.players.length !== ROOM_CAPACITY || room.players.some((entry) => !entry.connected)) {
      throw new Error("You need 4 connected players before starting.");
    }

    room.status = "game";

    return this.toSnapshot(room);
  }

  removeSocket(socketId: string) {
    const membership = this.socketMembership.get(socketId);

    if (!membership) {
      return null;
    }

    const room = this.rooms.get(membership.roomCode);
    this.socketMembership.delete(socketId);

    if (!room) {
      return null;
    }

    room.players = room.players.filter((player) => player.id !== membership.playerId);

    if (room.players.length === 0) {
      this.rooms.delete(room.code);
      return {
        deleted: true,
        room: null,
        roomCode: membership.roomCode,
      };
    }

    this.sortPlayers(room);
    this.reassignHost(room);

    return {
      deleted: false,
      room: this.toSnapshot(room),
      roomCode: room.code,
    };
  }

  getRoom(roomCode: string) {
    const room = this.rooms.get(normalizeRoomCode(roomCode));
    return room ? this.toSnapshot(room) : null;
  }

  private bindSocket(roomCode: string, playerId: string, socketId: string) {
    this.socketMembership.set(socketId, {
      playerId,
      roomCode,
    });
  }

  private unbindSocket(socketId: string) {
    if (!socketId) {
      return;
    }

    this.socketMembership.delete(socketId);
  }

  private createPlayer({
    id,
    isHost,
    name,
    seatIndex,
    socketId,
  }: {
    id: string;
    isHost: boolean;
    name: string;
    seatIndex: number;
    socketId: string;
  }): LobbyPlayer {
    return {
      connected: true,
      id,
      isHost,
      name: sanitizeDisplayName(name),
      seatIndex: seatIndex as LobbyPlayer["seatIndex"],
      socketId,
    };
  }

  private createPlayerId(requestedPlayerId?: string | null) {
    return requestedPlayerId?.trim() || randomUUID();
  }

  private clonePlayer(player: LobbyPlayer): LobbyPlayer {
    return { ...player };
  }

  private ensureLobbyJoinable(room: RoomState) {
    if (room.status !== "lobby") {
      throw new Error("That room has already started its game.");
    }
  }

  private getNextSeat(room: RoomState, preferredSeatIndex?: number) {
    const used = new Set<number>(room.players.map((player) => player.seatIndex));

    if (
      typeof preferredSeatIndex === "number" &&
      preferredSeatIndex >= 0 &&
      preferredSeatIndex < ROOM_CAPACITY &&
      !used.has(preferredSeatIndex)
    ) {
      return preferredSeatIndex;
    }

    for (let seatIndex = 0; seatIndex < ROOM_CAPACITY; seatIndex += 1) {
      if (!used.has(seatIndex)) {
        return seatIndex;
      }
    }

    return null;
  }

  private getRoomOrThrow(roomCode: string) {
    const normalizedCode = normalizeRoomCode(roomCode);
    const room = this.rooms.get(normalizedCode);

    if (!room) {
      throw new Error("That room code does not exist.");
    }

    return room;
  }

  private reassignHost(room: RoomState) {
    const hostPlayerId = room.players[0]?.id ?? null;

    room.players = room.players.map((player) => ({
      ...player,
      isHost: player.id === hostPlayerId,
    }));
  }

  private sortPlayers(room: RoomState) {
    room.players.sort((a, b) => a.seatIndex - b.seatIndex);
  }

  private toSnapshot(room: RoomState): LobbyRoom {
    return {
      ...room,
      players: room.players.map((player) => this.clonePlayer(player)),
    };
  }
}
