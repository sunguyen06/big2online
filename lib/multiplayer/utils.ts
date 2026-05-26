export const MIN_ROOM_PLAYERS = 3;
export const ROOM_CAPACITY = 4;
export const ROOM_CODE_LENGTH = 5;
const ROOM_CODE_PATTERN = /^[A-Z0-9]{5,6}$/;
const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function sanitizeDisplayName(input: string) {
  return input.trim().replace(/\s+/g, " ").slice(0, 18);
}

export function validateDisplayName(input: string) {
  const name = sanitizeDisplayName(input);

  if (name.length < 2) {
    return {
      message: "Enter a display name with at least 2 characters.",
      valid: false,
    };
  }

  return {
    message: "",
    valid: true,
  };
}

export function normalizeRoomCode(input: string) {
  return input.trim().toUpperCase();
}

export function isValidRoomCode(input: string) {
  return ROOM_CODE_PATTERN.test(normalizeRoomCode(input));
}

export function validateRoomCode(input: string) {
  const roomCode = normalizeRoomCode(input);

  if (!isValidRoomCode(roomCode)) {
    return {
      message: "Enter a valid 5 or 6 character room code.",
      valid: false,
    };
  }

  return {
    message: "",
    valid: true,
  };
}

export function createRoomCode(existingCodes: Set<string>) {
  let roomCode = "";

  do {
    roomCode = Array.from({ length: ROOM_CODE_LENGTH }, () =>
      ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)],
    ).join("");
  } while (existingCodes.has(roomCode));

  return roomCode;
}
