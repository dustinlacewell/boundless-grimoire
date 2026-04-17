/**
 * Filter preset store.
 *
 * Named filter presets persisted to chrome.storage.local independently
 * from the deck library. A simple Zustand store with the same
 * hydrate-on-startup / persist-on-change pattern as deckStore.
 */
import { create } from "zustand";
import { storage } from "../services/storage";
import type { FilterState } from "./types";

export interface FilterPreset {
  id: string;
  name: string;
  filters: FilterState;
}

interface PresetStoreState {
  hydrated: boolean;
  presets: FilterPreset[];
}

const STORAGE_KEY = "boundless-grimoire:filter-presets";

export const usePresetStore = create<PresetStoreState>(() => ({
  hydrated: false,
  presets: [],
}));

// ---------- Persistence ----------

export async function hydratePresetStore(): Promise<void> {
  const stored = await storage.get<FilterPreset[]>(STORAGE_KEY);
  usePresetStore.setState({ hydrated: true, presets: stored ?? [] });
}

let writeChain: Promise<void> = Promise.resolve();

function persist(presets: FilterPreset[]): void {
  writeChain = writeChain
    .catch(() => {})
    .then(() => storage.set(STORAGE_KEY, presets))
    .catch((e) => console.error("[presetStore] persist failed", e));
}

usePresetStore.subscribe((state, prev) => {
  if (!state.hydrated) return;
  if (state.presets === prev.presets) return;
  persist(state.presets);
});

// ---------- Actions ----------

export function savePreset(name: string, filters: FilterState): void {
  const preset: FilterPreset = {
    id: crypto.randomUUID(),
    name,
    filters: { ...filters },
  };
  usePresetStore.setState((s) => ({ presets: [preset, ...s.presets] }));
}

export function deletePreset(id: string): void {
  usePresetStore.setState((s) => ({
    presets: s.presets.filter((p) => p.id !== id),
  }));
}

