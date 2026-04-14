/**
 * Fulfill one Scryfall RPC request.
 *
 * Reads top-to-bottom as a recipe:
 *
 *   1. Pick the right rate-limit bucket for the path.
 *   2. Register an AbortController under the request id so the content
 *      side can cancel us.
 *   3. Wait our turn in the bucket's FIFO. (May be 0ms.)
 *   4. Re-check the abort flag — caller may have given up while we waited.
 *   5. Build the RequestInit and `fetch`.
 *   6. Classify the response: 429 (pause the bucket), other HTTP, network
 *      error, or success.
 *   7. Parse the body (JSON, falling back to raw text).
 *   8. Return an envelope. We never throw — every outcome encodes into
 *      the envelope so the worker's message listener can sendResponse
 *      without try/catch.
 */
import { bucketFor } from "@boundless-grimoire/app";
import { release, track } from "./inflight";
import type { ScryfallEnvelope, ScryfallReqMessage } from "../scryfall/wire";

const API_BASE = "https://api.scryfall.com";

export async function fetchScryfall(req: ScryfallReqMessage): Promise<ScryfallEnvelope> {
  const bucket = bucketFor(req.path);
  const ctl = track(req.id);
  try {
    return await bucket.enqueue(() => doFetch(req, ctl, bucket.pauseFor.bind(bucket)));
  } finally {
    release(req.id);
  }
}

async function doFetch(
  req: ScryfallReqMessage,
  ctl: AbortController,
  pauseBucket: (ms: number) => void,
): Promise<ScryfallEnvelope> {
  if (ctl.signal.aborted) return abortedEnvelope();

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${req.path}`, buildInit(req, ctl.signal));
  } catch (e) {
    return networkErrorEnvelope(e);
  }

  if (res.status === 429) {
    const retryAfter = parseRetryAfter(res);
    pauseBucket(Math.max(retryAfter * 1000, 30_000));
    return { ok: false, status: 429, body: null, retryAfter };
  }

  return { ok: res.ok, status: res.status, body: await parseBody(res) };
}

function buildInit(req: ScryfallReqMessage, signal: AbortSignal): RequestInit {
  const init: RequestInit = {
    method: req.method,
    signal,
    headers:
      req.method === "POST"
        ? { "Content-Type": "application/json", Accept: "application/json" }
        : { Accept: "application/json" },
  };
  if (req.method === "POST") init.body = JSON.stringify(req.body);
  return init;
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function parseRetryAfter(res: Response): number {
  return parseInt(res.headers.get("Retry-After") ?? "30", 10);
}

function abortedEnvelope(): ScryfallEnvelope {
  return { ok: false, status: 0, body: null, networkError: "aborted" };
}

function networkErrorEnvelope(e: unknown): ScryfallEnvelope {
  return {
    ok: false,
    status: 0,
    body: null,
    networkError: e instanceof Error ? e.message : String(e),
  };
}
