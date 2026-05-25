import { Card, GameStatus, LogEntry, Move } from "@/lib/big2/types";

export type RoomStatus = "lobby" | "game";

export interface LobbyPlayer {
  id: string;
  socketId: string;
  name: string;
  seatIndex: 0 | 1 | 2 | 3;
  isHost: boolean;
  connected: boolean;
}

export interface LobbyRoom {
  code: string;
  createdAt: number;
  maxPlayers: number;
  players: LobbyPlayer[];
  status: RoomStatus;
}

export interface LobbySessionState {
  name: string;
  playerId: string;
  roomCode: string;
  seatIndex: number | null;
  status: RoomStatus;
}

export interface CreateRoomRequest {
  name: string;
  playerId?: string | null;
}

export interface JoinRoomRequest {
  name: string;
  playerId?: string | null;
  preferredSeatIndex?: number | null;
  roomCode: string;
}

export interface StartGameRequest {
  playerId: string;
  roomCode: string;
}

export interface RestartGameRequest {
  playerId: string;
  roomCode: string;
}

export interface LobbyJoinSuccess {
  player: LobbyPlayer;
  room: LobbyRoom;
}

export interface PublicGamePlayer {
  cardCount: number;
  connected: boolean;
  id: string;
  isHost: boolean;
  name: string;
  seatIndex: 0 | 1 | 2 | 3;
}

export interface PublicPassState {
  isFirstTurn: boolean;
  isStartingTrick: boolean;
  passesInRow: number;
  playersPassed: string[];
}

export interface RecentGameAction {
  at: number;
  clearedCenter?: boolean;
  playerId: string;
  type: "play" | "pass" | "win";
}

export interface PublicGameState {
  currentMove: Move | null;
  currentTurnPlayerId: string;
  gameLog: LogEntry[];
  lastAction: RecentGameAction | null;
  lastPlayedPlayerId: string | null;
  players: PublicGamePlayer[];
  roomCode: string;
  startedAt: number;
  status: GameStatus;
  turnCount: number;
  winnerPlayerId: string | null;
  passState: PublicPassState;
}

export interface PrivateHandPayload {
  hand: Card[];
  playerId: string;
  roomCode: string;
}

export interface GameStartedPayload {
  room: LobbyRoom;
  state: PublicGameState;
  startedByPlayerId: string;
}

export interface PlayCardsRequest {
  cardIds: string[];
  playerId: string;
  roomCode: string;
}

export interface PassTurnRequest {
  playerId: string;
  roomCode: string;
}

export interface LeaveRoomRequest {
  playerId: string;
  roomCode: string;
}

export interface InvalidMovePayload {
  message: string;
}

export interface PlayerDisconnectedPayload {
  playerId: string;
  playerName: string;
  reason: "disconnect" | "leave";
  roomCode: string;
}

export interface GameFinishedPayload {
  roomCode: string;
  state: PublicGameState;
  winnerPlayerId: string;
}

export interface SocketAck<T> {
  data?: T;
  error?: string;
  ok: boolean;
}
