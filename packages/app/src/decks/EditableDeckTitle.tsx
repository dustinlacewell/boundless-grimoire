import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { renameDeck } from "../storage/deckStore";
import { colors } from "@boundless-grimoire/ui";

interface Props {
  deckId: string;
  name: string;
}

const SIZE = 22;

const baseStyle: React.CSSProperties = {
  fontSize: SIZE,
  fontWeight: 700,
  lineHeight: 1.2,
  color: colors.text,
  fontFamily: "system-ui, sans-serif",
  background: "transparent",
  border: "1px solid transparent",
  borderRadius: 4,
  padding: "2px 6px",
  margin: "-2px -6px",
  outline: "none",
  width: "auto",
  minWidth: 80,
  boxSizing: "border-box",
};

/**
 * Click-to-edit deck title.
 *
 * - Display: large bold heading. Hovering shows a subtle outline so it
 *   reads as clickable; clicking flips to edit mode.
 * - Edit:    text input pre-filled and selected. Enter or blur commits;
 *            Escape cancels. Empty value also cancels (won't blank a
 *            deck's name).
 */
export function EditableDeckTitle({ deckId, name }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset draft whenever the underlying deck switches.
  useEffect(() => {
    setDraft(name);
    setEditing(false);
  }, [deckId, name]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) renameDeck(deckId, trimmed);
    else setDraft(name);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(name);
    setEditing(false);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKey}
        style={{
          ...baseStyle,
          background: colors.bg1,
          border: `1px solid ${colors.accent}`,
        }}
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      title="Click to rename"
      style={{
        ...baseStyle,
        cursor: "text",
        display: "inline-block",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = colors.borderStrong;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "transparent";
      }}
    >
      {name}
    </div>
  );
}
