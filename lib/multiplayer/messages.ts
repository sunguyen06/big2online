export function toFriendlyLobbyMessage(message: string) {
  switch (message) {
    case "That room code does not exist.":
      return "That room code doesn't match an active table. Double-check the code and try again.";
    case "That room is already full.":
    case "That room is full, so the previous session could not be restored.":
      return "That table is full right now. Ask the host for a new room code or wait for an open seat.";
    case "That room has already started its game.":
      return "That table has already moved into a live round. Rejoin from your saved seat if this was your room.";
    case "This room does not currently have an active game.":
      return "This table is not in an active round yet.";
    case "No saved player session was provided.":
    case "This browser is no longer holding a matching room session.":
      return "This tab no longer has a saved seat for that room. Rejoin from the home screen.";
    case "That player session is no longer active in this game.":
      return "That saved seat is no longer active for this round. Rejoin from the lobby if the table is open.";
    case "This socket is not authorized for that player session.":
      return "This tab lost its seat authorization. Refresh or rejoin from the lobby.";
    default:
      return message;
  }
}

export function toFriendlyGameMessage(message: string) {
  switch (message) {
    case "Invalid hand":
    case "Invalid card combination.":
      return "That card selection doesn't make a valid Big 2 hand.";
    case "Must beat the current play":
    case "Selected cards do not beat the current move.":
      return "That play doesn't beat the current trick.";
    case "Waiting for your turn.":
      return "It's not your turn yet.";
    case "You cannot pass while starting a trick.":
      return "You can't pass when you're leading a fresh trick.";
    case "You can only play cards from your hand.":
      return "Only cards from your own hand can be played.";
    case "Select cards to play.":
      return "Select one or more cards before playing.";
    case "The first move of the round must include 3 of Diamonds.":
      return "The opening play must include the 3 of Diamonds.";
    case "You need at least 3 connected players before starting.":
      return "You need 3 or 4 connected players before dealing a round.";
    case "Finish the current round before dealing another one.":
      return "Wait for the current round to finish before starting a new one.";
    default:
      return toFriendlyLobbyMessage(message);
  }
}
