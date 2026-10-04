const PREFIX = "ft-cache:";

type CacheEnvelope<T> = {
  ts: number;
  data: T;
};

/** Read JSON from localStorage if younger than `ttlMs`. */
export function readDataCache<T>(key: string, ttlMs = 5 * 60 * 1000): T | null {
  if (!import.meta.client || !key) return null;
  try {
    const raw = localStorage.getItem(`${PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed?.ts || Date.now() - parsed.ts > ttlMs) {
      localStorage.removeItem(`${PREFIX}${key}`);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

/** Persist JSON to localStorage for instant reloads. */
export function writeDataCache<T>(key: string, data: T) {
  if (!import.meta.client || !key) return;
  try {
    localStorage.setItem(
      `${PREFIX}${key}`,
      JSON.stringify({ ts: Date.now(), data }),
    );
  } catch {
    // Storage full or unavailable — ignore.
  }
}

export function clearDataCache(key: string) {
  if (!import.meta.client || !key) return;
  try {
    localStorage.removeItem(`${PREFIX}${key}`);
  } catch {
    // ignore
  }
}
