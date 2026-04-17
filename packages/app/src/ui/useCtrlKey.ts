import { useEffect, useState } from "react";

/** Returns true while the Control key is held. */
export function useCtrlKey(): boolean {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => { if (e.key === "Control") setHeld(true); };
    const onUp = (e: KeyboardEvent) => { if (e.key === "Control") setHeld(false); };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);
  return held;
}
