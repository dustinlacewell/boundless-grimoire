import { useState, type DragEvent } from "react";
import { imageUrl } from "../cards/imageUrl";
import { deckCardCount, firstCardSnapshot } from "../storage/deckStore";
import type { Deck } from "../storage/types";
import { colors } from "../ui/colors";
import { Spinner } from "../ui/Spinner";
import { Surface } from "../ui/Surface";
import { DeckTileActions } from "./DeckTileActions";

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
  const cover = deck.coverCardId
    ? (deck.cards[deck.coverCardId]?.snapshot ?? deck.sideboard[deck.coverCardId]?.snapshot)
    : null;
  const hero = cover ?? firstCardSnapshot(deck);
  const bg = hero ? imageUrl(hero, "art_crop") ?? imageUrl(hero, "normal") : null;
  const count = deckCardCount(deck);

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
            justifyContent: "flex-end",
            color: colors.text,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
            {deck.name}
          </div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>
            {count} {count === 1 ? "card" : "cards"}
          </div>
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
