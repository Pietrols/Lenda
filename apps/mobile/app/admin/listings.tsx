import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { theme } from "../../theme";
import { adminApi, type AdminListing } from "../../api/admin";
import { ApiError } from "../../api/client";
import { useAuthStore } from "../../store/auth.store";
import { ErrorState } from "../../components/ErrorState";
import { ListingStatusBadge } from "../../components/ListingStatusBadge";

export default function AdminListingsScreen() {
  const router = useRouter();
  const isAdmin = useAuthStore(
    (s) => s.user?.roles.includes("ADMIN") ?? false,
  );

  const [listings, setListings] = useState<AdminListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchListings = useCallback(async (refreshing = false) => {
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      const res = await adminApi.getListings();
      setListings(res.listings);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not load listings. Please try again.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const moderate = async (id: string, action: "verify" | "suspend") => {
    setActionBusy(`${action}-${id}`);
    setActionError(null);
    try {
      const res =
        action === "verify"
          ? await adminApi.verifyListing(id)
          : await adminApi.suspendListing(id);
      setListings((prev) =>
        prev.map((l) =>
          l.id === id ? { ...l, status: res.listing.status } : l,
        ),
      );
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
        <Text style={styles.headerTitle}>Listings</Text>
        <Text style={styles.headerCount}>{listings.length}</Text>
      </View>

      {actionError && <Text style={styles.errorText}>{actionError}</Text>}

      {isLoading ? (
        <View style={styles.center}>
          <Text style={styles.stateText}>Loading listings...</Text>
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchListings()} />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Pressable onPress={() => router.push(`/listing/${item.id}`)}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.cardMeta}>
                  {item.pillar} - {item.category}
                </Text>
                <Text style={styles.cardHost} numberOfLines={1}>
                  {item.host.fullName ?? item.host.email}
                </Text>
              </Pressable>
              <View style={styles.cardFooter}>
                <ListingStatusBadge status={item.status} />
                <View style={styles.actions}>
                  {item.status === "PENDING_VERIFICATION" && (
                    <Pressable
                      style={styles.verifyButton}
                      onPress={() => moderate(item.id, "verify")}
                      disabled={actionBusy !== null}
                    >
                      {actionBusy === `verify-${item.id}` ? (
                        <ActivityIndicator
                          color={theme.colors.primaryForeground}
                        />
                      ) : (
                        <Text style={styles.verifyText}>Verify</Text>
                      )}
                    </Pressable>
                  )}
                  {item.status !== "SUSPENDED" && (
                    <Pressable
                      style={styles.suspendButton}
                      onPress={() => moderate(item.id, "suspend")}
                      disabled={actionBusy !== null}
                    >
                      {actionBusy === `suspend-${item.id}` ? (
                        <ActivityIndicator color={theme.colors.error} />
                      ) : (
                        <Text style={styles.suspendText}>Suspend</Text>
                      )}
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.stateText}>No listings yet.</Text>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchListings(true)}
              tintColor={theme.colors.gold}
              colors={[theme.colors.gold]}
            />
          }
        />
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
    flex: 1,
    color: theme.colors.foreground,
    fontSize: theme.typography.size.lg,
    fontFamily: theme.typography.font.displayBold,
    textTransform: "uppercase",
  },
  headerCount: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
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
    textAlign: "center",
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyMedium,
    textAlign: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  cardTitle: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.base,
    fontFamily: theme.typography.font.bodySemibold,
  },
  cardMeta: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyMedium,
    textTransform: "uppercase",
  },
  cardHost: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  verifyButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  verifyText: {
    color: theme.colors.primaryForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodySemibold,
  },
  suspendButton: {
    alignItems: "center",
    justifyContent: "center",
    borderColor: theme.colors.error,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  suspendText: {
    color: theme.colors.error,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodySemibold,
  },
});
