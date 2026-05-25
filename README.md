# Big 2 Royale

Big 2 Royale is a polished private-room Big 2 prototype built for four real players in separate browser windows. It focuses on a premium felt-table presentation, real-time room flow, and a clean split between multiplayer state management and UI.

## Tech Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Framer Motion
- Socket.IO

## Project Overview

- `/` is the multiplayer landing page for creating or joining a private room
- `/room/[roomCode]` is the real-time lobby with live seats, host controls, and room sharing
- `/game/[roomCode]` is the shared multiplayer card table
- `/solo` is the local single-player prototype against CPU seats

The frontend runs alongside a small Socket.IO backend in `server.ts`. The backend owns room membership, round state, private hands, turn validation, and reconnect-aware session restoration.

## Setup

```bash
npm install
```

If PowerShell blocks the `npm` shim on your machine, use `npm.cmd` instead.

## Run Locally

```bash
npm run dev
```

This starts:

- the Next.js frontend at [http://localhost:3000](http://localhost:3000)
- the Socket.IO room server at `http://localhost:8000`

Production build commands:

```bash
npm run build
npm run start
```

## Testing

```bash
npm run test:big2
```

## Multiplayer Notes

- Rooms support exactly 4 seats
- The host can only start a round when all 4 seats are filled and connected
- Each browser only receives its own private hand
- Refreshing a tab attempts to restore the same saved seat
- If a player disconnects during a round, their seat is marked disconnected and the table shows reconnect guidance
- Hosts can deal a new round after a hand ends, as long as all 4 players are connected again

## Current Limitations

- Room state lives in memory, so restarting the backend clears active rooms
- Reconnect support restores saved seats, but there is no full in-round substitute or takeover flow yet
- If a disconnected player never returns, the host currently needs to reset the room manually
- The current straight rule assumption is fixed to `3-4-5-6-7` through `10-J-Q-K-A`

## Placeholder Assets

This build intentionally uses CSS placeholders so art can be swapped in later.

- Card face placeholder: [components/big2/Card.tsx](/C:/Users/nguye/big2online/components/big2/Card.tsx)
- Card back placeholder: [components/big2/Card.tsx](/C:/Users/nguye/big2online/components/big2/Card.tsx)
- Avatar placeholder circles: [components/big2/PlayerSeat.tsx](/C:/Users/nguye/big2online/components/big2/PlayerSeat.tsx) and [components/lobby/LobbySeatCard.tsx](/C:/Users/nguye/big2online/components/lobby/LobbySeatCard.tsx)

Search for comments mentioning `Placeholder` to find the intended swap points for future art assets.

## Big 2 Rule Assumptions

- Rank order is `3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A < 2`
- Suit order is `Diamonds < Clubs < Hearts < Spades`
- Supported hand types are singles, pairs, triples, straights, flushes, full houses, four of a kind, and straight flushes
- Five-card ranking is `Straight < Flush < Full House < Four of a Kind < Straight Flush`
- The opening move must include the 3 of Diamonds
- Passing is not allowed while starting a fresh trick
