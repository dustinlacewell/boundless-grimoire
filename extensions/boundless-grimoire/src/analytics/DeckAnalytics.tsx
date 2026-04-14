import { useSettingsStore } from "../settings/settingsStore";
import type { Deck } from "../storage/types";
import { HScroll } from "../ui/HScroll";
import { ColorManaChart } from "./ColorManaChart";
import { CountByChart } from "./CountByChart";
import { CurveByTypeChart } from "./CurveByTypeChart";
import { ManaCurveChart } from "./ManaCurveChart";
import { PowerCurveChart } from "./PowerCurveChart";
import { RarityChart } from "./RarityChart";
import { ToughnessCurveChart } from "./ToughnessCurveChart";

interface Props {
  deck: Deck;
}

// All chart bubbles render at the same height so they line up cleanly in
// grids and strips. Bump this if content starts clipping in a chart.
const CHART_HEIGHT = 220;
const CHART_MIN_WIDTH = 280;

// Scroll mode: charts keep their natural widths, only height is uniform.
const SCROLL_STYLE: React.CSSProperties = { height: CHART_HEIGHT };

// Wrap mode: charts fill their grid cell (width + height both standardized).
const WRAP_STYLE: React.CSSProperties = { width: "100%", height: CHART_HEIGHT };

/**
 * Analytics charts for the active deck. Layout (scroll vs wrap) follows
 * the user's setting. Add new chart components here as they're built.
 *
 * Wrap mode uses CSS grid with auto-fit + minmax so columns are a fixed
 * size across the entire grid — a chart alone on the last row lands in a
 * normal-width cell instead of stretching to fill the whole row.
 */
export function DeckAnalytics({ deck }: Props) {
  const layout = useSettingsStore((s) => s.settings.analyticsLayout);
  const hasCards = Object.keys(deck.cards).length > 0;
  if (!hasCards) return null;

  if (layout === "wrap") {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(${CHART_MIN_WIDTH}px, 1fr))`,
          gap: 12,
          alignItems: "start",
        }}
      >
        <ManaCurveChart deck={deck} style={WRAP_STYLE} />
        <ColorManaChart deck={deck} style={WRAP_STYLE} />
        <CurveByTypeChart deck={deck} style={WRAP_STYLE} />
        <PowerCurveChart deck={deck} style={WRAP_STYLE} />
        <ToughnessCurveChart deck={deck} style={WRAP_STYLE} />
        <RarityChart deck={deck} style={WRAP_STYLE} />
        <CountByChart deck={deck} style={WRAP_STYLE} />
      </div>
    );
  }

  return (
    <HScroll gap={12} wheelToHorizontal>
      <ManaCurveChart deck={deck} style={SCROLL_STYLE} />
      <ColorManaChart deck={deck} style={SCROLL_STYLE} />
      <CurveByTypeChart deck={deck} style={SCROLL_STYLE} />
      <PowerCurveChart deck={deck} style={SCROLL_STYLE} />
      <ToughnessCurveChart deck={deck} style={SCROLL_STYLE} />
      <RarityChart deck={deck} style={SCROLL_STYLE} />
      <CountByChart deck={deck} style={SCROLL_STYLE} />
    </HScroll>
  );
}
