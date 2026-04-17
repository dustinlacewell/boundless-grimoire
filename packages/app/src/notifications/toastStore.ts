/**
 * Toast notifications.
 *
 * One store, one stack. Every toast is described by a render function so
 * callers control exactly how their toast looks (default-styled message,
 * deck-themed with hero art, anything).
 *
 * Two stacking semantics:
 *
 *   - No `key`: every push adds a new toast. Multiple identical messages
 *     stack — useful for things like "imported X" where each is its own
 *     event.
 *
 *   - With `key`: pushing replaces any existing toast with the same key
 *     (and resets its dismissal timer). Useful for transient warnings
 *     that the user might trigger repeatedly ("commander must be legendary"
 *     → mash alt+shift+click 5 times, see one toast, not five) and for
 *     state-driven updates ("grouping deck X" → "grouped deck X").
 *
 * Auto-dismiss: pass `durationMs`. Omit (or `null`) for sticky.
 */
import { create } from "zustand";
import type { ReactNode } from "react";

export interface ToastContext {
  /** Dismisses this toast. Safe to call multiple times. */
  dismiss: () => void;
}

export interface ToastSpec {
  /**
   * Optional dedup key. Pushing a toast with the same key replaces the
   * existing one (no stacking) and resets its auto-dismiss timer.
   */
  key?: string;
  /**
   * Auto-dismiss after this many ms. Omit for sticky toasts the user
   * (or your code) has to dismiss manually.
   */
  durationMs?: number;
  /** Render the toast body. Receives a `dismiss()` for self-close UI. */
  render: (ctx: ToastContext) => ReactNode;
}

interface Toast extends ToastSpec {
  id: string;
  pushedAt: number;
}

interface ToastStoreState {
  toasts: Toast[];
}

export const useToastStore = create<ToastStoreState>(() => ({ toasts: [] }));

/**
 * Per-toast dismissal timers, kept outside the store so they don't show
 * up in setState diffs. Cleared whenever the toast is removed (manual
 * dismiss, replacement by key, or auto-fire).
 */
const dismissTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearTimer(id: string): void {
  const t = dismissTimers.get(id);
  if (t) {
    clearTimeout(t);
    dismissTimers.delete(id);
  }
}

/**
 * Show a toast. Returns the assigned id so the caller can dismiss
 * imperatively if they want to (most callers don't bother).
 */
export function pushToast(spec: ToastSpec): string {
  const id = crypto.randomUUID();
  const toast: Toast = { ...spec, id, pushedAt: Date.now() };

  useToastStore.setState((state) => {
    let toasts = state.toasts;
    if (spec.key) {
      // Tear down the dismissal timer for any toast we're about to
      // replace; the replacement's own timer takes over below.
      for (const t of toasts) {
        if (t.key === spec.key) clearTimer(t.id);
      }
      toasts = toasts.filter((t) => t.key !== spec.key);
    }
    return { toasts: [...toasts, toast] };
  });

  if (spec.durationMs != null) {
    dismissTimers.set(
      id,
      setTimeout(() => dismissToast(id), spec.durationMs),
    );
  }

  return id;
}

export function dismissToast(id: string): void {
  clearTimer(id);
  useToastStore.setState((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  }));
}

/** Dismiss every toast that matches the given key. No-op if none exist. */
export function dismissByKey(key: string): void {
  const matches = useToastStore.getState().toasts.filter((t) => t.key === key);
  for (const t of matches) clearTimer(t.id);
  useToastStore.setState((state) => ({
    toasts: state.toasts.filter((t) => t.key !== key),
  }));
}

