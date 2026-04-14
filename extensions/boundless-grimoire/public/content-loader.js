/**
 * Classic-script loader for the content entry.
 *
 * Chrome's `content_scripts[].js` runs as a classic script — top-level
 * `import` statements aren't allowed. So the manifest references this
 * loader, and the loader dynamically imports the real ES module entry,
 * which in turn pulls in all its chunks from chrome-extension://.
 *
 * Side-effect: the entry's CSS (extracted by Vite to `content.css`)
 * is still injected by the manifest's `content_scripts[].css`, so the
 * stylesheet is in place before this loader even runs.
 */
(async () => {
  try {
    await import(chrome.runtime.getURL("content.js"));
  } catch (err) {
    console.error("[boundless-grimoire] failed to load content entry:", err);
  }
})();
