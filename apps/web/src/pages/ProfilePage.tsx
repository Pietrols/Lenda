import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, AUTH_URL, BOOKING_URL } from "@/api/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { GoldLine } from "@/components/ui/GoldLine";
import {
  MapPin,
  Star,
  Award,
  CalendarDays,
  ShieldCheck,
  ListChecks,
} from "lucide-react";

type PublicProfile = {
  id: string;
  fullName: string | null;
  email: string;
  photoUrl: string | null;
  bio: string | null;
  location: string | null;
  kycStatus: string;
  roles: string[];
  createdAt: string;
  badges?: { id: string; label: string }[];
  completedBookings: number;
  averageRating: number | null;
  reviewCount: number;
};

type Listing = {
  id: string;
  title: string;
  category: string;
  pillar: string;
  location: string;
  pricePerDay: string;
  currency: string;
  discoveryScore: number;
  images: { url: string; isPrimary: boolean }[];
};

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["public-profile", id],
    queryFn: () =>
      api.get<{ user: PublicProfile }>(`/profiles/${id}`, undefined, AUTH_URL),
    enabled: !!id,
    retry: false,
  });

  const { data: listingsData, isLoading: listingsLoading } = useQuery({
    queryKey: ["host-listings", id],
    queryFn: () =>
      api.get<{ listings: Listing[] }>(
        `/listings/host/${id}`,
        undefined,
        BOOKING_URL,
      ),
    enabled: !!id,
    retry: false,
  });

  const user = profileData?.user;
  const listings = listingsData?.listings ?? [];
  const isHost = user?.roles?.includes("HOST");
  const isVerified = user?.kycStatus === "APPROVED";

  const initials = (user?.fullName ?? user?.email ?? "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 pt-28 pb-16 max-w-4xl">
          <div className="flex flex-col gap-6">
            <div className="glass-card p-8 border border-border animate-pulse h-48" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="glass-card border border-border h-56 animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 pt-28 pb-16 max-w-4xl">
          <div className="glass-card p-16 border border-border text-center">
            <p className="text-foreground/40">Profile not found.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 pt-28 pb-16 max-w-4xl">
        <div className="flex flex-col gap-8">
          {/* Profile card */}
          <div className="glass-card p-6 md:p-8 border border-border">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="w-20 h-20 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-2xl font-display shrink-0 overflow-hidden border-2 border-gold/20">
                {user.photoUrl ? (
                  <img
                    src={user.photoUrl}
                    alt={user.fullName ?? "Host"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start gap-3 mb-2">
                  <h1 className="font-display font-bold text-2xl text-foreground uppercase tracking-tight">
                    {user.fullName ?? "Anonymous Host"}
                  </h1>
                  {isVerified && (
                    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border border-green-400/30 text-green-400 bg-green-400/10">
                      <ShieldCheck size={11} /> Verified
                    </span>
                  )}
                  {isHost && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full border border-gold/30 text-gold bg-gold/10">
                      HOST
                    </span>
                  )}
                </div>

                {user.location && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <MapPin size={13} className="text-foreground/40" />
                    <span className="text-sm text-foreground/50">
                      {user.location}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 mb-3">
                  <CalendarDays size={13} className="text-foreground/30" />
                  <span className="text-xs text-foreground/40">
                    Member since{" "}
                    {new Date(user.createdAt).toLocaleDateString("en-ZM", {
                      year: "numeric",
                      month: "long",
                    })}
                  </span>
                </div>

                {user.badges && user.badges.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {user.badges.map((badge) => (
                      <span
                        key={badge.id}
                        className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border border-gold/30 text-gold bg-gold/5"
                      >
                        <Award size={10} /> {badge.label}
                      </span>
                    ))}
                  </div>
                )}

                {user.bio && (
                  <p className="text-sm text-foreground/60 leading-relaxed max-w-prose">
                    {user.bio}
                  </p>
                )}

                {/* Stats  */}
                <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-border/50">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-display font-bold text-xl text-foreground">
                      {user.completedBookings}
                    </span>
                    <span className="text-xs text-foreground/40">
                      {user.completedBookings === 1 ? "Job done" : "Jobs done"}
                    </span>
                  </div>
                  {user.averageRating !== null && (
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1">
                        <span className="font-display font-bold text-xl text-foreground">
                          {user.averageRating.toFixed(1)}
                        </span>
                        <Star size={14} className="text-gold fill-gold" />
                      </div>
                      <span className="text-xs text-foreground/40">
                        {user.reviewCount}{" "}
                        {user.reviewCount === 1 ? "review" : "reviews"}
                      </span>
                    </div>
                  )}
                  {user.averageRating === null &&
                    user.completedBookings === 0 && (
                      <p className="text-xs text-foreground/30 self-center">
                        No reviews yet
                      </p>
                    )}
                </div>
              </div>
            </div>
          </div>

          {/* Listings */}
          {isHost && (
            <div>
              <div className="mb-5">
                <p className="section-label">Listings</p>
                <GoldLine className="w-10 mb-3" />
                <h2 className="font-display font-bold text-xl text-foreground uppercase tracking-tight">
                  {user.fullName
                    ? `${user.fullName.split(" ")[0]}'s Listings`
                    : "Active Listings"}
                </h2>
              </div>

              {listingsLoading ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="glass-card border border-border h-56 animate-pulse"
                    />
                  ))}
                </div>
              ) : listings.length === 0 ? (
                <div className="glass-card p-12 border border-border flex flex-col items-center gap-3">
                  <ListChecks size={28} className="text-foreground/20" />
                  <p className="text-foreground/40 text-sm">
                    No active listings yet.
                  </p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {listings.map((listing) => {
                    const primaryImage =
                      listing.images?.find((i) => i.isPrimary)?.url ??
                      listing.images?.[0]?.url;

                    return (
                      <Link
                        key={listing.id}
                        to={`/listings/${listing.id}`}
                        className="group"
                      >
                        <div className="glass-card border border-border hover:border-gold/40 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                          <div className="relative h-44 bg-foreground/5 overflow-hidden">
                            {primaryImage ? (
                              <img
                                src={primaryImage}
                                alt={listing.title}
                                loading="lazy"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ListChecks
                                  size={28}
                                  className="text-foreground/10"
                                />
                              </div>
                            )}
                            <div className="absolute top-3 left-3">
                              <span className="lenda-tag text-xs">
                                {listing.pillar === "RENTAL"
                                  ? "Rental"
                                  : "Service"}
                              </span>
                            </div>
                          </div>
                          <div className="p-4">
                            <h3 className="font-display font-bold text-sm text-foreground uppercase tracking-tight truncate mb-1">
                              {listing.title}
                            </h3>
                            <div className="flex items-center gap-1 mb-3">
                              <MapPin
                                size={11}
                                className="text-foreground/30 shrink-0"
                              />
                              <p className="text-foreground/40 text-xs truncate">
                                {listing.location}
                              </p>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <Star
                                  size={10}
                                  className="text-gold fill-gold"
                                />
                                <span className="text-foreground/40 text-xs">
                                  {listing.discoveryScore.toFixed(1)}
                                </span>
                              </div>
                              <div>
                                <span className="font-display font-bold text-sm text-foreground">
                                  {listing.currency} {listing.pricePerDay}
                                </span>
                                <span className="text-foreground/40 text-xs">
                                  /day
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
