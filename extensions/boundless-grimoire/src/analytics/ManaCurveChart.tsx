import { useMemo } from "react";
import type { Deck } from "../storage/types";
import { DistributionChart } from "./DistributionChart";
import { computeManaCurve } from "./stats";

interface Props {
  deck: Deck;
}

export function ManaCurveChart({ deck }: Props) {
  const curve = useMemo(() => computeManaCurve(deck.cards), [deck.cards]);
  return <DistributionChart title="Mana Curve" distribution={curve} />;
}
