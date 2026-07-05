import { api, AUTH_URL } from "./client";
import { useAuthStore } from "../store/auth.store";

// The device-tokens endpoint lives on the auth service (AUTH_URL), not the
// booking service. It stores the token only — no push is sent yet server-side.
export type DeviceToken = {
  id: string;
  userId: string;
  token: string;
  platform: string;
  createdAt: string;
};

export type RegisterDeviceTokenResponse = {
  deviceToken: DeviceToken;
};

export const deviceTokensApi = {
  register: (token: string, platform: string) => {
    const accessToken = useAuthStore.getState().tokens?.accessToken;
    return api.post<RegisterDeviceTokenResponse>(
      "/auth/device-tokens",
      { token, platform },
      accessToken,
      AUTH_URL,
    );
  },

  // Idempotent server-side: deleting an unknown token is a no-op.
  remove: (token: string) => {
    const accessToken = useAuthStore.getState().tokens?.accessToken;
    return api.delete<{ message: string }>(
      `/auth/device-tokens/${encodeURIComponent(token)}`,
      accessToken,
      AUTH_URL,
    );
  },
};
