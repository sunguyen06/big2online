# Big 2 Royale

A polished single-player Big 2 web app built with Next.js, React, TypeScript, Tailwind CSS, and Framer Motion.

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## What Is Included

- A complete 4-player Big 2 round against 3 CPU opponents
- Standard 52-card deck with Big 2 rank and suit ordering
- Singles, pairs, triples, and five-card hand validation
- Trick flow with passing, trick resets, and round winner modal
- Simple CPU that plays the lowest valid move it can find
- CSS placeholder treatments for card faces, card backs, avatars, and table styling

## Project Structure

- `app/page.tsx`: top-level page entry
- `components/big2/*`: reusable game UI components
- `lib/big2/engine.ts`: rules engine, move validation, and CPU logic
- `lib/big2/types.ts`: shared data models
- `lib/big2/constants.ts`: labels and placeholder theme hooks

## Placeholder Assets

This version intentionally uses CSS-based placeholders instead of final art.

- Card faces are rendered from rank/suit text like `A♠`
- Card backs use a CSS pattern in `components/big2/Card.tsx`
- Avatars use gradient circles from `lib/big2/constants.ts`
- Table styling lives in `app/globals.css`

Search for the comments mentioning `Placeholder` to swap these pieces with real image assets later.

## Notes About Rules

- The first play must include `3♦`
- Five-card categories rank: straight, flush, full house, four of a kind, straight flush
- In this first version, straights run from `3-4-5-6-7` up to `10-J-Q-K-A`
- Wraparound straights involving `2` are not enabled yet; the assumption is documented in the engine so you can change it easily if you want a different ruleset
