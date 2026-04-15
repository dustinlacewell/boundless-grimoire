import { colors, Button, Dropdown, ToggleButton } from "@boundless-grimoire/ui";
import { useCustomFormatStore } from "../../filters/customFormatStore";
import { ColorToggle } from "../../filters/icons/ColorToggle";
import type { GeneratorInput, CurvePreset, DeckSize, ColorCount } from "../../generator";
import type { ColorLetter } from "../../filters/types";
import { MixSliders } from "./MixSliders";

const WUBRG: ColorLetter[] = ["W", "U", "B", "R", "G"];

const bodyStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: colors.textMuted,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const footerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  padding: "12px 16px",
  borderTop: `1px solid ${colors.border}`,
};

interface Props {
  input: GeneratorInput;
  onChange: (next: GeneratorInput) => void;
  onGenerate: () => void;
  onCancel: () => void;
}

export function FormView({ input, onChange, onGenerate, onCancel }: Props) {
  const formats = useCustomFormatStore((s) => s.formats);
  const formatOpts = formats.map((f, i) => ({ value: String(i), label: f.name }));

  const toggleColor = (c: ColorLetter) => {
    const has = input.colors.includes(c);
    const next = has ? input.colors.filter((x) => x !== c) : [...input.colors, c];
    onChange({ ...input, colors: next });
  };

  const setCommander = (commander: boolean) => {
    if (commander) {
      onChange({ ...input, commander: true, singleton: true, size: 100 });
    } else {
      onChange({ ...input, commander: false });
    }
  };

  const canGenerate =
    formats.length > 0 &&
    (input.colors.length > 0 || input.colorCount > 0);

  return (
    <>
      <div style={bodyStyle}>
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
            <div style={rowStyle}>
              <div style={labelStyle}>Format</div>
              <Dropdown
                options={formatOpts}
                value={String(input.formatIndex)}
                onChange={(v) => v && onChange({ ...input, formatIndex: Number(v) })}
                width="100%"
              />
            </div>
            <div style={rowStyle}>
              <div style={labelStyle}>Size</div>
              <Dropdown<string>
                options={[
                  { value: "40", label: "40 (limited)" },
                  { value: "60", label: "60 (constructed)" },
                  { value: "100", label: "100 (commander)" },
                ]}
                value={String(input.size)}
                onChange={(v) => v && onChange({ ...input, size: Number(v) as DeckSize })}
                width="100%"
              />
            </div>
            <div style={rowStyle}>
              <div style={labelStyle}>Curve</div>
              <Dropdown<CurvePreset>
                options={[
                  { value: "low", label: "Low (aggro)" },
                  { value: "default", label: "Default" },
                  { value: "high", label: "High (control)" },
                ]}
                value={input.curve}
                onChange={(v) => v && onChange({ ...input, curve: v })}
                width="100%"
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
            <div style={rowStyle}>
              <div style={labelStyle}>Colors</div>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {WUBRG.map((c) => (
                  <ColorToggle
                    key={c}
                    color={c}
                    on={input.colors.includes(c)}
                    onClick={() => toggleColor(c)}
                  />
                ))}
              </div>
            </div>
            <div style={rowStyle}>
              <div style={labelStyle}>
                Color count {input.colors.length > 0 && <span style={{ opacity: 0.6, textTransform: "none", letterSpacing: 0 }}>(ignored when colors are picked)</span>}
              </div>
              <div style={{ display: "flex", gap: 4, alignItems: "center", opacity: input.colors.length > 0 ? 0.5 : 1 }}>
                {([1, 2, 3, 4, 5] as ColorCount[]).map((n) => (
                  <ToggleButton
                    key={n}
                    size="sm"
                    selected={input.colorCount === n}
                    onClick={() => onChange({ ...input, colorCount: n })}
                  >
                    {n}
                  </ToggleButton>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={rowStyle}>
          <div style={labelStyle}>Mix</div>
          <MixSliders
            creaturePct={input.creaturePct}
            nonCreaturePct={input.nonCreaturePct}
            landPct={input.landPct}
            onChange={(creaturePct, nonCreaturePct, landPct) =>
              onChange({ ...input, creaturePct, nonCreaturePct, landPct })
            }
          />
        </div>

        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: input.commander ? "not-allowed" : "pointer", fontSize: 13 }}>
            <input
              type="checkbox"
              checked={input.singleton}
              disabled={input.commander}
              onChange={(e) => onChange({ ...input, singleton: e.target.checked })}
              style={{ accentColor: colors.accent, width: 14, height: 14 }}
            />
            Singleton
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
            <input
              type="checkbox"
              checked={input.commander}
              onChange={(e) => setCommander(e.target.checked)}
              style={{ accentColor: colors.accent, width: 14, height: 14 }}
            />
            Commander mode
            <span style={{ fontSize: 11, color: colors.textMuted }}>(forces 100 + singleton)</span>
          </label>
        </div>
      </div>
      <div style={footerStyle}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={onGenerate} disabled={!canGenerate}>
          Generate
        </Button>
      </div>
    </>
  );
}
