import { useState } from "react";
import { colors } from "@boundless-grimoire/ui";
import { Surface } from "@boundless-grimoire/ui";
import { parseDecklist } from "./parseDecklist";
import { importDecklist } from "../storage/deckStore";

const TILE_W = 220;
const TILE_H = 110;

type Status = "idle" | "loading" | "error";

export function ImportDeckTile() {
  const [status, setStatus] = useState<Status>("idle");

  const handleClick = async () => {
    let text: string;
    try {
      text = await navigator.clipboard.readText();
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
      return;
    }

    const entries = parseDecklist(text);
    if (entries.length === 0) {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
      return;
    }

    setStatus("loading");
    try {
      await importDecklist(entries);
      setStatus("idle");
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  const label =
    status === "loading" ? "Importing…" :
    status === "error" ? "No decklist found" :
    "Import from clipboard";

  return (
    <Surface
      elevation={1}
      padding={0}
      radius={10}
      onClick={status === "loading" ? undefined : handleClick}
      style={{
        width: TILE_W,
        height: TILE_H,
        flex: "0 0 auto",
        cursor: status === "loading" ? "wait" : "pointer",
        borderStyle: "dashed",
        borderColor: status === "error" ? colors.danger : colors.borderStrong,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: status === "error" ? colors.danger : colors.textMuted,
        opacity: status === "loading" ? 0.6 : 1,
      }}
    >
      <svg
        width={22}
        height={22}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="6" y="4" width="12" height="16" rx="2" />
        <path d="M9 4V2.5a.5.5 0 01.5-.5h5a.5.5 0 01.5.5V4" />
        <path d="M12 11v5" />
        <path d="M9.5 13.5L12 11l2.5 2.5" />
      </svg>
      <div style={{ fontSize: 12, marginTop: 6, fontWeight: 600 }}>{label}</div>
    </Surface>
  );
}
