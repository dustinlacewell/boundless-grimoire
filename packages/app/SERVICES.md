# Services

Every external dependency the deck-builder needs — key-value persistence, the Scryfall API, untap.in deck sync — is bound at boot through a `Services` record. The app code in this package never reaches into a host environment directly; it goes through the seam.

Two hosts ship today, and the architecture is designed so a third (a desktop wrapper, an Electron build, a server-side renderer) drops in by writing one new set of impls.

| Host | `storage` | `scryfall` | `untap` |
| --- | --- | --- | --- |
| `extensions/boundless-grimoire` | `chrome.storage.local` | RPC to a background service worker (rate-limited, shared across tabs) | postMessage adapter over the MAIN-world `untapBridge` content script |
| `sites/homepage` (`/demo`) | `window.localStorage` | Direct `fetch` to api.scryfall.com (CORS-permissive) | *not provided* |

## The contract

```ts
interface Services {
  storage: Storage;
  scryfall: ScryfallClient;
  untap?: UntapSync;
}
```

`storage` and `scryfall` are **required services** — every host provides an impl. There is no "unavailable" state for them; the back-ends differ but the API shape doesn't.

`untap` is an **optional integration**. It exists in the extension and is genuinely absent in the demo. The optionality is encoded in the type, not in a runtime `available: boolean` flag — components that depend on it call `useUntapSync()`, get back `UntapSync | undefined`, and render `null` when it's missing. The demo never shows untap-flavored UI at all, by construction.

## Two access paths

Both are backed by the same `Services` value the host wires up at boot.

```ts
// React components — dependency is visible in JSX, value flows through context
const { storage, scryfall } = useServices();
const untap = useUntapSync();

// Non-React modules (store hydrators, persistence subscribers, utilities)
import { storage, getServices } from "@boundless-grimoire/app";
const lib = await storage.get<DeckLibrary>("library");
const untap = getServices().untap;
```

The `getServices()` singleton throws if called before `provideServices(...)`. That's deliberate: a missing wiring step surfaces immediately, not as `undefined.get is not a function` deep in a store.

## Booting a new host

```ts
import { App, ServicesProvider, provideServices, hydrateDeckStore /* ... */ } from "@boundless-grimoire/app";
import { createMyServices } from "./my-services";

const services = createMyServices();
provideServices(services);                // 1. bind the services
await Promise.all([hydrateDeckStore() /* ... */]);  // 2. hydrate stores
// 3. mount the React tree under <ServicesProvider>
ReactDOM.createRoot(host).render(
  <ServicesProvider services={services}>
    <App />
  </ServicesProvider>,
);
```

That's the whole API surface. See `extensions/boundless-grimoire/src/content/index.tsx` and `sites/homepage/src/components/DemoApp.tsx` for the two real wirings.

## Adding a new service

Don't, until you have to. The current three exist because they cover real environment differences:

- **Persistence backends differ** by host (chrome.storage vs localStorage vs IndexedDB vs nothing).
- **Network access differs** by host (worker-mediated vs direct vs proxied).
- **Integration with untap.in** is meaningful only on untap.in.

If a fourth seam genuinely needs to differ between hosts, the steps:

1. Define the interface in `packages/app/src/services/<name>.ts` — keep it narrow. Every method here grows every impl.
2. Decide required vs optional. Required services live in `Services` directly; optional ones get their own context hook (`useFooBar(): FooBar | undefined`).
3. Add it to the `Services` interface in `packages/app/src/services/index.tsx` and re-export from the package barrel.
4. Provide impls in each host. Host-specific code lives outside the app package — in `extensions/boundless-grimoire/src/services/extension/` and `sites/homepage/src/services/`.
5. Update `SERVICES.md` with the new row in the table at the top.

## What does *not* belong as a service

Things that are the same in every environment don't need a seam. Examples that have come up and were correctly *not* turned into services:

- The Scryfall rate-limit policy (a `RateLimitedBucket` shared by all impls — same throttle math everywhere).
- Card snapshot serialization (`toSnapshot`).
- Decklist parsing / formatting.
- The Zustand stores themselves — they're app state, which is process-global by definition.

The litmus test: if you wouldn't write a *meaningfully different* impl per host, it's app code, not a service.
