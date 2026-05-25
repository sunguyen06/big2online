export type Suit = 0 | 1 | 2 | 3;
export type Rank = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type Seat = "south" | "west" | "north" | "east";
export type PlayerKind = "human" | "cpu";

export type HandType =
  | "single"
  | "pair"
  | "triple"
  | "straight"
  | "flush"
  | "full-house"
  | "four-of-a-kind"
  | "straight-flush";

export interface Card {
  id: string;
  rank: Rank;
  suit: Suit;
}

export interface EvaluatedMove {
  cards: Card[];
  cardCount: 1 | 2 | 3 | 5;
  handType: HandType;
  categoryStrength: number;
  primaryRank: number;
  secondaryRank?: number;
  topSuit: number;
  strength: number[];
  summary: string;
}

export interface Player {
  id: number;
  name: string;
  kind: PlayerKind;
  seat: Seat;
  hand: Card[];
}

export interface LogEntry {
  id: string;
  message: string;
  tone: "play" | "pass" | "system" | "win";
}

export interface GameState {
  players: Player[];
  currentPlayer: number;
  leadPlayer: number;
  currentTrick: EvaluatedMove | null;
  currentTrickPlayer: number | null;
  passStreak: number;
  firstTurn: boolean;
  winner: number | null;
  phase: "dealing" | "playing" | "ended";
  log: LogEntry[];
  turnCount: number;
}

export interface ValidationResult {
  valid: boolean;
  message: string;
  move: EvaluatedMove | null;
}
