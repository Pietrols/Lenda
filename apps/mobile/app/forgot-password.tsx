import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Link } from "expo-router";
import { ArrowRight, Mail } from "lucide-react-native";
import { theme } from "../theme";
import { authApi } from "../api/auth";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!email) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.brand}>
              LEN<Text style={{ color: theme.colors.gold }}>DA</Text>
            </Text>
            <View style={styles.goldLine} />
            <Text style={styles.title}>Reset password</Text>
            <Text style={styles.subtitle}>
              Enter your email and we&apos;ll send you a reset code
            </Text>
          </View>

          <View style={styles.card}>
            {sent ? (
              <View style={styles.sentBox}>
                <View style={styles.sentIcon}>
                  <Mail size={24} color={theme.colors.gold} />
                </View>
                <Text style={styles.sentTitle}>Check your email</Text>
                <Text style={styles.subtitle}>
                  If an account exists for {email}, a reset code has been sent.
                </Text>
                <Pressable
                  style={styles.submitButton}
                  onPress={() =>
                    router.push({
                      pathname: "/reset-password",
                      params: { email },
                    })
                  }
                >
                  <Text style={styles.submitText}>Enter reset code</Text>
                  <ArrowRight
                    size={16}
                    color={theme.colors.primaryForeground}
                  />
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: theme.spacing.md }}>
                <View style={styles.field}>
                  <Text style={styles.label}>Email address</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={theme.colors.mutedForeground}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={styles.input}
                  />
                </View>

                {formError && (
                  <View style={styles.formErrorBox}>
                    <Text style={styles.formErrorText}>{formError}</Text>
                  </View>
                )}

                <Pressable
                  style={[
                    styles.submitButton,
                    (isSubmitting || !email) && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSend}
                  disabled={isSubmitting || !email}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={theme.colors.primaryForeground} />
                  ) : (
                    <>
                      <Text style={styles.submitText}>Send reset code</Text>
                      <ArrowRight
                        size={16}
                        color={theme.colors.primaryForeground}
                      />
                    </>
                  )}
                </Pressable>
              </View>
            )}

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Remember your password? </Text>
              <Link href="/login" asChild>
                <Pressable>
                  <Text style={styles.linkGold}>Sign in</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xxl,
  },
  header: { alignItems: "center", marginBottom: theme.spacing.xl },
  brand: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.xxl,
    fontFamily: theme.typography.font.displayBlack,
    letterSpacing: 2,
  },
  goldLine: {
    width: 48,
    height: 2,
    backgroundColor: theme.colors.gold,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  title: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.xl,
    fontFamily: theme.typography.font.displayBold,
    textTransform: "uppercase",
  },
  subtitle: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
    marginTop: theme.spacing.xs,
    textAlign: "center",
  },
  card: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  field: { gap: theme.spacing.xs },
  label: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyMedium,
  },
  input: {
    height: 44,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
  },
  formErrorBox: {
    backgroundColor: "hsl(0, 62%, 14%)",
    borderColor: theme.colors.error,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
  },
  formErrorText: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: {
    color: theme.colors.primaryForeground,
    fontSize: theme.typography.size.base,
    fontFamily: theme.typography.font.bodySemibold,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginVertical: theme.spacing.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  dividerText: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
  },
  footerRow: { flexDirection: "row", justifyContent: "center" },
  footerText: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
  },
  linkGold: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
  sentBox: { alignItems: "center", gap: theme.spacing.sm },
  sentIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "hsl(42, 60%, 57%, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  sentTitle: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.lg,
    fontFamily: theme.typography.font.displayBold,
    textTransform: "uppercase",
  },
});
