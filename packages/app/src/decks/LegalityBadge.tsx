import { colors } from "@boundless-grimoire/ui";
import { useLegalityStore } from "./legalityStore";

interface Props {
  deckId: string;
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
 * Small dot next to the Format label: green ✓ if all checks pass,
 * yellow ! for structural issues (size, copies, commander), red ✕ for
 * illegal cards, neutral while checking. Combines both the Scryfall-based
 * card legality and the local structural validation.
 */
export function LegalityBadge({ deckId, hasFormat }: Props) {
  const illegalCount = useLegalityStore((s) => s.illegalByDeck[deckId]?.size ?? 0);
  const issues = useLegalityStore((s) => s.issuesByDeck[deckId]);
  const checking = useLegalityStore((s) => !!s.checking[deckId]);
  const checked = useLegalityStore((s) => s.checkedKeyByDeck[deckId] !== undefined);

  if (!hasFormat) return null;

  if (checking) {
    return <span title="Checking legality…" style={dotStyle(colors.bg3)} />;
  }

  const issueCount = issues?.length ?? 0;

  if (!checked && issueCount === 0) return null;

  // Red: illegal cards
  if (illegalCount > 0) {
    const lines = [`${illegalCount} card${illegalCount === 1 ? "" : "s"} not legal in this format`];
    if (issueCount > 0) lines.push(...issues!.map((i) => i.message));
    return (
      <span title={lines.join("\n")} style={dotStyle(colors.danger)}>
        ✕
      </span>
    );
  }

  // Yellow: structural issues but all cards individually legal
  if (issueCount > 0) {
    return (
      <span
        title={issues!.map((i) => i.message).join("\n")}
        style={dotStyle(colors.accent)}
      >
        !
      </span>
    );
  }

  // Green: everything passes
  return (
    <span title="All checks pass" style={dotStyle(colors.success)}>
      ✓
    </span>
  );
}
