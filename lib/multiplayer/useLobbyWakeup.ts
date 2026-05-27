"use client";

import { useEffect, useRef } from "react";
import { getLobbyHealthUrl } from "./server-url";

const KEEP_ALIVE_INTERVAL_MS = 4 * 60 * 1000;

async function pokeLobbyServer() {
  try {
    await fetch(getLobbyHealthUrl(), {
      cache: "no-store",
      credentials: "omit",
      mode: "no-cors",
    });
  } catch {
    // If the lobby is still booting or unreachable, the socket reconnect flow
    // will keep trying in the background.
  }
}

export function useLobbyWakeup(enabled: boolean) {
  const wakeInFlightRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const wake = () => {
      if (wakeInFlightRef.current) {
        return;
      }

      wakeInFlightRef.current = true;

      void pokeLobbyServer().finally(() => {
        wakeInFlightRef.current = false;
      });
    };

    wake();

    const handleFocus = () => wake();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        wake();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const intervalId = window.setInterval(wake, KEEP_ALIVE_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled]);
}
