/**
 * MAIN-world bridge to untap.in's `window.apiStore`.
 *
 * Runs in the page's JS context (declared as `world: "MAIN"` in the manifest)
 * so it can reach `apiStore.send()` — the WebSocket-backed command channel
 * untap's own UI uses to talk to the server.
 *
 * The isolated-world content script (untapApi.ts) forwards commands to us
 * via `window.postMessage`. Within a single frame, both worlds share the
 * same window message queue, so postMessage is the canonical Chrome MV3
 * mechanism for crossing the isolated/MAIN boundary.
 *
 * Wire format — all on `window`, targetOrigin `"*"`, filtered by `e.source`:
 *
 *   isolated → MAIN
 *     { type: "uh:api:ping" }
 *     { type: "uh:api:req", id, cmd, payload? }
 *
 *   MAIN → isolated
 *     { type: "uh:api:pong" }
 *     { type: "uh:api:res", id, result? | error? }
 *
 * `cmd` is normally an apiStore command name (`get-deck-list`, `update-deck`,
 * etc) and goes straight to `apiStore.send(cmd, payload)`. The bridge also
 * recognizes a `"pinia:<storeName>:<actionName>"` form which invokes a
 * Pinia store action on the page instead. This is how we drive untap's
 * own UI to update — calling `apiStore.send("delete-deck", uid)` deletes
 * server-side but doesn't touch untap's reactive `deckList`, so the UI
 * doesn't notice. Calling `pinia:deckStore:deleteDeck` runs untap's own
 * action which both hits the API and patches the reactive state, so the
 * sidebar re-renders without a page reload.
 *
 * Bridge readiness = `window.apiStore` exists AND its WebSocket is connected.
 * apiStore appears before its WS handshake completes, so waitForWsReady()
 * probes via sendWithRetry("get-deck-list") which retries on transient
 * timeouts until the WS is up. Only then does the bridge send PONG and
 * drain the queue, ensuring boot-sync pushes never race the WS.
 *
 * Any `uh:api:req` that arrives before apiStore exists is queued and
 * drained the moment we see it.
 *
 * Results from apiStore are JSON-roundtripped before posting so any
 * non-structured-clone-safe fields (functions, DOM nodes, class instances
 * with cycles) are stripped instead of throwing inside postMessage and
 * silently killing the response.
 */

interface ApiStore {
  send: (cmd: string, payload?: unknown) => Promise<unknown>;
}

interface PiniaStore {
  [actionOrState: string]: unknown;
}

interface PiniaInstance {
  _s: Map<string, PiniaStore>;
}

interface VueRootProxy {
  $root?: { $pinia?: PiniaInstance };
}

interface VueTaggedElement extends Element {
  __vue__?: VueRootProxy;
}

const PINIA_PREFIX = "pinia:";

const TYPE_PING = "uh:api:ping";
const TYPE_PONG = "uh:api:pong";
const TYPE_REQ = "uh:api:req";
const TYPE_RES = "uh:api:res";

type PongMessage = { type: typeof TYPE_PONG };
type ResMessage = { type: typeof TYPE_RES; id: string; result?: unknown; error?: string };
type OutboundMessage = PongMessage | ResMessage;

const APISTORE_POLL_MS = 100;
const APISTORE_TIMEOUT_MS = 30_000;
const SEND_RETRY_DELAY_MS = 1_500;
const SEND_MAX_ATTEMPTS = 8;

interface QueuedReq {
  id: string;
  cmd: string;
  payload?: unknown;
}

let apiStore: ApiStore | null = null;
const queued: QueuedReq[] = [];

/** Strip non-cloneable values so postMessage's structured clone won't throw. */
function safeClone<T>(value: T): T | null {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return null;
  }
}

function post(message: OutboundMessage): void {
  try {
    window.postMessage(message, "*");
  } catch (err) {
    console.error("[uh:bridge] postMessage failed", err, message);
  }
}

function isTransientTimeout(err: unknown): boolean {
  // untap's apiStore.send() rejects with `Error("Timeout")` while its
  // WebSocket is still connecting. Retry instead of surfacing the error.
  const msg = err instanceof Error ? err.message : String(err);
  return /timeout/i.test(msg);
}

function sendWithRetry(
  cmd: string,
  payload: unknown,
  attempt = 1,
): Promise<unknown> {
  if (!apiStore) return Promise.reject(new Error("apiStore not available"));
  return apiStore.send(cmd, payload).catch((err) => {
    if (attempt < SEND_MAX_ATTEMPTS && isTransientTimeout(err)) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          sendWithRetry(cmd, payload, attempt + 1).then(resolve, reject);
        }, SEND_RETRY_DELAY_MS);
      });
    }
    throw err;
  });
}

let piniaCache: PiniaInstance | null = null;

/**
 * Walk the DOM looking for a Vue 2-style `__vue__`-tagged element so we
 * can reach the Pinia instance. Untap doesn't expose Pinia globally and
 * its Vue app's mount point isn't predictable, so DOM walking is the
 * least fragile option. Cached after the first successful lookup.
 */
function getPinia(): PiniaInstance | null {
  if (piniaCache) return piniaCache;
  for (const el of document.querySelectorAll<VueTaggedElement>("*")) {
    const pinia = el.__vue__?.$root?.$pinia;
    if (pinia && pinia._s instanceof Map) {
      piniaCache = pinia;
      return pinia;
    }
  }
  return null;
}

/** Invoke `pinia:<store>:<action>` against untap's own Pinia instance. */
function callPiniaAction(spec: string, payload: unknown): Promise<unknown> {
  const [, storeName, actionName] = spec.split(":");
  if (!storeName || !actionName) {
    return Promise.reject(new Error(`bad pinia spec: ${spec}`));
  }
  const pinia = getPinia();
  if (!pinia) return Promise.reject(new Error("pinia not available"));
  const store = pinia._s.get(storeName);
  if (!store) return Promise.reject(new Error(`no such pinia store: ${storeName}`));
  const action = store[actionName];
  if (typeof action !== "function") {
    return Promise.reject(new Error(`no such action: ${storeName}.${actionName}`));
  }
  // Pinia actions are bound to their store via Proxy magic, so call
  // through the store object — never via a detached reference.
  try {
    const result = (store[actionName] as (p: unknown) => unknown)(payload);
    return Promise.resolve(result);
  } catch (err) {
    return Promise.reject(err instanceof Error ? err : new Error(String(err)));
  }
}

function dispatch(req: QueuedReq): void {
  if (!apiStore) {
    queued.push(req);
    return;
  }
  const promise = req.cmd.startsWith(PINIA_PREFIX)
    ? callPiniaAction(req.cmd, req.payload)
    : sendWithRetry(req.cmd, req.payload);
  promise.then(
    (result) => post({ type: TYPE_RES, id: req.id, result: safeClone(result) }),
    (err: unknown) => post({
      type: TYPE_RES,
      id: req.id,
      error: err instanceof Error ? err.message : String(err),
    }),
  );
}

window.addEventListener("message", (e: MessageEvent) => {
  if (e.source !== window) return;
  const data = e.data as { type?: string } | null;
  if (!data || typeof data !== "object") return;

  if (data.type === TYPE_PING) {
    if (apiStore) post({ type: TYPE_PONG });
    return;
  }
  if (data.type !== TYPE_REQ) return;
  const { id, cmd, payload } = data as { type: string } & QueuedReq;
  dispatch({ id, cmd, payload });
});

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function waitForApiStore(deadline: number): Promise<ApiStore | null> {
  while (!apiStore) {
    if (performance.now() > deadline) {
      console.warn("[uh:bridge] apiStore never appeared — giving up");
      for (const req of queued.splice(0))
        post({ type: TYPE_RES, id: req.id, error: "apiStore unavailable" });
      return null;
    }
    const probe = (window as unknown as { apiStore?: ApiStore }).apiStore;
    if (probe && typeof probe.send === "function") apiStore = probe;
    else await sleep(APISTORE_POLL_MS);
  }
  return apiStore;
}

async function waitForWsReady(store: ApiStore, deadline: number): Promise<boolean> {
  while (performance.now() < deadline) {
    try {
      await store.send("get-deck-list");
      return true;
    } catch (err) {
      if (!isTransientTimeout(err)) return true;
    }
    await sleep(SEND_RETRY_DELAY_MS);
  }
  console.warn("[uh:bridge] WS never connected — giving up");
  for (const req of queued.splice(0))
    post({ type: TYPE_RES, id: req.id, error: "WS unavailable" });
  return false;
}

async function setup(deadline: number): Promise<void> {
  const store = await waitForApiStore(deadline);
  if (!store) return;
  if (!await waitForWsReady(store, deadline)) return;
  declareReady();
}

function declareReady(): void {
  console.log("[uh:bridge] ready");
  post({ type: TYPE_PONG });
  for (const req of queued.splice(0)) dispatch(req);
}

console.log("[uh:bridge] loaded, polling for apiStore...");
setup(performance.now() + APISTORE_TIMEOUT_MS);
