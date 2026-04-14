/**
 * Parse a clipboard decklist into structured entries.
 *
 * Supports common formats:
 *   4 Lightning Bolt
 *   4x Lightning Bolt
 *   1 Sol Ring (CMR) 403
 *   Sideboard
 *   2 Swords to Plowshares
 */

export interface DecklistEntry {
  count: number;
  name: string;
  zone: "main" | "sideboard";
}

const LINE_RE = /^(\d+)\s*x?\s+(.+)$/i;

const SIDEBOARD_HEADERS = new Set([
  "sideboard",
  "side",
  "sb",
  "companion",
  "commander",
]);

export function parseDecklist(text: string): DecklistEntry[] {
  const entries: DecklistEntry[] = [];
  let zone: "main" | "sideboard" = "main";

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    // Zone header detection
    if (SIDEBOARD_HEADERS.has(line.toLowerCase().replace(/:$/, ""))) {
      zone = "sideboard";
      continue;
    }

    const m = line.match(LINE_RE);
    if (!m) continue;

    const count = parseInt(m[1], 10);
    // Strip trailing set/collector info in parens: "Lightning Bolt (CMR) 403"
    const name = m[2].replace(/\s*\([^)]*\)\s*\d*\s*$/, "").trim();
    if (count > 0 && name) {
      entries.push({ count, name, zone });
    }
  }

  return entries;
}
