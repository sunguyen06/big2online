"use client";

interface GameControlsProps {
  canPlay: boolean;
  canPass: boolean;
  validationMessage: string;
  onPlay: () => void;
  onPass: () => void;
  onRestart: () => void;
}

export function GameControls({
  canPlay,
  canPass,
  validationMessage,
  onPlay,
  onPass,
  onRestart,
}: GameControlsProps) {
  return (
    <div className="glass-panel rounded-[1.75rem] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.26em] text-emerald-100/55">Action</p>
          <p className="mt-1 text-sm text-slate-100/86">{validationMessage}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onRestart}
            className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/12"
          >
            Restart Round
          </button>
          <button
            type="button"
            onClick={onPass}
            disabled={!canPass}
            className="rounded-full border border-white/10 bg-black/20 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-black/30 disabled:cursor-not-allowed disabled:opacity-35"
          >
            Pass
          </button>
          <button
            type="button"
            onClick={onPlay}
            disabled={!canPlay}
            className="rounded-full bg-[linear-gradient(180deg,#ffe7a4_0%,#d4b464_100%)] px-6 py-2.5 text-sm font-bold text-slate-900 shadow-[0_12px_24px_rgba(212,180,100,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Play Cards
          </button>
        </div>
      </div>
    </div>
  );
}
