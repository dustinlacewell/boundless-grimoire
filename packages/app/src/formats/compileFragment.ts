/**
 * Compile a FormatDefinition into the Scryfall query fragment that gets
 * AND-combined with the user's search terms.
 *
 * Result is a single string suitable for prepending to any Scryfall
 * query: `(compiledFragment) user-query-here`.
 *
 * Example outputs:
 *   "f:modern"
 *   "f:standard (s:mkm OR s:dsk)"
 *   "f:commander (s:mkm OR s:dsk) r:common"
 *   "(s:mkm OR s:dsk) my-custom-frag"   (no base format)
 */
import type { FormatDefinition } from "./types";

export function compileFragment(def: FormatDefinition): string {
  const parts: string[] = [];
  if (def.format) parts.push(`f:${def.format}`);
  if (def.sets.length > 0) {
    if (def.sets.length === 1) {
      parts.push(`s:${def.sets[0]}`);
    } else {
      parts.push(`(${def.sets.map((s) => `s:${s}`).join(" OR ")})`);
    }
  }
  if (def.fragment.trim()) parts.push(def.fragment.trim());
  return parts.join(" ");
}
