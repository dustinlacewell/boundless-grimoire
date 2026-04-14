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

/**
 * Analytics charts for the active deck. Layout (scroll vs wrap) follows
 * the user's setting. Add new chart components here as they're built.
 */
export function DeckAnalytics({ deck }: Props) {
  const layout = useSettingsStore((s) => s.settings.analyticsLayout);
  const hasCards = Object.keys(deck.cards).length > 0;
  if (!hasCards) return null;

  const charts = (
    <>
      <ManaCurveChart deck={deck} />
      <ColorManaChart deck={deck} />
      <CurveByTypeChart deck={deck} />
      <PowerCurveChart deck={deck} />
      <ToughnessCurveChart deck={deck} />
      <RarityChart deck={deck} />
      <CountByChart deck={deck} />
    </>
  );

  if (layout === "wrap") {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
        {charts}
      </div>
    );
  }

  return (
    <HScroll gap={12} wheelToHorizontal>
      {charts}
    </HScroll>
  );
}
