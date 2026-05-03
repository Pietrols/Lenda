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

const bookingSchema = z
  .object({
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    pickupType: z.enum(["CLIENT_TO_HOST", "HOST_TO_CLIENT"]),
    notes: z.string().optional(),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });

type BookingForm = z.infer<typeof bookingSchema>;

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

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { pickupType: "CLIENT_TO_HOST" },
  });

  const startDate = useWatch({ control, name: "startDate" });
  const endDate = useWatch({ control, name: "endDate" });

  const totalDays =
    startDate && endDate
      ? Math.max(
          0,
          Math.ceil(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : 0;

  const listing = listingData?.listing;
  const totalAmount = listing ? totalDays * parseFloat(listing.pricePerDay) : 0;

  const { mutate: createBooking, isPending: isBooking } = useMutation({
    mutationFn: (data: BookingForm) =>
      api.post<{ booking: { id: string } }>(
        "/bookings",
        { listingId: id, ...data },
        accessToken,
        BOOKING_URL,
      ),
    onSuccess: () => {
      toast.success("Booking created successfully!");
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

  const onSubmit = (data: BookingForm) => {
    if (!isAuthenticated) {
      toast.error("Please sign in to make a booking");
      navigate("/login");
      return;
    }
    createBooking({
      ...data,
      startDate: new Date(data.startDate).toISOString(),
      endDate: new Date(data.endDate).toISOString(),
    });
  };

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

            {/* Title */}
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
                    {listing.pricingMode === "NEGOTIABLE"
                      ? "Negotiable"
                      : `${listing.currency} ${listing.pricePerDay}`}
                  </p>
                  <p className="text-foreground/40 text-sm">
                    {listing.pricingMode === "HOURLY"
                      ? "per hour"
                      : listing.pricingMode === "NEGOTIABLE"
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
                    {listing.pricingMode === "NEGOTIABLE"
                      ? "Negotiable"
                      : `${listing.currency} ${listing.pricePerDay}`}
                  </span>
                  <span className="text-foreground/40 text-sm">
                    {listing.pricingMode === "HOURLY"
                      ? "/ hr"
                      : listing.pricingMode === "NEGOTIABLE"
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
                ) : (
                  <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="flex flex-col gap-4"
                  >
                    <div className="flex flex-col gap-1.5">
                      <label className="text-micro text-foreground/60">
                        Start Date
                      </label>
                      <input
                        {...register("startDate")}
                        type="date"
                        min={new Date().toISOString().split("T")[0]}
                        className={cn(
                          "w-full h-11 px-4 rounded-xl bg-background border text-foreground text-sm outline-none transition-colors focus:border-gold/60",
                          errors.startDate
                            ? "border-destructive/60"
                            : "border-border",
                        )}
                      />
                      {errors.startDate && (
                        <p className="text-destructive text-xs">
                          {errors.startDate.message}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-micro text-foreground/60">
                        End Date
                      </label>
                      <input
                        {...register("endDate")}
                        type="date"
                        min={
                          startDate || new Date().toISOString().split("T")[0]
                        }
                        className={cn(
                          "w-full h-11 px-4 rounded-xl bg-background border text-foreground text-sm outline-none transition-colors focus:border-gold/60",
                          errors.endDate
                            ? "border-destructive/60"
                            : "border-border",
                        )}
                      />
                      {errors.endDate && (
                        <p className="text-destructive text-xs">
                          {errors.endDate.message}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-micro text-foreground/60">
                        Pickup Type
                      </label>
                      <select
                        {...register("pickupType")}
                        className="w-full h-11 px-4 rounded-xl bg-background border border-border text-foreground text-sm outline-none transition-colors focus:border-gold/60"
                      >
                        <option value="CLIENT_TO_HOST">
                          I will go to the host
                        </option>
                        <option value="HOST_TO_CLIENT">
                          Host delivers to me
                        </option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-micro text-foreground/60">
                        Notes (optional)
                      </label>
                      <textarea
                        {...register("notes")}
                        rows={2}
                        placeholder="Any special requests..."
                        className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-foreground/30 text-sm outline-none transition-colors focus:border-gold/60 resize-none"
                      />
                    </div>

                    {totalDays > 0 && (
                      <div className="bg-foreground/5 rounded-xl p-4 flex flex-col gap-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-foreground/50">
                            {listing.currency} {listing.pricePerDay} x{" "}
                            {totalDays} day{totalDays !== 1 ? "s" : ""}
                          </span>
                          <span className="text-foreground">
                            {listing.currency} {totalAmount.toFixed(2)}
                          </span>
                        </div>
                        <GoldLine className="opacity-20" />
                        <div className="flex justify-between">
                          <span className="font-semibold text-sm text-foreground">
                            Total
                          </span>
                          <span className="font-display font-bold text-foreground">
                            {listing.currency} {totalAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>
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
                      Price locked at booking. No charges until confirmed.
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
