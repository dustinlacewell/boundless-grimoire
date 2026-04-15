import { forwardRef, type CSSProperties, type ReactNode } from "react";
import { colors } from "@boundless-grimoire/ui";

interface Props {
  /**
   * Section heading. A plain string renders in the library's section-label
   * style (uppercase, rule underneath). Pass a ReactNode to render custom
   * header content (e.g. the editable deck title) without that styling.
   */
  label: ReactNode;
  /**
   * Right-aligned cluster of controls rendered on the same baseline as
   * the label. Typically a tab switcher or a group of per-entity pickers.
   */
  controls?: ReactNode;
  /**
   * Optional layout slot rendered below the header row but above the
   * main content. Used when a section needs a secondary caption (e.g. a
   * legality strip) that should sit inside the same visual block.
   */
  subheader?: ReactNode;
  children: ReactNode;
  /** Inline style escape hatch for the <section> wrapper. */
  style?: CSSProperties;
}

const labelTextStyle: CSSProperties = {
  fontSize: 13,
  letterSpacing: 2,
  textTransform: "uppercase",
  color: colors.text,
  fontWeight: 800,
};

const headerRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  paddingBottom: 4,
  marginBottom: 8,
  borderBottom: `2px solid ${colors.bg3}`,
  // The outer row wraps on narrow overlays so no cluster gets clipped;
  // rowGap keeps wrapped clusters readable without stacking tight.
  flexWrap: "wrap",
  rowGap: 8,
};

const controlsStyle: CSSProperties = {
  marginLeft: "auto",
  display: "flex",
  alignItems: "center",
  columnGap: 12,
  rowGap: 8,
  flexWrap: "wrap",
};

/**
 * Shared layout for a top-level pane: standardized `Library`-style
 * header with a right-aligned controls slot, optional subheader, and
 * the main content below. Used by every section in `Overlay` so the
 * visual spine stays consistent as we add sections or move controls.
 *
 * Label handling:
 *   - `label="Library"` → renders in uppercase section-label style
 *   - `label={<EditableDeckTitle …/>}` → raw, no styling applied (for
 *     the entity section where the title is its own editable input)
 */
export const Section = forwardRef<HTMLElement, Props>(function Section(
  { label, controls, subheader, children, style },
  ref,
) {
  const labelNode =
    typeof label === "string" ? <div style={labelTextStyle}>{label}</div> : label;
  return (
    <section ref={ref} style={style}>
      <div style={headerRowStyle}>
        {labelNode}
        {controls && <div style={controlsStyle}>{controls}</div>}
      </div>
      {subheader}
      {children}
    </section>
  );
});
