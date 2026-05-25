"use client";

import { io, Socket } from "socket.io-client";
import { SocketAck } from "./types";

let lobbySocket: Socket | null = null;

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
    socket.emit(event, payload, (response: SocketAck<TResponse>) => resolve(response));
  });
}
