/**
 * CMC bucket templates for the constructed generator (whitepaper §4.2).
 *
 * Three curve presets × three sizes. Each bucket is `[min, max, pct]`
 * with `pct` summing to 1.0 within a list. Buckets apply separately to
 * creatures and to non-creatures.
 */
import type { CurvePreset, DeckSize } from "./types";

export interface CmcBucket {
  min: number;
  max: number;
  pct: number; // 0..1
}

type Templates = Record<CurvePreset, Record<DeckSize, CmcBucket[]>>;

export const CURVE_TEMPLATES: Templates = {
  low: {
    100: [b(0, 2, 0.55), b(3, 4, 0.30), b(5, 6, 0.15)],
    60:  [b(0, 2, 0.60), b(3, 4, 0.30), b(5, 6, 0.10)],
    40:  [b(0, 2, 0.65), b(3, 4, 0.30), b(5, 5, 0.05)],
  },
  default: {
    100: [b(0, 2, 0.15), b(3, 5, 0.50), b(6, 7, 0.30), b(8, 100, 0.05)],
    60:  [b(0, 2, 0.20), b(3, 5, 0.50), b(6, 7, 0.25), b(8, 100, 0.05)],
    40:  [b(0, 2, 0.30), b(3, 4, 0.45), b(5, 6, 0.20), b(7, 100, 0.05)],
  },
  high: {
    100: [b(0, 2, 0.05), b(3, 5, 0.40), b(6, 7, 0.40), b(8, 100, 0.15)],
    60:  [b(0, 2, 0.05), b(3, 5, 0.35), b(6, 7, 0.40), b(8, 100, 0.15)],
    40:  [b(0, 2, 0.10), b(3, 4, 0.30), b(5, 6, 0.45), b(7, 100, 0.15)],
  },
};

function b(min: number, max: number, pct: number): CmcBucket {
  return { min, max, pct };
}

export interface ResolvedBucket extends CmcBucket {
  amount: number; // remaining slots
}

/** Resolve a template + total target into per-bucket card counts (ceil). */
export function resolveBuckets(curve: CurvePreset, size: DeckSize, target: number): ResolvedBucket[] {
  const tmpl = CURVE_TEMPLATES[curve][size];
  return tmpl.map((b) => ({ ...b, amount: Math.ceil(b.pct * target) }));
}

export function bucketIndexForCmc(buckets: ResolvedBucket[], cmc: number): number {
  for (let i = 0; i < buckets.length; i++) {
    if (cmc >= buckets[i].min && cmc <= buckets[i].max) return i;
  }
  return -1;
}
