import { useState } from "react";
import { deleteDeck, duplicateDeck } from "../storage/deckStore";
import type { Deck } from "../storage/types";
import { colors } from "../ui/colors";
import { IconButton } from "../ui/IconButton";
import { Popover } from "../ui/Popover";
import { ClipboardIcon, DuplicateIcon, TrashIcon } from "../ui/icons/Icons";
import { fullDeckToText } from "./deckText";

interface Props {
  deck: Deck;
}

const wrapStyle: React.CSSProperties = {
  position: "absolute",
  top: 6,
  right: 6,
  display: "flex",
  gap: 4,
  zIndex: 2,
};

const menuItemStyle: React.CSSProperties = {
  padding: "7px 12px",
  fontSize: 13,
  cursor: "pointer",
  whiteSpace: "nowrap",
  color: colors.text,
};

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

/**
 * Hover-revealed action row on a deck ribbon tile: copy as text,
 * duplicate, delete. Each button stops event propagation so clicks
 * here don't trigger deck selection.
 */
export function DeckTileActions({ deck }: Props) {
  const [copyOpen, setCopyOpen] = useState(false);

  const handleCopy = async (includeSets: boolean) => {
    setCopyOpen(false);
    await copyText(fullDeckToText(deck, { includeSets }));
  };

  const handleDuplicate = () => {
    duplicateDeck(deck.id);
  };

  const handleDelete = () => {
    if (window.confirm(`Delete "${deck.name}"? This can't be undone.`)) {
      deleteDeck(deck.id);
    }
  };

  return (
    <div style={wrapStyle}>
      <Popover
        open={copyOpen}
        onClose={() => setCopyOpen(false)}
        align="right"
        trigger={
          <IconButton
            title="Copy as text"
            onClick={() => setCopyOpen((o) => !o)}
            size={24}
          >
            <ClipboardIcon size={13} />
          </IconButton>
        }
      >
        <div style={{ padding: 4 }}>
          <div
            style={menuItemStyle}
            onClick={() => handleCopy(true)}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = colors.bg3; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            With Set IDs
          </div>
          <div
            style={menuItemStyle}
            onClick={() => handleCopy(false)}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = colors.bg3; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            Without Set IDs
          </div>
        </div>
      </Popover>
      <IconButton title="Duplicate" onClick={handleDuplicate} size={24}>
        <DuplicateIcon size={13} />
      </IconButton>
      <IconButton title="Delete" onClick={handleDelete} size={24}>
        <TrashIcon size={13} />
      </IconButton>
    </div>
  );
}
