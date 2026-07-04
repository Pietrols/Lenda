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
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Role } from "@lenda/types";
import { useRouter, Link } from "expo-router";
import {
  Eye,
  EyeOff,
  ArrowRight,
  Home,
  Briefcase,
  Check,
} from "lucide-react-native";
import { theme } from "../theme";
import { authApi } from "../api/auth";
import { ApiError } from "../api/client";

const RegisterFormSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
    role: z.nativeEnum(Role),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof RegisterFormSchema>;

export default function RegisterScreen() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(RegisterFormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      role: Role.GUEST,
    },
  });

  const selectedRole = watch("role");

  // Real blocking validation: consent is required before the register request
  // can fire. Tapping without consent surfaces a message instead of submitting.
  const handlePressSubmit = () => {
    if (!agreed) {
      setConsentError(
        "Please agree to the Terms of Service and Privacy Policy to continue.",
      );
      return;
    }
    handleSubmit(onSubmit)();
  };

  const onSubmit = async (data: RegisterForm) => {
    if (!agreed) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      await authApi.register({
        email: data.email,
        password: data.password,
        roles: [data.role],
      });
      router.push({ pathname: "/verify-email", params: { email: data.email } });
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

  const roleOptions = [
    {
      value: Role.GUEST,
      label: "Rent & hire",
      description: "Browse and book listings",
      icon: Home,
    },
    {
      value: Role.HOST,
      label: "List & earn",
      description: "Host listings and services",
      icon: Briefcase,
    },
  ];

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
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>
              Join Zambia&apos;s trusted marketplace
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>I want to</Text>
              <View style={styles.roleGrid}>
                {roleOptions.map((option) => {
                  const Icon = option.icon;
                  const selected = selectedRole === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setValue("role", option.value)}
                      style={[
                        styles.roleCard,
                        selected && styles.roleCardSelected,
                      ]}
                    >
                      <Icon size={20} color={theme.colors.gold} />
                      <Text style={styles.roleLabel}>{option.label}</Text>
                      <Text style={styles.roleDescription}>
                        {option.description}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email address</Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="you@example.com"
                    placeholderTextColor={theme.colors.mutedForeground}
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    style={[styles.input, errors.email && styles.inputError]}
                  />
                )}
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email.message}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.passwordRow}>
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Min 8 chars, 1 uppercase, 1 number"
                      placeholderTextColor={theme.colors.mutedForeground}
                      secureTextEntry={!showPassword}
                      autoComplete="new-password"
                      style={[
                        styles.input,
                        styles.passwordInput,
                        errors.password && styles.inputError,
                      ]}
                    />
                    <Pressable
                      onPress={() => setShowPassword((v) => !v)}
                      style={styles.eyeButton}
                      hitSlop={8}
                    >
                      {showPassword ? (
                        <EyeOff
                          size={18}
                          color={theme.colors.mutedForeground}
                        />
                      ) : (
                        <Eye size={18} color={theme.colors.mutedForeground} />
                      )}
                    </Pressable>
                  </View>
                )}
              />
              {errors.password && (
                <Text style={styles.errorText}>{errors.password.message}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Confirm password</Text>
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.passwordRow}>
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="••••••••"
                      placeholderTextColor={theme.colors.mutedForeground}
                      secureTextEntry={!showConfirm}
                      autoComplete="new-password"
                      style={[
                        styles.input,
                        styles.passwordInput,
                        errors.confirmPassword && styles.inputError,
                      ]}
                    />
                    <Pressable
                      onPress={() => setShowConfirm((v) => !v)}
                      style={styles.eyeButton}
                      hitSlop={8}
                    >
                      {showConfirm ? (
                        <EyeOff
                          size={18}
                          color={theme.colors.mutedForeground}
                        />
                      ) : (
                        <Eye size={18} color={theme.colors.mutedForeground} />
                      )}
                    </Pressable>
                  </View>
                )}
              />
              {errors.confirmPassword && (
                <Text style={styles.errorText}>
                  {errors.confirmPassword.message}
                </Text>
              )}
            </View>

            {formError && (
              <View style={styles.formErrorBox}>
                <Text style={styles.formErrorText}>{formError}</Text>
              </View>
            )}

            <View style={styles.consentRow}>
              <Pressable
                onPress={() => {
                  setAgreed((v) => !v);
                  setConsentError(null);
                }}
                hitSlop={6}
                style={[styles.checkbox, agreed && styles.checkboxChecked]}
              >
                {agreed && (
                  <Check size={14} color={theme.colors.primaryForeground} />
                )}
              </Pressable>
              <Text style={styles.consentText}>
                I agree to the{" "}
                <Text
                  style={styles.consentLink}
                  onPress={() => router.push("/terms")}
                >
                  Terms of Service
                </Text>{" "}
                and{" "}
                <Text
                  style={styles.consentLink}
                  onPress={() => router.push("/privacy")}
                >
                  Privacy Policy
                </Text>
              </Text>
            </View>
            {consentError && (
              <Text style={styles.errorText}>{consentError}</Text>
            )}

            <Pressable
              style={[
                styles.submitButton,
                (isSubmitting || !agreed) && styles.submitButtonDisabled,
              ]}
              onPress={handlePressSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={theme.colors.primaryForeground} />
              ) : (
                <>
                  <Text style={styles.submitText}>Create account</Text>
                  <ArrowRight
                    size={16}
                    color={theme.colors.primaryForeground}
                  />
                </>
              )}
            </Pressable>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account? </Text>
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
  roleGrid: { flexDirection: "row", gap: theme.spacing.sm },
  roleCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  roleCardSelected: {
    borderColor: theme.colors.gold,
    backgroundColor: "hsl(42, 60%, 57%, 0.08)",
  },
  roleLabel: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.displayBold,
    textTransform: "uppercase",
    marginTop: theme.spacing.xs,
  },
  roleDescription: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
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
  inputError: { borderColor: theme.colors.error },
  passwordRow: { position: "relative", justifyContent: "center" },
  passwordInput: { paddingRight: 44 },
  eyeButton: { position: "absolute", right: theme.spacing.md },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.size.xs,
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
  consentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  checkbox: {
    width: theme.spacing.lg,
    height: theme.spacing.lg,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  consentText: {
    flex: 1,
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
    lineHeight: theme.typography.size.lg,
  },
  consentLink: {
    color: theme.colors.gold,
    fontFamily: theme.typography.font.bodySemibold,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    marginTop: theme.spacing.xs,
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
});
