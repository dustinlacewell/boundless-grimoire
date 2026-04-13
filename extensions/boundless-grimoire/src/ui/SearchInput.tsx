import { forwardRef, type InputHTMLAttributes } from "react";
import { colors } from "./colors";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

/** Plain dark text input. No icon, no behavior — just styling. */
export const SearchInput = forwardRef<HTMLInputElement, Props>(function SearchInput(
  { style, ...rest },
  ref,
) {
  return (
    <input
      {...rest}
      ref={ref}
      type="text"
      style={{
        width: "100%",
        height: 30,
        padding: "0 10px",
        background: colors.bg1,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        borderRadius: 6,
        fontFamily: "system-ui, sans-serif",
        fontSize: 13,
        outline: "none",
        boxSizing: "border-box",
        ...style,
      }}
    />
  );
});
