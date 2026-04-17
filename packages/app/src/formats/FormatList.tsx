/**
 * Format list with inline editing. Renders as plain content (no modal
 * chrome) so it can be embedded in the Settings modal's Formats tab
 * or anywhere else.
 */
import { useState } from "react";
import { Button, colors } from "@boundless-grimoire/ui";
import {
  useFormatStore,
  addFormat,
  removeFormat,
  updateFormat,
  resetFormats,
} from "./formatStore";
import type { FormatDefinition } from "./types";
import { FormatEditor } from "./FormatEditor";

const newFormat: FormatDefinition = {
  name: "New Format",
  format: "",
  sets: [],
  fragment: "",
  maxCopies: 4,
  minDeckSize: 60,
  maxDeckSize: null,
  sideboardSize: 15,
  commanderRequired: false,
};

const actionRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
};

export function FormatList() {
  const formats = useFormatStore((s) => s.formats);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const handleAdd = () => {
    addFormat({ ...newFormat });
    setExpandedIdx(formats.length);
  };

  const handleDelete = (idx: number) => {
    removeFormat(idx);
    if (expandedIdx === idx) setExpandedIdx(null);
    else if (expandedIdx != null && expandedIdx > idx) setExpandedIdx(expandedIdx - 1);
  };

  const handleReset = () => {
    resetFormats();
    setExpandedIdx(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        {formats.map((fmt, i) => (
          <div
            key={i}
            style={{ borderBottom: `1px solid ${colors.border}` }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 0",
                cursor: "pointer",
                gap: 10,
              }}
              onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
            >
              <span style={{ fontSize: 11, opacity: 0.5 }}>
                {expandedIdx === i ? "▾" : "▸"}
              </span>
              <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{fmt.name}</span>
              <span style={{ fontSize: 11, color: colors.textMuted }}>
                {fmt.format || "custom"}
                {fmt.sets.length > 0 && ` · ${fmt.sets.length} sets`}
                {" · "}
                {fmt.minDeckSize}{fmt.maxDeckSize != null ? `–${fmt.maxDeckSize}` : "+"} cards
                {fmt.commanderRequired && " · cmdr"}
              </span>
            </div>
            {expandedIdx === i && (
              <FormatEditor
                value={fmt}
                onChange={(next) => updateFormat(i, next)}
                onDelete={() => handleDelete(i)}
              />
            )}
          </div>
        ))}
        {formats.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", color: colors.textMuted }}>
            No formats defined. Add one or reset to defaults.
          </div>
        )}
      </div>

      <div style={actionRow}>
        <Button size="sm" onClick={handleAdd}>+ Add</Button>
        <Button size="sm" onClick={handleReset}>Reset defaults</Button>
      </div>
    </div>
  );
}
