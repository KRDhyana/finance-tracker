import { toValue, watch } from "vue";
import { readDataCache, writeDataCache } from "~/utils/dataCache";

type CachedAsyncDataOptions<T> = Parameters<typeof useAsyncData<T>>[2] & {
  ttl?: number;
};

let lastLoadErrorToast = { at: 0, text: "" };

function loadErrorText(err: unknown) {
  if (!err || typeof err !== "object") return "";
  const value = err as { message?: string; statusMessage?: string };
  return String(value.message || value.statusMessage || "");
}

/**
 * Show a recent local copy immediately, then always load from the server.
 * Returning the copy from getCachedData would skip that request in Nuxt 4.
 */
export async function useCachedAsyncData<T>(
  key: Parameters<typeof useAsyncData<T>>[0],
  handler: Parameters<typeof useAsyncData<T>>[1],
  options: CachedAsyncDataOptions<T> = {},
) {
  const { ttl: _ttl, default: userDefault, ...rest } = options;
  void _ttl;
  const { toastError } = useAppToast();

  const resolveKey = () => {
    const value = toValue(key as never);
    return value ? String(value) : "";
  };

  const asyncData = await useAsyncData<T>(
    key,
    async (...args) => {
      const data = await handler!(...args);
      const resolvedKey = resolveKey();
      if (resolvedKey) writeDataCache(resolvedKey, data);
      return data;
    },
    {
      ...rest,
      default() {
        const cached = readDataCache<T>(resolveKey(), Number.POSITIVE_INFINITY);
        if (cached !== null) return cached;
        return typeof userDefault === "function" ? userDefault() : undefined;
      },
      getCachedData() {
        return undefined;
      },
    },
  );

  watch(asyncData.error, (err) => {
    const text = loadErrorText(err);
    if (!text || /abort/i.test(text)) return;
    const now = Date.now();
    if (text === lastLoadErrorToast.text && now - lastLoadErrorToast.at < 4000) return;
    lastLoadErrorToast = { at: now, text };
    toastError({
      title: "Couldn't load the latest data",
      description: text,
    });
  });

  return asyncData;
}
