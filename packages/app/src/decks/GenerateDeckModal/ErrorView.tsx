import { Button, colors } from "@boundless-grimoire/ui";

const bodyStyle: React.CSSProperties = {
  flex: 1,
  padding: 24,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  minHeight: 160,
};

const footerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  padding: "12px 16px",
  borderTop: `1px solid ${colors.border}`,
};

interface Props {
  message: string;
  onBack: () => void;
  onCancel: () => void;
}

export function ErrorView({ message, onBack, onCancel }: Props) {
  return (
    <>
      <div style={bodyStyle}>
        <div style={{ fontSize: 14, fontWeight: 700, color: colors.danger }}>
          Generation failed
        </div>
        <div style={{ fontSize: 13, color: colors.text, lineHeight: 1.5 }}>{message}</div>
      </div>
      <div style={footerStyle}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={onBack}>
          Back to form
        </Button>
      </div>
    </>
  );
}
