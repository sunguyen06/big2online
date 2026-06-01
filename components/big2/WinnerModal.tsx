"use client";

import { AnimatePresence, motion } from "framer-motion";

interface PlacementEntry {
  name: string;
  place: number;
  summary: string;
}

interface WinnerModalProps {
  actionLabel?: string;
  actionDisabled?: boolean;
  placements?: PlacementEntry[];
  message?: string;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  winnerName: string | null;
  onAction: () => void;
}

export function WinnerModal({
  actionLabel = "Back To Lobby",
  actionDisabled = false,
  placements = [],
  message = "cleared every card and takes the table.",
  secondaryActionLabel,
  onSecondaryAction,
  winnerName,
  onAction,
}: WinnerModalProps) {
  const hasPlacements = placements.length > 0;

  return (
    <AnimatePresence>
      {winnerName || hasPlacements ? (
        <motion.div
          className="absolute inset-0 z-40 grid place-items-center bg-[radial-gradient(circle,_rgba(10,33,23,0.48),_rgba(4,10,8,0.88))] p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="glass-panel w-full max-w-lg rounded-[2rem] border-amber-200/18 px-6 py-8 text-center"
          >
            <p className="text-[11px] uppercase tracking-[0.34em] text-amber-100/68">
              {hasPlacements ? "Final Placements" : "Round Complete"}
            </p>
            <h2 className="mt-3 text-4xl font-bold text-white">
              {hasPlacements ? "Leaderboard" : winnerName}
            </h2>

            {hasPlacements ? (
              <div className="mt-5 space-y-3 text-left">
                {placements.map((placement) => (
                  <div
                    key={`${placement.place}-${placement.name}`}
                    className={[
                      "flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
                      placement.place === 1
                        ? "border-amber-200/28 bg-amber-300/12"
                        : placement.place === 2
                          ? "border-slate-200/10 bg-white/6"
                          : placement.place === 3
                            ? "border-amber-100/10 bg-black/18"
                            : "border-white/8 bg-black/18",
                    ].join(" ")}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={[
                          "grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-black uppercase tracking-[0.18em]",
                          placement.place === 1
                            ? "bg-amber-300/20 text-amber-50"
                            : placement.place === 2
                              ? "bg-slate-200/14 text-slate-50"
                              : placement.place === 3
                                ? "bg-orange-300/14 text-orange-50"
                                : "bg-white/10 text-slate-50",
                        ].join(" ")}
                      >
                        {ordinalLabel(placement.place)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-white">{placement.name}</p>
                        <p className="text-xs text-slate-100/68">{placement.summary}</p>
                      </div>
                    </div>

                    <div className="rounded-full border border-white/10 bg-black/18 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-100/72">
                      {placement.place === 1 ? "Champion" : `${ordinalLabel(placement.place)} place`}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-slate-100/74">{message}</p>
            )}

            <button
              type="button"
              onClick={onAction}
              disabled={actionDisabled}
              className="ui-button ui-button-gold mt-6 rounded-full px-6 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLabel}
            </button>

            {secondaryActionLabel && onSecondaryAction ? (
              <button
                type="button"
                onClick={onSecondaryAction}
                className="ui-button ui-button-ghost mt-3 rounded-full px-6 py-3 text-sm font-semibold"
              >
                {secondaryActionLabel}
              </button>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function ordinalLabel(place: number) {
  if (place % 100 >= 11 && place % 100 <= 13) {
    return `${place}th`;
  }

  switch (place % 10) {
    case 1:
      return `${place}st`;
    case 2:
      return `${place}nd`;
    case 3:
      return `${place}rd`;
    default:
      return `${place}th`;
  }
}
