import { useCallback, useEffect, useState } from "react";
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
import { Image } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { UpdateListingSchema } from "@lenda/schemas";
import { ArrowLeft, Eye, ImagePlus, X } from "lucide-react-native";
import { theme } from "../../theme";
import { listingsApi, type ListingDetail } from "../../api/listings";
import { ApiError } from "../../api/client";
import { useAuthStore } from "../../store/auth.store";
import { ListingStatusBadge } from "../../components/ListingStatusBadge";
import { ErrorState } from "../../components/ErrorState";

type PricingMode = "FIXED" | "HOURLY" | "NEGOTIABLE";

const pricingModes: { value: PricingMode; label: string }[] = [
  { value: "FIXED", label: "Fixed" },
  { value: "HOURLY", label: "Hourly" },
  { value: "NEGOTIABLE", label: "Negotiable" },
];

export default function ManageListingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("");
  const [location, setLocation] = useState("");
  const [pricingMode, setPricingMode] = useState<PricingMode>("FIXED");

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const fetchListing = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await listingsApi.getById(id);
      setListing(res.listing);
      setTitle(res.listing.title);
      setDescription(res.listing.description);
      setCategory(res.listing.category);
      setPrice(String(Number(res.listing.pricePerDay)));
      setCurrency(res.listing.currency);
      setLocation(res.listing.location);
      setPricingMode(res.listing.pricingMode as PricingMode);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not load this listing. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

  const isOwner = !!listing && listing.hostId === currentUserId;

  const save = async () => {
    if (!id) return;
    setFormError(null);
    setSaved(false);

    const parsed = UpdateListingSchema.safeParse({
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      pricePerDay: Number(price),
      currency: currency.trim(),
      pricingMode,
      location: location.trim(),
    });

    if (!parsed.success) {
      setFormError(
        parsed.error.issues[0]?.message ?? "Please check the listing details.",
      );
      return;
    }

    setIsSaving(true);
    try {
      await listingsApi.update(id, parsed.data);
      setSaved(true);
      await fetchListing();
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : "Could not save the listing. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const addImage = async () => {
    if (!id || !listing) return;
    setImageError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setImageError(
        "Photo library access is needed to pick an image. You can enable it in your device settings.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];

    setImageBusy("ADD");
    try {
      // The first image becomes the primary so the listing shows up with a
      // photo in Browse immediately.
      await listingsApi.uploadImage(
        id,
        {
          uri: asset.uri,
          name: asset.fileName ?? "listing.jpg",
          mimeType: asset.mimeType ?? "image/jpeg",
        },
        listing.images.length === 0,
      );
      await fetchListing();
    } catch (err) {
      setImageError(
        err instanceof ApiError
          ? err.message
          : "Could not upload the image. Please try again.",
      );
    } finally {
      setImageBusy(null);
    }
  };

  const removeImage = async (imageId: string) => {
    if (!id) return;
    setImageError(null);
    setImageBusy(imageId);
    try {
      await listingsApi.deleteImage(id, imageId);
      await fetchListing();
    } catch (err) {
      setImageError(
        err instanceof ApiError
          ? err.message
          : "Could not delete the image. Please try again.",
      );
    } finally {
      setImageBusy(null);
    }
  };

  const remove = async () => {
    if (!id) return;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await listingsApi.remove(id);
      router.replace("/my-listings");
    } catch (err) {
      setDeleteError(
        err instanceof ApiError
          ? err.message
          : "Could not delete the listing. Please try again.",
      );
      setIsDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ArrowLeft
              size={theme.typography.size.xxl}
              color={theme.colors.foreground}
            />
          </Pressable>
          <Text style={styles.headerTitle}>Manage Listing</Text>
        </View>
        {listing && isOwner && (
          <Pressable
            style={styles.viewLink}
            onPress={() => router.push(`/listing/${listing.id}`)}
            hitSlop={6}
          >
            <Eye size={theme.typography.size.sm} color={theme.colors.gold} />
            <Text style={styles.viewLinkText}>View</Text>
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <Text style={styles.stateText}>Loading listing...</Text>
        </View>
      ) : error || !listing ? (
        <ErrorState
          message={error ?? "Listing not found."}
          onRetry={fetchListing}
        />
      ) : !isOwner ? (
        <View style={styles.center}>
          <Text style={styles.stateText}>
            Only the owner of this listing can manage it.
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.statusRow}>
              <Text style={styles.label}>Status</Text>
              <ListingStatusBadge status={listing.status} />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Photos</Text>
              <View style={styles.imageGrid}>
                {listing.images.map((image) => (
                  <View key={image.id} style={styles.imageCell}>
                    <Image
                      source={{ uri: image.url }}
                      style={styles.imageThumb}
                      resizeMode="cover"
                    />
                    {image.isPrimary && (
                      <View style={styles.primaryTag}>
                        <Text style={styles.primaryTagText}>PRIMARY</Text>
                      </View>
                    )}
                    <Pressable
                      style={styles.imageDelete}
                      onPress={() => removeImage(image.id)}
                      disabled={imageBusy !== null}
                      hitSlop={6}
                    >
                      {imageBusy === image.id ? (
                        <ActivityIndicator
                          size="small"
                          color={theme.colors.error}
                        />
                      ) : (
                        <X
                          size={theme.typography.size.sm}
                          color={theme.colors.error}
                        />
                      )}
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  style={[
                    styles.imageCell,
                    styles.addImageCell,
                    imageBusy !== null && styles.buttonDisabled,
                  ]}
                  onPress={addImage}
                  disabled={imageBusy !== null}
                >
                  {imageBusy === "ADD" ? (
                    <ActivityIndicator color={theme.colors.gold} />
                  ) : (
                    <ImagePlus
                      size={theme.typography.size.xl}
                      color={theme.colors.gold}
                    />
                  )}
                </Pressable>
              </View>
              {imageError && (
                <Text style={styles.deleteErrorText}>{imageError}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholderTextColor={theme.colors.mutedForeground}
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholderTextColor={theme.colors.mutedForeground}
                multiline
                numberOfLines={4}
                style={[styles.input, styles.multiline]}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Category</Text>
              <TextInput
                value={category}
                onChangeText={setCategory}
                autoCapitalize="none"
                placeholderTextColor={theme.colors.mutedForeground}
                style={styles.input}
              />
            </View>

            <View style={styles.rowFields}>
              <View style={[styles.field, styles.flex]}>
                <Text style={styles.label}>Price per day</Text>
                <TextInput
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  placeholderTextColor={theme.colors.mutedForeground}
                  style={styles.input}
                />
              </View>
              <View style={[styles.field, styles.currencyField]}>
                <Text style={styles.label}>Currency</Text>
                <TextInput
                  value={currency}
                  onChangeText={setCurrency}
                  autoCapitalize="characters"
                  placeholderTextColor={theme.colors.mutedForeground}
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Pricing</Text>
              <View style={styles.modeRow}>
                {pricingModes.map((mode) => (
                  <Pressable
                    key={mode.value}
                    onPress={() => setPricingMode(mode.value)}
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
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholderTextColor={theme.colors.mutedForeground}
                style={styles.input}
              />
            </View>

            {formError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{formError}</Text>
              </View>
            )}
            {saved && <Text style={styles.savedText}>Listing saved.</Text>}

            <Pressable
              style={[
                styles.saveButton,
                isSaving && styles.buttonDisabled,
              ]}
              onPress={save}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color={theme.colors.primaryForeground} />
              ) : (
                <Text style={styles.saveText}>Save changes</Text>
              )}
            </Pressable>

            <View style={styles.dangerZone}>
              {deleteMode ? (
                <>
                  <Text style={styles.dangerText}>
                    Deleting removes this listing from Lenda. This cannot be
                    undone.
                  </Text>
                  <View style={styles.dangerRow}>
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={() => {
                        setDeleteMode(false);
                        setDeleteError(null);
                      }}
                      disabled={isDeleting}
                    >
                      <Text style={styles.secondaryButtonText}>Back</Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.deleteButton,
                        isDeleting && styles.buttonDisabled,
                      ]}
                      onPress={remove}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <ActivityIndicator color={theme.colors.error} />
                      ) : (
                        <Text style={styles.deleteButtonText}>
                          Confirm delete
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </>
              ) : (
                <Pressable
                  style={styles.deleteButton}
                  onPress={() => setDeleteMode(true)}
                >
                  <Text style={styles.deleteButtonText}>Delete listing</Text>
                </Pressable>
              )}
              {deleteError && (
                <Text style={styles.deleteErrorText}>{deleteError}</Text>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
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
    justifyContent: "space-between",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    flexShrink: 1,
  },
  headerTitle: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.lg,
    fontFamily: theme.typography.font.displayBold,
    textTransform: "uppercase",
  },
  viewLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  viewLinkText: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
  center: {
    flex: 1,
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
  scrollContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  field: {
    gap: theme.spacing.xs,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  imageCell: {
    width: theme.spacing.xxl * 2,
    height: theme.spacing.xxl * 2,
    borderRadius: theme.radius.md,
    overflow: "hidden",
  },
  imageThumb: {
    width: "100%",
    height: "100%",
  },
  addImageCell: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.gold,
    backgroundColor: theme.colors.card,
  },
  primaryTag: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.imageScrim,
    paddingVertical: theme.spacing.xs / 2,
  },
  primaryTagText: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodySemibold,
    textAlign: "center",
  },
  imageDelete: {
    position: "absolute",
    top: theme.spacing.xs,
    right: theme.spacing.xs,
    width: theme.spacing.lg,
    height: theme.spacing.lg,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
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
  rowFields: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  currencyField: {
    width: theme.spacing.xxl * 2,
  },
  errorBox: {
    backgroundColor: theme.colors.errorTint,
    borderColor: theme.colors.error,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
  },
  errorBoxText: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
  savedText: {
    color: theme.colors.success,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
    textAlign: "center",
  },
  saveButton: {
    alignItems: "center",
    justifyContent: "center",
    height: theme.spacing.xxl,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    color: theme.colors.primaryForeground,
    fontSize: theme.typography.size.base,
    fontFamily: theme.typography.font.bodySemibold,
  },
  dangerZone: {
    gap: theme.spacing.sm,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    paddingTop: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  dangerText: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
  dangerRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: theme.spacing.xxl,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryButtonText: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
  deleteButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: theme.spacing.xxl,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  deleteButtonText: {
    color: theme.colors.error,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
  deleteErrorText: {
    color: theme.colors.error,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
});
