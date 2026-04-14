/**
 * The services seam.
 *
 * Every external dependency the app needs (key-value persistence, the
 * Scryfall API, untap.in sync) is bound at boot through a `Services`
 * record. The app code itself doesn't know which environment it's
 * running in — it just calls into these interfaces.
 *
 * Two access patterns, both backed by the same boot-time `Services`:
 *
 *   - React components: `useServices()` / `useUntapSync()`. The
 *     dependency is visible in the component, and React's tree provides
 *     the value via context.
 *
 *   - Non-React modules (store hydrators, persistence subscribers,
 *     utility functions): `getServices()` from a module-level singleton
 *     that the boot script populates via `provideServices(...)` before
 *     the React tree mounts.
 *
 * The two access paths agree because both read from the same `Services`
 * value the boot script wires up.
 */
import { createContext, useContext, type ReactNode } from "react";
import type { Storage } from "./storage";
import type { ScryfallClient } from "./scryfall";
import type { UntapSync } from "./untapSync";

export interface Services {
  storage: Storage;
  scryfall: ScryfallClient;
  /** Optional integration. Undefined in environments where untap.in is not reachable. */
  untap?: UntapSync;
}

// --- Module-level singleton (for non-React code) -------------------------

let _services: Services | null = null;

/**
 * Bind the services for this process. Called once during boot, before
 * any store hydration or React rendering.
 *
 * Calling more than once is allowed but uncommon in production — it
 * happens during dev HMR when a host re-mounts and re-runs its boot
 * sequence. The second call replaces the binding (a warning fires in
 * dev so genuine wiring bugs still surface).
 */
export function provideServices(services: Services): void {
  if (_services && _services !== services && import.meta.env?.DEV) {
    console.warn("[services] provideServices replacing the existing binding");
  }
  _services = services;
}

/**
 * Read the bound services. Throws if called before `provideServices`.
 * The throw is intentional: it surfaces wiring bugs immediately rather
 * than letting them turn into mysterious "undefined.get is not a function"
 * errors deep in a store.
 */
export function getServices(): Services {
  if (!_services) {
    throw new Error("services not provided yet — call provideServices() at boot");
  }
  return _services;
}

// --- React context (for components) --------------------------------------

const ServicesContext = createContext<Services | null>(null);

interface ProviderProps {
  services: Services;
  children: ReactNode;
}

/**
 * Place once at the root of the React tree, with the same `Services`
 * instance that was passed to `provideServices`. The dual access keeps
 * components clean while letting non-React modules (stores, utilities)
 * still reach the services.
 */
export function ServicesProvider({ services, children }: ProviderProps) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
  const s = useContext(ServicesContext);
  if (!s) throw new Error("useServices() called outside <ServicesProvider>");
  return s;
}

/**
 * Optional hook for components that depend on untap.in integration.
 * Returns `undefined` in environments where the integration isn't wired
 * (the site demo). Components handle the absence by rendering nothing —
 * see the `UntapSync` interface docs for the contract.
 */
export function useUntapSync(): UntapSync | undefined {
  return useServices().untap;
}

// Re-export the interface types so consumers can import everything from
// "./services" without reaching into individual files.
export type { Storage } from "./storage";
export type { ScryfallClient, FetchOpts, SearchOpts, ScryfallSet, ScryfallIdentifier } from "./scryfall";
export type { UntapSync } from "./untapSync";
