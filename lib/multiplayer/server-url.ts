"use client";

function trimTrailingSlash(url: string) {
  return url.replace(/\/$/, "");
}

export function getLobbyServerUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_LOBBY_SERVER_URL?.trim();

  if (configuredUrl) {
    return trimTrailingSlash(configuredUrl);
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname === "127.0.0.1" ? "127.0.0.1" : "localhost";
    return `http://${host}:8000`;
  }

  return "http://localhost:8000";
}

export function getLobbyHealthUrl() {
  return `${getLobbyServerUrl()}/health`;
}
