"use client";

import { MULTIPLAYER_EVENTS } from "./events";
import { toFriendlyLobbyMessage } from "./messages";
import { CreateRoomRequest, JoinRoomRequest, LobbyJoinSuccess } from "./types";
import { emitWithAck, getLobbySocket } from "./socket-client";
import { clearLobbySession, saveLobbySession, saveRoomSnapshot } from "./session";
import { normalizeRoomCode, sanitizeDisplayName } from "./utils";

async function ensureSocketConnected() {
  const socket = getLobbySocket();

  if (socket.connected) {
    return socket;
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("The lobby server took too long to respond."));
    }, 6000);

    const handleConnect = () => {
      cleanup();
      resolve();
    };

    const handleError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleError);
    };

    socket.on("connect", handleConnect);
    socket.on("connect_error", handleError);
    socket.connect();
  });

  return socket;
}

function persistJoinResult(data: LobbyJoinSuccess) {
  saveLobbySession({
    name: data.player.name,
    playerId: data.player.id,
    roomCode: data.room.code,
    seatIndex: data.player.seatIndex,
    status: data.room.status,
  });

  saveRoomSnapshot(data.room, data.player.id);
}

export async function createRoomSession(request: CreateRoomRequest) {
  try {
    await ensureSocketConnected();
    const response = await emitWithAck<LobbyJoinSuccess, CreateRoomRequest>(MULTIPLAYER_EVENTS.createRoom, {
      ...request,
      name: sanitizeDisplayName(request.name),
    });

    if (!response.ok || !response.data) {
      clearLobbySession();
      return {
        error: toFriendlyLobbyMessage(response.error ?? "Unable to create a room right now."),
        ok: false as const,
      };
    }

    persistJoinResult(response.data);

    return {
      data: response.data,
      ok: true as const,
    };
  } catch (error) {
    return {
      error: toFriendlyLobbyMessage(
        error instanceof Error ? error.message : "Unable to connect to the lobby server.",
      ),
      ok: false as const,
    };
  }
}

export async function joinRoomSession(request: JoinRoomRequest) {
  try {
    await ensureSocketConnected();
    const response = await emitWithAck<LobbyJoinSuccess, JoinRoomRequest>(MULTIPLAYER_EVENTS.joinRoom, {
      ...request,
      name: sanitizeDisplayName(request.name),
      roomCode: normalizeRoomCode(request.roomCode),
    });

    if (!response.ok || !response.data) {
      return {
        error: toFriendlyLobbyMessage(response.error ?? "Unable to join that room."),
        ok: false as const,
      };
    }

    persistJoinResult(response.data);

    return {
      data: response.data,
      ok: true as const,
    };
  } catch (error) {
    return {
      error: toFriendlyLobbyMessage(
        error instanceof Error ? error.message : "Unable to connect to the lobby server.",
      ),
      ok: false as const,
    };
  }
}
