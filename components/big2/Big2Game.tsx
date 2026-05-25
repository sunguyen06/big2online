"use client";

import { startTransition, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GameControls } from "@/components/big2/GameControls";
import { GameLog } from "@/components/big2/GameLog";
import { Hand } from "@/components/big2/Hand";
import { PlayerSeat } from "@/components/big2/PlayerSeat";
import { PlayedCards } from "@/components/big2/PlayedCards";
import { WinnerModal } from "@/components/big2/WinnerModal";
import {
  applyMove,
  applyPass,
  chooseCpuMove,
  createInitialGameState,
  getPlayableCardIds,
  getSelectionValidation,
  setPhase,
} from "@/lib/big2/engine";
import { GameState } from "@/lib/big2/types";
import { useUiSoundEffects } from "@/lib/ui/useUiSoundEffects";

const DEALING_DELAY_MS = 1500;

export function Big2Game() {
  const [game, setGame] = useState<GameState | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastPlayedLogId, setLastPlayedLogId] = useState<string | null>(null);

  const { playCardPlaySound, playCardSelectSound } = useUiSoundEffects({
    isPlayersTurn: !!game && game.phase === "playing" && game.winner === null && game.currentPlayer === 0,
    turnCueEnabled: !!game,
  });

  useEffect(() => {
    setGame(createInitialGameState());
  }, []);

  useEffect(() => {
    if (!game) {
      return undefined;
    }

    if (game.phase !== "dealing") {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setGame((current) => (current ? setPhase(current, "playing") : current));
    }, DEALING_DELAY_MS);

    return () => window.clearTimeout(timeout);
  }, [game]);

  useEffect(() => {
    if (!game) {
      return;
    }

    setSelectedIds([]);
  }, [game]);

  useEffect(() => {
    if (!game) {
      return;
    }

    const latestLogEntry = game.log[0];

    if (!latestLogEntry || latestLogEntry.tone !== "play") {
      return;
    }

    if (latestLogEntry.id === lastPlayedLogId) {
      return;
    }

    setLastPlayedLogId(latestLogEntry.id);
    playCardPlaySound();
  }, [game, lastPlayedLogId, playCardPlaySound]);

  useEffect(() => {
    if (!game) {
      return undefined;
    }

    const currentPlayer = game.players[game.currentPlayer];

    if (game.phase !== "playing" || game.winner !== null || currentPlayer.kind !== "cpu") {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setGame((current) => {
        if (!current) {
          return current;
        }

        if (
          current.phase !== "playing" ||
          current.winner !== null ||
          current.players[current.currentPlayer].kind !== "cpu"
        ) {
          return current;
        }

        const cpuMove = chooseCpuMove(current, current.currentPlayer);

        if (!cpuMove) {
          return applyPass(current, current.currentPlayer);
        }

        return applyMove(current, current.currentPlayer, cpuMove);
      });
    }, game.currentTrick ? 950 : 1150);

    return () => window.clearTimeout(timeout);
  }, [game]);

  if (!game) {
    return (
      <main className="relative min-h-screen overflow-hidden px-4 py-4 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1600px] items-center justify-center">
          <div className="glass-panel rounded-[2rem] px-8 py-10 text-center">
            <p className="text-[11px] uppercase tracking-[0.34em] text-amber-100/62">Big 2 Online</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Shuffling The Deck</h1>
            <p className="mt-3 text-sm text-slate-100/72">Setting up a fresh table for your next hand.</p>
          </div>
        </div>
      </main>
    );
  }

  const humanPlayer = game.players[0];
  const northPlayer = game.players.find((player) => player.seat === "north")!;
  const westPlayer = game.players.find((player) => player.seat === "west")!;
  const eastPlayer = game.players.find((player) => player.seat === "east")!;
  const selectedCards = humanPlayer.hand.filter((card) => selectedIds.includes(card.id));
  const validation = getSelectionValidation(game, 0, selectedCards);
  const playableCardIds = [...getPlayableCardIds(game, 0, selectedCards)];
  const canPass = game.phase === "playing" && game.winner === null && game.currentPlayer === 0 && game.currentTrick !== null;
  const winnerName = game.winner !== null ? game.players[game.winner].name : null;
  const playedBy = game.currentTrickPlayer !== null ? game.players[game.currentTrickPlayer] : null;

  const toggleCard = (cardId: string) => {
    if (game.currentPlayer !== 0 || game.winner !== null || game.phase !== "playing") {
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

  const handlePlay = () => {
    if (!validation.valid || !validation.move) {
      return;
    }

    setGame((current) => (current ? applyMove(current, 0, validation.move!) : current));
  };

  const handlePass = () => {
    if (!canPass) {
      return;
    }

    setGame((current) => (current ? applyPass(current, 0) : current));
  };

  const handleRestart = () => {
    startTransition(() => {
      setLastPlayedLogId(null);
      setSelectedIds([]);
      setGame(createInitialGameState());
    });
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-4 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1600px] flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="relative flex min-h-[900px] flex-col rounded-[2.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-4 shadow-[0_40px_120px_rgba(0,0,0,0.42)] sm:p-5 lg:p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-amber-100/62">Big 2 Online</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Single-Player Table</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-100/72">
                Beat the current play, manage the lead, and empty your hand before the CPUs do.
              </p>
            </div>

            <div className="glass-panel rounded-[1.5rem] px-4 py-3 text-right">
              <p className="text-[11px] uppercase tracking-[0.26em] text-emerald-100/55">Turn</p>
              <p className="mt-1 text-lg font-semibold text-white">{game.players[game.currentPlayer].name}</p>
              <p className="text-xs text-slate-200/65">
                {game.currentTrick ? `${game.passStreak} pass${game.passStreak === 1 ? "" : "es"} in a row` : "Fresh trick"}
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
                  active={game.currentPlayer === northPlayer.id}
                  isLead={game.leadPlayer === northPlayer.id}
                  statusText={game.currentPlayer === northPlayer.id ? "Thinking..." : "Watching the center"}
                />
              </div>

              <div className="col-start-1 row-start-2 flex items-center">
                <PlayerSeat
                  player={westPlayer}
                  active={game.currentPlayer === westPlayer.id}
                  isLead={game.leadPlayer === westPlayer.id}
                  statusText={game.currentPlayer === westPlayer.id ? "Thinking..." : "Waiting to respond"}
                />
              </div>

              <div className="col-start-3 row-start-2 flex items-center justify-end">
                <PlayerSeat
                  player={eastPlayer}
                  active={game.currentPlayer === eastPlayer.id}
                  isLead={game.leadPlayer === eastPlayer.id}
                  statusText={game.currentPlayer === eastPlayer.id ? "Thinking..." : "Reading the table"}
                />
              </div>

              <div className="col-start-2 row-start-2 flex items-center justify-center">
                <PlayedCards move={game.currentTrick} seat={playedBy?.seat} playerName={playedBy?.name} />
              </div>

              <div className="col-span-3 row-start-3">
                <GameControls
                  canPlay={validation.valid}
                  canPass={canPass}
                  validationMessage={validation.message}
                  onPlay={handlePlay}
                  onPass={handlePass}
                  onRestart={handleRestart}
                />
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
                      <p className="text-sm text-slate-100/74">Sorted in Big 2 order. Click cards to select a move.</p>
                    </div>
                    <div className="rounded-full border border-white/10 bg-black/16 px-3 py-1 text-xs text-slate-100/72">
                      {humanPlayer.hand.length} cards left
                    </div>
                  </div>

                  <Hand
                    cards={humanPlayer.hand}
                    selectedIds={selectedIds}
                    playableIds={playableCardIds}
                    onCardClick={(card) => toggleCard(card.id)}
                    interactive
                    dealt={game.phase !== "dealing"}
                  />
                </motion.div>
              </div>
            </div>

            <WinnerModal actionLabel="Deal Another Round" onAction={handleRestart} winnerName={winnerName} />
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <GameLog log={game.log} />

          <div className="glass-panel rounded-[1.75rem] p-4 sm:p-5">
            <p className="text-[11px] uppercase tracking-[0.26em] text-emerald-100/55">House Rules</p>
            <h2 className="mt-1 text-xl font-semibold text-white">This Build</h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-100/74">
              <p>Singles, pairs, triples, and all standard five-card Big 2 hands are supported.</p>
              <p>Five-card categories rank from straight up to straight flush. Higher categories beat lower ones.</p>
              <p>Straights are limited to 3 through A in this first pass, which keeps comparisons predictable and easy to modify later.</p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
