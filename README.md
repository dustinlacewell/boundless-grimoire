<p align="center">
  <img src="splash.png" alt="Boundless Grimoire" />
</p>

# Boundless Grimoire

Local-first deckbuilder overlay for [untap.in](https://untap.in). Uses Scryfall for card data; decks live in `chrome.storage`.

## Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [pnpm](https://pnpm.io/) 10+

## Setup

```bash
pnpm install
```

## Build

```bash
pnpm --filter boundless-grimoire build
```

The built extension lands in `extensions/boundless-grimoire/dist/`.

## Development (hot reload)

```bash
pnpm --filter boundless-grimoire dev
```

This starts a Vite dev server on port 5173 with HMR. Load the extension from `extensions/boundless-grimoire/dist/` as usual — changes will hot-reload in the browser.

## Install in Chrome

1. Build the extension (see above).
2. Open `chrome://extensions`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the `extensions/boundless-grimoire/dist/` folder.
5. Navigate to [untap.in](https://untap.in) — the overlay button appears in the top-left corner.

## Type checking

```bash
pnpm --filter boundless-grimoire typecheck
```
