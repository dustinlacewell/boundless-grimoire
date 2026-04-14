# @boundless-grimoire/app

The Boundless Grimoire deck-builder — UI, stores, and service interfaces. Environment-agnostic.

Two consumers:

- **`extensions/boundless-grimoire`** — the Chrome extension. Mounts the app over untap.in.
- **`sites/homepage`** — the marketing site's `/demo` route. Mounts the app standalone in the browser.

The package code knows nothing about either environment. External dependencies (storage, network, untap sync) are bound at boot through a `Services` record that each host wires up. See [`SERVICES.md`](./SERVICES.md) for the contract.

## Exports

A single barrel at `@boundless-grimoire/app`. Anything not re-exported from `src/index.ts` is intentionally private.

```ts
import {
  // The mounted React surface
  App,

  // Services — wire at boot
  ServicesProvider, provideServices, useServices, useUntapSync,
  type Services, type Storage, type ScryfallClient, type UntapSync,

  // Store hydrators — call once before mount
  hydrateDeckStore,
  hydrateMetaGroupsStore,
  /* ...etc */

  // Domain types
  type Deck, type DeckLibrary, type CardSnapshot, type ScryfallCard,
} from "@boundless-grimoire/app";
```

## Local development

No standalone dev server. Both consumers (`extensions/boundless-grimoire`, `sites/homepage`) read this package's source directly via the workspace dependency, so changes here are picked up by their dev servers immediately.
