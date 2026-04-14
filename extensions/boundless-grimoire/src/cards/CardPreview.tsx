import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MAX_CARD_WIDTH } from "../search/gridSizeStore";
import { useSettingsStore } from "../settings/settingsStore";
import { colors } from "../ui/colors";
import { useCardPreviewStore, mousePos, hideCardPreview } from "./cardPreviewStore";
import { imageUrl } from "./imageUrl";
import { ManaCost } from "./ManaCost";
import { OracleText } from "./OracleText";
import { RarityIcon } from "../filters/icons/RarityIcon";
import { cardHeightFor, CARD_ASPECT } from "./CardImage";

// Card preview renders the image at the deck's max-zoom width so a hover
// peek is as big as the largest tile the user can possibly see elsewhere.
const IMAGE_W = MAX_CARD_WIDTH;
const IMAGE_H = Math.round(IMAGE_W / CARD_ASPECT);
const SIDE_W = 300;
const PANEL_W = IMAGE_W + SIDE_W;
const PANEL_H = IMAGE_H;
const OFFSET = 18;

const wrapStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  zIndex: 2147483647,
  width: PANEL_W,
  height: PANEL_H,
  background: colors.accent,
  border: `1px solid ${colors.borderStrong}`,
  borderRadius: 10,
  boxShadow: "0 12px 36px rgba(0,0,0,0.7)",
  display: "flex",
  gap: 2,
  overflow: "hidden",
  pointerEvents: "none",
  fontFamily: "system-ui, sans-serif",
  color: colors.text,
};

const sideStyle: React.CSSProperties = {
  width: SIDE_W,
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 0,
  boxSizing: "border-box",
  overflow: "hidden",
  background: colors.bg1,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
};

const dividerStyle: React.CSSProperties = {
  borderBottom: `1px solid ${colors.border}`,
  marginBottom: 6,
  paddingBottom: 6,
};

const nameStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  lineHeight: 1.25,
  flex: 1,
  minWidth: 0,
};

const typeStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: colors.textMuted,
  flex: 1,
  minWidth: 0,
};

const oracleBlockStyle: React.CSSProperties = {
  fontSize: 12.5,
  lineHeight: 1.5,
  overflow: "auto",
  flex: 1,
  color: colors.text,
  padding: "6px 0",
};

const setLineStyle: React.CSSProperties = {
  fontSize: 11,
  color: colors.textFaint,
  flex: 1,
  minWidth: 0,
};

const ptStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: 0.4,
  padding: "1px 8px",
  borderRadius: 4,
  background: colors.bg3,
  border: `1px solid ${colors.borderStrong}`,
};

/** Compute the panel's position so it stays inside the viewport. */
function computePosition(mx: number, my: number, pw: number, ph: number): { x: number; y: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let x = mx + OFFSET;
  let y = my + OFFSET;
  if (x + pw > vw - 8) x = mx - pw - OFFSET;
  if (y + ph > vh - 8) y = vh - ph - 8;
  if (y < 8) y = 8;
  if (x < 8) x = 8;
  return { x, y };
}

const PRINT_W = 360;
const PRINT_H = cardHeightFor(PRINT_W);
const LABEL_H = 36;

const printWrapStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  zIndex: 2147483647,
  width: PRINT_W,
  background: colors.bg1,
  border: `1px solid ${colors.borderStrong}`,
  borderRadius: 10,
  boxShadow: "0 12px 36px rgba(0,0,0,0.7)",
  overflow: "hidden",
  pointerEvents: "none",
  fontFamily: "system-ui, sans-serif",
  color: colors.text,
};

const printLabelStyle: React.CSSProperties = {
  height: LABEL_H,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  fontWeight: 600,
  color: colors.textMuted,
  padding: "0 8px",
  textAlign: "center",
  lineHeight: 1.3,
};

/**
 * Floating card preview that follows the mouse while Ctrl is held over
 * a card. Mounted into document.body via portal so no overflow ancestor
 * can clip it. Position updates happen via direct DOM transform writes
 * so mousemove doesn't thrash React state.
 */
export function CardPreview() {
  const snapshot = useCardPreviewStore((s) => s.snapshot);
  const printMode = useCardPreviewStore((s) => s.printMode);
  const previewMode = useSettingsStore((s) => s.settings.previewMode);
  const ref = useRef<HTMLDivElement>(null);

  const showImage = previewMode !== "text";
  const showText = previewMode !== "image";

  // Panel width: image-only / text-only shrinks; both is the full width.
  const fullPanelW = (showImage ? IMAGE_W : 0) + (showText ? SIDE_W : 0);
  const panelW = printMode ? PRINT_W : fullPanelW;
  const panelH = printMode ? PRINT_H + LABEL_H : PANEL_H;

  // Position the panel imperatively on every mousemove while open. Also
  // hide the preview if Ctrl is released without a fresh keydown.
  useEffect(() => {
    if (!snapshot) return;
    const apply = () => {
      const node = ref.current;
      if (!node) return;
      const { x, y } = computePosition(mousePos.x, mousePos.y, panelW, panelH);
      node.style.transform = `translate(${x}px, ${y}px)`;
    };
    apply();
    const onMove = (e: MouseEvent) => {
      mousePos.x = e.clientX;
      mousePos.y = e.clientY;
      if (!e.ctrlKey) {
        hideCardPreview();
        return;
      }
      apply();
    };
    // Dismiss on any keyup where Ctrl is no longer held. Using ctrlKey
    // rather than `key === "Control"` catches the release reliably even
    // across platform/layout quirks, and capture phase runs before any
    // page listener that might stop propagation.
    const onKeyUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey) hideCardPreview();
    };
    // If focus leaves the window while Ctrl is held, we never see a
    // keyup — make sure the preview doesn't get stuck.
    const onBlur = () => hideCardPreview();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", onBlur);
    };
  }, [snapshot, panelW, panelH]);

  // Initial position before the first mousemove.
  useLayoutEffect(() => {
    if (!snapshot || !ref.current) return;
    const { x, y } = computePosition(mousePos.x, mousePos.y, panelW, panelH);
    ref.current.style.transform = `translate(${x}px, ${y}px)`;
  }, [snapshot, panelW, panelH]);

  if (!snapshot) return null;

  const url =
    imageUrl(snapshot, "normal") ?? imageUrl(snapshot, "large") ?? null;

  if (printMode) {
    const setLabel = [
      snapshot.set_name ?? snapshot.set?.toUpperCase() ?? "—",
      snapshot.collector_number ? `#${snapshot.collector_number}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    return createPortal(
      <div ref={ref} style={printWrapStyle}>
        <div
          style={{
            width: PRINT_W,
            height: PRINT_H,
            background: colors.bg0,
            backgroundImage: url ? `url(${url})` : undefined,
            backgroundSize: "102%",
            backgroundPosition: "center",
          }}
        />
        <div style={printLabelStyle}>{setLabel}</div>
      </div>,
      document.getElementById("boundless-grimoire-root") ?? document.body,
    );
  }

  // Pull oracle text / pt from card_faces if not on top level (DFCs).
  const face = snapshot.card_faces?.[0];
  const oracleText = snapshot.oracle_text ?? face?.oracle_text ?? "";
  const power = snapshot.power ?? face?.power;
  const toughness = snapshot.toughness ?? face?.toughness;
  const loyalty = snapshot.loyalty ?? face?.loyalty;
  const manaCost = snapshot.mana_cost ?? face?.mana_cost ?? "";

  // Round only the outer corners based on which half is visible.
  const imageRadius = showText ? "10px 0 0 10px" : "10px";
  const textRadius = showImage ? "0 10px 10px 0" : "10px";

  return createPortal(
    <div ref={ref} style={{ ...wrapStyle, width: fullPanelW }}>
      {showImage && (
        <div
          style={{
            width: IMAGE_W,
            height: IMAGE_H,
            flex: "0 0 auto",
            background: colors.bg0,
            borderRadius: imageRadius,
            overflow: "hidden",
          }}
        >
          {url && (
            <img
              src={url}
              alt={snapshot.name}
              draggable={false}
              style={{ width: "100%", height: "100%", display: "block", objectFit: "cover", scale: "1.02" }}
            />
          )}
        </div>
      )}
      {showText && (
        <div style={{ ...sideStyle, borderRadius: textRadius }}>
          {/* title · cost */}
          <div style={{ ...rowStyle, ...dividerStyle }}>
            <div style={nameStyle}>{snapshot.name}</div>
            {manaCost && <ManaCost cost={manaCost} size={15} />}
          </div>

          {/* type -- subtype · rarity icon */}
          <div style={{ ...rowStyle, ...dividerStyle }}>
            <div style={typeStyle}>{snapshot.type_line ?? ""}</div>
            {snapshot.rarity && ["common","uncommon","rare","mythic"].includes(snapshot.rarity) && (
              <RarityIcon rarity={snapshot.rarity as "common"|"uncommon"|"rare"|"mythic"} size={18} />
            )}
          </div>

          {/* one block per ability / paragraph */}
          {oracleText && (
            <div style={oracleBlockStyle}>
              <OracleText text={oracleText} />
            </div>
          )}

          {/* set info · pow/tou */}
          <div style={{ ...rowStyle, borderTop: `1px solid ${colors.border}`, paddingTop: 6, marginTop: "auto" }}>
            <div style={setLineStyle}>
              {snapshot.set_name ?? "—"}
              {snapshot.set ? ` (${snapshot.set.toUpperCase()})` : ""}
              {snapshot.collector_number ? ` #${snapshot.collector_number}` : ""}
            </div>
            {(power !== undefined || loyalty !== undefined) && (
              <div style={ptStyle}>
                {loyalty !== undefined ? `${loyalty}` : `${power}/${toughness}`}
              </div>
            )}
          </div>
        </div>
      )}
    </div>,
    document.getElementById("boundless-grimoire-root") ?? document.body,
  );
}
