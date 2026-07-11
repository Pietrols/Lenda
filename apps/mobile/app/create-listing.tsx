import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CreateListingSchema } from "@lenda/schemas";
import { ArrowLeft, CircleCheck, Package, Wrench } from "lucide-react-native";
import { theme } from "../theme";
import { listingsApi } from "../api/listings";
import { categoriesApi } from "../api/categories";
import { ApiError } from "../api/client";
import { useAuthStore } from "../store/auth.store";

type Pillar = "RENTAL" | "SERVICE";
type PricingMode = "FIXED" | "HOURLY" | "NEGOTIABLE";

const pricingModes: { value: PricingMode; label: string }[] = [
  { value: "FIXED", label: "Fixed" },
  { value: "HOURLY", label: "Hourly" },
  { value: "NEGOTIABLE", label: "Negotiable" },
];

const pillarOptions: {
  value: Pillar;
  label: string;
  description: string;
  icon: typeof Package;
}[] = [
  {
    value: "RENTAL",
    label: "Rental",
    description: "An item people rent",
    icon: Package,
  },
  {
    value: "SERVICE",
    label: "Service",
    description: "A service you provide",
    icon: Wrench,
  },
];

export default function CreateListingScreen() {
  const router = useRouter();
  const kycStatus = useAuthStore((s) => s.user?.kycStatus);
  const kycApproved = kycStatus === "APPROVED";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pillar, setPillar] = useState<Pillar>("RENTAL");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [currency, setCurrency] = useState("ZMW");
  const [location, setLocation] = useState("");
  const [pricingMode, setPricingMode] = useState<PricingMode>("FIXED");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [kycBlocked, setKycBlocked] = useState(false);
  const [createdStatus, setCreatedStatus] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestNote, setSuggestNote] = useState<string | null>(null);

  const suggestCategory = async () => {
    if (!category.trim()) return;
    setIsSuggesting(true);
    setSuggestNote(null);
    try {
      await categoriesApi.suggest(category.trim(), [pillar]);
      setSuggestNote(
        `"${category.trim()}" was suggested as a new category and will be reviewed.`,
      );
    } catch (err) {
      setSuggestNote(
        err instanceof ApiError
          ? err.message
          : "Could not send the suggestion. Please try again.",
      );
    } finally {
      setIsSuggesting(false);
    }
  };

  // Never let the user submit against an endpoint that will reject them until
  // KYC is approved: block up front on the known status and latch on a live
  // 403 so there is no retry loop.
  const blocked = !kycApproved || kycBlocked;

  const submit = async () => {
    if (blocked) return;
    setFormError(null);

    const parsed = CreateListingSchema.safeParse({
      title: title.trim(),
      description: description.trim(),
      pillar,
      category: category.trim(),
      pricePerDay: Number(price),
      deliveryFee: deliveryFee.trim() ? Number(deliveryFee) : undefined,
      currency: currency.trim(),
      pricingMode,
      location: location.trim(),
      metadata: {},
    });

    if (!parsed.success) {
      setFormError(
        parsed.error.issues[0]?.message ?? "Please check the listing details.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await listingsApi.create(parsed.data);
      setCreatedStatus(res.listing.status);
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === 403 &&
        /verified before listing/i.test(err.message)
      ) {
        setKycBlocked(true);
      } else if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createdStatus) {
    const isLive = createdStatus === "ACTIVE";
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.confirmation}>
          <CircleCheck
            size={theme.typography.size.display}
            color={theme.colors.success}
          />
          <Text style={styles.confirmTitle}>Listing created</Text>
          <Text style={styles.confirmText}>
            {isLive
              ? "Your listing is now live and visible to guests in Browse."
              : `Your listing was created with status ${createdStatus.replaceAll(
                  "_",
                  " ",
                )}.`}
          </Text>
          <Pressable
            style={styles.submitButton}
            onPress={() => router.replace("/my-listings")}
          >
            <Text style={styles.submitText}>View my listings</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft
            size={theme.typography.size.xxl}
            color={theme.colors.foreground}
          />
        </Pressable>
        <Text style={styles.headerTitle}>New Listing</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {blocked && (
            <View style={styles.kycBox}>
              <Text style={styles.kycText}>
                You need an approved host verification before you can create
                listings.
              </Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              editable={!blocked}
              placeholder="e.g. Toyota Hilux Double Cab"
              placeholderTextColor={theme.colors.mutedForeground}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              editable={!blocked}
              placeholder="Describe what you're listing"
              placeholderTextColor={theme.colors.mutedForeground}
              multiline
              numberOfLines={4}
              style={[styles.input, styles.multiline]}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Type</Text>
            <View style={styles.pillarGrid}>
              {pillarOptions.map((option) => {
                const Icon = option.icon;
                const selected = pillar === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setPillar(option.value)}
                    disabled={blocked}
                    style={[
                      styles.pillarCard,
                      selected && styles.pillarCardSelected,
                    ]}
                  >
                    <Icon
                      size={theme.typography.size.xl}
                      color={theme.colors.gold}
                    />
                    <Text style={styles.pillarLabel}>{option.label}</Text>
                    <Text style={styles.pillarDescription}>
                      {option.description}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <TextInput
              value={category}
              onChangeText={setCategory}
              editable={!blocked}
              placeholder="e.g. car, property, cleaning"
              placeholderTextColor={theme.colors.mutedForeground}
              autoCapitalize="none"
              style={styles.input}
            />
            {category.trim().length >= 2 && !blocked && (
              <Pressable
                onPress={suggestCategory}
                disabled={isSuggesting}
                hitSlop={6}
              >
                <Text style={styles.suggestLink}>
                  {isSuggesting
                    ? "Sending suggestion..."
                    : `Suggest "${category.trim()}" as a new category`}
                </Text>
              </Pressable>
            )}
            {suggestNote && (
              <Text style={styles.suggestNote}>{suggestNote}</Text>
            )}
          </View>

          <View style={styles.rowFields}>
            <View style={[styles.field, styles.flex]}>
              <Text style={styles.label}>Price per day</Text>
              <TextInput
                value={price}
                onChangeText={setPrice}
                editable={!blocked}
                placeholder="0"
                placeholderTextColor={theme.colors.mutedForeground}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
            <View style={[styles.field, styles.currencyField]}>
              <Text style={styles.label}>Currency</Text>
              <TextInput
                value={currency}
                onChangeText={setCurrency}
                editable={!blocked}
                placeholder="ZMW"
                placeholderTextColor={theme.colors.mutedForeground}
                autoCapitalize="characters"
                style={styles.input}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Delivery fee (optional)</Text>
            <TextInput
              value={deliveryFee}
              onChangeText={setDeliveryFee}
              editable={!blocked}
              placeholder="0"
              placeholderTextColor={theme.colors.mutedForeground}
              keyboardType="numeric"
              style={styles.input}
            />
            <Text style={styles.modeHint}>
              Charged on top of the booking total when you deliver the item to
              the guest. Leave empty if you do not offer delivery pricing.
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Pricing</Text>
            <View style={styles.modeRow}>
              {pricingModes.map((mode) => (
                <Pressable
                  key={mode.value}
                  onPress={() => setPricingMode(mode.value)}
                  disabled={blocked}
                  style={[
                    styles.modePill,
                    pricingMode === mode.value && styles.modePillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.modeText,
                      pricingMode === mode.value && styles.modeTextActive,
                    ]}
                  >
                    {mode.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {pricingMode === "NEGOTIABLE" && (
              <Text style={styles.modeHint}>
                Guests will be able to make offers and negotiate the price
                with you.
              </Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Location</Text>
            <TextInput
              value={location}
              onChangeText={setLocation}
              editable={!blocked}
              placeholder="e.g. Lusaka, Kabulonga"
              placeholderTextColor={theme.colors.mutedForeground}
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
              (blocked || isSubmitting) && styles.submitButtonDisabled,
            ]}
            onPress={submit}
            disabled={blocked || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.colors.primaryForeground} />
            ) : (
              <Text style={styles.submitText}>Create listing</Text>
            )}
          </Pressable>
        </ScrollView>
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
    color: theme.colors.foreground,
    fontSize: theme.typography.size.lg,
    fontFamily: theme.typography.font.displayBold,
    textTransform: "uppercase",
  },
  scrollContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  kycBox: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.warning,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  kycText: {
    color: theme.colors.warning,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyMedium,
  },
  field: {
    gap: theme.spacing.xs,
  },
  label: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyMedium,
  },
  input: {
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
  multiline: {
    minHeight: theme.spacing.xxl * 2,
    textAlignVertical: "top",
  },
  pillarGrid: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  pillarCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  pillarCardSelected: {
    borderColor: theme.colors.gold,
    backgroundColor: theme.colors.goldTint,
  },
  pillarLabel: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.displayBold,
    textTransform: "uppercase",
    marginTop: theme.spacing.xs,
  },
  pillarDescription: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
  suggestLink: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodySemibold,
  },
  suggestNote: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
  modeRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  modePill: {
    flex: 1,
    alignItems: "center",
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
  },
  modePillActive: {
    borderColor: theme.colors.gold,
    backgroundColor: theme.colors.goldTint,
  },
  modeText: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
  modeTextActive: {
    color: theme.colors.gold,
  },
  modeHint: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
  rowFields: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  currencyField: {
    width: theme.spacing.xxl * 2,
  },
  formErrorBox: {
    backgroundColor: theme.colors.errorTint,
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
    height: theme.spacing.xxl,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    marginTop: theme.spacing.xs,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: theme.colors.primaryForeground,
    fontSize: theme.typography.size.base,
    fontFamily: theme.typography.font.bodySemibold,
  },
  confirmation: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  confirmTitle: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.xl,
    fontFamily: theme.typography.font.displayBold,
    textTransform: "uppercase",
  },
  confirmText: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
    textAlign: "center",
  },
});
