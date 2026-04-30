import { useEffect, useMemo } from "react";
import { groupDeck } from "../cards/categorize";
import { openPrintPicker } from "../cards/printPickerStore";
import { useCustomFormatStore, compileFragment } from "../formats";
import { useCustomQueryStore } from "../filters/customQueryStore";
import { decrementCard, incrementCard, moveCardToZone } from "../commands/cardActions";
import { pushToast, ToastFrame } from "../notifications";
import { addCommander, removeCommander, setDeckCover } from "../storage/deckStore";
import type { CardSnapshot, Deck } from "../storage/types";
import { colors } from "@boundless-grimoire/ui";
import { CardColumnGrid } from "./CardColumnGrid";
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

const commanderLabelStyle: React.CSSProperties = {
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
 *   - Commander zone (partners supported — multiple cards)
 *   - Sideboard section (secondary grid under the mainboard)
 *   - Format-driven legality checks (reads formatIndex, emits illegal set)
 *   - Meta-tag grouping (categorize by custom query buckets)
 *
 * Everything to do with card-row rendering, scroll/wrap layout, and
 * ctrl-wheel resize lives in `CardColumnGrid`.
 */
export function DeckView({ deck }: Props) {
  const formats = useCustomFormatStore((s) => s.formats);
  const format = deck.formatIndex != null ? formats[deck.formatIndex] : null;
  const formatFragment = format ? compileFragment(format) : null;
  const scryfallIllegal = useLegalityStore((s) => s.illegalByDeck[deck.id]);
  const issues = useLegalityStore((s) => s.issuesByDeck[deck.id]);

  const mainCards = deck.zones.mainboard.cards;
  const sideCards = deck.zones.sideboard.cards;
  const commanderCards = deck.zones.commander.cards;

  const illegalSet = useMemo(() => {
    const combined = new Map<string, string>();
    if (scryfallIllegal) for (const [id, r] of scryfallIllegal) combined.set(id, r);
    if (issues) {
      for (const issue of issues) {
        if (!issue.cardIds) continue;
        for (const id of issue.cardIds) {
          const allCards = { ...mainCards, ...sideCards };
          const name = allCards[id]?.snapshot.name ?? "Unknown";
          const reason = `${name}: ${issue.message}`;
          const prev = combined.get(id);
          combined.set(id, prev ? `${prev}; ${issue.message}` : reason);
        }
      }
    }
    return combined;
  }, [scryfallIllegal, issues, mainCards, sideCards]);

  useEffect(() => {
    if (!format || !formatFragment) {
      clearLegality(deck.id);
      return;
    }
    runValidation(deck.id, deck, format);
    void checkLegality(deck.id, formatFragment, mainCards, sideCards);
  }, [deck.id, format, formatFragment, mainCards, sideCards, deck]);

  const deckGroupBy = deck.zones.mainboard.groupBy;

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
    for (const c of Object.values(mainCards)) {
      if (c.snapshot.oracle_id) oracleIds.push(c.snapshot.oracle_id);
    }
    for (const c of Object.values(sideCards)) {
      if (c.snapshot.oracle_id) oracleIds.push(c.snapshot.oracle_id);
    }
    void cacheVersion; // matchCache is mutated in place; cacheVersion forces re-derivation
    return classify(matchCache, metaQueries, oracleIds).assignments;
  }, [deckGroupBy, metaQueries, mainCards, sideCards, cacheVersion, matchCache]);

  useEffect(() => {
    if (deckGroupBy !== "meta") return;
    void customQueries; // re-run when query list changes even though it's not used directly
    void ensureMetaGroups(deck.id, mainCards, sideCards);
  }, [deckGroupBy, deck.id, mainCards, sideCards, customQueries]);

  const metaTagLabels = useMemo(
    () => metaQueries.map((m) => ({ id: m.id, label: m.name })),
    [metaQueries],
  );
  const groupCtx = { oracleToMeta, metaTagLabels, sort: deck.columnSort };
  const mainGroups = groupDeck(mainCards, deckGroupBy, groupCtx);
  const sideGroups = groupDeck(sideCards, deckGroupBy, groupCtx);
  const commanderGroups = groupDeck(commanderCards, "category", { sort: deck.columnSort });

  const hasCommander = Object.keys(commanderCards).length > 0;

  if (mainGroups.length === 0 && sideGroups.length === 0 && !hasCommander) {
    return <div style={emptyStyle}>This deck is empty. Add a card to get started.</div>;
  }

  const onIncrement = (snapshot: CardSnapshot) => incrementCard(deck.id, snapshot);
  const onDecrement = (cardId: string) => decrementCard(deck.id, cardId);
  const onPickPrint = (snapshot: CardSnapshot) => openPrintPicker(deck.id, snapshot);
  const onAltClickMain = (snapshot: CardSnapshot) => moveCardToZone(deck.id, snapshot.id, "mainboard");
  const onSetCover = (snapshot: CardSnapshot) => setDeckCover(deck.id, snapshot.id);

  const onSetCommander = (snapshot: CardSnapshot) => {
    if (commanderCards[snapshot.id]) {
      removeCommander(deck.id, snapshot.id);
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
    addCommander(deck.id, snapshot);
  };

  const onSideIncrement = (snapshot: CardSnapshot) => incrementCard(deck.id, snapshot, "sideboard");
  const onSideDecrement = (cardId: string) => decrementCard(deck.id, cardId, "sideboard");
  const onAltClickSide = (snapshot: CardSnapshot) => moveCardToZone(deck.id, snapshot.id, "sideboard");

  const onCommanderDecrement = (cardId: string) => removeCommander(deck.id, cardId);

  return (
    <div>
      {(hasCommander || mainGroups.length > 0) && (
        <CardColumnGrid
          groups={mainGroups}
          layout={deck.layout}
          onIncrement={onIncrement}
          onDecrement={onDecrement}
          onPickPrint={onPickPrint}
          onAltClick={onAltClickMain}
          onSetCover={onSetCover}
          onSetCommander={onSetCommander}
          illegalCards={illegalSet}
        />
      )}
      {commanderGroups.length > 0 && (
        <>
          <div style={commanderLabelStyle}>
            Commander · {Object.values(commanderCards).reduce((s, c) => s + c.count, 0)}
          </div>
          <CardColumnGrid
            groups={commanderGroups}
            layout={deck.layout}
            onIncrement={() => {}}
            onDecrement={onCommanderDecrement}
            onPickPrint={onPickPrint}
            onSetCover={onSetCover}
            onSetCommander={onSetCommander}
            illegalCards={illegalSet}
          />
        </>
      )}
      {sideGroups.length > 0 && (
        <>
          <div style={sideboardLabelStyle}>
            Sideboard · {Object.values(sideCards).reduce((s, c) => s + c.count, 0)}
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
