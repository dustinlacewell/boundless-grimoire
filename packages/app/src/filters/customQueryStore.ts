/**
 * Custom query store.
 *
 * User-defined named Scryfall query fragments that appear as toggle
 * buttons in the filter bar. Persisted to chrome.storage.local.
 *
 * Text format (one per line):
 *   Function
 *   Removal=otag:spot-removal or otag:removal-creature
 *   Ramp=otag:ramp or otag:mana-dork
 *   Keywords
 *   Flying=o:"flying"
 *
 * A line without "=" is a section header. Lines with "=" are toggles.
 * The META_TAGS from oracleTags.ts provide defaults; the user can
 * edit, remove, or add their own.
 */
import { create } from "zustand";
import { storage } from "../services/storage";
import { META_TAGS } from "./oracleTags";
import { preserveOnHmr } from "../storage/preserveOnHmr";

export interface CustomQuery {
  name: string;
  /** Empty string = section header, non-empty = query toggle. */
  fragment: string;
}

interface CustomQueryStoreState {
  hydrated: boolean;
  queries: CustomQuery[];
}

const STORAGE_KEY = "boundless-grimoire:custom-queries";

export const useCustomQueryStore = create<CustomQueryStoreState>(() => ({
  hydrated: false,
  queries: [],
}));

// ---------- Persistence ----------

export async function hydrateCustomQueryStore(): Promise<void> {
  const stored = await storage.get<CustomQuery[]>(STORAGE_KEY);
  useCustomQueryStore.setState({
    hydrated: true,
    queries: stored ?? defaultQueries(),
  });
}

let writeChain: Promise<void> = Promise.resolve();

function persist(queries: CustomQuery[]): void {
  writeChain = writeChain
    .catch(() => {})
    .then(() => storage.set(STORAGE_KEY, queries))
    .catch((e) => console.error("[customQueryStore] persist failed", e));
}

useCustomQueryStore.subscribe((state, prev) => {
  if (!state.hydrated) return;
  if (state.queries === prev.queries) return;
  persist(state.queries);
});

// ---------- Actions ----------

export function setCustomQueries(queries: CustomQuery[]): void {
  useCustomQueryStore.setState({ queries });
}

export function resetCustomQueries(): CustomQuery[] {
  const defaults = defaultQueries();
  useCustomQueryStore.setState({ queries: defaults });
  return defaults;
}

// ---------- Serialization ----------

/** Serialize queries to editable text format. */
export function queriesToText(queries: CustomQuery[]): string {
  return queries
    .map((q) => (q.fragment ? `${q.name}=${q.fragment}` : q.name))
    .join("\n");
}

/** Parse editable text format back to queries. Skips blank lines. */
export function textToQueries(text: string): CustomQuery[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (!line.includes("=")) {
        // Section header
        return { name: line, fragment: "" };
      }
      const idx = line.indexOf("=");
      return {
        name: line.slice(0, idx).trim(),
        fragment: line.slice(idx + 1).trim(),
      };
    })
    .filter((q) => q.name);
}

// ---------- Sections ----------

/** A section: optional header label + its toggle entries with original indices. */
export interface CustomQuerySection {
  header: string | null;
  entries: Array<{ index: number; query: CustomQuery }>;
}

/** Group the flat query list into sections. */
export function groupIntoSections(queries: CustomQuery[]): CustomQuerySection[] {
  const sections: CustomQuerySection[] = [];
  let current: CustomQuerySection = { header: null, entries: [] };
  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    if (!q.fragment) {
      // Section header — push the current section if it has entries, start new
      if (current.entries.length > 0 || current.header !== null) {
        sections.push(current);
      }
      current = { header: q.name, entries: [] };
    } else {
      current.entries.push({ index: i, query: q });
    }
  }
  if (current.entries.length > 0 || current.header !== null) {
    sections.push(current);
  }
  return sections;
}

// ---------- Defaults ----------

const KEYWORD_DEFAULTS: CustomQuery[] = [
  { name: "Flying", fragment: 'o:"flying"' },
  { name: "Trample", fragment: 'o:"trample"' },
  { name: "Menace", fragment: 'o:"menace"' },
  { name: "Deathtouch", fragment: 'o:"deathtouch"' },
  { name: "First Strike", fragment: 'o:"first strike" or o:"double strike"' },
  { name: "Reach", fragment: 'o:"reach"' },
  { name: "Vigilance", fragment: 'o:"vigilance"' },
  { name: "Haste", fragment: 'o:"haste"' },
  { name: "Lifelink", fragment: 'o:"lifelink"' },
  { name: "Hexproof", fragment: 'o:"hexproof"' },
  { name: "Ward", fragment: 'o:"ward"' },
  { name: "Indestructible", fragment: 'o:"indestructible"' },
  { name: "Flash", fragment: 'o:"flash"' },
];

function defaultQueries(): CustomQuery[] {
  const metaDefaults = META_TAGS.map((m) => ({
    name: m.label,
    fragment: m.otags.map((t) => `otag:${t}`).join(" or "),
  }));
  return [
    { name: "Function", fragment: "" },
    ...metaDefaults,
    { name: "Keywords", fragment: "" },
    ...KEYWORD_DEFAULTS,
  ];
}

preserveOnHmr(useCustomQueryStore, import.meta.hot);
