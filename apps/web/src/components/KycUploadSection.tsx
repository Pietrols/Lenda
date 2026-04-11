import { useRef, useState, useEffect } from "react";
import { CheckCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import { AUTH_URL } from "@/api/client";
import { cn } from "@/lib/utils";

type KycDoc = {
  type: string;
  url: string;
  uploadedAt: string;
};

interface KycUploadSectionProps {
  accessToken: string;
  onAllUploaded?: () => void;
}

const DOC_SLOTS = [
  { label: "NRC / National ID (Front)", docType: "NRC_FRONT" },
  { label: "NRC / National ID (Back)", docType: "NRC_BACK" },
  { label: "Proof of Residence", docType: "PROOF_OF_RESIDENCE" },
  { label: "Recent Photo (Selfie)", docType: "SELFIE" },
];

export function KycUploadSection({
  accessToken,
  onAllUploaded,
}: KycUploadSectionProps) {
  const [uploadedTypes, setUploadedTypes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Fetch existing documents on mount
  useEffect(() => {
    async function fetchDocs() {
      try {
        const res = await fetch(`${AUTH_URL}/profiles/me/kyc`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          const data = (await res.json()) as { documents: KycDoc[] };
          const types = new Set(data.documents.map((d) => d.type));
          setUploadedTypes(types);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    if (accessToken) fetchDocs();
  }, [accessToken]);

  const handleUploaded = (docType: string) => {
    setUploadedTypes((prev) => {
      const next = new Set(prev);
      next.add(docType);
      return next;
    });
  };

  const allUploaded = DOC_SLOTS.every((s) => uploadedTypes.has(s.docType));

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {DOC_SLOTS.map((s) => (
          <div
            key={s.docType}
            className="h-16 rounded-xl border border-border bg-foreground/5 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {DOC_SLOTS.map((slot) => (
        <KycUploadSlot
          key={slot.docType}
          label={slot.label}
          docType={slot.docType}
          accessToken={accessToken}
          initialUploaded={uploadedTypes.has(slot.docType)}
          onUploaded={handleUploaded}
        />
      ))}
      {allUploaded && onAllUploaded && (
        <p className="text-xs text-green-400/80 text-center mt-1">
          All documents uploaded. Click Submit Application to proceed.
        </p>
      )}
    </div>
  );
}

interface KycUploadSlotProps {
  label: string;
  docType: string;
  accessToken: string;
  initialUploaded: boolean;
  onUploaded: (docType: string) => void;
}

function KycUploadSlot({
  label,
  docType,
  accessToken,
  initialUploaded,
  onUploaded,
}: KycUploadSlotProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploaded, setUploaded] = useState(initialUploaded);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("docType", docType);
      const res = await fetch(`${AUTH_URL}/profiles/me/kyc`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Upload failed");
      }
      setUploaded(true);
      onUploaded(docType);
      toast.success(`${label} uploaded successfully.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-background gap-4">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
            uploaded
              ? "bg-green-400/20 text-green-400"
              : "bg-foreground/5 text-foreground/30",
          )}
        >
          {uploaded ? <CheckCircle size={16} /> : <Upload size={14} />}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-foreground/40">
            {uploaded ? "Uploaded" : "JPG, PNG, HEIC, or PDF"}
          </p>
        </div>
      </div>
      <button
        onClick={() => fileRef.current?.click()}
        disabled={isUploading || uploaded}
        className={cn(
          "text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border shrink-0",
          uploaded
            ? "text-green-400/50 border-green-400/20 cursor-default"
            : "text-gold border-gold/30 hover:bg-gold/5",
        )}
      >
        {isUploading ? "Uploading..." : uploaded ? "Done" : "Upload"}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,.pdf,.heic,.heif"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
