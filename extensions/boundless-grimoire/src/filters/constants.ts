/**
 * Hardcoded option lists for filters whose value space is small and stable.
 * Anything large/changing (sets, subtypes) lives in catalogs.ts instead.
 */
import type { ColorLetter, ColorMode, Rarity, SortDir, SortField } from "./types";

export const COLORS: { value: ColorLetter; name: string; bg: string; fg: string }[] = [
  { value: "W", name: "White", bg: "#fffbd5", fg: "#766c36" },
  { value: "U", name: "Blue",  bg: "#aae0fa", fg: "#1c5b8c" },
  { value: "B", name: "Black", bg: "#cbc2bf", fg: "#1a0e0a" },
  { value: "R", name: "Red",   bg: "#f9aa8f", fg: "#85160e" },
  { value: "G", name: "Green", bg: "#9bd3ae", fg: "#16482b" },
];

export const COLOR_MODES: { value: ColorMode; label: string; title: string }[] = [
  { value: "identity-subset", label: "ID⊆", title: "Color identity is a subset (Commander rules)" },
  { value: "colors-subset",   label: "C⊆",  title: "Card colors are a subset of selected" },
  { value: "colors-exact",    label: "C=",  title: "Card colors exactly match selected" },
];

export const RARITIES: { value: Rarity; label: string; bg: string }[] = [
  { value: "common",   label: "C", bg: "#1a1a1a" },
  { value: "uncommon", label: "U", bg: "#a0a0a0" },
  { value: "rare",     label: "R", bg: "#c8a44a" },
  { value: "mythic",   label: "M", bg: "#d96a2c" },
];

export const TYPES = [
  "creature",
  "instant",
  "sorcery",
  "artifact",
  "enchantment",
  "planeswalker",
  "land",
  "battle",
  "tribal",
] as const;

export const SUPERTYPES = ["legendary", "basic", "snow", "world"] as const;

export const FORMATS = [
  { value: "standard", label: "Standard" },
  { value: "pioneer", label: "Pioneer" },
  { value: "modern", label: "Modern" },
  { value: "pauper", label: "Pauper" },
  { value: "legacy", label: "Legacy" },
  { value: "vintage", label: "Vintage" },
  { value: "commander", label: "Commander" },
  { value: "brawl", label: "Brawl" },
] as const;

export const SORT_FIELDS: { value: SortField; label: string }[] = [
  { value: "name",      label: "Name" },
  { value: "cmc",       label: "CMC" },
  { value: "power",     label: "Pow" },
  { value: "toughness", label: "Tou" },
];

export const SORT_DIRS: { value: SortDir; label: string }[] = [
  { value: "asc",  label: "↑" },
  { value: "desc", label: "↓" },
];
