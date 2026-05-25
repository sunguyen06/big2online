"use client";

import { motion } from "framer-motion";
import { Card as PlayingCard } from "@/components/big2/Card";
import { PLACEHOLDER_AVATARS, PLACEHOLDER_BACK_NOTES } from "@/lib/big2/constants";
import { Player } from "@/lib/big2/types";

interface PlayerSeatProps {
  player: Player;
  active: boolean;
  isLead: boolean;
  statusText: string;
}

export function PlayerSeat({ player, active, isLead, statusText }: PlayerSeatProps) {
  const avatar = PLACEHOLDER_AVATARS[player.seat];

  return (
    <motion.div
      className={[
        "glass-panel relative rounded-[1.75rem] px-4 py-3 text-center transition-colors sm:px-5",
        active ? "gold-ring border-amber-200/35" : "",
      ].join(" ")}
      animate={active ? { scale: [1, 1.018, 1] } : { scale: 1 }}
      transition={{ duration: 1.4, repeat: active ? Number.POSITIVE_INFINITY : 0 }}
    >
      <div className="flex items-center justify-center gap-3">
        <div className="relative">
          {/*
            Placeholder avatar:
            replace this gradient badge with a real portrait or token asset later.
          */}
          <div
            className={[
              "grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br text-sm font-black tracking-[0.24em] text-slate-900",
              avatar.gradient,
              avatar.glow,
            ].join(" ")}
            title={PLACEHOLDER_BACK_NOTES}
          >
            {avatar.label}
          </div>
          {active ? (
            <span className="animate-soft-pulse absolute -inset-1 rounded-full border border-amber-200/45" />
          ) : null}
        </div>

        <div className="text-left">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-100/92">{player.name}</p>
            {isLead ? (
              <span className="rounded-full border border-emerald-200/25 bg-emerald-400/14 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                Lead
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-200/68">{statusText}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-3">
        <div className="relative h-14 w-20">
          {[0, 1, 2].map((index) => (
            <div
              key={`${player.id}-back-${index}`}
              className="absolute"
              style={{
                left: `${index * 14}px`,
                top: `${index * 2}px`,
                zIndex: index + 1,
              }}
            >
              <PlayingCard faceDown size="sm" delay={0.08 * index} initialOffset={{ y: -20 + index * 5 }} />
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-300/65">Cards</p>
          <p className="text-lg font-bold text-white">{player.hand.length}</p>
        </div>
      </div>
    </motion.div>
  );
}
