import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { deviceTokensApi } from "../api/deviceTokens";

// Acquire an Expo push token for this device. Returns the token string, or null
// when it cannot be obtained (simulator, denied permission, or no EAS project
// configured). Each null path logs a clear reason so the caller does not have
// to guess why registration was skipped.
export async function registerForPushNotifications(): Promise<string | null> {
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
    console.log("[push] Device token removed from backend.");
  } catch (err) {
    console.log(
      "[push] Failed to remove device token:",
      err instanceof Error ? err.message : String(err),
    );
  }
}
