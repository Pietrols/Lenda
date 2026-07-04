import { StyleSheet, Text, View } from "react-native";
import { theme } from "../theme";

// ACTIVE listings are live and publicly visible (success). DRAFT is a neutral
// resting state. Every other status (PENDING_VERIFICATION, SUSPENDED, etc.)
// signals something needing attention, shown in the warning tone.
export function listingStatusColor(status: string): string {
  if (status === "ACTIVE") return theme.colors.success;
  if (status === "DRAFT") return theme.colors.mutedForeground;
  return theme.colors.warning;
}

export function ListingStatusBadge({ status }: { status: string }) {
  const color = listingStatusColor(status);

  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.text, { color }]}>
        {status.replaceAll("_", " ")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 2,
  },
  text: {
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodySemibold,
  },
});
