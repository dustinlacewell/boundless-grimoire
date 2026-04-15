/**
 * Card rating. Port of XMage's RateCard (whitepaper §3) over CardSnapshot.
 *
 * No per-set CSV ratings in v1 — base score comes purely from rarity
 * fallback. All other constants match the whitepaper.
 */
import type { ColorLetter } from "../filters/types";
import type { CardSnapshot } from "../storage/types";

const SINGLE_PENALTY = [0, 1, 1, 3, 6, 9];
const MULTICOLOR_BONUS = 15;
const OFF_COLOR_PENALTY = -100;
const REMOVAL_BONUS = 40;

const TYPE_MULT = {
  planeswalker: 15,
  creature: 10,
  equipment: 8,
  instant: 7,
  aura: 5,
  default: 6,
} as const;

const RARITY_FALLBACK: Record<string, number> = {
  basic: 1,
  common: 40,
  uncommon: 60,
  rare: 75,
  mythic: 90,
};

const REMOVAL_PATTERNS: RegExp[] = [
  /destroy target (creature|permanent|artifact|enchantment|planeswalker|nonland)/i,
  /exile target (creature|permanent|artifact|enchantment|planeswalker|nonland)/i,
  /target creature gets -\d+\/-\d+/i,
  /deals? \d+ damage to (any target|target creature|target permanent)/i,
  /fight target creature/i,
  /-(\d+)\/-(\d+) to target/i,
  /sacrifices? a creature/i,
];

function isBasicLand(snap: CardSnapshot): boolean {
  const t = (snap.type_line ?? "").toLowerCase();
  return t.includes("basic") && t.includes("land");
}

export function getBaseCardScore(snap: CardSnapshot): number {
  if (isBasicLand(snap)) return RARITY_FALLBACK.basic;
  const r = snap.rarity ?? "common";
  return RARITY_FALLBACK[r] ?? RARITY_FALLBACK.common;
}

export function typeMultiplier(snap: CardSnapshot): number {
  const t = (snap.type_line ?? "").toLowerCase();
  if (t.includes("planeswalker")) return TYPE_MULT.planeswalker;
  if (t.includes("creature")) return TYPE_MULT.creature;
  if (t.includes("equipment")) return TYPE_MULT.equipment;
  if (t.includes("instant")) return TYPE_MULT.instant;
  if (t.includes("aura")) return TYPE_MULT.aura;
  return TYPE_MULT.default;
}

/** Extract colored mana symbols (single-letter WUBRG only) from a mana cost. */
function coloredSymbols(manaCost: string | undefined): ColorLetter[] {
  if (!manaCost) return [];
  const out: ColorLetter[] = [];
  const re = /\{([^}]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(manaCost))) {
    const s = m[1];
    if (s.length === 1 && (s === "W" || s === "U" || s === "B" || s === "R" || s === "G")) {
      out.push(s);
    }
  }
  return out;
}

function manaValue(snap: CardSnapshot): number {
  return typeof snap.cmc === "number" ? snap.cmc : 0;
}

export function getManaCostScore(
  snap: CardSnapshot,
  allowedColors: readonly ColorLetter[],
): number {
  const cost = snap.mana_cost ?? snap.card_faces?.[0]?.mana_cost;
  const symbols = coloredSymbols(cost);
  const mv = manaValue(snap);

  if (allowedColors.length === 0) {
    const colorPenalty = symbols.length;
    return 2 * (mv - colorPenalty + 1);
  }

  if (isBasicLand(snap)) return OFF_COLOR_PENALTY;

  const counts: Partial<Record<ColorLetter, number>> = {};
  let maxSingle = 0;
  for (const s of symbols) {
    if (!allowedColors.includes(s)) return OFF_COLOR_PENALTY;
    counts[s] = (counts[s] ?? 0) + 1;
    if ((counts[s] ?? 0) > maxSingle) maxSingle = counts[s] ?? 0;
  }
  if (maxSingle > 5) maxSingle = 5;
  let rate = 2 * mv + 3 * (10 - SINGLE_PENALTY[maxSingle]);

  const distinct = Object.keys(counts).length;
  if (distinct > 1 && distinct < 5) rate += MULTICOLOR_BONUS;
  return rate;
}

export function isRemoval(snap: CardSnapshot): boolean {
  const t = (snap.type_line ?? "").toLowerCase();
  if (!t.includes("instant") && !t.includes("sorcery") && !t.includes("enchantment")) return false;
  const text = snap.oracle_text ?? snap.card_faces?.map((f) => f.oracle_text ?? "").join("\n") ?? "";
  for (const re of REMOVAL_PATTERNS) {
    if (re.test(text)) return true;
  }
  return false;
}

export function rateCard(
  snap: CardSnapshot,
  allowedColors: readonly ColorLetter[],
): number {
  return (
    getBaseCardScore(snap) +
    2 * typeMultiplier(snap) +
    getManaCostScore(snap, allowedColors) +
    (isRemoval(snap) ? REMOVAL_BONUS : 0)
  );
}
