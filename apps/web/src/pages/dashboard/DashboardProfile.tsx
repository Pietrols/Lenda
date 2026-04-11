import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Camera,
  Save,
  Pencil,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { api, AUTH_URL } from "@/api/client";
import { GoldLine } from "@/components/ui/GoldLine";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/api/auth";
import { KycUploadSection } from "@/components/KycUploadSection";

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  bio: z.string().max(300, "Bio must be under 300 characters").optional(),
  location: z.string().optional(),
  phone: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

const kycColors: Record<string, string> = {
  PENDING: "text-yellow-500 bg-yellow-500/10 border-yellow-500/30",
  APPROVED: "text-green-400 bg-green-400/10 border-green-400/30",
  REJECTED: "text-red-400 bg-red-400/10 border-red-400/30",
};

const kycIcons: Record<string, React.ReactNode> = {
  PENDING: <Clock size={12} />,
  APPROVED: <CheckCircle size={12} />,
  REJECTED: <AlertCircle size={12} />,
};

export default function DashboardProfile() {
  const navigate = useNavigate();
  const { user, accessToken, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoTimestamp, setPhotoTimestamp] = useState(() => Date.now());
  const [isEditing, setIsEditing] = useState(false);

  const hasHostRole = user?.roles?.includes("HOST") ?? false;
  const kycApproved = user?.kycStatus === "APPROVED";
  const kycPending = user?.kycStatus === "PENDING";
  const kycRejected = user?.kycStatus === "REJECTED";

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => api.get<AuthUser>("/profiles/me", accessToken, AUTH_URL),
    enabled: !!accessToken,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: {
      fullName: profile?.fullName ?? "",
      bio: profile?.bio ?? "",
      location: profile?.location ?? "",
      phone: profile?.phone ?? "",
    },
  });

  const { mutate: updateProfile, isPending: isSaving } = useMutation({
    mutationFn: (data: ProfileForm) =>
      api.patch<{ user: AuthUser }>(
        "/profiles/me",
        data,
        accessToken,
        AUTH_URL,
      ),
    onSuccess: (response) => {
      updateUser({
        fullName: response.user.fullName,
        bio: response.user.bio,
        location: response.user.location,
        phone: response.user.phone,
      });
      queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
      toast.success("Profile updated.");
      setIsEditing(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { mutate: uploadPhoto, isPending: isUploading } = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch(`${AUTH_URL}/profiles/me/photo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Upload failed");
      return data as { user: AuthUser };
    },
    onSuccess: (data) => {
      updateUser({ photoUrl: data.user.photoUrl });
      queryClient.setQueryData(
        ["profile", "me"],
        (old: AuthUser | undefined) =>
          old ? { ...old, photoUrl: data.user.photoUrl } : old,
      );
      setPhotoTimestamp(Date.now());
      toast.success("Profile photo updated.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadPhoto(file);
  };

  const onSubmit = (data: ProfileForm) => updateProfile(data);

  const photoUrl = profile?.photoUrl ?? user?.photoUrl ?? null;
  const initials = (profile?.fullName ?? profile?.email ?? "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 max-w-2xl">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="glass-card p-6 border border-border h-24 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <p className="section-label">Account</p>
        <GoldLine className="w-10 mb-3" />
        <h2 className="font-display font-bold text-2xl text-foreground uppercase tracking-tight">
          Your Profile
        </h2>
        <p className="text-foreground/50 text-sm mt-1">
          Manage your personal information and account settings.
        </p>
      </div>

      {/* Section 1 - Identity */}
      <div className="glass-card p-6 border border-border flex items-center gap-4 md:gap-6">
        <div className="relative shrink-0">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-gold/20 flex items-center justify-center">
            {photoUrl ? (
              <img
                src={`${photoUrl}?t=${photoTimestamp}`}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-display font-bold text-2xl text-gold">
                {initials}
              </span>
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={isUploading}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gold flex items-center justify-center hover:bg-gold/80 transition-colors disabled:opacity-50"
          >
            <Camera size={13} className="text-lenda-dark" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">
            {profile?.fullName ?? "No name set"}
          </p>
          <p className="text-foreground/50 text-sm truncate">
            {profile?.email}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full border flex items-center gap-1",
                kycColors[profile?.kycStatus ?? "PENDING"],
              )}
            >
              {kycIcons[profile?.kycStatus ?? "PENDING"]}
              KYC {profile?.kycStatus}
            </span>
            {(user?.roles ?? []).map((role) => (
              <span
                key={role}
                className="text-xs font-medium px-2 py-0.5 rounded-full border border-gold/30 text-gold bg-gold/10"
              >
                {role}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Section 2 - Personal details */}
      <div className="glass-card border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-display font-bold text-sm uppercase tracking-tight text-foreground">
            Personal Details
          </h3>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 text-xs text-gold hover:text-gold/80 transition-colors font-medium"
            >
              <Pencil size={13} /> Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="p-6 flex flex-col gap-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-micro text-foreground/60">
                  Full Name
                </label>
                <input
                  {...register("fullName")}
                  type="text"
                  placeholder="Your full name"
                  className={cn(
                    "w-full h-11 px-4 rounded-xl bg-background border text-foreground placeholder:text-foreground/30 text-sm outline-none transition-colors focus:border-gold/60",
                    errors.fullName ? "border-red-500/60" : "border-border",
                  )}
                />
                {errors.fullName && (
                  <p className="text-red-400 text-xs">
                    {errors.fullName.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-micro text-foreground/60">
                  Phone Number
                </label>
                <input
                  {...register("phone")}
                  type="tel"
                  placeholder="+260 97 000 0000"
                  className="w-full h-11 px-4 rounded-xl bg-background border border-border text-foreground placeholder:text-foreground/30 text-sm outline-none transition-colors focus:border-gold/60"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-micro text-foreground/60">
                  Location
                </label>
                <input
                  {...register("location")}
                  type="text"
                  placeholder="e.g. Lusaka, Zambia"
                  className="w-full h-11 px-4 rounded-xl bg-background border border-border text-foreground placeholder:text-foreground/30 text-sm outline-none transition-colors focus:border-gold/60"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-micro text-foreground/60">Bio</label>
              <textarea
                {...register("bio")}
                rows={3}
                placeholder="Tell others a bit about yourself..."
                className={cn(
                  "w-full px-4 py-3 rounded-xl bg-background border text-foreground placeholder:text-foreground/30 text-sm outline-none transition-colors focus:border-gold/60 resize-none",
                  errors.bio ? "border-red-500/60" : "border-border",
                )}
              />
              {errors.bio && (
                <p className="text-red-400 text-xs">{errors.bio.message}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="submit"
                variant="gold"
                size="md"
                className="gap-2"
                disabled={isSaving || !isDirty}
              >
                <Save size={15} />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="md"
                className="gap-2"
                onClick={() => {
                  setIsEditing(false);
                  reset();
                }}
              >
                <X size={15} /> Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InfoField label="Full Name" value={profile?.fullName} />
            <InfoField label="Phone Number" value={profile?.phone} />
            <InfoField label="Location" value={profile?.location} />
            <InfoField label="Email" value={profile?.email} />
            <div className="sm:col-span-2 flex flex-col gap-1">
              <p className="text-micro text-foreground/60">Bio</p>
              <p className="text-sm text-foreground leading-relaxed">
                {profile?.bio || (
                  <span className="text-foreground/30">No bio added yet.</span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Section 3 - KYC Documents */}
      {hasHostRole && !kycApproved && (
        <div className="glass-card border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-display font-bold text-sm uppercase tracking-tight text-foreground">
              KYC Verification
            </h3>
            <p className="text-foreground/50 text-xs mt-1">
              Upload your verification documents to start listing.
            </p>
          </div>
          <div className="p-6 flex flex-col gap-4">
            {kycPending && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
                <Clock size={16} className="text-yellow-500 shrink-0" />
                <p className="text-sm text-yellow-500/90">
                  Your documents are under review. We'll notify you when
                  approved.
                </p>
              </div>
            )}
            {kycRejected && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                <AlertCircle size={16} className="text-red-400 shrink-0" />
                <p className="text-sm text-red-400/90">
                  Verification was rejected. Please re-upload your documents.
                </p>
              </div>
            )}
            <KycUploadSection accessToken={accessToken ?? ""} />
          </div>
        </div>
      )}

      {kycApproved && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-400/5 border border-green-400/20">
          <CheckCircle size={16} className="text-green-400 shrink-0" />
          <p className="text-sm text-green-400/90 font-medium">
            Identity verified — you are a verified Lenda host.
          </p>
        </div>
      )}

      {/* Section 4 - Become a Host */}
      {!hasHostRole && (
        <div className="glass-card p-6 border border-gold/20 bg-gold/5">
          <h3 className="font-display font-bold text-lg text-foreground uppercase tracking-tight">
            Become a Host
          </h3>
          <p className="text-foreground/50 text-sm mt-2 mb-4">
            List your assets or services and start earning. You keep your guest
            access — both roles work on the same account.
          </p>
          <Button
            variant="gold"
            size="md"
            className="gap-2"
            onClick={() => navigate("/dashboard/become-a-host")}
          >
            Start Host Application
          </Button>
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-micro text-foreground/60">{label}</p>
      <p className="text-sm text-foreground">
        {value || <span className="text-foreground/30">Not set</span>}
      </p>
    </div>
  );
}
