/**
 * Pure FilterState → Scryfall query-string compiler.
 *
 * Conventions (per spec):
 *   - Within each filter group, multiple selections combine as OR.
 *   - Across groups, AND (Scryfall's default for adjacent terms).
 *   - Colors honor the chosen ColorMode (id<= / c<= / c=).
 *   - The colorless toggle is emitted as an explicit `c=c` / `id=c`
 *     clause OR-combined with the colors clause — appending `c` to the
 *     letter set is unreliable (Scryfall does not consistently treat
 *     `id<=wc` as "wu OR colorless").
 *   - Sort field/direction are NOT in the query string — they go to
 *     the searchCards `order=` / `dir=` URL params at the call site.
 */
import { useCustomQueryStore } from "./customQueryStore";
import type { ColorMode, FilterState } from "./types";

function colorOp(mode: ColorMode): string {
  switch (mode) {
    case "identity-subset":
      return "id<=";
    case "colors-subset":
      return "c<=";
    case "colors-exact":
      return "c=";
  }
}

/** Pure colorless clause for the given mode. */
function colorlessClause(mode: ColorMode): string {
  return mode === "identity-subset" ? "id=c" : "c=c";
}

/**
 * Build the color clause from the filter state, or null if neither
 * colors nor colorless are selected.
 *
 * Cases:
 *   - colors only         → "<op><letters>"
 *   - colorless only      → "id=c" or "c=c"
 *   - colors + colorless  → "(<op><letters> OR <colorless>)"
 */
function buildColorClause(state: FilterState): string | null {
  const hasColors = state.colors.length > 0;
  if (!hasColors && !state.colorless) return null;

  const op = colorOp(state.colorMode);
  const colorless = colorlessClause(state.colorMode);
  const letters = state.colors.map((c) => c.toLowerCase()).join("");
  const colorsClause = `${op}${letters}`;

  if (!hasColors) return colorless;
  if (!state.colorless) return colorsClause;
  return `(${colorsClause} OR ${colorless})`;
}

function orGroup(prefix: string, values: readonly string[]): string {
  if (values.length === 0) return "";
  if (values.length === 1) return `${prefix}${values[0]}`;
  return `(${values.map((v) => `${prefix}${v}`).join(" OR ")})`;
}

export function buildScryfallQuery(state: FilterState): string {
  const parts: string[] = [];

  // Free text — wrap in parens so any OR/AND inside doesn't leak into the
  // top-level query and clobber other AND'd clauses.
  const text = state.text.trim();
  if (text) parts.push(`(${text})`);

  // Card name
  const cardName = state.cardName?.trim();
  if (cardName) parts.push(`name:${/\s/.test(cardName) ? `"${cardName}"` : cardName}`);

  // Oracle text — each token becomes its own oracle: clause (AND semantics)
  const cardText = state.cardText?.trim();
  if (cardText) {
    for (const token of cardText.split(/\s+/)) {
      parts.push(`oracle:${token}`);
    }
  }

  // Colors + colorless toggle
  const colorClause = buildColorClause(state);
  if (colorClause) parts.push(colorClause);

  // Rarity (OR within group)
  parts.push(orGroup("r:", state.rarities));

  // Types (OR within group). Each value goes in as t:<value>.
  parts.push(orGroup("t:", state.types));
  parts.push(orGroup("t:", state.supertypes));
  parts.push(orGroup("t:", state.subtypes));

  // Sets (OR within group)
  parts.push(orGroup("s:", state.sets));

  // Custom query fragments — each selected toggle injects its raw fragment.
  const selectedIndices = state.oracleTags ?? [];
  if (selectedIndices.length > 0) {
    const queries = useCustomQueryStore.getState().queries;
    const fragments = selectedIndices
      .map((i) => queries[Number(i)]?.fragment)
      .filter(Boolean) as string[];
    const mode = state.customQueryMode ?? "or";
    if (fragments.length === 1) {
      // Always wrap — a single fragment like "f:standard or f:modern"
      // would leak its OR into the top-level query without parens.
      parts.push(`(${fragments[0]})`);
    } else if (fragments.length > 1) {
      if (mode === "and") {
        // AND: each fragment must match — wrap each so operator precedence is safe
        for (const f of fragments) parts.push(`(${f})`);
      } else {
        parts.push(`(${fragments.join(" or ")})`);
      }
    }
  }

  return parts.filter(Boolean).join(" ");
}
