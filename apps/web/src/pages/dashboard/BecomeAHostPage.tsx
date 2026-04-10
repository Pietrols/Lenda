import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  Car,
  Briefcase,
  CheckCircle,
  Clock,
  ChevronLeft,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { authApi } from "@/api/auth";
import { api, AUTH_URL } from "@/api/client";
import { GoldLine } from "@/components/ui/GoldLine";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/api/auth";

type Step = "confirm" | "host-type" | "profile" | "kyc" | "pending";

const STEPS: Step[] = ["confirm", "host-type", "profile", "kyc", "pending"];

const stepLabels: Record<Step, string> = {
  confirm: "Intent",
  "host-type": "Host Type",
  profile: "Your Profile",
  kyc: "Verification",
  pending: "Submitted",
};

export default function BecomeAHostPage() {
  const navigate = useNavigate();
  const { user, tokens, accessToken, updateUser, setTokens } = useAuth();
  const [step, setStep] = useState<Step>("confirm");
  const [hostType, setHostType] = useState<"RENTAL" | "SERVICE" | null>(null);
  const [description, setDescription] = useState("");
  const [extra, setExtra] = useState("");

  const hasHostRole = user?.roles?.includes("HOST") ?? false;
  const kycApproved = user?.kycStatus === "APPROVED";
  const kycPending = user?.kycStatus === "PENDING";

  const currentStepIndex = STEPS.indexOf(step);
  const isLastStep = step === "pending";

  // All hooks must be declared before any early returns
  const { mutate: saveHostProfile, isPending: isSaving } = useMutation({
    mutationFn: (data: { bio: string }) =>
      api.patch<{ user: AuthUser }>(
        "/profiles/me",
        data,
        accessToken,
        AUTH_URL,
      ),
    onSuccess: (response) => {
      updateUser({ bio: response.user.bio });
      setStep("kyc");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { mutate: upgradeToHost, isPending: isUpgrading } = useMutation({
    mutationFn: () => authApi.addRole("HOST", accessToken ?? ""),
    onSuccess: async (data: { user: AuthUser }) => {
      try {
        const refreshed = await authApi.refresh(tokens?.refreshToken ?? "");
        updateUser({ roles: data.user.roles });
        setTokens(refreshed.tokens);
      } catch {
        updateUser({ roles: data.user.roles });
      }
      setStep("pending");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Early returns after all hooks
  if (hasHostRole && kycApproved) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  if (hasHostRole && kycPending) {
    return <PendingScreen />;
  }

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      {/* Header */}
      <div>
        <p className="section-label">Host Application</p>
        <GoldLine className="w-10 mb-3" />
        <h2 className="font-display font-bold text-2xl text-foreground uppercase tracking-tight">
          Become a Host
        </h2>
      </div>

      {/* Step indicator */}
      {!isLastStep && (
        <div className="flex items-center gap-2">
          {STEPS.filter((s) => s !== "pending").map((s, i) => {
            const stepIndex = STEPS.indexOf(s);
            const isDone = currentStepIndex > stepIndex;
            const isCurrent = s === step;
            return (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors",
                    isDone
                      ? "bg-green-400/20 text-green-400"
                      : isCurrent
                        ? "bg-gold text-lenda-dark"
                        : "bg-foreground/5 text-foreground/30",
                  )}
                >
                  {isDone ? <CheckCircle size={14} /> : i + 1}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium hidden sm:inline",
                    isCurrent ? "text-foreground" : "text-foreground/40",
                  )}
                >
                  {stepLabels[s]}
                </span>
                {i < STEPS.filter((s) => s !== "pending").length - 1 && (
                  <div className="w-6 h-px bg-border mx-1" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Step content */}
      {step === "confirm" && (
        <div className="glass-card p-6 border border-border flex flex-col gap-5">
          <h3 className="font-display font-bold text-lg text-foreground uppercase tracking-tight">
            Ready to start earning?
          </h3>
          <p className="text-foreground/60 text-sm leading-relaxed">
            As a Lenda host, you can list your assets or services and receive
            booking requests from guests across Zambia. You keep your guest
            access - both roles work on the same account.
          </p>
          <div className="flex flex-col gap-3">
            {[
              "Free to list - only pay when you earn",
              "Price locked at booking - no payment disputes",
              "Dual-confirm handover protects both parties",
              "Build your reputation with reviews",
            ].map((point) => (
              <div key={point} className="flex items-start gap-3">
                <CheckCircle size={16} className="text-gold mt-0.5 shrink-0" />
                <span className="text-foreground/70 text-sm">{point}</span>
              </div>
            ))}
          </div>
          <Button
            variant="gold"
            size="md"
            className="gap-2 self-start"
            onClick={() => setStep("host-type")}
          >
            Get Started <ArrowRight size={16} />
          </Button>
        </div>
      )}

      {step === "host-type" && (
        <div className="flex flex-col gap-4">
          <p className="text-foreground/60 text-sm">
            Choose how you want to host on Lenda. You can always update this
            later.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                value: "RENTAL" as const,
                icon: <Car size={28} className="text-gold" />,
                title: "Rental Host",
                description:
                  "List vehicles, property, equipment, and other physical assets for guests to rent.",
              },
              {
                value: "SERVICE" as const,
                icon: <Briefcase size={28} className="text-gold" />,
                title: "Service Host",
                description:
                  "Offer your skills and professional services - cleaning, repairs, tutoring, and more.",
              },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setHostType(option.value)}
                className={cn(
                  "flex flex-col items-start gap-3 p-5 rounded-2xl border text-left transition-all duration-200",
                  hostType === option.value
                    ? "border-gold/60 bg-gold/10"
                    : "border-border hover:border-gold/30 glass-card",
                )}
              >
                <div className="card-icon-lg">{option.icon}</div>
                <div>
                  <p className="font-display font-bold text-base text-foreground uppercase tracking-tight">
                    {option.title}
                  </p>
                  <p className="text-foreground/50 text-xs mt-1 leading-relaxed">
                    {option.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <Button
              variant="ghost"
              size="md"
              className="gap-2"
              onClick={() => setStep("confirm")}
            >
              <ChevronLeft size={15} /> Back
            </Button>
            <Button
              variant="gold"
              size="md"
              className="gap-2"
              disabled={!hostType}
              onClick={() => setStep("profile")}
            >
              Continue <ArrowRight size={15} />
            </Button>
          </div>
        </div>
      )}

      {step === "profile" && (
        <div className="glass-card p-6 border border-border flex flex-col gap-5">
          <h3 className="font-display font-bold text-base text-foreground uppercase tracking-tight">
            Tell guests about yourself
          </h3>
          <div className="flex flex-col gap-1.5">
            <label className="text-micro text-foreground/60">
              {hostType === "SERVICE"
                ? "Skills & Services"
                : "What do you offer?"}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder={
                hostType === "SERVICE"
                  ? "e.g. Experienced electrician with 5 years in residential wiring..."
                  : "e.g. I own a Toyota Hilux available for daily hire in Lusaka..."
              }
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-foreground/30 text-sm outline-none transition-colors focus:border-gold/60 resize-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-micro text-foreground/60">
              Anything else you'd like to share? (optional)
            </label>
            <textarea
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              rows={3}
              placeholder="Add any extra details that would help guests choose you..."
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-foreground/30 text-sm outline-none transition-colors focus:border-gold/60 resize-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="md"
              className="gap-2"
              onClick={() => setStep("host-type")}
            >
              <ChevronLeft size={15} /> Back
            </Button>
            <Button
              variant="gold"
              size="md"
              className="gap-2"
              disabled={isSaving || !description.trim()}
              onClick={() =>
                saveHostProfile({
                  bio: [description, extra].filter(Boolean).join("\n\n"),
                })
              }
            >
              {isSaving ? "Saving..." : "Continue"}
              {!isSaving && <ArrowRight size={15} />}
            </Button>
          </div>
        </div>
      )}

      {step === "kyc" && (
        <div className="flex flex-col gap-5">
          <p className="text-foreground/60 text-sm leading-relaxed">
            To protect our community, all hosts must verify their identity
            before listing. Upload the documents below to submit your
            application.
          </p>
          <div className="glass-card border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-display font-bold text-sm uppercase tracking-tight text-foreground">
                Verification Documents
              </h3>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <KycUploadSlot
                label="NRC / National ID (Front)"
                docType="NRC_FRONT"
                accessToken={accessToken ?? ""}
              />
              <KycUploadSlot
                label="NRC / National ID (Back)"
                docType="NRC_BACK"
                accessToken={accessToken ?? ""}
              />
              <KycUploadSlot
                label="Proof of Residence"
                docType="PROOF_OF_RESIDENCE"
                accessToken={accessToken ?? ""}
              />
              <KycUploadSlot
                label="Recent Photo (Selfie)"
                docType="SELFIE"
                accessToken={accessToken ?? ""}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="md"
              className="gap-2"
              onClick={() => setStep("profile")}
            >
              <ChevronLeft size={15} /> Back
            </Button>
            <Button
              variant="gold"
              size="md"
              className="gap-2"
              disabled={isUpgrading}
              onClick={() => upgradeToHost()}
            >
              {isUpgrading ? "Submitting..." : "Submit Application"}
              {!isUpgrading && <ArrowRight size={15} />}
            </Button>
          </div>
        </div>
      )}

      {step === "pending" && <PendingScreen />}
    </div>
  );
}

function PendingScreen() {
  return (
    <div className="glass-card p-8 border border-border flex flex-col items-center text-center gap-4">
      <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
        <Clock size={28} className="text-yellow-500" />
      </div>
      <div>
        <h3 className="font-display font-bold text-xl text-foreground uppercase tracking-tight">
          Application Submitted
        </h3>
        <GoldLine className="w-10 mx-auto my-3" />
        <p className="text-foreground/60 text-sm leading-relaxed max-w-sm">
          We've received your documents and will review them shortly. You'll
          receive an email notification once your account is approved.
        </p>
      </div>
      <a href="/dashboard">
        <Button variant="outlineGold" size="md" className="gap-2 mt-2">
          Back to Dashboard
        </Button>
      </a>
    </div>
  );
}

function KycUploadSlot({
  label,
  docType,
  accessToken,
}: {
  label: string;
  docType: string;
  accessToken: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploaded, setUploaded] = useState(false);
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
      toast.success(`${label} uploaded.`);
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
          {uploaded ? (
            <CheckCircle size={16} />
          ) : (
            <span className="text-xs font-bold">?</span>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-foreground/40">
            {uploaded ? "Uploaded" : "Required"}
          </p>
        </div>
      </div>
      <button
        onClick={() => fileRef.current?.click()}
        disabled={isUploading || uploaded}
        className={cn(
          "text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border",
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
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
