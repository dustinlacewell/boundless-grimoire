/**
 * Single source of truth for the version string both consumers display
 * (extension's About tab + marketing homepage About tab).
 *
 * Bumping a release: edit this constant AND the matching `version`
 * fields in every workspace package.json + the extension's
 * `public/manifest.json`. The Chrome Web Store reads from the manifest;
 * everything else reads from here.
 */
export const APP_VERSION = "0.5.1";
