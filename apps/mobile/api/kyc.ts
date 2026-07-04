import { api, ApiError, AUTH_URL } from "./client";
import { useAuthStore } from "../store/auth.store";

// KYC upload is a direct multipart POST to the auth service (verified against
// services/auth-service/src/routes/profile.routes.ts and the working web
// implementation in apps/web/src/components/KycUploadSection.tsx). There is no
// signed-URL step for KYC documents — that pattern exists only for profile
// photos. The server converts/normalises images and stores them on R2 itself.

export type KycDocType =
  | "NRC_FRONT"
  | "NRC_BACK"
  | "PROOF_OF_RESIDENCE"
  | "SELFIE";

export const KYC_DOC_TYPES: KycDocType[] = [
  "NRC_FRONT",
  "NRC_BACK",
  "PROOF_OF_RESIDENCE",
  "SELFIE",
];

export type KycDocument = {
  id: string;
  userId: string;
  type: KycDocType;
  // A freshly signed download URL, valid for a limited time after each fetch.
  url: string;
  uploadedAt: string;
};

export type KycDocumentsResponse = {
  documents: KycDocument[];
};

export type KycUploadResponse = {
  url: string;
  type: KycDocType;
};

export type KycResubmitResponse = {
  user: {
    id: string;
    email: string;
    kycStatus: string;
    roles: string[];
    fullName: string | null;
    photoUrl: string | null;
  };
};

export type KycUploadFile = {
  uri: string;
  name: string;
  mimeType: string;
};

export const kycApi = {
  getMine: () => {
    const token = useAuthStore.getState().tokens?.accessToken;
    return api.get<KycDocumentsResponse>("/profiles/me/kyc", token, AUTH_URL);
  },

  // Multipart upload; bypasses the JSON api client. Field names must stay
  // "document" (file) and "docType" (string) to match the multer route config.
  upload: async (
    docType: KycDocType,
    file: KycUploadFile,
  ): Promise<KycUploadResponse> => {
    const token = useAuthStore.getState().tokens?.accessToken;

    const formData = new FormData();
    formData.append("document", {
      uri: file.uri,
      name: file.name,
      type: file.mimeType,
    } as unknown as Blob);
    formData.append("docType", docType);

    const res = await fetch(`${AUTH_URL}/profiles/me/kyc`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    let data: unknown = null;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      const errBody = data as { message?: string } | null;
      throw new ApiError(
        errBody?.message ?? `Upload failed (${res.status})`,
        res.status,
      );
    }

    return data as KycUploadResponse;
  },

  resubmit: () => {
    const token = useAuthStore.getState().tokens?.accessToken;
    return api.patch<KycResubmitResponse>(
      "/profiles/me/kyc/resubmit",
      {},
      token,
      AUTH_URL,
    );
  },
};
