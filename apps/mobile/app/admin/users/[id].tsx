import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { theme } from "../../../theme";
import {
  adminApi,
  type AdminKycDocument,
  type AdminUserDetail,
} from "../../../api/admin";
import { ApiError } from "../../../api/client";
import { useAuthStore } from "../../../store/auth.store";
import { ErrorState } from "../../../components/ErrorState";
import { formatDate } from "../../../lib/dates";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function AdminUserDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isAdmin = useAuthStore(
    (s) => s.user?.roles.includes("ADMIN") ?? false,
  );

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [kycDocs, setKycDocs] = useState<AdminKycDocument[]>([]);
  const [suspendedUntil, setSuspendedUntil] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rejectReason, setRejectReason] = useState("");
  const [suspendDays, setSuspendDays] = useState("");
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [userRes, docsRes] = await Promise.allSettled([
        adminApi.getUser(id),
        adminApi.getUserKycDocuments(id),
      ]);
      if (userRes.status === "rejected") throw userRes.reason;
      setUser(userRes.value.user);
      setKycDocs(docsRes.status === "fulfilled" ? docsRes.value.documents : []);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not load this member. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const runAction = async (name: string, action: () => Promise<void>) => {
    setActionBusy(name);
    setActionError(null);
    setActionNote(null);
    try {
      await action();
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "The action failed. Please try again.",
      );
    } finally {
      setActionBusy(null);
    }
  };

  const setKyc = (status: "APPROVED" | "REJECTED") =>
    runAction(`kyc-${status}`, async () => {
      if (!id) return;
      const res = await adminApi.setKycStatus(
        id,
        status,
        status === "REJECTED" ? rejectReason.trim() || undefined : undefined,
      );
      setUser(res.user);
      setRejectReason("");
      setActionNote(
        status === "APPROVED" ? "KYC approved." : "KYC rejected.",
      );
    });

  const toggleSuspend = (suspend: boolean) =>
    runAction(suspend ? "suspend" : "unsuspend", async () => {
      if (!id) return;
      const days = suspendDays.trim() ? Number(suspendDays) : undefined;
      const res = await adminApi.suspendUser(id, suspend, days);
      setUser((prev) =>
        prev ? { ...prev, isActive: res.user.isActive } : prev,
      );
      setSuspendedUntil(res.user.suspendedUntil);
      setSuspendDays("");
      setActionNote(
        suspend
          ? res.user.suspendedUntil
            ? `Suspended until ${formatDate(res.user.suspendedUntil)}.`
            : "Suspended indefinitely."
          : "Suspension lifted.",
      );
    });

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
        <Text style={styles.headerTitle}>Member</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <Text style={styles.stateText}>Loading member...</Text>
        </View>
      ) : error || !user ? (
        <ErrorState
          message={error ?? "Member not found."}
          onRetry={fetchUser}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.name}>{user.fullName ?? "No name"}</Text>
            <Row label="Email" value={user.email} />
            <Row label="Roles" value={user.roles.join(", ")} />
            <Row label="KYC status" value={user.kycStatus.replace(/_/g, " ")} />
            <Row
              label="Account"
              value={
                user.isActive
                  ? "Active"
                  : suspendedUntil
                    ? `Suspended until ${formatDate(suspendedUntil)}`
                    : "Suspended"
              }
            />
            <Row label="Plan" value={user.subscriptionPlan} />
            <Row label="Joined" value={formatDate(user.createdAt)} />
            {user.location && <Row label="Location" value={user.location} />}
            {user.badges.length > 0 && (
              <Row label="Badges" value={user.badges.join(", ")} />
            )}
            <Row label="KYC documents" value={String(kycDocs.length)} />
          </View>

          {user.kycStatus === "PENDING" && kycDocs.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>KYC review</Text>
              {kycDocs.map((doc) => (
                <Row
                  key={doc.id}
                  label={doc.type.replace(/_/g, " ")}
                  value={`${doc.status} - ${formatDate(doc.createdAt)}`}
                />
              ))}
              <Pressable
                style={[
                  styles.primaryButton,
                  actionBusy === "kyc-APPROVED" && styles.buttonDisabled,
                ]}
                onPress={() => setKyc("APPROVED")}
                disabled={actionBusy !== null}
              >
                {actionBusy === "kyc-APPROVED" ? (
                  <ActivityIndicator color={theme.colors.primaryForeground} />
                ) : (
                  <Text style={styles.primaryButtonText}>Approve KYC</Text>
                )}
              </Pressable>
              <TextInput
                value={rejectReason}
                onChangeText={setRejectReason}
                placeholder="Rejection reason (optional)"
                placeholderTextColor={theme.colors.mutedForeground}
                style={styles.input}
              />
              <Pressable
                style={[
                  styles.dangerButton,
                  actionBusy === "kyc-REJECTED" && styles.buttonDisabled,
                ]}
                onPress={() => setKyc("REJECTED")}
                disabled={actionBusy !== null}
              >
                {actionBusy === "kyc-REJECTED" ? (
                  <ActivityIndicator color={theme.colors.error} />
                ) : (
                  <Text style={styles.dangerButtonText}>Reject KYC</Text>
                )}
              </Pressable>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Suspension</Text>
            {user.isActive ? (
              <>
                <TextInput
                  value={suspendDays}
                  onChangeText={setSuspendDays}
                  placeholder="Days (empty = indefinite)"
                  placeholderTextColor={theme.colors.mutedForeground}
                  keyboardType="numeric"
                  style={styles.input}
                />
                <Pressable
                  style={[
                    styles.dangerButton,
                    actionBusy === "suspend" && styles.buttonDisabled,
                  ]}
                  onPress={() => toggleSuspend(true)}
                  disabled={actionBusy !== null}
                >
                  {actionBusy === "suspend" ? (
                    <ActivityIndicator color={theme.colors.error} />
                  ) : (
                    <Text style={styles.dangerButtonText}>
                      Suspend account
                    </Text>
                  )}
                </Pressable>
              </>
            ) : (
              <Pressable
                style={[
                  styles.primaryButton,
                  actionBusy === "unsuspend" && styles.buttonDisabled,
                ]}
                onPress={() => toggleSuspend(false)}
                disabled={actionBusy !== null}
              >
                {actionBusy === "unsuspend" ? (
                  <ActivityIndicator color={theme.colors.primaryForeground} />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    Lift suspension
                  </Text>
                )}
              </Pressable>
            )}
          </View>

          {actionError && <Text style={styles.errorText}>{actionError}</Text>}
          {actionNote && <Text style={styles.noteText}>{actionNote}</Text>}
        </ScrollView>
      )}
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stateText: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  name: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.lg,
    fontFamily: theme.typography.font.bodySemibold,
  },
  sectionTitle: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.base,
    fontFamily: theme.typography.font.displayBold,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  rowLabel: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
  },
  rowValue: {
    flexShrink: 1,
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyMedium,
    textAlign: "right",
  },
  input: {
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    height: theme.spacing.xxl,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
  },
  primaryButtonText: {
    color: theme.colors.primaryForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
  dangerButton: {
    alignItems: "center",
    justifyContent: "center",
    height: theme.spacing.xxl,
    borderRadius: theme.radius.md,
    borderColor: theme.colors.error,
    borderWidth: 1,
  },
  dangerButtonText: {
    color: theme.colors.error,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyMedium,
    textAlign: "center",
  },
  noteText: {
    color: theme.colors.success,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyMedium,
    textAlign: "center",
  },
});
