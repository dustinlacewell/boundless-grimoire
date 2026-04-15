/**
 * Public types for the deck generator. Pure data — no React, no DOM.
 */
import type { ColorLetter } from "../filters/types";
import type { CardSnapshot } from "../storage/types";

export type CurvePreset = "low" | "default" | "high";
export type DeckSize = 40 | 60 | 100;
export type ColorCount = 1 | 2 | 3 | 4 | 5;

export interface GeneratorInput {
  /** Index into useCustomFormatStore.formats. */
  formatIndex: number;
  /** Subset of WUBRG, or empty meaning "auto-pick `colorCount` colors". */
  colors: ColorLetter[];
  /** Used only when `colors` is empty. */
  colorCount: ColorCount;
  size: DeckSize;
  curve: CurvePreset;
  /** All three sum to 100. */
  creaturePct: number;
  nonCreaturePct: number;
  landPct: number;
  /** Forced true when `commander` is true. */
  singleton: boolean;
  /** Commander mode: forces size=100 and singleton. */
  commander: boolean;
}

export type GenPhase =
  | { kind: "pool-creatures"; fetched: number }
  | { kind: "pool-noncreatures"; fetched: number }
  | { kind: "pool-lands"; fetched: number }
  | { kind: "pool-commander"; fetched: number }
  | { kind: "picking"; spellsPicked: number; spellsTarget: number }
  | { kind: "lands"; landsPicked: number; landsTarget: number };

export interface GenProgress {
  phase: GenPhase;
}

export interface GeneratedDeckCard {
  snapshot: CardSnapshot;
  count: number;
}

export interface GeneratedDeck {
  name: string;
  commander?: CardSnapshot;
  cards: GeneratedDeckCard[];
}

export const WUBRG: ColorLetter[] = ["W", "U", "B", "R", "G"];
