/**
 * Format definition store.
 *
 * Replaces the old `customFormatStore` which stored formats as plain
 * `{name, fragment}` pairs. The new shape carries full deck-construction
 * rules (size, copies, commander, set restriction) so validation can
 * check more than just Scryfall-based legality.
 *
 * Persistence key stays `boundless-grimoire:custom-formats` — the
 * migration in this file handles the old → new shape transparently.
 *
 * Settings UI: the old textarea editor is replaced by a dedicated
 * FormatManagerModal. Formats are stored as JSON; the modal offers
 * copy-to-clipboard and paste-from-clipboard for sharing.
 */
import { create } from "zustand";
import { storage } from "../services/storage";
import { attachPersistence } from "../storage/persistedSlice";
import { DEFAULT_FORMATS } from "./defaults";
import type { FormatDefinition } from "./types";

interface FormatStoreState {
  hydrated: boolean;
  formats: FormatDefinition[];
}

const STORAGE_KEY = "boundless-grimoire:custom-formats";

export const useFormatStore = create<FormatStoreState>(() => ({
  hydrated: false,
  formats: [],
}));

// --- Persistence -----------------------------------------------------------

interface OldCustomFormat {
  name: string;
  fragment: string;
}

function isOldShape(stored: unknown): stored is OldCustomFormat[] {
  if (!Array.isArray(stored)) return false;
  if (stored.length === 0) return true;
  const first = stored[0] as Record<string, unknown>;
  return typeof first.name === "string" && typeof first.fragment === "string" && !("format" in first);
}

function migrateOldFormats(old: OldCustomFormat[]): FormatDefinition[] {
  const knownFormats: Record<string, string> = {
    standard: "standard",
    modern: "modern",
    pioneer: "pioneer",
    commander: "commander",
    pauper: "pauper",
    legacy: "legacy",
    vintage: "vintage",
  };
  return old.map((o) => {
    const fmtMatch = o.fragment.match(/^f:(\w+)$/);
    const fmtKey = fmtMatch?.[1]?.toLowerCase();
    const known = fmtKey ? knownFormats[fmtKey] : undefined;
    if (known) {
      const preset = DEFAULT_FORMATS.find((d) => d.format === known);
      if (preset) return { ...preset, name: o.name };
    }
    return {
      name: o.name,
      format: "",
      sets: [],
      fragment: o.fragment,
      maxCopies: 4,
      minDeckSize: 60,
      maxDeckSize: null,
      sideboardSize: 15,
      commanderRequired: false,
    };
  });
}

export async function hydrateFormatStore(): Promise<void> {
  const stored = await storage.get<unknown>(STORAGE_KEY);
  let formats: FormatDefinition[];
  if (!stored) {
    formats = [...DEFAULT_FORMATS];
  } else if (isOldShape(stored)) {
    formats = migrateOldFormats(stored);
  } else {
    formats = stored as FormatDefinition[];
  }
  useFormatStore.setState({ hydrated: true, formats });
}

const { hydrate: _hydrate } = attachPersistence(useFormatStore, {
  label: "formatStore",
  storageKey: STORAGE_KEY,
  select: (s) => s.formats,
  setHydrated: (loaded) => ({
    hydrated: true,
    formats: loaded
      ? isOldShape(loaded) ? migrateOldFormats(loaded) : loaded as FormatDefinition[]
      : [...DEFAULT_FORMATS],
  }),
  isHydrated: (s) => s.hydrated,
});

// --- Actions ---------------------------------------------------------------

export function setFormats(formats: FormatDefinition[]): void {
  useFormatStore.setState({ formats });
}

export function updateFormat(index: number, format: FormatDefinition): void {
  useFormatStore.setState((s) => {
    const next = [...s.formats];
    next[index] = format;
    return { formats: next };
  });
}

export function addFormat(format: FormatDefinition): void {
  useFormatStore.setState((s) => ({ formats: [...s.formats, format] }));
}

export function removeFormat(index: number): void {
  useFormatStore.setState((s) => ({
    formats: s.formats.filter((_, i) => i !== index),
  }));
}

export function resetFormats(): FormatDefinition[] {
  const defaults = [...DEFAULT_FORMATS];
  useFormatStore.setState({ formats: defaults });
  return defaults;
}

// --- Serialization (for copy/paste) ----------------------------------------

export function formatsToJson(formats: FormatDefinition[]): string {
  return JSON.stringify(formats, null, 2);
}

export function jsonToFormats(json: string): FormatDefinition[] | null {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (f: unknown) =>
        typeof f === "object" &&
        f !== null &&
        typeof (f as Record<string, unknown>).name === "string",
    ) as FormatDefinition[];
  } catch {
    return null;
  }
}

// --- Compat shims ----------------------------------------------------------
// These bridge the old `customFormatStore` API so consumers that only
// need `formats[]` and `hydrateCustomFormatStore()` work without changes
// during the migration. Will be removed once all consumers are updated.

/** @deprecated Use useFormatStore */
export const useCustomFormatStore = useFormatStore;
/** @deprecated Use hydrateFormatStore */
export const hydrateCustomFormatStore = hydrateFormatStore;
