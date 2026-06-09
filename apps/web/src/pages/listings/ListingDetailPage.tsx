import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { api, BOOKING_URL } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { GoldLine } from "@/components/ui/GoldLine";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  MapPin,
  Star,
  Heart,
  ChevronLeft,
  ChevronRight,
  Shield,
  Clock,
  CheckCircle,
  Calendar,
  ArrowRight,
  User,
  MessageSquare,
} from "lucide-react";

type ListingImage = {
  id: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  order: number;
};

type Host = {
  id: string;
  fullName: string | null;
  photoUrl: string | null;
  location: string | null;
  kycStatus: string;
  createdAt: string;
};

type Listing = {
  id: string;
  title: string;
  description: string;
  category: string;
  pillar: string;
  location: string;
  pricePerDay: string;
  currency: string;
  pricingMode?: string;
  status: string;
  discoveryScore: number;
  responseRate: number;
  images: ListingImage[];
  host: Host;
};

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer: {
    fullName: string | null;
    photoUrl: string | null;
  };
};

type ReviewsResponse = {
  reviews: Review[];
};

// Base schema fields shared across all pricing modes
const baseSchema = z.object({
  pickupType: z.enum(["CLIENT_TO_HOST", "HOST_TO_CLIENT"]),
  notes: z.string().optional(),
});

// Fixed/daily schema
const fixedSchema = baseSchema
  .extend({
    mode: z.literal("fixed"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
  })
  .refine((d) => new Date(d.endDate) > new Date(d.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });

// Hourly schema
const hourlySchema = baseSchema.extend({
  mode: z.literal("hourly"),
  startDate: z.string().min(1, "Start date is required"),
  hours: z.number().min(1, "At least 1 hour required").max(720),
});

// Negotiable schema
const negotiableSchema = baseSchema.extend({
  mode: z.literal("negotiable"),
  startDate: z.string().min(1, "Start date is required"),
  durationType: z.enum(["days", "hours"]),
  endDate: z.string().optional(),
  hours: z.number().optional(),
  budgetMax: z.number().positive("Please enter your offer amount"),
  budgetMin: z.number().positive().optional(),
});

type FixedForm = z.infer<typeof fixedSchema>;
type HourlyForm = z.infer<typeof hourlySchema>;
type NegotiableForm = z.infer<typeof negotiableSchema>;

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, accessToken, user } = useAuth();
  const [currentImage, setCurrentImage] = useState(0);
  const [liked, setLiked] = useState(false);

  const { data: listingData, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: () =>
      api.get<{ listing: Listing }>(`/listings/${id}`, undefined, BOOKING_URL),
    enabled: !!id,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ["reviews", id],
    queryFn: () =>
      api.get<ReviewsResponse>(
        `/reviews/listing/${id}`,
        undefined,
        BOOKING_URL,
      ),
    enabled: !!id,
  });

  const listing = listingData?.listing;
  const pricingMode = listing?.pricingMode ?? "FIXED";

  // Fixed form
  const fixedForm = useForm<FixedForm>({
    resolver: zodResolver(fixedSchema),
    defaultValues: { mode: "fixed", pickupType: "CLIENT_TO_HOST" },
  });
  const fixedStart = useWatch({
    control: fixedForm.control,
    name: "startDate",
  });
  const fixedEnd = useWatch({ control: fixedForm.control, name: "endDate" });
  const fixedDays =
    fixedStart && fixedEnd
      ? Math.max(
          0,
          Math.ceil(
            (new Date(fixedEnd).getTime() - new Date(fixedStart).getTime()) /
              86400000,
          ),
        )
      : 0;
  const fixedTotal = listing ? fixedDays * parseFloat(listing.pricePerDay) : 0;

  // Hourly form
  const hourlyForm = useForm<HourlyForm>({
    resolver: zodResolver(hourlySchema),
    defaultValues: { mode: "hourly", pickupType: "CLIENT_TO_HOST", hours: 1 },
  });
  const hourlyHours =
    useWatch({ control: hourlyForm.control, name: "hours" }) ?? 1;
  const hourlyTotal = listing
    ? (hourlyHours || 0) * parseFloat(listing.pricePerDay)
    : 0;

  // Negotiable form
  const negForm = useForm<NegotiableForm>({
    resolver: zodResolver(negotiableSchema),
    defaultValues: {
      mode: "negotiable",
      pickupType: "CLIENT_TO_HOST",
      durationType: "days",
      hours: 1,
    },
  });
  const negDurationType = useWatch({
    control: negForm.control,
    name: "durationType",
  });
  const negStart = useWatch({ control: negForm.control, name: "startDate" });
  const negBudgetMax = useWatch({
    control: negForm.control,
    name: "budgetMax",
  });
  const negBudgetMin = useWatch({
    control: negForm.control,
    name: "budgetMin",
  });

  const { mutate: createBooking, isPending: isBooking } = useMutation({
    mutationFn: (payload: object) =>
      api.post<{ booking: { id: string } }>(
        "/bookings",
        payload,
        accessToken,
        BOOKING_URL,
      ),
    onSuccess: () => {
      toast.success("Booking request sent!");
      navigate("/dashboard/bookings");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { mutate: toggleLike } = useMutation({
    mutationFn: () =>
      api.post<{ liked: boolean }>(
        "/likes",
        { targetType: "LISTING", targetId: id },
        accessToken,
        BOOKING_URL,
      ),
    onSuccess: (data) => setLiked(data.liked),
    onError: () => {
      if (!isAuthenticated) toast.error("Please sign in to like listings");
    },
  });

  function requireAuth() {
    if (!isAuthenticated) {
      toast.error("Please sign in to make a booking");
      navigate("/login");
      return false;
    }
    return true;
  }

  function onFixedSubmit(data: FixedForm) {
    if (!requireAuth()) return;
    createBooking({
      listingId: id,
      startDate: new Date(data.startDate).toISOString(),
      endDate: new Date(data.endDate).toISOString(),
      pickupType: data.pickupType,
      notes: data.notes,
      isNegotiable: false,
    });
  }

  function onHourlySubmit(data: HourlyForm) {
    if (!requireAuth()) return;
    const start = new Date(data.startDate);
    const end = new Date(start.getTime() + data.hours * 3600000);
    createBooking({
      listingId: id,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      pickupType: data.pickupType,
      notes: data.notes,
      isNegotiable: false,
    });
  }

  function onNegotiableSubmit(data: NegotiableForm) {
    if (!requireAuth()) return;
    const start = new Date(data.startDate);
    let end: Date;
    if (data.durationType === "hours") {
      end = new Date(start.getTime() + (data.hours ?? 1) * 3600000);
    } else {
      end = data.endDate
        ? new Date(data.endDate)
        : new Date(start.getTime() + 86400000);
    }
    createBooking({
      listingId: id,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      pickupType: data.pickupType,
      notes: data.notes,
      isNegotiable: true,
      budgetMax: data.budgetMax,
      budgetMin: data.budgetMin,
    });
  }

  const reviews = reviewsData?.reviews ?? [];
  const images = listing?.images ?? [];
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;

  const prevImage = () =>
    setCurrentImage((i) => (i === 0 ? images.length - 1 : i - 1));
  const nextImage = () =>
    setCurrentImage((i) => (i === images.length - 1 ? 0 : i + 1));
  const isOwnListing = user?.id === listing?.host?.id;

  const today = new Date().toISOString().split("T")[0];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-32 flex flex-col gap-6">
          <div className="h-80 rounded-2xl bg-foreground/5 animate-pulse" />
          <div className="h-8 w-64 rounded-xl bg-foreground/5 animate-pulse" />
          <div className="h-4 w-96 rounded-xl bg-foreground/5 animate-pulse" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-32 text-center">
          <p className="text-foreground/40">Listing not found.</p>
          <Link
            to="/listings"
            className="text-gold hover:text-gold/80 text-sm mt-4 inline-block"
          >
            Back to listings
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 pt-24 pb-16">
        <Link
          to="/listings"
          className="inline-flex items-center gap-2 text-sm text-foreground/40 hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft size={16} /> Back to listings
        </Link>

        <div className="grid lg:grid-cols-3 gap-10">
          {/* Left */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            {/* Gallery */}
            <div className="relative rounded-2xl overflow-hidden bg-foreground/5 aspect-video">
              {images.length > 0 ? (
                <>
                  <img
                    src={images[currentImage]?.url}
                    alt={images[currentImage]?.altText ?? listing.title}
                    className="w-full h-full object-cover"
                  />
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                      >
                        <ChevronRight size={18} />
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {images.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentImage(i)}
                            className={cn(
                              "w-1.5 h-1.5 rounded-full transition-colors",
                              i === currentImage ? "bg-gold" : "bg-white/40",
                            )}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <MapPin size={48} className="text-foreground/10" />
                </div>
              )}
              <button
                onClick={() => toggleLike()}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                <Heart
                  size={18}
                  className={cn(liked ? "text-gold fill-gold" : "text-white")}
                />
              </button>
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setCurrentImage(i)}
                    className={cn(
                      "w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-colors",
                      i === currentImage
                        ? "border-gold"
                        : "border-transparent hover:border-gold/40",
                    )}
                  >
                    <img
                      src={img.url}
                      alt={img.altText ?? ""}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Title + price */}
            <div>
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="lenda-tag capitalize">
                      {listing.category}
                    </span>
                    <span className="lenda-tag">{listing.pillar}</span>
                  </div>
                  <h1 className="font-display font-bold text-3xl text-foreground uppercase tracking-tight">
                    {listing.title}
                  </h1>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display font-black text-3xl text-foreground">
                    {pricingMode === "NEGOTIABLE"
                      ? "Negotiable"
                      : `${listing.currency} ${listing.pricePerDay}`}
                  </p>
                  <p className="text-foreground/40 text-sm">
                    {pricingMode === "HOURLY"
                      ? "per hour"
                      : pricingMode === "NEGOTIABLE"
                        ? "contact host"
                        : "per day"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  <MapPin size={14} className="text-foreground/30" />
                  <span className="text-foreground/50 text-sm">
                    {listing.location}
                  </span>
                </div>
                {avgRating && (
                  <div className="flex items-center gap-1">
                    <Star size={14} className="text-gold fill-gold" />
                    <span className="text-foreground/50 text-sm">
                      {avgRating.toFixed(1)} ({reviews.length} reviews)
                    </span>
                  </div>
                )}
              </div>

              <GoldLine className="w-12 mb-4" />
              <p className="text-foreground/60 leading-relaxed">
                {listing.description}
              </p>
            </div>

            {/* Trust signals */}
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  icon: <Shield size={18} className="text-gold" />,
                  label: "Verified Host",
                },
                {
                  icon: <Clock size={18} className="text-gold" />,
                  label: "Price Locked",
                },
                {
                  icon: <CheckCircle size={18} className="text-gold" />,
                  label: "Dual Confirm",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="glass-card p-4 border border-border flex flex-col items-center gap-2 text-center"
                >
                  {item.icon}
                  <p className="text-foreground/60 text-xs font-medium">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Host */}
            <div className="glass-card p-6 border border-border">
              <p className="text-micro text-foreground/60 mb-4">Hosted by</p>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-gold/20 flex items-center justify-center shrink-0">
                  {listing.host?.photoUrl ? (
                    <img
                      src={listing.host.photoUrl}
                      alt="Host"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={24} className="text-gold" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {listing.host?.fullName ?? "Lenda Host"}
                  </p>
                  <p className="text-foreground/40 text-sm">
                    {listing.host?.location}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {listing.host?.kycStatus === "APPROVED" && (
                      <span className="flex items-center gap-1 text-xs text-gold">
                        <CheckCircle size={11} /> Verified
                      </span>
                    )}
                    <span className="text-foreground/30 text-xs">
                      Member since{" "}
                      {new Date(listing.host?.createdAt).getFullYear()}
                    </span>
                  </div>
                </div>
                <Link
                  to={`/profiles/${listing.host?.id}`}
                  className="ml-auto lenda-link text-xs"
                >
                  View profile <ArrowRight size={12} />
                </Link>
              </div>
            </div>

            {/* Reviews */}
            {reviews.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="font-display font-bold text-lg text-foreground uppercase tracking-tight">
                    Reviews
                  </h2>
                  {avgRating && (
                    <div className="flex items-center gap-1">
                      <Star size={14} className="text-gold fill-gold" />
                      <span className="text-foreground/60 text-sm font-medium">
                        {avgRating.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-4">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="glass-card p-5 border border-border"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold text-xs font-bold overflow-hidden">
                          {review.reviewer?.photoUrl ? (
                            <img
                              src={review.reviewer.photoUrl}
                              alt="Reviewer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            (review.reviewer?.fullName?.[0] ?? "U")
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {review.reviewer?.fullName ?? "User"}
                          </p>
                          <p className="text-foreground/30 text-xs">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="ml-auto flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              size={12}
                              className={cn(
                                i < review.rating
                                  ? "text-gold fill-gold"
                                  : "text-foreground/20",
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-foreground/60 text-sm leading-relaxed">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right — booking card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="glass-card p-6 border border-border">
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="font-display font-black text-2xl text-foreground">
                    {pricingMode === "NEGOTIABLE"
                      ? "Negotiable"
                      : `${listing.currency} ${listing.pricePerDay}`}
                  </span>
                  <span className="text-foreground/40 text-sm">
                    {pricingMode === "HOURLY"
                      ? "/ hr"
                      : pricingMode === "NEGOTIABLE"
                        ? ""
                        : "/ day"}
                  </span>
                </div>
                <GoldLine className="w-10 mb-5" />

                {isOwnListing ? (
                  <div className="text-center py-6">
                    <p className="text-foreground/40 text-sm mb-4">
                      This is your listing
                    </p>
                    <Link to="/dashboard/listings">
                      <Button
                        variant="outlineGold"
                        size="sm"
                        className="w-full"
                      >
                        Manage Listing
                      </Button>
                    </Link>
                  </div>
                ) : pricingMode === "FIXED" ? (
                  /* ── FIXED: date range ── */
                  <form
                    onSubmit={fixedForm.handleSubmit(onFixedSubmit)}
                    className="flex flex-col gap-4"
                  >
                    <div className="flex flex-col gap-1.5">
                      <label className="text-micro text-foreground/60">
                        Start Date
                      </label>
                      <input
                        {...fixedForm.register("startDate")}
                        type="date"
                        min={today}
                        className={cn(
                          "w-full h-11 px-4 rounded-xl bg-background border text-foreground text-sm outline-none transition-colors focus:border-gold/60",
                          fixedForm.formState.errors.startDate
                            ? "border-destructive/60"
                            : "border-border",
                        )}
                      />
                      {fixedForm.formState.errors.startDate && (
                        <p className="text-destructive text-xs">
                          {fixedForm.formState.errors.startDate.message}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-micro text-foreground/60">
                        End Date
                      </label>
                      <input
                        {...fixedForm.register("endDate")}
                        type="date"
                        min={fixedStart || today}
                        className={cn(
                          "w-full h-11 px-4 rounded-xl bg-background border text-foreground text-sm outline-none transition-colors focus:border-gold/60",
                          fixedForm.formState.errors.endDate
                            ? "border-destructive/60"
                            : "border-border",
                        )}
                      />
                      {fixedForm.formState.errors.endDate && (
                        <p className="text-destructive text-xs">
                          {fixedForm.formState.errors.endDate.message}
                        </p>
                      )}
                    </div>

                    <PickupField form={fixedForm} />
                    <NotesField form={fixedForm} />

                    {fixedDays > 0 && (
                      <PriceSummary
                        currency={listing.currency}
                        rate={listing.pricePerDay}
                        units={fixedDays}
                        unitLabel="day"
                        total={fixedTotal}
                      />
                    )}

                    <Button
                      type="submit"
                      variant="gold"
                      size="md"
                      className="w-full gap-2"
                      disabled={isBooking}
                    >
                      {isBooking ? "Booking..." : "Request to Book"}
                      {!isBooking && <Calendar size={16} />}
                    </Button>
                    <p className="text-foreground/30 text-xs text-center">
                      Price locked at booking.
                    </p>
                  </form>
                ) : pricingMode === "HOURLY" ? (
                  /* ── HOURLY: start date + hours ── */
                  <form
                    onSubmit={hourlyForm.handleSubmit(onHourlySubmit)}
                    className="flex flex-col gap-4"
                  >
                    <div className="flex flex-col gap-1.5">
                      <label className="text-micro text-foreground/60">
                        Start Date
                      </label>
                      <input
                        {...hourlyForm.register("startDate")}
                        type="date"
                        min={today}
                        className={cn(
                          "w-full h-11 px-4 rounded-xl bg-background border text-foreground text-sm outline-none transition-colors focus:border-gold/60",
                          hourlyForm.formState.errors.startDate
                            ? "border-destructive/60"
                            : "border-border",
                        )}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-micro text-foreground/60">
                        Number of Hours
                      </label>
                      <input
                        {...hourlyForm.register("hours", {
                          valueAsNumber: true,
                        })}
                        type="number"
                        min={1}
                        max={720}
                        placeholder="e.g. 3"
                        className={cn(
                          "w-full h-11 px-4 rounded-xl bg-background border text-foreground text-sm outline-none transition-colors focus:border-gold/60",
                          hourlyForm.formState.errors.hours
                            ? "border-destructive/60"
                            : "border-border",
                        )}
                      />
                      {hourlyForm.formState.errors.hours && (
                        <p className="text-destructive text-xs">
                          {hourlyForm.formState.errors.hours.message}
                        </p>
                      )}
                    </div>

                    <PickupField form={hourlyForm} />
                    <NotesField form={hourlyForm} />

                    {hourlyHours > 0 && (
                      <PriceSummary
                        currency={listing.currency}
                        rate={listing.pricePerDay}
                        units={hourlyHours}
                        unitLabel="hour"
                        total={hourlyTotal}
                      />
                    )}

                    <Button
                      type="submit"
                      variant="gold"
                      size="md"
                      className="w-full gap-2"
                      disabled={isBooking}
                    >
                      {isBooking ? "Booking..." : "Request to Book"}
                      {!isBooking && <Calendar size={16} />}
                    </Button>
                    <p className="text-foreground/30 text-xs text-center">
                      Price locked at booking.
                    </p>
                  </form>
                ) : (
                  /* ── NEGOTIABLE ── */
                  <form
                    onSubmit={negForm.handleSubmit(onNegotiableSubmit)}
                    className="flex flex-col gap-4"
                  >
                    <div className="glass-card border border-gold/20 bg-gold/5 rounded-xl p-3 flex items-start gap-2">
                      <MessageSquare
                        size={14}
                        className="text-gold shrink-0 mt-0.5"
                      />
                      <p className="text-xs text-foreground/60">
                        This listing has negotiable pricing. Submit your offer
                        and the host will accept, counter, or decline.
                        Negotiation lasts 2 hours per round.
                      </p>
                    </div>

                    {/* Duration type toggle */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-micro text-foreground/60">
                        Duration Type
                      </label>
                      <div className="flex gap-2">
                        {(["days", "hours"] as const).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() =>
                              negForm.setValue("durationType", type)
                            }
                            className={cn(
                              "flex-1 py-2 rounded-xl text-xs font-medium border transition-colors",
                              negDurationType === type
                                ? "border-gold bg-gold/10 text-gold"
                                : "border-border text-foreground/50 hover:border-gold/30",
                            )}
                          >
                            {type === "days" ? "By Day" : "By Hour"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-micro text-foreground/60">
                        Start Date
                      </label>
                      <input
                        {...negForm.register("startDate")}
                        type="date"
                        min={today}
                        className="w-full h-11 px-4 rounded-xl bg-background border border-border text-foreground text-sm outline-none transition-colors focus:border-gold/60"
                      />
                      {negForm.formState.errors.startDate && (
                        <p className="text-destructive text-xs">
                          {negForm.formState.errors.startDate.message}
                        </p>
                      )}
                    </div>

                    {negDurationType === "days" ? (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-micro text-foreground/60">
                          End Date
                        </label>
                        <input
                          {...negForm.register("endDate")}
                          type="date"
                          min={negStart || today}
                          className="w-full h-11 px-4 rounded-xl bg-background border border-border text-foreground text-sm outline-none transition-colors focus:border-gold/60"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-micro text-foreground/60">
                          Number of Hours
                        </label>
                        <input
                          {...negForm.register("hours", {
                            valueAsNumber: true,
                          })}
                          type="number"
                          min={1}
                          placeholder="e.g. 3"
                          className="w-full h-11 px-4 rounded-xl bg-background border border-border text-foreground text-sm outline-none transition-colors focus:border-gold/60"
                        />
                      </div>
                    )}

                    {/* Budget fields */}
                    <div className="flex flex-col gap-2">
                      <label className="text-micro text-foreground/60">
                        Your Offer ({listing.currency})
                      </label>
                      <input
                        {...negForm.register("budgetMax", {
                          valueAsNumber: true,
                        })}
                        type="number"
                        min={1}
                        step="0.01"
                        placeholder="Maximum you will pay"
                        className={cn(
                          "w-full h-11 px-4 rounded-xl bg-background border text-foreground text-sm outline-none transition-colors focus:border-gold/60",
                          negForm.formState.errors.budgetMax
                            ? "border-destructive/60"
                            : "border-border",
                        )}
                      />
                      {negForm.formState.errors.budgetMax && (
                        <p className="text-destructive text-xs">
                          {negForm.formState.errors.budgetMax.message}
                        </p>
                      )}
                      <input
                        {...negForm.register("budgetMin", {
                          setValueAs: (v) =>
                            v === "" || v === undefined ? undefined : Number(v),
                        })}
                        type="number"
                        min={1}
                        step="0.01"
                        placeholder="Minimum you hope for (optional)"
                        className="w-full h-11 px-4 rounded-xl bg-background border border-border text-foreground text-sm outline-none transition-colors focus:border-gold/60"
                      />
                      <p className="text-foreground/30 text-xs">
                        Your max offer is what the host sees first.
                      </p>
                    </div>

                    {/* Offer summary */}
                    {negBudgetMax > 0 && (
                      <div className="bg-foreground/5 rounded-xl p-4 flex flex-col gap-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-foreground/50">Your offer</span>
                          <span className="text-foreground font-medium">
                            {listing.currency} {negBudgetMax?.toFixed(2)}
                          </span>
                        </div>
                        {(negBudgetMin ?? 0) > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-foreground/50">Minimum</span>
                            <span className="text-foreground/60">
                              {listing.currency} {negBudgetMin?.toFixed(2)}
                            </span>
                          </div>
                        )}
                        <GoldLine className="opacity-20" />
                        <p className="text-xs text-foreground/40">
                          Host has 2 hours to respond. Up to 2 counters each.
                        </p>
                      </div>
                    )}

                    <PickupField form={negForm} />
                    <NotesField form={negForm} />

                    <Button
                      type="submit"
                      variant="gold"
                      size="md"
                      className="w-full gap-2"
                      disabled={isBooking}
                    >
                      {isBooking ? "Sending Offer..." : "Send Offer"}
                      {!isBooking && <MessageSquare size={16} />}
                    </Button>
                    <p className="text-foreground/30 text-xs text-center">
                      No charges until negotiation is complete and booking
                      confirmed.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function PickupField({ form }: { form: unknown }) {
  const f = form as { register: (name: string) => object };
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-micro text-foreground/60">Pickup Type</label>
      <select
        {...f.register("pickupType")}
        className="w-full h-11 px-4 rounded-xl bg-background border border-border text-foreground text-sm outline-none transition-colors focus:border-gold/60"
      >
        <option value="CLIENT_TO_HOST">I will go to the host</option>
        <option value="HOST_TO_CLIENT">Host delivers to me</option>
      </select>
    </div>
  );
}

function NotesField({ form }: { form: unknown }) {
  const f = form as { register: (name: string) => object };
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-micro text-foreground/60">Notes (optional)</label>
      <textarea
        {...f.register("notes")}
        rows={2}
        placeholder="Any special requests..."
        className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-foreground/30 text-sm outline-none transition-colors focus:border-gold/60 resize-none"
      />
    </div>
  );
}

function PriceSummary({
  currency,
  rate,
  units,
  unitLabel,
  total,
}: {
  currency: string;
  rate: string;
  units: number;
  unitLabel: string;
  total: number;
}) {
  return (
    <div className="bg-foreground/5 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex justify-between text-sm">
        <span className="text-foreground/50">
          {currency} {rate} x {units} {unitLabel}
          {units !== 1 ? "s" : ""}
        </span>
        <span className="text-foreground">
          {currency} {total.toFixed(2)}
        </span>
      </div>
      <GoldLine className="opacity-20" />
      <div className="flex justify-between">
        <span className="font-semibold text-sm text-foreground">Total</span>
        <span className="font-display font-bold text-foreground">
          {currency} {total.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
