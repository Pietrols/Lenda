import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ChevronRight,
  FileText,
  LogOut,
  ListChecks,
  Shield,
  ShieldCheck,
} from "lucide-react-native";
import { theme } from "../../theme";
import { useAuthStore } from "../../store/auth.store";

const kycColors: Record<string, string> = {
  APPROVED: theme.colors.success,
  PENDING: theme.colors.warning,
  REJECTED: theme.colors.error,
};

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const initials = (user?.fullName ?? user?.email ?? "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const roles = (user?.roles ?? []).filter(
    (role) => role === "GUEST" || role === "HOST",
  );

  const isHost = roles.includes("HOST");

  const kycStatus = user?.kycStatus ?? "NOT_SUBMITTED";
  const kycColor = kycColors[kycStatus] ?? theme.colors.mutedForeground;

  const handleLogout = () => {
    clearAuth();
    router.replace("/login");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <Text style={styles.name}>{user?.fullName ?? user?.email}</Text>
        {user?.fullName && <Text style={styles.email}>{user.email}</Text>}

        <View style={styles.badgeRow}>
          {roles.map((role) => (
            <View key={role} style={styles.badge}>
              <Text style={styles.badgeText}>{role}</Text>
            </View>
          ))}
        </View>

        <View style={styles.kycRow}>
          <ShieldCheck size={theme.typography.size.base} color={kycColor} />
          <Text style={[styles.kycText, { color: kycColor }]}>
            KYC {kycStatus.replaceAll("_", " ")}
          </Text>
        </View>

        <View style={styles.navGroup}>
          {isHost && (
            <Pressable
              style={styles.navRow}
              onPress={() => router.push("/my-listings")}
            >
              <ListChecks
                size={theme.typography.size.base}
                color={theme.colors.gold}
              />
              <Text style={styles.navRowText}>My Listings</Text>
              <ChevronRight
                size={theme.typography.size.base}
                color={theme.colors.mutedForeground}
              />
            </Pressable>
          )}

          <Pressable
            style={styles.navRow}
            onPress={() => router.push("/terms")}
          >
            <FileText
              size={theme.typography.size.base}
              color={theme.colors.gold}
            />
            <Text style={styles.navRowText}>Terms of Service</Text>
            <ChevronRight
              size={theme.typography.size.base}
              color={theme.colors.mutedForeground}
            />
          </Pressable>

          <Pressable
            style={styles.navRow}
            onPress={() => router.push("/privacy")}
          >
            <Shield
              size={theme.typography.size.base}
              color={theme.colors.gold}
            />
            <Text style={styles.navRowText}>Privacy Policy</Text>
            <ChevronRight
              size={theme.typography.size.base}
              color={theme.colors.mutedForeground}
            />
          </Pressable>
        </View>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <LogOut
            size={theme.typography.size.base}
            color={theme.colors.error}
          />
          <Text style={styles.logoutText}>Sign out</Text>
        </Pressable>
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
    gap: theme.spacing.sm,
  },
  avatar: {
    width: theme.spacing.xxl + theme.spacing.lg,
    height: theme.spacing.xxl + theme.spacing.lg,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.gold,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.sm,
  },
  avatarText: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.xl,
    fontFamily: theme.typography.font.displayBold,
  },
  name: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.lg,
    fontFamily: theme.typography.font.bodySemibold,
  },
  email: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
  },
  badgeRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
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
  kycRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  kycText: {
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyMedium,
    textTransform: "uppercase",
  },
  navGroup: {
    alignSelf: "stretch",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xl,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    alignSelf: "stretch",
  },
  navRowText: {
    flex: 1,
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  logoutText: {
    color: theme.colors.error,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
});
