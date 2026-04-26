import { useState } from "react";
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
  location: z.string().min(1, "Location is required"),
  metadata: z.record(z.unknown()),
});

type CreateListingForm = z.infer<typeof CreateListingSchema>;

const CATEGORIES: Record<"RENTAL" | "SERVICE", string[]> = {
  RENTAL: ["Vehicles", "Property", "Equipment", "Electronics", "Furniture", "Other"],
  SERVICE: ["Cleaning", "Repairs", "Delivery", "Tutoring", "Errands", "Photography", "Other"],
};

const CURRENCIES = ["ZMW", "USD"];

const STEPS = ["Pillar & Category", "Details", "Pricing"];

export default function DashboardCreateListing() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateListingForm>({
    resolver: zodResolver(CreateListingSchema),
    defaultValues: {
      pillar: "RENTAL",
      currency: "ZMW",
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

  async function onSubmit(data: CreateListingForm) {
    setIsSubmitting(true);
    try {
      await api.post("/listings", data, accessToken, BOOKING_URL);
      toast.success("Listing published successfully");
      navigate("/dashboard/listings");
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
                {CATEGORIES[pillar as "RENTAL" | "SERVICE"].map((cat: string) => (
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
                ))}
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

        {step === 2 && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Price Per Day
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
                {isSubmitting ? "Publishing..." : "Publish Listing"}
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}