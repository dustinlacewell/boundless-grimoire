/**
 * Example decks loaded into a fresh demo session so visitors don't land
 * on an empty deck-builder. Famous archetypes — recognizable names,
 * iconic cards, no surprises.
 *
 * Seeding is a one-shot: gated by a localStorage flag so a user who
 * deletes everything intentionally doesn't see the examples come back.
 */

interface SeedDeck {
  name: string;
  /** Pasted decklist in the standard "4 Card Name" format. */
  decklist: string;
  /**
   * Index into the default custom-format list (see customFormatStore's
   * `defaultFormats`):
   *   0 Standard, 1 Modern, 2 Pioneer, 3 Commander, 4 Pauper, 5 Legacy, 6 Vintage.
   * Demo seeds run against the default formats — if a user has reordered
   * their formats locally, the assigned index may point at the wrong
   * format. Fine for a first-load seed; intentional edits stick.
   */
  formatIndex: number;
}

export const SEED_DECKS: SeedDeck[] = [
  {
    name: "Mono-Red Burn",
    formatIndex: 1, // Modern
    decklist: `
4 Goblin Guide
4 Monastery Swiftspear
4 Eidolon of the Great Revel
4 Lightning Bolt
4 Lava Spike
4 Rift Bolt
4 Boros Charm
4 Skullcrack
4 Searing Blaze
4 Lightning Helix
4 Inspiring Vantage
4 Sacred Foundry
4 Bloodstained Mire
4 Wooded Foothills
4 Mountain
`.trim(),
  },
  {
    name: "Mono-Blue Counters",
    formatIndex: 5, // Legacy
    decklist: `
4 Counterspell
4 Brainstorm
4 Force of Will
4 Snapcaster Mage
4 Ponder
4 Preordain
4 Spell Pierce
4 Daze
4 Vendilion Clique
4 Cryptic Command
20 Island
`.trim(),
  },
  {
    name: "Atraxa Superfriends (Commander)",
    formatIndex: 3, // Commander
    decklist: `
1 Atraxa, Praetors' Voice

1 Jace, the Mind Sculptor
1 Elspeth, Sun's Champion
1 Liliana of the Veil
1 Sorin, Lord of Innistrad
1 Ajani, the Greathearted
1 Garruk Wildspeaker
1 Karn Liberated
1 Ugin, the Spirit Dragon
1 Nicol Bolas, Dragon-God
1 Teferi, Hero of Dominaria
1 Wrenn and Six
1 Liliana, Dreadhorde General
1 Vraska, Golgari Queen
1 Narset, Parter of Veils
1 Tamiyo, Field Researcher
1 Saheeli, Sublime Artificer
1 Tezzeret, Agent of Bolas
1 Vivien, Champion of the Wilds
1 Chandra, Awakened Inferno
1 Nissa, Who Shakes the World
1 Kaya, Orzhov Usurper
1 Dovin, Grand Arbiter
1 Davriel, Rogue Shadowmage
1 Garruk Relentless

1 Doubling Season
1 Inexorable Tide
1 Contagion Engine
1 Contagion Clasp
1 Flux Channeler
1 Tezzeret's Gambit
1 Steady Progress
1 Throne of Geth

1 Sol Ring
1 Fellwar Stone
1 Arcane Signet
1 Chromatic Lantern
1 Birds of Paradise
1 Llanowar Elves
1 Cultivate
1 Kodama's Reach

1 Rhystic Study
1 Mystic Remora
1 Sylvan Library
1 Brainstorm

1 Cyclonic Rift
1 Swords to Plowshares
1 Path to Exile
1 Heroic Intervention
1 Wrath of God
1 Counterspell
1 Beast Within
1 Anguished Unmaking

1 Demonic Tutor
1 Vampiric Tutor

1 Command Tower
1 Exotic Orchard
1 Reflecting Pool
1 City of Brass
1 Mana Confluence
1 Hallowed Fountain
1 Watery Grave
1 Overgrown Tomb
1 Temple Garden
1 Breeding Pool
1 Godless Shrine
1 Misty Rainforest
1 Marsh Flats
1 Verdant Catacombs
1 Flooded Strand
1 Polluted Delta
1 Windswept Heath
1 Bountiful Promenade
1 Morphic Pool
1 Spire of Industry
7 Forest
6 Plains
6 Island
6 Swamp
`.trim(),
  },
];
