import { useEffect, useState } from "react";
import { CardPreview } from "../cards/CardPreview";
import { PrintPickerModal } from "../cards/PrintPickerModal";
import { Overlay } from "./Overlay";
import { TriggerButton } from "./TriggerButton";

export function App() {
  const [open, setOpen] = useState(false);

  // Esc closes the overlay
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {open && <Overlay />}
      <TriggerButton open={open} onToggle={() => setOpen((v) => !v)} />
      <PrintPickerModal />
      <CardPreview />
    </>
  );
}
