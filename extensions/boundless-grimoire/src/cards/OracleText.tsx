/**
 * Renders oracle text with inline Scryfall SVG symbols for any {X} tokens.
 * Newlines are preserved as <br> elements.
 */

interface Props {
  text: string;
  symbolSize?: number;
}

const dividerStyle: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid rgba(255,255,255,0.08)",
  width: "60%",
  margin: "5px auto",
};

export function OracleText({ text, symbolSize = 14 }: Props) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, li) => (
        <span key={li} style={{ display: "block" }}>
          {li > 0 && <hr style={dividerStyle} />}
          {tokenizeLine(line, symbolSize)}
        </span>
      ))}
    </>
  );
}

function tokenizeLine(line: string, size: number) {
  // Split on {token} boundaries, keeping the delimiters.
  const parts = line.split(/(\{[^}]+\})/);
  return parts.map((part, i) => {
    if (part.startsWith("{") && part.endsWith("}")) {
      const inner = part.slice(1, -1).replace("/", "");
      return (
        <img
          key={i}
          src={`https://svgs.scryfall.io/card-symbols/${inner}.svg`}
          alt={part}
          title={part}
          draggable={false}
          style={{ width: size, height: size, display: "inline-block", verticalAlign: "middle" }}
        />
      );
    }
    return part;
  });
}
