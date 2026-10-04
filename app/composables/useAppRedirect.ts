import { Capacitor } from "@capacitor/core";

/** Auth redirect target: custom scheme in native app, site URL on web. */
export function useAppRedirect() {
  const config = useRuntimeConfig();

  const authRedirectUrl = computed(() => {
    if (Capacitor.isNativePlatform()) {
      return "com.financetracker.app://confirm";
    }
    const base = String(config.public.baseURL || "").replace(/\/$/, "");
    return `${base}/confirm`;
  });

  const isNativeApp = computed(() => Capacitor.isNativePlatform());

  return { authRedirectUrl, isNativeApp };
}
