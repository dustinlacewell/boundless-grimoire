/**
 * Per-bucket FIFO rate-limiting queue.
 *
 * - `minInterval` is enforced between successive task starts within a bucket.
 * - `pauseFor()` halts the bucket entirely (used when we receive HTTP 429).
 * - Tasks are dispatched serially in submission order. The queue does not
 *   parallelize even when the bucket is otherwise idle, which keeps it
 *   trivially compliant with Scryfall's per-second limits.
 */
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class RateLimitedBucket {
  private queue: Array<() => Promise<void>> = [];
  private running = false;
  private pausedUntil = 0;
  private lastStart = 0;

  constructor(public readonly minInterval: number, public readonly name: string) {}

  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const wait = Math.max(this.pausedUntil - Date.now(), 0);
          if (wait > 0) await sleep(wait);
          this.lastStart = Date.now();
          resolve(await fn());
        } catch (e) {
          reject(e);
        }
      });
      void this.run();
    });
  }

  /** Halt the bucket for at least `ms` from now. Idempotent / monotonic. */
  pauseFor(ms: number): void {
    this.pausedUntil = Math.max(this.pausedUntil, Date.now() + ms);
  }

  private async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    while (this.queue.length > 0) {
      // Enforce minInterval between successive task starts.
      const sinceLast = Date.now() - this.lastStart;
      const gap = this.minInterval - sinceLast;
      if (gap > 0) await sleep(gap);

      const task = this.queue.shift()!;
      await task();
    }
    this.running = false;
  }
}
