/**
 * Public Scryfall exception types. Thrown by `scryfall/client.ts` after
 * unwrapping the envelope returned by the background worker.
 *
 * Callers can `instanceof` against either type — `ScryfallRateLimitError`
 * extends `ScryfallError`, so a single `instanceof ScryfallError` catches
 * both, or you can branch on the rate-limit subtype specifically.
 */
import type { ScryfallErrorResponse } from "./types";

export class ScryfallError extends Error {
  constructor(public status: number, public body: ScryfallErrorResponse | string) {
    const detail = typeof body === "string" ? body : body.details;
    super(`Scryfall ${status}: ${detail}`);
    this.name = "ScryfallError";
  }
}

export class ScryfallRateLimitError extends ScryfallError {
  constructor(public retryAfterSec: number) {
    super(429, `rate limited; retry after ${retryAfterSec}s`);
    this.name = "ScryfallRateLimitError";
  }
}
