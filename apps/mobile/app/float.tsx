import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Wallet } from "lucide-react-native";
import { theme } from "../theme";
import {
  floatApi,
  type FloatAccount,
  type MobileMoneyProvider,
} from "../api/float";
import { ApiError } from "../api/client";
import { useAuthStore } from "../store/auth.store";
import { formatDate } from "../lib/dates";
import { ErrorState } from "../components/ErrorState";

const providers: MobileMoneyProvider[] = ["AIRTEL", "MTN", "ZAMTEL"];

function money(value: string): string {
  return `K${Number(value).toLocaleString()}`;
}

export default function FloatScreen() {
  const router = useRouter();
  const isHost = useAuthStore(
    (s) => s.user?.roles.includes("HOST") ?? false,
  );

  const [float, setFloat] = useState<FloatAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [provider, setProvider] = useState<MobileMoneyProvider>("AIRTEL");
  const [mobileNumber, setMobileNumber] = useState("");
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawNote, setWithdrawNote] = useState<string | null>(null);

  const fetchFloat = useCallback(async (refreshing = false) => {
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      const res = await floatApi.getMine();
      setFloat(res.float);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not load your float account. Please try again.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isHost) fetchFloat();
  }, [isHost, fetchFloat]);

  const setup = async () => {
    setSetupError(null);
    if (!mobileNumber.trim() || mobileNumber.trim().length < 7) {
      setSetupError("Please enter a valid mobile money number.");
      return;
    }
    setIsSettingUp(true);
    try {
      const res = await floatApi.setup(provider, mobileNumber.trim());
      setFloat(res.float);
    } catch (err) {
      setSetupError(
        err instanceof ApiError
          ? err.message
          : "Could not set up your float account. Please try again.",
      );
    } finally {
      setIsSettingUp(false);
    }
  };

  const withdraw = async () => {
    setWithdrawError(null);
    setWithdrawNote(null);
    const amount = Number(withdrawAmount);
    if (!withdrawAmount.trim() || Number.isNaN(amount) || amount <= 0) {
      setWithdrawError("Please enter a valid amount.");
      return;
    }
    setIsWithdrawing(true);
    try {
      await floatApi.withdraw(amount);
      setWithdrawAmount("");
      setWithdrawNote(
        "Withdrawal requested. It will be sent to your mobile money number once approved.",
      );
      await fetchFloat();
    } catch (err) {
      setWithdrawError(
        err instanceof ApiError
          ? err.message
          : "Could not request the withdrawal. Please try again.",
      );
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft
            size={theme.typography.size.xxl}
            color={theme.colors.foreground}
          />
        </Pressable>
        <Text style={styles.headerTitle}>Float &amp; Earnings</Text>
      </View>

      {!isHost ? (
        <View style={styles.center}>
          <Text style={styles.stateText}>
            The float account is for hosts. Become a host to start earning on
            Lenda.
          </Text>
        </View>
      ) : isLoading ? (
        <View style={styles.center}>
          <Text style={styles.stateText}>Loading float account...</Text>
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchFloat()} />
      ) : !float ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.setupIntro}>
              <Wallet
                size={theme.typography.size.display}
                color={theme.colors.gold}
              />
              <Text style={styles.setupTitle}>Set up your float</Text>
              <Text style={styles.stateText}>
                Your float account holds your earnings and pays out to your
                mobile money number.
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Mobile money provider</Text>
              <View style={styles.providerRow}>
                {providers.map((option) => (
                  <Pressable
                    key={option}
                    style={[
                      styles.providerPill,
                      provider === option && styles.providerPillActive,
                    ]}
                    onPress={() => setProvider(option)}
                  >
                    <Text
                      style={[
                        styles.providerText,
                        provider === option && styles.providerTextActive,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Mobile money number</Text>
              <TextInput
                value={mobileNumber}
                onChangeText={setMobileNumber}
                placeholder="e.g. 0971234567"
                placeholderTextColor={theme.colors.mutedForeground}
                keyboardType="phone-pad"
                style={styles.input}
              />
            </View>

            {setupError && (
              <Text style={styles.errorText}>{setupError}</Text>
            )}

            <Pressable
              style={[
                styles.primaryButton,
                isSettingUp && styles.buttonDisabled,
              ]}
              onPress={setup}
              disabled={isSettingUp}
            >
              {isSettingUp ? (
                <ActivityIndicator color={theme.colors.primaryForeground} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Create float account
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchFloat(true)}
              tintColor={theme.colors.gold}
              colors={[theme.colors.gold]}
            />
          }
        >
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available balance</Text>
            <Text style={styles.balanceValue}>{money(float.balance)}</Text>
            <View style={styles.balanceMetaRow}>
              <Text style={styles.balanceMeta}>
                Earned {money(float.totalEarned)}
              </Text>
              <Text style={styles.balanceMeta}>
                Withdrawn {money(float.totalWithdrawn)}
              </Text>
              <Text style={styles.balanceMeta}>
                {float.bookingCount}{" "}
                {float.bookingCount === 1 ? "booking" : "bookings"}
              </Text>
            </View>
            <Text style={styles.payoutInfo}>
              Pays out to {float.mobileMoneyProvider} {float.mobileMoneyNumber}
            </Text>
          </View>

          <View style={styles.withdrawRow}>
            <TextInput
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              placeholder="Amount (min K100)"
              placeholderTextColor={theme.colors.mutedForeground}
              keyboardType="numeric"
              style={styles.withdrawInput}
            />
            <Pressable
              style={[
                styles.primaryButton,
                styles.withdrawButton,
                isWithdrawing && styles.buttonDisabled,
              ]}
              onPress={withdraw}
              disabled={isWithdrawing}
            >
              {isWithdrawing ? (
                <ActivityIndicator color={theme.colors.primaryForeground} />
              ) : (
                <Text style={styles.primaryButtonText}>Withdraw</Text>
              )}
            </Pressable>
          </View>
          {withdrawError && (
            <Text style={styles.errorText}>{withdrawError}</Text>
          )}
          {withdrawNote && (
            <Text style={styles.successText}>{withdrawNote}</Text>
          )}

          {float.withdrawals.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Withdrawals</Text>
              {float.withdrawals.map((withdrawal) => (
                <View key={withdrawal.id} style={styles.entryRow}>
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryTitle}>
                      {money(withdrawal.amount)} to {withdrawal.provider}
                    </Text>
                    <Text style={styles.entryMeta}>
                      {formatDate(withdrawal.createdAt)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.entryStatus,
                      withdrawal.status === "COMPLETED" &&
                        styles.entryStatusDone,
                    ]}
                  >
                    {withdrawal.status.replaceAll("_", " ")}
                  </Text>
                </View>
              ))}
            </>
          )}

          {float.transactions.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Transactions</Text>
              {float.transactions.map((transaction) => (
                <View key={transaction.id} style={styles.entryRow}>
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryTitle}>
                      {transaction.type.replaceAll("_", " ")}
                    </Text>
                    <Text style={styles.entryMeta}>
                      {formatDate(transaction.createdAt)}
                    </Text>
                  </View>
                  <Text style={styles.entryAmount}>
                    {money(transaction.amount)}
                  </Text>
                </View>
              ))}
            </>
          )}

          {float.transactions.length === 0 &&
            float.withdrawals.length === 0 && (
              <Text style={styles.stateText}>
                No activity yet. Earnings from completed bookings will appear
                here.
              </Text>
            )}
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
  flex: {
    flex: 1,
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
    paddingHorizontal: theme.spacing.lg,
  },
  stateText: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
    textAlign: "center",
  },
  scrollContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  setupIntro: {
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  setupTitle: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.xl,
    fontFamily: theme.typography.font.displayBold,
    textTransform: "uppercase",
  },
  field: {
    gap: theme.spacing.xs,
  },
  label: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyMedium,
  },
  providerRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  providerPill: {
    flex: 1,
    alignItems: "center",
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
  },
  providerPillActive: {
    borderColor: theme.colors.gold,
    backgroundColor: theme.colors.goldTint,
  },
  providerText: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
  providerTextActive: {
    color: theme.colors.gold,
  },
  input: {
    minHeight: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
  successText: {
    color: theme.colors.success,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    height: theme.spacing.xxl,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: theme.colors.primaryForeground,
    fontSize: theme.typography.size.base,
    fontFamily: theme.typography.font.bodySemibold,
  },
  balanceCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.gold,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    alignItems: "center",
  },
  balanceLabel: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyMedium,
    textTransform: "uppercase",
  },
  balanceValue: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.display,
    fontFamily: theme.typography.font.displayBold,
  },
  balanceMetaRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  balanceMeta: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
  payoutInfo: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyMedium,
  },
  withdrawRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  withdrawInput: {
    flex: 1,
    height: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
  },
  withdrawButton: {
    paddingHorizontal: theme.spacing.lg,
  },
  sectionTitle: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.base,
    fontFamily: theme.typography.font.displayBold,
    textTransform: "uppercase",
    marginTop: theme.spacing.sm,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  entryInfo: {
    flex: 1,
    gap: theme.spacing.xs / 2,
  },
  entryTitle: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
  entryMeta: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
  entryAmount: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
  entryStatus: {
    color: theme.colors.warning,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodySemibold,
  },
  entryStatusDone: {
    color: theme.colors.success,
  },
});
