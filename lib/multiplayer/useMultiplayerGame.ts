"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { MULTIPLAYER_EVENTS } from "./events";
import { toFriendlyGameMessage, toFriendlyLobbyMessage } from "./messages";
import { emitWithAck, getLobbySocket } from "./socket-client";
import { useLobbyWakeup } from "./useLobbyWakeup";
import {
  clearLobbySession,
  loadGameSnapshot,
  loadLobbySession,
  saveGameSnapshot,
  saveLobbySession,
  saveRoomSnapshot,
} from "./session";
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
  RestartGameRequest,
} from "./types";
import { normalizeRoomCode } from "./utils";

type ConnectionState = "connected" | "connecting" | "offline" | "reconnecting";
type PendingAction = "pass" | "play" | null;

export function useMultiplayerGame(roomCodeFromRoute: string) {
  const router = useRouter();
  const normalizedRouteCode = useMemo(() => normalizeRoomCode(roomCodeFromRoute), [roomCodeFromRoute]);
  const initialSession = useMemo(() => loadLobbySession(), []);
  const initialSnapshot = useMemo(() => loadGameSnapshot(), []);
  const feedbackTimeoutRef = useRef<number | null>(null);

  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [gameState, setGameState] = useState<PublicGameState | null>(
    initialSnapshot?.room.code === normalizedRouteCode ? initialSnapshot.state : null,
  );
  const [isRestartingRound, setIsRestartingRound] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [privateHand, setPrivateHand] = useState<PrivateHandPayload["hand"]>(
    initialSnapshot?.room.code === normalizedRouteCode ? initialSnapshot.privateHand : [],
  );
  const [room, setRoom] = useState<LobbyRoom | null>(
    initialSnapshot?.room.code === normalizedRouteCode ? initialSnapshot.room : null,
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const currentPlayerId =
    initialSession?.roomCode === normalizedRouteCode ? initialSession.playerId : null;

  useLobbyWakeup(!!initialSession && !!currentPlayerId);

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
    if (room && currentPlayerId) {
      saveGameSnapshot(room, currentPlayerId, gameState, privateHand);
    }
  }, [currentPlayerId, gameState, privateHand, room]);

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
      setPrivateHand([]);
      setPendingAction(null);
      setIsRestartingRound(false);
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
      flashMessage(toFriendlyGameMessage(payload.message));
    };

    const handlePlayerDisconnected = (payload: PlayerDisconnectedPayload) => {
      if (payload.roomCode !== normalizedRouteCode) {
        return;
      }

      flashMessage(
        payload.playerId === currentPlayerId
          ? "Your seat disconnected. Rejoining your room now..."
          : `${payload.playerName} ${payload.reason === "leave" ? "left the table." : "disconnected and may reconnect."}`,
      );
    };

    const handleGameFinished = (payload: GameFinishedPayload) => {
      if (payload.roomCode !== normalizedRouteCode) {
        return;
      }

      setGameState(payload.state);
      setPendingAction(null);
      setIsRestartingRound(false);
    };

    const handleErrorMessage = (message: string) => {
      setPendingAction(null);
      flashMessage(toFriendlyGameMessage(message));
    };

    const handleDisconnect = () => {
      setConnectionState("reconnecting");
      flashMessage("Connection lost. Trying to rejoin your seat...");
    };

    const handleConnect = () => {
      setConnectionState("connected");
      void resumeSession();
    };

    const handleConnectError = () => {
      setConnectionState("offline");
      flashMessage("We couldn't reconnect to the game server yet.");
    };

    const resumeSession = async () => {
      const latestSession = loadLobbySession();

      if (!latestSession || latestSession.roomCode !== normalizedRouteCode) {
        setConnectionState("offline");
        setFeedbackMessage("This browser is no longer holding a matching room session.");
        return;
      }

      const response = await emitWithAck<{ player: { id: string }; room: LobbyRoom }, JoinRoomRequest>(
        MULTIPLAYER_EVENTS.resumeSession,
        {
          name: latestSession.name,
          playerId: latestSession.playerId,
          preferredSeatIndex: latestSession.seatIndex,
          roomCode: latestSession.roomCode,
        } satisfies JoinRoomRequest,
      );

      if (!response.ok || !response.data) {
        setConnectionState("offline");
        setFeedbackMessage(toFriendlyLobbyMessage(response.error ?? "Unable to restore this game session."));
        return;
      }

      setRoom(response.data.room);
      saveRoomSnapshot(response.data.room, currentPlayerId);
    };

    socket.on("connect", handleConnect);
    socket.on("connect_error", handleConnectError);
    socket.on("disconnect", handleDisconnect);
    socket.on(MULTIPLAYER_EVENTS.roomUpdated, handleRoomUpdated);
    socket.on(MULTIPLAYER_EVENTS.roundStarted, handleGameStarted);
    socket.on(MULTIPLAYER_EVENTS.gameStateUpdated, handleGameStateUpdated);
    socket.on(MULTIPLAYER_EVENTS.privateHandUpdated, handlePrivateHandUpdated);
    socket.on(MULTIPLAYER_EVENTS.invalidMove, handleInvalidMove);
    socket.on(MULTIPLAYER_EVENTS.playerDisconnected, handlePlayerDisconnected);
    socket.on(MULTIPLAYER_EVENTS.gameFinished, handleGameFinished);
    socket.on(MULTIPLAYER_EVENTS.errorMessage, handleErrorMessage);

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
      socket.off(MULTIPLAYER_EVENTS.roomUpdated, handleRoomUpdated);
      socket.off(MULTIPLAYER_EVENTS.roundStarted, handleGameStarted);
      socket.off(MULTIPLAYER_EVENTS.gameStateUpdated, handleGameStateUpdated);
      socket.off(MULTIPLAYER_EVENTS.privateHandUpdated, handlePrivateHandUpdated);
      socket.off(MULTIPLAYER_EVENTS.invalidMove, handleInvalidMove);
      socket.off(MULTIPLAYER_EVENTS.playerDisconnected, handlePlayerDisconnected);
      socket.off(MULTIPLAYER_EVENTS.gameFinished, handleGameFinished);
      socket.off(MULTIPLAYER_EVENTS.errorMessage, handleErrorMessage);
    };
  }, [currentPlayerId, initialSession, normalizedRouteCode, router]);

  useEffect(() => {
    const validIds = new Set(privateHand.map((card) => card.id));
    setSelectedIds((current) => current.filter((cardId) => validIds.has(cardId)));
  }, [privateHand]);

  const playCards = async (cardIds: string[]) => {
    if (!currentPlayerId || pendingAction) {
      return false;
    }

    setPendingAction("play");
    const response = await emitWithAck<PublicGameState, PlayCardsRequest>(MULTIPLAYER_EVENTS.playCards, {
      cardIds,
      playerId: currentPlayerId,
      roomCode: normalizedRouteCode,
    });

    if (!response.ok) {
      setPendingAction(null);

      if (response.error) {
        flashMessage(toFriendlyGameMessage(response.error));
      }

      return false;
    }

    return true;
  };

  const passTurn = async () => {
    if (!currentPlayerId || pendingAction) {
      return false;
    }

    setPendingAction("pass");
    const response = await emitWithAck<PublicGameState, PassTurnRequest>(MULTIPLAYER_EVENTS.passTurn, {
      playerId: currentPlayerId,
      roomCode: normalizedRouteCode,
    });

    if (!response.ok) {
      setPendingAction(null);

      if (response.error) {
        flashMessage(toFriendlyGameMessage(response.error));
      }

      return false;
    }

    return true;
  };

  const restartRound = async () => {
    if (!currentPlayerId || !room) {
      return;
    }

    setIsRestartingRound(true);
    const response = await emitWithAck<GameStartedPayload, RestartGameRequest>(MULTIPLAYER_EVENTS.restartGame, {
      playerId: currentPlayerId,
      roomCode: normalizedRouteCode,
    });

    if (!response.ok) {
      setIsRestartingRound(false);
      flashMessage(toFriendlyGameMessage(response.error ?? "Unable to deal a new round."));
    }
  };

  const leaveRoom = async () => {
    if (!currentPlayerId) {
      clearLobbySession();
      router.push("/");
      return;
    }

    await emitWithAck<{ ok: true }, LeaveRoomRequest>(MULTIPLAYER_EVENTS.leaveRoom, {
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
    isRestartingRound,
    leaveRoom,
    passTurn,
    pendingAction,
    playCards,
    privateHand,
    restartRound,
    room,
    roomCode: normalizedRouteCode,
    selectedIds,
    setSelectedIds,
  };
}
