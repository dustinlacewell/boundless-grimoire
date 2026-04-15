/**
 * Three sliders that always sum to 100. Adjusting one redistributes the
 * difference proportionally between the other two so the user never has
 * to think about validation.
 */
import { colors } from "@boundless-grimoire/ui";

interface Props {
  creaturePct: number;
  nonCreaturePct: number;
  landPct: number;
  onChange: (creature: number, nonCreature: number, land: number) => void;
}

type Field = "creature" | "nonCreature" | "land";

const sliderStyle: React.CSSProperties = {
  flex: 1,
  accentColor: colors.accent,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontSize: 12,
};

const labelStyle: React.CSSProperties = {
  width: 100,
  color: colors.textMuted,
  fontWeight: 600,
};

const valueStyle: React.CSSProperties = {
  width: 44,
  textAlign: "right",
  color: colors.text,
  fontWeight: 700,
};

export function MixSliders({ creaturePct, nonCreaturePct, landPct, onChange }: Props) {
  const set = (field: Field, value: number) => {
    const v = Math.max(0, Math.min(100, Math.round(value)));
    const cur: Record<Field, number> = {
      creature: creaturePct,
      nonCreature: nonCreaturePct,
      land: landPct,
    };
    const others = (["creature", "nonCreature", "land"] as Field[]).filter((f) => f !== field);
    const remainder = 100 - v;
    const otherSum = cur[others[0]] + cur[others[1]];
    let a: number, b: number;
    if (otherSum <= 0) {
      a = Math.floor(remainder / 2);
      b = remainder - a;
    } else {
      a = Math.round((cur[others[0]] / otherSum) * remainder);
      b = remainder - a;
    }
    const next: Record<Field, number> = { ...cur, [field]: v, [others[0]]: a, [others[1]]: b };
    onChange(next.creature, next.nonCreature, next.land);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Row label="Creatures" value={creaturePct} onChange={(n) => set("creature", n)} />
      <Row label="Non-creatures" value={nonCreaturePct} onChange={(n) => set("nonCreature", n)} />
      <Row label="Lands" value={landPct} onChange={(n) => set("land", n)} />
    </div>
  );
}

function Row({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div style={rowStyle}>
      <span style={labelStyle}>{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={sliderStyle}
      />
      <span style={valueStyle}>{value}%</span>
    </div>
  );
}
