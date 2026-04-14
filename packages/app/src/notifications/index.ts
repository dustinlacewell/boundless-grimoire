/**
 * Notifications system — toast store + renderer + frames.
 *
 *   pushToast({ render, key?, durationMs? })   → queue a toast
 *   dismissToast(id) / dismissByKey(key)       → manual removal
 *   <ToastStack />                              → mount once at root
 *
 *   <ToastFrame variant icon onDismiss>{...}</ToastFrame>
 *   <DeckToastFrame deckId icon onDismiss>{...}</DeckToastFrame>
 *
 * See toastStore.ts for the contract (key dedup, auto-dismiss, custom
 * render). Two stylings ship — default and deck-themed — but the store
 * is render-agnostic, so any custom layout fits.
 */
export { pushToast, dismissToast, dismissByKey, useToastStore } from "./toastStore";
export type { ToastSpec, ToastContext } from "./toastStore";
export { ToastStack } from "./ToastStack";
export { ToastFrame, type ToastVariant } from "./ToastFrame";
export { DeckToastFrame } from "./DeckToastFrame";
