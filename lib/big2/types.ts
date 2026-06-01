export const SUITS = [0, 1, 2, 3] as const;
export const RANKS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export type Suit = (typeof SUITS)[number];
export type Rank = (typeof RANKS)[number];
export type JokerColor = "black" | "red";
export type JokerRank = 13;
export type JokerSuit = 4 | 5;
export type CardRank = Rank | JokerRank;
export type CardSuit = Suit | JokerSuit;
export type Seat = "south" | "west" | "north" | "east";
export type PlayerKind = "human" | "cpu";

export type MoveType =
  | "single"
  | "pair"
  | "triple"
  | "straight"
  | "flush"
  | "full-house"
  | "four-of-a-kind"
  | "straight-flush";

export type HandType = MoveType;
export type GameStatus = "dealing" | "playing" | "ended";

export interface Card {
  id: string;
  rank: CardRank;
  suit: CardSuit;
  isJoker?: boolean;
  jokerColor?: JokerColor;
}

export interface Move {
  cards: Card[];
  type: MoveType;
  handType: MoveType;
  cardCount: 1 | 2 | 3 | 5;
  isBomb?: boolean;
  categoryRank: number;
  primaryRank: CardRank;
  secondaryRank?: CardRank;
  topSuit: CardSuit;
  strength: number[];
  summary: string;
}

export type EvaluatedMove = Move;

export interface Player {
  id: number;
  name: string;
  kind: PlayerKind;
  seat: Seat;
  hand: Card[];
}

export interface TurnState {
  currentPlayer: number;
  currentMove: Move | null;
  currentMovePlayer: number | null;
  lastValidPlayPlayer: number;
  passesInRow: number;
  isStartingTrick: boolean;
  isFirstTurn: boolean;
}

export interface LogEntry {
  id: string;
  message: string;
  tone: "play" | "pass" | "system" | "win";
}

export interface GameState {
  players: Player[];
  status: GameStatus;
  turn: TurnState;
  winner: number | null;
  finishedOrder: number[];
  log: LogEntry[];
  turnCount: number;
  currentPlayer: number;
  leadPlayer: number;
  currentTrick: Move | null;
  currentTrickPlayer: number | null;
  passStreak: number;
  firstTurn: boolean;
  phase: GameStatus;
}

export interface ValidationResult {
  valid: boolean;
  message: string;
  move: Move | null;
}
