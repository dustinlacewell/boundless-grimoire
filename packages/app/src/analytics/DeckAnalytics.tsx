import { useRef } from "react";
import { useSettingsStore } from "../settings/settingsStore";
import type { Deck } from "../storage/types";
import { useWheelToHorizontal } from "@boundless-grimoire/ui";
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
const CHART_HEIGHT = 240;
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
// Max charts per row when wrapping (4 × 280 + 3 × 12 = 1156).
const WRAP_MAX_WIDTH = 4 * CHART_MIN_WIDTH + 3 * 12;

export function DeckAnalytics({ deck }: Props) {
  const layout = useSettingsStore((s) => s.settings.analyticsLayout);
  const scrollRef = useRef<HTMLDivElement>(null);
  useWheelToHorizontal(scrollRef, layout !== "wrap");
  const hasCards = Object.keys(deck.cards).length > 0;
  if (!hasCards) return null;

  const s = layout === "wrap" ? WRAP_STYLE : SCROLL_STYLE;
  // CountByChart ("grouped by type or subtype") is meaningless for
  // cubes — every card is singleton — so we hide it in cube view.
  const charts = (
    <>
      <ManaCurveChart deck={deck} style={s} />
      <ColorManaChart deck={deck} style={s} />
      <CurveByTypeChart deck={deck} style={s} />
      <PowerCurveChart deck={deck} style={s} />
      <ToughnessCurveChart deck={deck} style={s} />
      <RarityChart deck={deck} style={s} />
      {!deck.isCube && <CountByChart deck={deck} style={s} />}
    </>
  );

  if (layout === "wrap") {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(${CHART_MIN_WIDTH}px, 1fr))`,
          gap: 12,
          alignItems: "start",
          maxWidth: WRAP_MAX_WIDTH,
          marginInline: "auto",
          width: "100%",
        }}
      >
        {charts}
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      style={{
        display: "flex",
        flexDirection: "row",
        gap: 12,
        alignItems: "stretch",
        overflowX: "auto",
        overflowY: "hidden",
        scrollbarWidth: "thin",
        justifyContent: "safe center" as React.CSSProperties["justifyContent"],
      }}
    >
      {charts}
    </div>
  );
}
