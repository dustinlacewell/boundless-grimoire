import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { colors } from "../ui/colors";

interface Props {
  onClose: () => void;
}

type Tab = "keybinds";

interface Keybind {
  keys: string;
  description: string;
}

interface KeybindSection {
  title: string;
  entries: Keybind[];
}

const KEYBINDS: KeybindSection[] = [
  {
    title: "Cards (anywhere)",
    entries: [
      { keys: "Left click", description: "Add one copy to the active deck" },
      { keys: "Right click", description: "Remove one copy" },
      { keys: "Ctrl + hover", description: "Open the full card preview" },
      { keys: "Ctrl + scroll", description: "Resize card tiles (shared across grid + deck)" },
    ],
  },
  {
    title: "Cards in a deck",
    entries: [
      { keys: "Alt + click", description: "Move card between main and sideboard" },
      { keys: "Ctrl + right click", description: "Set the card as the deck's cover art" },
    ],
  },
  {
    title: "Cards in search results",
    entries: [
      { keys: "Shift + click", description: "Toggle pin (always shown, ignoring filters)" },
      { keys: "Shift + right click", description: "Toggle favorite" },
    ],
  },
  {
    title: "Navigation",
    entries: [
      { keys: "T", description: "Jump to the top (press again to go back)" },
      { keys: "D", description: "Jump to the deck view (press again to go back)" },
      { keys: "A", description: "Jump to analytics (press again to go back)" },
      { keys: "F", description: "Jump to filters (press again to go back)" },
      { keys: "R", description: "Jump to results (press again to go back)" },
    ],
  },
];

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 2147483647,
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "system-ui, sans-serif",
};

const dialogStyle: React.CSSProperties = {
  width: "min(700px, 92vw)",
  maxHeight: "88vh",
  background: colors.bg1,
  border: `1px solid ${colors.borderStrong}`,
  borderRadius: 12,
  boxShadow: "0 12px 36px rgba(0,0,0,0.7)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  color: colors.text,
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 16px",
  borderBottom: `1px solid ${colors.border}`,
};

const titleStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 15,
  flex: 1,
};

const closeBtnStyle: React.CSSProperties = {
  background: colors.bg2,
  color: colors.text,
  border: `1px solid ${colors.borderStrong}`,
  borderRadius: 6,
  padding: "4px 10px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const tabBarStyle: React.CSSProperties = {
  display: "flex",
  gap: 0,
  borderBottom: `1px solid ${colors.border}`,
};

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: "10px 20px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  color: active ? colors.accent : colors.textMuted,
  background: "transparent",
  border: "none",
  borderBottomStyle: "solid",
  borderBottomWidth: 2,
  borderBottomColor: active ? colors.accent : "transparent",
});

const bodyStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 18,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 1.2,
  textTransform: "uppercase",
  color: colors.textMuted,
  fontWeight: 700,
  marginBottom: 4,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "6px 0",
  borderBottom: `1px solid ${colors.border}`,
};

const keysStyle: React.CSSProperties = {
  display: "inline-block",
  fontFamily: "monospace",
  fontSize: 12,
  padding: "3px 8px",
  borderRadius: 4,
  background: colors.bg2,
  border: `1px solid ${colors.borderStrong}`,
  color: colors.text,
  whiteSpace: "nowrap",
  flexShrink: 0,
  minWidth: 170,
  textAlign: "center",
};

const descStyle: React.CSSProperties = {
  fontSize: 13,
  color: colors.textMuted,
  flex: 1,
};

/** Quick-reference modal. Currently hosts keybinds; room for more tabs. */
export function HelpModal({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>("keybinds");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const host = document.getElementById("boundless-grimoire-root");
  if (!host) return null;

  return createPortal(
    <div style={overlayStyle} onClick={onClose}>
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <div style={titleStyle}>Help</div>
          <button type="button" style={closeBtnStyle} onClick={onClose}>
            Close
          </button>
        </div>

        <div style={tabBarStyle}>
          <button type="button" style={tabStyle(tab === "keybinds")} onClick={() => setTab("keybinds")}>
            Keybinds
          </button>
        </div>

        <div style={bodyStyle}>
          {tab === "keybinds" &&
            KEYBINDS.map((section) => (
              <div key={section.title}>
                <div style={sectionTitleStyle}>{section.title}</div>
                {section.entries.map((kb) => (
                  <div key={kb.keys} style={rowStyle}>
                    <span style={keysStyle}>{kb.keys}</span>
                    <span style={descStyle}>{kb.description}</span>
                  </div>
                ))}
              </div>
            ))}
        </div>
      </div>
    </div>,
    host,
  );
}
