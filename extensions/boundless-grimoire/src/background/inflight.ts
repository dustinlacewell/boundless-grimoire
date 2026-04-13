/**
 * Registry of in-flight Scryfall fetches, keyed by request id, so an
 * `scryfall:abort` message from the content side can cancel the matching
 * fetch (e.g. when a search-as-you-type input changes before the previous
 * response arrived).
 *
 * Lifetime: an entry is added when the fetch starts and removed in the
 * `finally` of the fetch — see `fetchScryfall.ts`.
 */
const controllers = new Map<string, AbortController>();

export function track(id: string): AbortController {
  const ctl = new AbortController();
  controllers.set(id, ctl);
  return ctl;
}

export function release(id: string): void {
  controllers.delete(id);
}

export function abort(id: string): void {
  controllers.get(id)?.abort();
}
