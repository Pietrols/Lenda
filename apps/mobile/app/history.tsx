import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowDownToLine,
  ArrowLeft,
  CalendarDays,
  Wallet,
} from "lucide-react-native";
import { theme } from "../theme";
import { bookingsApi, type BookingStatus } from "../api/bookings";
import { floatApi } from "../api/float";
import { useAuthStore } from "../store/auth.store";
import { ErrorState } from "../components/ErrorState";
import { RowCardSkeleton } from "../components/Skeleton";
import { BookingStatusBadge } from "../components/BookingStatusBadge";
import { formatDate } from "../lib/dates";

// Bookings in a terminal state count as history; everything else still lives
// on the Bookings tab.
const terminalStatuses: BookingStatus[] = [
  "COMPLETED",
  "RETURNED",
  "CANCELLED",
  "DISPUTED",
  "NEGOTIATION_FAILED",
];

type HistoryEntry = {
  id: string;
  kind: "BOOKING" | "FLOAT" | "WITHDRAWAL";
  title: string;
  detail: string;
  amount: string;
  date: string;
  bookingStatus?: BookingStatus;
  bookingId?: string;
};

export default function HistoryScreen() {
  const router = useRouter();
  const isHost = useAuthStore(
    (s) => s.user?.roles.includes("HOST") ?? false,
  );

  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(
    async (refreshing = false) => {
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      try {
        // Float history only exists for hosts with a float account; its
        // failure (or absence) must not sink the booking history.
        const [bookingsRes, floatRes] = await Promise.allSettled([
          bookingsApi.getAll(),
          isHost ? floatApi.getMine() : Promise.resolve({ float: null }),
        ]);

        if (bookingsRes.status === "rejected") throw bookingsRes.reason;

        const items: HistoryEntry[] = [];

        for (const booking of bookingsRes.value.bookings) {
          if (!terminalStatuses.includes(booking.status)) continue;
          items.push({
            id: `booking-${booking.id}`,
            kind: "BOOKING",
            title: booking.listing.title,
            detail: "Booking",
            amount: `${booking.currency} ${Number(booking.totalAmount).toLocaleString()}`,
            date: booking.updatedAt,
            bookingStatus: booking.status,
            bookingId: booking.id,
          });
        }

        const float =
          floatRes.status === "fulfilled" ? floatRes.value.float : null;
        if (float) {
          for (const transaction of float.transactions) {
            items.push({
              id: `float-${transaction.id}`,
              kind: "FLOAT",
              title: transaction.type.replaceAll("_", " "),
              detail: `Float - balance K${Number(transaction.balanceAfter).toLocaleString()} after`,
              amount: `K${Number(transaction.amount).toLocaleString()}`,
              date: transaction.createdAt,
            });
          }
          for (const withdrawal of float.withdrawals) {
            items.push({
              id: `withdrawal-${withdrawal.id}`,
              kind: "WITHDRAWAL",
              title: `Withdrawal to ${withdrawal.provider}`,
              detail: `${withdrawal.status.replaceAll("_", " ")} - net K${Number(withdrawal.netAmount).toLocaleString()}`,
              amount: `K${Number(withdrawal.amount).toLocaleString()}`,
              date: withdrawal.createdAt,
            });
          }
        }

        items.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        setEntries(items);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load your history. Please try again.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [isHost],
  );

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft
            size={theme.typography.size.xxl}
            color={theme.colors.foreground}
          />
        </Pressable>
        <Text style={styles.headerTitle}>History</Text>
      </View>

      {isLoading ? (
        <View style={styles.listContent}>
          <RowCardSkeleton />
          <RowCardSkeleton />
          <RowCardSkeleton />
          <RowCardSkeleton />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchHistory()} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const row = (
              <View style={styles.row}>
                <View style={styles.rowIcon}>
                  {item.kind === "BOOKING" ? (
                    <CalendarDays
                      size={theme.typography.size.base}
                      color={theme.colors.gold}
                    />
                  ) : item.kind === "WITHDRAWAL" ? (
                    <ArrowDownToLine
                      size={theme.typography.size.base}
                      color={theme.colors.gold}
                    />
                  ) : (
                    <Wallet
                      size={theme.typography.size.base}
                      color={theme.colors.gold}
                    />
                  )}
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.rowDetail} numberOfLines={1}>
                    {item.detail}
                  </Text>
                  <Text style={styles.rowDate}>{formatDate(item.date)}</Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.rowAmount}>{item.amount}</Text>
                  {item.bookingStatus && (
                    <BookingStatusBadge status={item.bookingStatus} />
                  )}
                </View>
              </View>
            );
            if (!item.bookingId) return row;
            return (
              <Pressable
                onPress={() => router.push(`/booking/${item.bookingId}`)}
              >
                {row}
              </Pressable>
            );
          }}
          contentContainerStyle={
            entries.length === 0 ? styles.centerContent : styles.listContent
          }
          ListEmptyComponent={
            <Text style={styles.stateText}>
              No history yet. Completed bookings, earnings, and withdrawals
              will appear here.
            </Text>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchHistory(true)}
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
    color: theme.colors.foreground,
    fontSize: theme.typography.size.lg,
    fontFamily: theme.typography.font.displayBold,
    textTransform: "uppercase",
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  centerContent: {
    flexGrow: 1,
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  rowIcon: {
    width: theme.spacing.xl,
    alignItems: "center",
  },
  rowBody: {
    flex: 1,
    gap: theme.spacing.xs / 2,
  },
  rowTitle: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
  rowDetail: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
  rowDate: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
  rowRight: {
    alignItems: "flex-end",
    gap: theme.spacing.xs,
  },
  rowAmount: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
});
