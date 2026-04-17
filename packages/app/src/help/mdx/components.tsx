import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { MDXComponents } from "mdx/types";
import { CardImage } from "../../cards/CardImage";
import { useCardHoverPreview } from "../../cards/useCardHoverPreview";
import { getCardByName } from "../../services/scryfall";
import { toSnapshot } from "../../scryfall/snapshot";
import type { CardSnapshot } from "../../storage/types";
import { colors } from "@boundless-grimoire/ui";
import { GrimoireLogo } from "@boundless-grimoire/ui";
import { APP_VERSION } from "../../version";

type CacheEntry = { snapshot: CardSnapshot } | { error: true };
const cardCache = new Map<string, Promise<CacheEntry>>();

function resolveCard(name: string): Promise<CacheEntry> {
  const key = name.toLowerCase();
  let pending = cardCache.get(key);
  if (!pending) {
    pending = getCardByName(name)
      .then((card): CacheEntry => ({ snapshot: toSnapshot(card) }))
      .catch((): CacheEntry => ({ error: true }));
    cardCache.set(key, pending);
  }
  return pending;
}

interface CardProps {
  name: string;
  width?: number;
  size?: "small" | "normal" | "large";
}

/** <Card name="Lightning Bolt" /> — fuzzy-resolves via Scryfall, renders CardImage with Ctrl+hover preview. */
function Card({ name, width = 180, size = "normal" }: CardProps) {
  const [entry, setEntry] = useState<CacheEntry | null>(null);
  const snapshot = entry && !("error" in entry) ? entry.snapshot : null;
  const { handlers } = useCardHoverPreview(snapshot);

  useEffect(() => {
    let cancelled = false;
    setEntry(null);
    resolveCard(name).then((r) => {
      if (!cancelled) setEntry(r);
    });
    return () => {
      cancelled = true;
    };
  }, [name]);

  if (!entry) return <span style={placeholderStyle(width)}>{name}…</span>;
  if ("error" in entry) return <span style={placeholderStyle(width)}>{name} (not found)</span>;
  return (
    <span style={{ display: "inline-block", cursor: "pointer" }} {...handlers}>
      <CardImage snapshot={entry.snapshot} width={width} size={size} />
    </span>
  );
}

function placeholderStyle(width: number): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width,
    minHeight: 40,
    padding: 8,
    border: `1px dashed ${colors.border}`,
    borderRadius: 6,
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
  };
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: "monospace",
        fontSize: 12,
        padding: "3px 8px",
        borderRadius: 4,
        background: colors.bg2,
        border: `1px solid ${colors.borderStrong}`,
        color: colors.text,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

/** Inline version badge. Reads from the single APP_VERSION constant. */
function Version() {
  return (
    <span
      style={{
        fontFamily: "monospace",
        fontSize: 12,
        padding: "2px 8px",
        borderRadius: 4,
        background: colors.bg2,
        border: `1px solid ${colors.border}`,
        color: colors.textMuted,
      }}
    >
      v{APP_VERSION}
    </span>
  );
}

/** Two-column row: fixed-width key cell, description cell. Used in keybinds tables. */
function Row({ keys, children }: { keys: string; children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "6px 0",
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <span style={{ minWidth: 170, flexShrink: 0, textAlign: "center" }}>
        <Kbd>{keys}</Kbd>
      </span>
      <span style={{ fontSize: 13, color: colors.textMuted, flex: 1 }}>{children}</span>
    </div>
  );
}

/** HTML element overrides so prose in MDX inherits the modal's theme. */
const htmlOverrides: MDXComponents = {
  h1: ({ style, ...props }) => (
    <h1 style={{ fontSize: 32, fontWeight: 800, margin: "12px 0 8px", color: colors.text, ...style }} {...props} />
  ),
  h2: (props) => (
    <h2
      style={{
        fontSize: 11,
        letterSpacing: 1.2,
        textTransform: "uppercase",
        color: colors.textMuted,
        fontWeight: 700,
        margin: "18px 0 4px",
      }}
      {...props}
    />
  ),
  h3: (props) => <h3 style={{ fontSize: 13, fontWeight: 700, margin: "12px 0 4px", color: colors.text }} {...props} />,
  p: ({ style, ...props }) => <p style={{ fontSize: 13, color: colors.text, lineHeight: 1.5, margin: "6px 0", ...style }} {...props} />,
  code: (props) => (
    <code
      style={{
        fontFamily: "monospace",
        fontSize: 12,
        padding: "1px 6px",
        borderRadius: 3,
        background: colors.bg2,
        border: `1px solid ${colors.border}`,
      }}
      {...props}
    />
  ),
  a: (props) => <a style={{ color: colors.accent }} target="_blank" rel="noreferrer" {...props} />,
  ul: (props) => <ul style={{ margin: "6px 0", paddingLeft: 20, fontSize: 13, color: colors.text }} {...props} />,
};

function HeroTitle({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 64, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      {children}
    </span>
  );
}

export const mdxComponents: MDXComponents = {
  ...htmlOverrides,
  Card,
  Kbd,
  Row,
  Version,
  GrimoireLogo,
  HeroTitle,
};
