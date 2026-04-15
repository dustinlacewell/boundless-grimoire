import { Button, Spinner, colors } from "@boundless-grimoire/ui";
import type { GenProgress } from "../../generator";

const bodyStyle: React.CSSProperties = {
  flex: 1,
  padding: 32,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 16,
  minHeight: 200,
};

const footerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  padding: "12px 16px",
  borderTop: `1px solid ${colors.border}`,
};

interface Props {
  progress: GenProgress;
  onCancel: () => void;
}

function phaseLabel(p: GenProgress): string {
  switch (p.phase.kind) {
    case "pool-creatures":
      return `Fetching creatures… (${p.phase.fetched})`;
    case "pool-noncreatures":
      return `Fetching spells… (${p.phase.fetched})`;
    case "pool-lands":
      return `Fetching lands… (${p.phase.fetched})`;
    case "pool-commander":
      return `Fetching legendary creatures… (${p.phase.fetched})`;
    case "picking":
      return `Picking spells… (${p.phase.spellsPicked} / ${p.phase.spellsTarget})`;
    case "lands":
      return `Balancing mana base… (${p.phase.landsPicked} / ${p.phase.landsTarget})`;
  }
}

export function GeneratingView({ progress, onCancel }: Props) {
  return (
    <>
      <div style={bodyStyle}>
        <Spinner size={36} />
        <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>
          {phaseLabel(progress)}
        </div>
        <div style={{ fontSize: 12, color: colors.textMuted, textAlign: "center", maxWidth: 360 }}>
          Cards are being scored and curve-fit against the chosen format. Scryfall throttles
          searches at ~2 per second, so this can take several seconds.
        </div>
      </div>
      <div style={footerStyle}>
        <Button onClick={onCancel}>Cancel generation</Button>
      </div>
    </>
  );
}
