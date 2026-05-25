"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useRoomLobby } from "@/lib/multiplayer/useRoomLobby";

export function RoomLobbyPage({ roomCode }: { roomCode: string }) {
  const {
    canStartGame,
    connectionState,
    currentPlayer,
    currentPlayerId,
    errorMessage,
    isStartingGame,
    room,
    startGame,
  } = useRoomLobby(roomCode);
  const [copyFeedback, setCopyFeedback] = useState("Copy");

  const slotViews = useMemo(() => {
    return Array.from({ length: 4 }, (_, seatIndex) => {
      const player = room?.players.find((entry) => entry.seatIndex === seatIndex) ?? null;
      return {
        player,
        seatIndex,
      };
    });
  }, [room]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopyFeedback("Copied");
      window.setTimeout(() => setCopyFeedback("Copy"), 1200);
    } catch {
      setCopyFeedback("Unable");
      window.setTimeout(() => setCopyFeedback("Copy"), 1200);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-[1500px] flex-col gap-5 xl:grid xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="felt-surface relative overflow-hidden rounded-[2.4rem] border border-emerald-100/10 p-5 shadow-[0_40px_120px_rgba(0,0,0,0.42)] sm:p-7">
          <div className="absolute inset-[4%] rounded-[2rem] border border-white/6" />

          <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
            <div className="glass-panel max-w-2xl rounded-[1.75rem] border border-white/10 px-5 py-4 sm:px-6">
              <p className="text-[11px] uppercase tracking-[0.34em] text-amber-100/66">Private Room</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Lobby {roomCode}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-100/72">
                Fill every seat, let the host start the round, and move the whole table into the game together.
              </p>
            </div>

            <div className="glass-panel rounded-[1.6rem] px-4 py-3 text-right">
              <p className="text-[11px] uppercase tracking-[0.26em] text-emerald-100/55">Connection</p>
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
                  <p className="text-[11px] uppercase tracking-[0.26em] text-emerald-100/55">Room Code</p>
                  <div className="mt-2 rounded-[1.4rem] border border-white/10 bg-black/18 px-4 py-3 text-3xl font-black tracking-[0.32em] text-white sm:text-4xl">
                    {roomCode}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/12"
                >
                  {copyFeedback}
                </button>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {slotViews.map(({ player, seatIndex }) => (
                  <div
                    key={`seat-${seatIndex}`}
                    className="glass-panel rounded-[1.7rem] border-white/10 px-4 py-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-100/55">
                        Seat {seatIndex + 1}
                      </p>
                      {player?.isHost ? (
                        <span className="rounded-full border border-amber-200/24 bg-amber-300/12 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-50">
                          Host
                        </span>
                      ) : null}
                    </div>

                    <AnimatePresence mode="wait" initial={false}>
                      {player ? (
                        <motion.div
                          key={player.id}
                          initial={{ opacity: 0, y: 14, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -14, scale: 0.96 }}
                          className="rounded-[1.5rem] border border-emerald-100/10 bg-emerald-100/6 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-lg font-semibold text-white">{player.name}</p>
                              <p className="mt-1 text-xs text-slate-100/66">
                                {player.connected ? "Connected" : "Reconnecting"}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {player.id === currentPlayerId ? (
                                <span className="rounded-full border border-emerald-200/25 bg-emerald-300/12 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-50">
                                  You
                                </span>
                              ) : null}
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${player.connected ? "bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.65)]" : "bg-rose-300"}`}
                              />
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key={`empty-${seatIndex}`}
                          initial={{ opacity: 0.5 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0.4 }}
                          className="rounded-[1.5rem] border border-dashed border-white/12 bg-black/12 px-4 py-6 text-sm text-slate-100/55"
                        >
                          Waiting for a player to join this seat.
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          </div>

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
            <p className="text-[11px] uppercase tracking-[0.26em] text-emerald-100/55">Lobby Notes</p>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-100/70">
              <p>Players who disconnect from the lobby are removed immediately and the host is reassigned automatically.</p>
              <p>If this tab refreshes, it will try to rejoin the same room using the stored player id and room code.</p>
              <p>The room is deleted from memory automatically when every player has left.</p>
            </div>
          </div>

          <div className="glass-panel rounded-[1.8rem] p-5">
            <p className="text-[11px] uppercase tracking-[0.26em] text-emerald-100/55">Table Status</p>
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
                className="mt-5 w-full rounded-2xl bg-[linear-gradient(180deg,#ffe7a4_0%,#d4b464_100%)] px-5 py-3.5 text-sm font-bold text-slate-900 shadow-[0_16px_30px_rgba(212,180,100,0.24)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isStartingGame ? "Starting Game..." : "Start Game"}
              </button>
            ) : (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-100/70">
                The host will start the game when the lobby reaches 4 players.
              </div>
            )}

            <div className="mt-4 text-xs text-slate-100/58">
              {room?.players.length === 4 ? "All seats are filled." : `Need ${Math.max(0, 4 - (room?.players.length ?? 0))} more player${room && 4 - room.players.length === 1 ? "" : "s"}.`}
            </div>
          </div>

          <div className="glass-panel rounded-[1.8rem] p-5">
            <p className="text-[11px] uppercase tracking-[0.26em] text-emerald-100/55">Current Session</p>
            <div className="mt-3 space-y-2 text-sm text-slate-100/72">
              <p>Name: <span className="font-semibold text-white">{currentPlayer?.name ?? "Restoring..."}</span></p>
              <p>Seat: <span className="font-semibold text-white">{typeof currentPlayer?.seatIndex === "number" ? currentPlayer.seatIndex + 1 : "-"}</span></p>
              <p>Status: <span className="font-semibold capitalize text-white">{room?.status ?? "lobby"}</span></p>
            </div>
          </div>

          <div className="glass-panel rounded-[1.8rem] p-5">
            <p className="text-[11px] uppercase tracking-[0.26em] text-emerald-100/55">Navigation</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/12"
              >
                Back To Home
              </Link>
              <Link
                href="/solo"
                className="rounded-full border border-white/12 bg-black/18 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black/24"
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
