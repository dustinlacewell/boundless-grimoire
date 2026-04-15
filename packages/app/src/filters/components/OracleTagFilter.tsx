import { useMemo } from "react";
import { ButtonGroup, colors } from "@boundless-grimoire/ui";
import { groupIntoSections, useCustomQueryStore } from "../customQueryStore";
import { useFilterStore, toggleIn } from "../store";

const modeOptions = [
  { value: "or" as const, label: "OR" },
  { value: "and" as const, label: "AND" },
];

/** OR/AND mode switch, intended for the Custom section header. */
export function CustomQueryModeToggle() {
  const mode = useFilterStore((s) => s.state.customQueryMode) ?? "or";
  const patch = useFilterStore((s) => s.patch);

  return (
    <ButtonGroup
      options={modeOptions}
      isSelected={(v) => v === mode}
      onToggle={(v) => patch({ customQueryMode: v })}
      size="sm"
    />
  );
}

// Level-3 sub-section header used inside the Custom Filters block.
// Deliberately quieter than the FilterField labels (level 2): no uppercase,
// less letter spacing, faded color, lighter weight — so user-defined
// groupings read as subcontent, not as section headings.
const sectionLabelStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 0.3,
  color: colors.textFaint,
  fontWeight: 500,
  fontStyle: "italic",
  marginTop: 2,
};

type State = "neutral" | "included" | "excluded";

const baseButtonClass =
  "inline-flex items-center justify-center box-border rounded-[6px] font-sans font-semibold cursor-pointer ui-interactive ui-interactive-border h-[26px] px-2.5 text-[12px]";

function styleFor(state: State): React.CSSProperties {
  if (state === "excluded") {
    return {
      background: colors.bg2,
      color: colors.danger,
      borderColor: colors.danger,
      textDecoration: "line-through",
    };
  }
  return {};
}

/**
 * Custom query toggle buttons grouped by section headers.
 * If there are no section headers, renders a flat list under "Custom".
 *
 * Tri-state: left click toggles include ↔ neutral; right click toggles
 * exclude ↔ neutral. A query can be only in one state at a time.
 */
export function OracleTagFilter() {
  const queries = useCustomQueryStore((s) => s.queries);
  const selected = useFilterStore((s) => s.state.oracleTags) ?? [];
  const excluded = useFilterStore((s) => s.state.excludedOracleTags ?? []);
  const patch = useFilterStore((s) => s.patch);

  const sections = useMemo(() => groupIntoSections(queries), [queries]);
  const hasHeaders = sections.some((s) => s.header !== null);

  const stateOf = (v: string): State => {
    if (selected.includes(v)) return "included";
    if (excluded.includes(v)) return "excluded";
    return "neutral";
  };

  const leftClick = (v: string) => {
    if (excluded.includes(v)) {
      patch({
        excludedOracleTags: excluded.filter((x) => x !== v),
        oracleTags: [...selected, v],
      });
    } else {
      patch({ oracleTags: toggleIn(selected, v) });
    }
  };

  const rightClick = (v: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (selected.includes(v)) {
      patch({
        oracleTags: selected.filter((x) => x !== v),
        excludedOracleTags: [...excluded, v],
      });
    } else {
      patch({ excludedOracleTags: toggleIn(excluded, v) });
    }
  };

  const renderButtons = (entries: { index: number; query: { name: string } }[]) => (
    <div className="inline-flex flex-wrap" style={{ gap: 4 }}>
      {entries.map((e) => {
        const v = String(e.index);
        const s = stateOf(v);
        const selectedClass = s === "included" ? "ui-interactive-selected" : "bg-bg-2 text-text";
        return (
          <button
            key={v}
            type="button"
            className={`${baseButtonClass} ${selectedClass}`.trim()}
            style={styleFor(s)}
            onClick={() => leftClick(v)}
            onContextMenu={(ev) => rightClick(v, ev)}
            title={`${e.query.name} — left click to include, right click to exclude`}
          >
            {e.query.name}
          </button>
        );
      })}
    </div>
  );

  if (!hasHeaders) {
    const flat = sections.flatMap((s) => s.entries);
    return renderButtons(flat);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {sections.map((section, si) => {
        if (section.entries.length === 0) return null;
        return (
          <div key={si} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {section.header && <div style={sectionLabelStyle}>{section.header}</div>}
            {renderButtons(section.entries)}
          </div>
        );
      })}
    </div>
  );
}
