import {
  FIVE_CARD_STRENGTH,
  PLAYER_BLUEPRINTS,
  RANK_LABELS,
  SUIT_LABELS,
  SUIT_SYMBOLS,
} from "@/lib/big2/constants";
import {
  Card,
  CardRank,
  CardSuit,
  EvaluatedMove,
  GameState,
  GameStatus,
  LogEntry,
  Move,
  Player,
  PlayerKind,
  Rank,
  Suit,
  ValidationResult,
} from "@/lib/big2/types";

const MIN_PLAYER_COUNT = 3;
const MAX_PLAYER_COUNT = 4;
const JOKER_RANK = 13;
const BLACK_JOKER_SUIT = 4;
const RED_JOKER_SUIT = 5;
const BLACK_JOKER_ID = "joker-black";
const RED_JOKER_ID = "joker-red";
const THREE_OF_DIAMONDS_ID = "0-0";
const DEFAULT_SEAT_ORDER: Player["seat"][] = ["south", "west", "north", "east"];

export function createDeck({ includeJokers = false }: { includeJokers?: boolean } = {}): Card[] {
  const deck: Card[] = [];

  for (let rank = 0; rank < RANK_LABELS.length; rank += 1) {
    for (let suit = 0; suit < SUIT_SYMBOLS.length; suit += 1) {
      deck.push({
        id: `${rank}-${suit}`,
        rank: rank as Rank,
        suit: suit as Suit,
      });
    }
  }

  if (includeJokers) {
    deck.push({
      id: BLACK_JOKER_ID,
      isJoker: true,
      jokerColor: "black",
      rank: JOKER_RANK,
      suit: BLACK_JOKER_SUIT,
    });
    deck.push({
      id: RED_JOKER_ID,
      isJoker: true,
      jokerColor: "red",
      rank: JOKER_RANK,
      suit: RED_JOKER_SUIT,
    });
  }

  return deck;
}

export function shuffleDeck(deck: Card[], random: () => number = Math.random): Card[] {
  const copy = [...deck];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

export function dealCards(deck: Card[], playerCount: number): Card[][] {
  if (playerCount < MIN_PLAYER_COUNT || playerCount > MAX_PLAYER_COUNT) {
    throw new Error(`Expected ${MIN_PLAYER_COUNT} or ${MAX_PLAYER_COUNT} players, received ${playerCount}.`);
  }

  if (deck.length % playerCount !== 0) {
    throw new Error(`Expected a deck divisible across ${playerCount} players, received ${deck.length} cards.`);
  }

  const cardsPerPlayer = deck.length / playerCount;

  return Array.from({ length: playerCount }, (_, playerIndex) =>
    deck.slice(playerIndex * cardsPerPlayer, (playerIndex + 1) * cardsPerPlayer),
  );
}

export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((left, right) => getCardValue(left) - getCardValue(right));
}

export function getCardValue(card: Card): number {
  if (card.isJoker) {
    return 52 + (card.jokerColor === "red" ? 1 : 0);
  }

  return card.rank * SUIT_SYMBOLS.length + getSuitValue(card.suit);
}

export function getSuitValue(suit: CardSuit): number {
  return suit;
}

export function identifyMove(cards: Card[]): Move | null {
  const sorted = sortCards(cards);

  if (sorted.length === 1) {
    const [card] = sorted;

    return createMove(sorted, "single", 0, card.rank, undefined, card.suit, [getCardValue(card)], getCardLabel(card));
  }

  if (sorted.length === 2 && sorted[0].rank === sorted[1].rank) {
    const topCard = sorted[1];

    return createMove(
      sorted,
      "pair",
      0,
      sorted[0].rank,
      undefined,
      topCard.suit,
      [sorted[0].rank, topCard.suit],
      `a pair of ${getRankName(sorted[0].rank, true)}`,
    );
  }

  if (sorted.length === 3 && sorted.every((card) => card.rank === sorted[0].rank)) {
    const topCard = sorted[2];

    return createMove(
      sorted,
      "triple",
      0,
      sorted[0].rank,
      undefined,
      topCard.suit,
      [sorted[0].rank, topCard.suit],
      `three ${getRankName(sorted[0].rank, true)}`,
    );
  }

  if (sorted.length === 4 && sorted.every((card) => card.rank === sorted[0].rank)) {
    const topCard = sorted[3];

    return createMove(
      sorted,
      "four-of-a-kind",
      0,
      sorted[0].rank,
      undefined,
      topCard.suit,
      [sorted[0].rank, topCard.suit],
      `four of a kind, ${getRankName(sorted[0].rank, true)}`,
    );
  }

  if (sorted.length !== 5) {
    return null;
  }

  if (sorted.some((card) => card.isJoker)) {
    return null;
  }

  const straightHighCard = getStraightHighCard(sorted);
  const isFlush = sorted.every((card) => card.suit === sorted[0].suit);
  const groups = groupCardsByRank(sorted);
  const groupedCards = [...groups.values()].sort((left, right) => {
    if (right.length !== left.length) {
      return right.length - left.length;
    }

    return right[0].rank - left[0].rank;
  });

  if (straightHighCard && isFlush) {
    return createMove(
      sorted,
      "straight-flush",
      FIVE_CARD_STRENGTH["straight-flush"],
      straightHighCard.rank,
      undefined,
      straightHighCard.suit,
      buildStraightStrength(FIVE_CARD_STRENGTH["straight-flush"], straightHighCard),
      `a straight flush, ${getStandardRankLabel(straightHighCard.rank)} high`,
    );
  }

  if (groupedCards[0]?.length === 4 && groupedCards[1]?.length === 1) {
    const quadCards = sortCards(groupedCards[0]);
    const kicker = groupedCards[1][0];

    return createMove(
      sorted,
      "four-of-a-kind",
      FIVE_CARD_STRENGTH["four-of-a-kind"],
      quadCards[0].rank,
      kicker.rank,
      quadCards[3].suit,
      buildFourOfAKindStrength(quadCards, kicker),
      `four of a kind, ${getRankName(quadCards[0].rank, true)}`,
    );
  }

  if (groupedCards[0]?.length === 3 && groupedCards[1]?.length === 2) {
    const tripleCards = sortCards(groupedCards[0]);
    const pairCards = sortCards(groupedCards[1]);

    return createMove(
      sorted,
      "full-house",
      FIVE_CARD_STRENGTH["full-house"],
      tripleCards[0].rank,
      pairCards[0].rank,
      tripleCards[2].suit,
      buildFullHouseStrength(tripleCards, pairCards),
      `a full house, ${getRankName(tripleCards[0].rank, true)} over ${getRankName(pairCards[0].rank, true)}`,
    );
  }

  if (isFlush) {
    return createMove(
      sorted,
      "flush",
      FIVE_CARD_STRENGTH.flush,
      sorted[4].rank,
      undefined,
      sorted[4].suit,
      buildFlushStrength(sorted),
      `a ${getSuitName(sorted[0].suit)} flush`,
    );
  }

  if (straightHighCard) {
    return createMove(
      sorted,
      "straight",
      FIVE_CARD_STRENGTH.straight,
      straightHighCard.rank,
      undefined,
      straightHighCard.suit,
      buildStraightStrength(FIVE_CARD_STRENGTH.straight, straightHighCard),
      `a straight, ${getStandardRankLabel(straightHighCard.rank)} high`,
    );
  }

  return null;
}

export function isValidMove(cards: Card[]): boolean {
  return identifyMove(cards) !== null;
}

export function compareMoves(moveA: Move, moveB: Move): number {
  if (moveA.isBomb || moveB.isBomb) {
    if (moveA.isBomb && moveB.isBomb) {
      return compareStrength(moveA.strength, moveB.strength);
    }

    return moveA.isBomb ? 1 : -1;
  }

  if (moveA.cardCount !== moveB.cardCount) {
    return moveA.cardCount - moveB.cardCount;
  }

  return compareStrength(moveA.strength, moveB.strength);
}

export function canPlayMove(
  selectedCards: Card[],
  currentMove: Move | null,
  isStartingTrick: boolean,
  isFirstTurn: boolean,
): ValidationResult {
  if (selectedCards.length === 0) {
    return {
      valid: false,
      message: isStartingTrick ? "Select cards to start the trick." : "Select cards that can beat the current move.",
      move: null,
    };
  }

  const move = identifyMove(selectedCards);

  if (!move) {
    return { valid: false, message: "Invalid card combination.", move: null };
  }

  if (isFirstTurn && !containsThreeOfDiamonds(move.cards)) {
    return { valid: false, message: "The first move of the round must include 3 of Diamonds.", move };
  }

  if (isStartingTrick || !currentMove) {
    return { valid: true, message: `Play ${move.summary}.`, move };
  }

  if (move.isBomb) {
    return { valid: true, message: `${move.summary} beats the current move.`, move };
  }

  if (currentMove.isBomb) {
    return { valid: false, message: "Selected cards do not beat the current move.", move };
  }

  if (isFourCardFourOfAKind(move)) {
    if (currentMove.cardCount < 5) {
      return { valid: true, message: `${move.summary} beats the current move.`, move };
    }

    return { valid: false, message: "You must match the number of cards in the current move.", move };
  }

  if (move.cardCount !== currentMove.cardCount) {
    return { valid: false, message: "You must match the number of cards in the current move.", move };
  }

  if (compareMoves(move, currentMove) <= 0) {
    return { valid: false, message: "Selected cards do not beat the current move.", move };
  }

  return { valid: true, message: `${move.summary} beats the current move.`, move };
}

export function applyMove(gameState: GameState, playerId: number, selectedCards: Card[] | Move): GameState {
  if (gameState.winner !== null || gameState.status === "ended") {
    return gameState;
  }

  if (gameState.turn.currentPlayer !== playerId) {
    return gameState;
  }

  const cards = Array.isArray(selectedCards) ? selectedCards : selectedCards.cards;
  const player = gameState.players[playerId];

  if (!player || !playerHasCards(player, cards)) {
    return gameState;
  }

  const validation = canPlayMove(
    cards,
    gameState.turn.currentMove,
    gameState.turn.isStartingTrick,
    gameState.turn.isFirstTurn,
  );

  if (!validation.valid || !validation.move) {
    return gameState;
  }

  const playedCardIds = new Set(validation.move.cards.map((card) => card.id));
  const nextPlayers = gameState.players.map((currentPlayer, index) =>
    index === playerId
      ? {
          ...currentPlayer,
          hand: sortCards(currentPlayer.hand.filter((card) => !playedCardIds.has(card.id))),
        }
      : currentPlayer,
  );

  const nextFinishedOrder =
    nextPlayers[playerId]?.hand.length === 0 && !gameState.finishedOrder.includes(playerId)
      ? [...gameState.finishedOrder, playerId]
      : [...gameState.finishedOrder];
  const nextStateForRouting = { ...gameState, players: nextPlayers, finishedOrder: nextFinishedOrder };
  const winner = checkWinner(nextStateForRouting);
  const nextCurrentPlayer = winner === null ? getNextActivePlayerIndex(nextStateForRouting, playerId) : winner;
  const nextState = syncLegacyFields({
    ...gameState,
    players: nextPlayers,
    finishedOrder: nextFinishedOrder,
    status: winner === null ? "playing" : "ended",
    winner,
    turnCount: gameState.turnCount + 1,
    turn: {
      currentPlayer: nextCurrentPlayer,
      currentMove: validation.move,
      currentMovePlayer: playerId,
      lastValidPlayPlayer: playerId,
      passesInRow: 0,
      isStartingTrick: false,
      isFirstTurn: false,
    },
  });

  const withPlayLog = appendLog(nextState, makeLog(`${player.name} played ${validation.move.summary}.`, "play"));

  if (winner === null) {
    return withPlayLog;
  }

  return appendLog(withPlayLog, makeLog(`${player.name} wins the round.`, "win"));
}

export function applyPass(gameState: GameState, playerId: number): GameState {
  if (gameState.winner !== null || gameState.status === "ended") {
    return gameState;
  }

  if (gameState.turn.currentPlayer !== playerId) {
    return gameState;
  }

  if (gameState.turn.isStartingTrick || !gameState.turn.currentMove) {
    return gameState;
  }

  const nextPassCount = gameState.turn.passesInRow + 1;
  const withPassLog = appendLog(gameState, makeLog(`${gameState.players[playerId].name} passed.`, "pass"));
  const activePlayerCount = getActivePlayerCount(withPassLog);

  if (nextPassCount < activePlayerCount - 1) {
    return syncLegacyFields({
      ...withPassLog,
      turnCount: withPassLog.turnCount + 1,
      turn: {
        ...withPassLog.turn,
        currentPlayer: getNextActivePlayerIndex(withPassLog, playerId),
        passesInRow: nextPassCount,
      },
    });
  }

  const leadPlayer = withPassLog.turn.lastValidPlayPlayer;
  const nextLeadPlayer =
    withPassLog.players[leadPlayer]?.hand.length > 0
      ? leadPlayer
      : getNextActivePlayerIndex(withPassLog, leadPlayer);

  const clearedState = syncLegacyFields({
    ...withPassLog,
    turnCount: withPassLog.turnCount + 1,
    turn: {
      ...withPassLog.turn,
      currentPlayer: nextLeadPlayer,
      currentMove: null,
      currentMovePlayer: null,
      passesInRow: 0,
      isStartingTrick: true,
    },
  });

  return appendLog(
    clearedState,
    makeLog(`${gameState.players[clearedState.turn.currentPlayer].name} starts a fresh trick.`, "system"),
  );
}

export function getNextPlayerIndex(gameState: GameState): number {
  return (gameState.turn.currentPlayer + 1) % gameState.players.length;
}

export function checkWinner(gameState: GameState): number | null {
  if (gameState.finishedOrder.length !== gameState.players.length - 1) {
    return null;
  }

  return gameState.finishedOrder[0] ?? null;
}

export function createInitialGameState(): GameState {
  return createGameStateForPlayers(
    PLAYER_BLUEPRINTS.map((blueprint) => ({
      id: blueprint.id,
      kind: blueprint.kind,
      name: blueprint.name,
      seat: blueprint.seat,
    })),
  );
}

export function createGameStateForPlayers(
  playersInput: Array<{
    id: number;
    kind?: PlayerKind;
    name: string;
    seat?: Player["seat"];
  }>,
  random: () => number = Math.random,
): GameState {
  if (playersInput.length < MIN_PLAYER_COUNT || playersInput.length > MAX_PLAYER_COUNT) {
    throw new Error(`Expected ${MIN_PLAYER_COUNT} or ${MAX_PLAYER_COUNT} players, received ${playersInput.length}.`);
  }

  const includeJokers = playersInput.length === MIN_PLAYER_COUNT;
  const deck = shuffleDeck(createDeck({ includeJokers }), random);
  const hands = dealCards(deck, playersInput.length).map((hand) => sortCards(hand));
  const players: Player[] = playersInput.map((player, index) => ({
    id: player.id,
    hand: hands[index],
    kind: player.kind ?? "human",
    name: player.name,
    seat: player.seat ?? DEFAULT_SEAT_ORDER[index] ?? "south",
  }));
  const starter = players.findIndex((player) => player.hand.some((card) => card.id === THREE_OF_DIAMONDS_ID));

  return syncLegacyFields({
    players,
    status: "dealing",
    winner: null,
    finishedOrder: [],
    log: [
      makeLog(`${players[starter].name} holds 3 of Diamonds and starts the round.`, "system"),
      ...(includeJokers
        ? [makeLog("Three-player house rule: two jokers are added to the deck. Jokers can only be played as singles or as a pair.", "system")]
        : []),
      makeLog("House rule: straights run from 3-4-5-6-7 up to 10-J-Q-K-A. 2 cannot be used in a straight.", "system"),
    ],
    turnCount: 0,
    turn: {
      currentPlayer: starter,
      currentMove: null,
      currentMovePlayer: null,
      lastValidPlayPlayer: starter,
      passesInRow: 0,
      isStartingTrick: true,
      isFirstTurn: true,
    },
    currentPlayer: starter,
    leadPlayer: starter,
    currentTrick: null,
    currentTrickPlayer: null,
    passStreak: 0,
    firstTurn: true,
    phase: "dealing",
  });
}

export function setPhase(state: GameState, phase: GameStatus): GameState {
  return syncLegacyFields({
    ...state,
    status: phase,
  });
}

export function getSelectionValidation(state: GameState, playerIndex: number, cards: Card[]): ValidationResult {
  if (state.winner !== null) {
    return { valid: false, message: `${state.players[state.winner].name} already won the round.`, move: null };
  }

  if (state.status === "dealing") {
    return { valid: false, message: "Dealing cards...", move: null };
  }

  if (state.turn.currentPlayer !== playerIndex) {
    return { valid: false, message: "Waiting for the other players.", move: null };
  }

  return canPlayMove(cards, state.turn.currentMove, state.turn.isStartingTrick, state.turn.isFirstTurn);
}

export function chooseCpuMove(state: GameState, playerIndex: number): Move | null {
  const player = state.players[playerIndex];

  if (!player || state.turn.currentPlayer !== playerIndex) {
    return null;
  }

  const legalMoves = getLegalMoves(player.hand, state);

  if (legalMoves.length === 0) {
    return null;
  }

  legalMoves.sort((left, right) => {
    if (state.turn.isStartingTrick && left.cardCount !== right.cardCount) {
      return openingMovePriority(left.cardCount) - openingMovePriority(right.cardCount);
    }

    return compareMoves(left, right);
  });

  return legalMoves[0];
}

export function getPlayableCardIds(state: GameState, playerIndex: number, selectedCards: Card[] = []): Set<string> {
  if (state.status !== "playing" || state.winner !== null || state.turn.currentPlayer !== playerIndex) {
    return new Set<string>();
  }

  const selectedIds = new Set(selectedCards.map((card) => card.id));
  const moves = getLegalMoves(state.players[playerIndex].hand, state).filter((move) =>
    [...selectedIds].every((selectedId) => move.cards.some((card) => card.id === selectedId)),
  );

  return new Set(moves.flatMap((move) => move.cards.map((card) => card.id)));
}

export function getCardLabel(card: Card): string {
  if (card.isJoker) {
    return card.jokerColor === "red" ? "Red Joker" : "Black Joker";
  }

  return `${getStandardRankLabel(card.rank)}${getStandardSuitSymbol(card.suit)}`;
}

export function getSuitName(suit: CardSuit): string {
  if (suit === BLACK_JOKER_SUIT) {
    return "Black Joker";
  }

  if (suit === RED_JOKER_SUIT) {
    return "Red Joker";
  }

  return SUIT_LABELS[suit as Suit];
}

export function getRankName(rank: CardRank, plural = false): string {
  if (rank === JOKER_RANK) {
    return plural ? "Jokers" : "Joker";
  }

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

  if (singular.endsWith("x")) {
    return `${singular}es`;
  }

  if (singular.endsWith("e")) {
    return `${singular}s`;
  }

  return `${singular}s`;
}

export const evaluateMove = identifyMove;

function createMove(
  cards: Card[],
  type: Move["type"],
  categoryRank: number,
  primaryRank: CardRank,
  secondaryRank: CardRank | undefined,
  topSuit: CardSuit,
  strength: number[],
  summary: string,
): Move {
  return {
    cards,
    type,
    handType: type,
    cardCount: cards.length as Move["cardCount"],
    isBomb: isDoubleJokerMove(cards),
    categoryRank,
    primaryRank,
    secondaryRank,
    topSuit,
    strength,
    summary,
  };
}

function buildStraightStrength(categoryRank: number, highCard: Card): number[] {
  // Regional rule note:
  // we compare straights by the highest card in Big 2 order,
  // then by that highest card's suit if the ranks match.
  return [categoryRank, highCard.rank, highCard.suit];
}

function buildFlushStrength(cards: Card[]): number[] {
  // Regional rule note:
  // flush comparison varies by table. This engine compares the
  // strongest card first, then the next strongest card, using full
  // Big 2 card order (rank first, suit second) as a deterministic tiebreak.
  return [FIVE_CARD_STRENGTH.flush, ...sortCards(cards).reverse().map((card) => getCardValue(card))];
}

function buildFullHouseStrength(tripleCards: Card[], pairCards: Card[]): number[] {
  // Regional rule note:
  // full houses are primarily compared by the triple rank.
  // Pair rank and triple suit are included only as deterministic tiebreaks.
  return [FIVE_CARD_STRENGTH["full-house"], tripleCards[0].rank, pairCards[0].rank, tripleCards[2].suit];
}

function buildFourOfAKindStrength(quadCards: Card[], kicker: Card): number[] {
  // Regional rule note:
  // four of a kind is compared by the quad rank first, then the kicker,
  // then the highest suit inside the quad as a deterministic fallback.
  return [FIVE_CARD_STRENGTH["four-of-a-kind"], quadCards[0].rank, kicker.rank, quadCards[3].suit, kicker.suit];
}

function getStraightHighCard(cards: Card[]): Card | null {
  const sorted = sortCards(cards);
  const uniqueRanks = new Set(sorted.map((card) => card.rank));

  if (uniqueRanks.size !== 5) {
    return null;
  }

  // Regional rule note:
  // some Big 2 tables allow A-2-3-4-5 or other 2-containing straights.
  // This engine uses the stricter sequence 3-4-5-6-7 up to 10-J-Q-K-A only.
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

function groupCardsByRank(cards: Card[]): Map<CardRank, Card[]> {
  return cards.reduce((groups, card) => {
    const existing = groups.get(card.rank) ?? [];
    existing.push(card);
    groups.set(card.rank, existing);
    return groups;
  }, new Map<CardRank, Card[]>());
}

function compareStrength(left: number[], right: number[]): number {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const delta = (left[index] ?? 0) - (right[index] ?? 0);

    if (delta !== 0) {
      return delta;
    }
  }

  return 0;
}

function getActivePlayerCount(gameState: GameState): number {
  return gameState.players.filter((player) => player.hand.length > 0).length;
}

function getNextActivePlayerIndex(gameState: GameState, fromPlayerIndex: number): number {
  for (let offset = 1; offset <= gameState.players.length; offset += 1) {
    const candidateIndex = (fromPlayerIndex + offset) % gameState.players.length;

    if (gameState.players[candidateIndex]?.hand.length > 0) {
      return candidateIndex;
    }
  }

  return fromPlayerIndex;
}

function isDoubleJokerMove(cards: Card[]): boolean {
  return cards.length === 2 && cards.every((card) => card.isJoker);
}

function containsThreeOfDiamonds(cards: Card[]): boolean {
  return cards.some((card) => card.id === THREE_OF_DIAMONDS_ID);
}

function playerHasCards(player: Player, cards: Card[]): boolean {
  const handIds = new Set(player.hand.map((card) => card.id));
  return cards.every((card) => handIds.has(card.id));
}

function getLegalMoves(hand: Card[], state: GameState): Move[] {
  const canUseFourCardMove =
    !state.turn.currentMove || (!state.turn.currentMove.isBomb && state.turn.currentMove.cardCount < 5);
  const sizes = canUseFourCardMove ? [1, 2, 3, 4, 5] : [1, 2, 3, 5];

  return sizes
    .flatMap((size) => buildCombinations(hand, size))
    .map((cards) => identifyMove(cards))
    .filter((move): move is Move => move !== null)
    .filter((move) =>
      canPlayMove(move.cards, state.turn.currentMove, state.turn.isStartingTrick, state.turn.isFirstTurn).valid,
    );
}

function buildCombinations(cards: Card[], size: number): Card[][] {
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

function openingMovePriority(cardCount: Move["cardCount"]): number {
  return { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 }[cardCount];
}

function appendLog(state: GameState, entry: LogEntry): GameState {
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

function syncLegacyFields(state: GameState): GameState {
  return {
    ...state,
    currentPlayer: state.turn.currentPlayer,
    leadPlayer: state.turn.lastValidPlayPlayer,
    currentTrick: state.turn.currentMove,
    currentTrickPlayer: state.turn.currentMovePlayer,
    passStreak: state.turn.passesInRow,
    firstTurn: state.turn.isFirstTurn,
    phase: state.status,
  };
}

function isFourCardFourOfAKind(move: Move): boolean {
  return move.type === "four-of-a-kind" && move.cardCount === 4;
}

function getStandardRankLabel(rank: CardRank) {
  return RANK_LABELS[rank as Rank];
}

function getStandardSuitSymbol(suit: CardSuit) {
  return SUIT_SYMBOLS[suit as Suit];
}
