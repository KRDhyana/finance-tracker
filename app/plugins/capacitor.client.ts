import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";

export default defineNuxtPlugin(() => {
  if (!import.meta.client || !Capacitor.isNativePlatform()) return;

  const router = useRouter();
  const config = useRuntimeConfig();

  document.documentElement.classList.add("native-app");

  App.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) {
      router.back();
      return;
    }
    void App.exitApp();
  }).catch(() => {});

  App.addListener("appUrlOpen", (event) => {
    try {
      const raw = event.url || "";
      const url = new URL(raw);
      const hash = url.hash || "";
      const host = url.hostname || "";
      const path =
        host === "confirm" || raw.includes("confirm")
          ? "/confirm"
          : url.pathname && url.pathname !== "/"
            ? url.pathname
            : "/confirm";
      void router.push(`${path}${hash}`);
    } catch (e) {
      console.warn("[capacitor] Could not handle deep link:", e);
    }
  }).catch(() => {});

  void (async () => {
    try {
      const colorMode = useColorMode();
      await StatusBar.setStyle({
        style: colorMode.value === "dark" ? Style.Dark : Style.Light,
      });
    } catch {
      // Status bar plugin may be unavailable in some WebViews.
    }

    try {
      await SplashScreen.hide();
    } catch {
      // ignore
    }

    // Push needs Firebase (google-services.json). Enabling without it crashes Android.
    if (config.public.enablePush) {
      try {
        const { registerPushNotifications } = usePushNotifications();
        await registerPushNotifications();
      } catch (e) {
        console.warn("[capacitor] Push setup skipped:", e);
      }
    }
  })();
});
