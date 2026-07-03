import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../theme";
import { useAuthStore } from "../store/auth.store";

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);

  const displayName = user?.fullName?.split(" ")[0] ?? user?.email ?? "there";
  const roles = (user?.roles ?? []).filter(
    (role) => role === "GUEST" || role === "HOST",
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.brand}>LENDA</Text>
        <Text style={styles.welcome}>Welcome, {displayName}</Text>

        <View style={styles.badgeRow}>
          {roles.map((role) => (
            <View key={role} style={styles.badge}>
              <Text style={styles.badgeText}>{role}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Browse listings coming soon</Text>
          <Text style={styles.cardBody}>
            Rentals and services across Zambia will show up here.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  brand: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.display,
    fontFamily: theme.typography.font.displayBlack,
    letterSpacing: theme.spacing.xs,
  },
  welcome: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.lg,
    fontFamily: theme.typography.font.bodyMedium,
  },
  badgeRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  badge: {
    borderColor: theme.colors.gold,
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  badgeText: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodySemibold,
  },
  card: {
    width: "100%",
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  cardTitle: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.xl,
    fontFamily: theme.typography.font.displayBold,
  },
  cardBody: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
  },
});
