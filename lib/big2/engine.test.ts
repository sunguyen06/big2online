import assert from "node:assert/strict";

import { RANK_LABELS, SUIT_LABELS } from "@/lib/big2/constants";
import {
  applyMove,
  applyPass,
  canPlayMove,
  compareMoves,
  createDeck,
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
