"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RulesModal } from "@/components/big2/RulesModal";
import { createRoomSession, joinRoomSession } from "@/lib/multiplayer/lobby-actions";
import { loadLobbySession } from "@/lib/multiplayer/session";
import { LobbySessionState } from "@/lib/multiplayer/types";
import { normalizeRoomCode, validateDisplayName, validateRoomCode } from "@/lib/multiplayer/utils";

const scatteredCards = [
  { label: "A", suit: "\u2660", x: "9%", y: "16%", rotate: -18, delay: 0.1 },
  { label: "K", suit: "\u2665", x: "83%", y: "18%", rotate: 16, delay: 0.3 },
  { label: "Q", suit: "\u2666", x: "15%", y: "72%", rotate: 18, delay: 0.5 },
  { label: "10", suit: "\u2663", x: "82%", y: "75%", rotate: -14, delay: 0.2 },
  { label: "2", suit: "\u2660", x: "68%", y: "10%", rotate: 10, delay: 0.6 },
  { label: "7", suit: "\u2666", x: "32%", y: "80%", rotate: -22, delay: 0.4 },
];

const floatingSuits = [
  { icon: "\u2660", x: "27%", y: "18%", delay: 0.2 },
  { icon: "\u2665", x: "76%", y: "30%", delay: 0.5 },
  { icon: "\u2666", x: "23%", y: "60%", delay: 0.7 },
  { icon: "\u2663", x: "71%", y: "64%", delay: 0.35 },
];

export function LobbyHomePage() {
  const router = useRouter();
  const [previousSession, setPreviousSession] = useState<LobbySessionState | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loadingMode, setLoadingMode] = useState<null | "create" | "join">(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  useEffect(() => {
    const storedSession = loadLobbySession();

    if (!storedSession) {
      return;
    }

    setPreviousSession(storedSession);
    setDisplayName((currentValue) => currentValue || storedSession.name);
    setJoinCode((currentValue) => currentValue || storedSession.roomCode);
  }, []);

  const createRoom = async () => {
    const nameValidation = validateDisplayName(displayName);

    if (!nameValidation.valid) {
      setFeedback(nameValidation.message);
      return;
    }

    setLoadingMode("create");
    setFeedback("");

    const result = await createRoomSession({ name: displayName });
    setLoadingMode(null);

    if (!result.ok) {
      setFeedback(result.error);
      return;
    }

    router.push(`/room/${result.data.room.code}`);
  };

  const joinRoom = async () => {
    const nameValidation = validateDisplayName(displayName);
    const roomCodeValidation = validateRoomCode(joinCode);

    if (!nameValidation.valid) {
      setFeedback(nameValidation.message);
      return;
    }

    if (!roomCodeValidation.valid) {
      setFeedback(roomCodeValidation.message);
      return;
    }

    setLoadingMode("join");
    setFeedback("");

    const result = await joinRoomSession({
      name: displayName,
      roomCode: joinCode,
    });
    setLoadingMode(null);

    if (!result.ok) {
      setFeedback(result.error);
      return;
    }

    router.push(`/room/${result.data.room.code}`);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#061910] px-4 py-4 text-[#f5f1df]">
      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(35,115,76,0.38),transparent_28%),radial-gradient(circle_at_50%_80%,rgba(15,58,39,0.56),transparent_36%),linear-gradient(180deg,#07150f_0%,#0b261b_22%,#11422f_54%,#0a281d_78%,#07150f_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,0.04)_0.7px,transparent_0.7px)] [background-size:18px_18px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,transparent_52%,rgba(0,0,0,0.28)_100%)]" />
      <div className="pointer-events-none absolute inset-x-[8%] top-[7%] h-px bg-gradient-to-r from-transparent via-[#d8bc70]/35 to-transparent" />

      {floatingSuits.map((suit, index) => (
        <motion.div
          key={`${suit.icon}-${index}`}
          className="pointer-events-none absolute select-none text-5xl text-[#d8bc70]/10 sm:text-6xl"
          style={{ left: suit.x, top: suit.y }}
          animate={{ y: [0, -12, 0], opacity: [0.08, 0.16, 0.08], rotate: [-6, 4, -6] }}
          transition={{ duration: 6.2, delay: suit.delay, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        >
          {suit.icon}
        </motion.div>
      ))}

      {scatteredCards.map((card, index) => (
        <motion.div
          key={`${card.label}-${card.suit}-${index}`}
          className="pointer-events-none absolute hidden rounded-[1.4rem] border border-[#e8d8a7]/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] px-4 py-5 text-left shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur md:block"
          style={{ left: card.x, top: card.y, rotate: `${card.rotate}deg` }}
          animate={{ y: [0, -10, 0], rotate: [`${card.rotate}deg`, `${card.rotate + 2}deg`, `${card.rotate}deg`] }}
          transition={{ duration: 6.8, delay: card.delay, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        >
          <div className="flex h-24 w-16 flex-col justify-between text-[#f7f0dd]/24">
            <span className="font-['Georgia','Times_New_Roman',serif] text-xl font-bold leading-none">
              {card.label}
              {card.suit}
            </span>
            <span className="self-center text-3xl">{card.suit}</span>
            <span className="self-end rotate-180 font-['Georgia','Times_New_Roman',serif] text-xl font-bold leading-none">
              {card.label}
              {card.suit}
            </span>
          </div>
        </motion.div>
      ))}

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1440px] flex-col">
        <header className="flex items-center justify-between px-2 py-2 sm:px-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full border border-[#d8bc70]/35 bg-black/20 text-lg text-[#f0dc9e] shadow-[0_0_30px_rgba(216,188,112,0.16)] backdrop-blur">
              {"\u2660"}
            </div>
            <div>
              <p className="font-['Georgia','Times_New_Roman',serif] text-sm font-bold uppercase tracking-[0.24em] text-[#f5ecd0]">
                Big 2 Online
              </p>
              <p className="text-xs tracking-[0.16em] text-[#d1c7a6]/60">Private card room</p>
            </div>
          </div>

          <Link
            href="/solo"
            className="ui-button ui-button-dark rounded-full px-4 py-2 text-sm font-semibold text-[#f6eed6]"
          >
            Solo Prototype
          </Link>
        </header>

        <section className="flex flex-1 flex-col items-center justify-center px-2 py-12 text-center sm:px-4">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="max-w-[720px]"
          >

            <h1 className="mt-5 font-['Georgia','Times_New_Roman',serif] text-[3.1rem] font-bold uppercase leading-[0.92] tracking-[0.08em] text-[#f6efd8] sm:text-[5.2rem] lg:text-[6.6rem]">
              Big 2
              <span className="block bg-[linear-gradient(180deg,#fff7da_0%,#e6c67b_55%,#a37b2f_100%)] bg-clip-text text-transparent">
                Online
              </span>
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.55 }}
            className="mt-10 w-full max-w-[430px]"
          >
            <div className="rounded-[1.8rem] border border-[#e2cb8d]/16 bg-[linear-gradient(180deg,rgba(4,13,10,0.64),rgba(7,21,16,0.82))] p-3 shadow-[0_28px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl">
              <div className="space-y-3 rounded-[1.4rem] border border-white/5 bg-black/10 p-4 sm:p-5">
                <div className="text-left">
                  <label className="mb-2 block text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#d8bc70]/88">
                    Display Name
                  </label>
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Enter your name"
                    className="w-full rounded-[1.05rem] border border-[#d8bc70]/16 bg-[#0a1912]/88 px-4 py-3 text-sm text-[#000000] outline-none transition placeholder:text-[#e7dfc3]/34 focus:border-[#d8bc70]/50"
                  />
                </div>

                <div className="text-left">
                  <label className="mb-2 block text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#d8bc70]/88">
                    Room Code
                  </label>
                  <input
                    value={joinCode}
                    onChange={(event) => setJoinCode(normalizeRoomCode(event.target.value))}
                    placeholder="Enter room code"
                    maxLength={6}
                    className="w-full rounded-[1.05rem] border border-[#d8bc70]/16 bg-[#0a1912]/88 px-4 py-3 text-center text-sm uppercase tracking-[0.45em] text-[#000000] outline-none transition placeholder:text-[#e7dfc3]/34 focus:border-[#d8bc70]/50"
                  />
                </div>

                <button
                  type="button"
                  onClick={joinRoom}
                  disabled={loadingMode !== null}
                  className="ui-button group relative w-full overflow-hidden rounded-[1.2rem] bg-[linear-gradient(180deg,#f2da98_0%,#d8bc70_48%,#a78035_100%)] px-6 py-4 font-['Georgia','Times_New_Roman',serif] text-[1.85rem] font-bold uppercase tracking-[0.08em] text-[#1a1407] shadow-[0_24px_55px_rgba(167,128,53,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="absolute inset-0 bg-[linear-gradient(120deg,transparent_30%,rgba(255,255,255,0.24),transparent_68%)] opacity-0 transition duration-500 group-hover:translate-x-10 group-hover:opacity-100" />
                  <span className="relative">
                    {loadingMode === "join" ? "Joining..." : "Join Room"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={createRoom}
                  disabled={loadingMode !== null}
                  className="ui-button w-full rounded-[1rem] border border-[#d8bc70]/20 bg-[#10261b]/82 px-4 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-[#f2e8c9] hover:bg-[#163526] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingMode === "create" ? "Creating..." : "Create Private Room"}
                </button>

                <button
                  type="button"
                  onClick={() => setRulesOpen(true)}
                  className="ui-button ui-button-ghost w-full rounded-[1rem] px-4 py-3 text-sm font-semibold uppercase tracking-[0.22em]"
                >
                  Quick Rules
                </button>
              </div>
            </div>

            {feedback ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-[1rem] border border-[#ffcfb3]/16 bg-[#2d130d]/74 px-4 py-3 text-sm text-[#f3d6c9]"
              >
                {feedback}
              </motion.div>
            ) : null}

            {previousSession ? (
              <motion.button
                type="button"
                onClick={() => router.push(`/room/${previousSession.roomCode}`)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 w-full rounded-[1rem] border border-[#d8bc70]/16 bg-black/18 px-4 py-3 text-sm font-medium text-[#efe7cb] transition hover:bg-black/26"
              >
                Rejoin {previousSession.roomCode} as {previousSession.name}
              </motion.button>
            ) : null}
          </motion.div>
        </section>

        <div className="absolute bottom-4 left-4 hidden max-w-[340px] rounded-[1.3rem] border border-[#d8bc70]/14 bg-[linear-gradient(180deg,rgba(9,22,16,0.76),rgba(5,12,10,0.84))] px-4 py-3 text-left text-sm text-[#e0d6b4] shadow-[0_20px_50px_rgba(0,0,0,0.28)] backdrop-blur md:block">
          <p className="font-semibold uppercase tracking-[0.18em] text-[#f5ebcf]">Private room rules</p>
          <p className="mt-2 leading-6 text-[#d4ccae]/78">Room codes are required to join. Private tables can start with 3 or 4 players, and 3-player rooms add 2 jokers so the deal stays even.</p>
        </div>
      </div>
    </main>
  );
}
