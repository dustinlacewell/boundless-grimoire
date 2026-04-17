/**
 * Tiny text status for sync under the mana icons.
 *
 *   synced   → "synced"
 *   pending  → "pending"
 *   pushing  → "syncing…"
 *   error    → "sync error" (red)
 */
import { colors } from "@boundless-grimoire/ui";
import { useSyncStatusStore } from "../sync/syncStatusStore";

interface Props {
  deckId: string;
}

const baseStyle: React.CSSProperties = {
  fontSize: 10,
  lineHeight: 1,
  letterSpacing: 0.2,
  textShadow: "0 1px 2px rgba(0,0,0,0.7)",
  whiteSpace: "nowrap",
};

export function SyncBadge({ deckId }: Props) {
  const info = useSyncStatusStore((s) => s.byDeck[deckId]);
  if (!info) return null;

  if (info.status === "error") {
    return (
      <span
        style={{ ...baseStyle, color: colors.danger, fontWeight: 700 }}
        title={`Sync failed: ${info.lastError ?? "unknown error"}`}
      >
        sync error
      </span>
    );
  }
  const label =
    info.status === "pushing"
      ? "syncing…"
      : info.status === "pending"
        ? "pending"
        : "synced";
  return (
    <span style={{ ...baseStyle, color: "rgba(255,255,255,0.75)" }} title={label}>
      {label}
    </span>
  );
}
