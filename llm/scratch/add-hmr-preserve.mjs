// Add `preserveOnHmr(useXStore, import.meta.hot)` to every Zustand
// store in packages/app/src/. Idempotent — skips files that already
// have the call.
//
// Run from repo root: node llm/scratch/add-hmr-preserve.mjs

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, extname, relative, dirname } from "node:path";

const ROOT = "packages/app/src";
const HELPER_PATH = "packages/app/src/storage/preserveOnHmr.ts";

const STORE_RE = /export const (use\w+Store) = create</;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if ([".ts", ".tsx"].includes(extname(p))) yield p;
  }
}

function relativeImport(fromFile, toFile) {
  let rel = relative(dirname(fromFile), toFile).replace(/\\/g, "/").replace(/\.tsx?$/, "");
  if (!rel.startsWith(".")) rel = "./" + rel;
  return rel;
}

let touched = 0;
for await (const file of walk(ROOT)) {
  let src = await readFile(file, "utf8");
  const m = src.match(STORE_RE);
  if (!m) continue;
  const storeName = m[1];

  // Skip the helper itself + already-instrumented files.
  if (file.endsWith("preserveOnHmr.ts")) continue;
  if (src.includes("preserveOnHmr(")) continue;

  const importPath = relativeImport(file, HELPER_PATH);
  const importLine = `import { preserveOnHmr } from "${importPath}";\n`;

  // Add import after the last existing import statement.
  const lines = src.split("\n");
  let lastImport = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("import ")) lastImport = i;
  }
  if (lastImport === -1) {
    src = importLine + src;
  } else {
    lines.splice(lastImport + 1, 0, importLine.trimEnd());
    src = lines.join("\n");
  }

  // Append the preserveOnHmr call at the end of the file.
  if (!src.endsWith("\n")) src += "\n";
  src += `\npreserveOnHmr(${storeName}, import.meta.hot);\n`;

  await writeFile(file, src);
  touched++;
  console.log("instrumented", file, "→", storeName);
}
console.log(`\n${touched} files updated`);
