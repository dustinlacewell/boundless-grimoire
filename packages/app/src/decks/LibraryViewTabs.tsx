interface Props {
  view: "decks" | "cubes";
  deckCount: number;
  cubeCount: number;
  onChange: (view: "decks" | "cubes") => void;
}

/**
 * Segmented control above the ribbon that switches the library between
 * Decks and Cubes. Each tab shows its entity count so the user can see
 * at a glance what's on the other side. Selected tab uses the design
 * system's `ui-interactive-selected` treatment; unselected uses
 * `ui-interactive` (hover lights up the accent border).
 */
export function LibraryViewTabs({ view, deckCount, cubeCount, onChange }: Props) {
  return (
    <div className="inline-flex gap-1">
      <Tab active={view === "decks"} onClick={() => onChange("decks")}>
        Decks{deckCount > 0 ? ` (${deckCount})` : ""}
      </Tab>
      <Tab active={view === "cubes"} onClick={() => onChange("cubes")}>
        Cubes{cubeCount > 0 ? ` (${cubeCount})` : ""}
      </Tab>
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const base =
    "px-3 py-1 rounded-md text-[12px] font-semibold tracking-wider uppercase cursor-pointer ui-interactive ui-interactive-border";
  const state = active ? "ui-interactive-selected" : "bg-bg-2 text-text-muted";
  return (
    <button type="button" onClick={onClick} className={`${base} ${state}`}>
      {children}
    </button>
  );
}
