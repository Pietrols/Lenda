import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Link } from "expo-router";
import { ArrowRight, RotateCcw } from "lucide-react-native";
import { theme } from "../theme";
import { authApi } from "../api/auth";
import { ApiError } from "../api/client";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const email = emailParam ?? "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [resendNote, setResendNote] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const code = otp.join("");

  const handleVerify = async () => {
    if (code.length < 6) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      await authApi.verifyEmail({ email, otp: code });
      router.replace("/login");
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setFormError(null);
    setResendNote(null);
    try {
      await authApi.resendOtp(email);
      setResendNote("A new code has been sent to your email.");
      setCooldown(60);
    } catch {
      setFormError("Failed to resend code. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.brand}>
            LEN<Text style={{ color: theme.colors.gold }}>DA</Text>
          </Text>
          <View style={styles.goldLine} />
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to{" "}
            <Text style={{ color: theme.colors.gold }}>
              {email || "your email"}
            </Text>
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.otpRow}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                value={digit}
                onChangeText={(v) => handleChange(index, v)}
                onKeyPress={(e) => handleKeyPress(index, e.nativeEvent.key)}
                keyboardType="number-pad"
                maxLength={1}
                style={styles.otpBox}
              />
            ))}
          </View>

          {formError && (
            <View style={styles.formErrorBox}>
              <Text style={styles.formErrorText}>{formError}</Text>
            </View>
          )}
          {resendNote && <Text style={styles.resendNote}>{resendNote}</Text>}

          <Pressable
            style={[
              styles.submitButton,
              (isSubmitting || code.length < 6) && styles.submitButtonDisabled,
            ]}
            onPress={handleVerify}
            disabled={isSubmitting || code.length < 6}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.colors.primaryForeground} />
            ) : (
              <>
                <Text style={styles.submitText}>Verify email</Text>
                <ArrowRight size={16} color={theme.colors.primaryForeground} />
              </>
            )}
          </Pressable>

          <View style={styles.resendRow}>
            <Text style={styles.footerText}>Didn&apos;t receive a code? </Text>
            <Pressable
              onPress={handleResend}
              disabled={isResending || cooldown > 0}
              style={[
                styles.resendButton,
                cooldown > 0 && styles.resendDisabled,
              ]}
            >
              <RotateCcw
                size={13}
                color={
                  cooldown > 0
                    ? theme.colors.mutedForeground
                    : theme.colors.gold
                }
              />
              <Text
                style={cooldown > 0 ? styles.footerText : styles.linkGold}
              >
                {isResending
                  ? "Sending..."
                  : cooldown > 0
                    ? `Resend in ${cooldown}s`
                    : "Resend"}
              </Text>
            </Pressable>
          </View>
        </View>

        <Link href="/login" asChild>
          <Pressable style={styles.backLink}>
            <Text style={styles.footerText}>← Back to sign in</Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
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
  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: theme.spacing.sm,
  },
  otpBox: {
    width: 44,
    height: 52,
    textAlign: "center",
    fontSize: theme.typography.size.xl,
    fontFamily: theme.typography.font.displayBold,
    color: theme.colors.foreground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
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
  submitButtonDisabled: { opacity: 0.5 },
  submitText: {
    color: theme.colors.primaryForeground,
    fontSize: theme.typography.size.base,
    fontFamily: theme.typography.font.bodySemibold,
  },
  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  resendButton: { flexDirection: "row", alignItems: "center", gap: 4 },
  resendDisabled: { opacity: 0.7 },
  resendNote: {
    color: theme.colors.success,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
    textAlign: "center",
  },
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
  backLink: { alignItems: "center", marginTop: theme.spacing.lg },
});
