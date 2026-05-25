"use client";

import { io, Socket } from "socket.io-client";
import { SocketAck } from "./types";

let lobbySocket: Socket | null = null;
const DEFAULT_ACK_TIMEOUT_MS = 4500;

function getLobbyServerUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_LOBBY_SERVER_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname === "127.0.0.1" ? "127.0.0.1" : "localhost";
    return `http://${host}:8000`;
  }

  return "http://localhost:8000";
}

export function getLobbySocket() {
  if (!lobbySocket) {
    lobbySocket = io(getLobbyServerUrl(), {
      autoConnect: false,
      path: "/socket.io",
    });
  }

  return lobbySocket;
}

export function emitWithAck<TResponse, TPayload>(event: string, payload: TPayload) {
  const socket = getLobbySocket();

  return new Promise<SocketAck<TResponse>>((resolve) => {
    const timeout = window.setTimeout(() => {
      resolve({
        error: "The server took too long to respond. Please try again.",
        ok: false,
      });
    }, DEFAULT_ACK_TIMEOUT_MS);

    socket.emit(event, payload, (response: SocketAck<TResponse>) => {
      window.clearTimeout(timeout);
      resolve(response);
    });
  });
}
