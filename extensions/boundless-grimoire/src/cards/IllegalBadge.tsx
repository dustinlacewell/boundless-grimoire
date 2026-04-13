/**
 * Illegal-in-format indicator for deck cards.
 *
 * A red-bordered overlay with a ⚠ emoji centered on the card art,
 * shown when a card doesn't match the deck's assigned format.
 */

interface Props {
  cardWidth: number;
}

export function IllegalBadge({ cardWidth }: Props) {
  const size = Math.max(28, cardWidth * 0.3);

  return (
    <>
      {/* Red border overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: "3px solid #ff5a5a",
          borderRadius: 8,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      {/* Warning emoji */}
      <div
        aria-label="Not legal in format"
        title="Not legal in this deck's format"
        style={{
          position: "absolute",
          left: "50%",
          top: "30%",
          transform: "translate(-50%, -50%)",
          fontSize: size,
          lineHeight: 1,
          fontFamily: "system-ui, sans-serif",
          filter:
            "drop-shadow(0 0 6px rgba(0,0,0,0.85)) drop-shadow(0 2px 4px rgba(0,0,0,0.6))",
          pointerEvents: "none",
          userSelect: "none",
          zIndex: 2,
        }}
      >
        ⚠️
      </div>
    </>
  );
}
