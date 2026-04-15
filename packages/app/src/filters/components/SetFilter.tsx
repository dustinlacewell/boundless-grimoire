import { useMemo, useState, type MouseEvent } from "react";
import { Button, MultiSelect, Popover, colors, type MultiSelectOption } from "@boundless-grimoire/ui";
import { useCatalogs } from "../catalogs";
import { useFilterStore, toggleIn } from "../store";
import { ALL_SET_TYPES, DEFAULT_ENABLED_SET_TYPES } from "../types";

const SET_TYPE_PRIORITY: Record<string, number> = {
  expansion: 0,
  core: 1,
  masters: 2,
  draft_innovation: 3,
  commander: 4,
  eternal: 5,
  masterpiece: 6,
  duel_deck: 7,
  funny: 8,
  starter: 9,
  promo: 10,
  token: 11,
  memorabilia: 12,
};

/**
 * Set types shown in the right-click visibility menu. Must cover every
 * entry in `ALL_SET_TYPES` — anything missing here is silently always-on
 * (the left-click options filter lets it through because it lives in
 * enabledSetTypes by default and the user has no way to toggle it off).
 */
const SET_TYPE_LABELS: Array<{ type: string; label: string }> = [
  { type: "expansion", label: "Expansions" },
  { type: "core", label: "Core Sets" },
  { type: "masters", label: "Masters / Remastered" },
  { type: "draft_innovation", label: "Draft Innovation" },
  { type: "commander", label: "Commander" },
  { type: "eternal", label: "Eternal (UB)" },
  { type: "alchemy", label: "Alchemy" },
  { type: "masterpiece", label: "Masterpiece / Bonus" },
  { type: "duel_deck", label: "Duel Decks" },
  { type: "premium_deck", label: "Premium Decks" },
  { type: "from_the_vault", label: "From the Vault" },
  { type: "spellbook", label: "Signature Spellbook" },
  { type: "planechase", label: "Planechase" },
  { type: "archenemy", label: "Archenemy" },
  { type: "vanguard", label: "Vanguard" },
  { type: "arsenal", label: "Arsenal" },
  { type: "box", label: "Box Sets" },
  { type: "treasure_chest", label: "Treasure Chests" },
  { type: "minigame", label: "Minigames" },
  { type: "funny", label: "Un-Sets" },
  { type: "starter", label: "Starter / Welcome" },
  { type: "promo", label: "Promos" },
  { type: "token", label: "Tokens" },
  { type: "memorabilia", label: "Memorabilia / Art" },
];

const menuItemStyle = (active: boolean): React.CSSProperties => ({
  padding: "7px 12px",
  fontSize: 13,
  cursor: "pointer",
  whiteSpace: "nowrap",
  color: active ? "#0a0a0c" : colors.text,
  background: active ? colors.accent : "transparent",
  fontWeight: active ? 700 : 400,
  borderRadius: 4,
});

/**
 * Set / edition multi-select with right-click type visibility menu.
 *
 * Left-click opens the searchable multi-select of individual sets.
 * Right-click opens a popover of set types — toggling one controls
 * whether sets of that type appear in the left-click dropdown.
 * Enabled types are persisted as part of the deck's filter state.
 */
export function SetFilter() {
  const catalogs = useCatalogs();
  const sets = useFilterStore((s) => s.state.sets);
  const enabledSetTypes = useFilterStore((s) => s.state.enabledSetTypes);
  const patch = useFilterStore((s) => s.patch);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);

  const enabledSet = useMemo(() => new Set(enabledSetTypes ?? []), [enabledSetTypes]);

  const options: MultiSelectOption<string>[] = useMemo(() => {
    if (!catalogs) return [];
    return [...catalogs.sets]
      .filter((s) => !s.digital && enabledSet.has(s.set_type))
      .sort((a, b) => {
        const da = a.released_at ?? "";
        const db = b.released_at ?? "";
        if (db !== da) return db.localeCompare(da);
        return (
          (SET_TYPE_PRIORITY[a.set_type] ?? 99) -
          (SET_TYPE_PRIORITY[b.set_type] ?? 99)
        );
      })
      .map((s) => ({
        value: s.code,
        label: `${s.name} (${s.code.toUpperCase()})`,
        searchText: `${s.name} ${s.code}`,
      }));
  }, [catalogs, enabledSet]);

  const toggleType = (type: string) => {
    patch({ enabledSetTypes: toggleIn(enabledSetTypes ?? [], type) });
  };

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    setTypeMenuOpen((o) => !o);
  };

  return (
    <div onContextMenu={handleContextMenu}>
      <Popover
        open={typeMenuOpen}
        onClose={() => setTypeMenuOpen(false)}
        align="left"
        trigger={
          <MultiSelect
            options={options}
            values={sets}
            onChange={(v) => patch({ sets: v })}
            placeholder={catalogs ? "Any set (right-click for types)" : "Loading sets…"}
            searchPlaceholder="Search sets…"
            width="100%"
          />
        }
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 8px",
            borderBottom: `1px solid ${colors.border}`,
            flexShrink: 0,
          }}
        >
          <Button
            size="sm"
            variant="ghost"
            onClick={() => patch({ enabledSetTypes: [...ALL_SET_TYPES] })}
          >
            All
          </Button>
          <Button size="sm" variant="ghost" onClick={() => patch({ enabledSetTypes: [] })}>
            None
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => patch({ enabledSetTypes: [...DEFAULT_ENABLED_SET_TYPES] })}
          >
            Reset
          </Button>
        </div>
        {/* Popover panel is overflow:hidden (it owns the viewport clip);
            the inner scroll container is what actually handles tall lists. */}
        <div style={{ overflowY: "auto", padding: 4, flex: 1, minHeight: 0 }}>
          {SET_TYPE_LABELS.map(({ type, label }) => (
            <div
              key={type}
              style={menuItemStyle(enabledSet.has(type))}
              onClick={() => toggleType(type)}
              onMouseEnter={(e) => {
                if (!enabledSet.has(type))
                  (e.currentTarget as HTMLElement).style.background = colors.bg3;
              }}
              onMouseLeave={(e) => {
                if (!enabledSet.has(type))
                  (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </Popover>
    </div>
  );
}
