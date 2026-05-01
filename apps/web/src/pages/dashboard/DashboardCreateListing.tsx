import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Car,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  ImagePlus,
  X,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { api, BOOKING_URL } from "@/api/client";
import { GoldLine } from "@/components/ui/GoldLine";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const CreateListingSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  pillar: z.enum(["RENTAL", "SERVICE"]),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  pricePerDay: z.number().positive("Price must be positive"),
  currency: z.string().min(1, "Currency is required"),
  pricingMode: z.enum(["FIXED", "HOURLY", "NEGOTIABLE"]),
  location: z.string().min(1, "Location is required"),
  metadata: z.record(z.unknown()),
});

type CreateListingForm = z.infer<typeof CreateListingSchema>;

type UploadedImage = {
  file: File;
  preview: string;
  uploading: boolean;
  done: boolean;
  error?: string;
};

const CATEGORIES: Record<"RENTAL" | "SERVICE", string[]> = {
  RENTAL: [
    "Vehicles",
    "Property",
    "Equipment",
    "Electronics",
    "Furniture",
    "Other",
  ],
  SERVICE: [
    "Cleaning",
    "Repairs",
    "Delivery",
    "Tutoring",
    "Errands",
    "Photography",
    "Other",
  ],
};

const CURRENCIES = ["ZMW", "USD"];
const STEPS = ["Pillar & Category", "Details", "Pricing", "Photos"];
const MAX_IMAGES = 3;

export default function DashboardCreateListing() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdListingId, setCreatedListingId] = useState<string | null>(null);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<CreateListingForm>({
    resolver: zodResolver(CreateListingSchema),
    defaultValues: {
      pillar: "RENTAL",
      currency: "ZMW",
      pricingMode: "FIXED",
      metadata: {},
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const pillar = watch("pillar");
  const category = watch("category");
  const pricingMode = watch("pricingMode");

  async function onSubmit(data: CreateListingForm) {
    if (
      data.pricingMode !== "NEGOTIABLE" &&
      (!data.pricePerDay || data.pricePerDay <= 0)
    ) {
      toast.error("Please enter a valid price");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.post<{ listing: { id: string } }>(
        "/listings",
        { ...data, pricePerDay: data.pricePerDay || 0 },
        accessToken,
        BOOKING_URL,
      );
      setCreatedListingId(res.listing.id);
      setStep(3);
      toast.success("Listing created. Now add your photos.");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create listing",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function prevStep() {
    setStep((s) => s - 1);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = MAX_IMAGES - images.length;
    const toAdd = files.slice(0, remaining);
    const newImages: UploadedImage[] = toAdd.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: false,
      done: false,
    }));
    setImages((prev) => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].preview);
      next.splice(index, 1);
      return next;
    });
  }

  async function uploadAllImages() {
    if (!createdListingId) return;
    const pending = images.filter((img) => !img.done);
    if (!pending.length) {
      navigate("/dashboard/listings");
      return;
    }
    for (let i = 0; i < images.length; i++) {
      if (images[i].done) continue;
      setImages((prev) =>
        prev.map((img, idx) => (idx === i ? { ...img, uploading: true } : img)),
      );
      try {
        const formData = new FormData();
        formData.append("image", images[i].file);
        formData.append("isPrimary", i === 0 ? "true" : "false");
        const res = await fetch(
          `${BOOKING_URL}/listings/${createdListingId}/images`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}` },
            body: formData,
          },
        );
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message ?? "Upload failed");
        }
        setImages((prev) =>
          prev.map((img, idx) =>
            idx === i ? { ...img, uploading: false, done: true } : img,
          ),
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setImages((prev) =>
          prev.map((img, idx) =>
            idx === i ? { ...img, uploading: false, error: message } : img,
          ),
        );
        toast.error(`Image ${i + 1}: ${message}`);
      }
    }
    toast.success("Listing published successfully");
    navigate("/dashboard/listings");
  }

  return (
    <div className="max-w-2xl">
      <div>
        <p className="section-label">Host</p>
        <GoldLine className="w-10 mb-3" />
        <h2 className="font-display font-bold text-2xl text-foreground uppercase tracking-tight">
          Create Listing
        </h2>
        <p className="text-foreground/50 text-sm mt-1">
          Fill in the details below to publish your listing on Lenda.
        </p>
      </div>

      <div className="flex items-center gap-2 mt-6 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                i < step
                  ? "bg-gold text-lenda-dark"
                  : i === step
                    ? "bg-gold/20 text-gold border border-gold/40"
                    : "bg-foreground/10 text-foreground/30",
              )}
            >
              {i < step ? <CheckCircle size={14} /> : i + 1}
            </div>
            <span
              className={cn(
                "text-xs font-medium hidden sm:inline",
                i === step ? "text-gold" : "text-foreground/30",
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "w-8 h-px",
                  i < step ? "bg-gold/40" : "bg-foreground/10",
                )}
              />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 0: Pillar + Category */}
        {step === 0 && (
          <div className="flex flex-col gap-6">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-3">
                What are you listing?
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(["RENTAL", "SERVICE"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setValue("pillar", p);
                      setValue("category", "");
                    }}
                    className={cn(
                      "glass-card p-5 border text-left transition-all duration-200",
                      pillar === p
                        ? "border-gold bg-gold/5"
                        : "border-border hover:border-gold/30",
                    )}
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
                        pillar === p ? "bg-gold/20" : "bg-foreground/5",
                      )}
                    >
                      {p === "RENTAL" ? (
                        <Car size={20} className="text-gold" />
                      ) : (
                        <Briefcase size={20} className="text-gold" />
                      )}
                    </div>
                    <p className="font-display font-bold text-sm uppercase tracking-tight text-foreground">
                      {p === "RENTAL" ? "Rental" : "Service"}
                    </p>
                    <p className="text-foreground/40 text-xs mt-1">
                      {p === "RENTAL"
                        ? "Vehicles, property, equipment"
                        : "Skills, labour, expertise"}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-3">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES[pillar as "RENTAL" | "SERVICE"].map(
                  (cat: string) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setValue("category", cat)}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200",
                        category === cat
                          ? "border-gold bg-gold/10 text-gold"
                          : "border-border text-foreground/50 hover:border-gold/30 hover:text-foreground",
                      )}
                    >
                      {cat}
                    </button>
                  ),
                )}
              </div>
              {errors.category && (
                <p className="text-red-400 text-xs mt-2">
                  {errors.category.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Subcategory{" "}
                <span className="text-foreground/30 font-normal">
                  (optional)
                </span>
              </label>
              <input
                {...register("subcategory")}
                placeholder="e.g. Sedan, 2-bedroom, Power drill..."
                className="w-full glass-card border border-border rounded-xl px-4 py-3 text-sm text-foreground bg-transparent placeholder:text-foreground/30 focus:outline-none focus:border-gold/50 transition-colors"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="gold"
                size="lg"
                className="gap-2"
                onClick={() => {
                  if (!category) {
                    toast.error("Please select a category before continuing");
                    return;
                  }
                  setStep(1);
                }}
              >
                Continue <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* Step 1: Details */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Listing Title
              </label>
              <input
                {...register("title")}
                placeholder="e.g. 2019 Toyota Corolla, Professional Cleaning Service..."
                className="w-full glass-card border border-border rounded-xl px-4 py-3 text-sm text-foreground bg-transparent placeholder:text-foreground/30 focus:outline-none focus:border-gold/50 transition-colors"
              />
              {errors.title && (
                <p className="text-red-400 text-xs mt-1">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Description
              </label>
              <textarea
                {...register("description")}
                rows={5}
                placeholder="Describe your listing in detail. Include condition, availability, rules, or anything a guest should know..."
                className="w-full glass-card border border-border rounded-xl px-4 py-3 text-sm text-foreground bg-transparent placeholder:text-foreground/30 focus:outline-none focus:border-gold/50 transition-colors resize-none"
              />
              {errors.description && (
                <p className="text-red-400 text-xs mt-1">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Location
              </label>
              <input
                {...register("location")}
                placeholder="e.g. Lusaka, Woodlands"
                className="w-full glass-card border border-border rounded-xl px-4 py-3 text-sm text-foreground bg-transparent placeholder:text-foreground/30 focus:outline-none focus:border-gold/50 transition-colors"
              />
              {errors.location && (
                <p className="text-red-400 text-xs mt-1">
                  {errors.location.message}
                </p>
              )}
            </div>

            <div className="flex justify-between pt-2">
              <Button
                type="button"
                variant="outlineGold"
                size="lg"
                className="gap-2"
                onClick={prevStep}
              >
                <ArrowLeft size={16} /> Back
              </Button>
              <Button
                type="button"
                variant="gold"
                size="lg"
                className="gap-2"
                onClick={async () => {
                  const valid = await form.trigger([
                    "title",
                    "description",
                    "location",
                  ]);
                  if (valid) setStep(2);
                }}
              >
                Continue <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Pricing */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            {/* Pricing mode -- full width, flex wrap for mobile */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-3">
                Pricing Type
              </label>
              <div className="flex flex-wrap gap-3">
                {(
                  [
                    {
                      value: "FIXED",
                      label: "Fixed",
                      desc: "Set price per day",
                    },
                    {
                      value: "HOURLY",
                      label: "Hourly",
                      desc: "Set price per hour",
                    },
                    {
                      value: "NEGOTIABLE",
                      label: "Negotiable",
                      desc: "Open to offers",
                    },
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setValue("pricingMode", mode.value)}
                    className={cn(
                      "glass-card p-3 border text-left transition-all duration-200 min-w-[100px] flex-1",
                      pricingMode === mode.value
                        ? "border-gold bg-gold/5"
                        : "border-border hover:border-gold/30",
                    )}
                  >
                    <p className="font-semibold text-sm text-foreground">
                      {mode.label}
                    </p>
                    <p className="text-foreground/40 text-xs mt-0.5">
                      {mode.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Price + currency for FIXED and HOURLY */}
            {pricingMode !== "NEGOTIABLE" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    {pricingMode === "HOURLY"
                      ? "Price Per Hour"
                      : "Price Per Day"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    {...register("pricePerDay", { valueAsNumber: true })}
                    placeholder="0.00"
                    className="w-full glass-card border border-border rounded-xl px-4 py-3 text-sm text-foreground bg-transparent placeholder:text-foreground/30 focus:outline-none focus:border-gold/50 transition-colors"
                  />
                  {errors.pricePerDay && (
                    <p className="text-red-400 text-xs mt-1">
                      {errors.pricePerDay.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Currency
                  </label>
                  <select
                    {...register("currency")}
                    className="w-full glass-card border border-border rounded-xl px-4 py-3 text-sm text-foreground bg-background focus:outline-none focus:border-gold/50 transition-colors"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Negotiable */}
            {pricingMode === "NEGOTIABLE" && (
              <div className="glass-card border border-gold/20 bg-gold/5 rounded-xl p-4">
                <p className="text-sm text-gold font-medium">
                  Negotiable pricing
                </p>
                <p className="text-foreground/50 text-xs mt-1">
                  Guests will contact you to discuss pricing before booking. You
                  can set a starting price or leave it as 0.
                </p>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground/60 mb-1">
                      Starting Price (optional)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      {...register("pricePerDay", { valueAsNumber: true })}
                      placeholder="0.00"
                      className="w-full glass-card border border-border rounded-xl px-3 py-2 text-sm text-foreground bg-transparent placeholder:text-foreground/30 focus:outline-none focus:border-gold/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground/60 mb-1">
                      Currency
                    </label>
                    <select
                      {...register("currency")}
                      className="w-full glass-card border border-border rounded-xl px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:border-gold/50 transition-colors"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="glass-card border border-border rounded-xl p-5 flex flex-col gap-3 mt-1">
              <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider">
                Summary
              </p>
              <div className="flex flex-col gap-2.5 text-sm">
                {[
                  { label: "Pillar", value: watch("pillar") },
                  { label: "Category", value: watch("category") },
                  { label: "Subcategory", value: watch("subcategory") || "--" },
                  { label: "Title", value: watch("title") },
                  { label: "Location", value: watch("location") },
                  { label: "Pricing", value: pricingMode },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="text-foreground/40 shrink-0">{label}</span>
                    <span className="text-foreground font-medium text-right truncate max-w-[60%]">
                      {value || "--"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button
                type="button"
                variant="outlineGold"
                size="lg"
                className="gap-2"
                onClick={prevStep}
              >
                <ArrowLeft size={16} /> Back
              </Button>
              <Button
                type="submit"
                variant="gold"
                size="lg"
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? "Creating..." : "Create Listing"}
              </Button>
            </div>
          </div>
        )}
      </form>

      {/* Step 3: Photos */}
      {step === 3 && (
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">
              Add up to {MAX_IMAGES} photos
            </p>
            <p className="text-foreground/40 text-xs">
              First photo becomes the primary image shown in search results.
              Photos are optional.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {images.map((img, i) => (
              <div
                key={i}
                className="relative aspect-square rounded-xl overflow-hidden border border-border bg-foreground/5"
              >
                <img
                  src={img.preview}
                  alt={`Photo ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                {img.uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 size={20} className="text-white animate-spin" />
                  </div>
                )}
                {img.done && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <CheckCircle size={20} className="text-green-400" />
                  </div>
                )}
                {i === 0 && (
                  <span className="absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gold text-lenda-dark">
                    Primary
                  </span>
                )}
                {!img.uploading && !img.done && (
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            ))}

            {images.length < MAX_IMAGES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border border-dashed border-border hover:border-gold/40 bg-foreground/5 hover:bg-gold/5 flex flex-col items-center justify-center gap-2 transition-all duration-200"
              >
                <ImagePlus size={20} className="text-foreground/30" />
                <span className="text-xs text-foreground/30">Add photo</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          <div className="flex justify-between pt-2">
            <Button
              type="button"
              variant="outlineGold"
              size="sm"
              onClick={() => navigate("/dashboard/listings")}
            >
              Skip for now
            </Button>
            <Button
              type="button"
              variant="gold"
              size="lg"
              className="gap-2"
              onClick={uploadAllImages}
              disabled={images.some((img) => img.uploading)}
            >
              {images.some((img) => img.uploading)
                ? "Uploading..."
                : images.length === 0
                  ? "Finish"
                  : `Upload ${images.length} photo${images.length > 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
