/**
 * Back-compat shim. The real storage abstraction now lives in
 * `services/storage`. Existing call sites continue to work because we
 * re-export the same `getItem` / `setItem` / `removeItem` shape they
 * always saw — they just go through the services seam now.
 *
 * New code should import directly from `services/storage`:
 *
 *   import { storage } from "../services/storage";
 *   await storage.set(key, value);
 */
import { storage } from "../services/storage";

export const getItem = <T>(key: string) => storage.get<T>(key);
export const setItem = <T>(key: string, value: T) => storage.set<T>(key, value);
export const removeItem = (key: string) => storage.remove(key);
