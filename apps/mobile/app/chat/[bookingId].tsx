import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Send } from "lucide-react-native";
import { theme } from "../../theme";
import { messagesApi, type BookingMessage } from "../../api/messages";
import { ApiError } from "../../api/client";
import { useAuthStore } from "../../store/auth.store";
import { ErrorState } from "../../components/ErrorState";
import { formatDate } from "../../lib/dates";

const POLL_MS = 5000;

export default function ChatScreen() {
  const router = useRouter();
  const { bookingId, title } = useLocalSearchParams<{
    bookingId: string;
    title?: string;
  }>();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [messages, setMessages] = useState<BookingMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef<FlatList<BookingMessage>>(null);

  const fetchMessages = useCallback(
    async (initial = false) => {
      if (!bookingId) return;
      if (initial) setIsLoading(true);
      try {
        const res = await messagesApi.getAll(bookingId);
        setMessages(res.messages);
        setError(null);
      } catch (err) {
        // Only surface errors on the initial load; a failed poll just retries.
        if (initial) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not load messages. Please try again.",
          );
        }
      } finally {
        if (initial) setIsLoading(false);
      }
    },
    [bookingId],
  );

  useFocusEffect(
    useCallback(() => {
      fetchMessages(true);
      const interval = setInterval(() => fetchMessages(), POLL_MS);
      return () => clearInterval(interval);
    }, [fetchMessages]),
  );

  const send = async () => {
    const text = draft.trim();
    if (!text || !bookingId || isSending) return;
    setIsSending(true);
    try {
      const res = await messagesApi.send(bookingId, text);
      setDraft("");
      setMessages((prev) => [...prev, res.message]);
      listRef.current?.scrollToEnd({ animated: true });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not send the message. Please try again.",
      );
    } finally {
      setIsSending(false);
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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title ?? "Messages"}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {isLoading ? (
          <View style={styles.center}>
            <Text style={styles.stateText}>Loading messages...</Text>
          </View>
        ) : error && messages.length === 0 ? (
          <ErrorState message={error} onRetry={() => fetchMessages(true)} />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={
              messages.length === 0 ? styles.centerContent : styles.listContent
            }
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: false })
            }
            renderItem={({ item }) => {
              const mine = item.senderId === currentUserId;
              return (
                <View
                  style={[
                    styles.bubbleRow,
                    mine ? styles.bubbleRowMine : styles.bubbleRowTheirs,
                  ]}
                >
                  <View
                    style={[
                      styles.bubble,
                      mine ? styles.bubbleMine : styles.bubbleTheirs,
                    ]}
                  >
                    {!mine && (
                      <Text style={styles.senderName}>
                        {item.sender.fullName ?? "Lenda member"}
                      </Text>
                    )}
                    <Text style={styles.bubbleText}>{item.message}</Text>
                    <Text style={styles.bubbleTime}>
                      {formatDate(item.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.stateText}>
                No messages yet. Say hello and coordinate the details.
              </Text>
            }
          />
        )}

        <View style={styles.inputRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Write a message"
            placeholderTextColor={theme.colors.mutedForeground}
            multiline
            style={styles.input}
          />
          <Pressable
            style={[
              styles.sendButton,
              (isSending || !draft.trim()) && styles.sendButtonDisabled,
            ]}
            onPress={send}
            disabled={isSending || !draft.trim()}
          >
            {isSending ? (
              <ActivityIndicator color={theme.colors.primaryForeground} />
            ) : (
              <Send
                size={theme.typography.size.base}
                color={theme.colors.primaryForeground}
              />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
    flex: 1,
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
  listContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  bubbleRow: {
    flexDirection: "row",
  },
  bubbleRowMine: {
    justifyContent: "flex-end",
  },
  bubbleRowTheirs: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.xs / 2,
  },
  bubbleMine: {
    backgroundColor: theme.colors.goldTint,
    borderColor: theme.colors.gold,
    borderWidth: 1,
  },
  bubbleTheirs: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  senderName: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodySemibold,
  },
  bubbleText: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
    lineHeight: theme.typography.size.lg,
  },
  bubbleTime: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
    alignSelf: "flex-end",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    backgroundColor: theme.colors.background,
  },
  input: {
    flex: 1,
    maxHeight: theme.spacing.xxl * 2,
    minHeight: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
  },
  sendButton: {
    width: theme.spacing.xxl,
    height: theme.spacing.xxl,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
