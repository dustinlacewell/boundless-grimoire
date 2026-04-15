/**
 * Land selection: non-basic dual filter + basic-land balancing.
 * Whitepaper §4.3 steps 4-5.
 */
import type { ColorLetter } from "../filters/types";
import type { ScryfallClient } from "../services/scryfall";
import { toSnapshot } from "../scryfall/snapshot";
import type { CardSnapshot } from "../storage/types";

const BASIC_NAMES: Record<ColorLetter, string> = {
  W: "Plains",
  U: "Island",
  B: "Swamp",
  R: "Mountain",
  G: "Forest",
};

/** Detect mana-producing colors from a snapshot. Prefers `produced_mana`. */
export function landProducesColors(snap: CardSnapshot): ColorLetter[] {
  if (snap.produced_mana && snap.produced_mana.length > 0) {
    return snap.produced_mana.filter((c): c is ColorLetter =>
      c === "W" || c === "U" || c === "B" || c === "R" || c === "G"
    );
  }
  // Fallback: regex over oracle text of the form "Add {W}".
  const text = snap.oracle_text ?? snap.card_faces?.map((f) => f.oracle_text ?? "").join("\n") ?? "";
  const out = new Set<ColorLetter>();
  const re = /Add[^.]*?\{([WUBRG])\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    out.add(m[1] as ColorLetter);
  }
  return [...out];
}

/** Keep only lands that produce ≥2 of the allowed colors. */
export function filterDualLands(
  pool: CardSnapshot[],
  allowed: readonly ColorLetter[],
): CardSnapshot[] {
  return pool.filter((snap) => {
    const produced = landProducesColors(snap);
    const matchCount = produced.filter((c) => allowed.includes(c)).length;
    return matchCount >= 2;
  });
}

/** Count colored mana symbols in a card's mana cost. */
function symbolsInCost(cost: string | undefined): ColorLetter[] {
  if (!cost) return [];
  const out: ColorLetter[] = [];
  const re = /\{([WUBRG])\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cost))) out.push(m[1] as ColorLetter);
  return out;
}

/** Tally desired color demand from spells (non-land cards). */
export function colorDemand(
  spells: { snapshot: CardSnapshot; count: number }[],
  allowed: readonly ColorLetter[],
): Record<ColorLetter, number> {
  const out: Record<ColorLetter, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const { snapshot, count } of spells) {
    const t = (snapshot.type_line ?? "").toLowerCase();
    if (t.includes("land")) continue;
    const cost = snapshot.mana_cost ?? snapshot.card_faces?.[0]?.mana_cost;
    for (const s of symbolsInCost(cost)) {
      if (allowed.includes(s)) out[s] += count;
    }
  }
  return out;
}

/** Tally current color sources from already-picked lands. */
export function colorSources(
  lands: { snapshot: CardSnapshot; count: number }[],
  allowed: readonly ColorLetter[],
): Record<ColorLetter, number> {
  const out: Record<ColorLetter, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const { snapshot, count } of lands) {
    for (const c of landProducesColors(snapshot)) {
      if (allowed.includes(c)) out[c] += count;
    }
  }
  return out;
}

/**
 * Iteratively pick basic lands by argmax of (neededPct - currentPct).
 * Returns an ordered list of color choices to add as basics.
 */
export function pickBasicColors(
  demand: Record<ColorLetter, number>,
  initialSources: Record<ColorLetter, number>,
  count: number,
  allowed: readonly ColorLetter[],
): ColorLetter[] {
  const sources = { ...initialSources };
  const demandTotal = Object.values(demand).reduce((a, b) => a + b, 0);
  if (demandTotal === 0) {
    // Even split fallback
    const out: ColorLetter[] = [];
    let i = 0;
    while (out.length < count) {
      out.push(allowed[i % allowed.length]);
      i++;
    }
    return out;
  }
  const needPct: Record<ColorLetter, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const c of allowed) needPct[c] = (demand[c] / demandTotal) * 100;

  const out: ColorLetter[] = [];
  for (let i = 0; i < count; i++) {
    const total = Object.values(sources).reduce((a, b) => a + b, 0) + i;
    let bestColor: ColorLetter | null = null;
    let bestDelta = -Infinity;
    for (const c of allowed) {
      if (needPct[c] <= 0) continue;
      const cur = total > 0 ? (sources[c] / total) * 100 : 0;
      const delta = needPct[c] - cur;
      if (delta > bestDelta) {
        bestDelta = delta;
        bestColor = c;
      }
    }
    const pick = bestColor ?? allowed[0];
    out.push(pick);
    sources[pick] += 1;
  }
  return out;
}

/** Fetch the five basic-land snapshots once. */
export async function fetchBasics(
  scryfall: ScryfallClient,
  signal: AbortSignal,
): Promise<Record<ColorLetter, CardSnapshot>> {
  const cards = await scryfall.getCardsByIds(
    (Object.values(BASIC_NAMES) as string[]).map((name) => ({ name })),
    { signal },
  );
  const byName = new Map<string, CardSnapshot>();
  for (const c of cards) byName.set(c.name, toSnapshot(c));
  const out = {} as Record<ColorLetter, CardSnapshot>;
  for (const [color, name] of Object.entries(BASIC_NAMES) as [ColorLetter, string][]) {
    const snap = byName.get(name);
    if (snap) out[color] = snap;
  }
  return out;
}
