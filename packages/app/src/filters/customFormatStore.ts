/**
 * Custom format store.
 *
 * User-defined named Scryfall query fragments that act as global filters
 * when assigned to a deck. Persisted to chrome.storage.local.
 *
 * Text format (one per line):
 *   Standard=f:standard
 *   Modern=f:modern
 *   Pioneer=f:pioneer
 *   Commander=f:commander
 *   Pauper=f:pauper
 *   My Cube=s:mkm or s:dsk or s:blb
 */
import { create } from "zustand";
import { storage } from "../services/storage";

export interface CustomFormat {
  name: string;
  fragment: string;
}

interface CustomFormatStoreState {
  hydrated: boolean;
  formats: CustomFormat[];
}

const STORAGE_KEY = "boundless-grimoire:custom-formats";

export const useCustomFormatStore = create<CustomFormatStoreState>(() => ({
  hydrated: false,
  formats: [],
}));

// ---------- Persistence ----------

export async function hydrateCustomFormatStore(): Promise<void> {
  const stored = await storage.get<CustomFormat[]>(STORAGE_KEY);
  useCustomFormatStore.setState({
    hydrated: true,
    formats: stored ?? defaultFormats(),
  });
}

let writeChain: Promise<void> = Promise.resolve();

function persist(formats: CustomFormat[]): void {
  writeChain = writeChain
    .catch(() => {})
    .then(() => storage.set(STORAGE_KEY, formats))
    .catch((e) => console.error("[customFormatStore] persist failed", e));
}

useCustomFormatStore.subscribe((state, prev) => {
  if (!state.hydrated) return;
  if (state.formats === prev.formats) return;
  persist(state.formats);
});

// ---------- Actions ----------

export function setCustomFormats(formats: CustomFormat[]): void {
  useCustomFormatStore.setState({ formats });
}

export function resetCustomFormats(): CustomFormat[] {
  const defaults = defaultFormats();
  useCustomFormatStore.setState({ formats: defaults });
  return defaults;
}

// ---------- Serialization ----------

export function formatsToText(formats: CustomFormat[]): string {
  return formats.map((f) => `${f.name}=${f.fragment}`).join("\n");
}

export function textToFormats(text: string): CustomFormat[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && line.includes("="))
    .map((line) => {
      const idx = line.indexOf("=");
      return {
        name: line.slice(0, idx).trim(),
        fragment: line.slice(idx + 1).trim(),
      };
    })
    .filter((f) => f.name && f.fragment);
}

// ---------- Defaults ----------

function defaultFormats(): CustomFormat[] {
  return [
    { name: "Standard", fragment: "f:standard" },
    { name: "Modern", fragment: "f:modern" },
    { name: "Pioneer", fragment: "f:pioneer" },
    { name: "Commander", fragment: "f:commander" },
    { name: "Pauper", fragment: "f:pauper" },
    { name: "Legacy", fragment: "f:legacy" },
    { name: "Vintage", fragment: "f:vintage" },
  ];
}
