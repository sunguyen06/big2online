"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { emitWithAck, getLobbySocket } from "./socket-client";
import {
  clearLobbySession,
  loadLobbySession,
  loadRoomSnapshot,
  saveGameSnapshot,
  saveLobbySession,
  saveRoomSnapshot,
} from "./session";
import { GameStartedPayload, JoinRoomRequest, LobbyRoom, StartGameRequest } from "./types";
import { normalizeRoomCode } from "./utils";

type ConnectionState = "connected" | "connecting" | "offline" | "reconnecting";

export function useRoomLobby(roomCodeFromRoute: string) {
  const router = useRouter();
  const normalizedRouteCode = useMemo(() => normalizeRoomCode(roomCodeFromRoute), [roomCodeFromRoute]);
  const initialSession = useMemo(() => loadLobbySession(), []);
  const initialSnapshot = useMemo(() => loadRoomSnapshot(), []);

  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [errorMessage, setErrorMessage] = useState("");
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [room, setRoom] = useState<LobbyRoom | null>(
    initialSnapshot?.room.code === normalizedRouteCode ? initialSnapshot.room : null,
  );

  const currentPlayerId =
    initialSession?.roomCode === normalizedRouteCode ? initialSession.playerId : null;

  useEffect(() => {
    if (!currentPlayerId || !initialSession) {
      setConnectionState("offline");
      setErrorMessage("This room needs a saved player session. Create or join a room from the lobby first.");
      return undefined;
    }

    const socket = getLobbySocket();

    const handleRoomUpdated = (nextRoom: LobbyRoom) => {
      setRoom(nextRoom);
      saveRoomSnapshot(nextRoom, currentPlayerId);

      const me = nextRoom.players.find((player) => player.id === currentPlayerId);

      if (me) {
        saveLobbySession({
          name: me.name,
          playerId: me.id,
          roomCode: nextRoom.code,
          seatIndex: me.seatIndex,
          status: nextRoom.status,
        });
      }
    };

    const handleGameStarted = ({ room: nextRoom }: GameStartedPayload) => {
      saveGameSnapshot(nextRoom, currentPlayerId);
      saveRoomSnapshot(nextRoom, currentPlayerId);
      router.push(`/game/${nextRoom.code}`);
    };

    const handleDisconnect = () => {
      setConnectionState("reconnecting");
    };

    const handleConnect = () => {
      setConnectionState("connected");
      void resumeSession();
    };

    const handleConnectError = () => {
      setConnectionState("offline");
      setErrorMessage("We could not reach the lobby server. Try refreshing in a moment.");
    };

    const resumeSession = async () => {
      const latestSession = loadLobbySession();

      if (!latestSession || latestSession.roomCode !== normalizedRouteCode) {
        setConnectionState("offline");
        setErrorMessage("This browser is no longer holding a matching room session.");
        return;
      }

      const response = await emitWithAck<{ player: { id: string }; room: LobbyRoom }, JoinRoomRequest>("lobby:resume-session", {
        name: latestSession.name,
        playerId: latestSession.playerId,
        preferredSeatIndex: latestSession.seatIndex,
        roomCode: latestSession.roomCode,
      } satisfies JoinRoomRequest);

      if (!response.ok || !response.data) {
        clearLobbySession();
        setConnectionState("offline");
        setErrorMessage(response.error ?? "Unable to restore this room session.");
        return;
      }

      setErrorMessage("");
      handleRoomUpdated(response.data.room);
    };

    socket.on("connect", handleConnect);
    socket.on("connect_error", handleConnectError);
    socket.on("disconnect", handleDisconnect);
    socket.on("lobby:room-updated", handleRoomUpdated);
    socket.on("lobby:game-started", handleGameStarted);

    if (!socket.connected) {
      socket.connect();
    } else {
      setConnectionState("connected");
      void resumeSession();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleConnectError);
      socket.off("disconnect", handleDisconnect);
      socket.off("lobby:room-updated", handleRoomUpdated);
      socket.off("lobby:game-started", handleGameStarted);
    };
  }, [currentPlayerId, initialSession, normalizedRouteCode, router]);

  const currentPlayer = room?.players.find((player) => player.id === currentPlayerId) ?? null;
  const canStartGame =
    !!currentPlayer?.isHost &&
    !!room &&
    room.players.length === room.maxPlayers &&
    room.players.every((player) => player.connected) &&
    room.status === "lobby";

  const startGame = async () => {
    if (!currentPlayerId || !room) {
      setErrorMessage("This room is missing its active player session.");
      return;
    }

    setIsStartingGame(true);
    setErrorMessage("");

    const response = await emitWithAck<LobbyRoom, StartGameRequest>("lobby:start-game", {
      playerId: currentPlayerId,
      roomCode: room.code,
    });

    if (!response.ok) {
      setErrorMessage(response.error ?? "The game could not be started.");
      setIsStartingGame(false);
      return;
    }

    setIsStartingGame(false);
  };

  return {
    canStartGame,
    connectionState,
    currentPlayer,
    currentPlayerId,
    errorMessage,
    isStartingGame,
    room,
    roomCode: normalizedRouteCode,
    startGame,
  };
}
