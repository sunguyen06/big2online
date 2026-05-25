# Big 2 Royale

A polished Big 2 app built with Next.js, React, TypeScript, Tailwind CSS, Framer Motion, and Socket.IO.

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm run dev` starts:

- the Next.js frontend on `http://localhost:3000`
- the Socket.IO lobby backend on `http://localhost:8000`

If PowerShell blocks the `npm` shim on your machine, run `npm.cmd run dev` instead.

## Routes

- `/`: multiplayer home and private room entry
- `/room/[roomCode]`: real-time lobby
- `/game/[roomCode]`: multiplayer game placeholder
- `/solo`: existing single-player prototype against CPU opponents

## Multiplayer Lobby Features

- Players must enter a display name before creating or joining
- Private room codes are short uppercase strings
- Rooms support exactly 4 seats
- First player becomes host
- Only the host can start the game
- Start Game is locked until 4 connected players are present
- Lobby player lists update in real time through Socket.IO
- Host is reassigned automatically if the current host disconnects
- Empty rooms are deleted from memory automatically
- Session storage is used so a refresh can try to restore the same room session

## Project Structure

- `server.ts`: standalone Socket.IO lobby backend on port `8000`
- `scripts/dev.mjs`: local dev runner that starts frontend + backend together
- `scripts/start.mjs`: local production runner that starts frontend + backend together
- `lib/multiplayer/*`: room store, socket helpers, session helpers, shared lobby types
- `components/lobby/*`: home, room lobby, and game placeholder UI
- `components/big2/*`: reusable single-player card table UI
- `lib/big2/*`: single-player game rules and CPU logic

## Placeholder Assets

This version intentionally uses CSS-based placeholders instead of final art.

- Card faces are rendered from rank and suit text like `A♠`
- Card backs use a CSS pattern in `components/big2/Card.tsx`
- Avatars and table panels are CSS-driven for easy swapping later
- Search for comments mentioning `Placeholder` when you are ready to replace visuals

## Notes

- The multiplayer room store is currently in-memory, so restarting the lobby backend clears all rooms
- The `/game/[roomCode]` route is still a placeholder and receives room and player data from the lobby transition
- The solo Big 2 rules implementation still lives under `/solo`
