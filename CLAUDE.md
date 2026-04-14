# Boundless Grimoire — Architecture

Keep this file up to date as the codebase evolves.

## What it is

A full-screen MTG deck-builder built with React 18, Zustand, TanStack Query, Zod, and `scryfall-api`. The core app (`packages/app`) is environment-agnostic — it ships as a Chrome extension (Manifest V3) overlaid on untap.in and as a standalone web demo on the marketing site. Bundled by Vite (no CRX plugin — plain multi-entry build).

**Branches:** `dev` — active development. `master` — stable releases.

pnpm monorepo. Workspace members:

| Package | Role |
|---|---|
| `packages/app` | Deck-builder UI, stores, and service interfaces. Environment-agnostic. |
| `packages/ui` | Design library: primitive components + brand mark, Tailwind v4 theme. |
| `extensions/boundless-grimoire` | Chrome shell: boot wiring, chrome.storage/RPC/untap service impls, service worker, untapBridge. |
| `sites/homepage` | Astro marketing site with `/demo` route (browser-native service impls). |

## Extension anatomy

| Layer | Purpose |
|---|---|
| `content/` | Injected content script (isolated world). Wires services and mounts `App` into the page DOM. |
| `background/` | Service worker. Proxies Scryfall API requests (rate-limited queue/bucket), forwards results to the content script via Chrome message passing. |
| `content/Overlay.tsx` | Full-screen overlay: Deck ribbon → selected deck view → analytics strip → filter bar → search results. |
| `sync/untapBridge.ts` | MAIN-world script. Bridges the isolated content script to untap.in's `window.apiStore` (WebSocket command channel) via `postMessage`. Queues requests until `apiStore` appears, retries on transient WS timeouts. Also supports `pinia:<store>:<action>` dispatch to drive untap's own reactive UI state. |

## Monorepo layout

### `packages/app/src/`

The entire deck-builder: all UI, stores, and service interfaces. The extension and the homepage demo both consume this package.

```
analytics/     Pure stat functions (stats.ts) + chart components
cards/         Card rendering: CardImage, CardWithCount, CategoryStack, badges; categorize.ts (type-line bucketing for deck columns); print picker (modal + store for selecting alternate prints); card preview store
commands/      Undo/redo command pattern: Command interface (apply/invert), card-level commands, historyStore, library transforms
content/       App shell, Overlay, TriggerButton
decks/         Deck-level UI: DeckView, DeckRibbon, format picker, legality; parseDecklist + deckText for clipboard import/export
decks/meta/    Meta groupings: classify.ts, fetchMatches.ts, matchCache.ts, metaGroupsStore.ts
filters/       Filter bar + per-field components; buildQuery (FilterState → Scryfall query); customFormatStore, customQueryStore, presetStore
help/          HelpModal component + MDX content pages (keybinds, about)
scryfall/      Scryfall types, card snapshot helper
search/        Search results grid, infinite scroll, favorites/pins stores
services/      Services seam: interfaces + free-function shorthands + ServicesProvider context
settings/      Settings modal + settingsStore
storage/       deckStore (Zustand), migrations, types
ui/            App-level hooks (e.g. useCtrlWheelCardResize)
```

### `extensions/boundless-grimoire/src/`

Chrome shell only. No UI components — just boot wiring and platform-specific service impls.

```
background/            Service worker: fetchScryfall, rate-limit buckets, inflight AbortController registry
content/               index.tsx: provideServices + store hydration + mount
scryfall/              rpc.ts (chrome.runtime.sendMessage transport), wire.ts (worker wire types)
services/extension/    chrome.storage impl, background-RPC Scryfall impl, UntapSync adapter
sync/                  postMessage bridge to MAIN-world untap.in apiStore
ui/                    tailwind.css, injectKeyrune.ts
```

### `packages/ui/src/`

Primitive components: Button, Surface, Pill, Dropdown, HScroll, IconButton, MultiSelect, Popover, SearchInput, Spinner, ToggleButton, ButtonGroup + GrimoireLogo, GrimoireMark, icons, colors, theme.css.

## Services seam

Every external dependency (persistence, Scryfall network access, untap sync) is bound at boot through a `Services` record. `packages/app` never reaches into a host environment directly.

```ts
interface Services {
  storage: Storage;       // required: key-value persistence
  scryfall: ScryfallClient; // required: Scryfall API access
  untap?: UntapSync;      // optional: untap.in sync (absent in demo)
}
```

**Hosts:**

| Host | `storage` | `scryfall` | `untap` |
|---|---|---|---|
| `extensions/boundless-grimoire` | `chrome.storage.local` | RPC to background service worker | postMessage adapter over untapBridge |
| `sites/homepage` (`/demo`) | `window.localStorage` | Direct `fetch` to api.scryfall.com | *not provided* |

**Access patterns:**

```ts
// React components
const { storage, scryfall } = useServices();
const untap = useUntapSync(); // UntapSync | undefined

// Non-React modules (stores, utilities)
import { storage, getServices } from "@boundless-grimoire/app";
```

**Boot sequence** (per host):

```ts
provideServices(services);                        // 1. bind
await Promise.all([hydrateDeckStore(), ...]);     // 2. hydrate stores
render(<ServicesProvider services={services}><App /></ServicesProvider>);  // 3. mount
```

See `packages/app/SERVICES.md` for the full contract and guidance on adding services.

## Data model

```ts
DeckLibrary          // persisted to storage
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

- **`deckStore`** (Zustand) — single source of truth for the deck library. Hydrated once via `hydrateDeckStore()`, persisted on every change through the `storage` service. All mutations go through exported action functions.
- **Filter/sort/format state** — persisted inside `Deck` (not a separate store). `useFilterStore` is a facade that reads/writes the active deck's `FilterState`. `customFormatStore` holds named Scryfall query fragments; `customQueryStore` holds user-defined oracle-tag toggles; `presetStore` holds named filter snapshots. Separate Zustand slices for favorites, pins, card preview, print picker, grid size, print size, legality.
- **TanStack Query** — Scryfall search results (infinite pagination), via the `scryfall` service.

## Scryfall API flow

`packages/app` → `services/scryfall.ts` free functions → `ScryfallClient` impl (host-provided).

In the extension: `scryfall/rpc.ts` → `chrome.runtime.sendMessage` → background service worker → `background/fetchScryfall.ts` → Scryfall API.

Rate limiting: two independent token-bucket queues (`background/buckets.ts`) — search endpoints (500 ms gap) and everything else (100 ms gap). Requests never share a bucket, so sustained load maxes at Scryfall's 12 req/sec ceiling.

Abort: sending a `scryfall:abort` message with the request id cancels the in-flight fetch via `background/inflight.ts` (an `AbortController` registry keyed by request id). Used by search-as-you-type to drop stale results.

In the homepage demo: direct `fetch` to `api.scryfall.com` (CORS-permissive endpoint), no worker.

## Analytics

`analytics/stats.ts` — pure functions over `CardMap`:
- `computeManaCurve` — MV distribution (excluding lands), returns `Distribution`
- `computePowerCurve` / `computeToughnessCurve` — creature stat distributions
- `computeCurveByType` — stacked creature vs non-creature mana curve
- `computeColorDemandSupply` — colored pip demand (non-land spells) vs mana source supply, returns `ColorDemandSupply`
- `computeRarityBreakdown` — common/uncommon/rare/mythic counts
- `computeCountBy(mode)` — group by type category or subtype

All charts use `ChartCard` as their outer shell (Surface + pinned title + centered body). Distribution-based charts (`ManaCurveChart`, `PowerCurveChart`, `ToughnessCurveChart`) delegate to `DistributionChart` for the bar/label/average body. Custom charts (`RarityChart`, `CurveByTypeChart`, `ColorManaChart`, `CountByChart`) render their own bodies inside `ChartCard`. All wrapped in `DeckAnalytics`, displayed as an `HScroll` strip or CSS grid in `Overlay`.

## untap.in sync

`sync/` (in the extension shell) — two-way sync with untap.in. The extension is authoritative; untap always receives our current state.

**Pull** (`pullDecks.ts`) — reads untap's IndexedDB directly from the isolated content-script world. No bridge needed; decoupled from WS so the user never waits on untap's handshake to see their existing decks. After import, `enrichDeck.ts` fills in thin card snapshots (name-only from untap) with full Scryfall data. `reEnrich.ts` re-runs enrichment on any cards that are still thin from a prior failed run.

**Push** (`pushDeck.ts`) — goes through the MAIN-world bridge (`untapBridge.ts`) to reach `apiStore.send("update-deck", …)`. Deletions use `pinia:deckStore:deleteDeck` so untap's reactive sidebar re-renders without a page reload. Pushes are debounced at 1500 ms (`pushSchedule.ts`); rapid edits collapse into one push.

**Boot sequence** (`bootSync.ts`) — pull-then-push ordering prevents duplicates: pulling first links any unseen untap decks before the push phase runs. The push phase waits for the bridge (via `UntapSync.whenReady()`) and skips gracefully if it never comes up. Freshly pulled (still-enriching) decks are skipped during boot push.
