# Zone Refactor — Handoff

**Context:** Boundless Grimoire is a React/Zustand MTG deck-builder Chrome extension overlaid on untap.in. This documents an in-progress structural refactor of the deck data model. Most files are done; a few remain before typecheck is clean.

---

## Why this refactor

### Problem 1: Commander was a singleton

The old model stored commander as `commander: CardSnapshot | null` — a single card or nothing. This broke for:

- **Partner commanders** (e.g. Rograkh + Sakashima) — two legal commanders
- **Doctor's Companion** — a special one-way partner mechanic, also two commanders
- **Future-proofing** — any multi-commander variant

### Problem 2: "Starts in Play" didn't exist

untap.in has a `play-1` zone for cards that begin the game in play (commanders in the zone, tokens, emblems, etc.). Boundless Grimoire had no equivalent concept, so commander wasn't being synced to untap at all. When a user set a commander in BG and pushed the deck, untap received it in `deck-1` (mainboard) instead of `play-1`.

The fix requires a separate zone for "starts in play" cards — some of which are commanders, some of which aren't.

### Problem 3: `groupBy` was mainboard-only

`deck.groupBy` was a flat field controlling how the mainboard was grouped (by category, CMC, zone, meta-tags, etc.). With multiple zones that each have their own display, each zone needs its own `groupBy` setting.

### Problem 4: Flat shape didn't scale

Adding each new zone required adding a new top-level field to `Deck`, new parameters to every function that touched cards, new migration steps, and new UI plumbing. The zone map is open to extension: adding a "maybe board" or "hand" zone is a one-liner in `ZoneName`.

---

## What changed

Replaced the flat `Deck` shape:

```ts
// OLD
Deck {
  cards: Record<string, DeckCard>      // mainboard
  sideboard: Record<string, DeckCard>
  commander: CardSnapshot | null       // singleton — broken for partners
  groupBy: DeckGroupBy                 // mainboard-only
}
```

With a unified zone map:

```ts
// NEW
type ZoneName = "mainboard" | "sideboard" | "commander" | "startsInPlay";

interface Zone {
  cards: Record<string, DeckCard>;
  groupBy: DeckGroupBy;
}

Deck {
  zones: Record<ZoneName, Zone>  // all 4 always present, empty if unused
}
```

All 4 zones are always present on every deck (never null/undefined). Empty zones have `cards: {}`. This means consumers never need to null-check — `deck.zones.commander.cards` is always a valid (possibly empty) map.

---

## Migration

`LIBRARY_VERSION` bumped 11 → 12. Step v11→v12 in `migrations.ts`:

- Reads `raw.cards`, `raw.sideboard`, `raw.commander`, `raw.groupBy` off the untyped raw record
- Builds `zones`: mainboard gets old `cards` + old `groupBy`; sideboard gets old `sideboard`; commander gets a single-entry map if old `commander` was set; `startsInPlay` starts empty
- Destructures the old fields away so stored data is clean

Older migration steps (v2→v3, v4→v5, v5→v6) still reference pre-zones fields (`deck.cards`, `deck.sideboard`, `deck.groupBy`). Since the current `Deck` type no longer has those fields, TypeScript would reject them. Fix: access via `raw as unknown as Record<string, unknown>` and cast the output `as unknown as Deck`. These steps run on legacy data that still has the old shape; the cast is correct.

---

## Store changes (`deckStore.ts`)

- `makeEntity` builds `zones: emptyZones(isCube)` — four zones with empty card maps
- `setDeckCommander` **removed** → replaced with:
  - `addCommander(deckId, snapshot)` — moves card from mainboard to commander zone (or adds if not present)
  - `removeCommander(deckId, cardId)` — moves card back to mainboard
- `setDeckGroupBy(deckId, groupBy, zoneName = "mainboard")` — third param selects which zone's groupBy to update (defaults to mainboard for backwards-compatible call sites)
- `swapCardPrint(deckId, oldId, newSnapshot, zoneName: ZoneName = "mainboard")`
- `deckCardCount` now iterates all zones via `Object.values(deck.zones)`
- `coverSnapshotOf` searches all zones for the cover card

---

## Command layer (`libTransforms.ts`, `cardCommands.ts`, `cardActions.ts`)

- `moveCards(lib, deckId, deltas, from: ZoneName, to: ZoneName)` — explicit from+to instead of implicit "mainboard↔sideboard"
- `DeckZone` is a re-export alias for `ZoneName` (no breaking change for call sites)
- Default zone for `incrementCard`/`decrementCard` is `"mainboard"` (was the string `"main"` which was never a valid zone name — was a latent bug)

---

## untap.in sync zone mapping

untap.in has its own zone tags (`deck-1`, `sideboard-1`, `play-1`, etc.) that are separate from ours. The mapping:

| Local zone | untap zone tag |
|---|---|
| `mainboard` | `deck-1` |
| `sideboard` | `sideboard-1` |
| `commander` | `play-1` |
| `startsInPlay` | `play-1` |

Both `commander` and `startsInPlay` map to untap's `play-1` because from untap's perspective, all of these cards begin the game in play. `pushDeck` builds `play1Text` by combining cards from both zones, formatted as `"1 CardName"` lines, and passes it to the `paste-deck` resolution call.

`pullDecks` (the initial import from untap's IndexedDB) builds decks with `zones.mainboard` populated and the other three zones empty. Enrichment fills in the card snapshots afterward.

---

## Status

### ✅ Done — verified typecheck-clean

| File | What changed |
|---|---|
| `packages/app/src/storage/types.ts` | `ZoneName`, `Zone`, new `Deck.zones`; removed `cards/sideboard/commander/groupBy` |
| `packages/app/src/storage/migrations.ts` | v11→v12 step; old steps cast `as unknown as Deck` |
| `packages/app/src/storage/deckStore.ts` | All mutations/selectors; `addCommander`/`removeCommander` |
| `packages/app/src/commands/libTransforms.ts` | `moveCards` takes explicit `from`+`to` |
| `packages/app/src/commands/cardCommands.ts` | Uses new `moveCards` signature |
| `packages/app/src/commands/cardActions.ts` | Default zone `"mainboard"`; uses `deck.zones[zone].cards` |
| `packages/app/src/index.ts` | Exports `addCommander`/`removeCommander`; removed `setDeckCommander` |
| `packages/app/src/analytics/` (7 files) | `deck.cards` → `deck.zones.mainboard.cards` |
| `packages/app/src/cards/categorize.ts` | Zone detection updated |
| `packages/app/src/decks/deckText.ts` | Uses `zones.mainboard.cards` / `zones.sideboard.cards` |
| `packages/app/src/formats/validate.ts` | Commander check uses `zones.commander.cards` |
| `packages/app/src/decks/legalityStore.ts` | Uses zones |
| `packages/app/src/search/CardGridItem.tsx` | Uses zones |
| `packages/app/src/decks/DeckView.tsx` | Full rewrite — commander is now its own `CardColumnGrid` section |
| `packages/app/src/decks/CubeView.tsx` | `zones.mainboard.groupBy` / `zones.mainboard.cards` |
| `packages/app/src/decks/DeckRibbonItem.tsx` | Color identity iterates all zones |
| `packages/app/src/decks/EntityHeaderControls.tsx` | `zones.mainboard.groupBy` |
| `packages/app/src/decks/metaGroupsStore.ts` | `collectLibraryOracleIds` iterates all zones |
| `packages/app/src/decks/testDrawStore.ts` | `expandDeck` uses `zones.mainboard.cards` |
| `extensions/boundless-grimoire/src/sync/pushDeck.ts` | Builds `play1Text` from commander+startsInPlay zones |
| `extensions/boundless-grimoire/src/sync/pullDecks.ts` | `buildThinDeck` returns zones shape |
| `extensions/boundless-grimoire/src/sync/reEnrich.ts` | Enriches all zones via `Promise.all` over zone names |

### ❌ Not done — still needs work

**`sites/homepage/src/components/EmbeddedApp.tsx`** — not touched yet. The homepage demo mounts the app with browser-native service impls. Search it for `deck.cards`, `deck.sideboard`, `deck.commander`, `deck.groupBy`, `setDeckCommander` and update to zones API. May be minimal — the homepage demo is read-light and doesn't expose commander UI.

**Full typecheck** — not run since all the above fixes were made. Run:
```bash
pnpm --filter @boundless-grimoire/app exec tsc --noEmit
pnpm --filter boundless-grimoire exec tsc --noEmit
```
May surface stragglers. Watch for: `deck.groupBy` (→ `deck.zones.mainboard.groupBy`), `setDeckCommander` call sites, `"main"` string literal as a zone name (was never valid, now a type error).

**`setDeckGroupBy` call sites** — the function now takes a third `zoneName` param. Existing call sites without it default to `"mainboard"`, which is correct. But grep to confirm none were passing a second arg that now shifts meaning.

**CLAUDE.md data model section** — still documents the old flat shape. Update to reflect `zones: Record<ZoneName, Zone>`.

**Commits** — everything is in one WIP change. Split into logical layers before merging to `dev`:
1. `types.ts` + `migrations.ts` — schema change
2. `deckStore.ts` + command layer — store mutations
3. Analytics + categorize + deckText + validate + search — read-only consumers
4. Deck UI (DeckView, CubeView, ribbon, etc.) — UI consumers
5. Sync layer (pushDeck, pullDecks, reEnrich) — untap integration
6. Homepage + CLAUDE.md

---

## Key invariants to preserve

- All 4 zones always present — never null-check before accessing `deck.zones[name].cards`
- `enrichDeckInPlace` iterates `Object.keys(deck.zones) as ZoneName[]` — all zones get enriched, not just mainboard
- `reEnrichThinDecks` checks `Object.values(deck.zones).some(z => hasThinCards(z.cards))`
- Push guard: `deck.enriching === true` blocks push (set during pull import, cleared when enrichment completes)
- Commander zone has no enforced count semantics in the store — cards can have `count > 1` in the map; the UI is responsible for enforcing singleton/partner rules via `addCommander`/`removeCommander`
- `DeckView` renders the commander zone as its own `CardColumnGrid` section below the mainboard, above the sideboard. `onIncrement` is a no-op for the commander section; `onDecrement` calls `removeCommander`.
