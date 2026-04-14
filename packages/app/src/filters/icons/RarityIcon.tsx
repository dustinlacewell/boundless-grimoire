import type { Rarity } from "../types";

interface Props {
  rarity: Rarity;
  size?: number;
}

const NAME: Record<Rarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  mythic: "Mythic Rare",
};

const KEYRUNE_RARITY: Record<Rarity, string> = {
  common: "ss-common",
  uncommon: "ss-uncommon",
  rare: "ss-rare",
  mythic: "ss-mythic",
};

/**
 * Card-frame rarity icon. Uses keyrune's own classes:
 *   - `ss`         — base class (font + display)
 *   - `ss-bcore`   — Blank Core Set glyph (the empty card frame)
 *   - `ss-grad`    — gradient text fill
 *   - `ss-<rar>`   — pre-defined per-rarity gradient colors
 *
 * The keyrune CSS is vendored and injected once at content-script boot.
 */
export function RarityIcon({ rarity, size = 22 }: Props) {
  return (
    <i
      className={`ss ss-bcore ss-grad ${KEYRUNE_RARITY[rarity]}`}
      aria-label={NAME[rarity]}
      title={NAME[rarity]}
      style={{ fontSize: size, lineHeight: 1, display: "inline-block" }}
    />
  );
}
