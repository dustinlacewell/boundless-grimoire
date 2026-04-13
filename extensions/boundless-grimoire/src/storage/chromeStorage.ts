/**
 * Promise-based wrapper around chrome.storage.local.
 *
 * The Chrome storage API is callback-based but supports promises in MV3
 * Chrome 95+. We assume MV3 here. The wrapper only exists to keep call
 * sites typed and to give us a single seam for the (eventual) migration
 * to IndexedDB if storage budgets ever bite us.
 */
export async function getItem<T>(key: string): Promise<T | undefined> {
  const result = await chrome.storage.local.get(key);
  return result[key] as T | undefined;
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

export async function removeItem(key: string): Promise<void> {
  await chrome.storage.local.remove(key);
}
