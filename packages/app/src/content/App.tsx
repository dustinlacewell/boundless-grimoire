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

  // Lock the host document's scroll while the overlay is open so the
  // page's scrollbar doesn't sit alongside the overlay's own. Works on
  // both <html> and <body> to cover hosts that put the scroll on either.
  // Saving and restoring the prior value keeps us from clobbering a
  // host that was already locking scroll for its own reasons.
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
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
