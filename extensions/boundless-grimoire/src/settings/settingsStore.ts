import { create } from "zustand";
import { attachPersistence } from "../storage/persistedSlice";

const STORAGE_KEY = "boundless-grimoire:settings";

export type AnalyticsLayout = "scroll" | "wrap";
export type DeckLayout = "scroll" | "wrap";
export type DeckGroupBy = "category" | "cmc" | "meta";
export type PreviewMode = "image" | "text" | "both";

export interface Settings {
  devMode: boolean;
  analyticsLayout: AnalyticsLayout;
  deckLayout: DeckLayout;
  deckGroupBy: DeckGroupBy;
  previewMode: PreviewMode;
}

interface SettingsStoreState {
  hydrated: boolean;
  settings: Settings;
}

const DEFAULT_SETTINGS: Settings = {
  devMode: false,
  analyticsLayout: "scroll",
  deckLayout: "scroll",
  deckGroupBy: "category",
  previewMode: "both",
};

export const useSettingsStore = create<SettingsStoreState>(() => ({
  hydrated: false,
  settings: DEFAULT_SETTINGS,
}));

const { hydrate } = attachPersistence<SettingsStoreState, Settings>(useSettingsStore, {
  label: STORAGE_KEY,
  storageKey: STORAGE_KEY,
  select: (s) => s.settings,
  isHydrated: (s) => s.hydrated,
  setHydrated: (loaded) => ({
    hydrated: true,
    settings: loaded ? { ...DEFAULT_SETTINGS, ...loaded } : DEFAULT_SETTINGS,
  }),
});

export const hydrateSettingsStore = hydrate;

export function setDevMode(enabled: boolean): void {
  useSettingsStore.setState((s) => ({
    settings: { ...s.settings, devMode: enabled },
  }));
}

export function setAnalyticsLayout(layout: AnalyticsLayout): void {
  useSettingsStore.setState((s) => ({
    settings: { ...s.settings, analyticsLayout: layout },
  }));
}

export function setDeckLayout(layout: DeckLayout): void {
  useSettingsStore.setState((s) => ({
    settings: { ...s.settings, deckLayout: layout },
  }));
}

export function setDeckGroupBy(mode: DeckGroupBy): void {
  useSettingsStore.setState((s) => ({
    settings: { ...s.settings, deckGroupBy: mode },
  }));
}

export function setPreviewMode(mode: PreviewMode): void {
  useSettingsStore.setState((s) => ({
    settings: { ...s.settings, previewMode: mode },
  }));
}
