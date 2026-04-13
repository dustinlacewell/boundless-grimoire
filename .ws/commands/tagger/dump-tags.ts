import { z } from "zod";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { CommandDef } from "@ldlework/workmark/types";
import { ok, fail } from "@ldlework/workmark/helpers";

const GRAPHQL_URL = "https://tagger.scryfall.com/graphql";
const PER_PAGE = 100; // tagger default

interface TagResult {
  name: string;
  slug: string;
  taggingCount: number;
}

interface TagsResponse {
  data: {
    tags: {
      total: number;
      page: number;
      perPage: number;
      results: TagResult[];
    };
  };
  errors?: Array<{ message: string }>;
}

/** Fetch a CSRF token + session cookie from the tagger homepage. */
async function getSession(): Promise<{ csrf: string; cookie: string }> {
  const res = await fetch("https://tagger.scryfall.com/", {
    headers: { Accept: "text/html" },
  });
  if (!res.ok) throw new Error(`Failed to load tagger: ${res.status}`);

  const html = await res.text();
  const match = html.match(/csrf-token.*?content="([^"]+)"/);
  if (!match) throw new Error("Could not find CSRF token in tagger HTML");

  const cookies = res.headers.getSetCookie?.() ?? [];
  const cookie = cookies.map((c) => c.split(";")[0]).join("; ");

  return { csrf: match[1], cookie };
}

/** Fetch one page of oracle card tags. */
async function fetchTagPage(
  page: number,
  csrf: string,
  cookie: string,
): Promise<TagsResponse["data"]["tags"]> {
  const query = `{
    tags(input: { type: ORACLE_CARD_TAG, page: ${page} }) {
      total page perPage
      results { name slug taggingCount }
    }
  }`;

  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrf,
      Cookie: cookie,
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) throw new Error(`GraphQL request failed: ${res.status}`);
  const json = (await res.json()) as TagsResponse;
  if (json.errors?.length) {
    throw new Error(`GraphQL errors: ${json.errors.map((e) => e.message).join(", ")}`);
  }
  return json.data.tags;
}

export default {
  name: "tagger_dump_tags",
  label: "Dump tagger oracle tags",
  description:
    "Fetch all oracle card tags from tagger.scryfall.com and write a sorted frequency list to .ws/cache/oracle-tags.json",
  flags: {
    minCount: z
      .number()
      .optional()
      .default(10)
      .describe("Minimum tagging count to include (default: 10)"),
  },
  handler: async (args) => {
    try {
      const { csrf, cookie } = await getSession();

      // Fetch first page to learn total
      const first = await fetchTagPage(1, csrf, cookie);
      const totalPages = Math.ceil(first.total / first.perPage);
      const allTags: TagResult[] = [...first.results];

      // Fetch remaining pages
      for (let page = 2; page <= totalPages; page++) {
        const data = await fetchTagPage(page, csrf, cookie);
        allTags.push(...data.results);
      }

      // Sort by count descending
      allTags.sort((a, b) => b.taggingCount - a.taggingCount);

      // Filter by minimum count
      const minCount = args.minCount ?? 10;
      const filtered = allTags.filter((t) => t.taggingCount >= minCount);

      // Write cache file
      const cacheDir = join(import.meta.dirname!, "..", "..", "cache");
      mkdirSync(cacheDir, { recursive: true });
      const outPath = join(cacheDir, "oracle-tags.json");
      writeFileSync(
        outPath,
        JSON.stringify({ fetchedAt: new Date().toISOString(), total: allTags.length, minCount, tags: filtered }, null, 2),
      );

      return ok(
        [
          `Fetched ${allTags.length} oracle tags across ${totalPages} pages`,
          `Wrote ${filtered.length} tags (>= ${minCount} taggings) to ${outPath}`,
          `Top 20:`,
          ...filtered.slice(0, 20).map((t) => `  ${t.taggingCount}\t${t.slug}`),
        ].join("\n"),
      );
    } catch (e) {
      return fail(e);
    }
  },
} satisfies CommandDef;
