import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useRouter } from "expo-router";
import { ArrowLeft, Search } from "lucide-react-native";
import { theme } from "../../theme";
import { adminApi, type AdminUser } from "../../api/admin";
import { ApiError } from "../../api/client";
import { useAuthStore } from "../../store/auth.store";
import { ErrorState } from "../../components/ErrorState";

const kycColors: Record<string, string> = {
  APPROVED: theme.colors.success,
  PENDING: theme.colors.warning,
  REJECTED: theme.colors.error,
};

function UserRow({ user, onPress }: { user: AdminUser; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardMain}>
        <Text style={styles.cardName} numberOfLines={1}>
          {user.fullName ?? "No name"}
        </Text>
        <Text style={styles.cardEmail} numberOfLines={1}>
          {user.email}
        </Text>
        <Text style={styles.cardRoles}>{user.roles.join(" / ")}</Text>
      </View>
      <View style={styles.cardStatus}>
        <Text
          style={[
            styles.kycText,
            { color: kycColors[user.kycStatus] ?? theme.colors.mutedForeground },
          ]}
        >
          {user.kycStatus.replace(/_/g, " ")}
        </Text>
        {!user.isActive && <Text style={styles.suspendedText}>SUSPENDED</Text>}
      </View>
    </Pressable>
  );
}

export default function AdminUsersScreen() {
  const router = useRouter();
  const isAdmin = useAuthStore(
    (s) => s.user?.roles.includes("ADMIN") ?? false,
  );

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchUsers = useCallback(async (refreshing = false) => {
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      const res = await adminApi.getUsers(1, 200);
      setUsers(res.users);
      setTotal(res.total);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not load members. Please try again.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // The endpoint has no server-side search, so filter the fetched page here.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.fullName ?? "").toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [users, search]);

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
        <Text style={styles.headerTitle}>Members</Text>
        <Text style={styles.headerCount}>{total}</Text>
      </View>

      <View style={styles.searchRow}>
        <Search
          size={theme.typography.size.base}
          color={theme.colors.mutedForeground}
        />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search name or email"
          placeholderTextColor={theme.colors.mutedForeground}
          autoCapitalize="none"
          style={styles.searchInput}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <Text style={styles.stateText}>Loading members...</Text>
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchUsers()} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <UserRow
              user={item}
              onPress={() => router.push(`/admin/users/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.stateText}>No members match your search.</Text>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchUsers(true)}
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
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
    paddingVertical: theme.spacing.sm,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  stateText: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
    textAlign: "center",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
  },
  cardMain: {
    flex: 1,
    gap: 2,
  },
  cardName: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.base,
    fontFamily: theme.typography.font.bodySemibold,
  },
  cardEmail: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
  cardRoles: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyMedium,
    textTransform: "uppercase",
  },
  cardStatus: {
    alignItems: "flex-end",
    gap: 2,
  },
  kycText: {
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodySemibold,
  },
  suspendedText: {
    color: theme.colors.error,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodySemibold,
  },
});
