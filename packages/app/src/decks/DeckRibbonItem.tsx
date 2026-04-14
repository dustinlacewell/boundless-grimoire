import { useEffect, useMemo, useState, type DragEvent } from "react";
import { imageUrl } from "../cards/imageUrl";
import { useCustomFormatStore } from "../filters/customFormatStore";
import { coverSnapshotOf, deckCardCount } from "../storage/deckStore";
import type { Deck } from "../storage/types";
import { colors } from "@boundless-grimoire/ui";
import { Spinner } from "@boundless-grimoire/ui";
import { Surface } from "@boundless-grimoire/ui";
import { DeckTileActions } from "./DeckTileActions";
import { LegalityBadge } from "./LegalityBadge";
import { checkLegality, clearLegality } from "./legalityStore";

const WUBRG = ["W", "U", "B", "R", "G"] as const;

function symbolUrl(c: string): string {
  return `https://svgs.scryfall.io/card-symbols/${c}.svg`;
}

interface Props {
  deck: Deck;
  selected: boolean;
  onSelect: () => void;
  /** Drag-reorder hooks owned by the parent ribbon. */
  onDragStart: (e: DragEvent<HTMLDivElement>, deckId: string) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>, deckId: string) => void;
  onDrop: (e: DragEvent<HTMLDivElement>, deckId: string) => void;
  onDragEnd: () => void;
  /** "before" / "after" / null — used to paint a drop indicator. */
  dropEdge: "before" | "after" | null;
  /** Whether this tile is the one currently being dragged. */
  isDragging: boolean;
}

const TILE_W = 220;
const TILE_H = 110;

/**
 * Single deck preview tile in the ribbon.
 *
 * Background: art_crop of the first-added card (falls back to "normal").
 * Overlaid: deck name + card count, with a dark gradient for legibility.
 * Hover-revealed action row in the top-right (copy / duplicate / delete).
 * Draggable to reorder; the parent ribbon owns the drag state.
 */
export function DeckRibbonItem({
  deck,
  selected,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  dropEdge,
  isDragging,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const hero = coverSnapshotOf(deck);
  const bg = hero ? imageUrl(hero, "art_crop") ?? imageUrl(hero, "normal") : null;
  const count = deckCardCount(deck);

  // Union of color_identity across all cards, kept in canonical WUBRG order.
  const colorIdentity = useMemo(() => {
    const set = new Set<string>();
    for (const entry of Object.values(deck.cards)) {
      for (const c of entry.snapshot.color_identity ?? []) set.add(c);
    }
    for (const entry of Object.values(deck.sideboard)) {
      for (const c of entry.snapshot.color_identity ?? []) set.add(c);
    }
    return WUBRG.filter((c) => set.has(c));
  }, [deck.cards, deck.sideboard]);

  const formats = useCustomFormatStore((s) => s.formats);
  const format = deck.formatIndex != null ? formats[deck.formatIndex] : null;

  // Lazily run (or no-op via cache) the legality check for this tile so the
  // ribbon badge reflects current state even for decks the user hasn't
  // selected yet. The store's checkedKey short-circuit keeps this cheap.
  useEffect(() => {
    if (!format) {
      clearLegality(deck.id);
      return;
    }
    void checkLegality(deck.id, format.fragment, deck.cards, deck.sideboard);
  }, [deck.id, format?.fragment, deck.cards, deck.sideboard]);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, deck.id)}
      onDragOver={(e) => onDragOver(e, deck.id)}
      onDrop={(e) => onDrop(e, deck.id)}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        flex: "0 0 auto",
        opacity: isDragging ? 0.4 : 1,
        // Painted drop indicator on the appropriate edge.
        borderLeft:
          dropEdge === "before"
            ? `3px solid ${colors.accent}`
            : "3px solid transparent",
        borderRight:
          dropEdge === "after"
            ? `3px solid ${colors.accent}`
            : "3px solid transparent",
      }}
    >
      <Surface
        elevation={2}
        padding={0}
        radius={10}
        onClick={onSelect}
        style={{
          width: TILE_W,
          height: TILE_H,
          position: "relative",
          overflow: "hidden",
          cursor: "pointer",
          borderColor: selected ? colors.accent : colors.borderStrong,
          borderWidth: selected ? 2 : 1,
          borderStyle: "solid",
        }}
      >
        {bg && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${bg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0.85,
            }}
          />
        )}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.85) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            padding: 12,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            color: colors.text,
          }}
        >
          {/* Top row: name + count on the left, color icons on the right. */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 14,
                  lineHeight: 1.2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  textShadow: "0 1px 2px rgba(0,0,0,0.7), 0 0 4px rgba(0,0,0,0.5)",
                }}
              >
                {deck.name}
              </div>
              <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>
                {count} {count === 1 ? "card" : "cards"}
              </div>
            </div>
            {colorIdentity.length > 0 && (
              <span
                style={{
                  display: "inline-flex",
                  gap: 1,
                  flexShrink: 0,
                  alignItems: "center",
                  marginTop: 2,
                }}
              >
                {colorIdentity.map((c) => (
                  <img
                    key={c}
                    src={symbolUrl(c)}
                    alt={c}
                    draggable={false}
                    style={{
                      width: 14,
                      height: 14,
                      display: "block",
                      filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.7))",
                    }}
                  />
                ))}
              </span>
            )}
          </div>

          {/* Bottom-right: format name + legality badge. */}
          {format && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                alignSelf: "flex-end",
                fontSize: 11,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  opacity: 0.85,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 140,
                }}
                title={format.name}
              >
                {format.name}
              </span>
              <LegalityBadge deckId={deck.id} hasFormat={true} />
            </div>
          )}
        </div>
        {hovered && <DeckTileActions deck={deck} />}
        {deck.enriching && (
          <div
            aria-label="Loading card data from Scryfall"
            title="Fetching card data from Scryfall…"
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              padding: 4,
              borderRadius: 999,
              background: "rgba(0,0,0,0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <Spinner size={16} />
          </div>
        )}
      </Surface>
    </div>
  );
}
