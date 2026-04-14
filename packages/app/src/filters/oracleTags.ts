/**
 * Meta-tags: curated groupings of tagger.scryfall.com oracle tags (otag:)
 * that map to common deckbuilding roles.
 *
 * Each meta-tag becomes a single selectable option in the filter UI and
 * expands to an OR'd group of otag: clauses in the Scryfall query.
 *
 * The set×meta-tag index (.ws/cache/set-meta-tags.json) records which
 * meta-tags have cards in which sets, so the dropdown can hide meta-tags
 * that would produce zero results for the currently selected sets.
 *
 * To refresh the index: npx ws tagger_build_set_index
 */

export interface MetaTag {
  id: string;
  label: string;
  otags: string[];
}

export const META_TAGS: MetaTag[] = [
  {
    id: "removal",
    label: "Removal",
    otags: [
      "spot-removal", "removal-creature", "removal-destroy", "removal-exile",
      "removal-bounce", "removal-sacrifice", "removal-nonland", "removal-permanent",
      "removal-fight", "removal-artifact", "removal-enchantment", "removal-planeswalker",
      "removal-toughness", "removal-tuck", "removal-land", "multi-removal",
      "repeatable-removal", "disenchant-naturalize", "banish", "one-sided-fight",
      "pacifism",
    ],
  },
  {
    id: "board-wipe",
    label: "Board Wipes",
    otags: ["sweeper", "sweeper-one-sided", "sweeper-graveyard"],
  },
  {
    id: "card-draw",
    label: "Card Draw",
    otags: [
      "draw-engine", "pure-draw", "repeatable-pure-draw", "burst-draw", "cantrip",
      "card-advantage", "curiosity", "tome", "impulse-creature", "repeatable-impulse",
      "repeatable-impulsive-draw", "loot", "repeatable-loot", "rummage",
      "repeatable-rummage", "plunder", "repeatable-plunder", "mulch",
      "repeatable-mulch", "scry", "surveil",
    ],
  },
  {
    id: "ramp",
    label: "Ramp / Mana",
    otags: [
      "ramp", "mana-dork", "mana-rock", "utility-mana-rock", "adds-multiple-mana",
      "mana-producer", "combat-ramp", "rainbow-land", "cost-reducer", "cost-ignorer",
      "mana-filter", "ritual", "mana-sink", "bottomless-mana-sink",
    ],
  },
  {
    id: "tutors",
    label: "Tutors",
    otags: [
      "tutor-to-hand", "tutor-to-battlefield", "tutor-land-basic",
      "tutor-land-to-battlefield", "tutor-card", "tutor-creature", "tutor-mv",
      "tutor-to-top",
    ],
  },
  {
    id: "recursion",
    label: "Recursion",
    otags: [
      "reanimate-creature", "reanimate-self", "reanimate-cast", "reanimate-artifact",
      "reanimate-land", "reanimate-permanent", "mass-reanimation", "regrowth-creature",
      "regrowth-self", "regrowth-instant", "regrowth-sorcery", "regrowth-artifact",
      "regrowth-permanent", "regrowth-any", "castable-from-graveyard",
    ],
  },
  {
    id: "burn",
    label: "Burn / Damage",
    otags: [
      "burn-creature", "burn-any", "burn-player", "burn-planeswalker",
      "burn-player-each", "pinger", "drain-life", "drain-creature",
    ],
  },
  {
    id: "tokens",
    label: "Tokens",
    otags: [
      "repeatable-creature-tokens", "multiple-bodies", "repeatable-artifact-tokens",
      "repeatable-treasures", "repeatable-clues", "repeatable-food",
    ],
  },
  {
    id: "anthems",
    label: "Anthems / Pump",
    otags: [
      "anthem", "keyword-anthem", "power-boost-to-all", "toughness-boost-to-all",
      "gives-pp-counters", "gives-pp-counters-to-all", "repeatable-pp-counters",
      "enlarge", "giant-growth", "overrun",
    ],
  },
  {
    id: "evasion",
    label: "Evasion",
    otags: [
      "evasion", "unblockable", "gives-flying", "gives-menace", "gives-trample",
      "gives-haste", "gives-unblockable", "saboteur",
    ],
  },
  {
    id: "sacrifice",
    label: "Sacrifice",
    otags: [
      "sacrifice-outlet-creature", "sacrifice-outlet-artifact", "sacrifice-outlet-land",
      "sacrifice-outlet-enchantment", "free-sacrifice-outlet", "death-trigger",
      "death-trigger-self", "morbid", "martyr",
    ],
  },
  {
    id: "lifegain",
    label: "Lifegain",
    otags: [
      "lifegain", "repeatable-lifegain", "lifegain-matters", "drain-life",
      "life-for-cards",
    ],
  },
  {
    id: "mill",
    label: "Mill",
    otags: ["mill-opponent", "mill-any", "mill-self", "mill-each"],
  },
  {
    id: "discard",
    label: "Discard",
    otags: [
      "discard", "discard-outlet", "thoughtseize", "ditch-hand", "specter-ability",
    ],
  },
  {
    id: "copy-theft",
    label: "Copy / Theft",
    otags: [
      "copy-creature", "copy-spell", "copy-instant", "copy-sorcery", "copy-artifact",
      "theft-creature", "theft-cast", "theft-artifact", "shapechange", "clone",
      "nightveil-theft", "threaten",
    ],
  },
  {
    id: "flicker",
    label: "Flicker",
    otags: [
      "flicker-creature", "flicker-slow", "rescue-creature", "repeatable-rescue",
      "man-o-war",
    ],
  },
  {
    id: "counterspells",
    label: "Counterspells",
    otags: [
      "counterspell", "counterspell-soft", "counterspell-reusable",
      "counterspell-creature", "counterspell-ability",
    ],
  },
  {
    id: "protection",
    label: "Protection",
    otags: [
      "protects-creature", "combat-trick", "damage-prevention", "gives-indestructible",
      "gives-hexproof", "gives-protection", "regenerates-self", "cheat-death-self",
    ],
  },
  {
    id: "stax",
    label: "Stax / Hate",
    otags: [
      "group-slug", "hate-graveyard", "hate-artifact", "hate-enchantment",
      "hate-counterspell", "lockdown-creature", "freeze-creature", "hatebear",
      "mass-land-denial", "rhystic", "prevent-cast", "prevent-activation",
    ],
  },
  {
    id: "lands",
    label: "Lands",
    otags: [
      "utility-land", "landfall", "lands-matter", "animate-land",
      "nonbasic-basic-land-type", "sneak-land",
    ],
  },
];
