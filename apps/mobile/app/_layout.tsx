import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
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
import { syncPushToken } from "../lib/notifications";

SplashScreen.preventAutoHideAsync();

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
        </Stack.Protected>
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="verify-email" />
          <Stack.Screen name="reset-password" />
        </Stack.Protected>
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
});
