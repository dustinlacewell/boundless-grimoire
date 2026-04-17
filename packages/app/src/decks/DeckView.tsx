import { useEffect, useMemo } from "react";
import { groupDeck } from "../cards/categorize";
import { openPrintPicker } from "../cards/printPickerStore";
import { useCustomFormatStore, compileFragment } from "../formats";
import { useCustomQueryStore } from "../filters/customQueryStore";
import { useGridSizeStore } from "../search/gridSizeStore";
import { decrementCard, incrementCard, moveCardToZone } from "../commands/cardActions";
import { pushToast, ToastFrame } from "../notifications";
import { setDeckCommander, setDeckCover } from "../storage/deckStore";
import type { CardSnapshot, Deck, DeckCard } from "../storage/types";
import { colors } from "@boundless-grimoire/ui";
import { CardColumnGrid } from "./CardColumnGrid";
import { DeckCategoryColumn } from "./DeckCategoryColumn";
import { checkLegality, clearLegality, runValidation, useLegalityStore } from "./legalityStore";
import { classify } from "./meta/classify";
import {
  ensureMetaGroups,
  metaQueriesFromCustomQueries,
  useMetaGroupsStore,
} from "./metaGroupsStore";

interface Props {
  deck: Deck;
}

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

/** True for cards eligible to be a commander (Legendary in the type line). */
function isLegendary(snapshot: CardSnapshot): boolean {
  return (snapshot.type_line ?? "").toLowerCase().includes("legendary");
}

/**
 * Detail view for a constructed deck.
 *
 * Responsibilities unique to decks (i.e. NOT shared with CubeView):
 *   - Commander slot (fixed first column; alt+shift+click gesture)
 *   - Sideboard section (secondary grid under the mainboard)
 *   - Format-driven legality checks (reads formatIndex, emits illegal set)
 *   - Meta-tag grouping (categorize by custom query buckets)
 *
 * Everything to do with card-row rendering, scroll/wrap layout, and
 * ctrl-wheel resize lives in `CardColumnGrid`.
 */
export function DeckView({ deck }: Props) {
  const cardWidth = useGridSizeStore((s) => s.cardWidth);
  const formats = useCustomFormatStore((s) => s.formats);
  const format = deck.formatIndex != null ? formats[deck.formatIndex] : null;
  const formatFragment = format ? compileFragment(format) : null;
  const illegalSet = useLegalityStore((s) => s.illegalByDeck[deck.id]);

  // Run legality + structural validation when format or cards change.
  useEffect(() => {
    if (!format || !formatFragment) {
      clearLegality(deck.id);
      return;
    }
    runValidation(deck.id, deck, format);
    void checkLegality(deck.id, formatFragment, deck.cards, deck.sideboard);
  }, [deck.id, format, formatFragment, deck.cards, deck.sideboard, deck.commander]);

  const deckGroupBy = deck.groupBy;

  // Meta grouping derivation — see Deck architecture notes for why we
  // derive this per-render instead of caching the oracle_id → queryId map.
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
  }, [deckGroupBy, metaQueries, deck.cards, deck.sideboard, cacheVersion, matchCache]);

  useEffect(() => {
    if (deckGroupBy !== "meta") return;
    void ensureMetaGroups(deck.id, deck.cards, deck.sideboard);
  }, [deckGroupBy, deck.id, deck.cards, deck.sideboard, customQueries]);

  const metaTagLabels = useMemo(
    () => metaQueries.map((m) => ({ id: m.id, label: m.name })),
    [metaQueries],
  );
  const groupCtx = { oracleToMeta, metaTagLabels, sort: deck.columnSort };
  const mainGroups = groupDeck(deck.cards, deckGroupBy, groupCtx);
  const sideGroups = groupDeck(deck.sideboard, deckGroupBy, groupCtx);

  if (mainGroups.length === 0 && sideGroups.length === 0 && !deck.commander) {
    return <div style={emptyStyle}>This deck is empty. Add a card to get started.</div>;
  }

  const onIncrement = (snapshot: CardSnapshot) => incrementCard(deck.id, snapshot);
  const onDecrement = (cardId: string) => decrementCard(deck.id, cardId);
  const onPickPrint = (snapshot: CardSnapshot) => openPrintPicker(deck.id, snapshot);
  const onAltClickMain = (snapshot: CardSnapshot) => moveCardToZone(deck.id, snapshot.id, "main");
  const onSetCover = (snapshot: CardSnapshot) => setDeckCover(deck.id, snapshot.id);

  // Toggle: alt+shift+click on the current commander releases it; on
  // any other card, promotes it (setDeckCommander returns the previous
  // commander to the mainboard). Promotion is rules-gated on Legendary;
  // release is always allowed.
  const onSetCommander = (snapshot: CardSnapshot) => {
    if (deck.commander?.id === snapshot.id) {
      setDeckCommander(deck.id, null);
      return;
    }
    if (!isLegendary(snapshot)) {
      pushToast({
        key: "commander-not-legendary",
        durationMs: 4000,
        render: ({ dismiss }) => (
          <ToastFrame variant="warn" onDismiss={dismiss}>
            Only legendary creatures can be commanders.
          </ToastFrame>
        ),
      });
      return;
    }
    setDeckCommander(deck.id, snapshot);
  };

  const onSideIncrement = (snapshot: CardSnapshot) => incrementCard(deck.id, snapshot, "sideboard");
  const onSideDecrement = (cardId: string) => decrementCard(deck.id, cardId, "sideboard");
  const onAltClickSide = (snapshot: CardSnapshot) => moveCardToZone(deck.id, snapshot.id, "sideboard");

  // Commander column has singleton semantics — +1/-1 are no-ops. The
  // only way to remove a commander is alt+shift+click (via onSetCommander).
  const noop = () => {};
  const commanderColumn = deck.commander ? (
    <DeckCategoryColumn
      key="__commander__"
      group={{
        name: "Commander",
        cards: [
          { snapshot: deck.commander, count: 1, addedAt: 0, zone: "deck-1" } satisfies DeckCard,
        ],
      }}
      cardWidth={cardWidth}
      onIncrement={noop}
      onDecrement={noop}
      onPickPrint={onPickPrint}
      onSetCover={onSetCover}
      onSetCommander={onSetCommander}
      illegalCards={illegalSet}
    />
  ) : null;

  return (
    <div>
      {(commanderColumn || mainGroups.length > 0) && (
        <CardColumnGrid
          groups={mainGroups}
          layout={deck.layout}
          leadingColumns={commanderColumn}
          onIncrement={onIncrement}
          onDecrement={onDecrement}
          onPickPrint={onPickPrint}
          onAltClick={onAltClickMain}
          onSetCover={onSetCover}
          onSetCommander={onSetCommander}
          illegalCards={illegalSet}
        />
      )}
      {sideGroups.length > 0 && (
        <>
          <div style={sideboardLabelStyle}>
            Sideboard · {Object.values(deck.sideboard).reduce((s, c) => s + c.count, 0)}
          </div>
          <CardColumnGrid
            groups={sideGroups}
            layout={deck.layout}
            onIncrement={onSideIncrement}
            onDecrement={onSideDecrement}
            onPickPrint={onPickPrint}
            onAltClick={onAltClickSide}
            onSetCover={onSetCover}
            onSetCommander={onSetCommander}
            illegalCards={illegalSet}
          />
        </>
      )}
    </div>
  );
}
