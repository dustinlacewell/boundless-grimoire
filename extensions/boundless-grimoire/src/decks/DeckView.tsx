import { useEffect, useMemo, useRef } from "react";
import { groupDeck } from "../cards/categorize";
import { stackReveal } from "../cards/CategoryStack";
import { openPrintPicker } from "../cards/printPickerStore";
import { useCustomFormatStore } from "../filters/customFormatStore";
import { useCustomQueryStore } from "../filters/customQueryStore";
import { useGridSizeStore } from "../search/gridSizeStore";
import { useSettingsStore } from "../settings/settingsStore";
import { decrementCard, incrementCard, moveCardToZone, setDeckCover } from "../storage/deckStore";
import type { CardSnapshot, Deck } from "../storage/types";
import { colors } from "../ui/colors";
import { useCtrlWheelCardResize } from "../ui/useCtrlWheelCardResize";
import { DeckCategoryColumn } from "./DeckCategoryColumn";
import { checkLegality, clearLegality, useLegalityStore } from "./legalityStore";
import {
  ensureMetaGroups,
  metaQueriesFromCustomQueries,
  selectAssignments,
  useMetaGroupsStore,
} from "./metaGroupsStore";

interface Props {
  deck: Deck;
}

const scrollWrapperBase: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  gap: 24,
  alignItems: "flex-start",
  overflowX: "auto",
  overflowY: "visible",
};

const wrapWrapperBase: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 24,
  alignItems: "flex-start",
};

const emptyStyle: React.CSSProperties = {
  fontSize: 13,
  color: colors.textMuted,
  padding: "16px 4px",
};

const sideboardLabelStyle: React.CSSProperties = {
  fontSize: 12,
  letterSpacing: 1,
  textTransform: "uppercase",
  color: colors.textMuted,
  fontWeight: 700,
  padding: "8px 4px 4px",
  borderTop: `1px solid ${colors.textMuted}40`,
  marginTop: 8,
};

export function DeckView({ deck }: Props) {
  const cardWidth = useGridSizeStore((s) => s.cardWidth);
  const deckLayout = useSettingsStore((s) => s.settings.deckLayout);
  // Reserve bottom space equal to the worst-case hover-slide on the
  // deepest card. Applied only once at the wrapper bottom rather than
  // per-column, so only the last row of cards pushes the section taller
  // instead of every column carrying the extra whitespace.
  const base = deckLayout === "wrap" ? wrapWrapperBase : scrollWrapperBase;
  const wrapperStyle: React.CSSProperties = {
    ...base,
    padding: `4px 4px ${stackReveal(cardWidth)}px`,
  };
  const formats = useCustomFormatStore((s) => s.formats);
  const formatFragment = deck.formatIndex != null ? formats[deck.formatIndex]?.fragment : null;
  const illegalSet = useLegalityStore((s) => s.illegalByDeck[deck.id]);

  const mainRef = useRef<HTMLDivElement>(null);
  const sideRef = useRef<HTMLDivElement>(null);
  useCtrlWheelCardResize(mainRef);
  useCtrlWheelCardResize(sideRef);

  // Run legality check when format or cards change.
  useEffect(() => {
    if (!formatFragment) {
      clearLegality(deck.id);
      return;
    }
    void checkLegality(deck.id, formatFragment, deck.cards, deck.sideboard);
  }, [deck.id, formatFragment, deck.cards, deck.sideboard]);

  const deckGroupBy = useSettingsStore((s) => s.settings.deckGroupBy);

  // Meta grouping derives from the user's custom queries. The store
  // caches per-fragment match data; editing a fragment invalidates
  // just that fragment, not the whole cache.
  const cacheVersion = useMetaGroupsStore((s) => s.version);
  const cache = useMetaGroupsStore((s) => s.cache);
  const customQueries = useCustomQueryStore((s) => s.queries);

  useEffect(() => {
    if (deckGroupBy !== "meta") return;
    void ensureMetaGroups(deck.id, deck.cards, deck.sideboard);
  }, [deckGroupBy, deck.id, deck.cards, deck.sideboard, customQueries]);

  const metaQueries = useMemo(
    () => metaQueriesFromCustomQueries(customQueries),
    [customQueries],
  );
  const metaTagLabels = useMemo(
    () => metaQueries.map((m) => ({ id: m.id, label: m.name })),
    [metaQueries],
  );
  const deckOracleIds = useMemo(() => {
    const set = new Set<string>();
    for (const entry of Object.values(deck.cards)) {
      if (entry.snapshot.oracle_id) set.add(entry.snapshot.oracle_id);
    }
    for (const entry of Object.values(deck.sideboard)) {
      if (entry.snapshot.oracle_id) set.add(entry.snapshot.oracle_id);
    }
    return [...set];
  }, [deck.cards, deck.sideboard]);
  const oracleToMeta = useMemo(
    () => selectAssignments(cache, metaQueries, deckOracleIds),
    // `cacheVersion` participates so re-renders pick up cache mutations
    // (the Map identity itself doesn't change on write).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cache, cacheVersion, metaQueries, deckOracleIds],
  );
  const groupCtx = { oracleToMeta, metaTagLabels };
  const mainGroups = groupDeck(deck.cards, deckGroupBy, groupCtx);
  const sideGroups = groupDeck(deck.sideboard, deckGroupBy, groupCtx);

  if (mainGroups.length === 0 && sideGroups.length === 0) {
    return <div style={emptyStyle}>This deck is empty. Add a card to get started.</div>;
  }

  const onIncrement = (snapshot: CardSnapshot) => incrementCard(deck.id, snapshot);
  const onDecrement = (cardId: string) => decrementCard(deck.id, cardId);
  const onPickPrint = (snapshot: CardSnapshot) => openPrintPicker(deck.id, snapshot);
  const onAltClickMain = (snapshot: CardSnapshot) => moveCardToZone(deck.id, snapshot.id, "main");
  const onSetCover = (snapshot: CardSnapshot) => setDeckCover(deck.id, snapshot.id);

  const onSideIncrement = (snapshot: CardSnapshot) => incrementCard(deck.id, snapshot, "sideboard");
  const onSideDecrement = (cardId: string) => decrementCard(deck.id, cardId, "sideboard");
  const onAltClickSide = (snapshot: CardSnapshot) => moveCardToZone(deck.id, snapshot.id, "sideboard");

  return (
    <div>
      {mainGroups.length > 0 && (
        <div ref={mainRef} style={wrapperStyle}>
          {mainGroups.map((group) => (
            <DeckCategoryColumn
              key={group.name}
              group={group}
              cardWidth={cardWidth}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
              onPickPrint={onPickPrint}
              onAltClick={onAltClickMain}
              onSetCover={onSetCover}
              illegalCards={illegalSet}
            />
          ))}
        </div>
      )}
      {sideGroups.length > 0 && (
        <>
          <div style={sideboardLabelStyle}>
            Sideboard · {Object.values(deck.sideboard).reduce((s, c) => s + c.count, 0)}
          </div>
          <div ref={sideRef} style={wrapperStyle}>
            {sideGroups.map((group) => (
              <DeckCategoryColumn
                key={`sb-${group.name}`}
                group={group}
                cardWidth={cardWidth}
                onIncrement={onSideIncrement}
                onDecrement={onSideDecrement}
                onPickPrint={onPickPrint}
                onAltClick={onAltClickSide}
                onSetCover={onSetCover}
                illegalCards={illegalSet}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
