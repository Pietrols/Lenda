import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AuthUser, AuthTokens } from "@/api/auth";

// Mirrors apps/web/src/store/auth.store.ts, with AsyncStorage as the
// persistence backend instead of localStorage.
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
      storage: createJSONStorage(() => AsyncStorage),
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
