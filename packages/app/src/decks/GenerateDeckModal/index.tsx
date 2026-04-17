/**
 * Generate Deck modal.
 *
 * Owns the entire generation lifecycle as a local state machine: form →
 * generating → done|error. Cancel during form closes; cancel during
 * generation aborts in-flight Scryfall calls and bounces back to the
 * form with inputs preserved. No deck is committed unless the run
 * succeeds end-to-end.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { colors } from "@boundless-grimoire/ui";
import { useServices } from "../../services";
import { useCustomFormatStore, compileFragment } from "../../formats";
import { generateDeck } from "../../generator";
import type { GeneratorInput, GenProgress, GeneratedDeck } from "../../generator";
import { commitGeneratedDeck } from "../../storage/deckStore";
import { FormView } from "./FormView";
import { GeneratingView } from "./GeneratingView";
import { ErrorView } from "./ErrorView";

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 2147483647,
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "system-ui, sans-serif",
};

const dialogStyle: React.CSSProperties = {
  width: "min(640px, 92vw)",
  maxHeight: "88vh",
  background: colors.bg1,
  border: `1px solid ${colors.borderStrong}`,
  borderRadius: 12,
  boxShadow: "0 12px 36px rgba(0,0,0,0.7)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  color: colors.text,
};

const headerStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderBottom: `1px solid ${colors.border}`,
  fontWeight: 700,
  fontSize: 15,
};

interface Props {
  onClose: () => void;
}

type State =
  | { kind: "form" }
  | { kind: "generating"; progress: GenProgress }
  | { kind: "error"; message: string };

const DEFAULT_INPUT: GeneratorInput = {
  formatIndex: 0,
  colors: [],
  colorCount: 2,
  size: 60,
  curve: "default",
  creaturePct: 38,
  nonCreaturePct: 21,
  landPct: 41,
  singleton: false,
  commander: false,
};

export function GenerateDeckModal({ onClose }: Props) {
  const services = useServices();
  const formats = useCustomFormatStore((s) => s.formats);

  const [input, setInput] = useState<GeneratorInput>(() => ({
    ...DEFAULT_INPUT,
    formatIndex: Math.min(DEFAULT_INPUT.formatIndex, Math.max(0, formats.length - 1)),
  }));
  const [state, setState] = useState<State>({ kind: "form" });
  const ctlRef = useRef<AbortController | null>(null);

  // Don't bind Escape — design calls for explicit cancel only.

  useEffect(() => {
    return () => {
      ctlRef.current?.abort();
    };
  }, []);

  const handleGenerate = async () => {
    const ctl = new AbortController();
    ctlRef.current = ctl;
    setState({ kind: "generating", progress: { phase: { kind: "pool-creatures", fetched: 0 } } });

    const fmt = formats[input.formatIndex];
    const formatFragment = fmt ? compileFragment(fmt) : "";
    const formatName = fmt?.name ?? "Unknown";

    let result: GeneratedDeck;
    try {
      result = await generateDeck(
        input,
        services,
        ctl.signal,
        (p) => setState({ kind: "generating", progress: p }),
        formatFragment,
        formatName,
      );
    } catch (e) {
      if (ctl.signal.aborted) {
        // User cancellation — bounce back to form with inputs preserved.
        setState({ kind: "form" });
        return;
      }
      const message = (e as Error)?.message ?? "Generation failed.";
      setState({ kind: "error", message });
      return;
    }

    if (ctl.signal.aborted) {
      setState({ kind: "form" });
      return;
    }

    commitGeneratedDeck({
      name: result.name,
      cards: result.cards,
      commander: result.commander,
      formatIndex: input.formatIndex,
    });
    onClose();
  };

  const handleCancelGeneration = () => {
    ctlRef.current?.abort();
    setState({ kind: "form" });
  };

  const host = document.getElementById("boundless-grimoire-root");
  if (!host) return null;

  return createPortal(
    <div style={overlayStyle}>
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>Generate deck</div>
        {state.kind === "form" && (
          <FormView
            input={input}
            onChange={setInput}
            onGenerate={handleGenerate}
            onCancel={onClose}
          />
        )}
        {state.kind === "generating" && (
          <GeneratingView progress={state.progress} onCancel={handleCancelGeneration} />
        )}
        {state.kind === "error" && (
          <ErrorView
            message={state.message}
            onBack={() => setState({ kind: "form" })}
            onCancel={onClose}
          />
        )}
      </div>
    </div>,
    host,
  );
}
