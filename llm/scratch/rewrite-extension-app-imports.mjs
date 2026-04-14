// Rewrite the extension's relative imports of moved-to-packages/app
// modules into `@boundless-grimoire/app` named imports.
//
// The extension files that survive the move are:
//   - background/*           (service worker — uses scryfall/wire only)
//   - content/index.tsx      (boot wiring)
//   - scryfall/{rpc,wire}.ts (extension transport — no app refs)
//   - services/extension/*   (extension service impls)
//   - sync/*                 (postMessage bridge to MAIN-world untap)
//   - ui/{tailwind.css,injectKeyrune.ts}
//
// Anything they previously imported from analytics/, cards/, commands/,
// decks/, filters/, help/, search/, settings/, storage/ (deckStore + types
// + persistedSlice + migrations), services/{index,storage,scryfall,untapSync},
// scryfall/{types,errors,snapshot}, content/{App,Overlay,TriggerButton},
// ui/useCtrlWheelCardResize → now goes via the package.
//
// Run from repo root.

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";

const ROOT = "extensions/boundless-grimoire/src";

// All files now in @boundless-grimoire/app. Match relative paths whose
// final segment is one of these and rewrite them to a single barrel
// import — the barrel re-exports everything we need.
const APP_DIRS = new Set([
  "analytics", "cards", "commands", "decks", "filters", "help",
  "search", "settings", "storage",
]);

const APP_FILES_IN_SCRYFALL = new Set(["types", "errors", "snapshot"]);
const APP_FILES_IN_SERVICES = new Set(["index", "storage", "scryfall", "untapSync"]);
const APP_FILES_IN_CONTENT = new Set(["App", "Overlay", "TriggerButton"]);

function isAppPath(spec) {
  // spec like "../../scryfall/types" or "../decks/parseDecklist"
  const m = spec.match(/^(?:\.\.\/)+(.+?)(?:\.\w+)?$/);
  if (!m) return false;
  const rest = m[1].replace(/\\/g, "/");
  const [first, second] = rest.split("/");
  if (APP_DIRS.has(first)) return true;
  if (first === "scryfall" && APP_FILES_IN_SCRYFALL.has(second)) return true;
  if (first === "services" && (APP_FILES_IN_SERVICES.has(second) || second === undefined)) return true;
  if (first === "content" && APP_FILES_IN_CONTENT.has(second)) return true;
  if (first === "ui" && second === "useCtrlWheelCardResize") return true;
  return false;
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if ([".ts", ".tsx"].includes(extname(p))) yield p;
  }
}

let touched = 0;
for await (const file of walk(ROOT)) {
  let src = await readFile(file, "utf8");

  // Match `from "<spec>"` and `import("<spec>")`. Group on quotes for
  // simplicity; assume no escaped quotes inside spec strings.
  const re = /(from\s+|import\s*\(\s*)"([^"]+)"/g;
  let changed = false;
  src = src.replace(re, (full, prefix, spec) => {
    if (!isAppPath(spec)) return full;
    changed = true;
    return `${prefix}"@boundless-grimoire/app"`;
  });

  if (changed) {
    await writeFile(file, src);
    touched++;
    console.log("rewrote", file);
  }
}
console.log(`\n${touched} files updated`);
