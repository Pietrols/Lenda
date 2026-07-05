import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Crown } from "lucide-react-native";
import { theme } from "../theme";
import {
  subscriptionsApi,
  type Subscription,
} from "../api/subscriptions";
import { ApiError } from "../api/client";
import { useAuthStore } from "../store/auth.store";
import { formatDate } from "../lib/dates";

const planLabels: Record<string, string> = {
  FREE: "Free",
  PRO_MONTHLY: "Pro Monthly",
  PRO_ANNUAL: "Pro Annual",
};

export default function SubscriptionScreen() {
  const router = useRouter();
  const isHost = useAuthStore(
    (s) => s.user?.roles.includes("HOST") ?? false,
  );

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<
    "PRO_MONTHLY" | "PRO_ANNUAL" | "CANCEL" | null
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await subscriptionsApi.getStatus();
      setSubscription(res.subscription);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not load your subscription. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isHost) fetchStatus();
  }, [isHost, fetchStatus]);

  const upgrade = async (plan: "PRO_MONTHLY" | "PRO_ANNUAL") => {
    setActionError(null);
    setActionLoading(plan);
    try {
      const res = await subscriptionsApi.upgrade(plan);
      setSubscription(res.subscription);
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "Could not upgrade. Please try again.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const cancel = async () => {
    setActionError(null);
    setActionLoading("CANCEL");
    try {
      const res = await subscriptionsApi.cancel();
      setSubscription(res.subscription);
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "Could not cancel. Please try again.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const isPro = !!subscription && subscription.subscriptionPlan !== "FREE";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft
            size={theme.typography.size.xxl}
            color={theme.colors.foreground}
          />
        </Pressable>
        <Text style={styles.headerTitle}>Subscription</Text>
      </View>

      {!isHost ? (
        <View style={styles.center}>
          <Text style={styles.stateText}>
            Subscriptions are for hosts. Become a host to unlock Pro plans.
          </Text>
        </View>
      ) : isLoading ? (
        <View style={styles.center}>
          <Text style={styles.stateText}>Loading subscription...</Text>
        </View>
      ) : error || !subscription ? (
        <View style={styles.center}>
          <Text style={styles.stateText}>
            {error ?? "Subscription unavailable."}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.planCard, isPro && styles.planCardPro]}>
            <Crown
              size={theme.typography.size.xxl}
              color={isPro ? theme.colors.gold : theme.colors.mutedForeground}
            />
            <Text style={styles.planName}>
              {planLabels[subscription.subscriptionPlan] ??
                subscription.subscriptionPlan}
            </Text>
            {subscription.commissionRate && (
              <Text style={styles.planMeta}>
                Commission rate:{" "}
                {Math.round(Number(subscription.commissionRate) * 100)}%
              </Text>
            )}
            {subscription.subscriptionEndsAt && (
              <Text style={styles.planMeta}>
                Renews/ends: {formatDate(subscription.subscriptionEndsAt)}
              </Text>
            )}
          </View>

          {!isPro ? (
            <>
              <Text style={styles.pitch}>
                Go Pro to drop your commission from 15% to 10%, gain extra
                listing slots, and get boosted visibility in Browse.
              </Text>
              <Pressable
                style={[
                  styles.upgradeButton,
                  actionLoading !== null && styles.buttonDisabled,
                ]}
                onPress={() => upgrade("PRO_MONTHLY")}
                disabled={actionLoading !== null}
              >
                {actionLoading === "PRO_MONTHLY" ? (
                  <ActivityIndicator color={theme.colors.primaryForeground} />
                ) : (
                  <Text style={styles.upgradeButtonText}>
                    Upgrade to Pro Monthly
                  </Text>
                )}
              </Pressable>
              <Pressable
                style={[
                  styles.upgradeButtonOutline,
                  actionLoading !== null && styles.buttonDisabled,
                ]}
                onPress={() => upgrade("PRO_ANNUAL")}
                disabled={actionLoading !== null}
              >
                {actionLoading === "PRO_ANNUAL" ? (
                  <ActivityIndicator color={theme.colors.gold} />
                ) : (
                  <Text style={styles.upgradeOutlineText}>
                    Upgrade to Pro Annual
                  </Text>
                )}
              </Pressable>
            </>
          ) : (
            <Pressable
              style={[
                styles.cancelButton,
                actionLoading !== null && styles.buttonDisabled,
              ]}
              onPress={cancel}
              disabled={actionLoading !== null}
            >
              {actionLoading === "CANCEL" ? (
                <ActivityIndicator color={theme.colors.error} />
              ) : (
                <Text style={styles.cancelButtonText}>
                  Cancel subscription
                </Text>
              )}
            </Pressable>
          )}

          {actionError && (
            <Text style={styles.errorText}>{actionError}</Text>
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
  planCard: {
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
  planCardPro: {
    borderColor: theme.colors.gold,
  },
  planName: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.xl,
    fontFamily: theme.typography.font.displayBold,
    textTransform: "uppercase",
  },
  planMeta: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
  },
  pitch: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
    textAlign: "center",
    lineHeight: theme.typography.size.lg,
  },
  upgradeButton: {
    alignItems: "center",
    justifyContent: "center",
    height: theme.spacing.xxl,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
  },
  upgradeButtonText: {
    color: theme.colors.primaryForeground,
    fontSize: theme.typography.size.base,
    fontFamily: theme.typography.font.bodySemibold,
  },
  upgradeButtonOutline: {
    alignItems: "center",
    justifyContent: "center",
    height: theme.spacing.xxl,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.gold,
  },
  upgradeOutlineText: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.base,
    fontFamily: theme.typography.font.bodySemibold,
  },
  cancelButton: {
    alignItems: "center",
    justifyContent: "center",
    height: theme.spacing.xxl,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  cancelButtonText: {
    color: theme.colors.error,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
    textAlign: "center",
  },
});
