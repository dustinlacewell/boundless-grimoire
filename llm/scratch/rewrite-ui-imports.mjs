// One-shot import rewriter. Replaces `from "(../)+ui/<name>"` with
// `from "@boundless-grimoire/ui"` for every module that moved into the
// shared package, leaving the still-extension-local modules
// (useCtrlWheelCardResize, injectStyles) alone.
//
// Run from repo root: node llm/scratch/rewrite-ui-imports.mjs

import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";

const ROOT = "extensions/boundless-grimoire/src";
const MOVED = [
  "colors",
  "Surface",
  "Pill",
  "Spinner",
  "HScroll",
  "Button",
  "ButtonGroup",
  "IconButton",
  "ToggleButton",
  "Dropdown",
  "MultiSelect",
  "Popover",
  "SearchInput",
  "GrimoireLogo",
  "useWheelToHorizontal",
  "icons/Icons",
];

// One regex per moved module: `from "<dots>/ui/<name>"`
const patterns = MOVED.map(
  (name) => new RegExp(`from\\s+"(?:\\.\\./)+ui/${name.replace("/", "\\/")}"`, "g"),
);

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
  let changed = false;
  for (const re of patterns) {
    if (re.test(src)) {
      src = src.replace(re, `from "@boundless-grimoire/ui"`);
      changed = true;
    }
  }
  if (changed) {
    await writeFile(file, src);
    touched++;
    console.log("rewrote", file);
  }
}
console.log(`\n${touched} files updated`);
