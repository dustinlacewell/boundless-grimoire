/**
 * Pure classifier: given a fully (or partially) populated match cache,
 * a priority-ordered list of meta queries, and a set of oracle_ids,
 * decide each oracle_id's state:
 *
 *   - "assigned": we know a first-match query for it.
 *   - "other":    we've walked every query and confirmed no match.
 *   - "unresolved": we hit an unknown cache entry before we could
 *                   either assign it or conclude it matches nothing.
 *
 * The orchestrator uses the "unresolved" outputs to schedule Scryfall
 * fetches. Re-running classify after those fetches either fully
 * resolves each oracle_id or surfaces the next blocker.
 */
import type { MatchCache } from "./matchCache";
import { verdict } from "./matchCache";

export interface MetaQuery {
  /** Stable per-render id used by the UI (index in the custom query list). */
  id: string;
  name: string;
  fragment: string;
}

export const META_OTHER = "__other__";

interface OracleResult {
  oracleId: string;
  state: "assigned" | "other" | "unresolved";
  /** Query id when state === "assigned". */
  queryId?: string;
  /** Fragment we need an answer for when state === "unresolved". */
  blockedOn?: string;
}

/** Classify a single oracle_id. Walks queries in priority order. */
function classifyOne(
  cache: MatchCache,
  queries: readonly MetaQuery[],
  oracleId: string,
): OracleResult {
  for (const q of queries) {
    const v = verdict(cache, q.fragment, oracleId);
    if (v === "positive") return { oracleId, state: "assigned", queryId: q.id };
    if (v === "negative") continue;
    return { oracleId, state: "unresolved", blockedOn: q.fragment };
  }
  return { oracleId, state: "other" };
}

export interface Classification {
  /** oracle_id → query id for fully-resolved cards (plus META_OTHER). */
  assignments: Record<string, string>;
  /**
   * Fragments that need Scryfall queries, each paired with the list
   * of oracle_ids that are blocked on it.
   */
  blockedByFragment: Map<string, string[]>;
}

export function classify(
  cache: MatchCache,
  queries: readonly MetaQuery[],
  oracleIds: readonly string[],
): Classification {
  const assignments: Record<string, string> = {};
  const blockedByFragment = new Map<string, string[]>();

  for (const oid of oracleIds) {
    const r = classifyOne(cache, queries, oid);
    if (r.state === "assigned") {
      assignments[oid] = r.queryId!;
    } else if (r.state === "other") {
      assignments[oid] = META_OTHER;
    } else {
      const frag = r.blockedOn!;
      const arr = blockedByFragment.get(frag) ?? [];
      arr.push(oid);
      blockedByFragment.set(frag, arr);
    }
  }
  return { assignments, blockedByFragment };
}
