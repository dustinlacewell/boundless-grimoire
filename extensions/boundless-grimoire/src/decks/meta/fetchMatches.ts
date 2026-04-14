/**
 * Ask Scryfall: of these oracle_ids, which match the given query
 * fragment? Batches 15 at a time to fit under URL length limits and
 * walks pagination. Returns the subset of the input that matched.
 *
 * Errors are logged, not thrown — a 404 just means nothing in the
 * batch matched. The calling orchestrator treats un-returned oracle_ids
 * as negative, which is correct: if Scryfall didn't return it for the
 * combined `(fragment) (oracleid:X)` query, it doesn't match.
 */
import { searchCards, ScryfallError } from "../../scryfall/client";

const BATCH_SIZE = 15;

export async function fetchMatches(
  fragment: string,
  oracleIds: readonly string[],
): Promise<string[]> {
  const matches: string[] = [];
  for (let i = 0; i < oracleIds.length; i += BATCH_SIZE) {
    const batch = oracleIds.slice(i, i + BATCH_SIZE);
    const oracleClause = batch.map((oid) => `oracleid:${oid}`).join(" OR ");
    const query = `(${fragment}) (${oracleClause})`;
    try {
      let page = 1;
      while (true) {
        const res = await searchCards(query, { page, unique: "cards" });
        for (const card of res.data) {
          if (card.oracle_id) matches.push(card.oracle_id);
        }
        if (!res.has_more) break;
        page++;
      }
    } catch (e) {
      if (e instanceof ScryfallError && e.status === 404) continue;
      console.warn(`[meta-groups] fetch failed for "${fragment}"`, e);
    }
  }
  return matches;
}
