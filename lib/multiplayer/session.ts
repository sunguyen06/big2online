"use client";

import { LobbyRoom, LobbySessionState, RoomStatus } from "./types";

const LOBBY_SESSION_KEY = "big2-lobby-session";
const ROOM_SNAPSHOT_KEY = "big2-room-snapshot";
const GAME_SNAPSHOT_KEY = "big2-game-snapshot";

interface StoredRoomSnapshot {
  currentPlayerId: string;
  room: LobbyRoom;
}

export function loadLobbySession() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.sessionStorage.getItem(LOBBY_SESSION_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as LobbySessionState;
  } catch {
    window.sessionStorage.removeItem(LOBBY_SESSION_KEY);
    return null;
  }
}

export function saveLobbySession(session: LobbySessionState) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(LOBBY_SESSION_KEY, JSON.stringify(session));
}

export function clearLobbySession() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(LOBBY_SESSION_KEY);
  window.sessionStorage.removeItem(ROOM_SNAPSHOT_KEY);
  window.sessionStorage.removeItem(GAME_SNAPSHOT_KEY);
}

export function saveRoomSnapshot(room: LobbyRoom, currentPlayerId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: StoredRoomSnapshot = {
    currentPlayerId,
    room,
  };

  window.sessionStorage.setItem(ROOM_SNAPSHOT_KEY, JSON.stringify(payload));
}

export function loadRoomSnapshot() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.sessionStorage.getItem(ROOM_SNAPSHOT_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as StoredRoomSnapshot;
  } catch {
    window.sessionStorage.removeItem(ROOM_SNAPSHOT_KEY);
    return null;
  }
}

export function saveGameSnapshot(room: LobbyRoom, currentPlayerId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: StoredRoomSnapshot = {
    currentPlayerId,
    room,
  };

  window.sessionStorage.setItem(GAME_SNAPSHOT_KEY, JSON.stringify(payload));
}

export function loadGameSnapshot() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.sessionStorage.getItem(GAME_SNAPSHOT_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as StoredRoomSnapshot;
  } catch {
    window.sessionStorage.removeItem(GAME_SNAPSHOT_KEY);
    return null;
  }
}

export function updateSessionStatus(status: RoomStatus) {
  const current = loadLobbySession();

  if (!current) {
    return;
  }

  saveLobbySession({
    ...current,
    status,
  });
}
