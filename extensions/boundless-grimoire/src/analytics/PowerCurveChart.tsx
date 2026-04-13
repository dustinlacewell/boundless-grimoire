import { useMemo } from "react";
import type { Deck } from "../storage/types";
import { DistributionChart } from "./DistributionChart";
import { computePowerCurve } from "./stats";

interface Props {
  deck: Deck;
}

export function PowerCurveChart({ deck }: Props) {
  const curve = useMemo(() => computePowerCurve(deck.cards), [deck.cards]);
  if (curve.total === 0) return null;
  return <DistributionChart title="Power" distribution={curve} />;
}
