"use client";

import { AnimatePresence, motion } from "framer-motion";

interface WinnerModalProps {
  actionLabel?: string;
  actionDisabled?: boolean;
  message?: string;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  winnerName: string | null;
  onAction: () => void;
}

export function WinnerModal({
  actionLabel = "Back To Lobby",
  actionDisabled = false,
  message = "cleared every card and takes the table.",
  secondaryActionLabel,
  onSecondaryAction,
  winnerName,
  onAction,
}: WinnerModalProps) {
  return (
    <AnimatePresence>
      {winnerName ? (
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
            className="glass-panel w-full max-w-md rounded-[2rem] border-amber-200/18 px-6 py-8 text-center"
          >
            <p className="text-[11px] uppercase tracking-[0.34em] text-amber-100/68">Round Complete</p>
            <h2 className="mt-3 text-4xl font-bold text-white">{winnerName}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-100/74">
              {message}
            </p>

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
