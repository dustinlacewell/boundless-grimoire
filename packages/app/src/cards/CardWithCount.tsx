import { type MouseEvent } from "react";
import { useCtrlKey } from "../ui/useCtrlKey";
import type { CardSnapshot } from "../storage/types";
import { CardImage } from "./CardImage";
import { IllegalBadge } from "./IllegalBadge";
import { useCardHoverPreview } from "./useCardHoverPreview";
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
  /** Ctrl+right-click sets this card as the deck cover art. */
  onSetCover?: (snapshot: CardSnapshot) => void;
  /**
   * Alt+Shift+click toggles this card as the deck's commander. Calling
   * with the current commander clears the designation; calling with any
   * other card promotes it. Caller decides the exact semantics.
   */
  onSetCommander?: (snapshot: CardSnapshot) => void;
  /** Show the pin indicator badge centered on the card art. */
  pinned?: boolean;
  /** Show the favorite indicator badge centered on the card art. */
  favorited?: boolean;
  /** Reason why this card is illegal; truthy = show the badge. */
  illegalReason?: string;
}

interface TitleOpts {
  canPin: boolean;
  canFavorite: boolean;
  canAlt: boolean;
  canSetCover: boolean;
  altLabel?: string;
  pinned: boolean;
  favorited: boolean;
}

// `const` arrow rather than `function buildTitle` because Vite's React
// Fast Refresh transform sometimes loses hoisted function declarations
// across an HMR swap, leading to a runtime "buildTitle is not defined".
// Const arrows are captured correctly by the refresh signature.
const buildTitle = (name: string, opts: TitleOpts): string => {
  const lines = [
    name,
    "left click — +1, right click — -1",
  ];
  if (opts.canPin || opts.canFavorite) {
    const mods: string[] = [];
    if (opts.canPin) mods.push(`shift-click — ${opts.pinned ? "unpin" : "pin"}`);
    if (opts.canFavorite) mods.push(`shift-right-click — ${opts.favorited ? "unfavorite" : "favorite"}`);
    lines.push(mods.join(", "));
  }
  if (opts.canAlt) lines.push(`alt-click — ${opts.altLabel ?? "sideboard"}`);
  if (opts.canSetCover) lines.push("ctrl-right-click — set cover");
  lines.push("ctrl+hover — preview");
  return lines.join("\n");
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
  onSetCover,
  onSetCommander,
  pinned = false,
  favorited = false,
  illegalReason,
}: Props) {
  const { hovered, handlers: hoverHandlers } = useCardHoverPreview(snapshot);
  const ctrlHeld = useCtrlKey();

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    // Alt+Shift checked first so the more specific gesture (commander
    // toggle) doesn't get shadowed by Alt-alone (sideboard move) or
    // Shift-alone (pin).
    if (e.altKey && e.shiftKey && onSetCommander) {
      onSetCommander(snapshot);
      return;
    }
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
    if (e.ctrlKey && onSetCover) {
      onSetCover(snapshot);
      return;
    }
    if (e.shiftKey && onShiftContextMenu) {
      onShiftContextMenu(snapshot);
      return;
    }
    onDecrement(snapshot.id);
  };

  return (
    <div
      style={{ position: "relative", cursor: "pointer", display: "inline-block" }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      {...hoverHandlers}
      title={ctrlHeld ? "" : buildTitle(snapshot.name, {
        canPin: !!onShiftClick,
        canFavorite: !!onShiftContextMenu,
        canAlt: !!onAltClick,
        canSetCover: !!onSetCover,
        pinned,
        favorited,
      })}
    >
      <CardImage snapshot={snapshot} width={width} />
      {count > 0 && <DogEar count={count} cardWidth={width} />}
      {illegalReason && <IllegalBadge cardWidth={width} reason={illegalReason} />}
      {pinned && <PinBadge cardWidth={width} />}
      {favorited && !pinned && <FavoriteBadge cardWidth={width} />}
      {hovered && onPickPrint && (
        <PrintPickerButton onClick={() => onPickPrint(snapshot)} />
      )}
    </div>
  );
}
