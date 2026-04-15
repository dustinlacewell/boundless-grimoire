import { useRef, type CSSProperties } from "react";
import type { DeckCategoryGroup } from "../cards/categorize";
import { stackReveal } from "../cards/CategoryStack";
import { useGridSizeStore } from "../search/gridSizeStore";
import type { CardSnapshot } from "../storage/types";
import { useCtrlWheelCardResize } from "../ui/useCtrlWheelCardResize";
import { DeckCategoryColumn } from "./DeckCategoryColumn";

interface Props {
  groups: DeckCategoryGroup[];
  layout: "scroll" | "wrap";
  onIncrement: (snapshot: CardSnapshot) => void;
  onDecrement: (cardId: string) => void;
  onPickPrint?: (snapshot: CardSnapshot) => void;
  onAltClick?: (snapshot: CardSnapshot) => void;
  onSetCover?: (snapshot: CardSnapshot) => void;
  onSetCommander?: (snapshot: CardSnapshot) => void;
  /** Extra columns (e.g. the commander slot) rendered before `groups`. */
  leadingColumns?: React.ReactNode;
  illegalCards?: Set<string>;
}

const scrollWrapperBase: CSSProperties = {
  display: "flex",
  flexDirection: "row",
  gap: 24,
  alignItems: "flex-start",
  overflowX: "auto",
  // `overflow-y: visible` gets promoted to `auto` by the browser when
  // overflow-x is auto, which turns the hover-slide transforms into a
  // vertical scrollbar. `clip` avoids the promotion and clips at the
  // padding edge — the wrapper's padding-bottom (= stackReveal) already
  // reserves exactly the slide distance, so nothing is actually clipped.
  overflowY: "clip",
  // `safe center` centers the row when it fits, falls back to flex-start
  // when it overflows so the leftmost column stays reachable via scroll.
  justifyContent: "safe center" as CSSProperties["justifyContent"],
};

const wrapWrapperBase: CSSProperties = {
  display: "flex",
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 24,
  alignItems: "flex-start",
  justifyContent: "center",
};

/**
 * Shared card-column grid. Used by both `DeckView` and `CubeView` — any
 * "row of DeckCategoryColumns" rendering lives here so layout tweaks
 * (scroll vs wrap, hover-slide reserve, centering) apply uniformly.
 *
 * Ctrl-wheel to resize cards is wired via `useCtrlWheelCardResize` on
 * the grid wrapper.
 */
export function CardColumnGrid({
  groups,
  layout,
  onIncrement,
  onDecrement,
  onPickPrint,
  onAltClick,
  onSetCover,
  onSetCommander,
  leadingColumns,
  illegalCards,
}: Props) {
  const cardWidth = useGridSizeStore((s) => s.cardWidth);
  const ref = useRef<HTMLDivElement>(null);
  useCtrlWheelCardResize(ref);

  const base = layout === "wrap" ? wrapWrapperBase : scrollWrapperBase;
  const wrapperStyle: CSSProperties = {
    ...base,
    padding: `4px 4px ${stackReveal(cardWidth)}px`,
  };

  return (
    <div ref={ref} style={wrapperStyle}>
      {leadingColumns}
      {groups.map((group) => (
        <DeckCategoryColumn
          key={group.name}
          group={group}
          cardWidth={cardWidth}
          onIncrement={onIncrement}
          onDecrement={onDecrement}
          onPickPrint={onPickPrint}
          onAltClick={onAltClick}
          onSetCover={onSetCover}
          onSetCommander={onSetCommander}
          illegalCards={illegalCards}
        />
      ))}
    </div>
  );
}
