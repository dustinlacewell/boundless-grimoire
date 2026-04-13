import type { Deck } from "../storage/types";
import { HScroll } from "../ui/HScroll";
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
 * Horizontally-scrolling strip of analytics charts for the active deck.
 * Add new chart components here as they're built.
 */
export function DeckAnalytics({ deck }: Props) {
  const hasCards = Object.keys(deck.cards).length > 0;
  if (!hasCards) return null;

  return (
    <HScroll gap={12}>
      <ManaCurveChart deck={deck} />
      <CurveByTypeChart deck={deck} />
      <PowerCurveChart deck={deck} />
      <ToughnessCurveChart deck={deck} />
      <RarityChart deck={deck} />
      <CountByChart deck={deck} />
    </HScroll>
  );
}
