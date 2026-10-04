import { Capacitor } from "@capacitor/core";
import {
  PushNotifications,
  type Token,
  type PushNotificationSchema,
} from "@capacitor/push-notifications";

export function usePushNotifications() {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();
  let listenersAttached = false;

  async function persistToken(token: Token) {
    const uid = user.value?.id ?? user.value?.sub;
    if (!uid || !token?.value) return;

    const { error } = await supabase.from("device_tokens").upsert(
      {
        user_id: String(uid),
        token: token.value,
        platform: Capacitor.getPlatform(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,token" },
    );

    if (error) {
      console.warn("[push] Could not save device token:", error.message);
    }
  }

  function attachListeners() {
    if (!import.meta.client || listenersAttached) return;
    listenersAttached = true;

    PushNotifications.addListener("registration", (token) => {
      void persistToken(token);
    });

    PushNotifications.addListener("registrationError", (error) => {
      console.warn("[push] Registration error:", error);
    });

    PushNotifications.addListener(
      "pushNotificationReceived",
      (notification: PushNotificationSchema) => {
        console.info("[push] Received:", notification.title);
      },
    );
  }

  async function registerPushNotifications() {
    if (!Capacitor.isNativePlatform()) return;

    try {
      attachListeners();

      let perm = await PushNotifications.checkPermissions();
      if (perm.receive === "prompt") {
        perm = await PushNotifications.requestPermissions();
      }
      if (perm.receive !== "granted") return;

      await PushNotifications.register();
    } catch (e) {
      console.warn("[push] Registration skipped:", e);
    }
  }

  async function unregisterPushNotifications() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await PushNotifications.unregister();
    } catch {
      // ignore
    }
  }

  return {
    registerPushNotifications,
    unregisterPushNotifications,
  };
}
