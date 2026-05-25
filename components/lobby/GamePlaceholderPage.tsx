"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadGameSnapshot, loadLobbySession } from "@/lib/multiplayer/session";
import { LobbyRoom } from "@/lib/multiplayer/types";
import { normalizeRoomCode } from "@/lib/multiplayer/utils";

export function GamePlaceholderPage({ roomCode }: { roomCode: string }) {
  const normalizedCode = normalizeRoomCode(roomCode);
  const [room, setRoom] = useState<LobbyRoom | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);

  useEffect(() => {
    const snapshot = loadGameSnapshot();
    const session = loadLobbySession();

    if (snapshot?.room.code === normalizedCode) {
      setRoom(snapshot.room);
      setCurrentPlayerId(snapshot.currentPlayerId);
      return;
    }

    if (session?.roomCode === normalizedCode) {
      setCurrentPlayerId(session.playerId);
    }
  }, [normalizedCode]);

  const currentPlayer = room?.players.find((player) => player.id === currentPlayerId) ?? null;

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-[1280px] flex-col gap-5 xl:grid xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="felt-surface rounded-[2.4rem] border border-emerald-100/10 p-6 shadow-[0_40px_120px_rgba(0,0,0,0.42)] sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.34em] text-amber-100/66">Game Transition</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-white">Room {normalizedCode}</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-100/72">
            The full multiplayer card gameplay can plug in here next. For now, this page confirms that every player in the lobby received the start signal and arrived with the shared room context.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="glass-panel rounded-[1.8rem] p-5">
              <p className="text-[11px] uppercase tracking-[0.26em] text-emerald-100/55">Current Player</p>
              <p className="mt-2 text-2xl font-bold text-white">{currentPlayer?.name ?? "Restoring session..."}</p>
              <p className="mt-2 text-sm text-slate-100/68">
                {currentPlayer ? `Seat ${currentPlayer.seatIndex + 1}` : "Waiting for room snapshot data."}
              </p>
            </div>

            <div className="glass-panel rounded-[1.8rem] p-5">
              <p className="text-[11px] uppercase tracking-[0.26em] text-emerald-100/55">Room Status</p>
              <p className="mt-2 text-2xl font-bold text-white">{room?.status ?? "game"}</p>
              <p className="mt-2 text-sm text-slate-100/68">
                {room ? `${room.players.length} players moved from the lobby.` : "Stored room data will appear here after the lobby syncs."}
              </p>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="glass-panel rounded-[2rem] p-5">
            <p className="text-[11px] uppercase tracking-[0.26em] text-emerald-100/55">Players</p>
            <div className="mt-4 space-y-3">
              {room?.players.map((player) => (
                <div key={player.id} className="rounded-[1.5rem] border border-white/10 bg-black/14 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{player.name}</p>
                      <p className="text-xs text-slate-100/62">Seat {player.seatIndex + 1}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {player.id === currentPlayerId ? (
                        <span className="rounded-full border border-emerald-200/25 bg-emerald-300/12 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-50">
                          You
                        </span>
                      ) : null}
                      {player.isHost ? (
                        <span className="rounded-full border border-amber-200/24 bg-amber-300/12 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-50">
                          Host
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              )) ?? (
                <div className="rounded-[1.5rem] border border-dashed border-white/12 bg-black/12 px-4 py-4 text-sm text-slate-100/58">
                  No room snapshot is stored for this tab yet.
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-5">
            <p className="text-[11px] uppercase tracking-[0.26em] text-emerald-100/55">Navigation</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={`/room/${normalizedCode}`}
                className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/12"
              >
                Back To Lobby
              </Link>
              <Link
                href="/"
                className="rounded-full border border-white/12 bg-black/18 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black/24"
              >
                Home
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
