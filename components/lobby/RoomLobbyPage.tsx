"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { RulesModal } from "@/components/big2/RulesModal";
import { LobbySeatCard } from "@/components/lobby/LobbySeatCard";
import { useRoomLobby } from "@/lib/multiplayer/useRoomLobby";
import { useUiSoundEffects } from "@/lib/ui/useUiSoundEffects";

export function RoomLobbyPage({ roomCode }: { roomCode: string }) {
  const {
    canStartGame,
    connectionState,
    currentPlayer,
    currentPlayerId,
    errorMessage,
    isLeavingRoom,
    isStartingGame,
    leaveRoom,
    room,
    startGame,
  } = useRoomLobby(roomCode);
  const [copyFeedback, setCopyFeedback] = useState("Copy Code");
  const [rulesOpen, setRulesOpen] = useState(false);

  useUiSoundEffects();

  const slotViews = useMemo(
    () =>
      Array.from({ length: 4 }, (_, seatIndex) => ({
        player: room?.players.find((entry) => entry.seatIndex === seatIndex) ?? null,
        seatIndex,
      })),
    [room],
  );

  const disconnectedPlayers = room?.players.filter((player) => !player.connected) ?? [];

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

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-5 text-white sm:px-6 lg:px-8">
      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />

      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-[1500px] flex-col gap-5 xl:grid xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="table-shell felt-surface relative overflow-hidden rounded-[2.4rem] p-5 sm:p-7">
          <div className="absolute inset-[3%] rounded-[2rem] border border-white/6" />
          <div className="pointer-events-none absolute inset-x-[16%] top-6 h-24 rounded-full bg-white/6 blur-3xl" />

          <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
            <div className="glass-panel max-w-2xl rounded-[1.75rem] px-5 py-4 sm:px-6">
              <p className="text-[11px] uppercase tracking-[0.34em] text-amber-100/66">Private Room</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Lobby {roomCode}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-100/72">
                Fill every seat, let the host deal, and move the whole table into the round together.
              </p>
            </div>

            <div className="glass-panel rounded-[1.6rem] px-4 py-3 text-right">
              <p className="panel-label">Connection</p>
              <p className="mt-1 text-lg font-semibold capitalize text-white">{connectionState}</p>
              <p className="text-xs text-slate-200/64">
                {room ? `${room.players.length} / ${room.maxPlayers} players` : "Waiting for room sync"}
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-6">
            <div className="glass-panel rounded-[2rem] p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="panel-label">Room Code</p>
                  <div className="mt-2 rounded-[1.4rem] border border-white/10 bg-black/18 px-4 py-3 text-3xl font-black tracking-[0.32em] text-white sm:text-4xl">
                    {roomCode}
                  </div>
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

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {slotViews.map(({ player, seatIndex }) => (
                  <LobbySeatCard
                    key={`seat-${seatIndex}-${player?.id ?? "empty"}`}
                    currentPlayerId={currentPlayerId}
                    player={player}
                    seatIndex={seatIndex}
                  />
                ))}
              </div>
            </div>
          </div>

          {disconnectedPlayers.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative z-10 mt-5 rounded-[1.6rem] border border-amber-200/16 bg-amber-300/10 px-4 py-3 text-sm text-amber-50"
            >
              {disconnectedPlayers.map((player) => player.name).join(", ")} {disconnectedPlayers.length === 1 ? "is" : "are"} reconnecting.
            </motion.div>
          ) : null}

          {errorMessage ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative z-10 mt-5 rounded-[1.6rem] border border-rose-200/16 bg-rose-300/10 px-4 py-3 text-sm text-rose-50"
            >
              {errorMessage}
            </motion.div>
          ) : null}
        </section>

        <aside className="space-y-4">
          <div className="glass-panel rounded-[2rem] p-5">
            <p className="panel-label">Lobby Notes</p>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-100/70">
              <p>Refreshing this tab will try to restore the same seat using the saved player id and room code.</p>
              <p>If the lobby host disconnects before the round starts, host control is reassigned automatically.</p>
              <p>Room state is in memory for now, so restarting the backend clears active rooms.</p>
            </div>
          </div>

          <div className="glass-panel rounded-[1.8rem] p-5">
            <p className="panel-label">Table Status</p>
            <h2 className="mt-2 text-2xl font-bold text-white">
              {currentPlayer?.isHost ? "You are the host." : "Waiting for the host."}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-100/70">
              Only the host can start the round, and only after all 4 connected seats are filled.
            </p>

            {currentPlayer?.isHost ? (
              <button
                type="button"
                onClick={startGame}
                disabled={!canStartGame || isStartingGame}
                className="ui-button ui-button-gold mt-5 w-full rounded-2xl px-5 py-3.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isStartingGame ? "Dealing..." : "Start Game"}
              </button>
            ) : (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-100/70">
                The host will start the game when the lobby reaches 4 players.
              </div>
            )}

            <div className="mt-4 text-xs text-slate-100/58">
              {room?.players.length === 4
                ? "All seats are filled."
                : `Need ${Math.max(0, 4 - (room?.players.length ?? 0))} more player${room && 4 - room.players.length === 1 ? "" : "s"}.`}
            </div>
          </div>

          <div className="glass-panel rounded-[1.8rem] p-5">
            <p className="panel-label">Current Session</p>
            <div className="mt-3 space-y-2 text-sm text-slate-100/72">
              <p>
                Name: <span className="font-semibold text-white">{currentPlayer?.name ?? "Restoring..."}</span>
              </p>
              <p>
                Seat: <span className="font-semibold text-white">{typeof currentPlayer?.seatIndex === "number" ? currentPlayer.seatIndex + 1 : "-"}</span>
              </p>
              <p>
                Status: <span className="font-semibold capitalize text-white">{room?.status ?? "lobby"}</span>
              </p>
            </div>
          </div>

          <div className="glass-panel rounded-[1.8rem] p-5">
            <p className="panel-label">Navigation</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={leaveRoom}
                disabled={isLeavingRoom}
                className="ui-button ui-button-danger rounded-full px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLeavingRoom ? "Leaving..." : "Leave Room"}
              </button>
              <Link
                href="/"
                className="ui-button ui-button-ghost rounded-full px-4 py-2 text-sm font-semibold"
              >
                Back To Home
              </Link>
              <Link
                href="/solo"
                className="ui-button ui-button-dark rounded-full px-4 py-2 text-sm font-semibold"
              >
                Solo Prototype
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
