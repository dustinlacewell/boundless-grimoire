import { useMemo, type CSSProperties } from "react";
import type { Deck } from "../storage/types";
import { DistributionChart } from "./DistributionChart";
import { computeToughnessCurve } from "./stats";

interface Props {
  deck: Deck;
  style?: CSSProperties;
}

export function ToughnessCurveChart({ deck, style }: Props) {
  const curve = useMemo(() => computeToughnessCurve(deck.cards), [deck.cards]);
  if (curve.total === 0) return null;
  return <DistributionChart title="Toughness" distribution={curve} style={style} />;
}
