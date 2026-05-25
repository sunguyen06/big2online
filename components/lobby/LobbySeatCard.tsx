"use client";

import { AnimatePresence, motion } from "framer-motion";
import { PLACEHOLDER_AVATARS } from "@/lib/big2/constants";
import { LobbyPlayer } from "@/lib/multiplayer/types";

interface LobbySeatCardProps {
  currentPlayerId: string | null;
  player: LobbyPlayer | null;
  seatIndex: number;
}

export function LobbySeatCard({ currentPlayerId, player, seatIndex }: LobbySeatCardProps) {
  const seat = (["south", "west", "north", "east"][seatIndex] ?? "south") as keyof typeof PLACEHOLDER_AVATARS;
  const avatar = PLACEHOLDER_AVATARS[seat];

  return (
    <div className="glass-panel rounded-[1.7rem] border-white/10 px-4 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="panel-label">Seat {seatIndex + 1}</p>
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
            <div className="flex items-start gap-3">
              <div className="relative">
                {/*
                  Placeholder avatar circle:
                  swap this gradient token for a player-uploaded avatar image later.
                */}
                <div
                  className={[
                    "grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br text-sm font-black tracking-[0.24em] text-slate-900",
                    avatar.gradient,
                    avatar.glow,
                  ].join(" ")}
                >
                  {avatar.label}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-lg font-semibold text-white">{player.name}</p>
                  {player.id === currentPlayerId ? (
                    <span className="rounded-full border border-emerald-200/25 bg-emerald-300/12 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-50">
                      You
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-slate-100/66">
                  {player.connected ? "Connected and ready" : "Trying to reconnect"}
                </p>
              </div>

              <span
                className={`status-dot mt-1 h-2.5 w-2.5 rounded-full ${player.connected ? "bg-emerald-300 text-emerald-300" : "bg-rose-300 text-rose-300"}`}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={`empty-${seatIndex}`}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0.4 }}
            className="rounded-[1.5rem] border border-dashed border-white/12 bg-black/12 px-4 py-5"
          >
            <p className="text-sm font-semibold text-slate-100/72">Open seat</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-100/55">
              Share the room code to invite another player to this chair.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
