"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { GameLog } from "@/components/big2/GameLog";
import { Hand } from "@/components/big2/Hand";
import { PlayerSeat } from "@/components/big2/PlayerSeat";
import { PlayedCards } from "@/components/big2/PlayedCards";
import { RulesModal } from "@/components/big2/RulesModal";
import { WinnerModal } from "@/components/big2/WinnerModal";
import { canPlayMove } from "@/lib/big2/engine";
import { Seat } from "@/lib/big2/types";
import { useMultiplayerGame } from "@/lib/multiplayer/useMultiplayerGame";
import { MIN_ROOM_PLAYERS } from "@/lib/multiplayer/utils";
import { useUiSoundEffects } from "@/lib/ui/useUiSoundEffects";

const RELATIVE_SEATS: Seat[] = ["south", "west", "north", "east"];

interface TablePlayerView {
  cardCount: number;
  connected: boolean;
  id: string;
  isHost: boolean;
  name: string;
  seat: Seat;
  seatIndex: number;
}

export function MultiplayerGamePage({ roomCode }: { roomCode: string }) {
  const router = useRouter();
  const {
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
    selectedIds,
    setSelectedIds,
  } = useMultiplayerGame(roomCode);
  const [copyFeedback, setCopyFeedback] = useState("Copy Code");
  const [passFlashPlayerId, setPassFlashPlayerId] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const passFlashTimeoutRef = useRef<number | null>(null);
  const lastPassActionAtRef = useRef<number | null>(null);
  const lastPlayActionAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (gameState?.lastAction?.type !== "pass") {
      return undefined;
    }

    if (lastPassActionAtRef.current === gameState.lastAction.at) {
      return undefined;
    }

    lastPassActionAtRef.current = gameState.lastAction.at;
    setPassFlashPlayerId(gameState.lastAction.playerId);

    if (passFlashTimeoutRef.current) {
      window.clearTimeout(passFlashTimeoutRef.current);
    }

    passFlashTimeoutRef.current = window.setTimeout(() => {
      setPassFlashPlayerId(null);
      passFlashTimeoutRef.current = null;
    }, 1600);

    return () => {
      if (passFlashTimeoutRef.current) {
        window.clearTimeout(passFlashTimeoutRef.current);
      }
    };
  }, [gameState?.lastAction]);

  const tablePlayers = useMemo<TablePlayerView[]>(() => {
    if (!gameState || !currentPlayerId) {
      return [];
    }

    const mySeatIndex = gameState.players.find((player) => player.id === currentPlayerId)?.seatIndex ?? 0;

    return gameState.players.map((player) => ({
      ...player,
      seat: RELATIVE_SEATS[(player.seatIndex - mySeatIndex + 4) % 4] ?? "south",
    }));
  }, [currentPlayerId, gameState]);

  const southPlayer = tablePlayers.find((player) => player.seat === "south") ?? null;
  const northPlayer = tablePlayers.find((player) => player.seat === "north") ?? null;
  const westPlayer = tablePlayers.find((player) => player.seat === "west") ?? null;
  const eastPlayer = tablePlayers.find((player) => player.seat === "east") ?? null;
  const currentTurnPlayer = gameState?.players.find((player) => player.id === gameState.currentTurnPlayerId) ?? null;
  const currentRoomPlayer = room?.players.find((player) => player.id === currentPlayerId) ?? null;
  const lastPlayedPlayer =
    gameState?.lastPlayedPlayerId ? tablePlayers.find((player) => player.id === gameState.lastPlayedPlayerId) ?? null : null;
  const winnerPlayer =
    gameState?.winnerPlayerId ? gameState.players.find((player) => player.id === gameState.winnerPlayerId) ?? null : null;
  const selectedCards = privateHand.filter((card) => selectedIds.includes(card.id));
  const disconnectedPlayers = gameState?.players.filter((player) => !player.connected) ?? [];
  const waitingForReconnect = !!currentTurnPlayer && !currentTurnPlayer.connected && gameState?.winnerPlayerId === null;
  const isMyTurn =
    !!gameState &&
    !!currentPlayerId &&
    gameState.status === "playing" &&
    gameState.winnerPlayerId === null &&
    gameState.currentTurnPlayerId === currentPlayerId;

  const { playCardPlaySound, playCardSelectSound } = useUiSoundEffects({
    isPlayersTurn: isMyTurn,
    turnCueEnabled: !!gameState && gameState.winnerPlayerId === null,
  });

  useEffect(() => {
    if (gameState?.lastAction?.type !== "play") {
      return;
    }

    if (lastPlayActionAtRef.current === gameState.lastAction.at) {
      return;
    }

    lastPlayActionAtRef.current = gameState.lastAction.at;
    playCardPlaySound();
  }, [gameState?.lastAction, playCardPlaySound]);

  const validation = gameState
    ? canPlayMove(
        selectedCards,
        gameState.currentMove,
        gameState.passState.isStartingTrick,
        gameState.passState.isFirstTurn,
      )
    : { message: "Rejoining table...", move: null, valid: false };

  const canPlay =
    isMyTurn &&
    pendingAction === null &&
    gameState?.status === "playing" &&
    gameState.winnerPlayerId === null &&
    validation.valid;
  const canPass =
    isMyTurn &&
    pendingAction === null &&
    gameState?.status === "playing" &&
    gameState.winnerPlayerId === null &&
    !gameState.passState.isStartingTrick &&
    !!gameState.currentMove;
  const canRestartRound =
    !!winnerPlayer &&
    !!currentRoomPlayer?.isHost &&
    !!room &&
    room.players.length >= MIN_ROOM_PLAYERS &&
    room.players.length <= room.maxPlayers &&
    room.players.every((player) => player.connected);

  const roundEndedMessage = winnerPlayer
    ? canRestartRound
      ? "You can deal another round from this same room."
      : currentRoomPlayer?.isHost
        ? "Everyone needs to reconnect before you can deal another round."
        : "Waiting for the host to deal the next round."
    : "";

  const tableMessage = feedbackMessage
    ? feedbackMessage
    : !gameState
      ? "Rejoining the room..."
      : waitingForReconnect
        ? `Waiting for ${currentTurnPlayer?.name ?? "that player"} to reconnect.`
        : winnerPlayer
          ? `${winnerPlayer.name} won the hand. ${roundEndedMessage}`
          : connectionState !== "connected"
            ? "Trying to reconnect to the server..."
            : !isMyTurn
              ? `Waiting for ${currentTurnPlayer?.name ?? "the next player"}`
              : selectedCards.length === 0
                ? gameState.passState.isFirstTurn
                  ? "Your turn. The opening play must include the 3 of Diamonds."
                  : "Your turn. Select cards to build a move."
                : validation.message;

  const handleToggleCard = (cardId: string) => {
    if (!isMyTurn || pendingAction) {
      return;
    }

    const isSelecting = !selectedIds.includes(cardId);

    setSelectedIds((current) =>
      current.includes(cardId) ? current.filter((id) => id !== cardId) : [...current, cardId],
    );

    if (isSelecting) {
      playCardSelectSound();
    }
  };

  const handlePlay = async () => {
    if (!canPlay) {
      return;
    }

    await playCards(selectedIds);
  };

  const handlePass = async () => {
    if (!canPass) {
      return;
    }

    await passTurn();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopyFeedback("Copied!");
      window.setTimeout(() => setCopyFeedback("Copy Code"), 1400);
    } catch {
      setCopyFeedback("Copy Failed");
      window.setTimeout(() => setCopyFeedback("Copy Code"), 1400);
    }
  };

  if (!gameState || !southPlayer) {
    return (
      <main className="relative min-h-screen overflow-hidden px-4 py-4 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1600px] items-center justify-center">
          <div className="glass-panel max-w-lg rounded-[2rem] px-8 py-10 text-center">
            <p className="text-[11px] uppercase tracking-[0.34em] text-amber-100/62">Big 2 Online</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Restoring Room {roomCode}</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-100/72">
              {feedbackMessage || "Syncing your seat, the public table state, and your private hand from the server."}
            </p>
            <button
              type="button"
              onClick={leaveRoom}
              className="ui-button ui-button-ghost mt-6 rounded-full px-5 py-2.5 text-sm font-semibold"
            >
              Leave Room
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-4 text-white sm:px-6 lg:px-8">
      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />

      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1920px] flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_360px] 2xl:relative 2xl:block 2xl:pr-4">
        <section className="table-shell relative flex min-h-[900px] flex-col rounded-[2.4rem] p-4 sm:p-5 lg:p-6 2xl:mx-auto 2xl:max-w-[1184px]">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-amber-100/62">Big 2 Online</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Room {roomCode}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-100/72">
                Private multiplayer table with server-owned game state, reconnect-aware room flow, and support for both 3- and 4-player rounds.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setRulesOpen(true)}
                className="ui-button ui-button-ghost rounded-full px-4 py-2 text-sm font-semibold"
              >
                Rules
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="ui-button ui-button-gold rounded-full px-4 py-2 text-sm font-semibold"
              >
                {copyFeedback}
              </button>
            </div>
          </div>

          <div className="felt-surface table-rim relative flex-1 overflow-hidden rounded-[2.2rem] border border-emerald-100/10 px-3 py-5 sm:px-5 lg:px-7">
            <div className="absolute inset-[4%] rounded-[50%] border border-emerald-100/10" />
            <div className="absolute inset-[8%] rounded-[50%] border border-white/6" />
            <div className="pointer-events-none absolute inset-x-[12%] top-6 h-24 rounded-full bg-white/5 blur-3xl" />
            <div className="pointer-events-none absolute inset-x-[20%] bottom-20 h-24 rounded-full bg-emerald-300/6 blur-3xl" />

            <div className="relative mx-auto grid h-full min-h-[760px] w-full max-w-[1200px] grid-cols-2 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(260px,420px)_minmax(0,1fr)] md:grid-rows-[auto_minmax(210px,1fr)_auto_auto]">
              <div className="col-span-2 md:col-start-2 md:row-start-1 mx-auto w-full max-w-sm">
                {northPlayer ? (
                  <PlayerSeat
                    player={northPlayer}
                    active={gameState.currentTurnPlayerId === northPlayer.id}
                    disconnected={!northPlayer.connected}
                    isLead={gameState.lastPlayedPlayerId === northPlayer.id}
                    showPass={passFlashPlayerId === northPlayer.id}
                    statusText={
                      !northPlayer.connected
                        ? "Reconnecting"
                        : gameState.currentTurnPlayerId === northPlayer.id
                          ? "Reading the center"
                          : "Tracking the table"
                    }
                  />
                ) : null}
              </div>

              <div className="col-span-2 md:col-start-2 md:row-start-2 flex items-center justify-center">
                <PlayedCards move={gameState.currentMove} playerName={lastPlayedPlayer?.name} seat={lastPlayedPlayer?.seat} />
              </div>

              <div className="col-span-1 md:col-start-1 md:row-start-2 flex items-center">
                {westPlayer ? (
                  <PlayerSeat
                    player={westPlayer}
                    active={gameState.currentTurnPlayerId === westPlayer.id}
                    disconnected={!westPlayer.connected}
                    isLead={gameState.lastPlayedPlayerId === westPlayer.id}
                    showPass={passFlashPlayerId === westPlayer.id}
                    statusText={
                      !westPlayer.connected
                        ? "Reconnecting"
                        : gameState.currentTurnPlayerId === westPlayer.id
                          ? "On the clock"
                          : "Holding the line"
                    }
                  />
                ) : null}
              </div>

              <div className="col-span-1 md:col-start-3 md:row-start-2 flex items-center justify-end">
                {eastPlayer ? (
                  <PlayerSeat
                    player={eastPlayer}
                    active={gameState.currentTurnPlayerId === eastPlayer.id}
                    disconnected={!eastPlayer.connected}
                    isLead={gameState.lastPlayedPlayerId === eastPlayer.id}
                    showPass={passFlashPlayerId === eastPlayer.id}
                    statusText={
                      !eastPlayer.connected
                        ? "Reconnecting"
                        : gameState.currentTurnPlayerId === eastPlayer.id
                          ? "Under pressure"
                          : "Watching for an opening"
                    }
                  />
                ) : null}
              </div>

              <div className="col-span-2 md:col-span-3 md:row-start-3">
                <div className="glass-panel rounded-[1.75rem] p-4 sm:p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="panel-label">Action</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-100/86">{tableMessage}</p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={leaveRoom}
                        className="ui-button ui-button-danger rounded-full px-4 py-2 text-sm font-semibold"
                      >
                        Leave Room
                      </button>
                      <button
                        type="button"
                        onClick={handlePass}
                        disabled={!canPass}
                        className="ui-button ui-button-dark rounded-full px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        {pendingAction === "pass" ? "Passing..." : "Pass"}
                      </button>
                      <button
                        type="button"
                        onClick={handlePlay}
                        disabled={!canPlay}
                        className="ui-button ui-button-gold rounded-full px-6 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {pendingAction === "play" ? "Playing..." : "Play Cards"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-2 md:col-span-3 md:row-start-4">
                <motion.div
                  className="glass-panel rounded-[1.8rem] px-3 pb-2 pt-4 sm:px-5"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="panel-label">Your Hand</p>
                      <p className="text-sm text-slate-100/74">
                        Tap or click to build a move. On smaller screens the hand stays horizontally scrollable.
                      </p>
                    </div>
                    <div className="rounded-full border border-white/10 bg-black/16 px-3 py-1 text-xs text-slate-100/72">
                      {privateHand.length} cards left
                    </div>
                  </div>

                  <Hand
                    animationKey={gameState.startedAt}
                    cards={privateHand}
                    dealt
                    interactive
                    onCardClick={(card) => handleToggleCard(card.id)}
                    selectedIds={selectedIds}
                  />
                </motion.div>
              </div>
            </div>

            <WinnerModal
              actionDisabled={!!winnerPlayer && !canRestartRound && !!currentRoomPlayer?.isHost}
              actionLabel={
                winnerPlayer
                  ? currentRoomPlayer?.isHost
                    ? isRestartingRound
                      ? "Dealing..."
                      : "Deal New Round"
                    : "Leave Table"
                  : "Leave Table"
              }
              message={
                winnerPlayer
                  ? `${winnerPlayer.name} emptied their hand and ended the round. ${roundEndedMessage}`
                  : undefined
              }
              onAction={winnerPlayer && currentRoomPlayer?.isHost ? restartRound : leaveRoom}
              onSecondaryAction={winnerPlayer && currentRoomPlayer?.isHost ? leaveRoom : undefined}
              secondaryActionLabel={winnerPlayer && currentRoomPlayer?.isHost ? "Leave Table" : undefined}
              winnerName={winnerPlayer?.name ?? null}
            />
          </div>
        </section>

        <aside className="flex flex-col gap-4 2xl:absolute 2xl:right-4 2xl:top-0 2xl:w-[360px]">
          <GameLog log={gameState.gameLog} />

          <div className="glass-panel rounded-[1.75rem] p-4 sm:p-5">
            <p className="panel-label">Table Status</p>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-100/74">
              <p>
                Connection: <span className="font-semibold capitalize text-white">{connectionState}</span>
              </p>
              <p>
                Format: <span className="font-semibold text-white">{room?.players.length === 3 ? "3-player joker deck" : "4-player standard deck"}</span>
              </p>
              <p>
                Seat: <span className="font-semibold text-white">{southPlayer.name}</span>
              </p>
              <p>
                Current lead: <span className="font-semibold text-white">{lastPlayedPlayer?.name ?? "Open table"}</span>
              </p>
              <p>
                Next to act: <span className="font-semibold text-white">{currentTurnPlayer?.name ?? "-"}</span>
              </p>
              <p>
                Pass state:{" "}
                <span className="font-semibold text-white">
                  {gameState.passState.isStartingTrick ? "Fresh trick" : `${gameState.passState.passesInRow} in a row`}
                </span>
              </p>
            </div>
          </div>

          {disconnectedPlayers.length > 0 ? (
            <div className="glass-panel rounded-[1.75rem] p-4 sm:p-5">
              <p className="panel-label">Reconnect Flow</p>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-100/74">
                <p>{disconnectedPlayers.map((player) => player.name).join(", ")} {disconnectedPlayers.length === 1 ? "is" : "are"} currently disconnected.</p>
                <p>Refreshing the original browser window will try to restore that saved seat automatically.</p>
                <p>
                  TODO: If a player cannot return, the host will need to restart the room manually in this prototype.
                </p>
              </div>
            </div>
          ) : null}

          <div className="glass-panel rounded-[1.75rem] p-4 sm:p-5">
            <p className="panel-label">Navigation</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push(`/room/${room?.code ?? roomCode}`)}
                className="ui-button ui-button-ghost rounded-full px-4 py-2 text-sm font-semibold"
              >
                Room View
              </button>
              <button
                type="button"
                onClick={leaveRoom}
                className="ui-button ui-button-dark rounded-full px-4 py-2 text-sm font-semibold"
              >
                Exit To Home
              </button>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
