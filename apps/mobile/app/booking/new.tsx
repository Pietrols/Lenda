import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  ErrorText,
  Field,
  Heading,
  Label,
  Screen,
} from "@/components/ui";
import { CreateBookingSchema, type CreateBookingInput } from "@/schemas/booking";
import { api, ApiError, BOOKING_URL } from "@/api/client";
import { useAuthStore } from "@/store/auth.store";
import { colors, radius, spacing } from "@/theme";

const PICKUP_OPTIONS = [
  { value: "CLIENT_TO_HOST", label: "I collect" },
  { value: "HOST_TO_CLIENT", label: "Host delivers" },
] as const;

export default function NewBookingScreen() {
  const token = useAuthStore((s) => s.tokens?.accessToken);
  const params = useLocalSearchParams<{ listingId?: string }>();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateBookingInput>({
    resolver: zodResolver(CreateBookingSchema),
    defaultValues: {
      listingId: params.listingId ?? "",
      startDate: now.toISOString(),
      endDate: tomorrow.toISOString(),
      pickupType: "CLIENT_TO_HOST",
      pickupLocation: "",
      notes: "",
      isNegotiable: false,
    },
  });

  const isNegotiable = watch("isNegotiable");

  async function onValid(values: CreateBookingInput) {
    setSubmitError(null);
    try {
      await api.post("/bookings", values, token, BOOKING_URL);
      router.replace("/");
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Could not create booking.",
      );
    }
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Heading>New booking</Heading>

        <Controller
          control={control}
          name="listingId"
          render={({ field }) => (
            <Field
              label="Listing ID"
              value={field.value}
              onChangeText={field.onChange}
              autoCapitalize="none"
              placeholder="listing uuid"
              error={errors.listingId?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="startDate"
          render={({ field }) => (
            <Field
              label="Start date (ISO 8601)"
              value={field.value}
              onChangeText={field.onChange}
              autoCapitalize="none"
              error={errors.startDate?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="endDate"
          render={({ field }) => (
            <Field
              label="End date (ISO 8601)"
              value={field.value}
              onChangeText={field.onChange}
              autoCapitalize="none"
              error={errors.endDate?.message}
            />
          )}
        />

        <Label>Pickup</Label>
        <Controller
          control={control}
          name="pickupType"
          render={({ field }) => (
            <View style={styles.segment}>
              {PICKUP_OPTIONS.map((opt) => {
                const active = field.value === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => field.onChange(opt.value)}
                    style={[
                      styles.segmentItem,
                      active ? styles.segmentItemActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        active ? styles.segmentTextActive : null,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        />
        {errors.pickupType ? (
          <ErrorText>{errors.pickupType.message}</ErrorText>
        ) : null}

        <Controller
          control={control}
          name="pickupLocation"
          render={({ field }) => (
            <Field
              label="Pickup location (optional)"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              error={errors.pickupLocation?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="notes"
          render={({ field }) => (
            <Field
              label="Notes (optional)"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              multiline
              error={errors.notes?.message}
            />
          )}
        />

        <View style={styles.switchRow}>
          <Label>Open to negotiation</Label>
          <Controller
            control={control}
            name="isNegotiable"
            render={({ field }) => (
              <Switch
                value={field.value ?? false}
                onValueChange={field.onChange}
                trackColor={{ true: colors.gold, false: colors.border }}
              />
            )}
          />
        </View>

        {isNegotiable ? (
          <>
            <Controller
              control={control}
              name="budgetMin"
              render={({ field }) => (
                <Field
                  label="Budget min"
                  keyboardType="numeric"
                  value={field.value != null ? String(field.value) : ""}
                  onChangeText={(t) =>
                    field.onChange(t === "" ? undefined : Number(t))
                  }
                  error={errors.budgetMin?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="budgetMax"
              render={({ field }) => (
                <Field
                  label="Budget max"
                  keyboardType="numeric"
                  value={field.value != null ? String(field.value) : ""}
                  onChangeText={(t) =>
                    field.onChange(t === "" ? undefined : Number(t))
                  }
                  error={errors.budgetMax?.message}
                />
              )}
            />
          </>
        ) : null}

        {submitError ? <ErrorText>{submitError}</ErrorText> : null}

        <Button
          title="Request booking"
          loading={isSubmitting}
          onPress={() => {
            void handleSubmit(onValid)();
          }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  segment: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  segmentItem: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: "center",
    backgroundColor: colors.card,
  },
  segmentItemActive: {
    borderColor: colors.gold,
    backgroundColor: colors.muted,
  },
  segmentText: {
    color: colors.mutedForeground,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: colors.gold,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: spacing.sm,
  },
});
