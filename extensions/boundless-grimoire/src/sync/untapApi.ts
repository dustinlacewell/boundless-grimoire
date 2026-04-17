/**
 * Isolated-world client for the MAIN-world untap apiStore bridge.
 *
 * The bridge (untapBridge.ts) holds a reference to untap's `apiStore.send()`.
 * We can't reach it directly from the isolated world, so we proxy commands
 * over `window.postMessage` — the standard Chrome MV3 mechanism for
 * crossing the isolated/MAIN boundary in the same frame.
 *
 * Public surface:
 *   isUntapAvailable() — has the bridge replied at least once?
 *   waitForBridge()    — resolve `true` once the bridge is alive,
 *                        or `false` if it never comes up
 *   untapSend(cmd, p)  — send a command, resolve with the bridge's result
 *
 * Wire format is defined in untapBridge.ts.
 */

const TYPE_PING = "uh:api:ping";
const TYPE_PONG = "uh:api:pong";
const TYPE_REQ = "uh:api:req";
const TYPE_RES = "uh:api:res";

const REQUEST_TIMEOUT_MS = 30_000;
const HANDSHAKE_PING_INTERVAL_MS = 200;
const HANDSHAKE_TIMEOUT_MS = 30_000;

interface PendingCall {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

const pending = new Map<string, PendingCall>();
const readyWaiters: Array<() => void> = [];
/**
 * Persistent listeners for bridge-up events. Fires once when the bridge
 * first comes up — used by the push runner to drain any dirty outbox
 * entries that were blocked waiting for a reachable bridge.
 */
const readySubscribers = new Set<() => void>();
let bridgeReady = false;

window.addEventListener("message", (e: MessageEvent) => {
  if (e.source !== window) return;
  const data = e.data as { type?: string } | null;
  if (!data || typeof data !== "object") return;

  if (data.type === TYPE_PONG) {
    if (!bridgeReady) {
      bridgeReady = true;
      for (const fn of readyWaiters.splice(0)) fn();
      for (const fn of readySubscribers) {
        try { fn(); } catch (err) { console.error("[uh:api] bridge-ready subscriber threw", err); }
      }
    }
    return;
  }

  if (data.type !== TYPE_RES) return;
  const { id, result, error } = data as { id: string; result?: unknown; error?: string };
  const call = pending.get(id);
  if (!call) return;
  pending.delete(id);
  clearTimeout(call.timer);
  if (error) call.reject(new Error(error));
  else call.resolve(result);
});

// Try once at module load — if the bridge is already up, this races a pong
// back before any caller has even asked for it.
try {
  window.postMessage({ type: TYPE_PING }, "*");
} catch {
  /* fine — handshake will retry from waitForBridge */
}

export function isUntapAvailable(): boolean {
  return bridgeReady;
}

/**
 * Register a callback that fires when the bridge transitions to ready.
 * If the bridge is already up, fires synchronously. Returns an
 * unsubscribe function.
 *
 * Used by the push runner so an outbox that filled up while the bridge
 * was unreachable drains automatically once it comes back.
 */
export function onBridgeReady(cb: () => void): () => void {
  if (bridgeReady) {
    try { cb(); } catch (err) { console.error("[uh:api] onBridgeReady immediate cb threw", err); }
    return () => {};
  }
  readySubscribers.add(cb);
  return () => readySubscribers.delete(cb);
}

/**
 * Resolves once the MAIN-world bridge has acknowledged a ping.
 * Resolves to `false` if no pong arrives within HANDSHAKE_TIMEOUT_MS — the
 * caller is expected to check the return value and skip sync gracefully.
 */
export function waitForBridge(): Promise<boolean> {
  if (bridgeReady) return Promise.resolve(true);
  return new Promise((resolve) => {
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    let deadline: ReturnType<typeof setTimeout> | null = null;

    const finish = (ok: boolean) => {
      if (pingTimer !== null) clearInterval(pingTimer);
      if (deadline !== null) clearTimeout(deadline);
      resolve(ok);
    };

    readyWaiters.push(() => finish(true));

    pingTimer = setInterval(() => {
      if (bridgeReady) { finish(true); return; }
      window.postMessage({ type: TYPE_PING }, "*");
    }, HANDSHAKE_PING_INTERVAL_MS);

    deadline = setTimeout(() => {
      if (!bridgeReady) console.warn("[uh:api] bridge handshake timed out");
      finish(bridgeReady);
    }, HANDSHAKE_TIMEOUT_MS);
  });
}

export function untapSend(cmd: string, payload?: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const timer = setTimeout(() => {
      if (pending.delete(id)) {
        reject(new Error(`untap API timeout: ${cmd}`));
      }
    }, REQUEST_TIMEOUT_MS);
    pending.set(id, { resolve, reject, timer });
    try {
      window.postMessage({ type: TYPE_REQ, id, cmd, payload }, "*");
    } catch (err) {
      pending.delete(id);
      clearTimeout(timer);
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}
