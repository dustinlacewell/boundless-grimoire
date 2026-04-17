import { GrimoireLogo, colors } from "@boundless-grimoire/ui";
import { APP_VERSION } from "../../version";

const githubUrl = "https://github.com/dustinlacewell/boundless-grimoire";
const releasesUrl = `${githubUrl}/releases/latest`;

const wrapperStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
};

const heroStyle: React.CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: 240,
  margin: "-16px 0 -40px",
};

const glowStyle: React.CSSProperties = {
  position: "absolute",
  width: 260,
  height: 260,
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(155,75,255,0.25) 0%, transparent 70%)",
  pointerEvents: "none",
};

const titleStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 64,
  fontWeight: 800,
  letterSpacing: "-0.03em",
  lineHeight: 1,
  color: "#fff",
  zIndex: 1,
  fontFamily: "system-ui, sans-serif",
};

const taglineStyle: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.6,
  maxWidth: 420,
  margin: "12px auto 16px",
  color: colors.textMuted,
};

const versionStyle: React.CSSProperties = {
  fontFamily: "monospace",
  fontSize: 12,
  padding: "2px 8px",
  borderRadius: 4,
  background: colors.bg2,
  border: `1px solid ${colors.border}`,
  color: colors.textMuted,
  marginBottom: 20,
};

const btnRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: 8,
};

const primaryBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 600,
  borderRadius: 6,
  background: colors.accent,
  color: "#0a0a0c",
  textDecoration: "none",
};

const secondaryBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 600,
  borderRadius: 6,
  background: colors.bg2,
  border: `1px solid ${colors.borderStrong}`,
  color: colors.text,
  textDecoration: "none",
};

export function AboutTab() {
  return (
    <div style={wrapperStyle}>
      <div style={heroStyle}>
        <div style={glowStyle} />
        <GrimoireLogo size={180} hoverSwap />
        <div style={titleStyle}>Boundless Grimoire</div>
        <div style={{ position: "absolute", bottom: "25%", zIndex: 1 }}>
          <span style={versionStyle}>v{APP_VERSION}</span>
        </div>
        

      </div>

      <p style={{ ...taglineStyle, marginBottom: 0}}>
        A comfy and customizable Magic: the Gathering deck-builder.
      </p>

      <p style={taglineStyle}>
        Install the Chrome extension <br />and your decks will sync with <a href="https://untap.in" target="_blank" rel="noopener" style={{ color: colors.accent }}>untap.in</a>!
      </p>


      <div style={btnRow}>
        <a href={releasesUrl} target="_blank" rel="noopener" style={primaryBtn}>
          Download for Chrome
        </a>
        <a href={githubUrl} target="_blank" rel="noopener" style={secondaryBtn}>
          View on GitHub
        </a>
      </div>
    </div>
  );
}
