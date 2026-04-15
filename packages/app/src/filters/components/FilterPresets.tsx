import { useRef, useState } from "react";
import { Popover } from "@boundless-grimoire/ui";
import { Button } from "@boundless-grimoire/ui";
import { colors } from "@boundless-grimoire/ui";
import { useFilterStore } from "../store";
import {
  usePresetStore,
  savePreset,
  deletePreset,
  type FilterPreset,
} from "../presetStore";
import type { FilterState } from "../types";

// ---------------------------------------------------------------------------
// Copy / Paste
// ---------------------------------------------------------------------------

function useCopyPaste() {
  const state = useFilterStore((s) => s.state);
  const patch = useFilterStore((s) => s.patch);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(state));
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed: FilterState = JSON.parse(text);
      // Validate shape — must have at least the format key to look legit
      if (typeof parsed !== "object" || parsed === null || !("format" in parsed)) return;
      patch(parsed);
    } catch {
      // Silently ignore bad clipboard content
    }
  };

  return { copy, paste, copied };
}

// ---------------------------------------------------------------------------
// Save-preset inline input
// ---------------------------------------------------------------------------

function SaveInput({ onSave, onCancel }: { onSave: (name: string) => void; onCancel: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");

  const commit = () => {
    const trimmed = name.trim();
    if (trimmed) onSave(trimmed);
  };

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <input
        ref={inputRef}
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Preset name…"
        style={{
          width: 140,
          height: 26,
          padding: "0 8px",
          background: colors.bg1,
          color: colors.text,
          border: `1px solid ${colors.border}`,
          borderRadius: 4,
          fontFamily: "system-ui, sans-serif",
          fontSize: 12,
          outline: "none",
          boxSizing: "border-box",
        }}
      />
      <Button size="sm" variant="primary" onClick={commit} style={{ height: 26 }}>
        Save
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancel} style={{ height: 26 }}>
        Cancel
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preset list popover
// ---------------------------------------------------------------------------

function PresetRow({
  preset,
  onLoad,
  onDelete,
}: {
  preset: FilterPreset;
  onLoad: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        cursor: "pointer",
        fontSize: 13,
      }}
      onClick={onLoad}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = colors.bg3;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {preset.name}
      </span>
      <button
        type="button"
        title="Delete preset"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        style={{
          width: 20,
          height: 20,
          borderRadius: 4,
          background: "transparent",
          color: colors.textMuted,
          border: "none",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          fontSize: 13,
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.color = colors.danger;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color = colors.textMuted;
        }}
      >
        ✕
      </button>
    </div>
  );
}

function LoadPopover() {
  const [open, setOpen] = useState(false);
  const presets = usePresetStore((s) => s.presets);
  const patch = useFilterStore((s) => s.patch);

  const load = (filters: FilterState) => {
    patch({ ...filters });
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onClose={() => setOpen(false)}
      align="left"
      minWidth={200}
      maxHeight={280}
      trigger={
        <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)}>
          Load
        </Button>
      }
    >
      <div style={{ overflowY: "auto", padding: 4 }}>
        {presets.length === 0 ? (
          <div style={{ padding: "10px 12px", fontSize: 12, color: colors.textMuted }}>
            No saved presets
          </div>
        ) : (
          presets.map((p) => (
            <PresetRow
              key={p.id}
              preset={p}
              onLoad={() => load(p.filters)}
              onDelete={() => deletePreset(p.id)}
            />
          ))
        )}
      </div>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function FilterPresets() {
  const [saving, setSaving] = useState(false);
  const state = useFilterStore((s) => s.state);
  const reset = useFilterStore((s) => s.reset);
  const { copy, paste, copied } = useCopyPaste();

  const handleSave = (name: string) => {
    savePreset(name, state);
    setSaving(false);
  };

  if (saving) return <SaveInput onSave={handleSave} onCancel={() => setSaving(false)} />;

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setSaving(true)}>
        Save Preset
      </Button>
      <LoadPopover />
      <div style={dividerStyle} />
      <Button size="sm" variant="ghost" onClick={copy}>
        {copied ? "Copied!" : "Copy Filters"}
      </Button>
      <Button size="sm" variant="ghost" onClick={paste}>
        Paste Filters
      </Button>
      <div style={dividerStyle} />
      <Button size="sm" variant="ghost" onClick={reset}>
        Reset
      </Button>
    </>
  );
}

const dividerStyle: React.CSSProperties = {
  width: 1,
  height: 18,
  background: colors.border,
  flexShrink: 0,
};
