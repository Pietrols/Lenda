import { api, AUTH_URL } from "./client";
import { useAuthStore } from "../store/auth.store";

export type MobileMoneyProvider = "AIRTEL" | "MTN" | "ZAMTEL";

export type FloatTransaction = {
  id: string;
  floatAccountId: string;
  type: string;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  bookingId: string | null;
  reference: string | null;
  status: string;
  createdAt: string;
};

export type FloatWithdrawal = {
  id: string;
  floatAccountId: string;
  amount: string;
  fee: string;
  netAmount: string;
  provider: MobileMoneyProvider;
  mobileNumber: string;
  status: string;
  reference: string | null;
  note: string | null;
  createdAt: string;
};

// GET /float/me includes the latest 20 transactions and 10 withdrawals.
export type FloatAccount = {
  id: string;
  userId: string;
  balance: string;
  totalEarned: string;
  totalDeducted: string;
  totalWithdrawn: string;
  bookingCount: number;
  mobileMoneyProvider: MobileMoneyProvider;
  mobileMoneyNumber: string;
  isActive: boolean;
  transactions: FloatTransaction[];
  withdrawals: FloatWithdrawal[];
};

export const floatApi = {
  // Returns { float: null } (not an error) when no account has been set up.
  getMine: () => {
    const token = useAuthStore.getState().tokens?.accessToken;
    return api.get<{ float: FloatAccount | null }>(
      "/float/me",
      token,
      AUTH_URL,
    );
  },

  setup: (provider: MobileMoneyProvider, mobileMoneyNumber: string) => {
    const token = useAuthStore.getState().tokens?.accessToken;
    return api.post<{ float: FloatAccount }>(
      "/float/setup",
      { mobileMoneyProvider: provider, mobileMoneyNumber },
      token,
      AUTH_URL,
    );
  },

  // Minimum withdrawal is K100 (server-enforced with a clear message).
  withdraw: (amount: number) => {
    const token = useAuthStore.getState().tokens?.accessToken;
    return api.post<{ withdrawal: FloatWithdrawal }>(
      "/float/withdraw",
      { amount },
      token,
      AUTH_URL,
    );
  },
};
