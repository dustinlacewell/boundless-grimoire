/**
 * Content-side RPC for Scryfall calls.
 *
 * Two responsibilities, deliberately split:
 *
 *   sendScryfallRpc — owns the cross-boundary mechanics: it picks a
 *     request id, posts the message, wires AbortSignal up to a matching
 *     `scryfall:abort` message, and resolves with the raw envelope.
 *
 *   unwrapEnvelope — pure decoder: turns an envelope into either a
 *     resolved value or a thrown ScryfallError / ScryfallRateLimitError.
 *
 * The split lets `scryfall/client.ts` read like a recipe (send, unwrap,
 * return) and keeps the messaging plumbing isolated from error decoding.
 */
import { ScryfallError, ScryfallRateLimitError } from "./errors";
import type { ScryfallErrorResponse } from "./types";
import {
  SCRYFALL_ABORT,
  SCRYFALL_REQ,
  type ScryfallEnvelope,
  type ScryfallMethod,
} from "./wire";

export interface ScryfallRpcRequest {
  method: ScryfallMethod;
  path: string;
  body?: unknown;
}

export function sendScryfallRpc(
  req: ScryfallRpcRequest,
  signal?: AbortSignal,
): Promise<ScryfallEnvelope> {
  const id = crypto.randomUUID();

  const onAbort = () => {
    chrome.runtime
      .sendMessage({ type: SCRYFALL_ABORT, id })
      .catch(() => {
        /* worker may have already finished — fine */
      });
  };

  if (signal) {
    if (signal.aborted) {
      return Promise.reject(new DOMException("Aborted", "AbortError"));
    }
    signal.addEventListener("abort", onAbort, { once: true });
  }

  return chrome.runtime
    .sendMessage({
      type: SCRYFALL_REQ,
      id,
      method: req.method,
      path: req.path,
      body: req.body,
    })
    .finally(() => {
      if (signal) signal.removeEventListener("abort", onAbort);
    });
}

export function unwrapEnvelope<T>(env: ScryfallEnvelope): T {
  if (env.networkError) {
    if (env.networkError === "aborted") {
      throw new DOMException("Aborted", "AbortError");
    }
    throw new ScryfallError(0, env.networkError);
  }
  if (env.status === 429) {
    throw new ScryfallRateLimitError(env.retryAfter ?? 30);
  }
  if (!env.ok) {
    throw new ScryfallError(env.status, errorBodyDetail(env.status, env.body));
  }
  return env.body as T;
}

/**
 * Coerce whatever Scryfall handed back into a sensible error body. We may
 * see any of:
 *   - a structured `ScryfallErrorResponse` (the happy error path),
 *   - an HTML page (Scryfall's outage / Cloudflare error pages),
 *   - a plain string from a misbehaving proxy,
 *   - null (empty body),
 *   - random JSON that doesn't have `details`.
 *
 * Without this guard, `new ScryfallError(503, body).message` was rendering
 * as "Scryfall 503: undefined" because the cast was a lie.
 */
function errorBodyDetail(
  status: number,
  body: unknown,
): ScryfallErrorResponse | string {
  if (
    body &&
    typeof body === "object" &&
    typeof (body as ScryfallErrorResponse).details === "string"
  ) {
    return body as ScryfallErrorResponse;
  }
  if (typeof body === "string" && body.length > 0) {
    // Trim HTML payloads to a single line so the error message stays scannable.
    return body.replace(/\s+/g, " ").trim().slice(0, 200);
  }
  return `HTTP ${status}`;
}
