"use client";

import { LogEntry } from "@/lib/big2/types";

interface GameLogProps {
  log: LogEntry[];
}

const toneStyles: Record<LogEntry["tone"], string> = {
  play: "border-emerald-200/14 bg-emerald-300/8 text-emerald-50",
  pass: "border-slate-200/10 bg-white/5 text-slate-100/78",
  system: "border-sky-200/14 bg-sky-300/8 text-sky-50/90",
  win: "border-amber-200/14 bg-amber-300/10 text-amber-50",
};

export function GameLog({ log }: GameLogProps) {
  return (
    <div className="glass-panel flex h-full min-h-[220px] flex-col rounded-[1.75rem] p-4 sm:p-5 lg:min-h-0">
      <div className="mb-3">
        <p className="panel-label">Recent Action</p>
        <h2 className="mt-1 text-xl font-semibold text-white">Game Log</h2>
      </div>

      <div className="scroll-fade space-y-2 overflow-y-auto pr-1">
        {log.map((entry) => (
          <div
            key={entry.id}
            className={[
              "rounded-2xl border px-3 py-2 text-sm leading-relaxed shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
              toneStyles[entry.tone],
            ].join(" ")}
          >
            {entry.message}
          </div>
        ))}
      </div>
    </div>
  );
}
