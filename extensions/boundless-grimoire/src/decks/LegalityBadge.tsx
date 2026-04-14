import { colors } from "../ui/colors";
import { useLegalityStore } from "./legalityStore";

interface Props {
  deckId: string;
  /** Whether the deck has a format assigned at all. Hides the badge if not. */
  hasFormat: boolean;
}

const dotStyle = (bg: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 13,
  height: 13,
  borderRadius: "50%",
  background: bg,
  color: "#0a0a0c",
  fontSize: 9,
  fontWeight: 900,
  lineHeight: 1,
});

/**
 * Small green ✓ / red ✕ / neutral dot next to the Format label indicating
 * whether the current deck is legal in its assigned format. Reads directly
 * from the legality store; displays nothing when no format is set.
 */
export function LegalityBadge({ deckId, hasFormat }: Props) {
  const illegalCount = useLegalityStore((s) => s.illegalByDeck[deckId]?.size ?? 0);
  const checking = useLegalityStore((s) => !!s.checking[deckId]);
  const checked = useLegalityStore((s) => s.checkedKeyByDeck[deckId] !== undefined);

  if (!hasFormat) return null;

  if (checking) {
    return (
      <span title="Checking legality…" style={dotStyle(colors.bg3)} />
    );
  }

  // Haven't finished a check yet — show nothing rather than a false ✓.
  if (!checked) return null;

  if (illegalCount === 0) {
    return (
      <span title="All cards legal in this format" style={dotStyle(colors.success)}>
        ✓
      </span>
    );
  }

  return (
    <span
      title={`${illegalCount} card${illegalCount === 1 ? "" : "s"} not legal in this format`}
      style={dotStyle(colors.danger)}
    >
      ✕
    </span>
  );
}
