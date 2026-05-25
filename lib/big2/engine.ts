import {
  FIVE_CARD_STRENGTH,
  PLAYER_BLUEPRINTS,
  RANK_LABELS,
  SUIT_LABELS,
  SUIT_SYMBOLS,
} from "@/lib/big2/constants";
import { Card, EvaluatedMove, GameState, LogEntry, Player, ValidationResult } from "@/lib/big2/types";

const THREE_OF_DIAMONDS_ID = "0-0";

export function createInitialGameState(): GameState {
  const deck = shuffle(createDeck());
  const hands = deal(deck);
  const players: Player[] = PLAYER_BLUEPRINTS.map((blueprint, index) => ({
    ...blueprint,
    hand: sortCards(hands[index]),
  }));

  const starter = players.findIndex((player) => player.hand.some((card) => card.id === THREE_OF_DIAMONDS_ID));

  return {
    players,
    currentPlayer: starter,
    leadPlayer: starter,
    currentTrick: null,
    currentTrickPlayer: null,
    passStreak: 0,
    firstTurn: true,
    winner: null,
    phase: "dealing",
    turnCount: 0,
    log: [
      makeLog(`${players[starter].name} holds 3♦ and will lead the opening trick.`, "system"),
      makeLog("First play must include 3♦. Straights use 3 through A only in this version.", "system"),
    ],
  };
}

export function setPhase(state: GameState, phase: GameState["phase"]): GameState {
  return {
    ...state,
    phase,
  };
}

export function getCardLabel(card: Card) {
  return `${RANK_LABELS[card.rank]}${SUIT_SYMBOLS[card.suit]}`;
}

export function getSuitName(suit: number) {
  return SUIT_LABELS[suit as 0 | 1 | 2 | 3];
}

export function getRankName(rank: number, plural = false) {
  const singular = [
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Jack",
    "Queen",
    "King",
    "Ace",
    "Two",
  ][rank];

  if (!plural) {
    return singular;
  }

  if (singular === "Six") {
    return "Sixes";
  }

  if (singular === "Three") {
    return "Threes";
  }

  if (singular === "Five") {
    return "Fives";
  }

  return `${singular}s`;
}

export function sortCards(cards: Card[]) {
  return [...cards].sort(compareCards);
}

export function compareCards(a: Card, b: Card) {
  if (a.rank !== b.rank) {
    return a.rank - b.rank;
  }

  return a.suit - b.suit;
}

export function getSelectionValidation(
  state: GameState,
  playerIndex: number,
  cards: Card[],
): ValidationResult {
  if (state.winner !== null) {
    return { valid: false, message: `${state.players[state.winner].name} already won the round.`, move: null };
  }

  if (state.phase === "dealing") {
    return { valid: false, message: "Dealing cards...", move: null };
  }

  if (state.currentPlayer !== playerIndex) {
    return { valid: false, message: "Waiting for the other players.", move: null };
  }

  if (cards.length === 0) {
    if (state.currentTrick) {
      return { valid: false, message: "Select cards that can beat the current play.", move: null };
    }

    return { valid: false, message: "Your turn.", move: null };
  }

  const move = evaluateMove(cards);

  if (!move) {
    return { valid: false, message: "Invalid hand.", move: null };
  }

  if (state.firstTurn && !cards.some((card) => card.id === THREE_OF_DIAMONDS_ID)) {
    return { valid: false, message: "Opening play must include 3♦.", move };
  }

  if (!state.currentTrick) {
    return { valid: true, message: `Play ${move.summary}.`, move };
  }

  if (move.cardCount !== state.currentTrick.cardCount) {
    return { valid: false, message: "Match the current play size.", move };
  }

  if (move.cardCount === 5 && move.categoryStrength > state.currentTrick.categoryStrength) {
    return { valid: true, message: `${move.summary} beats the current play.`, move };
  }

  if (move.handType !== state.currentTrick.handType) {
    return {
      valid: false,
      message: "Must match the current hand type unless playing a stronger five-card category.",
      move,
    };
  }

  if (compareMoves(move, state.currentTrick) <= 0) {
    return { valid: false, message: "Must beat current play.", move };
  }

  return { valid: true, message: `${move.summary} beats the current play.`, move };
}

export function applyMove(state: GameState, playerIndex: number, move: EvaluatedMove): GameState {
  if (state.currentPlayer !== playerIndex || state.winner !== null) {
    return state;
  }

  const nextPlayers = state.players.map((player, index) => {
    if (index !== playerIndex) {
      return player;
    }

    const moveIds = new Set(move.cards.map((card) => card.id));

    return {
      ...player,
      hand: sortCards(player.hand.filter((card) => !moveIds.has(card.id))),
    };
  });

  const winner = nextPlayers[playerIndex].hand.length === 0 ? playerIndex : null;

  const nextState: GameState = {
    ...state,
    players: nextPlayers,
    currentPlayer: winner === null ? (playerIndex + 1) % state.players.length : playerIndex,
    leadPlayer: playerIndex,
    currentTrick: move,
    currentTrickPlayer: playerIndex,
    passStreak: 0,
    firstTurn: false,
    winner,
    phase: winner === null ? state.phase : "ended",
    turnCount: state.turnCount + 1,
  };

  const withPlayLog = appendLog(
    nextState,
    makeLog(`${state.players[playerIndex].name} played ${move.summary}.`, "play"),
  );

  if (winner === null) {
    return withPlayLog;
  }

  return appendLog(
    withPlayLog,
    makeLog(`${state.players[playerIndex].name} wins the round.`, "win"),
  );
}

export function applyPass(state: GameState, playerIndex: number): GameState {
  if (state.currentPlayer !== playerIndex || state.winner !== null || !state.currentTrick) {
    return state;
  }

  const nextPassStreak = state.passStreak + 1;
  const passLogged = appendLog(state, makeLog(`${state.players[playerIndex].name} passed.`, "pass"));

  if (nextPassStreak < state.players.length - 1) {
    return {
      ...passLogged,
      currentPlayer: (playerIndex + 1) % state.players.length,
      passStreak: nextPassStreak,
      turnCount: state.turnCount + 1,
    };
  }

  return appendLog(
    {
      ...passLogged,
      currentPlayer: state.leadPlayer,
      currentTrick: null,
      currentTrickPlayer: null,
      passStreak: 0,
      turnCount: state.turnCount + 1,
    },
    makeLog(`${state.players[state.leadPlayer].name} takes the lead for a fresh trick.`, "system"),
  );
}

export function chooseCpuMove(state: GameState, playerIndex: number) {
  const player = state.players[playerIndex];
  const legalMoves = getLegalMoves(player.hand, state);

  if (legalMoves.length === 0) {
    return null;
  }

  legalMoves.sort((a, b) => {
    if (!state.currentTrick) {
      const sizeDiff = openingCardCountPriority(a.cardCount) - openingCardCountPriority(b.cardCount);
      if (sizeDiff !== 0) {
        return sizeDiff;
      }
    }

    if (a.cardCount === 5 && b.cardCount === 5 && a.categoryStrength !== b.categoryStrength) {
      return a.categoryStrength - b.categoryStrength;
    }

    return compareMoves(a, b);
  });

  return legalMoves[0];
}

export function getPlayableCardIds(state: GameState, playerIndex: number, selectedCards: Card[] = []) {
  if (
    state.phase !== "playing" ||
    state.winner !== null ||
    state.currentPlayer !== playerIndex
  ) {
    return new Set<string>();
  }

  const player = state.players[playerIndex];
  const selectedIds = new Set(selectedCards.map((card) => card.id));
  const candidateMoves = getLegalMoves(player.hand, state).filter((move) =>
    [...selectedIds].every((cardId) => move.cards.some((card) => card.id === cardId)),
  );

  return new Set(
    candidateMoves.flatMap((move) =>
      move.cards.map((card) => card.id),
    ),
  );
}

export function evaluateMove(cards: Card[]): EvaluatedMove | null {
  const sorted = sortCards(cards);

  if (sorted.length === 1) {
    const [card] = sorted;
    return {
      cards: sorted,
      cardCount: 1,
      handType: "single",
      categoryStrength: 0,
      primaryRank: card.rank,
      topSuit: card.suit,
      strength: [card.rank, card.suit],
      summary: `${getCardLabel(card)}`,
    };
  }

  if (sorted.length === 2 && sorted[0].rank === sorted[1].rank) {
    return {
      cards: sorted,
      cardCount: 2,
      handType: "pair",
      categoryStrength: 0,
      primaryRank: sorted[0].rank,
      topSuit: sorted[1].suit,
      strength: [sorted[0].rank, sorted[1].suit],
      summary: `a pair of ${getRankName(sorted[0].rank, true)}`,
    };
  }

  if (sorted.length === 3 && sorted.every((card) => card.rank === sorted[0].rank)) {
    return {
      cards: sorted,
      cardCount: 3,
      handType: "triple",
      categoryStrength: 0,
      primaryRank: sorted[0].rank,
      topSuit: sorted[2].suit,
      strength: [sorted[0].rank, sorted[2].suit],
      summary: `three ${getRankName(sorted[0].rank, true)}`,
    };
  }

  if (sorted.length !== 5) {
    return null;
  }

  const isFlush = sorted.every((card) => card.suit === sorted[0].suit);
  const straightHighCard = getStraightHighCard(sorted);
  const groups = groupByRank(sorted);
  const counts = [...groups.values()].map((group) => group.length).sort((a, b) => b - a);

  if (straightHighCard && isFlush) {
    return {
      cards: sorted,
      cardCount: 5,
      handType: "straight-flush",
      categoryStrength: FIVE_CARD_STRENGTH["straight-flush"],
      primaryRank: straightHighCard.rank,
      topSuit: straightHighCard.suit,
      strength: [straightHighCard.rank, straightHighCard.suit],
      summary: `a straight flush, ${RANK_LABELS[straightHighCard.rank]} high`,
    };
  }

  if (counts[0] === 4) {
    const quadGroup = [...groups.values()].find((group) => group.length === 4);
    const kicker = [...groups.values()].find((group) => group.length === 1);

    if (!quadGroup || !kicker) {
      return null;
    }

    const quadHighSuit = sortCards(quadGroup)[3].suit;

    return {
      cards: sorted,
      cardCount: 5,
      handType: "four-of-a-kind",
      categoryStrength: FIVE_CARD_STRENGTH["four-of-a-kind"],
      primaryRank: quadGroup[0].rank,
      secondaryRank: kicker[0].rank,
      topSuit: quadHighSuit,
      strength: [quadGroup[0].rank, quadHighSuit, kicker[0].rank, kicker[0].suit],
      summary: `four of a kind, ${getRankName(quadGroup[0].rank, true)}`,
    };
  }

  if (counts[0] === 3 && counts[1] === 2) {
    const tripleGroup = [...groups.values()].find((group) => group.length === 3);
    const pairGroup = [...groups.values()].find((group) => group.length === 2);

    if (!tripleGroup || !pairGroup) {
      return null;
    }

    const tripleHighSuit = sortCards(tripleGroup)[2].suit;

    return {
      cards: sorted,
      cardCount: 5,
      handType: "full-house",
      categoryStrength: FIVE_CARD_STRENGTH["full-house"],
      primaryRank: tripleGroup[0].rank,
      secondaryRank: pairGroup[0].rank,
      topSuit: tripleHighSuit,
      strength: [tripleGroup[0].rank, tripleHighSuit, pairGroup[0].rank],
      summary: `a full house, ${getRankName(tripleGroup[0].rank, true)} over ${getRankName(pairGroup[0].rank, true)}`,
    };
  }

  if (isFlush) {
    const descending = [...sorted].sort((a, b) => compareCardPower(b, a));

    return {
      cards: sorted,
      cardCount: 5,
      handType: "flush",
      categoryStrength: FIVE_CARD_STRENGTH.flush,
      primaryRank: descending[0].rank,
      topSuit: descending[0].suit,
      strength: descending.map(cardPower),
      summary: `a ${getSuitName(sorted[0].suit)} flush`,
    };
  }

  if (straightHighCard) {
    return {
      cards: sorted,
      cardCount: 5,
      handType: "straight",
      categoryStrength: FIVE_CARD_STRENGTH.straight,
      primaryRank: straightHighCard.rank,
      topSuit: straightHighCard.suit,
      strength: [straightHighCard.rank, straightHighCard.suit],
      summary: `a straight, ${RANK_LABELS[straightHighCard.rank]} high`,
    };
  }

  return null;
}

export function compareMoves(a: EvaluatedMove, b: EvaluatedMove) {
  if (a.cardCount === 5 && b.cardCount === 5 && a.categoryStrength !== b.categoryStrength) {
    return a.categoryStrength - b.categoryStrength;
  }

  return compareStrengthArrays(a.strength, b.strength);
}

function getLegalMoves(hand: Card[], state: GameState) {
  const candidates = [
    ...buildCombinations(hand, 1),
    ...buildCombinations(hand, 2),
    ...buildCombinations(hand, 3),
    ...buildCombinations(hand, 5),
  ];

  return candidates
    .map((combo) => evaluateMove(combo))
    .filter((move): move is EvaluatedMove => move !== null)
    .filter((move) => {
      if (state.firstTurn && !move.cards.some((card) => card.id === THREE_OF_DIAMONDS_ID)) {
        return false;
      }

      if (!state.currentTrick) {
        return true;
      }

      if (move.cardCount !== state.currentTrick.cardCount) {
        return false;
      }

      if (move.cardCount === 5 && move.categoryStrength > state.currentTrick.categoryStrength) {
        return true;
      }

      if (move.handType !== state.currentTrick.handType) {
        return false;
      }

      return compareMoves(move, state.currentTrick) > 0;
    });
}

function createDeck() {
  const deck: Card[] = [];

  for (let rank = 0; rank < RANK_LABELS.length; rank += 1) {
    for (let suit = 0; suit < SUIT_SYMBOLS.length; suit += 1) {
      deck.push({
        id: `${rank}-${suit}`,
        rank: rank as Card["rank"],
        suit: suit as Card["suit"],
      });
    }
  }

  return deck;
}

function shuffle(deck: Card[]) {
  const copy = [...deck];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function deal(deck: Card[]) {
  return Array.from({ length: 4 }, (_, playerIndex) =>
    deck.filter((_, cardIndex) => cardIndex % 4 === playerIndex),
  );
}

function buildCombinations(cards: Card[], size: number) {
  const result: Card[][] = [];

  const walk = (startIndex: number, current: Card[]) => {
    if (current.length === size) {
      result.push([...current]);
      return;
    }

    for (let index = startIndex; index < cards.length; index += 1) {
      current.push(cards[index]);
      walk(index + 1, current);
      current.pop();
    }
  };

  walk(0, []);
  return result;
}

function getStraightHighCard(cards: Card[]) {
  const sorted = sortCards(cards);
  const uniqueRanks = new Set(sorted.map((card) => card.rank));

  if (uniqueRanks.size !== 5) {
    return null;
  }

  // Assumption for this version:
  // straights run only from 3-4-5-6-7 up to 10-J-Q-K-A.
  // We intentionally do not allow wraparound sequences that include 2.
  if (sorted[4].rank > 11) {
    return null;
  }

  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index].rank !== sorted[index - 1].rank + 1) {
      return null;
    }
  }

  return sorted[4];
}

function groupByRank(cards: Card[]) {
  const map = new Map<number, Card[]>();

  cards.forEach((card) => {
    const group = map.get(card.rank) ?? [];
    group.push(card);
    map.set(card.rank, group);
  });

  return map;
}

function openingCardCountPriority(cardCount: number) {
  return { 1: 1, 2: 2, 3: 3, 5: 4 }[cardCount] ?? 10;
}

function compareStrengthArrays(a: number[], b: number[]) {
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const delta = (a[index] ?? 0) - (b[index] ?? 0);

    if (delta !== 0) {
      return delta;
    }
  }

  return 0;
}

function cardPower(card: Card) {
  return card.rank * 4 + card.suit;
}

function compareCardPower(a: Card, b: Card) {
  return cardPower(a) - cardPower(b);
}

function appendLog(state: GameState, entry: LogEntry) {
  return {
    ...state,
    log: [entry, ...state.log].slice(0, 14),
  };
}

function makeLog(message: string, tone: LogEntry["tone"]): LogEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message,
    tone,
  };
}
