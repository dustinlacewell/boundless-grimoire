/**
 * Classic-script loader for the MAIN-world bridge.
 *
 * Same shape as content-loader.js but for the script that runs in
 * untap.in's MAIN world. Even though the bridge has minimal source,
 * we keep the loader pattern uniform so all extension entries are
 * loaded the same way.
 */
(async () => {
  try {
    await import(chrome.runtime.getURL("untapBridge.js"));
  } catch (err) {
    console.error("[boundless-grimoire] failed to load untapBridge:", err);
  }
})();
