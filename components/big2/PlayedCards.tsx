"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Card as PlayingCard } from "@/components/big2/Card";
import { EvaluatedMove, Seat } from "@/lib/big2/types";

interface PlayedCardsProps {
  move: EvaluatedMove | null;
  seat?: Seat;
  playerName?: string;
}

const originBySeat: Record<Seat, { x: number; y: number }> = {
  south: { x: 0, y: 160 },
  west: { x: -180, y: 10 },
  north: { x: 0, y: -160 },
  east: { x: 180, y: 10 },
};

export function PlayedCards({ move, seat = "north", playerName }: PlayedCardsProps) {
  const origin = originBySeat[seat];

  return (
    <div className="glass-panel min-h-[200px] rounded-[2rem] border-white/10 p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-100/58">Current Trick</p>
          <p className="text-lg font-semibold text-white">{move ? playerName : "Open Table"}</p>
        </div>
        <div className="rounded-full border border-white/8 bg-white/6 px-3 py-1 text-xs text-slate-200/75">
          {move ? move.summary : "Any valid opening hand"}
        </div>
      </div>

      <div className="grid min-h-[118px] place-items-center">
        <AnimatePresence mode="wait">
          {move ? (
            <motion.div
              key={move.cards.map((card) => card.id).join("-")}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-wrap items-center justify-center gap-2 sm:gap-3"
            >
              {move.cards.map((card, index) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, x: origin.x, y: origin.y, rotate: origin.x / 24 }}
                  animate={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
                  transition={{ duration: 0.42, delay: index * 0.04, type: "spring", stiffness: 280, damping: 28 }}
                >
                  <PlayingCard card={card} size="sm" />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty-trick"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-[1.6rem] border border-dashed border-emerald-100/18 bg-black/12 px-6 py-8 text-center text-sm text-slate-200/60"
            >
              The center is clear. Lead any valid move.
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
