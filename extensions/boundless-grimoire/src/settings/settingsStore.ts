import { create } from "zustand";
import { attachPersistence } from "../storage/persistedSlice";

const STORAGE_KEY = "boundless-grimoire:settings";

export type AnalyticsLayout = "scroll" | "wrap";

export interface Settings {
  devMode: boolean;
  analyticsLayout: AnalyticsLayout;
}

interface SettingsStoreState {
  hydrated: boolean;
  settings: Settings;
}

const DEFAULT_SETTINGS: Settings = {
  devMode: false,
  analyticsLayout: "scroll",
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
