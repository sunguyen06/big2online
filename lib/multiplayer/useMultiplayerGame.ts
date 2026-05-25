"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { emitWithAck, getLobbySocket } from "./socket-client";
import { clearLobbySession, loadLobbySession, saveGameSnapshot, saveLobbySession, saveRoomSnapshot } from "./session";
import {
  GameFinishedPayload,
  GameStartedPayload,
  InvalidMovePayload,
  JoinRoomRequest,
  LeaveRoomRequest,
  LobbyRoom,
  PassTurnRequest,
  PlayCardsRequest,
  PlayerDisconnectedPayload,
  PrivateHandPayload,
  PublicGameState,
} from "./types";
import { normalizeRoomCode } from "./utils";

type ConnectionState = "connected" | "connecting" | "offline" | "reconnecting";
type PendingAction = "pass" | "play" | null;

export function useMultiplayerGame(roomCodeFromRoute: string) {
  const router = useRouter();
  const normalizedRouteCode = useMemo(() => normalizeRoomCode(roomCodeFromRoute), [roomCodeFromRoute]);
  const initialSession = useMemo(() => loadLobbySession(), []);
  const feedbackTimeoutRef = useRef<number | null>(null);

  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [gameState, setGameState] = useState<PublicGameState | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [privateHand, setPrivateHand] = useState<PrivateHandPayload["hand"]>([]);
  const [room, setRoom] = useState<LobbyRoom | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const currentPlayerId =
    initialSession?.roomCode === normalizedRouteCode ? initialSession.playerId : null;

  const flashMessage = (message: string) => {
    setFeedbackMessage(message);

    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current);
    }

    feedbackTimeoutRef.current = window.setTimeout(() => {
      setFeedbackMessage("");
      feedbackTimeoutRef.current = null;
    }, 2600);
  };

  useEffect(() => {
    if (!currentPlayerId || !initialSession) {
      setConnectionState("offline");
      setFeedbackMessage("This tab does not have a saved player session for this room.");
      return undefined;
    }

    const socket = getLobbySocket();

    const handleRoomUpdated = (nextRoom: LobbyRoom) => {
      if (normalizeRoomCode(nextRoom.code) !== normalizedRouteCode) {
        return;
      }

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

      if (nextRoom.status === "lobby") {
        router.push(`/room/${nextRoom.code}`);
      }
    };

    const handleGameStarted = ({ room: nextRoom, state }: GameStartedPayload) => {
      if (normalizeRoomCode(nextRoom.code) !== normalizedRouteCode) {
        return;
      }

      setRoom(nextRoom);
      setGameState(state);
      setPendingAction(null);
      saveGameSnapshot(nextRoom, currentPlayerId);
      saveRoomSnapshot(nextRoom, currentPlayerId);
    };

    const handleGameStateUpdated = (state: PublicGameState) => {
      if (normalizeRoomCode(state.roomCode) !== normalizedRouteCode) {
        return;
      }

      setGameState(state);
      setPendingAction(null);
    };

    const handlePrivateHandUpdated = (payload: PrivateHandPayload) => {
      if (payload.roomCode !== normalizedRouteCode || payload.playerId !== currentPlayerId) {
        return;
      }

      setPrivateHand(payload.hand);
      setPendingAction(null);
    };

    const handleInvalidMove = (payload: InvalidMovePayload) => {
      setPendingAction(null);
      flashMessage(payload.message);
    };

    const handlePlayerDisconnected = (payload: PlayerDisconnectedPayload) => {
      if (payload.roomCode !== normalizedRouteCode) {
        return;
      }

      flashMessage(
        payload.playerId === currentPlayerId
          ? "You disconnected from the room."
          : `${payload.playerName} ${payload.reason === "leave" ? "left the room." : "disconnected."}`,
      );
    };

    const handleGameFinished = (payload: GameFinishedPayload) => {
      if (payload.roomCode !== normalizedRouteCode) {
        return;
      }

      setGameState(payload.state);
      setPendingAction(null);
    };

    const handleErrorMessage = (message: string) => {
      setPendingAction(null);
      flashMessage(message);
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
      flashMessage("We could not reconnect to the game server.");
    };

    const resumeSession = async () => {
      const latestSession = loadLobbySession();

      if (!latestSession || latestSession.roomCode !== normalizedRouteCode) {
        setConnectionState("offline");
        setFeedbackMessage("This browser is no longer holding a matching room session.");
        return;
      }

      const response = await emitWithAck<{ player: { id: string }; room: LobbyRoom }, JoinRoomRequest>("resumeSession", {
        name: latestSession.name,
        playerId: latestSession.playerId,
        preferredSeatIndex: latestSession.seatIndex,
        roomCode: latestSession.roomCode,
      } satisfies JoinRoomRequest);

      if (!response.ok || !response.data) {
        setConnectionState("offline");
        setFeedbackMessage(response.error ?? "Unable to restore this game session.");
        return;
      }

      setRoom(response.data.room);
      saveRoomSnapshot(response.data.room, currentPlayerId);
    };

    socket.on("connect", handleConnect);
    socket.on("connect_error", handleConnectError);
    socket.on("disconnect", handleDisconnect);
    socket.on("roomUpdated", handleRoomUpdated);
    socket.on("gameStarted", handleGameStarted);
    socket.on("gameStateUpdated", handleGameStateUpdated);
    socket.on("privateHandUpdated", handlePrivateHandUpdated);
    socket.on("invalidMove", handleInvalidMove);
    socket.on("playerDisconnected", handlePlayerDisconnected);
    socket.on("gameFinished", handleGameFinished);
    socket.on("errorMessage", handleErrorMessage);

    if (!socket.connected) {
      socket.connect();
    } else {
      setConnectionState("connected");
      void resumeSession();
    }

    return () => {
      if (feedbackTimeoutRef.current) {
        window.clearTimeout(feedbackTimeoutRef.current);
      }

      socket.off("connect", handleConnect);
      socket.off("connect_error", handleConnectError);
      socket.off("disconnect", handleDisconnect);
      socket.off("roomUpdated", handleRoomUpdated);
      socket.off("gameStarted", handleGameStarted);
      socket.off("gameStateUpdated", handleGameStateUpdated);
      socket.off("privateHandUpdated", handlePrivateHandUpdated);
      socket.off("invalidMove", handleInvalidMove);
      socket.off("playerDisconnected", handlePlayerDisconnected);
      socket.off("gameFinished", handleGameFinished);
      socket.off("errorMessage", handleErrorMessage);
    };
  }, [currentPlayerId, initialSession, normalizedRouteCode, router]);

  useEffect(() => {
    const validIds = new Set(privateHand.map((card) => card.id));
    setSelectedIds((current) => current.filter((cardId) => validIds.has(cardId)));
  }, [privateHand]);

  const playCards = async (cardIds: string[]) => {
    if (!currentPlayerId || pendingAction) {
      return;
    }

    setPendingAction("play");
    const response = await emitWithAck<PublicGameState, PlayCardsRequest>("playCards", {
      cardIds,
      playerId: currentPlayerId,
      roomCode: normalizedRouteCode,
    });

    if (!response.ok) {
      setPendingAction(null);

      if (response.error) {
        flashMessage(response.error);
      }
    }
  };

  const passTurn = async () => {
    if (!currentPlayerId || pendingAction) {
      return;
    }

    setPendingAction("pass");
    const response = await emitWithAck<PublicGameState, PassTurnRequest>("passTurn", {
      playerId: currentPlayerId,
      roomCode: normalizedRouteCode,
    });

    if (!response.ok) {
      setPendingAction(null);

      if (response.error) {
        flashMessage(response.error);
      }
    }
  };

  const leaveRoom = async () => {
    if (!currentPlayerId) {
      clearLobbySession();
      router.push("/");
      return;
    }

    await emitWithAck<{ ok: true }, LeaveRoomRequest>("leaveRoom", {
      playerId: currentPlayerId,
      roomCode: normalizedRouteCode,
    });

    clearLobbySession();
    router.push("/");
  };

  return {
    connectionState,
    currentPlayerId,
    feedbackMessage,
    gameState,
    leaveRoom,
    passTurn,
    pendingAction,
    playCards,
    privateHand,
    room,
    roomCode: normalizedRouteCode,
    selectedIds,
    setSelectedIds,
  };
}
