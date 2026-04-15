/**
 * Top-level orchestrator. Builds a `GeneratedDeck` from a GeneratorInput
 * by fetching pools, scoring + bucket-filling spells, then balancing
 * lands. Honors AbortSignal across all phases.
 */
import type { ColorLetter } from "../filters/types";
import type { Services } from "../services";
import type { CardSnapshot } from "../storage/types";
import { bucketIndexForCmc, resolveBuckets, type ResolvedBucket } from "./buckets";
import {
  colorDemand,
  colorSources,
  fetchBasics,
  filterDualLands,
  pickBasicColors,
} from "./lands";
import { fetchPool } from "./pool";
import { rateCard } from "./rateCard";
import {
  WUBRG,
  type GeneratedDeck,
  type GeneratedDeckCard,
  type GeneratorInput,
  type GenProgress,
} from "./types";

const MAX_TRIES = 8196;
const POOL_PAGES = 3;
const LAND_POOL_PAGES = 1;

interface PickedMap {
  [id: string]: GeneratedDeckCard;
}

function copyLimit(snap: CardSnapshot, singleton: boolean): number {
  const t = (snap.type_line ?? "").toLowerCase();
  if (t.includes("basic") && t.includes("land")) return 999;
  return singleton ? 1 : 4;
}

function addCard(map: PickedMap, snap: CardSnapshot, n = 1): void {
  const cur = map[snap.id];
  if (cur) cur.count += n;
  else map[snap.id] = { snapshot: snap, count: n };
}

function totalCount(map: PickedMap): number {
  let n = 0;
  for (const k in map) n += map[k].count;
  return n;
}

function pickRandomColors(count: number): ColorLetter[] {
  const pool = [...WUBRG];
  // Fisher-Yates partial shuffle
  for (let i = 0; i < count && i < pool.length; i++) {
    const j = i + Math.floor(Math.random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

function colorsToLetters(colors: ColorLetter[]): string {
  // Scryfall accepts letters in any case for c<= queries.
  return colors.map((c) => c.toLowerCase()).join("");
}

function colorLabel(colors: ColorLetter[]): string {
  if (colors.length === 0) return "C";
  return colors.join("");
}

function defaultDeckName(formatName: string, colors: ColorLetter[]): string {
  return `Generated · ${formatName} · ${colorLabel(colors)}`;
}

async function buildSpellPool(
  services: Services,
  formatFragment: string,
  colors: ColorLetter[],
  kind: "creature" | "noncreature",
  signal: AbortSignal,
  onPage: (n: number) => void,
): Promise<CardSnapshot[]> {
  const colorClause = `id<=${colorsToLetters(colors)}`;
  const typeClause = kind === "creature" ? "t:creature -t:land" : "-t:creature -t:land";
  const query = `${formatFragment} ${colorClause} ${typeClause}`.trim();
  return fetchPool(services.scryfall, {
    query,
    signal,
    maxPages: POOL_PAGES,
    onPage,
  });
}

async function buildLandPool(
  services: Services,
  formatFragment: string,
  colors: ColorLetter[],
  signal: AbortSignal,
  onPage: (n: number) => void,
): Promise<CardSnapshot[]> {
  const colorClause = `id<=${colorsToLetters(colors)}`;
  const query = `${formatFragment} ${colorClause} t:land -t:basic produces>=2`.trim();
  return fetchPool(services.scryfall, {
    query,
    signal,
    maxPages: LAND_POOL_PAGES,
    onPage,
  });
}

async function buildCommanderPool(
  services: Services,
  colors: ColorLetter[],
  signal: AbortSignal,
  onPage: (n: number) => void,
): Promise<CardSnapshot[]> {
  const colorClause = `id<=${colorsToLetters(colors)}`;
  const query = `f:commander t:legendary t:creature ${colorClause}`.trim();
  return fetchPool(services.scryfall, {
    query,
    signal,
    maxPages: 1,
    onPage,
  });
}

/** Fill buckets greedily from a pre-scored, sorted pool. */
function fillBuckets(
  pool: CardSnapshot[],
  buckets: ResolvedBucket[],
  picked: PickedMap,
  reserve: PickedMap,
  singleton: boolean,
  totalNeeded: number,
): void {
  // Pool is already sorted by score desc.
  let tries = 0;
  let pickedCount = 0;
  for (let i = 0; i < buckets.length; i++) pickedCount += 0;

  for (const card of pool) {
    if (tries++ > MAX_TRIES) break;
    if (totalSpellsAdded(picked) >= totalNeeded) break;
    const cmc = typeof card.cmc === "number" ? card.cmc : 0;
    const idx = bucketIndexForCmc(buckets, cmc);
    const limit = copyLimit(card, singleton);
    const cur = picked[card.id]?.count ?? 0;
    if (cur >= limit) continue;
    if (idx >= 0 && buckets[idx].amount > 0) {
      addCard(picked, card, 1);
      buckets[idx].amount -= 1;
    } else if (cmc < 7 && totalCount(reserve) < totalNeeded) {
      // Stash for backfill
      if ((reserve[card.id]?.count ?? 0) < limit) addCard(reserve, card, 1);
    }
  }

  // Backfill from reserve
  if (totalSpellsAdded(picked) < totalNeeded) {
    const reserveList = Object.values(reserve);
    for (const r of reserveList) {
      if (totalSpellsAdded(picked) >= totalNeeded) break;
      const limit = copyLimit(r.snapshot, singleton);
      const cur = picked[r.snapshot.id]?.count ?? 0;
      const room = limit - cur;
      if (room <= 0) continue;
      const need = totalNeeded - totalSpellsAdded(picked);
      addCard(picked, r.snapshot, Math.min(room, need));
    }
  }
}

function totalSpellsAdded(map: PickedMap): number {
  return totalCount(map);
}

export async function generateDeck(
  input: GeneratorInput,
  services: Services,
  signal: AbortSignal,
  onProgress: (p: GenProgress) => void,
  formatFragment: string,
  formatName: string,
): Promise<GeneratedDeck> {
  // 1. Resolve colors
  const effectiveColors: ColorLetter[] = input.colors.length > 0
    ? [...input.colors]
    : pickRandomColors(input.colorCount);
  const singleton = input.commander || input.singleton;

  // 2. Targets
  const totalSize = input.size;
  const landCount = Math.round((input.landPct / 100) * totalSize);
  const spellCount = totalSize - landCount;
  const creatureTarget = Math.round((input.creaturePct / (input.creaturePct + input.nonCreaturePct || 1)) * spellCount);
  const nonCreatureTarget = spellCount - creatureTarget;

  // 3. Commander (if applicable) — fetch + pick legal commander first
  let commander: CardSnapshot | undefined;
  if (input.commander) {
    onProgress({ phase: { kind: "pool-commander", fetched: 0 } });
    const commanderPool = await buildCommanderPool(services, effectiveColors, signal, (n) =>
      onProgress({ phase: { kind: "pool-commander", fetched: n } }),
    );
    if (commanderPool.length === 0) {
      throw new Error("No legendary creature fits the chosen colors in this format.");
    }
    // Score by rateCard with allowed colors and pick one of the top 10 at random.
    const scored = commanderPool
      .map((s) => ({ s, score: rateCard(s, effectiveColors) }))
      .sort((a, b) => b.score - a.score);
    const topN = scored.slice(0, Math.min(10, scored.length));
    commander = topN[Math.floor(Math.random() * topN.length)].s;
  }

  // 4. Build creature + non-creature pools
  onProgress({ phase: { kind: "pool-creatures", fetched: 0 } });
  const creaturePoolRaw = await buildSpellPool(services, formatFragment, effectiveColors, "creature", signal, (n) =>
    onProgress({ phase: { kind: "pool-creatures", fetched: n } }),
  );
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");

  onProgress({ phase: { kind: "pool-noncreatures", fetched: 0 } });
  const noncreaturePoolRaw = await buildSpellPool(services, formatFragment, effectiveColors, "noncreature", signal, (n) =>
    onProgress({ phase: { kind: "pool-noncreatures", fetched: n } }),
  );
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");

  if (creaturePoolRaw.length === 0 && noncreaturePoolRaw.length === 0) {
    throw new Error("No cards fit the chosen format and colors. Try a broader selection.");
  }

  // 5. Score and sort pools
  const creaturePool = [...creaturePoolRaw]
    .map((s) => ({ s, score: rateCard(s, effectiveColors) }))
    .sort((a, b) => b.score - a.score)
    .filter((x) => x.score > -50)
    .map((x) => x.s);
  const noncreaturePool = [...noncreaturePoolRaw]
    .map((s) => ({ s, score: rateCard(s, effectiveColors) }))
    .sort((a, b) => b.score - a.score)
    .filter((x) => x.score > -50)
    .map((x) => x.s);

  // 6. Bucket-fill spells
  const picked: PickedMap = {};
  // Reserve commander out of mainboard slots (already in commander field).
  const creatureBuckets = resolveBuckets(input.curve, totalSize, creatureTarget);
  const noncreatureBuckets = resolveBuckets(input.curve, totalSize, nonCreatureTarget);
  const reserveCreatures: PickedMap = {};
  const reserveNonCreatures: PickedMap = {};

  onProgress({ phase: { kind: "picking", spellsPicked: 0, spellsTarget: spellCount } });
  fillBuckets(creaturePool, creatureBuckets, picked, reserveCreatures, singleton, creatureTarget);
  onProgress({ phase: { kind: "picking", spellsPicked: totalCount(picked), spellsTarget: spellCount } });
  fillBuckets(noncreaturePool, noncreatureBuckets, picked, reserveNonCreatures, singleton, creatureTarget + nonCreatureTarget);
  onProgress({ phase: { kind: "picking", spellsPicked: totalCount(picked), spellsTarget: spellCount } });

  // 7. Lands
  onProgress({ phase: { kind: "lands", landsPicked: 0, landsTarget: landCount } });
  const landMap: PickedMap = {};
  const isMulticolor = effectiveColors.length >= 2;

  // Non-basic dual lands (half of land count, rounded down)
  if (isMulticolor && landCount > 0) {
    const dualTarget = Math.floor(landCount / 2);
    if (dualTarget > 0) {
      const landPoolRaw = await buildLandPool(services, formatFragment, effectiveColors, signal, (n) =>
        onProgress({ phase: { kind: "pool-lands", fetched: n } }),
      );
      const dualPool = filterDualLands(landPoolRaw, effectiveColors)
        .map((s) => ({ s, score: rateCard(s, effectiveColors) }))
        .sort((a, b) => b.score - a.score)
        .map((x) => x.s);
      let added = 0;
      for (const land of dualPool) {
        if (added >= dualTarget) break;
        const limit = copyLimit(land, singleton);
        const cur = landMap[land.id]?.count ?? 0;
        if (cur >= limit) continue;
        addCard(landMap, land, 1);
        added += 1;
      }
    }
  }

  // Basic lands
  const basics = await fetchBasics(services.scryfall, signal);
  const spellsList = Object.values(picked);
  const demand = colorDemand(spellsList, effectiveColors);
  const sources = colorSources(Object.values(landMap), effectiveColors);
  const basicsNeeded = landCount - Object.values(landMap).reduce((a, b) => a + b.count, 0);
  if (basicsNeeded > 0) {
    const colorPicks = pickBasicColors(demand, sources, basicsNeeded, effectiveColors);
    for (const c of colorPicks) {
      const snap = basics[c];
      if (!snap) continue;
      addCard(landMap, snap, 1);
    }
  }
  onProgress({ phase: { kind: "lands", landsPicked: Object.values(landMap).reduce((a, b) => a + b.count, 0), landsTarget: landCount } });

  // 8. Compose
  const allCards = [...Object.values(picked), ...Object.values(landMap)];
  const name = defaultDeckName(formatName, effectiveColors);
  return { name, commander, cards: allCards };
}
