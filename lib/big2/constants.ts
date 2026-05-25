import { Seat } from "@/lib/big2/types";

export const RANK_LABELS = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"] as const;
export const SUIT_LABELS = ["Diamonds", "Clubs", "Hearts", "Spades"] as const;
export const SUIT_SYMBOLS = ["\u2666", "\u2663", "\u2665", "\u2660"] as const;

export const FIVE_CARD_STRENGTH: Record<string, number> = {
  straight: 1,
  flush: 2,
  "full-house": 3,
  "four-of-a-kind": 4,
  "straight-flush": 5,
};

export const PLAYER_BLUEPRINTS: Array<{
  id: number;
  name: string;
  seat: Seat;
  kind: "human" | "cpu";
}> = [
  { id: 0, name: "You", seat: "south", kind: "human" },
  { id: 1, name: "CPU 1", seat: "west", kind: "cpu" },
  { id: 2, name: "CPU 2", seat: "north", kind: "cpu" },
  { id: 3, name: "CPU 3", seat: "east", kind: "cpu" },
];

export const PLACEHOLDER_AVATARS: Record<
  Seat,
  {
    label: string;
    gradient: string;
    glow: string;
  }
> = {
  south: {
    label: "YR",
    gradient: "from-emerald-300 via-teal-200 to-cyan-100",
    glow: "shadow-[0_0_28px_rgba(116,255,200,0.22)]",
  },
  west: {
    label: "C1",
    gradient: "from-amber-200 via-yellow-100 to-stone-50",
    glow: "shadow-[0_0_28px_rgba(255,215,120,0.22)]",
  },
  north: {
    label: "C2",
    gradient: "from-sky-200 via-blue-100 to-indigo-50",
    glow: "shadow-[0_0_28px_rgba(130,196,255,0.2)]",
  },
  east: {
    label: "C3",
    gradient: "from-rose-200 via-orange-100 to-stone-50",
    glow: "shadow-[0_0_28px_rgba(255,160,128,0.2)]",
  },
};

export const PLACEHOLDER_BACK_NOTES =
  "Swap the CSS-only card back and avatar treatments here with real image assets later.";
