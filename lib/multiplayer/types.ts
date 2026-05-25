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

export interface LobbyJoinSuccess {
  player: LobbyPlayer;
  room: LobbyRoom;
}

export interface GameStartedPayload {
  room: LobbyRoom;
  startedByPlayerId: string;
}

export interface SocketAck<T> {
  data?: T;
  error?: string;
  ok: boolean;
}
