import { StyleSheet, Text, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../theme";
import { Link } from "expo-router";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.brand}>LENDA</Text>
        <Text style={styles.tagline}>Rent anything. Hire anyone.</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Theme is live</Text>
          <Text style={styles.cardBody}>
            Dark base, gold accent, shared tokens, and the Montserrat and Space
            Grotesk fonts are now wired into the mobile app.
          </Text>
          <View style={styles.pill}>
            <Text style={styles.pillText}>Step 2 complete</Text>
          </View>
        </View>
        <Link href="/login" asChild>
          <Pressable style={{ marginTop: theme.spacing.lg }}>
            <Text
              style={{
                color: theme.colors.gold,
                fontFamily: theme.typography.font.bodySemibold,
              }}
            >
              Go to login →
            </Text>
          </Pressable>
        </Link>
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
    letterSpacing: 4,
  },
  tagline: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.base,
    fontFamily: theme.typography.font.bodyRegular,
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
    lineHeight: 20,
  },
  pill: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  pillText: {
    color: theme.colors.primaryForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodySemibold,
  },
});
