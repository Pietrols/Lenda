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
import { useLocalSearchParams, useRouter, Link } from "expo-router";
import { ArrowRight, Eye, EyeOff } from "lucide-react-native";
import { theme } from "../theme";
import { authApi } from "../api/auth";
import { ApiError } from "../api/client";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const email = emailParam ?? "";

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleReset = async () => {
    if (!otp || !newPassword) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      await authApi.resetPassword(email, otp, newPassword);
      router.replace("/login");
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
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
            <Text style={styles.title}>New password</Text>
            <Text style={styles.subtitle}>
              Enter the code sent to{" "}
              <Text style={{ color: theme.colors.gold }}>{email}</Text>
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>Reset code</Text>
              <TextInput
                value={otp}
                onChangeText={setOtp}
                placeholder="6-digit code"
                placeholderTextColor={theme.colors.mutedForeground}
                keyboardType="number-pad"
                maxLength={6}
                style={[styles.input, styles.otpInput]}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>New password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  placeholderTextColor={theme.colors.mutedForeground}
                  secureTextEntry={!showPassword}
                  style={[styles.input, styles.passwordInput]}
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.eyeButton}
                  hitSlop={8}
                >
                  {showPassword ? (
                    <EyeOff size={18} color={theme.colors.mutedForeground} />
                  ) : (
                    <Eye size={18} color={theme.colors.mutedForeground} />
                  )}
                </Pressable>
              </View>
            </View>

            {formError && (
              <View style={styles.formErrorBox}>
                <Text style={styles.formErrorText}>{formError}</Text>
              </View>
            )}

            <Pressable
              style={[
                styles.submitButton,
                (isSubmitting || !otp || !newPassword) &&
                  styles.submitButtonDisabled,
              ]}
              onPress={handleReset}
              disabled={isSubmitting || !otp || !newPassword}
            >
              {isSubmitting ? (
                <ActivityIndicator color={theme.colors.primaryForeground} />
              ) : (
                <>
                  <Text style={styles.submitText}>Reset password</Text>
                  <ArrowRight
                    size={16}
                    color={theme.colors.primaryForeground}
                  />
                </>
              )}
            </Pressable>

            <Link href="/forgot-password" asChild>
              <Pressable style={styles.resendLink}>
                <Text style={styles.linkGold}>Resend code</Text>
              </Pressable>
            </Link>
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
  otpInput: {
    textAlign: "center",
    letterSpacing: 8,
    fontSize: theme.typography.size.lg,
  },
  passwordRow: { position: "relative", justifyContent: "center" },
  passwordInput: { paddingRight: 44 },
  eyeButton: { position: "absolute", right: theme.spacing.md },
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
  resendLink: { alignItems: "center" },
  linkGold: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
});
