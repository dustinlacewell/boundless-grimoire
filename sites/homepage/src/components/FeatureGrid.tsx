import {
  Search,
  BarChart3,
  Layers,
  RefreshCw,
  Filter,
  Bookmark,
  Clipboard,
  Settings2,
  Shield,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Feature {
  Icon: LucideIcon;
  title: string;
  body: string;
}

const FEATURES: Feature[] = [
  {
    Icon: Search,
    title: "Live Scryfall search",
    body: "Type-ahead search across the full Scryfall catalog with infinite scroll and image-first results.",
  },
  {
    Icon: Filter,
    title: "Full query language",
    body: "Filter by colors, rarity, type, set, oracle text, and oracle tags. Combine custom Scryfall queries with OR / AND.",
  },
  {
    Icon: Layers,
    title: "Smart deck columns",
    body: "Cards auto-group by type, CMC, or your own meta categories. Sideboard included.",
  },
  {
    Icon: BarChart3,
    title: "Inline analytics",
    body: "Mana curve, creature/non-creature stack, power & toughness curves, color demand vs. supply, rarity breakdown.",
  },
  {
    Icon: RefreshCw,
    title: "Two-way untap.in sync",
    body: "Imports your existing untap decks and pushes every change back automatically.",
  },
  {
    Icon: Bookmark,
    title: "Favorites, pins & presets",
    body: "Pin cards so they stay visible regardless of filters. Save filter presets per workflow.",
  },
  {
    Icon: Shield,
    title: "Format legality",
    body: "Define formats as Scryfall query fragments. Illegal cards get badged the moment the format changes.",
  },
  {
    Icon: Clipboard,
    title: "Paste from anywhere",
    body: "Imports decklists from Archidekt, Moxfield, MTGO, Scryfall, XMage. Export with or without set IDs.",
  },
  {
    Icon: Settings2,
    title: "Make it yours",
    body: "Custom oracle-tag toggles, named formats, undo history, layout preferences — all persisted per deck.",
  },
];

export function FeatureGrid() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">
        Built for serious deck-building
      </h2>
      <p className="text-center text-text-muted max-w-2xl mx-auto mb-12">
        Everything you'd reach for in a real builder, layered on top of the
        site you're already playing on.
      </p>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ Icon, title, body }) => (
          <div
            key={title}
            className="rounded-lg border border-border bg-bg-1 p-5 hover:border-border-strong transition"
          >
            <Icon className="text-accent mb-3" size={22} strokeWidth={2} />
            <h3 className="font-semibold mb-1.5">{title}</h3>
            <p className="text-sm text-text-muted leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
