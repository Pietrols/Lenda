import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Save } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { api, AUTH_URL } from "@/api/client";
import { GoldLine } from "@/components/ui/GoldLine";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/api/auth";

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
  const { user, accessToken, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => api.get<AuthUser>("/auth/me", accessToken, AUTH_URL),
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
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { mutate: uploadPhoto, isPending: isUploading } = useMutation({
    mutationFn: async (file: File) => {
      // 1. Get signed upload URL from server
      const sig = await api.get<{
        signedUrl: string;
        path: string;
        token: string;
        supabaseUrl: string;
      }>("/profiles/me/upload-signature", accessToken, AUTH_URL);

      // 2. Upload directly to Supabase
      const uploadRes = await fetch(sig.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");

      // 3. Build public URL and save to server
      const publicUrl = `${sig.supabaseUrl}/storage/v1/object/public/profiles/${sig.path}`;

      return api.patch<{ user: { id: string; photoUrl: string } }>(
        "/profiles/me/photo-url",
        { photoUrl: publicUrl },
        accessToken,
        AUTH_URL,
      );
    },
    onSuccess: (data) => {
      updateUser({ ...user!, photoUrl: data.user.photoUrl });
      queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
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

  const photoUrl = previewUrl ?? profile?.photoUrl;
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
      {/* Header */}
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

      {/* Photo + KYC */}
      <div className="glass-card p-6 border border-border flex items-center gap-6">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-gold/20 flex items-center justify-center">
            {photoUrl ? (
              <img
                src={photoUrl}
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

      {/* Form */}
      <div className="glass-card p-6 border border-border">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          {/* Full name */}
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
              <p className="text-red-400 text-xs">{errors.fullName.message}</p>
            )}
          </div>

          {/* Phone */}
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

          {/* Location */}
          <div className="flex flex-col gap-1.5">
            <label className="text-micro text-foreground/60">Location</label>
            <input
              {...register("location")}
              type="text"
              placeholder="e.g. Lusaka, Zambia"
              className="w-full h-11 px-4 rounded-xl bg-background border border-border text-foreground placeholder:text-foreground/30 text-sm outline-none transition-colors duration-200 focus:border-gold/60"
            />
          </div>

          {/* Bio */}
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

          <Button
            type="submit"
            variant="gold"
            size="md"
            className="gap-2 self-start"
            disabled={isSaving || !isDirty}
          >
            <Save size={16} />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </div>
    </div>
  );
}
