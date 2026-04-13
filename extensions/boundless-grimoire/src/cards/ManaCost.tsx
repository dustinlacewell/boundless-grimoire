interface Props {
  cost: string;
  size?: number;
}

/**
 * Parse a Scryfall mana-cost string like `{2}{W}{U/B}` and render each
 * symbol as the official Scryfall SVG. Slashes are normalized so hybrid
 * symbols load (e.g. `{W/U}` → `WU.svg`).
 */
export function ManaCost({ cost, size = 16 }: Props) {
  // Match {anything-not-brace}+, including hybrid like W/U.
  const tokens = cost.match(/\{[^}]+\}/g) ?? [];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
      {tokens.map((token, i) => {
        const inner = token.slice(1, -1).replace("/", "");
        return (
          <img
            key={i}
            src={`https://svgs.scryfall.io/card-symbols/${inner}.svg`}
            alt={token}
            title={token}
            draggable={false}
            style={{ width: size, height: size, display: "inline-block" }}
          />
        );
      })}
    </span>
  );
}
