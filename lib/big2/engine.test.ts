import assert from "node:assert/strict";

import { RANK_LABELS, SUIT_LABELS } from "@/lib/big2/constants";
import {
  applyMove,
  applyPass,
  canPlayMove,
  compareMoves,
  createDeck,
  createGameStateForPlayers,
  dealCards,
  getCardValue,
  identifyMove,
  isValidMove,
  sortCards,
} from "@/lib/big2/engine";
import { Card, GameState, Player } from "@/lib/big2/types";

const deck = createDeck();

function getCard(rankLabel: (typeof RANK_LABELS)[number], suitLabel: (typeof SUIT_LABELS)[number]): Card {
  const rank = RANK_LABELS.indexOf(rankLabel);
  const suit = SUIT_LABELS.indexOf(suitLabel);
  const card = deck.find((candidate) => candidate.rank === rank && candidate.suit === suit);

  assert.ok(card, `Expected to find ${rankLabel} of ${suitLabel}.`);
  return card;
}

function buildPlayer(id: number, hand: Card[]): Player {
  const seats = ["south", "west", "north", "east"] as const;

  return {
    id,
    name: `P${id + 1}`,
    kind: id === 0 ? "human" : "cpu",
    seat: seats[id],
    hand: sortCards(hand),
  };
}

function buildState(players: Player[]): GameState {
  return {
    players,
    status: "playing",
    winner: null,
    log: [],
    turnCount: 0,
    turn: {
      currentPlayer: 0,
      currentMove: null,
      currentMovePlayer: null,
      lastValidPlayPlayer: 0,
      passesInRow: 0,
      isStartingTrick: true,
      isFirstTurn: true,
    },
    currentPlayer: 0,
    leadPlayer: 0,
    currentTrick: null,
    currentTrickPlayer: null,
    passStreak: 0,
    firstTurn: true,
    phase: "playing",
  };
}

function run(): void {
  const threeOfDiamonds = getCard("3", "Diamonds");
  const twoOfSpades = getCard("2", "Spades");
  const sortedExtremes = sortCards([twoOfSpades, threeOfDiamonds]);

  assert.equal(sortedExtremes[0].id, threeOfDiamonds.id, "3 of Diamonds should be the lowest card.");
  assert.equal(sortedExtremes[1].id, twoOfSpades.id, "2 of Spades should be the highest card.");
  assert.ok(getCardValue(threeOfDiamonds) < getCardValue(twoOfSpades), "Card values should follow Big 2 order.");

  const lowerPair = identifyMove([getCard("5", "Diamonds"), getCard("5", "Clubs")]);
  const higherPair = identifyMove([getCard("6", "Diamonds"), getCard("6", "Clubs")]);

  assert.ok(lowerPair && higherPair, "Expected both sample pairs to be valid.");
  assert.ok(compareMoves(higherPair, lowerPair) > 0, "A higher pair should beat a lower pair.");

  assert.equal(isValidMove([getCard("3", "Diamonds"), getCard("4", "Diamonds")]), false, "Mixed ranks should not form a pair.");
  assert.equal(
    isValidMove([getCard("3", "Diamonds"), getCard("4", "Clubs"), getCard("5", "Hearts"), getCard("6", "Spades")]),
    false,
    "Four-card selections should be rejected.",
  );

  const flush = identifyMove([
    getCard("3", "Hearts"),
    getCard("5", "Hearts"),
    getCard("8", "Hearts"),
    getCard("J", "Hearts"),
    getCard("K", "Hearts"),
  ]);
  const fullHouse = identifyMove([
    getCard("7", "Diamonds"),
    getCard("7", "Clubs"),
    getCard("7", "Hearts"),
    getCard("9", "Diamonds"),
    getCard("9", "Clubs"),
  ]);

  assert.ok(flush && fullHouse, "Expected flush and full house samples to be valid.");
  assert.ok(compareMoves(fullHouse, flush) > 0, "A full house should beat a flush.");

  const fourOfAKind = identifyMove([
    getCard("Q", "Diamonds"),
    getCard("Q", "Clubs"),
    getCard("Q", "Hearts"),
    getCard("Q", "Spades"),
    getCard("4", "Diamonds"),
  ]);
  const straightFlush = identifyMove([
    getCard("8", "Spades"),
    getCard("9", "Spades"),
    getCard("10", "Spades"),
    getCard("J", "Spades"),
    getCard("Q", "Spades"),
  ]);

  assert.ok(fourOfAKind && straightFlush, "Expected four of a kind and straight flush samples to be valid.");
  assert.ok(compareMoves(straightFlush, fourOfAKind) > 0, "A straight flush should beat four of a kind.");

  const firstTurnInvalid = canPlayMove([getCard("4", "Diamonds")], null, true, true);
  const firstTurnValid = canPlayMove([threeOfDiamonds], null, true, true);

  assert.equal(firstTurnInvalid.valid, false, "The first move must include 3 of Diamonds.");
  assert.equal(firstTurnValid.valid, true, "Playing 3 of Diamonds should be a legal opening move.");

  const threePlayerDeck = createDeck({ includeJokers: true });
  const threePlayerHands = dealCards(threePlayerDeck, 3);
  const jokers = threePlayerDeck.filter((card) => card.isJoker);

  assert.equal(threePlayerDeck.length, 54, "Three-player rounds should use a 54-card deck.");
  assert.equal(threePlayerHands.length, 3, "Three-player dealing should produce 3 hands.");
  assert.ok(threePlayerHands.every((hand) => hand.length === 18), "Three-player rounds should deal 18 cards each.");
  assert.equal(jokers.length, 2, "The three-player deck should include exactly two jokers.");
  assert.equal(canPlayMove([jokers[0]], null, true, false).valid, true, "A joker should be playable as a single.");
  assert.ok(getCardValue(jokers[1]) > getCardValue(jokers[0]), "The red joker should rank above the black joker.");
  assert.ok(getCardValue(jokers[0]) > getCardValue(twoOfSpades), "The black joker should rank above every 2.");
  assert.equal(
    isValidMove([jokers[0], getCard("3", "Diamonds"), getCard("4", "Diamonds"), getCard("5", "Diamonds"), getCard("6", "Diamonds")]),
    false,
    "Jokers should not participate in five-card hands in this build.",
  );
  assert.equal(
    canPlayMove(jokers, identifyMove([getCard("9", "Diamonds")]), false, false).valid,
    true,
    "Double jokers should beat a single.",
  );
  assert.equal(
    canPlayMove(jokers, identifyMove([getCard("10", "Diamonds"), getCard("10", "Clubs"), getCard("10", "Hearts")]), false, false).valid,
    true,
    "Double jokers should beat a triple.",
  );
  assert.equal(
    canPlayMove(
      jokers,
      identifyMove([
        getCard("8", "Spades"),
        getCard("9", "Spades"),
        getCard("10", "Spades"),
        getCard("J", "Spades"),
        getCard("Q", "Spades"),
      ]),
      false,
      false,
    ).valid,
    true,
    "Double jokers should beat a five-card hand.",
  );

  const threePlayerState = createGameStateForPlayers(
    [
      { id: 0, name: "P1", kind: "human", seat: "south" },
      { id: 1, name: "P2", kind: "human", seat: "west" },
      { id: 2, name: "P3", kind: "human", seat: "north" },
    ],
    () => 0.5,
  );

  assert.equal(threePlayerState.players.length, 3, "Three-player state creation should preserve the requested table size.");
  assert.ok(threePlayerState.players.every((player) => player.hand.length === 18), "Three-player state should deal 18 cards per player.");

  const initialState = buildState([
    buildPlayer(0, [threeOfDiamonds, getCard("5", "Clubs")]),
    buildPlayer(1, [getCard("4", "Diamonds")]),
    buildPlayer(2, [getCard("6", "Diamonds")]),
    buildPlayer(3, [getCard("7", "Diamonds")]),
  ]);
  const afterOpening = applyMove(initialState, 0, [threeOfDiamonds]);
  const afterPassOne = applyPass(afterOpening, 1);
  const afterPassTwo = applyPass(afterPassOne, 2);
  const afterPassThree = applyPass(afterPassTwo, 3);

  assert.equal(afterPassThree.currentTrick, null, "The center should clear after three consecutive passes.");
  assert.equal(afterPassThree.currentPlayer, 0, "The last player to make a valid play should start the next trick.");
  assert.equal(afterPassThree.passStreak, 0, "Pass count should reset after the trick clears.");

  console.log("Big 2 engine tests passed.");
}

run();
