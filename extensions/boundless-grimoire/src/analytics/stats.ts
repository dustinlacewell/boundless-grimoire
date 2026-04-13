/**
 * Pure functions that derive deck analytics from card data.
 * Each stat function takes a card map and returns a computed value.
 */
import { categoryFor } from "../cards/categorize";
import type { CardSnapshot, DeckCard } from "../storage/types";

type CardMap = Record<string, DeckCard>;

const MAX_BUCKET = 7;

function isLand(typeLine: string | undefined): boolean {
  return (typeLine ?? "").toLowerCase().includes("land");
}

/** Compute mana value distribution, excluding lands. */
export function computeManaCurve(cards: CardMap): Distribution {
  const buckets = new Array<number>(MAX_BUCKET + 1).fill(0);
  let totalMV = 0;
  let total = 0;

  for (const { snapshot, count } of Object.values(cards)) {
    if (isLand(snapshot.type_line)) continue;
    const mv = Math.min(snapshot.cmc ?? 0, MAX_BUCKET);
    buckets[mv] += count;
    totalMV += (snapshot.cmc ?? 0) * count;
    total += count;
  }

  const labels = buckets.map((_, i) => (i === MAX_BUCKET ? `${MAX_BUCKET}+` : String(i)));

  return { buckets, labels, average: total > 0 ? totalMV / total : 0, total };
}

// ---------------------------------------------------------------------------
// Distribution — shared shape for mana curve, power, toughness
// ---------------------------------------------------------------------------

export interface Distribution {
  /** Bucket counts: index = stat value, last index = "N+" overflow. */
  buckets: number[];
  /** Labels for each bucket. */
  labels: string[];
  /** Weighted average across counted cards. */
  average: number;
  /** Total cards counted (cards that had a valid value). */
  total: number;
}

/** Parse a power/toughness string to a number, or null if non-numeric (e.g. "*"). */
function parseStatValue(val: string | undefined): number | null {
  if (val == null) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function isCreature(typeLine: string | undefined): boolean {
  return (typeLine ?? "").toLowerCase().includes("creature");
}

/** Compute power distribution across creatures. */
export function computePowerCurve(cards: CardMap): Distribution {
  return computeStatCurve(cards, (s) => parseStatValue(s.power));
}

/** Compute toughness distribution across creatures. */
export function computeToughnessCurve(cards: CardMap): Distribution {
  return computeStatCurve(cards, (s) => parseStatValue(s.toughness));
}

const STAT_MAX_BUCKET = 7;

function computeStatCurve(
  cards: CardMap,
  extract: (snapshot: CardSnapshot) => number | null,
): Distribution {
  const buckets = new Array<number>(STAT_MAX_BUCKET + 1).fill(0);
  let totalValue = 0;
  let total = 0;

  for (const { snapshot, count } of Object.values(cards)) {
    if (!isCreature(snapshot.type_line)) continue;
    const val = extract(snapshot);
    if (val == null) continue;
    const bucket = Math.min(Math.max(val, 0), STAT_MAX_BUCKET);
    buckets[bucket] += count;
    totalValue += val * count;
    total += count;
  }

  const labels = buckets.map((_, i) => (i === STAT_MAX_BUCKET ? `${STAT_MAX_BUCKET}+` : String(i)));

  return { buckets, labels, average: total > 0 ? totalValue / total : 0, total };
}

// ---------------------------------------------------------------------------
// Count-by grouping
// ---------------------------------------------------------------------------

export type CountByMode = "type" | "subtype";

export interface CountByEntry {
  label: string;
  count: number;
}

/** Extract subtypes from a type line (everything after the em-dash). */
function parseSubtypes(typeLine: string | undefined): string[] {
  const raw = typeLine ?? "";
  const dashIdx = raw.indexOf("—");
  if (dashIdx === -1) return [];
  return raw
    .slice(dashIdx + 1)
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Rarity breakdown
// ---------------------------------------------------------------------------

const RARITY_ORDER = ["common", "uncommon", "rare", "mythic"] as const;
export type Rarity = (typeof RARITY_ORDER)[number];

export interface RarityEntry {
  rarity: Rarity;
  count: number;
}

/** Count cards by rarity, in fixed common→mythic order. */
export function computeRarityBreakdown(cards: CardMap): RarityEntry[] {
  const counts = new Map<Rarity, number>();
  for (const r of RARITY_ORDER) counts.set(r, 0);

  for (const { snapshot, count } of Object.values(cards)) {
    const r = snapshot.rarity as Rarity | undefined;
    if (r && counts.has(r)) {
      counts.set(r, counts.get(r)! + count);
    }
  }

  return RARITY_ORDER.map((rarity) => ({ rarity, count: counts.get(rarity)! }));
}

// ---------------------------------------------------------------------------
// Curve by type (creature vs non-creature)
// ---------------------------------------------------------------------------

export interface StackedManaCurve {
  /** Mana value labels (0..7+). */
  labels: string[];
  /** Creature counts per bucket. */
  creatures: number[];
  /** Non-creature counts per bucket. */
  nonCreatures: number[];
}

/** Mana curve split into creatures and non-creatures, excluding lands. */
export function computeCurveByType(cards: CardMap): StackedManaCurve {
  const creatures = new Array<number>(MAX_BUCKET + 1).fill(0);
  const nonCreatures = new Array<number>(MAX_BUCKET + 1).fill(0);

  for (const { snapshot, count } of Object.values(cards)) {
    if (isLand(snapshot.type_line)) continue;
    const mv = Math.min(snapshot.cmc ?? 0, MAX_BUCKET);
    if (isCreature(snapshot.type_line)) {
      creatures[mv] += count;
    } else {
      nonCreatures[mv] += count;
    }
  }

  const labels = creatures.map((_, i) => (i === MAX_BUCKET ? `${MAX_BUCKET}+` : String(i)));
  return { labels, creatures, nonCreatures };
}

// ---------------------------------------------------------------------------
// Count-by grouping
// ---------------------------------------------------------------------------

/** Count cards grouped by the chosen mode, sorted descending by count. */
export function computeCountBy(cards: CardMap, mode: CountByMode): CountByEntry[] {
  const counts = new Map<string, number>();

  for (const { snapshot, count } of Object.values(cards)) {
    if (mode === "type") {
      const label = categoryFor(snapshot.type_line);
      counts.set(label, (counts.get(label) ?? 0) + count);
    } else {
      const subs = parseSubtypes(snapshot.type_line);
      if (subs.length === 0) {
        counts.set("(none)", (counts.get("(none)") ?? 0) + count);
      } else {
        for (const sub of subs) {
          counts.set(sub, (counts.get(sub) ?? 0) + count);
        }
      }
    }
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}
