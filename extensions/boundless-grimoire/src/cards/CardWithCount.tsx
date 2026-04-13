import { useState, type MouseEvent } from "react";
import type { CardSnapshot } from "../storage/types";
import { CardImage } from "./CardImage";
import { IllegalBadge } from "./IllegalBadge";
import {
  hideCardPreview,
  mousePos,
  showCardPreview,
} from "./cardPreviewStore";
import { DogEar } from "./DogEar";
import { FavoriteBadge } from "./FavoriteBadge";
import { PinBadge } from "./PinBadge";
import { PrintPickerButton } from "./PrintPickerButton";

interface Props {
  snapshot: CardSnapshot;
  count: number;
  width: number;
  onIncrement: (snapshot: CardSnapshot) => void;
  onDecrement: (cardId: string) => void;
  /**
   * If provided, a "…" button appears on hover that opens the print
   * picker for this card. Only used in deck-view contexts where the
   * card belongs to a deck whose print can be swapped.
   */
  onPickPrint?: (snapshot: CardSnapshot) => void;
  /**
   * If provided, shift-left-click invokes this instead of the normal
   * +1 click. Used by the search grid for pin-toggling. Caller is
   * responsible for any visual feedback (e.g. setting `pinned`).
   */
  onShiftClick?: (snapshot: CardSnapshot) => void;
  /**
   * If provided, shift-right-click invokes this instead of the normal
   * -1 right-click. Used by the search grid for favorite-toggling.
   * Caller is responsible for any visual feedback (e.g. setting `favorited`).
   */
  onShiftContextMenu?: (snapshot: CardSnapshot) => void;
  /**
   * If provided, alt-left-click invokes this. Used by the search grid
   * to add to sideboard, and by the deck view to move between zones.
   */
  onAltClick?: (snapshot: CardSnapshot) => void;
  /** Show the pin indicator badge centered on the card art. */
  pinned?: boolean;
  /** Show the favorite indicator badge centered on the card art. */
  favorited?: boolean;
  /** Show the illegal-in-format indicator. */
  illegal?: boolean;
}

interface TitleOpts {
  canPin: boolean;
  canFavorite: boolean;
  canAlt: boolean;
  altLabel?: string;
  pinned: boolean;
  favorited: boolean;
}

// `const` arrow rather than `function buildTitle` because Vite's React
// Fast Refresh transform sometimes loses hoisted function declarations
// across an HMR swap, leading to a runtime "buildTitle is not defined".
// Const arrows are captured correctly by the refresh signature.
const buildTitle = (name: string, opts: TitleOpts): string => {
  const parts = ["left click +1", "right click -1"];
  if (opts.canPin) parts.push(`shift-click ${opts.pinned ? "unpin" : "pin"}`);
  if (opts.canFavorite) {
    parts.push(`shift-right-click ${opts.favorited ? "unfavorite" : "favorite"}`);
  }
  if (opts.canAlt) parts.push(`alt-click ${opts.altLabel ?? "sideboard"}`);
  parts.push("Ctrl-hover preview");
  return `${name} — ${parts.join(", ")}`;
};

/**
 * Card thumbnail with count badge and click-to-modify behavior.
 *
 * Left click        → +1 copy
 * Right click       → -1 copy (preventDefault on contextmenu)
 * Shift-left click  → toggle pin   (if onShiftClick provided)
 * Shift-right click → toggle favorite (if onShiftContextMenu provided)
 *
 * Hover with Ctrl held → triggers the global card preview overlay.
 * The preview itself reads CardSnapshot from a zustand store and is
 * mounted at the App root.
 */
export function CardWithCount({
  snapshot,
  count,
  width,
  onIncrement,
  onDecrement,
  onPickPrint,
  onShiftClick,
  onShiftContextMenu,
  onAltClick,
  pinned = false,
  favorited = false,
  illegal = false,
}: Props) {
  const [hovered, setHovered] = useState(false);

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (e.altKey && onAltClick) {
      onAltClick(snapshot);
      return;
    }
    if (e.shiftKey && onShiftClick) {
      onShiftClick(snapshot);
      return;
    }
    onIncrement(snapshot);
  };

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.shiftKey && onShiftContextMenu) {
      onShiftContextMenu(snapshot);
      return;
    }
    onDecrement(snapshot.id);
  };

  const handleMouseMove = (e: MouseEvent) => {
    mousePos.x = e.clientX;
    mousePos.y = e.clientY;
    if (e.ctrlKey) showCardPreview(snapshot);
    else hideCardPreview();
  };

  const handleMouseEnter = () => setHovered(true);
  const handleMouseLeave = () => {
    setHovered(false);
    hideCardPreview();
  };

  return (
    <div
      style={{ position: "relative", cursor: "pointer", display: "inline-block" }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      title={buildTitle(snapshot.name, {
        canPin: !!onShiftClick,
        canFavorite: !!onShiftContextMenu,
        canAlt: !!onAltClick,
        pinned,
        favorited,
      })}
    >
      <CardImage snapshot={snapshot} width={width} />
      {count > 0 && <DogEar count={count} cardWidth={width} />}
      {illegal && <IllegalBadge cardWidth={width} />}
      {pinned && <PinBadge cardWidth={width} />}
      {favorited && !pinned && <FavoriteBadge cardWidth={width} />}
      {hovered && onPickPrint && (
        <PrintPickerButton onClick={() => onPickPrint(snapshot)} />
      )}
    </div>
  );
}
