import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Linking } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { theme } from "../theme";

// Static help content. Everything here describes how the product actually
// works today (dispute rules mirror the Terms of Service and the in-app
// dispute flow) — keep it in sync when those flows change.
const sections: { title: string; body: string }[] = [
  {
    title: "Staying safe on Lenda",
    body: "Meet in public, well-lit places for pickups and returns whenever possible. Check the host's Verified badge before booking — it means their identity documents were reviewed and approved. Inspect items together at handover, and only confirm the pickup in the app once you are both satisfied with the item's condition. Keep all communication in the Lenda chat so there is a record if anything goes wrong.",
  },
  {
    title: "Never pay outside the platform",
    body: "The price you see when you book is locked and recorded. Anyone asking you to send money directly by mobile money or cash, cancel and rebook cheaper off the app, or share payment details in chat is putting you outside Lenda's protection. Report it to support instead.",
  },
  {
    title: "How handover works",
    body: "For rentals, both you and the other party confirm the pickup in the app — the booking only becomes active once both of you have confirmed. The same happens for the return. This dual confirmation is your protection: it records that both sides agreed the item changed hands.",
  },
  {
    title: "How disputes work",
    body: "If something goes wrong during an active booking, open the booking and tap \"Report a problem\". Describe what happened — the booking is then frozen and reviewed by the Lenda team. Disputes must be raised within 24 hours of the booking completing. Provide photos, chat messages, and handover records as evidence. Both parties are expected to communicate in good faith; Lenda's decision on platform disputes is final.",
  },
  {
    title: "Cancellations",
    body: "Either party can cancel a booking before it becomes active, without penalty, from the booking screen. Once a booking is active, cancellation needs mutual agreement or Lenda's intervention. Repeated last-minute cancellations affect your standing on the platform.",
  },
  {
    title: "Contact support",
    body: "For anything this page does not cover — account problems, safety concerns, dispute follow-ups — email support@lenda.work. For privacy questions or data requests, use privacy@lenda.work. We aim to respond within 2 business days.",
  },
];

export default function HelpSafetyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft
            size={theme.typography.size.xxl}
            color={theme.colors.foreground}
          />
        </Pressable>
        <Text style={styles.headerTitle}>Help &amp; Safety</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        <Pressable
          style={styles.supportButton}
          onPress={() =>
            Linking.openURL("mailto:support@lenda.work").catch(() => {})
          }
        >
          <Text style={styles.supportButtonText}>Email support</Text>
        </Pressable>
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
  scrollContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  section: {
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.base,
    fontFamily: theme.typography.font.displayBold,
    textTransform: "uppercase",
  },
  sectionBody: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
    lineHeight: theme.typography.size.xl,
  },
  supportButton: {
    alignItems: "center",
    justifyContent: "center",
    height: theme.spacing.xxl,
    borderRadius: theme.radius.md,
    borderColor: theme.colors.gold,
    borderWidth: 1,
  },
  supportButtonText: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.base,
    fontFamily: theme.typography.font.bodySemibold,
  },
});
