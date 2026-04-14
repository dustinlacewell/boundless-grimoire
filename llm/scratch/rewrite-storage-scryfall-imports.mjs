// One-shot rewriter that drops the chromeStorage / scryfall/client back-
// compat shims. Both files were holding the old import paths constant
// while we moved the underlying impl behind a services seam; now that
// the seam is in place, every consumer should import directly from
// services/{storage,scryfall}.
//
// Run from repo root: node llm/scratch/rewrite-storage-scryfall-imports.mjs

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";

const ROOT = "extensions/boundless-grimoire/src";

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if ([".ts", ".tsx"].includes(extname(p))) yield p;
  }
}

let touched = 0;
for await (const file of walk(ROOT)) {
  // Don't rewrite the shims themselves (they'll be deleted) or any of the
  // services/ files (they ARE the new home).
  if (file.endsWith("chromeStorage.ts") || file.endsWith("scryfall/client.ts")) continue;
  if (file.includes("/services/") || file.includes("\\services\\")) continue;

  let src = await readFile(file, "utf8");
  let changed = false;

  // scryfall/client → services/scryfall (function names + types unchanged)
  const scryfallRe = /from\s+"((?:\.\.\/)+)scryfall\/client"/g;
  const newSrc1 = src.replace(scryfallRe, (_m, dots) => `from "${dots}services/scryfall"`);
  if (newSrc1 !== src) {
    src = newSrc1;
    changed = true;
  }

  // storage/chromeStorage → services/storage with API rename:
  //   getItem(k)       → storage.get(k)
  //   setItem(k, v)    → storage.set(k, v)
  //   removeItem(k)    → storage.remove(k)
  const storageRe = /import\s*\{\s*([^}]+)\s*\}\s*from\s+"((?:\.\.\/)+)storage\/chromeStorage"/g;
  const newSrc2 = src.replace(storageRe, (_m, _names, dots) => {
    return `import { storage } from "${dots}services/storage"`;
  });
  if (newSrc2 !== src) {
    src = newSrc2;
    // Replace bare references to getItem/setItem/removeItem with storage.*
    // Use word boundaries to avoid clobbering other identifiers.
    src = src.replace(/\bgetItem\b/g, "storage.get");
    src = src.replace(/\bsetItem\b/g, "storage.set");
    src = src.replace(/\bremoveItem\b/g, "storage.remove");
    changed = true;
  }

  if (changed) {
    await writeFile(file, src);
    touched++;
    console.log("rewrote", file);
  }
}
console.log(`\n${touched} files updated`);
