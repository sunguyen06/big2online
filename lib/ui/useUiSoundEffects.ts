"use client";

import { useEffect, useRef } from "react";

let audioContext: AudioContext | null = null;
let audioDisabled = false;
const MASTER_VOLUME = 2.0;

type SoundCue = "button" | "cardPlay" | "cardSelect" | "turn";

const soundAssetConfig: Record<SoundCue, { src: string; volume: number }> = {
  // Swap these placeholder files with your own audio under public/sounds/.
  button: { src: "/sounds/ui-button.mp3", volume: 0.82 },
  cardPlay: { src: "/sounds/card-play.mp3", volume: 0.35 },
  cardSelect: { src: "/sounds/card-select.mp3", volume: 0.52 },
  turn: { src: "/sounds/turn-chime.mp3", volume: 1.58 },
};

const soundElements = new Map<SoundCue, HTMLAudioElement>();
const soundAvailability = new Map<SoundCue, boolean>();

function getAudioContext() {
  if (audioDisabled || typeof window === "undefined") {
    return null;
  }

  const BrowserAudioContext =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!BrowserAudioContext) {
    return null;
  }

  if (!audioContext) {
    try {
      audioContext = new BrowserAudioContext();
    } catch {
      audioDisabled = true;
      return null;
    }
  }

  return audioContext;
}

async function primeAudio() {
  const context = getAudioContext();

  if (!context) {
    return null;
  }

  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch {
      audioDisabled = true;
      return null;
    }
  }

  return context;
}

function getSoundElement(cue: SoundCue) {
  if (typeof window === "undefined" || typeof Audio === "undefined") {
    return null;
  }

  const cached = soundElements.get(cue);

  if (cached) {
    return cached;
  }

  const { src, volume } = soundAssetConfig[cue];
  const audio = new Audio(src);
  audio.preload = "auto";
  audio.volume = Math.min(1, volume);
  audio.addEventListener(
    "canplaythrough",
    () => {
      soundAvailability.set(cue, true);
    },
    { once: true },
  );
  audio.addEventListener(
    "error",
    () => {
      soundAvailability.set(cue, false);
    },
    { once: true },
  );
  soundElements.set(cue, audio);
  return audio;
}

function warmSoundAssets() {
  (Object.keys(soundAssetConfig) as SoundCue[]).forEach((cue) => {
    const audio = getSoundElement(cue);

    if (!audio) {
      return;
    }

    try {
      audio.load();
    } catch {
      soundAvailability.set(cue, false);
    }
  });
}

function playTone(
  context: AudioContext,
  {
    duration,
    frequency,
    gain,
    startAt,
    type,
  }: {
    duration: number;
    frequency: number;
    gain: number;
    startAt: number;
    type: OscillatorType;
  },
) {
  try {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    envelope.gain.setValueAtTime(0.0001, startAt);
    envelope.gain.exponentialRampToValueAtTime(gain, startAt + 0.02);
    envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    oscillator.connect(envelope);
    envelope.connect(context.destination);

    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.04);
  } catch {
    audioDisabled = true;
  }
}

async function playAssetSound(cue: SoundCue) {
  if (soundAvailability.get(cue) === false) {
    return false;
  }

  const audio = getSoundElement(cue);

  if (!audio) {
    return false;
  }

  try {
    audio.currentTime = 0;
    audio.volume = Math.min(1, soundAssetConfig[cue].volume);
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

async function playButtonTone() {
  const context = await primeAudio();

  if (!context) {
    return;
  }

  const startAt = context.currentTime;
  playTone(context, {
    duration: 0.08,
    frequency: 620,
    gain: 0.038 * MASTER_VOLUME,
    startAt,
    type: "triangle",
  });
  playTone(context, {
    duration: 0.12,
    frequency: 440,
    gain: 0.026 * MASTER_VOLUME,
    startAt: startAt + 0.03,
    type: "sine",
  });
}

async function playCardSelectTone() {
  const context = await primeAudio();

  if (!context) {
    return;
  }

  const startAt = context.currentTime;
  playTone(context, {
    duration: 0.06,
    frequency: 740,
    gain: 0.03 * MASTER_VOLUME,
    startAt,
    type: "triangle",
  });
  playTone(context, {
    duration: 0.08,
    frequency: 932.33,
    gain: 0.02 * MASTER_VOLUME,
    startAt: startAt + 0.018,
    type: "sine",
  });
}

async function playCardPlayTone() {
  const context = await primeAudio();

  if (!context) {
    return;
  }

  const startAt = context.currentTime;
  playTone(context, {
    duration: 0.09,
    frequency: 210,
    gain: 0.045 * MASTER_VOLUME,
    startAt,
    type: "triangle",
  });
  playTone(context, {
    duration: 0.12,
    frequency: 315,
    gain: 0.03 * MASTER_VOLUME,
    startAt: startAt + 0.02,
    type: "sine",
  });
}

async function playTurnTone() {
  const context = await primeAudio();

  if (!context) {
    return;
  }

  const startAt = context.currentTime;

  // Short layered chime so turn changes feel noticeable without being harsh.
  playTone(context, {
    duration: 0.18,
    frequency: 523.25,
    gain: 0.042 * MASTER_VOLUME,
    startAt,
    type: "triangle",
  });
  playTone(context, {
    duration: 0.24,
    frequency: 783.99,
    gain: 0.03 * MASTER_VOLUME,
    startAt: startAt + 0.08,
    type: "sine",
  });
}

async function playCue(cue: SoundCue) {
  const playedFromAsset = await playAssetSound(cue);

  if (playedFromAsset) {
    return;
  }

  if (cue === "button") {
    await playButtonTone();
    return;
  }

  if (cue === "cardSelect") {
    await playCardSelectTone();
    return;
  }

  if (cue === "cardPlay") {
    await playCardPlayTone();
    return;
  }

  await playTurnTone();
}

interface UseUiSoundEffectsOptions {
  isPlayersTurn?: boolean;
  turnCueEnabled?: boolean;
}

export function useUiSoundEffects({
  isPlayersTurn = false,
  turnCueEnabled = false,
}: UseUiSoundEffectsOptions = {}) {
  const previousTurnRef = useRef(false);

  useEffect(() => {
    warmSoundAssets();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      if (!event.isTrusted || audioDisabled) {
        return;
      }

      void primeAudio();

      if (!target.closest(".ui-button")) {
        return;
      }

      void playCue("button");
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (!turnCueEnabled) {
      previousTurnRef.current = isPlayersTurn;
      return;
    }

    if (isPlayersTurn && !previousTurnRef.current) {
      void playCue("turn");
    }

    previousTurnRef.current = isPlayersTurn;
  }, [isPlayersTurn, turnCueEnabled]);

  return {
    playCardPlaySound: () => {
      void playCue("cardPlay");
    },
    playCardSelectSound: () => {
      void playCue("cardSelect");
    },
  };
}
