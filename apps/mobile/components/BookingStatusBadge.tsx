import { StyleSheet, Text, View } from "react-native";
import { theme } from "../theme";
import type { BookingStatus } from "../api/bookings";

export const bookingStatusColors: Record<BookingStatus, string> = {
  PENDING: theme.colors.warning,
  CONFIRMED: theme.colors.gold,
  EN_ROUTE: theme.colors.mutedForeground,
  HANDED_OVER: theme.colors.mutedForeground,
  ACTIVE: theme.colors.mutedForeground,
  RETURN_PENDING: theme.colors.mutedForeground,
  RETURNED: theme.colors.success,
  COMPLETED: theme.colors.success,
  CANCELLED: theme.colors.error,
  DISPUTED: theme.colors.error,
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const color = bookingStatusColors[status] ?? theme.colors.mutedForeground;

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
