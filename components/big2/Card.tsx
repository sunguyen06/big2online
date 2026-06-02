"use client";

import { memo } from "react";
import { getCardLabel } from "@/lib/big2/engine";
import { Card as GameCard } from "@/lib/big2/types";

interface CardProps {
  card?: GameCard;
  faceDown?: boolean;
  selected?: boolean;
  playable?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  size?: "sm" | "compact" | "md";
  delay?: number;
  initialOffset?: { x?: number; y?: number; rotate?: number };
  className?: string;
  animationKey?: number | string;
}

const sizeClasses = {
  sm: "h-24 w-[68px] sm:h-28 sm:w-[78px]",
  compact: "h-[6.8rem] w-[76px] sm:h-[7.4rem] sm:w-[82px] lg:h-32 lg:w-[88px]",
  md: "h-32 w-[92px] sm:h-36 sm:w-[100px] lg:h-40 lg:w-[112px]",
};

function CardView({
  card,
  faceDown = false,
  selected = false,
  playable = false,
  interactive = false,
  onClick,
  size = "md",
  className = "",
}: CardProps) {
  const isJoker = !!card?.isJoker;
  const isRed = isJoker ? card?.jokerColor === "red" : card?.suit === 0 || card?.suit === 2;
  const label = card ? getCardLabel(card) : "";
  const cornerRank = isJoker ? (card?.jokerColor === "red" ? "RJ" : "BJ") : label.slice(0, -1);
  const cornerSuit = isJoker ? "★" : label.slice(-1);

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
          <div className="absolute inset-[10%] rounded-[1rem] border border-sky-100/20 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_35%),repeating-linear-gradient(135deg,_rgba(255,255,255,0.08)_0,_rgba(255,255,255,0.08)_6px,_transparent_6px,_transparent_12px),repeating-linear-gradient(45deg,_rgba(255,255,255,0.04)_0,_rgba(255,255,255,0.04)_5px,_transparent_5px,_transparent_10px),linear-gradient(180deg,rgba(28,98,129,0.9),rgba(10,37,54,0.95))]" />
          <div className="absolute inset-0 grid place-items-center">
            <div className="relative h-12 w-12 rounded-full border border-white/20 bg-white/8">
              <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[0.7rem] border border-sky-100/24 bg-white/6" />
              <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-100/75" />
            </div>
          </div>
        </>
      ) : (
        <>
          {/*
            Placeholder face rendering:
            replace this rank/suit layout with real card face image assets later if needed.
          */}
          {playable && !selected ? (
            <div className="pointer-events-none absolute inset-x-5 top-2 rounded-full border border-amber-300/45 bg-amber-200/26 px-2 py-0.5 text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-950/80">
              Playable
            </div>
          ) : null}

          <div className={`absolute left-3 top-2 flex flex-col leading-none ${isRed ? "text-rose-600" : "text-slate-900"}`}>
            <span className="text-lg font-bold">{cornerRank}</span>
            <span className="text-lg">{cornerSuit}</span>
          </div>

          <div className={`absolute inset-0 grid place-items-center ${isRed ? "text-rose-500" : "text-slate-800"}`}>
            {isJoker ? (
              <div className="text-center">
                <div className="text-[0.75rem] font-semibold uppercase tracking-[0.28em]">Joker</div>
                <div className="mt-1 text-[2.1rem] sm:text-[2.6rem]">★</div>
              </div>
            ) : (
              <span className="text-[2.8rem] sm:text-[3.4rem]">{label.slice(-1)}</span>
            )}
          </div>

          <div className={`absolute bottom-2 right-3 flex rotate-180 flex-col leading-none ${isRed ? "text-rose-600" : "text-slate-900"}`}>
            <span className="text-lg font-bold">{cornerRank}</span>
            <span className="text-lg">{cornerSuit}</span>
          </div>
        </>
      )}
    </div>
  );

  if (interactive && onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={[
          "relative rounded-[1.25rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200",
          selected ? "ring-2 ring-emerald-300/90 shadow-[0_0_0_1px_rgba(110,231,183,0.35),0_18px_42px_rgba(16,185,129,0.28)]" : "",
        ].join(" ")}
      >
        {frame}
      </button>
    );
  }

  return (
    <div
      className={[
        selected ? "ring-2 ring-emerald-300/90 shadow-[0_0_0_1px_rgba(110,231,183,0.35),0_18px_42px_rgba(16,185,129,0.28)]" : "",
      ].join(" ")}
    >
      {frame}
    </div>
  );
}

function areOffsetsEqual(
  left?: { x?: number; y?: number; rotate?: number },
  right?: { x?: number; y?: number; rotate?: number },
) {
  return left?.x === right?.x && left?.y === right?.y && left?.rotate === right?.rotate;
}

export const Card = memo(CardView, (previous, next) => {
  return (
    previous.card === next.card &&
    previous.faceDown === next.faceDown &&
    previous.selected === next.selected &&
    previous.playable === next.playable &&
    previous.interactive === next.interactive &&
    previous.size === next.size &&
    previous.delay === next.delay &&
    previous.className === next.className &&
    previous.animationKey === next.animationKey &&
    previous.onClick === next.onClick &&
    areOffsetsEqual(previous.initialOffset, next.initialOffset)
  );
});
