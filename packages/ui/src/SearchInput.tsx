import { forwardRef, type InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

/** Plain dark text input. No icon, no behavior — just styling. */
export const SearchInput = forwardRef<HTMLInputElement, Props>(function SearchInput(
  { size, className = "", ...rest },
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
      className={`w-full h-[30px] px-2.5 box-border bg-bg-1 text-text border border-border rounded-[6px] font-sans text-[13px] outline-none ${className}`.trim()}
    />
  );
});
