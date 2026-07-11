import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useRouter } from "expo-router";
import {
  ArrowLeft,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  Users,
} from "lucide-react-native";
import { theme } from "../../theme";
import { useAuthStore } from "../../store/auth.store";

const sections = [
  {
    route: "/admin/users" as const,
    Icon: Users,
    title: "Members",
    description: "Review KYC submissions, suspend or reinstate accounts",
  },
  {
    route: "/admin/listings" as const,
    Icon: ClipboardList,
    title: "Listings",
    description: "Verify pending listings, suspend problem listings",
  },
  {
    route: "/admin/bookings" as const,
    Icon: CalendarClock,
    title: "Bookings & disputes",
    description: "All bookings across the platform, disputed ones first",
  },
];

export default function AdminHubScreen() {
  const router = useRouter();
  const isAdmin = useAuthStore(
    (s) => s.user?.roles.includes("ADMIN") ?? false,
  );

  if (!isAdmin) return <Redirect href="/(tabs)" />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft
            size={theme.typography.size.xxl}
            color={theme.colors.foreground}
          />
        </Pressable>
        <Text style={styles.headerTitle}>Admin</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {sections.map(({ route, Icon, title, description }) => (
          <Pressable
            key={route}
            style={styles.card}
            onPress={() => router.push(route)}
          >
            <Icon size={theme.typography.size.xl} color={theme.colors.gold} />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.cardDescription}>{description}</Text>
            </View>
            <ChevronRight
              size={theme.typography.size.base}
              color={theme.colors.mutedForeground}
            />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  headerTitle: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.lg,
    fontFamily: theme.typography.font.displayBold,
    textTransform: "uppercase",
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
  cardBody: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  cardTitle: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.base,
    fontFamily: theme.typography.font.bodySemibold,
  },
  cardDescription: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
});
