import { useEffect, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { MDXProvider } from "@mdx-js/react";
import { colors } from "@boundless-grimoire/ui";
import { mdxComponents } from "./mdx/components";
import Keybinds from "./content/keybinds.mdx";
import { AboutTab } from "./content/AboutTab";

interface Props {
  onClose: () => void;
}

interface TabDef {
  id: string;
  label: string;
  Component: ComponentType;
}

const TABS: TabDef[] = [
  { id: "about", label: "About", Component: AboutTab },
  { id: "keybinds", label: "Keybinds", Component: Keybinds },
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
};

/** Quick-reference modal. Tabs are MDX documents; see ./content/*.mdx. */
export function HelpModal({ onClose }: Props) {
  const [tabId, setTabId] = useState<string>(TABS[0].id);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const host = document.getElementById("boundless-grimoire-root");
  if (!host) return null;

  const Active = TABS.find((t) => t.id === tabId)?.Component ?? TABS[0].Component;

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
          {TABS.map((t) => (
            <button key={t.id} type="button" style={tabStyle(tabId === t.id)} onClick={() => setTabId(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={bodyStyle}>
          <MDXProvider components={mdxComponents}>
            <Active />
          </MDXProvider>
        </div>
      </div>
    </div>,
    host,
  );
}
