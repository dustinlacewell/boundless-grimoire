import { z } from "zod";
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { CommandDef } from "@ldlework/workmark/types";
import { ok, fail } from "@ldlework/workmark/helpers";

const SCRYFALL_API = "https://api.scryfall.com";
const RATE_MS = 150; // Scryfall asks for 50-100ms between requests; pad generously

/** Set types worth indexing for deckbuilding. */
const ALLOWED_SET_TYPES = new Set([
  "expansion",
  "core",
  "masters",
  "draft_innovation",
  "commander",
  "eternal",
  "masterpiece",
]);

interface ScryfallSet {
  code: string;
  name: string;
  set_type: string;
  digital?: boolean;
}

interface MetaTag {
  id: string;
  label: string;
  otags: string[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Build the otag: OR clause for a meta-tag. */
function otagQuery(meta: MetaTag): string {
  if (meta.otags.length === 1) return `otag:${meta.otags[0]}`;
  return `(${meta.otags.map((t) => `otag:${t}`).join(" OR ")})`;
}

/** Check if a set has any cards matching a meta-tag query. Returns true/false. */
async function setHasMetaTag(setCode: string, metaQuery: string): Promise<boolean> {
  const q = `s:${setCode} ${metaQuery}`;
  const url = `${SCRYFALL_API}/cards/search?q=${encodeURIComponent(q)}&page=1`;
  for (let attempt = 0; attempt < 6; attempt++) {
    if (attempt > 0) await sleep(2000 * attempt);
    const res = await fetch(url);
    if (res.status === 404) return false;
    if (res.status === 429) {
      console.log(`  rate limited, backing off ${2 * (attempt + 1)}s...`);
      continue;
    }
    if (!res.ok) continue;
    return true;
  }
  throw new Error(`Scryfall still failing after retries for s:${setCode}`);
}

export default {
  name: "tagger_build_set_index",
  label: "Build set×meta-tag index",
  description:
    "Query Scryfall for each set × meta-tag combo and write the index to the extension source.",
  flags: {
    resume: z
      .boolean()
      .optional()
      .describe("Resume from cached progress file if available"),
  },
  handler: async (args) => {
    try {
      // Load meta-tags from the extension source (import as text, parse)
      const metaTagsPath = join(
        import.meta.dirname!,
        "..",
        "..",
        "..",
        "extensions",
        "boundless-grimoire",
        "src",
        "filters",
        "oracleTags.ts",
      );
      // Dynamic import won't work for .ts, so we'll define them inline
      // by reading the JSON cache that dump-tags produces.
      const META_TAGS: MetaTag[] = await loadMetaTags(metaTagsPath);

      // Fetch set list from Scryfall
      const setsRes = await fetch(`${SCRYFALL_API}/sets`);
      if (!setsRes.ok) return fail(`Failed to fetch sets: ${setsRes.status}`);
      const allSets: ScryfallSet[] = (await setsRes.json() as { data: ScryfallSet[] }).data;
      const now = new Date().toISOString().slice(0, 10);
      const sets = allSets.filter(
        (s) =>
          ALLOWED_SET_TYPES.has(s.set_type) &&
          !s.digital &&
          (s as Record<string, unknown>).released_at !== undefined &&
          ((s as Record<string, unknown>).released_at as string) <= now,
      );

      console.log(`${sets.length} sets × ${META_TAGS.length} meta-tags = ${sets.length * META_TAGS.length} queries`);

      // Pre-build the otag query string for each meta-tag
      const metaQueries = META_TAGS.map((m) => ({ id: m.id, query: otagQuery(m) }));

      // Load progress cache if resuming
      const progressPath = join(import.meta.dirname!, "..", "..", "cache", "set-index-progress.json");
      let index: Record<string, string[]> = {};
      let done = new Set<string>();
      if (args.resume) {
        try {
          const saved = JSON.parse(readFileSync(progressPath, "utf-8"));
          index = saved.index ?? {};
          done = new Set(saved.done ?? []);
          console.log(`Resuming: ${done.size} sets already done`);
        } catch { /* no progress file */ }
      }

      let queryCount = 0;
      for (const [si, set] of sets.entries()) {
        if (done.has(set.code)) continue;
        const metaIds: string[] = [];

        for (const mq of metaQueries) {
          await sleep(RATE_MS);
          const has = await setHasMetaTag(set.code, mq.query);
          if (has) metaIds.push(mq.id);
          queryCount++;
        }

        if (metaIds.length > 0) {
          index[set.code] = metaIds;
        }
        done.add(set.code);

        // Save progress every 5 sets
        if (done.size % 5 === 0) {
          writeFileSync(progressPath, JSON.stringify({ index, done: [...done] }));
        }

        const pct = ((si + 1) / sets.length * 100).toFixed(1);
        console.log(
          `[${pct}%] ${set.code} (${set.name}): ${metaIds.length}/${META_TAGS.length} roles — ${queryCount} queries total`,
        );
      }

      // Write final progress
      writeFileSync(progressPath, JSON.stringify({ index, done: [...done] }));

      // Write the TypeScript index file
      const indexPath = join(
        import.meta.dirname!,
        "..",
        "..",
        "..",
        "extensions",
        "boundless-grimoire",
        "src",
        "filters",
        "setMetaTagIndex.ts",
      );
      const tsContent = [
        "/**",
        " * Set \u2192 meta-tag index: which meta-tags have cards in which sets.",
        " *",
        " * Keys are lowercase set codes, values are arrays of meta-tag IDs.",
        ` * Generated by: npx ws tagger_build_set_index`,
        ` * Last updated: ${new Date().toISOString()}`,
        " */",
        `export const SET_META_TAG_INDEX: Record<string, string[]> = ${JSON.stringify(index, null, 2)};`,
        "",
      ].join("\n");
      writeFileSync(indexPath, tsContent);

      return ok(
        [
          `Done! ${queryCount} Scryfall queries across ${sets.length} sets`,
          `${Object.keys(index).length} sets have at least one meta-tag`,
          `Written to ${indexPath}`,
        ].join("\n"),
      );
    } catch (e) {
      return fail(e);
    }
  },
} satisfies CommandDef;

/** Parse meta-tags from the TypeScript source file. */
function loadMetaTags(path: string): MetaTag[] {
  const src = readFileSync(path, "utf-8");
  // Extract the array between META_TAGS: MetaTag[] = [ ... ];
  const match = src.match(/META_TAGS:\s*MetaTag\[\]\s*=\s*(\[[\s\S]*?\n\];)/);
  if (!match) throw new Error("Could not parse META_TAGS from " + path);
  // Convert to valid JSON by replacing single quotes, removing trailing commas
  let json = match[1]
    .replace(/\/\/.*$/gm, "")           // strip comments
    .replace(/(\w+):/g, '"$1":')        // quote keys
    .replace(/,(\s*[}\]])/g, "$1")      // remove trailing commas
    .replace(/;$/, "");                  // remove trailing semicolon
  return JSON.parse(json) as MetaTag[];
}
