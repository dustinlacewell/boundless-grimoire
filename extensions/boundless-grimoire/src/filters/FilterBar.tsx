import { useMemo } from "react";
import { useCustomFormatStore } from "./customFormatStore";
import { useCustomQueryStore } from "./customQueryStore";
import { useFilterStore } from "./store";
import { FilterField } from "./FilterField";
import { buildScryfallQuery } from "./buildQuery";
import { CardNameFilter } from "./components/CardNameFilter";
import { CardTextFilter } from "./components/CardTextFilter";
import { ColorFilter } from "./components/ColorFilter";
import { CustomQueryModeToggle } from "./components/OracleTagFilter";
import { FilterPresets } from "./components/FilterPresets";
import { OracleTagFilter } from "./components/OracleTagFilter";
import { RarityFilter } from "./components/RarityFilter";
import { SetFilter } from "./components/SetFilter";
import { SubtypeFilter } from "./components/SubtypeFilter";
import { SupertypeFilter } from "./components/SupertypeFilter";
import { TextFilter } from "./components/TextFilter";
import { TypeFilter } from "./components/TypeFilter";
import { useSettingsStore } from "../settings/settingsStore";
import { selectedDeck, useDeckStore } from "../storage/deckStore";
import { colors } from "../ui/colors";

function CustomQuerySection() {
  const hasHeaders = useCustomQueryStore(
    (s) => s.queries.some((q) => !q.fragment),
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        {!hasHeaders && (
          <div style={{
            fontSize: 10,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.6)",
            fontWeight: 700,
            flex: 1,
          }}>
            Custom
          </div>
        )}
        {hasHeaders && <div style={{ flex: 1 }} />}
        <CustomQueryModeToggle />
      </div>
      <OracleTagFilter />
    </div>
  );
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  flexWrap: "wrap",
  alignItems: "flex-end",
  gap: 18,
};

/**
 * The full filter bar — composition only. State lives in the store,
 * query compilation lives in buildQuery, and the compiled query is
 * consumed by SearchResults via useCardSearch.
 *
 * Sort and Reset are NOT here — they live in SearchResultsHeader so
 * they sit directly above the grid.
 */
function CompiledQueryDisplay() {
  const filterState = useFilterStore((s) => s.state);
  const deck = useDeckStore(selectedDeck);
  const formats = useCustomFormatStore((s) => s.formats);
  const formatFragment = deck?.formatIndex != null ? formats[deck.formatIndex]?.fragment : null;

  const query = useMemo(() => {
    const base = buildScryfallQuery(filterState);
    return formatFragment ? `(${formatFragment}) ${base}`.trim() : base;
  }, [filterState, formatFragment]);

  if (!query) return null;

  return (
    <div
      style={{
        background: colors.bg2,
        border: `1px solid ${colors.border}`,
        borderRadius: 6,
        padding: "8px 12px",
        fontSize: 12,
        fontFamily: "monospace",
        color: colors.textMuted,
        wordBreak: "break-all",
        lineHeight: 1.5,
      }}
    >
      {query}
    </div>
  );
}

export function FilterBar() {
  const devMode = useSettingsStore((s) => s.settings.devMode);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <FilterPresets />

      <div style={rowStyle}>
        <FilterField label="Card Name" style={{ flex: 1 }}>
          <CardNameFilter />
        </FilterField>
        <FilterField label="Card Text" style={{ flex: 1 }}>
          <CardTextFilter />
        </FilterField>
      </div>

      <TextFilter />

      <div style={rowStyle}>
        <FilterField label="Set" style={{ flex: 1, minWidth: 0 }}>
          <SetFilter />
        </FilterField>
      </div>

      <div style={rowStyle}>
        <FilterField label="Rarity">
          <RarityFilter />
        </FilterField>
        <FilterField label="Color">
          <ColorFilter />
        </FilterField>
      </div>

      <div style={rowStyle}>
        <FilterField label="Type">
          <TypeFilter />
        </FilterField>
      </div>

      <div style={rowStyle}>
        <FilterField label="Supertype">
          <SupertypeFilter />
        </FilterField>
        <FilterField label="Subtype">
          <SubtypeFilter />
        </FilterField>
      </div>

      <CustomQuerySection />
      {devMode && <CompiledQueryDisplay />}
    </div>
  );
}
