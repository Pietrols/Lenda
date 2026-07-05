import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import { router } from "expo-router";
import { deviceTokensApi } from "../api/deviceTokens";
import { notificationsApi } from "../api/notifications";
import { useNotificationsStore } from "../store/notifications.store";

// Remote push was removed from Expo Go on Android in SDK 53, and merely
// importing expo-notifications there logs a hard ERROR. The module is
// therefore loaded lazily and the entire push layer no-ops in that
// environment; development builds and iOS keep full behaviour.
const pushUnsupported =
  Platform.OS === "android" &&
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

type NotificationsModule = typeof import("expo-notifications");

let notificationsModule: NotificationsModule | null = null;

function getNotifications(): NotificationsModule | null {
  if (pushUnsupported) return null;
  if (!notificationsModule) {
    notificationsModule =
      require("expo-notifications") as NotificationsModule;
    // Show pushes as banners even while the app is foregrounded; without a
    // handler, foreground notifications are silently dropped on iOS.
    notificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  }
  return notificationsModule;
}

// Keep the app icon badge in sync with the in-app unread count (set by the
// tab bar poll and zeroed when the notifications list is opened).
useNotificationsStore.subscribe((state) => {
  const Notifications = getNotifications();
  if (!Notifications) return;
  Notifications.setBadgeCountAsync(state.unreadCount).catch(() => {});
});

// Wire receipt + tap listeners. Returns a cleanup function; call once from
// the root layout. The server does not send pushes yet, so the tap routing is
// defensive about the payload: a bookingId in data deep-links to that booking,
// anything else lands on the notifications tab.
export function setupNotificationListeners(): () => void {
  const Notifications = getNotifications();
  if (!Notifications) {
    return () => {};
  }

  const received = Notifications.addNotificationReceivedListener(async () => {
    try {
      const res = await notificationsApi.getUnreadCount();
      useNotificationsStore.getState().setUnreadCount(res.count);
    } catch {
      // Badge refresh is best-effort.
    }
  });

  const responded = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data as
        | { bookingId?: string }
        | undefined;
      if (data?.bookingId) {
        router.push(`/booking/${data.bookingId}`);
      } else {
        router.push("/notifications");
      }
    },
  );

  return () => {
    received.remove();
    responded.remove();
  };
}

// Acquire an Expo push token for this device. Returns the token string, or null
// when it cannot be obtained (simulator, Expo Go on Android, denied permission,
// or no EAS project configured). Each null path logs a clear reason so the
// caller does not have to guess why registration was skipped.
export async function registerForPushNotifications(): Promise<string | null> {
  const Notifications = getNotifications();
  if (!Notifications) {
    console.log(
      "[push] Skipped: remote push is not supported in Expo Go on Android.",
    );
    return null;
  }

  if (!Device.isDevice) {
    console.log(
      "[push] Skipped: push tokens require a physical device (simulator detected).",
    );
    return null;
  }

  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.granted;
  if (!granted && existing.canAskAgain) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = requested.granted;
  }
  if (!granted) {
    console.log("[push] Skipped: notification permission was not granted.");
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return tokenResponse.data;
  } catch (err) {
    console.log(
      "[push] Skipped: could not get an Expo push token:",
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}

// Acquire the push token and register it with the backend. Safe to call more
// than once (the server upserts by token). Never throws — failures are logged
// so they cannot interrupt the auth flow that triggers registration.
export async function syncPushToken(): Promise<void> {
  try {
    const token = await registerForPushNotifications();
    if (!token) return;

    await deviceTokensApi.register(token, Platform.OS);
    console.log("[push] Device token registered with backend.");
  } catch (err) {
    console.log(
      "[push] Failed to register device token:",
      err instanceof Error ? err.message : String(err),
    );
  }
}

// Remove this device's push token from the backend. Must run BEFORE clearAuth
// (the DELETE needs a valid access token). Unlike registration, this never
// prompts for permission — if it was not granted, no token was registered and
// there is nothing to remove. Never throws: a failed cleanup must not block
// logout, and the server-side delete is idempotent anyway.
export async function unregisterPushToken(): Promise<void> {
  try {
    const Notifications = getNotifications();
    if (!Notifications) return;
    if (!Device.isDevice) return;

    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );

    await deviceTokensApi.remove(tokenResponse.data);
    await Notifications.setBadgeCountAsync(0).catch(() => {});
    console.log("[push] Device token removed from backend.");
  } catch (err) {
    console.log(
      "[push] Failed to remove device token:",
      err instanceof Error ? err.message : String(err),
    );
  }
}
