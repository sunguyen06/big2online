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
          <p className="panel-label">Action</p>
          <p className="mt-1 text-sm text-slate-100/86">{validationMessage}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onRestart}
            className="ui-button ui-button-ghost rounded-full px-4 py-2 text-sm font-semibold"
          >
            Restart Round
          </button>
          <button
            type="button"
            onClick={onPass}
            disabled={!canPass}
            className="ui-button ui-button-dark rounded-full px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-35"
          >
            Pass
          </button>
          <button
            type="button"
            onClick={onPlay}
            disabled={!canPlay}
            className="ui-button ui-button-gold rounded-full px-6 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
          >
            Play Cards
          </button>
        </div>
      </div>
    </div>
  );
}
