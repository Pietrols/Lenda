import { useRef, useState, useEffect } from "react";
import { CheckCircle, Upload, RefreshCw } from "lucide-react";
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
        // ignore — show empty state
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

  const handleReplace = (docType: string) => {
    setUploadedTypes((prev) => {
      const next = new Set(prev);
      next.delete(docType);
      return next;
    });
  };

  const allUploaded = DOC_SLOTS.every((s) => uploadedTypes.has(s.docType));

  useEffect(() => {
    if (allUploaded && onAllUploaded) onAllUploaded();
  }, [allUploaded, onAllUploaded]);

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
          onReplace={handleReplace}
        />
      ))}
      {allUploaded && (
        <p className="text-xs text-green-400/80 text-center mt-1">
          All documents uploaded.
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
  onReplace: (docType: string) => void;
}

function KycUploadSlot({
  label,
  docType,
  accessToken,
  initialUploaded,
  onUploaded,
  onReplace,
}: KycUploadSlotProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploaded, setUploaded] = useState(initialUploaded);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input immediately so same file can be re-selected if needed
    if (fileRef.current) fileRef.current.value = "";

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
      toast.success(`${label} uploaded.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleReplace = () => {
    setUploaded(false);
    onReplace(docType);
    setTimeout(() => fileRef.current?.click(), 50);
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-background gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
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
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {label}
          </p>
          <p className="text-xs text-foreground/40">
            {isUploading
              ? "Uploading..."
              : uploaded
                ? "Uploaded"
                : "JPG, PNG, HEIC, or PDF"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {uploaded ? (
          <button
            onClick={handleReplace}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-foreground/20 text-foreground/50 hover:text-foreground hover:border-foreground/40 transition-colors"
          >
            <RefreshCw size={12} /> Replace
          </button>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={isUploading}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border text-gold border-gold/30 hover:bg-gold/5 disabled:opacity-50"
          >
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.heic,.heif,.pdf"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
