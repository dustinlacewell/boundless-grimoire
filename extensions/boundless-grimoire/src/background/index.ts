/**
 * Service worker entry point.
 *
 * Listens for Scryfall RPC messages from any extension surface (content
 * scripts, popup, etc.) and dispatches them. The interesting work happens
 * in the modules below — this file is just the wiring.
 *
 *   wire.ts            — protocol shapes (shared with content side)
 *   buckets.ts         — rate-limit buckets + path → bucket classifier
 *   queue.ts           — generic FIFO rate limiter
 *   inflight.ts        — abort registry
 *   fetchScryfall.ts   — the per-request recipe (enqueue → fetch → envelope)
 *
 * Why a service worker at all: see `fetchScryfall.ts` and `buckets.ts` for
 * the CORS and rate-limit reasons. Short version: SW fetches use
 * `host_permissions` (so 5xx responses don't masquerade as CORS errors),
 * and centralizing the buckets here means there's exactly one of each per
 * browser profile no matter how many tabs are open.
 */
import { fetchScryfall } from "./fetchScryfall";
import { abort } from "./inflight";
import { SCRYFALL_ABORT, SCRYFALL_REQ, type ScryfallMessage } from "../scryfall/wire";

function isScryfallMessage(msg: unknown): msg is ScryfallMessage {
  if (!msg || typeof msg !== "object") return false;
  const t = (msg as { type?: unknown }).type;
  return t === SCRYFALL_REQ || t === SCRYFALL_ABORT;
}

chrome.runtime.onMessage.addListener((msg: unknown, _sender, sendResponse) => {
  if (!isScryfallMessage(msg)) return;

  if (msg.type === SCRYFALL_ABORT) {
    abort(msg.id);
    return;
  }

  fetchScryfall(msg).then(sendResponse);
  return true; // keep the message channel open for async sendResponse
});
