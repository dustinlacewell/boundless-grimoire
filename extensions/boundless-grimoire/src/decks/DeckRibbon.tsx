import { useMemo, useState, type DragEvent } from "react";
import {
  createDeck,
  reorderDecks,
  selectDeck,
  useDeckStore,
} from "../storage/deckStore";
import { HScroll } from "../ui/HScroll";
import { DeckRibbonItem } from "./DeckRibbonItem";
import { ImportDeckTile } from "./ImportDeckTile";
import { NewDeckTile } from "./NewDeckTile";

const DRAG_MIME = "application/x-boundless-grimoire-deck";

interface DragState {
  sourceId: string;
  hoverId: string | null;
  edge: "before" | "after" | null;
}

const NULL_DRAG: DragState = { sourceId: "", hoverId: null, edge: null };

/**
 * Horizontally scrolling row of deck tiles + a trailing "new deck" tile.
 *
 * Owns the drag-reorder state for the ribbon. The HTML5 DnD API drives
 * the reorder; on drop the new order is committed via reorderDecks().
 */
export function DeckRibbon() {
  const library = useDeckStore((s) => s.library);
  // Materialize the ordered, non-null deck list once per library change.
  // Without this, every unrelated re-render walks the order array and
  // allocates a fresh decks[] — and any unrelated store mutation that
  // re-renders the ribbon (e.g. card count tick) does the same work.
  const decks = useMemo(
    () =>
      library.order
        .map((id) => library.decks[id])
        .filter((d): d is NonNullable<typeof d> => Boolean(d)),
    [library.order, library.decks],
  );

  const [drag, setDrag] = useState<DragState>(NULL_DRAG);

  const onDragStart = (e: DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(DRAG_MIME, id);
    setDrag({ sourceId: id, hoverId: null, edge: null });
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>, hoverId: string) => {
    if (!drag.sourceId) return;
    e.preventDefault(); // allow drop
    e.dataTransfer.dropEffect = "move";
    if (hoverId === drag.sourceId) {
      setDrag((d) => ({ ...d, hoverId: null, edge: null }));
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const edge: "before" | "after" = e.clientX < midX ? "before" : "after";
    if (drag.hoverId !== hoverId || drag.edge !== edge) {
      setDrag((d) => ({ ...d, hoverId, edge }));
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData(DRAG_MIME) || drag.sourceId;
    if (!sourceId || sourceId === targetId) {
      setDrag(NULL_DRAG);
      return;
    }
    const order = library.order.filter((id) => id !== sourceId);
    const targetIdx = order.indexOf(targetId);
    if (targetIdx < 0) {
      setDrag(NULL_DRAG);
      return;
    }
    const insertAt = drag.edge === "after" ? targetIdx + 1 : targetIdx;
    order.splice(insertAt, 0, sourceId);
    reorderDecks(order);
    setDrag(NULL_DRAG);
  };

  const onDragEnd = () => setDrag(NULL_DRAG);

  return (
    <HScroll padding="4px 0">
      {decks.map((deck) => (
        <DeckRibbonItem
          key={deck.id}
          deck={deck}
          selected={deck.id === library.selectedId}
          onSelect={() => selectDeck(deck.id)}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onDragEnd={onDragEnd}
          dropEdge={drag.hoverId === deck.id ? drag.edge : null}
          isDragging={drag.sourceId === deck.id}
        />
      ))}
      <NewDeckTile onCreate={() => createDeck("Untitled")} />
      <ImportDeckTile />
    </HScroll>
  );
}
