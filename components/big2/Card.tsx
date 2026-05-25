"use client";

import { motion } from "framer-motion";
import { getCardLabel } from "@/lib/big2/engine";
import { Card as GameCard } from "@/lib/big2/types";

interface CardProps {
  card?: GameCard;
  faceDown?: boolean;
  selected?: boolean;
  playable?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  size?: "sm" | "md";
  delay?: number;
  initialOffset?: { x?: number; y?: number; rotate?: number };
  className?: string;
}

const sizeClasses = {
  sm: "h-24 w-[68px] sm:h-28 sm:w-[78px]",
  md: "h-32 w-[92px] sm:h-36 sm:w-[100px] lg:h-40 lg:w-[112px]",
};

export function Card({
  card,
  faceDown = false,
  selected = false,
  playable = false,
  interactive = false,
  onClick,
  size = "md",
  delay = 0,
  initialOffset,
  className = "",
}: CardProps) {
  const isRed = card?.suit === 0 || card?.suit === 2;
  const label = card ? getCardLabel(card) : "";

  const frame = (
    <div
      className={[
        "card-sheen relative overflow-hidden rounded-[1.25rem] border border-white/12 shadow-[0_18px_30px_rgba(0,0,0,0.38)]",
        sizeClasses[size],
        faceDown
          ? "bg-[linear-gradient(145deg,#123f55_0%,#0a2638_45%,#081823_100%)]"
          : "bg-[linear-gradient(180deg,#fffdfa_0%,#f7f1e7_100%)] text-slate-900",
        playable && !selected
          ? "border-amber-200/90 shadow-[0_0_0_1px_rgba(251,191,36,0.34),0_0_28px_rgba(251,191,36,0.18),0_18px_30px_rgba(0,0,0,0.38)]"
          : "",
        selected ? "ring-2 ring-emerald-300/90 shadow-[0_0_0_1px_rgba(110,231,183,0.35),0_18px_42px_rgba(16,185,129,0.28)]" : "",
        className,
      ].join(" ")}
    >
      {faceDown ? (
        <>
          {/*
            Placeholder card back:
            replace this patterned div with a real back image later if desired.
          */}
          <div className="absolute inset-[10%] rounded-[1rem] border border-sky-100/20 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_35%),repeating-linear-gradient(135deg,_rgba(255,255,255,0.08)_0,_rgba(255,255,255,0.08)_6px,_transparent_6px,_transparent_12px),linear-gradient(180deg,rgba(28,98,129,0.9),rgba(10,37,54,0.95))]" />
          <div className="absolute inset-0 grid place-items-center">
            <div className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold tracking-[0.34em] text-sky-50">
              BIG 2
            </div>
          </div>
        </>
      ) : (
        <>
          {playable && !selected ? (
            <div className="pointer-events-none absolute inset-x-5 top-2 rounded-full border border-amber-300/45 bg-amber-200/26 px-2 py-0.5 text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-950/80">
              Playable
            </div>
          ) : null}

          <div className={`absolute left-3 top-2 flex flex-col leading-none ${isRed ? "text-rose-600" : "text-slate-900"}`}>
            <span className="text-lg font-bold">{label.slice(0, -1)}</span>
            <span className="text-lg">{label.slice(-1)}</span>
          </div>

          <div className={`absolute inset-0 grid place-items-center text-[2.8rem] sm:text-[3.4rem] ${isRed ? "text-rose-500" : "text-slate-800"}`}>
            <span>{label.slice(-1)}</span>
          </div>

          <div className={`absolute bottom-2 right-3 flex rotate-180 flex-col leading-none ${isRed ? "text-rose-600" : "text-slate-900"}`}>
            <span className="text-lg font-bold">{label.slice(0, -1)}</span>
            <span className="text-lg">{label.slice(-1)}</span>
          </div>
        </>
      )}
    </div>
  );

  const animationProps = {
    initial: {
      opacity: 0,
      scale: 0.8,
      x: initialOffset?.x ?? 0,
      y: initialOffset?.y ?? 24,
      rotate: initialOffset?.rotate ?? 0,
    },
    animate: {
      opacity: 1,
      scale: selected ? 1.02 : playable ? 1.01 : 1,
      y: selected ? -16 : 0,
      x: 0,
      rotate: 0,
    },
    transition: {
      delay,
      duration: 0.35,
      type: "spring" as const,
      stiffness: 320,
      damping: 28,
    },
    whileHover: interactive ? { y: selected ? -18 : -6, scale: 1.02 } : undefined,
    whileTap: interactive ? { scale: 0.98 } : undefined,
  };

  if (interactive && onClick) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        className="relative rounded-[1.25rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
        {...animationProps}
      >
        {frame}
      </motion.button>
    );
  }

  return <motion.div {...animationProps}>{frame}</motion.div>;
}
