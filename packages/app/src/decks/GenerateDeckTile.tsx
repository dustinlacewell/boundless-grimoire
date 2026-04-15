import { useState } from "react";
import { colors, Surface } from "@boundless-grimoire/ui";
import { GenerateDeckModal } from "./GenerateDeckModal";

const TILE_W = 220;
const TILE_H = 110;

/** Tile that opens the deck generator modal. */
export function GenerateDeckTile() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Surface
        elevation={1}
        padding={0}
        radius={10}
        onClick={() => setOpen(true)}
        style={{
          width: TILE_W,
          height: TILE_H,
          flex: "0 0 auto",
          cursor: "pointer",
          borderStyle: "dashed",
          borderColor: colors.borderStrong,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: colors.textMuted,
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
          <path d="M12 2v4" />
          <path d="M12 18v4" />
          <path d="M4.93 4.93l2.83 2.83" />
          <path d="M16.24 16.24l2.83 2.83" />
          <path d="M2 12h4" />
          <path d="M18 12h4" />
          <path d="M4.93 19.07l2.83-2.83" />
          <path d="M16.24 7.76l2.83-2.83" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <div style={{ fontSize: 12, marginTop: 6, fontWeight: 600 }}>Generate</div>
      </Surface>
      {open && <GenerateDeckModal onClose={() => setOpen(false)} />}
    </>
  );
}
