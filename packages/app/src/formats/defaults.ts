/**
 * Built-in format presets. These ship with the extension and the demo
 * site. Users can edit or remove them; resetFormats() restores them.
 */
import type { FormatDefinition } from "./types";

function constructed(name: string, format: string): FormatDefinition {
  return {
    name,
    format,
    sets: [],
    fragment: "",
    maxCopies: 4,
    minDeckSize: 60,
    maxDeckSize: null,
    sideboardSize: 15,
    commanderRequired: false,
  };
}

export const DEFAULT_FORMATS: FormatDefinition[] = [
  constructed("Standard", "standard"),
  constructed("Modern", "modern"),
  constructed("Pioneer", "pioneer"),
  constructed("Legacy", "legacy"),
  constructed("Vintage", "vintage"),
  constructed("Pauper", "pauper"),
  {
    name: "Commander",
    format: "commander",
    sets: [],
    fragment: "",
    maxCopies: 1,
    minDeckSize: 100,
    maxDeckSize: 100,
    sideboardSize: 0,
    commanderRequired: true,
  },
];
