import { useMemo } from "react";
import { ButtonGroup } from "@boundless-grimoire/ui";
import { groupIntoSections, useCustomQueryStore } from "../customQueryStore";
import { useFilterStore, toggleIn } from "../store";
import { colors } from "@boundless-grimoire/ui";

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

/**
 * Custom query toggle buttons grouped by section headers.
 * If there are no section headers, renders a flat list under "Custom".
 */
export function OracleTagFilter() {
  const queries = useCustomQueryStore((s) => s.queries);
  const selected = useFilterStore((s) => s.state.oracleTags);
  const patch = useFilterStore((s) => s.patch);

  const sections = useMemo(() => groupIntoSections(queries), [queries]);
  const hasHeaders = sections.some((s) => s.header !== null);

  const toggle = (v: string) => patch({ oracleTags: toggleIn(selected ?? [], v) });
  const isSelected = (v: string) => (selected ?? []).includes(v);

  if (!hasHeaders) {
    // Flat list — no section headers in the text
    const options = sections.flatMap((s) =>
      s.entries.map((e) => ({ value: String(e.index), label: e.query.name })),
    );
    return (
      <ButtonGroup options={options} isSelected={isSelected} onToggle={toggle} size="sm" />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {sections.map((section, si) => {
        const options = section.entries.map((e) => ({
          value: String(e.index),
          label: e.query.name,
        }));
        if (options.length === 0) return null;
        return (
          <div key={si} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {section.header && (
              <div style={sectionLabelStyle}>{section.header}</div>
            )}
            <ButtonGroup options={options} isSelected={isSelected} onToggle={toggle} size="sm" />
          </div>
        );
      })}
    </div>
  );
}
