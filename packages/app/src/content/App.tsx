import { useEffect, useState } from "react";
import { CardPreview } from "../cards/CardPreview";
import { PrintPickerModal } from "../cards/PrintPickerModal";
import { Overlay } from "./Overlay";
import { TriggerButton } from "./TriggerButton";

interface AppProps {
  /** Start with the overlay already open. Used by the homepage demo. */
  initialOpen?: boolean;
  /** Start with the Help modal visible on the About tab. */
  initialHelpOpen?: boolean;
}

export function App({ initialOpen = false, initialHelpOpen = false }: AppProps) {
  const [open, setOpen] = useState(initialOpen);

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
      {open && <Overlay initialHelpOpen={initialHelpOpen} />}
      <TriggerButton open={open} onToggle={() => setOpen((v) => !v)} />
      <PrintPickerModal />
      <CardPreview />
    </>
  );
}
