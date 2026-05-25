"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { GameLog } from "@/components/big2/GameLog";
import { Hand } from "@/components/big2/Hand";
import { PlayerSeat } from "@/components/big2/PlayerSeat";
import { PlayedCards } from "@/components/big2/PlayedCards";
import { WinnerModal } from "@/components/big2/WinnerModal";
import { canPlayMove } from "@/lib/big2/engine";
import { Seat } from "@/lib/big2/types";
import { useMultiplayerGame } from "@/lib/multiplayer/useMultiplayerGame";

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

function normalizeLocalMessage(message: string) {
  if (message === "Invalid card combination.") {
    return "Invalid hand";
  }

  if (message === "Selected cards do not beat the current move.") {
    return "Must beat the current play";
  }

  return message;
}

export function GamePlaceholderPage({ roomCode }: { roomCode: string }) {
  const router = useRouter();
  const {
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
    selectedIds,
    setSelectedIds,
  } = useMultiplayerGame(roomCode);
  const [passFlashPlayerId, setPassFlashPlayerId] = useState<string | null>(null);
  const passFlashTimeoutRef = useRef<number | null>(null);
  const lastPassActionAtRef = useRef<number | null>(null);

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
  const lastPlayedPlayer =
    gameState?.lastPlayedPlayerId ? tablePlayers.find((player) => player.id === gameState.lastPlayedPlayerId) ?? null : null;
  const winnerPlayer =
    gameState?.winnerPlayerId ? gameState.players.find((player) => player.id === gameState.winnerPlayerId) ?? null : null;
  const selectedCards = privateHand.filter((card) => selectedIds.includes(card.id));
  const isMyTurn =
    !!gameState &&
    !!currentPlayerId &&
    gameState.status === "playing" &&
    gameState.winnerPlayerId === null &&
    gameState.currentTurnPlayerId === currentPlayerId;
  const validation = gameState
    ? canPlayMove(
        selectedCards,
        gameState.currentMove,
        gameState.passState.isStartingTrick,
        gameState.passState.isFirstTurn,
      )
    : { message: "Rejoining table...", move: null, valid: false };
  const canPlay =
    isMyTurn && pendingAction === null && gameState?.status === "playing" && gameState.winnerPlayerId === null && validation.valid;
  const canPass =
    isMyTurn &&
    pendingAction === null &&
    gameState?.status === "playing" &&
    gameState.winnerPlayerId === null &&
    !gameState.passState.isStartingTrick &&
    !!gameState.currentMove;

  const tableMessage = feedbackMessage
    ? feedbackMessage
    : !gameState
      ? "Rejoining the room..."
      : winnerPlayer
        ? `${winnerPlayer.name} won the hand.`
        : connectionState !== "connected"
          ? "Trying to reconnect to the server..."
          : !isMyTurn
            ? `Waiting for ${currentTurnPlayer?.name ?? "the next player"}`
            : selectedCards.length === 0
              ? "Your turn"
              : normalizeLocalMessage(validation.message);

  const handleToggleCard = (cardId: string) => {
    if (!isMyTurn || pendingAction) {
      return;
    }

    setSelectedIds((current) =>
      current.includes(cardId) ? current.filter((id) => id !== cardId) : [...current, cardId],
    );
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

  if (!gameState || !southPlayer || !northPlayer || !westPlayer || !eastPlayer) {
    return (
      <main className="relative min-h-screen overflow-hidden px-4 py-4 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1600px] items-center justify-center">
          <div className="glass-panel rounded-[2rem] px-8 py-10 text-center">
            <p className="text-[11px] uppercase tracking-[0.34em] text-amber-100/62">Big 2 Online</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Restoring Room {roomCode}</h1>
            <p className="mt-3 text-sm text-slate-100/72">{feedbackMessage || "Syncing your seat and private hand from the server."}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-4 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1600px] flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="relative flex min-h-[900px] flex-col rounded-[2.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-4 shadow-[0_40px_120px_rgba(0,0,0,0.42)] sm:p-5 lg:p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-amber-100/62">Big 2 Online</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Room {roomCode}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-100/72">
                The server owns the game state. Each seat only receives its own hand while public actions stay synced for the whole room.
              </p>
            </div>

            <div className="glass-panel rounded-[1.5rem] px-4 py-3 text-right">
              <p className="text-[11px] uppercase tracking-[0.26em] text-emerald-100/55">Turn</p>
              <p className="mt-1 text-lg font-semibold text-white">{currentTurnPlayer?.name ?? "..."}</p>
              <p className="text-xs text-slate-200/65">
                {gameState.currentMove
                  ? `${gameState.passState.passesInRow} pass${gameState.passState.passesInRow === 1 ? "" : "es"} in a row`
                  : "Fresh trick"}
              </p>
            </div>
          </div>

          <div className="felt-surface relative flex-1 overflow-hidden rounded-[2.2rem] border border-emerald-100/10 px-3 py-5 shadow-[inset_0_2px_0_rgba(255,255,255,0.08),inset_0_-30px_80px_rgba(0,0,0,0.22)] sm:px-5 lg:px-7">
            <div className="absolute inset-[4%] rounded-[50%] border border-emerald-100/10" />
            <div className="absolute inset-[8%] rounded-[50%] border border-white/6" />

            <div className="pointer-events-none absolute inset-x-[12%] top-6 h-24 rounded-full bg-white/5 blur-3xl" />
            <div className="pointer-events-none absolute inset-x-[20%] bottom-20 h-24 rounded-full bg-emerald-300/6 blur-3xl" />

            <div className="relative mx-auto grid h-full min-h-[760px] w-full max-w-[1200px] grid-cols-[minmax(0,1fr)_minmax(260px,420px)_minmax(0,1fr)] grid-rows-[auto_minmax(210px,1fr)_auto_auto] gap-4">
              <div className="col-start-2 row-start-1 mx-auto w-full max-w-sm">
                <PlayerSeat
                  player={northPlayer}
                  active={gameState.currentTurnPlayerId === northPlayer.id}
                  disconnected={!northPlayer.connected}
                  isLead={gameState.lastPlayedPlayerId === northPlayer.id}
                  showPass={passFlashPlayerId === northPlayer.id}
                  statusText={
                    !northPlayer.connected
                      ? "Disconnected"
                      : gameState.currentTurnPlayerId === northPlayer.id
                        ? "Thinking through the table"
                        : "Watching the center"
                  }
                />
              </div>

              <div className="col-start-1 row-start-2 flex items-center">
                <PlayerSeat
                  player={westPlayer}
                  active={gameState.currentTurnPlayerId === westPlayer.id}
                  disconnected={!westPlayer.connected}
                  isLead={gameState.lastPlayedPlayerId === westPlayer.id}
                  showPass={passFlashPlayerId === westPlayer.id}
                  statusText={
                    !westPlayer.connected
                      ? "Disconnected"
                      : gameState.currentTurnPlayerId === westPlayer.id
                        ? "On the clock"
                        : "Waiting to respond"
                  }
                />
              </div>

              <div className="col-start-3 row-start-2 flex items-center justify-end">
                <PlayerSeat
                  player={eastPlayer}
                  active={gameState.currentTurnPlayerId === eastPlayer.id}
                  disconnected={!eastPlayer.connected}
                  isLead={gameState.lastPlayedPlayerId === eastPlayer.id}
                  showPass={passFlashPlayerId === eastPlayer.id}
                  statusText={
                    !eastPlayer.connected
                      ? "Disconnected"
                      : gameState.currentTurnPlayerId === eastPlayer.id
                        ? "Reading the table"
                        : "Holding position"
                  }
                />
              </div>

              <div className="col-start-2 row-start-2 flex items-center justify-center">
                <PlayedCards
                  move={gameState.currentMove}
                  playerName={lastPlayedPlayer?.name}
                  seat={lastPlayedPlayer?.seat}
                />
              </div>

              <div className="col-span-3 row-start-3">
                <div className="glass-panel rounded-[1.75rem] p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.26em] text-emerald-100/55">Action</p>
                      <p className="mt-1 text-sm text-slate-100/86">{tableMessage}</p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={leaveRoom}
                        className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/12"
                      >
                        Leave Room
                      </button>
                      <button
                        type="button"
                        onClick={handlePass}
                        disabled={!canPass}
                        className="rounded-full border border-white/10 bg-black/20 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-black/30 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        {pendingAction === "pass" ? "Passing..." : "Pass"}
                      </button>
                      <button
                        type="button"
                        onClick={handlePlay}
                        disabled={!canPlay}
                        className="rounded-full bg-[linear-gradient(180deg,#ffe7a4_0%,#d4b464_100%)] px-6 py-2.5 text-sm font-bold text-slate-900 shadow-[0_12px_24px_rgba(212,180,100,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {pendingAction === "play" ? "Playing..." : "Play Cards"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-3 row-start-4">
                <motion.div
                  className="glass-panel rounded-[1.8rem] px-3 pb-2 pt-4 sm:px-5"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-100/55">Your Hand</p>
                      <p className="text-sm text-slate-100/74">Click cards to build a move. The server still performs the final legality check.</p>
                    </div>
                    <div className="rounded-full border border-white/10 bg-black/16 px-3 py-1 text-xs text-slate-100/72">
                      {privateHand.length} cards left
                    </div>
                  </div>

                  <Hand
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
              actionLabel="Leave Table"
              message="emptied their hand and ended the round. You can leave the table or reopen the room from the lobby later."
              onAction={leaveRoom}
              winnerName={winnerPlayer?.name ?? null}
            />
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <GameLog log={gameState.gameLog} />

          <div className="glass-panel rounded-[1.75rem] p-4 sm:p-5">
            <p className="text-[11px] uppercase tracking-[0.26em] text-emerald-100/55">Table Status</p>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-100/74">
              <p>Connection: <span className="font-semibold capitalize text-white">{connectionState}</span></p>
              <p>Seat: <span className="font-semibold text-white">{southPlayer.name}</span></p>
              <p>Current lead: <span className="font-semibold text-white">{lastPlayedPlayer?.name ?? "Open table"}</span></p>
              <p>Next to act: <span className="font-semibold text-white">{currentTurnPlayer?.name ?? "-"}</span></p>
              <p>Pass state: <span className="font-semibold text-white">{gameState.passState.isStartingTrick ? "Fresh trick" : `${gameState.passState.passesInRow} in a row`}</span></p>
            </div>
          </div>

          <div className="glass-panel rounded-[1.75rem] p-4 sm:p-5">
            <p className="text-[11px] uppercase tracking-[0.26em] text-emerald-100/55">Quick Rules</p>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-100/74">
              <p>The opening move must include the 3 of Diamonds.</p>
              <p>You cannot pass when the center is clear and you are starting a new trick.</p>
              <p>Opponent hands stay private. You only see their card counts and public plays.</p>
            </div>
          </div>

          <div className="glass-panel rounded-[1.75rem] p-4 sm:p-5">
            <p className="text-[11px] uppercase tracking-[0.26em] text-emerald-100/55">Navigation</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push(`/room/${room?.code ?? roomCode}`)}
                className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/12"
              >
                Room View
              </button>
              <button
                type="button"
                onClick={leaveRoom}
                className="rounded-full border border-white/12 bg-black/18 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black/24"
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
