import { forwardRef, type InputHTMLAttributes } from "react";
import { colors } from "./colors";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

/** Plain dark text input. No icon, no behavior — just styling. */
export const SearchInput = forwardRef<HTMLInputElement, Props>(function SearchInput(
  { style, size, ...rest },
  ref,
) {
  return (
    <input
      {...rest}
      ref={ref}
      // size=1 overrides the browser default of 20, removing the intrinsic
      // min-width so this input can honor a parent's flex/grid sizing. We
      // fall back to whatever the caller explicitly passed.
      size={size ?? 1}
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
