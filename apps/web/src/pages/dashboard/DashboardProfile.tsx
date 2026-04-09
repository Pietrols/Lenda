import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Save, Pencil, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { api, AUTH_URL } from "@/api/client";
import { GoldLine } from "@/components/ui/GoldLine";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/api/auth";
import { authApi } from "@/api/auth";
import { useSearchParams } from "react-router-dom";

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

export default function DashboardProfile() {
  const { user, tokens, accessToken, updateUser, setAuth } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoTimestamp, setPhotoTimestamp] = useState(() => Date.now());
  const [isEditing, setIsEditing] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const showUpgrade = searchParams.get("upgrade") === "host";

  const { mutate: upgradeToHost, isPending: isUpgrading } = useMutation({
    mutationFn: () => authApi.addRole("HOST", accessToken ?? ""),
    onSuccess: async (data: { user: AuthUser }) => {
      // Refresh tokens so the new access token includes HOST role
      try {
        const refreshed = await authApi.refresh(tokens?.refreshToken ?? "");
        setAuth(refreshed.user, refreshed.tokens);
      } catch {
        updateUser(data.user);
      }
      setSearchParams({});
      toast.success("You are now a Host! You can create listings.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => api.get<AuthUser>("/profiles/me", accessToken, AUTH_URL),
    enabled: !!accessToken,
  });

  const {
    register,
    handleSubmit,
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
      api.patch<AuthUser>("/profiles/me", data, accessToken, AUTH_URL),
    onSuccess: (updated) => {
      updateUser(updated);
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
      return data;
    },
    onSuccess: (data) => {
      updateUser({ ...user!, photoUrl: data.user.photoUrl });
      queryClient.setQueryData(
        ["profile", "me"],
        (old: AuthUser | undefined) => {
          if (!old) return old;
          return { ...old, photoUrl: data.user.photoUrl };
        },
      );
      queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
      setPhotoTimestamp(Date.now());
      toast.success("Profile photo updated.");
      setPreviewUrl(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    uploadPhoto(file);
  };

  const onSubmit = (data: ProfileForm) => updateProfile(data);

  const photoUrl = profile?.photoUrl ?? previewUrl ?? null;
  const initials = (profile?.fullName ?? profile?.email ?? "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
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
      {showUpgrade && !user?.roles?.includes("HOST") && (
        <div className="glass-card p-6 border border-gold/30 bg-gold/5">
          <h3 className="font-display font-bold text-lg text-foreground uppercase tracking-tight">
            Become a Host
          </h3>
          <p className="text-foreground/50 text-sm mt-2 mb-4">
            Add the HOST role to your account to create listings and start
            earning. You keep your GUEST role - both roles work on the same
            account.
          </p>
          <Button
            variant="gold"
            size="md"
            className="gap-2"
            disabled={isUpgrading}
            onClick={() => upgradeToHost()}
          >
            {isUpgrading ? "Upgrading..." : "Confirm - Become a Host"}
          </Button>
        </div>
      )}
      <div>
        <p className="section-label">Account</p>
        <GoldLine className="w-10 mb-3" />
        <h2 className="font-display font-bold text-2xl text-foreground uppercase tracking-tight">
          Your Profile
        </h2>
        <p className="text-foreground/50 text-sm mt-1">
          Update your personal information and profile photo.
        </p>
      </div>

      <div className="glass-card p-6 border border-border flex items-center gap-6">
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
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gold flex items-center justify-center hover:bg-gold/80 transition-colors"
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

        <div>
          <p className="font-semibold text-foreground">
            {profile?.fullName ?? "No name set"}
          </p>
          <p className="text-foreground/50 text-sm">{profile?.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full border",
                kycColors[profile?.kycStatus ?? "PENDING"],
              )}
            >
              KYC {profile?.kycStatus}
            </span>
            {user?.roles?.map((role) => (
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

      {isEditing ? (
        <div className="glass-card p-6 border border-border">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-5"
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-micro text-foreground/60">Full Name</label>
              <input
                {...register("fullName")}
                type="text"
                placeholder="Your full name"
                className={cn(
                  "w-full h-11 px-4 rounded-xl bg-background border text-foreground placeholder:text-foreground/30 text-sm outline-none transition-colors duration-200 focus:border-gold/60",
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
                className="w-full h-11 px-4 rounded-xl bg-background border border-border text-foreground placeholder:text-foreground/30 text-sm outline-none transition-colors duration-200 focus:border-gold/60"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-micro text-foreground/60">Location</label>
              <input
                {...register("location")}
                type="text"
                placeholder="e.g. Lusaka, Zambia"
                className="w-full h-11 px-4 rounded-xl bg-background border border-border text-foreground placeholder:text-foreground/30 text-sm outline-none transition-colors duration-200 focus:border-gold/60"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-micro text-foreground/60">Bio</label>
              <textarea
                {...register("bio")}
                rows={3}
                placeholder="Tell others a bit about yourself..."
                className={cn(
                  "w-full px-4 py-3 rounded-xl bg-background border text-foreground placeholder:text-foreground/30 text-sm outline-none transition-colors duration-200 focus:border-gold/60 resize-none",
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
                <Save size={16} />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="md"
                className="gap-2"
                onClick={() => setIsEditing(false)}
              >
                <X size={16} />
                Cancel
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <div className="glass-card p-6 border border-border flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-5">
            <div className="flex flex-col gap-1">
              <p className="text-micro text-foreground/60">Full Name</p>
              <p className="text-sm text-foreground">
                {profile?.fullName || (
                  <span className="text-foreground/30">Not set</span>
                )}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-micro text-foreground/60">Phone Number</p>
              <p className="text-sm text-foreground">
                {profile?.phone || (
                  <span className="text-foreground/30">Not set</span>
                )}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-micro text-foreground/60">Location</p>
              <p className="text-sm text-foreground">
                {profile?.location || (
                  <span className="text-foreground/30">Not set</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-micro text-foreground/60">Bio</p>
            <p className="text-sm text-foreground leading-relaxed">
              {profile?.bio || (
                <span className="text-foreground/30">No bio added yet.</span>
              )}
            </p>
          </div>
          <Button
            type="button"
            variant="gold"
            size="md"
            className="gap-2 self-start"
            onClick={() => setIsEditing(true)}
          >
            <Pencil size={16} />
            Edit Profile
          </Button>
        </div>
      )}
    </div>
  );
}
