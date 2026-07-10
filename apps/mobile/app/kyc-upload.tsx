import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  ArrowLeft,
  Camera,
  CircleCheck,
  ImagePlus,
  RefreshCw,
} from "lucide-react-native";
import { theme } from "../theme";
import {
  kycApi,
  KYC_DOC_TYPES,
  type KycDocType,
  type KycDocument,
} from "../api/kyc";
import { ApiError } from "../api/client";
import { useAuthStore } from "../store/auth.store";

const docLabels: Record<KycDocType, string> = {
  NRC_FRONT: "NRC / National ID (Front)",
  NRC_BACK: "NRC / National ID (Back)",
  PROOF_OF_RESIDENCE: "Proof of Residence",
  SELFIE: "Recent Photo (Selfie)",
};

// Display status derived from kycStatus plus upload progress: the server
// defaults kycStatus to PENDING before anything is uploaded, so "under review"
// is only accurate once all four documents are present.
type KycDisplayStatus =
  | "NOT_SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED";

const statusMeta: Record<KycDisplayStatus, { label: string; color: string }> = {
  NOT_SUBMITTED: {
    label: "NOT SUBMITTED",
    color: theme.colors.mutedForeground,
  },
  UNDER_REVIEW: { label: "UNDER REVIEW", color: theme.colors.warning },
  APPROVED: { label: "APPROVED", color: theme.colors.success },
  REJECTED: { label: "REJECTED", color: theme.colors.error },
};

function KycStatusBadge({ status }: { status: KycDisplayStatus }) {
  const meta = statusMeta[status];
  return (
    <View style={[styles.badge, { borderColor: meta.color }]}>
      <Text style={[styles.badgeText, { color: meta.color }]}>
        {meta.label}
      </Text>
    </View>
  );
}

export default function KycUploadScreen() {
  const router = useRouter();
  const kycStatus = useAuthStore((s) => s.user?.kycStatus ?? "PENDING");
  const updateUser = useAuthStore((s) => s.updateUser);

  const [documents, setDocuments] = useState<KycDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingType, setUploadingType] = useState<KycDocType | null>(null);
  const [rowErrors, setRowErrors] = useState<
    Partial<Record<KycDocType, string>>
  >({});
  const [isResubmitting, setIsResubmitting] = useState(false);

  const fetchDocuments = useCallback(async (showSpinner = true) => {
    if (showSpinner) setIsLoading(true);
    setError(null);
    try {
      const res = await kycApi.getMine();
      setDocuments(res.documents);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not load your verification status. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const docsByType = new Map(documents.map((doc) => [doc.type, doc]));
  const allUploaded = KYC_DOC_TYPES.every((type) => docsByType.has(type));

  const displayStatus: KycDisplayStatus =
    kycStatus === "APPROVED"
      ? "APPROVED"
      : kycStatus === "REJECTED"
        ? "REJECTED"
        : allUploaded
          ? "UNDER_REVIEW"
          : "NOT_SUBMITTED";

  const pickAndUpload = async (
    docType: KycDocType,
    source: "camera" | "library",
  ) => {
    setRowErrors((prev) => ({ ...prev, [docType]: undefined }));

    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setRowErrors((prev) => ({
        ...prev,
        [docType]:
          source === "camera"
            ? "Camera access is needed to take this photo. You can enable it in your device settings."
            : "Photo library access is needed to pick an image. You can enable it in your device settings.",
      }));
      return;
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.8,
          });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];

    setUploadingType(docType);
    try {
      await kycApi.upload(docType, {
        uri: asset.uri,
        name: asset.fileName ?? `${docType.toLowerCase()}.jpg`,
        mimeType: asset.mimeType ?? "image/jpeg",
      });
      await fetchDocuments(false);
    } catch (err) {
      setRowErrors((prev) => ({
        ...prev,
        [docType]:
          err instanceof ApiError
            ? err.message
            : "Upload failed. Please try again.",
      }));
    } finally {
      setUploadingType(null);
    }
  };

  const handleResubmit = async () => {
    setIsResubmitting(true);
    setError(null);
    try {
      const res = await kycApi.resubmit();
      updateUser({ kycStatus: res.user.kycStatus });
      await fetchDocuments(false);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not restart verification. Please try again.",
      );
    } finally {
      setIsResubmitting(false);
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
        <Text style={styles.headerTitle}>Verification</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <Text style={styles.stateText}>Loading verification status...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>KYC status</Text>
            <KycStatusBadge status={displayStatus} />
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{error}</Text>
            </View>
          )}

          {displayStatus === "APPROVED" && (
            <View style={styles.noticeBox}>
              <CircleCheck
                size={theme.typography.size.base}
                color={theme.colors.success}
              />
              <Text style={styles.noticeText}>
                Your identity is verified. You can create listings and host on
                Lenda.
              </Text>
            </View>
          )}

          {displayStatus === "UNDER_REVIEW" && (
            <View style={styles.noticeBox}>
              <CircleCheck
                size={theme.typography.size.base}
                color={theme.colors.warning}
              />
              <Text style={styles.noticeText}>
                All documents uploaded. Your verification is under review — we
                will notify you once it is complete.
              </Text>
            </View>
          )}

          {displayStatus === "REJECTED" && (
            <View style={styles.rejectedBox}>
              <Text style={styles.rejectedText}>
                Your verification was not approved. You will need to restart
                and upload all four documents again. Check your notifications
                for details.
              </Text>
              <Pressable
                style={[
                  styles.resubmitButton,
                  isResubmitting && styles.buttonDisabled,
                ]}
                onPress={handleResubmit}
                disabled={isResubmitting}
              >
                {isResubmitting ? (
                  <ActivityIndicator color={theme.colors.primaryForeground} />
                ) : (
                  <Text style={styles.resubmitButtonText}>Resubmit</Text>
                )}
              </Pressable>
            </View>
          )}

          {displayStatus !== "APPROVED" && (
            <Text style={styles.intro}>
              Upload clear photos of all four documents below. Review starts
              automatically once everything is uploaded.
            </Text>
          )}

          {KYC_DOC_TYPES.map((docType) => {
            const doc = docsByType.get(docType);
            const isSelfie = docType === "SELFIE";
            const isRowUploading = uploadingType === docType;
            const rowError = rowErrors[docType];

            return (
              <View key={docType} style={styles.docRow}>
                {doc ? (
                  <Image
                    source={{ uri: doc.url }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.thumbnail, styles.thumbnailEmpty]}>
                    <ImagePlus
                      size={theme.typography.size.xl}
                      color={theme.colors.mutedForeground}
                    />
                  </View>
                )}

                <View style={styles.docInfo}>
                  <Text style={styles.docLabel} numberOfLines={2}>
                    {docLabels[docType]}
                  </Text>
                  <Text
                    style={[
                      styles.docStatus,
                      doc ? styles.docStatusDone : null,
                    ]}
                  >
                    {isRowUploading
                      ? "Uploading..."
                      : doc
                        ? "Uploaded"
                        : "Not uploaded"}
                  </Text>
                  {rowError && (
                    <Text style={styles.rowErrorText}>{rowError}</Text>
                  )}

                  <View style={styles.docButtons}>
                    {isRowUploading ? (
                      <ActivityIndicator color={theme.colors.gold} />
                    ) : (
                      <>
                        <Pressable
                          style={styles.docButtonPrimary}
                          onPress={() =>
                            pickAndUpload(
                              docType,
                              isSelfie ? "camera" : "library",
                            )
                          }
                          disabled={uploadingType !== null}
                        >
                          {isSelfie ? (
                            <Camera
                              size={theme.typography.size.sm}
                              color={theme.colors.primaryForeground}
                            />
                          ) : doc ? (
                            <RefreshCw
                              size={theme.typography.size.sm}
                              color={theme.colors.primaryForeground}
                            />
                          ) : (
                            <ImagePlus
                              size={theme.typography.size.sm}
                              color={theme.colors.primaryForeground}
                            />
                          )}
                          <Text style={styles.docButtonPrimaryText}>
                            {isSelfie
                              ? "Take Photo"
                              : doc
                                ? "Replace"
                                : "Upload"}
                          </Text>
                        </Pressable>
                        <Pressable
                          style={styles.docButtonSecondary}
                          onPress={() =>
                            pickAndUpload(
                              docType,
                              isSelfie ? "library" : "camera",
                            )
                          }
                          disabled={uploadingType !== null}
                        >
                          <Text style={styles.docButtonSecondaryText}>
                            {isSelfie ? "Gallery" : "Camera"}
                          </Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
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
  statusLabel: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyMedium,
    textTransform: "uppercase",
  },
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 2,
  },
  badgeText: {
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodySemibold,
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
  noticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  noticeText: {
    flex: 1,
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
  },
  rejectedBox: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.error,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  rejectedText: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
  },
  resubmitButton: {
    alignItems: "center",
    justifyContent: "center",
    height: theme.spacing.xxl,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
  },
  resubmitButtonText: {
    color: theme.colors.primaryForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  intro: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodyRegular,
  },
  docRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
  },
  thumbnail: {
    width: theme.spacing.xxl + theme.spacing.lg,
    height: theme.spacing.xxl + theme.spacing.lg,
    borderRadius: theme.radius.md,
  },
  thumbnailEmpty: {
    backgroundColor: theme.colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  docInfo: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  docLabel: {
    color: theme.colors.foreground,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
  docStatus: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
  docStatusDone: {
    color: theme.colors.success,
  },
  rowErrorText: {
    color: theme.colors.error,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
  },
  docButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  docButtonPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  docButtonPrimaryText: {
    color: theme.colors.primaryForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodySemibold,
  },
  docButtonSecondary: {
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  docButtonSecondaryText: {
    color: theme.colors.mutedForeground,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodySemibold,
  },
});
