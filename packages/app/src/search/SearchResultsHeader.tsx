import { SortFilter } from "../filters/components/SortFilter";
import { useFilterStore } from "../filters/store";
import { Button } from "@boundless-grimoire/ui";
import { colors } from "@boundless-grimoire/ui";

interface Props {
  totalCards: number | null;
  loading: boolean;
}

const wrapStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  fontSize: 12,
  color: colors.textMuted,
  marginBottom: 8,
};

const countStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  flex: 1,
};

const rightStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 12,
};

/**
 * Result count on the left + sort and reset on the right. Sits directly
 * above the card grid so the controls that affect grid contents/order
 * are right next to it.
 */
export function SearchResultsHeader({ totalCards, loading }: Props) {
  const reset = useFilterStore((s) => s.reset);

  return (
    <div style={wrapStyle}>
      <div style={countStyle}>
        {totalCards !== null && (
          <span>
            {totalCards.toLocaleString()} {totalCards === 1 ? "result" : "results"}
          </span>
        )}
        {loading && <span>· loading…</span>}
      </div>
      <div style={rightStyle}>
        <SortFilter />
        <Button size="sm" variant="ghost" onClick={reset}>
          Reset
        </Button>
      </div>
    </div>
  );
}
