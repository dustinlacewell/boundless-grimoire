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
import { classify } from "./meta/classify";
import {
  ensureMetaGroups,
  metaQueriesFromCustomQueries,
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

  // Meta grouping derivation.
  //
  // We deliberately do NOT cache the derived `oracle_id → queryId`
  // mapping. The only thing worth caching across renders is the
  // per-fragment Scryfall match data (which lives in metaGroupsStore);
  // running `classify` over that cache is microseconds and side-effect
  // free. Deriving synchronously here means reorders, renames, adds,
  // and deletes of custom queries all flow through React's normal
  // memo-dependency path with no extra invalidation plumbing.
  const customQueries = useCustomQueryStore((s) => s.queries);
  const matchCache = useMetaGroupsStore((s) => s.cache);
  const cacheVersion = useMetaGroupsStore((s) => s.version);

  const metaQueries = useMemo(
    () => metaQueriesFromCustomQueries(customQueries),
    [customQueries],
  );

  const oracleToMeta = useMemo(() => {
    if (deckGroupBy !== "meta" || metaQueries.length === 0) return {};
    const oracleIds: string[] = [];
    for (const c of Object.values(deck.cards)) {
      if (c.snapshot.oracle_id) oracleIds.push(c.snapshot.oracle_id);
    }
    for (const c of Object.values(deck.sideboard)) {
      if (c.snapshot.oracle_id) oracleIds.push(c.snapshot.oracle_id);
    }
    return classify(matchCache, metaQueries, oracleIds).assignments;
    // matchCache is mutated in place by ensureMetaGroups; cacheVersion
    // is what actually triggers the re-derivation.
  }, [deckGroupBy, metaQueries, deck.cards, deck.sideboard, cacheVersion, matchCache]);

  useEffect(() => {
    if (deckGroupBy !== "meta") return;
    // Fire-and-forget: fills gaps in the shared match cache. Each fetch
    // bumps cacheVersion, which re-runs the classify memo above.
    void ensureMetaGroups(deck.id, deck.cards, deck.sideboard);
  }, [deckGroupBy, deck.id, deck.cards, deck.sideboard, customQueries]);

  const metaTagLabels = useMemo(
    () => metaQueries.map((m) => ({ id: m.id, label: m.name })),
    [metaQueries],
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
