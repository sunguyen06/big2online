"use client";

import { AnimatePresence, motion } from "framer-motion";

interface RulesModalProps {
  open: boolean;
  onClose: () => void;
}

const rankOrder = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"];
const suitOrder = ["Diamonds", "Clubs", "Hearts", "Spades"];
const handTypes = ["Single", "Pair", "Triple", "Straight", "Flush", "Full House", "Four of a Kind", "Straight Flush"];

export function RulesModal({ open, onClose }: RulesModalProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-[radial-gradient(circle,_rgba(9,25,18,0.44),_rgba(3,7,6,0.88))] p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="glass-panel max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-white/10 p-6 sm:p-7"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="panel-label">Table Rules</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-white">How This Big 2 Table Plays</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-100/72">
                  This prototype uses a standard private-room Big 2 flow with one clear house-rule assumption for straights.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="ui-button ui-button-ghost rounded-full px-4 py-2 text-sm font-semibold"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <section className="rounded-[1.5rem] border border-white/8 bg-black/16 p-4">
                <p className="panel-label">Rank Order</p>
                <p className="mt-3 text-sm leading-relaxed text-slate-100/78">
                  Lowest to highest: {rankOrder.join(" < ")}
                </p>
              </section>

              <section className="rounded-[1.5rem] border border-white/8 bg-black/16 p-4">
                <p className="panel-label">Suit Order</p>
                <p className="mt-3 text-sm leading-relaxed text-slate-100/78">
                  Lowest to highest: {suitOrder.join(" < ")}
                </p>
              </section>
            </div>

            <section className="mt-4 rounded-[1.5rem] border border-white/8 bg-black/16 p-4">
              <p className="panel-label">Valid Hand Types</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-100/78">{handTypes.join(", ")}</p>
            </section>

            <section className="mt-4 rounded-[1.5rem] border border-white/8 bg-black/16 p-4">
              <p className="panel-label">Five-Card Ranking</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-100/78">
                From weakest to strongest: Straight, Flush, Full House, Four of a Kind, Straight Flush.
              </p>
            </section>

            <section className="mt-4 rounded-[1.5rem] border border-amber-200/16 bg-amber-300/8 p-4">
              <p className="panel-label text-amber-100/72">Opening Rule</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-100/82">
                The first move of the round must include the 3 of Diamonds. You also cannot pass when you are starting a fresh trick.
              </p>
            </section>

            <section className="mt-4 rounded-[1.5rem] border border-white/8 bg-black/16 p-4">
              <p className="panel-label">Straight Assumption</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-100/78">
                This prototype uses straights from 3-4-5-6-7 up to 10-J-Q-K-A only. 2 is not used inside a straight in this build.
              </p>
            </section>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
