import { useMemo, useState } from "react";
import { useCustomFormatStore } from "./customFormatStore";
import { useFilterStore } from "./store";
import { FilterField } from "./FilterField";
import { buildScryfallQuery } from "./buildQuery";
import { CardNameFilter } from "./components/CardNameFilter";
import { CmcRangeFilter } from "./components/CmcRangeFilter";
import { CardTextFilter } from "./components/CardTextFilter";
import { ColorFilter } from "./components/ColorFilter";
import { ColorModeDot } from "./components/ColorModeDot";
import { CustomQueryModeDot } from "./components/CustomQueryModeDot";
import { OracleTagFilter } from "./components/OracleTagFilter";
import { RarityFilter } from "./components/RarityFilter";
import { SetFilter } from "./components/SetFilter";
import { SubtypeFilter } from "./components/SubtypeFilter";
import { SupertypeFilter } from "./components/SupertypeFilter";
import { TextFilter } from "./components/TextFilter";
import { TypeFilter } from "./components/TypeFilter";
import { TypeModeDot } from "./components/TypeModeDot";
import { useSettingsStore } from "../settings/settingsStore";
import { selectedDeck, useDeckStore } from "../storage/deckStore";
import { colors } from "@boundless-grimoire/ui";

function CustomQuerySection() {
  return (
    <FilterField label="Custom Filters" action={<CustomQueryModeDot />}>
      <OracleTagFilter />
    </FilterField>
  );
}

const groupLabelStyle: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: 1.2,
  textTransform: "uppercase",
  color: colors.textMuted,
  fontWeight: 700,
  textAlign: "center",
};

const rowCenterStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
};

/**
 * Combined Rarity + Color block — labels bracket the two icon rows:
 *
 *        Rarity
 *      [] [] [] []
 *     () () () () () ()
 *        Color   ⚙
 */
function RarityAndColorPanel() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={groupLabelStyle}>Rarity</div>
      <div style={rowCenterStyle}>
        <RarityFilter />
      </div>
      <div style={{ ...rowCenterStyle, marginTop: 2 }}>
        <ColorFilter />
      </div>
      <div style={{ ...groupLabelStyle, display: "flex", alignItems: "center" }}>
        {/* Three-column: left flex spacer | centered "Color" | right gear.
            Equal-weight left/right spacers keep "Color" perfectly centered
            while the gear pins to the far right edge. */}
        <span style={{ flex: 1 }} />
        <span>Color</span>
        <span style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
          <ColorModeDot />
        </span>
      </div>
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

  const [copied, setCopied] = useState(false);

  if (!query) return null;

  const handleCopy = () => {
    void navigator.clipboard.writeText(query).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      },
      (err) => console.error("[filter] clipboard write failed", err),
    );
  };

  return (
    <div
      onClick={handleCopy}
      title="Click to copy"
      style={{
        background: colors.bg2,
        border: `1px solid ${copied ? colors.accent : colors.border}`,
        borderRadius: 6,
        padding: "8px 12px",
        fontSize: 12,
        fontFamily: "monospace",
        color: colors.textMuted,
        wordBreak: "break-all",
        lineHeight: 1.5,
        cursor: "pointer",
        position: "relative",
        transition: "border-color 0.2s ease",
      }}
    >
      {query}
      {copied && (
        <span
          style={{
            position: "absolute",
            top: 4,
            right: 8,
            fontSize: 10,
            color: colors.accent,
            fontWeight: 700,
          }}
        >
          Copied
        </span>
      )}
    </div>
  );
}

export function FilterBar() {
  const devMode = useSettingsStore((s) => s.settings.devMode);

  const constrainedRow: React.CSSProperties = {
    maxWidth: 1068,
    width: "100%",
    marginInline: "auto",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ ...rowStyle, ...constrainedRow }}>
        <FilterField label="Set" style={{ flex: 1, minWidth: 0 }}>
          <SetFilter />
        </FilterField>
      </div>

      <div style={{ ...constrainedRow, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, alignItems: "flex-end" }}>
        <FilterField label="Card Name" style={{ minWidth: 0 }}>
          <CardNameFilter />
        </FilterField>
        <FilterField label="Card Text" style={{ minWidth: 0 }}>
          <CardTextFilter />
        </FilterField>
      </div>

      <div style={constrainedRow}>
        <TextFilter />
      </div>

      <div style={{ display: "flex", flexDirection: "row", gap: 24, alignItems: "flex-start", flexWrap: "wrap", justifyContent: "center" }}>
        <div style={{ flex: "0 1 340px", minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          <RarityAndColorPanel />
          <FilterField label="Mana Value" align="center">
            <CmcRangeFilter />
          </FilterField>
          <FilterField label="Type" align="center" action={<TypeModeDot />}>
            <TypeFilter />
          </FilterField>
          <FilterField label="Subtype" align="center">
            <SubtypeFilter />
          </FilterField>
          <FilterField label="Supertype" align="center">
            <SupertypeFilter />
          </FilterField>
        </div>

        <div style={{ flex: "0 1 704px", minWidth: 0 }}>
          <CustomQuerySection />
        </div>
      </div>

      {devMode && (
        <div style={constrainedRow}>
          <CompiledQueryDisplay />
        </div>
      )}
    </div>
  );
}
