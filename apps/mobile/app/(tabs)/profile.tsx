import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Briefcase,
  ChevronRight,
  FileText,
  LogOut,
  ListChecks,
  Shield,
  ShieldCheck,
} from "lucide-react-native";
import { theme } from "../../theme";
import { useAuthStore } from "../../store/auth.store";
import { upgradeToHost } from "../../lib/role-upgrade";

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

  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [justUpgraded, setJustUpgraded] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const handleBecomeHost = async () => {
    setUpgradeError(null);
    setIsUpgrading(true);
    const result = await upgradeToHost();
    setIsUpgrading(false);

    if (result.status === "success" || result.status === "already-host") {
      setJustUpgraded(true);
      hideTimer.current = setTimeout(() => setJustUpgraded(false), 4000);
    } else if (result.status === "error") {
      setUpgradeError(result.message);
    }
  };

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

        {kycStatus === "APPROVED" ? (
          <View style={styles.kycRow}>
            <ShieldCheck size={theme.typography.size.base} color={kycColor} />
            <Text style={[styles.kycText, { color: kycColor }]}>
              KYC {kycStatus.replaceAll("_", " ")}
            </Text>
          </View>
        ) : (
          <Pressable
            style={styles.kycRow}
            onPress={() => router.push("/kyc-upload")}
            hitSlop={6}
          >
            <ShieldCheck size={theme.typography.size.base} color={kycColor} />
            <Text style={[styles.kycText, { color: kycColor }]}>
              KYC {kycStatus.replaceAll("_", " ")}
            </Text>
            <ChevronRight
              size={theme.typography.size.sm}
              color={theme.colors.mutedForeground}
            />
          </Pressable>
        )}

        {justUpgraded && (
          <View style={styles.upgradedBox}>
            <Text style={styles.upgradedText}>You&apos;re now a host!</Text>
            {kycStatus !== "APPROVED" && (
              <Text style={styles.upgradedHint}>
                Next step: verify your identity to start listing. Tap the KYC
                status above to upload your documents.
              </Text>
            )}
          </View>
        )}

        {!isHost && (
          <View style={styles.hostCard}>
            <View style={styles.hostCardHeader}>
              <Briefcase
                size={theme.typography.size.xl}
                color={theme.colors.gold}
              />
              <Text style={styles.hostCardTitle}>Become a Host</Text>
            </View>
            <Text style={styles.hostCardBody}>
              List your rentals and services on Lenda and start earning.
            </Text>
            {upgradeError && (
              <Text style={styles.hostCardError}>{upgradeError}</Text>
            )}
            <Pressable
              style={[
                styles.hostCardButton,
                isUpgrading && styles.hostCardButtonDisabled,
              ]}
              onPress={handleBecomeHost}
              disabled={isUpgrading}
            >
              {isUpgrading ? (
                <ActivityIndicator color={theme.colors.primaryForeground} />
              ) : (
                <Text style={styles.hostCardButtonText}>Get Started</Text>
              )}
            </Pressable>
          </View>
        )}

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
  upgradedBox: {
    alignSelf: "stretch",
    backgroundColor: "hsla(142, 71%, 45%, 0.08)",
    borderColor: theme.colors.success,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  upgradedText: {
    color: theme.colors.success,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
    textAlign: "center",
  },
  upgradedHint: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
    textAlign: "center",
    marginTop: theme.spacing.xs,
  },
  hostCard: {
    alignSelf: "stretch",
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.gold,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  hostCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  hostCardTitle: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.lg,
    fontFamily: theme.typography.font.displayBold,
    textTransform: "uppercase",
  },
  hostCardBody: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
  },
  hostCardError: {
    color: theme.colors.error,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
  hostCardButton: {
    alignItems: "center",
    justifyContent: "center",
    height: theme.spacing.xxl,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    marginTop: theme.spacing.xs,
  },
  hostCardButtonDisabled: {
    opacity: 0.6,
  },
  hostCardButtonText: {
    color: theme.colors.primaryForeground,
    fontSize: theme.typography.size.base,
    fontFamily: theme.typography.font.bodySemibold,
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
