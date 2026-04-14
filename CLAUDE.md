# Boundless Grimoire — Architecture

## What it is

A Chrome extension (Manifest V3) that overlays a full-screen MTG deck-builder on any page. Built with React 18, Zustand, TanStack Query, Zod, and the `scryfall-api` package. Bundled by Vite + `@crxjs/vite-plugin`.

Entry point: `extensions/boundless-grimoire/` (pnpm workspace member).

## Extension anatomy

| Layer | Purpose |
|---|---|
| `content/` | Injected content script (isolated world). Renders `App` into the page DOM. |
| `background/` | Service worker. Proxies Scryfall API requests (rate-limited queue/bucket), forwards results to the content script via Chrome message passing. |
| `content/Overlay.tsx` | Full-screen overlay: Deck ribbon → selected deck view → analytics strip → filter bar → search results. |
| `sync/untapBridge.ts` | MAIN-world script. Bridges the isolated content script to untap.in's `window.apiStore` (WebSocket command channel) via `postMessage`. Queues requests until `apiStore` appears, retries on transient WS timeouts. Also supports `pinia:<store>:<action>` dispatch to drive untap's own reactive UI state. |

## Source layout

```
src/
  analytics/     Pure stat functions (stats.ts) + chart components
  background/    Service worker: fetchScryfall, queue, buckets, inflight
  cards/         Card rendering: CardImage, CardWithCount, CategoryStack, badges; categorize.ts (type-line bucketing for deck columns); print picker (modal + store for selecting alternate prints); card preview store
  content/       App shell, Overlay, TriggerButton
  decks/         Deck-level UI: DeckView, DeckRibbon, format picker, legality; parseDecklist + deckText for clipboard import/export
  filters/       Filter bar + per-field components; buildQuery (FilterState → Scryfall query); customFormatStore, customQueryStore, presetStore
  scryfall/      Scryfall types, RPC layer, card snapshot helper, wire types
  search/        Search results grid, infinite scroll, favorites/pins stores
  settings/      Settings modal + settingsStore
  storage/       deckStore (Zustand), chromeStorage helpers, migrations, types
  sync/          untap.in sync: pull/push, enrichDeck, scheduled pushes
  ui/            Primitive components: Button, Surface, Pill, Dropdown, icons
```

## Data model

```ts
DeckLibrary          // persisted to chrome.storage.local
  decks: Record<id, Deck>
  order: string[]    // display order
  selectedId: string | null

Deck
  id, name, createdAt, updatedAt
  cards: Record<cardId, DeckCard>    // mainboard
  sideboard: Record<cardId, DeckCard>
  sortField, sortDir                 // search grid sort, persisted per-deck
  filters: FilterState               // filter bar state, persisted per-deck
  formatIndex: number | null         // index into customFormatStore.formats
  coverCardId?: string
  untapDeckUid?: string              // linked untap.in deck
  enriching?: boolean                // true while background Scryfall enrichment is running

DeckCard
  snapshot: CardSnapshot             // minimal Scryfall fields stored locally
  count: number
  addedAt: number

CardSnapshot         // subset of ScryfallCard stored with each deck entry
  id, name, type_line, cmc, mana_cost, power, toughness, rarity,
  colors, color_identity, image_uris, card_faces, set, …
```

Storage key: `boundless-grimoire:library`. Schema version tracked in `LIBRARY_VERSION`; migrations in `storage/migrations.ts`.

## State management

- **`deckStore`** (Zustand) — single source of truth for the deck library. Hydrated once from `chrome.storage.local`, persisted on every change. All mutations go through exported action functions.
- **Filter/sort/format state** — persisted inside `Deck` (not a separate store). `useFilterStore` is a facade that reads/writes the active deck's `FilterState`. `customFormatStore` holds named Scryfall query fragments; `customQueryStore` holds user-defined oracle-tag toggles; `presetStore` holds named filter snapshots. Separate Zustand slices for favorites, pins, card preview, print picker, grid size, print size, legality.
- **TanStack Query** — Scryfall search results (infinite pagination).

## Scryfall API flow

Content script → `scryfall/rpc.ts` → Chrome message → background service worker → `background/fetchScryfall.ts` → Scryfall API.

Rate limiting: two independent token-bucket queues (`background/buckets.ts`) — search endpoints (500 ms gap) and everything else (100 ms gap). Requests never share a bucket, so sustained load maxes at Scryfall's 12 req/sec ceiling.

Abort: sending a `scryfall:abort` message with the request id cancels the in-flight fetch via `background/inflight.ts` (an `AbortController` registry keyed by request id). Used by search-as-you-type to drop stale results.

## Analytics

`analytics/stats.ts` — pure functions over `CardMap`:
- `computeManaCurve` — MV distribution (excluding lands), returns `Distribution`
- `computePowerCurve` / `computeToughnessCurve` — creature stat distributions
- `computeCurveByType` — stacked creature vs non-creature mana curve
- `computeRarityBreakdown` — common/uncommon/rare/mythic counts
- `computeCountBy(mode)` — group by type category or subtype

Charts render via `DistributionChart` (bar chart, inline SVG-free CSS bars) or custom components. All wrapped in `DeckAnalytics`, displayed as an `HScroll` strip in `Overlay`.

## untap.in sync

`sync/` — two-way sync with untap.in. The extension is authoritative; untap always receives our current state.

**Pull** (`pullDecks.ts`) — reads untap's IndexedDB directly from the isolated content-script world. No bridge needed; decoupled from WS so the user never waits on untap's handshake to see their existing decks. After import, `enrichDeck.ts` fills in thin card snapshots (name-only from untap) with full Scryfall data. `reEnrich.ts` re-runs enrichment on any cards that are still thin from a prior failed run.

**Push** (`pushDeck.ts`) — goes through the MAIN-world bridge (`untapBridge.ts`) to reach `apiStore.send("update-deck", …)`. Deletions use `pinia:deckStore:deleteDeck` so untap's reactive sidebar re-renders without a page reload. Pushes are debounced at 1500 ms (`pushSchedule.ts`); rapid edits collapse into one push.

**Boot sequence** (`bootSync.ts`) — pull-then-push ordering prevents duplicates: pulling first links any unseen untap decks before the push phase runs. The push phase waits for the bridge and skips gracefully if it never comes up. Freshly pulled (still-enriching) decks are skipped during boot push.
