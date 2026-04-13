/**
 * Wire format for the content↔background Scryfall RPC.
 *
 * One source of truth, imported by both sides:
 *   - `scryfall/rpc.ts`           (content side, sends requests)
 *   - `background/fetchScryfall.ts` (worker side, fulfills them)
 *
 * Keep this file dependency-free so it can be loaded in either context
 * without dragging in DOM- or worker-only types.
 */

export const SCRYFALL_REQ = "scryfall:req" as const;
export const SCRYFALL_ABORT = "scryfall:abort" as const;

export type ScryfallMethod = "GET" | "POST";

export interface ScryfallReqMessage {
  type: typeof SCRYFALL_REQ;
  /** Per-request id, used to correlate aborts. */
  id: string;
  method: ScryfallMethod;
  /** Path under api.scryfall.com, including any query string. */
  path: string;
  /** Body for POST requests; ignored for GET. */
  body?: unknown;
}

export interface ScryfallAbortMessage {
  type: typeof SCRYFALL_ABORT;
  id: string;
}

export type ScryfallMessage = ScryfallReqMessage | ScryfallAbortMessage;

/**
 * What the worker sends back. The worker NEVER throws across the message
 * boundary — every outcome (success, HTTP error, network failure, abort,
 * 429) is encoded here so the client can reconstruct the right exception
 * in its own context.
 */
export interface ScryfallEnvelope {
  /** True iff the upstream returned 2xx. */
  ok: boolean;
  /** HTTP status, or 0 for network errors / aborts. */
  status: number;
  /** Parsed JSON body, raw text on parse failure, or null. */
  body: unknown;
  /** Seconds — only set on 429. */
  retryAfter?: number;
  /** Set when the fetch itself failed (network error, abort). */
  networkError?: string;
}
