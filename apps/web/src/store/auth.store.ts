import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser, AuthTokens } from "@/api/auth";

type AuthState = {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, tokens: AuthTokens) => void;
  clearAuth: () => void;
  updateUser: (user: AuthUser) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,

      setAuth: (user, tokens) => set({ user, tokens, isAuthenticated: true }),

      clearAuth: () =>
        set({ user: null, tokens: null, isAuthenticated: false }),

      updateUser: (user) => set((state) => ({ ...state, user })),
    }),
    {
      name: "lenda-auth",
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
