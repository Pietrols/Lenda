import { useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import * as ImagePicker from "expo-image-picker";
import { UpdateProfileSchema } from "@lenda/schemas";
import { ArrowLeft, Camera } from "lucide-react-native";
import { theme } from "../theme";
import { authApi } from "../api/auth";
import { ApiError } from "../api/client";
import { useAuthStore } from "../store/auth.store";

export default function EditProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [location, setLocation] = useState(user?.location ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const initials = (user?.fullName ?? user?.email ?? "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const pickPhoto = async () => {
    setPhotoError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPhotoError(
        "Photo library access is needed to pick an image. You can enable it in your device settings.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];

    setIsUploadingPhoto(true);
    try {
      const res = await authApi.uploadProfilePhoto({
        uri: asset.uri,
        name: asset.fileName ?? "avatar.jpg",
        mimeType: asset.mimeType ?? "image/jpeg",
      });
      updateUser(res.user);
    } catch (err) {
      setPhotoError(
        err instanceof ApiError
          ? err.message
          : "Could not upload your photo. Please try again.",
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const save = async () => {
    setFormError(null);
    setSaved(false);

    // All fields are optional server-side; empty inputs are simply omitted so
    // the schema's minimum-length rules only apply to values actually set.
    const parsed = UpdateProfileSchema.safeParse({
      ...(fullName.trim() ? { fullName: fullName.trim() } : {}),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
      ...(location.trim() ? { location: location.trim() } : {}),
      ...(bio.trim() ? { bio: bio.trim() } : {}),
    });

    if (!parsed.success) {
      setFormError(
        parsed.error.issues[0]?.message ?? "Please check your details.",
      );
      return;
    }

    setIsSaving(true);
    try {
      const res = await authApi.updateProfile(parsed.data);
      updateUser(res.user);
      setSaved(true);
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : "Could not save your profile. Please try again.",
      );
    } finally {
      setIsSaving(false);
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
        <Text style={styles.headerTitle}>Edit Profile</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.avatarSection}>
            {user?.photoUrl ? (
              <Image source={{ uri: user.photoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <Pressable
              style={[
                styles.photoButton,
                isUploadingPhoto && styles.saveButtonDisabled,
              ]}
              onPress={pickPhoto}
              disabled={isUploadingPhoto}
            >
              {isUploadingPhoto ? (
                <ActivityIndicator color={theme.colors.gold} />
              ) : (
                <>
                  <Camera
                    size={theme.typography.size.sm}
                    color={theme.colors.gold}
                  />
                  <Text style={styles.photoButtonText}>
                    {user?.photoUrl ? "Change photo" : "Add photo"}
                  </Text>
                </>
              )}
            </Pressable>
            {photoError && <Text style={styles.photoErrorText}>{photoError}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your name"
              placeholderTextColor={theme.colors.mutedForeground}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g. +260971234567"
              placeholderTextColor={theme.colors.mutedForeground}
              keyboardType="phone-pad"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Location</Text>
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Lusaka"
              placeholderTextColor={theme.colors.mutedForeground}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Tell hosts and guests a little about yourself"
              placeholderTextColor={theme.colors.mutedForeground}
              multiline
              numberOfLines={4}
              style={[styles.input, styles.multiline]}
            />
          </View>

          {formError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          )}
          {saved && <Text style={styles.savedText}>Profile saved.</Text>}

          <Pressable
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={save}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={theme.colors.primaryForeground} />
            ) : (
              <Text style={styles.saveText}>Save changes</Text>
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
  avatarSection: {
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  avatar: {
    width: theme.spacing.xxl * 2,
    height: theme.spacing.xxl * 2,
    borderRadius: theme.radius.pill,
  },
  avatarFallback: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.gold,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.xxl,
    fontFamily: theme.typography.font.displayBold,
  },
  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    borderColor: theme.colors.gold,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  photoButtonText: {
    color: theme.colors.gold,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.font.bodySemibold,
  },
  photoErrorText: {
    color: theme.colors.error,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.font.bodyRegular,
    textAlign: "center",
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
  errorBox: {
    backgroundColor: theme.colors.errorTint,
    borderColor: theme.colors.error,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
  },
  errorText: {
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
    marginTop: theme.spacing.xs,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    color: theme.colors.primaryForeground,
    fontSize: theme.typography.size.base,
    fontFamily: theme.typography.font.bodySemibold,
  },
});
