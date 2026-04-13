import { colors } from "../ui/colors";
import { Surface } from "../ui/Surface";

interface Props {
  onCreate: () => void;
}

const TILE_W = 220;
const TILE_H = 110;

/** "+" placeholder tile that creates a new deck on click. */
export function NewDeckTile({ onCreate }: Props) {
  return (
    <Surface
      elevation={1}
      padding={0}
      radius={10}
      onClick={onCreate}
      style={{
        width: TILE_W,
        height: TILE_H,
        flex: "0 0 auto",
        cursor: "pointer",
        borderStyle: "dashed",
        borderColor: colors.borderStrong,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: colors.textMuted,
      }}
    >
      <div style={{ fontSize: 28, lineHeight: 1, fontWeight: 300 }}>+</div>
      <div style={{ fontSize: 12, marginTop: 6, fontWeight: 600 }}>New deck</div>
    </Surface>
  );
}
