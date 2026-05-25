export const MULTIPLAYER_EVENTS = {
  createRoom: "createRoom",
  errorMessage: "errorMessage",
  gameFinished: "gameFinished",
  gameStateUpdated: "gameStateUpdated",
  invalidMove: "invalidMove",
  joinRoom: "joinRoom",
  leaveRoom: "leaveRoom",
  passTurn: "passTurn",
  playCards: "playCards",
  playerDisconnected: "playerDisconnected",
  privateHandUpdated: "privateHandUpdated",
  restartGame: "restartGame",
  resumeSession: "resumeSession",
  roomUpdated: "roomUpdated",
  roundStarted: "gameStarted",
  startGame: "startGame",
} as const;

export type MultiplayerEventName =
  (typeof MULTIPLAYER_EVENTS)[keyof typeof MULTIPLAYER_EVENTS];
