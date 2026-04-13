/**
 * Lazy-loaded Scryfall catalogs (sets, subtypes).
 *
 * Loaded once per page session at first FilterBar mount, cached in
 * module-level state, and exposed via useCatalogs(). Uses the default
 * (10 req/sec) bucket so the parallel fetches don't bunch up against
 * search-bucket capacity.
 */
import { useEffect, useState } from "react";
import { getCatalog, getSets, type ScryfallSet } from "../scryfall/client";

export interface Catalogs {
  sets: ScryfallSet[];
  subtypes: string[];
}

let cache: Catalogs | null = null;
let inflight: Promise<Catalogs> | null = null;

const SUBTYPE_CATALOGS = [
  "creature-types",
  "planeswalker-types",
  "land-types",
  "artifact-types",
  "enchantment-types",
  "spell-types",
];

async function load(): Promise<Catalogs> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const [sets, ...subtypeBuckets] = await Promise.all([
      getSets(),
      ...SUBTYPE_CATALOGS.map((c) => getCatalog(c)),
    ]);
    const subtypes = Array.from(new Set(subtypeBuckets.flat())).sort();
    cache = { sets, subtypes };
    return cache;
  })();
  return inflight;
}

/**
 * React hook: returns the loaded catalogs, or null while still loading.
 * Multiple concurrent callers share the same in-flight promise.
 */
export function useCatalogs(): Catalogs | null {
  const [data, setData] = useState<Catalogs | null>(cache);

  useEffect(() => {
    if (data) return;
    let cancelled = false;
    void load().then((c) => {
      if (!cancelled) setData(c);
    });
    return () => {
      cancelled = true;
    };
  }, [data]);

  return data;
}
