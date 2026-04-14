# @boundless-grimoire/ui

Design system for Boundless Grimoire. Tokens, primitives, and the brand mark — used by both the Chrome extension and the marketing site.

This package is **design-only**. App-domain concepts (cards, decks, formats, stores) live in their consumer; nothing here knows what Magic: the Gathering is.

## What's in the box

| Module | What it is |
| --- | --- |
| `colors` | Design tokens — palette consumed by every primitive. |
| `GrimoireMark` | A single static instance of the brand mark — closed or open book. No transitions. |
| `GrimoireLogo` | Two `GrimoireMark`s stacked that cross-fade on hover (or when forced via the `open` prop). |
| `Surface`, `Pill`, `Spinner`, `HScroll` | Layout & feedback primitives. |
| `Button`, `IconButton`, `ToggleButton`, `ButtonGroup` | Button family. |
| `Dropdown`, `MultiSelect`, `Popover`, `SearchInput` | Form / overlay primitives. |
| `TrashIcon`, `DuplicateIcon`, `GearIcon`, `ClipboardIcon`, `HelpIcon` | Inline SVG icons. |
| `useWheelToHorizontal` | Translates vertical scroll wheel into horizontal scroll for ribbons. |

## Usage

```ts
import { Button, GrimoireLogo, colors } from "@boundless-grimoire/ui";
```

Components import their own CSS where needed (e.g. `GrimoireLogo` pulls in `grimoire-logo.css` with the icon assets co-located). Bundlers (Vite, Astro, webpack, esbuild) pick this up automatically — no manual stylesheet wiring required.

## Design choices worth knowing

- **No build step.** Source `.ts/.tsx` is exposed via the package `exports` map. Consumers must use `moduleResolution: "Bundler"` (or `NodeNext`) and a bundler that understands TS — every part of this monorepo already does.
- **Side-effect-free except for CSS.** `"sideEffects": ["**/*.css"]` lets bundlers tree-shake unused JS exports while preserving co-located stylesheet imports.
- **No runtime dependencies on Chrome APIs.** The package is portable across any React 18+ host. Asset URLs in CSS use plain relative `url("./icon.png")` so each consumer's bundler rewrites them correctly.
- **Inline `style` over Tailwind.** Primitives ship their own self-contained styling so they look the same regardless of whether the consumer has a utility-CSS framework.

## Adding a component

1. Drop the `.tsx` (and `.css` if needed) into `src/`.
2. Re-export it from `src/index.ts` — including any types consumers will reference.
3. If it imports a stylesheet or asset, no extra config needed; the existing `sideEffects` allow-list covers it.
4. Keep it design-only. If you find yourself importing a store, a deck type, or `chrome.*`, the component belongs in the extension, not here.

## Local development

There is no separate dev server for this package. Both consumers (`extensions/boundless-grimoire`, `sites/homepage`) read source directly via the workspace dependency, so changes here are picked up by their dev servers immediately.
