/**
 * Single-format editor form. Renders inline (not a modal) so the
 * FormatManagerModal can stack a list of these or show one at a time.
 *
 * All fields are controlled via the `value` / `onChange` props.
 * The set multi-select is filtered to only show sets legal in the
 * chosen base format.
 */
import { useCallback, useMemo, useState, useEffect } from "react";
import { Button, Dropdown, MultiSelect, colors, type MultiSelectOption } from "@boundless-grimoire/ui";
import { getSets, type ScryfallSet } from "../services/scryfall";
import { SCRYFALL_FORMATS, type FormatDefinition } from "./types";
import { jsonToFormats, formatsToJson } from "./formatStore";

interface Props {
  value: FormatDefinition;
  onChange: (next: FormatDefinition) => void;
  onDelete?: () => void;
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: colors.textMuted,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: 4,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  flex: 1,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 10px",
  fontSize: 13,
  background: colors.bg2,
  color: colors.text,
  border: `1px solid ${colors.borderStrong}`,
  borderRadius: 6,
  boxSizing: "border-box",
};

const numberInputStyle: React.CSSProperties = {
  ...inputStyle,
  width: 80,
};

const checkboxRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 13,
  cursor: "pointer",
};

const FORMAT_OPTIONS = [
  { value: "", label: "(custom)" },
  ...SCRYFALL_FORMATS.map((f) => ({ value: f, label: f })),
];

export function FormatEditor({ value, onChange, onDelete }: Props) {
  const [allSets, setAllSets] = useState<ScryfallSet[]>([]);

  useEffect(() => {
    void getSets().then(setAllSets).catch(() => {});
  }, []);

  const setOptions: MultiSelectOption<string>[] = useMemo(() => {
    if (allSets.length === 0) return [];
    return allSets
      .filter((s) => !s.digital && s.set_type !== "token" && s.set_type !== "memorabilia")
      .sort((a, b) => (b.released_at ?? "").localeCompare(a.released_at ?? ""))
      .map((s) => ({
        value: s.code,
        label: `${s.name} (${s.code.toUpperCase()})`,
        searchText: `${s.name} ${s.code}`,
      }));
  }, [allSets]);

  const patch = (p: Partial<FormatDefinition>) => onChange({ ...value, ...p });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 0" }}>
      <div style={rowStyle}>
        <div style={fieldStyle}>
          <div style={labelStyle}>Name</div>
          <input
            style={inputStyle}
            value={value.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Format name"
          />
        </div>
        <div style={fieldStyle}>
          <div style={labelStyle}>Base format</div>
          <Dropdown
            options={FORMAT_OPTIONS}
            value={value.format}
            onChange={(v) => patch({ format: v ?? "" })}
            width="100%"
          />
        </div>
      </div>

      <div>
        <div style={labelStyle}>Set restriction</div>
        <MultiSelect
          options={setOptions}
          values={value.sets}
          onChange={(sets) => patch({ sets })}
          placeholder={value.sets.length === 0 ? "All sets in format" : `${value.sets.length} sets selected`}
          searchPlaceholder="Search sets…"
          width="100%"
        />
      </div>

      <div>
        <div style={labelStyle}>Extra Scryfall fragment</div>
        <input
          style={inputStyle}
          value={value.fragment}
          onChange={(e) => patch({ fragment: e.target.value })}
          placeholder="e.g. r:common"
        />
      </div>

      <div style={rowStyle}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={labelStyle}>Max copies</div>
          <input
            type="number"
            min={1}
            style={numberInputStyle}
            value={value.maxCopies}
            onChange={(e) => patch({ maxCopies: Math.max(1, Number(e.target.value) || 1) })}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={labelStyle}>Min deck</div>
          <input
            type="number"
            min={1}
            style={numberInputStyle}
            value={value.minDeckSize}
            onChange={(e) => patch({ minDeckSize: Math.max(1, Number(e.target.value) || 1) })}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={labelStyle}>Max deck</div>
          <input
            type="number"
            min={1}
            style={numberInputStyle}
            value={value.maxDeckSize ?? ""}
            placeholder="—"
            onChange={(e) => {
              const n = Number(e.target.value);
              patch({ maxDeckSize: Number.isFinite(n) && n > 0 ? n : null });
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={labelStyle}>Sideboard</div>
          <input
            type="number"
            min={0}
            style={numberInputStyle}
            value={value.sideboardSize}
            onChange={(e) => patch({ sideboardSize: Math.max(0, Number(e.target.value) || 0) })}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <label style={checkboxRow}>
          <input
            type="checkbox"
            checked={value.commanderRequired}
            onChange={(e) => patch({ commanderRequired: e.target.checked })}
            style={{ accentColor: colors.accent, width: 14, height: 14 }}
          />
          Commander required
        </label>
      </div>

      <FormatActions value={value} onChange={onChange} onDelete={onDelete} />
    </div>
  );
}

function FormatActions({ value, onChange, onDelete }: Pick<Props, "value" | "onChange" | "onDelete">) {
  const [copied, setCopied] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formatsToJson([value]));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked */ }
  }, [value]);

  const handleImport = useCallback(async () => {
    setImportError(null);
    try {
      const text = await navigator.clipboard.readText();
      const parsed = jsonToFormats(text);
      if (!parsed || parsed.length === 0) {
        setImportError("No valid format in clipboard");
        return;
      }
      onChange(parsed[0]);
    } catch {
      setImportError("Couldn't read clipboard");
    }
  }, [onChange]);

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <Button size="sm" onClick={handleCopy}>{copied ? "Copied!" : "Copy JSON"}</Button>
      <Button size="sm" onClick={handleImport}>Paste JSON</Button>
      {onDelete && <Button size="sm" onClick={onDelete}>Delete</Button>}
      {importError && (
        <span style={{ fontSize: 12, color: colors.danger }}>{importError}</span>
      )}
    </div>
  );
}
