import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import {
  Montserrat_700Bold,
  Montserrat_900Black,
} from "@expo-google-fonts/montserrat";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { theme } from "../theme";
import { useAuthStore } from "../store/auth.store";
import {
  setupNotificationListeners,
  syncPushToken,
} from "../lib/notifications";

SplashScreen.preventAutoHideAsync();

// Catches render-time crashes anywhere in the app and shows a themed fallback
// instead of a white screen. expo-router picks this up by the export name.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.errorRoot}>
      <Text style={styles.wordmark}>LENDA</Text>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{error.message}</Text>
      <Pressable style={styles.retryButton} onPress={retry}>
        <Text style={styles.retryText}>Try again</Text>
      </Pressable>
    </View>
  );
}

function HydrationScreen() {
  return (
    <View style={styles.hydrationScreen}>
      <Text style={styles.wordmark}>LENDA</Text>
    </View>
  );
}

export default function RootLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  const [fontsLoaded, fontError] = useFonts({
    Montserrat_700Bold,
    Montserrat_900Black,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    return setupNotificationListeners();
  }, []);

  // On app launch, once hydration settles, register the push token if the user
  // is already authenticated. Latches on the first post-hydration run so a
  // later in-session login does not double-register (login.tsx handles that).
  const didSyncPush = useRef(false);
  useEffect(() => {
    if (!hasHydrated || didSyncPush.current) return;
    didSyncPush.current = true;
    if (isAuthenticated) {
      void syncPushToken();
    }
  }, [hasHydrated, isAuthenticated]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  if (!hasHydrated) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <HydrationScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="listing/[id]" />
          <Stack.Screen name="booking/[id]" />
          <Stack.Screen name="my-listings" />
          <Stack.Screen name="create-listing" />
          <Stack.Screen name="kyc-upload" />
          <Stack.Screen name="edit-profile" />
          <Stack.Screen name="manage-listing/[id]" />
          <Stack.Screen name="user/[id]" />
          <Stack.Screen name="float" />
          <Stack.Screen name="subscription" />
          <Stack.Screen name="history" />
          <Stack.Screen name="saved" />
        </Stack.Protected>
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="verify-email" />
          <Stack.Screen name="reset-password" />
        </Stack.Protected>
        {/* Public legal screens: ungated so they are reachable both before
            login (during registration) and while authenticated (from Profile).
            They MUST be declared after the guarded groups: when the initial
            URL targets an unavailable guarded screen, expo-router falls back
            to the first available screen in declaration order, and that must
            be (tabs) or login, never terms. */}
        <Stack.Screen name="terms" />
        <Stack.Screen name="privacy" />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  hydrationScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
  wordmark: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.display,
    fontFamily: theme.typography.font.displayBlack,
    letterSpacing: theme.spacing.xs,
  },
  errorRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  errorTitle: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.xl,
    fontFamily: theme.typography.font.displayBold,
    textTransform: "uppercase",
  },
  errorMessage: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
    textAlign: "center",
  },
  retryButton: {
    borderColor: theme.colors.gold,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
  },
  retryText: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.base,
    fontFamily: theme.typography.font.bodySemibold,
  },
});
