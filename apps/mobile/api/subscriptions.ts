import { api, AUTH_URL } from "./client";
import { useAuthStore } from "../store/auth.store";

export type SubscriptionPlan = "FREE" | "PRO_MONTHLY" | "PRO_ANNUAL";

// All three endpoints return { subscription } with the user's subscription
// fields. Upgrading requires APPROVED KYC (403 otherwise) and flips the
// commission rate from 15% to 10% plus boosted listing visibility.
export type Subscription = {
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: string;
  subscriptionEndsAt: string | null;
  commissionRate: string | null;
  listingTier: number;
};

export const subscriptionsApi = {
  getStatus: () => {
    const token = useAuthStore.getState().tokens?.accessToken;
    return api.get<{ subscription: Subscription }>(
      "/subscriptions/status",
      token,
      AUTH_URL,
    );
  },

  upgrade: (plan: "PRO_MONTHLY" | "PRO_ANNUAL") => {
    const token = useAuthStore.getState().tokens?.accessToken;
    return api.post<{ subscription: Subscription }>(
      "/subscriptions/upgrade",
      { plan },
      token,
      AUTH_URL,
    );
  },

  cancel: () => {
    const token = useAuthStore.getState().tokens?.accessToken;
    return api.post<{ subscription: Subscription }>(
      "/subscriptions/cancel",
      {},
      token,
      AUTH_URL,
    );
  },
};
