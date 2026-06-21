import { create } from "zustand";
import {
  persist,
  createJSONStorage,
  type StateStorage,
} from "zustand/middleware";
import * as SecureStore from "expo-secure-store";
import {
  configureApiAuth,
  type AuthTokens as ClientAuthTokens,
} from "../api/client";

export type AuthUser = {
  id: string;
  email: string;
  phone: string | null;
  roles: string[];
  emailVerified: boolean;
  phoneVerified: boolean;
  kycStatus: string;
  isActive: boolean;
  fullName: string | null;
  photoUrl: string | null;
  bio: string | null;
  location: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

// expo-secure-store is async and key-value only (no built-in JSON support),
// so we adapt it to zustand's StateStorage interface, which persist() expects.
const secureStorage: StateStorage = {
  getItem: async (name) => {
    return (await SecureStore.getItemAsync(name)) ?? null;
  },
  setItem: async (name, value) => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name) => {
    await SecureStore.deleteItemAsync(name);
  },
};

type AuthState = {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setAuth: (user: AuthUser, tokens: AuthTokens) => void;
  clearAuth: () => void;
  updateUser: (partial: Partial<AuthUser>) => void;
  setTokens: (tokens: AuthTokens) => void;
  setHasHydrated: (value: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setAuth: (user, tokens) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...user } : user,
          tokens,
          isAuthenticated: true,
        })),

      clearAuth: () =>
        set({ user: null, tokens: null, isAuthenticated: false }),

      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : state.user,
        })),

      setTokens: (tokens) => set({ tokens }),

      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: "lenda-auth",
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

// Wire the API client's refresh/session hooks to this store. This is what
// makes the single-flight 401 refresh in api/client.ts actually functional --
// without this, configureApiAuth() hooks default to no-ops.
configureApiAuth({
  getRefreshToken: () => useAuthStore.getState().tokens?.refreshToken ?? null,
  onRefreshSuccess: (tokens: ClientAuthTokens) => {
    const { user, setAuth } = useAuthStore.getState();
    if (user) {
      setAuth(user, tokens);
    }
  },
  onSessionExpired: () => {
    useAuthStore.getState().clearAuth();
  },
});
