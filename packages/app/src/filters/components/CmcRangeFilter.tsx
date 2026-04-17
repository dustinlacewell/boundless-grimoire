/**
 * Dual-thumb CMC range slider.
 *
 * Interaction model:
 *   - Left mouse button drags the LOW (min) thumb.
 *   - Right mouse button drags the HIGH (max) thumb.
 *   - Both thumbs share one track. The min thumb can't go past max
 *     and vice versa.
 *   - Double-click a thumb to reset that side (clear the bound).
 *   - The slider debounces changes at 300 ms so Scryfall searches
 *     don't fire on every pixel of a drag.
 *
 * Range is 0–16+ (Scryfall's practical CMC ceiling). A null value
 * means "unbounded on that side."
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { colors } from "@boundless-grimoire/ui";
import { useFilterStore } from "../store";

const MIN = 0;
const MAX = 16;
const DEBOUNCE_MS = 300;
const TRACK_H = 6;
const THUMB_W = 14;
const THUMB_H = 22;

const trackOuter: React.CSSProperties = {
  position: "relative",
  height: THUMB_H,
  cursor: "crosshair",
  userSelect: "none",
  touchAction: "none",
};

const trackBg: React.CSSProperties = {
  position: "absolute",
  top: (THUMB_H - TRACK_H) / 2,
  left: 0,
  right: 0,
  height: TRACK_H,
  borderRadius: TRACK_H / 2,
  background: colors.bg3,
};

const thumbBase: React.CSSProperties = {
  position: "absolute",
  top: 0,
  width: THUMB_W,
  height: THUMB_H,
  borderRadius: 4,
  border: `1px solid ${colors.borderStrong}`,
  cursor: "grab",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 9,
  fontWeight: 700,
  transition: "box-shadow 0.1s",
};

function pctToValue(pct: number): number {
  return Math.round(MIN + pct * (MAX - MIN));
}

function valueToPct(v: number): number {
  return (v - MIN) / (MAX - MIN);
}

export function CmcRangeFilter() {
  const cmcMin = useFilterStore((s) => s.state.cmcMin);
  const cmcMax = useFilterStore((s) => s.state.cmcMax);
  const patch = useFilterStore((s) => s.patch);

  const [localMin, setLocalMin] = useState<number | null>(cmcMin);
  const [localMax, setLocalMax] = useState<number | null>(cmcMax);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"min" | "max" | null>(null);

  // Sync incoming store → local when not dragging
  useEffect(() => {
    if (dragging.current) return;
    setLocalMin(cmcMin);
    setLocalMax(cmcMax);
  }, [cmcMin, cmcMax]);

  const commitDebounced = useCallback(
    (min: number | null, max: number | null) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        patch({ cmcMin: min, cmcMax: max });
      }, DEBOUNCE_MS);
    },
    [patch],
  );

  const pctFromEvent = useCallback((clientX: number): number => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      // Left button (0) → min thumb, right button (2) → max thumb
      const side = e.button === 2 ? "max" : "min";
      dragging.current = side;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      const pct = pctFromEvent(e.clientX);
      const v = pctToValue(pct);
      if (side === "min") {
        const clamped = localMax != null ? Math.min(v, localMax) : v;
        setLocalMin(clamped);
        commitDebounced(clamped, localMax);
      } else {
        const clamped = localMin != null ? Math.max(v, localMin) : v;
        setLocalMax(clamped);
        commitDebounced(localMin, clamped);
      }
    },
    [localMin, localMax, pctFromEvent, commitDebounced],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const pct = pctFromEvent(e.clientX);
      const v = pctToValue(pct);
      if (dragging.current === "min") {
        const clamped = localMax != null ? Math.min(v, localMax) : v;
        setLocalMin(clamped);
        commitDebounced(clamped, localMax);
      } else {
        const clamped = localMin != null ? Math.max(v, localMin) : v;
        setLocalMax(clamped);
        commitDebounced(localMin, clamped);
      }
    },
    [localMin, localMax, pctFromEvent, commitDebounced],
  );

  const onPointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const clearMin = useCallback(() => {
    setLocalMin(null);
    patch({ cmcMin: null });
  }, [patch]);

  const clearMax = useCallback(() => {
    setLocalMax(null);
    patch({ cmcMax: null });
  }, [patch]);

  const minPct = localMin != null ? valueToPct(localMin) : 0;
  const maxPct = localMax != null ? valueToPct(localMax) : 1;

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: 600,
    minWidth: 28,
    textAlign: "center",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{ ...labelStyle, cursor: localMin != null ? "pointer" : "default", color: localMin != null ? colors.text : colors.textMuted }}
          onClick={clearMin}
          title={localMin != null ? "Click to clear min" : "No minimum"}
        >
          {localMin ?? "—"}
        </span>
        <div
          ref={trackRef}
          style={{ ...trackOuter, flex: 1 }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onContextMenu={onContextMenu}
        >
          <div style={trackBg} />
          {/* Active range highlight */}
          <div
            style={{
              position: "absolute",
              top: (THUMB_H - TRACK_H) / 2,
              left: `${minPct * 100}%`,
              width: `${(maxPct - minPct) * 100}%`,
              height: TRACK_H,
              background: colors.accent,
              opacity: 0.4,
              borderRadius: TRACK_H / 2,
              pointerEvents: "none",
            }}
          />
          {/* Min thumb */}
          {localMin != null && (
            <div
              style={{
                ...thumbBase,
                left: `calc(${minPct * 100}% - ${THUMB_W / 2}px)`,
                background: colors.bg2,
                color: colors.text,
                borderColor: colors.accent,
              }}
              onDoubleClick={clearMin}
              title="Min CMC (left-click drag to adjust, double-click to clear)"
            >
              {localMin}
            </div>
          )}
          {/* Max thumb */}
          {localMax != null && (
            <div
              style={{
                ...thumbBase,
                left: `calc(${maxPct * 100}% - ${THUMB_W / 2}px)`,
                background: colors.bg2,
                color: colors.text,
                borderColor: colors.accent,
              }}
              onDoubleClick={clearMax}
              title="Max CMC (right-click drag to adjust, double-click to clear)"
            >
              {localMax}
            </div>
          )}
        </div>
        <span
          style={{ ...labelStyle, cursor: localMax != null ? "pointer" : "default", color: localMax != null ? colors.text : colors.textMuted }}
          onClick={clearMax}
          title={localMax != null ? "Click to clear max" : "No maximum"}
        >
          {localMax != null ? (localMax >= MAX ? `${MAX}+` : localMax) : "—"}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "center", fontSize: 10, color: colors.textMuted, gap: 4 }}>
        <span>left-click: min</span>
        <span style={{ opacity: 0.4 }}>|</span>
        <span>right-click: max</span>
      </div>
    </div>
  );
}
