import { randomUUID } from "node:crypto";
import {
  applyMove,
  applyPass,
  canPlayMove,
  createGameStateForPlayers,
  setPhase,
} from "@/lib/big2/engine";
import { Card, GameState, Player } from "@/lib/big2/types";
import {
  GameFinishedPayload,
  GameStartedPayload,
  InvalidMovePayload,
  LobbyPlayer,
  LobbyRoom,
  PlayerDisconnectedPayload,
  PrivateHandPayload,
  PublicGameState,
  RestartGameRequest,
  RecentGameAction,
} from "@/lib/multiplayer/types";
import { createRoomCode, MIN_ROOM_PLAYERS, normalizeRoomCode, ROOM_CAPACITY, sanitizeDisplayName } from "./utils";

interface ActiveGameState {
  lastAction: RecentGameAction | null;
  playerOrder: string[];
  playersPassed: string[];
  startedAt: number;
  state: GameState;
}

interface RoomState extends LobbyRoom {
  game: ActiveGameState | null;
}

interface SocketMembership {
  playerId: string;
  roomCode: string;
}

interface RoomSnapshotBundle {
  finished: GameFinishedPayload | null;
  privateHands: PrivateHandPayload[];
  room: LobbyRoom;
  state: PublicGameState | null;
}

interface DepartureResult {
  deleted: boolean;
  disconnectEvent: PlayerDisconnectedPayload | null;
  room: LobbyRoom | null;
  state: PublicGameState | null;
}

const SEAT_BY_INDEX: Array<Player["seat"]> = ["south", "west", "north", "east"];

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
      game: null,
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
      throw new Error("That player session is no longer active in this game.");
    }

    if (room.players.length >= ROOM_CAPACITY) {
      throw new Error("That room is full, so the previous session could not be restored.");
    }

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

  startGame(roomCode: string, playerId: string): GameStartedPayload {
    const room = this.getRoomOrThrow(roomCode);
    const player = room.players.find((entry) => entry.id === playerId);

    if (!player) {
      throw new Error("You are no longer in that room.");
    }

    if (!player.isHost) {
      throw new Error("Only the host can start the game.");
    }

    if (!this.canStartRound(room)) {
      throw new Error("You need at least 3 connected players before starting.");
    }

    return this.beginRound(room, playerId);
  }

  restartGame(roomCode: string, playerId: RestartGameRequest["playerId"]): GameStartedPayload {
    const room = this.getRoomOrThrow(roomCode);
    const player = room.players.find((entry) => entry.id === playerId);

    if (!player) {
      throw new Error("You are no longer in that room.");
    }

    if (!player.isHost) {
      throw new Error("Only the host can start a new round.");
    }

    if (!room.game || room.game.state.status !== "ended") {
      throw new Error("Finish the current round before dealing another one.");
    }

    if (!this.canStartRound(room)) {
      throw new Error("You need at least 3 connected players before starting.");
    }

    return this.beginRound(room, playerId);
  }

  playCards(roomCode: string, playerId: string, cardIds: string[]) {
    const room = this.getRoomOrThrow(roomCode);
    const game = this.requireActiveGame(room);
    const playerIndex = this.getPlayerIndexById(game, playerId);

    if (game.state.turn.currentPlayer !== playerIndex) {
      throw this.invalidMove("Waiting for your turn.");
    }

    const cards = this.resolveCardsFromIds(game.state.players[playerIndex].hand, cardIds);
    const validation = canPlayMove(
      cards,
      game.state.turn.currentMove,
      game.state.turn.isStartingTrick,
      game.state.turn.isFirstTurn,
    );

    if (!validation.valid || !validation.move) {
      throw this.invalidMove(this.normalizeInvalidMessage(validation.message));
    }

    game.state = applyMove(game.state, playerIndex, validation.move);
    game.playersPassed = [];
    game.lastAction = {
      at: Date.now(),
      playerId,
      type: game.state.winner === null ? "play" : "win",
    };

    return this.buildRoomBundle(room);
  }

  passTurn(roomCode: string, playerId: string) {
    const room = this.getRoomOrThrow(roomCode);
    const game = this.requireActiveGame(room);
    const playerIndex = this.getPlayerIndexById(game, playerId);

    if (game.state.turn.currentPlayer !== playerIndex) {
      throw this.invalidMove("Waiting for your turn.");
    }

    if (game.state.turn.isStartingTrick || !game.state.turn.currentMove) {
      throw this.invalidMove("You cannot pass while starting a trick.");
    }

    const passTarget = game.state.turn.lastValidPlayPlayer;
    const nextPlayersPassed = [...game.playersPassed, playerId];

    game.state = applyPass(game.state, playerIndex);
    const clearedCenter = game.state.turn.isStartingTrick && game.state.turn.currentMove === null;
    game.playersPassed = clearedCenter ? [] : nextPlayersPassed;
    game.lastAction = {
      at: Date.now(),
      clearedCenter,
      playerId,
      type: "pass",
    };

    if (clearedCenter) {
      const controllingPlayerId = game.playerOrder[passTarget];
      game.lastAction = {
        ...game.lastAction,
        clearedCenter: true,
      };

      if (controllingPlayerId) {
        game.playersPassed = [];
      }
    }

    return this.buildRoomBundle(room);
  }

  leaveRoom(roomCode: string, playerId: string, socketId: string) {
    const room = this.getRoomOrThrow(roomCode);
    const player = room.players.find((entry) => entry.id === playerId);

    if (!player) {
      throw new Error("You are no longer in that room.");
    }

    this.socketMembership.delete(socketId);

    return this.detachPlayer(room, player.id, "leave");
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

    return this.detachPlayer(room, membership.playerId, "disconnect");
  }

  getRoom(roomCode: string) {
    const room = this.rooms.get(normalizeRoomCode(roomCode));
    return room ? this.toSnapshot(room) : null;
  }

  getPublicGameState(roomCode: string) {
    const room = this.rooms.get(normalizeRoomCode(roomCode));

    if (!room || !room.game) {
      return null;
    }

    return this.toPublicGameState(room);
  }

  getPrivateHand(roomCode: string, playerId: string) {
    const room = this.rooms.get(normalizeRoomCode(roomCode));

    if (!room?.game) {
      return null;
    }

    const game = room.game;
    const playerIndex = game.playerOrder.indexOf(playerId);

    if (playerIndex === -1) {
      return null;
    }

    return this.makePrivateHandPayload(room.code, playerId, game.state.players[playerIndex].hand);
  }

  getPlayerIdForSocket(socketId: string) {
    return this.socketMembership.get(socketId)?.playerId ?? null;
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

  private buildRoomBundle(room: RoomState): RoomSnapshotBundle {
    const state = room.game ? this.toPublicGameState(room) : null;
    const privateHands = room.game ? this.buildPrivateHands(room) : [];
    const winnerPlayerId = state?.winnerPlayerId ?? null;

    return {
      finished:
        winnerPlayerId && state
          ? {
              roomCode: room.code,
              state,
              winnerPlayerId,
            }
          : null,
      privateHands,
      room: this.toSnapshot(room),
      state,
    };
  }

  private buildPrivateHands(room: RoomState) {
    const game = this.requireActiveGame(room);

    return game.playerOrder.map((playerId, index) =>
      this.makePrivateHandPayload(room.code, playerId, game.state.players[index].hand),
    );
  }

  private clonePlayer(player: LobbyPlayer): LobbyPlayer {
    return { ...player };
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

  private detachPlayer(room: RoomState, playerId: string, reason: PlayerDisconnectedPayload["reason"]): DepartureResult {
    const player = room.players.find((entry) => entry.id === playerId);

    if (!player) {
      return {
        deleted: false,
        disconnectEvent: null,
        room: this.toSnapshot(room),
        state: room.game ? this.toPublicGameState(room) : null,
      };
    }

    if (room.status === "lobby" || !room.game) {
      room.players = room.players.filter((entry) => entry.id !== playerId);

      if (room.players.length === 0) {
        this.rooms.delete(room.code);
        return {
          deleted: true,
          disconnectEvent: null,
          room: null,
          state: null,
        };
      }

      this.sortPlayers(room);
      this.reassignHost(room);

      return {
        deleted: false,
        disconnectEvent: {
          playerId: player.id,
          playerName: player.name,
          reason,
          roomCode: room.code,
        },
        room: this.toSnapshot(room),
        state: null,
      };
    }

    player.connected = false;
    player.socketId = "";
    this.reassignHost(room, true);

    if (room.players.every((entry) => !entry.connected)) {
      this.rooms.delete(room.code);
      return {
        deleted: true,
        disconnectEvent: {
          playerId: player.id,
          playerName: player.name,
          reason,
          roomCode: room.code,
        },
        room: null,
        state: null,
      };
    }

    return {
      deleted: false,
      disconnectEvent: {
        playerId: player.id,
        playerName: player.name,
        reason,
        roomCode: room.code,
      },
      room: this.toSnapshot(room),
      state: this.toPublicGameState(room),
    };
  }

  private ensureLobbyJoinable(room: RoomState) {
    if (room.status !== "lobby") {
      throw new Error("That room has already started its game.");
    }
  }

  private beginRound(room: RoomState, playerId: string): GameStartedPayload {
    const state = setPhase(
      createGameStateForPlayers(
        room.players.map((entry, index) => ({
          id: index,
          kind: "human",
          name: entry.name,
          seat: SEAT_BY_INDEX[index],
        })),
      ),
      "playing",
    );

    room.status = "game";
    room.game = {
      lastAction: null,
      playerOrder: room.players.map((entry) => entry.id),
      playersPassed: [],
      startedAt: Date.now(),
      state,
    };

    return {
      room: this.toSnapshot(room),
      startedByPlayerId: playerId,
      state: this.toPublicGameState(room),
    };
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

  private getPlayerIndexById(game: ActiveGameState, playerId: string) {
    const playerIndex = game.playerOrder.indexOf(playerId);

    if (playerIndex === -1) {
      throw new Error("You are no longer seated in this game.");
    }

    return playerIndex;
  }

  private getRoomOrThrow(roomCode: string) {
    const normalizedCode = normalizeRoomCode(roomCode);
    const room = this.rooms.get(normalizedCode);

    if (!room) {
      throw new Error("That room code does not exist.");
    }

    return room;
  }

  private invalidMove(message: string) {
    return Object.assign(new Error(message), {
      code: "INVALID_MOVE",
      payload: { message } satisfies InvalidMovePayload,
    });
  }

  private makePrivateHandPayload(roomCode: string, playerId: string, hand: Card[]): PrivateHandPayload {
    return {
      hand: [...hand],
      playerId,
      roomCode,
    };
  }

  private normalizeInvalidMessage(message: string) {
    if (message === "Invalid card combination.") {
      return "Invalid hand";
    }

    if (message === "Selected cards do not beat the current move.") {
      return "Must beat the current play";
    }

    if (message === "You must match the number of cards in the current move.") {
      return "You must match the number of cards in the current play.";
    }

    return message;
  }

  private reassignHost(room: RoomState, preferConnected = false) {
    const hostPlayerId =
      (preferConnected ? room.players.find((player) => player.connected)?.id : null) ??
      room.players[0]?.id ??
      null;

    room.players = room.players.map((player) => ({
      ...player,
      isHost: player.id === hostPlayerId,
    }));
  }

  private requireActiveGame(room: RoomState) {
    if (!room.game || room.status !== "game") {
      throw new Error("That room does not have an active game.");
    }

    return room.game;
  }

  private resolveCardsFromIds(hand: Card[], cardIds: string[]) {
    if (cardIds.length === 0) {
      throw this.invalidMove("Select cards to play.");
    }

    const uniqueIds = new Set(cardIds);

    if (uniqueIds.size !== cardIds.length) {
      throw this.invalidMove("Invalid hand");
    }

    const cards = cardIds.map((cardId) => hand.find((card) => card.id === cardId) ?? null);

    if (cards.some((card) => card === null)) {
      throw this.invalidMove("You can only play cards from your hand.");
    }

    return cards as Card[];
  }

  private sortPlayers(room: RoomState) {
    room.players.sort((a, b) => a.seatIndex - b.seatIndex);
  }

  private canStartRound(room: RoomState) {
    return (
      room.players.length >= MIN_ROOM_PLAYERS &&
      room.players.length <= ROOM_CAPACITY &&
      room.players.every((entry) => entry.connected)
    );
  }

  private toPublicGameState(room: RoomState): PublicGameState {
    const game = this.requireActiveGame(room);
    const winnerIndex = game.state.winner;
    const currentTurnPlayerId = game.playerOrder[game.state.turn.currentPlayer];
    const lastPlayedPlayerId =
      game.state.turn.currentMovePlayer !== null
        ? game.playerOrder[game.state.turn.currentMovePlayer]
        : game.state.turn.isFirstTurn
          ? null
          : game.playerOrder[game.state.turn.lastValidPlayPlayer];

    return {
      currentMove: game.state.turn.currentMove,
      currentTurnPlayerId,
      gameLog: game.state.log,
      lastAction: game.lastAction,
      lastPlayedPlayerId,
      passState: {
        isFirstTurn: game.state.turn.isFirstTurn,
        isStartingTrick: game.state.turn.isStartingTrick,
        passesInRow: game.state.turn.passesInRow,
        playersPassed: [...game.playersPassed],
      },
      players: room.players.map((player, index) => ({
        cardCount: game.state.players[index]?.hand.length ?? 0,
        connected: player.connected,
        id: player.id,
        isHost: player.isHost,
        name: player.name,
        seatIndex: player.seatIndex,
      })),
      roomCode: room.code,
      startedAt: game.startedAt,
      status: game.state.status,
      turnCount: game.state.turnCount,
      winnerPlayerId: winnerIndex === null ? null : game.playerOrder[winnerIndex],
    };
  }

  private toSnapshot(room: RoomState): LobbyRoom {
    return {
      code: room.code,
      createdAt: room.createdAt,
      maxPlayers: room.maxPlayers,
      players: room.players.map((player) => this.clonePlayer(player)),
      status: room.status,
    };
  }
}
