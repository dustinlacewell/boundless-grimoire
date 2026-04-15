import { colors } from "@boundless-grimoire/ui";

interface Props {
  totalCards: number | null;
  loading: boolean;
}

const wrapStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  color: colors.textMuted,
  marginBottom: 8,
};

/**
 * Result count caption. Sort moved up to the Results section header,
 * Reset moved next to Save Preset / Load / Copy-Paste in the Search
 * section header — this just shows how many cards matched.
 */
export function SearchResultsHeader({ totalCards, loading }: Props) {
  return (
    <div style={wrapStyle}>
      {totalCards !== null && (
        <span>
          {totalCards.toLocaleString()} {totalCards === 1 ? "result" : "results"}
        </span>
      )}
      {loading && <span>· loading…</span>}
    </div>
  );
}
