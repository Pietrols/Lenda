import { api, BOOKING_URL } from "./client";
import { useAuthStore } from "../store/auth.store";

export type Category = {
  id: string;
  name: string;
  slug: string;
};

export const categoriesApi = {
  // Public; approved categories only, optionally scoped to a pillar.
  getAll: (pillar?: "RENTAL" | "SERVICE") =>
    api.get<{ categories: Category[] }>(
      `/categories${pillar ? `?pillar=${pillar}` : ""}`,
      undefined,
      BOOKING_URL,
    ),

  suggest: (name: string, suggestedPillars: string[]) => {
    const token = useAuthStore.getState().tokens?.accessToken;
    return api.post<{ category: Category }>(
      "/categories/suggest",
      { name, suggestedPillars },
      token,
      BOOKING_URL,
    );
  },
};
