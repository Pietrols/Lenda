import { useEffect } from "react";
import { Text, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Button, Heading, Screen } from "@/components/ui";
import { useAuthStore } from "@/store/auth.store";
import { colors, spacing } from "@/theme";

export default function HomeScreen() {
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  // Once the persisted store has rehydrated, send signed-out users to login.
  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [hasHydrated, isAuthenticated]);

  if (!hasHydrated || !isAuthenticated) {
    return (
      <Screen>
        <Text style={styles.muted}>Loading…</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Heading>Welcome back</Heading>
      <Text style={styles.muted}>
        Signed in as {user?.fullName ?? user?.email}
      </Text>

      <View style={styles.actions}>
        <Button
          title="Start a booking"
          onPress={() => router.push("/booking/new")}
        />
        <Button title="Sign out" variant="outline" onPress={clearAuth} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: {
    color: colors.mutedForeground,
    fontSize: 15,
  },
  actions: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
});
