import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { api, BOOKING_URL } from "@/api/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { GoldLine } from "@/components/ui/GoldLine";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Star,
  Heart,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

type Listing = {
  id: string;
  title: string;
  category: string;
  pillar: string;
  location: string;
  pricePerDay: string;
  currency: string;
  status: string;
  discoveryScore: number;
  responseRate: number;
  images: { url: string; isPrimary: boolean }[];
  host: {
    id: string;
    fullName: string | null;
    photoUrl: string | null;
    kycStatus: string;
  };
};

type ListingsResponse = {
  listings: Listing[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

const categories = [
  "All",
  "car",
  "property",
  "equipment",
  "cleaning",
  "repairs",
  "delivery",
  "tutoring",
  "errands",
];

const pillars = [
  { value: "", label: "All" },
  { value: "RENTAL", label: "Rentals" },
  { value: "SERVICE", label: "Services" },
];

export default function ListingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const pillar = searchParams.get("pillar") ?? "";
  const category = searchParams.get("category") ?? "";
  const location = searchParams.get("location") ?? "";
  const search = searchParams.get("search") ?? "";
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");

  const [searchInput, setSearchInput] = useState(search);
  const [locationInput, setLocationInput] = useState(location);
  const [minPriceInput, setMinPriceInput] = useState(minPrice);
  const [maxPriceInput, setMaxPriceInput] = useState(maxPrice);
  const [startDateInput, setStartDateInput] = useState(startDate);
  const [endDateInput, setEndDateInput] = useState(endDate);

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (pillar) params.set("pillar", pillar);
    if (category && category !== "All") params.set("category", category);
    if (location) params.set("location", location);
    if (search) params.set("search", search);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    params.set("page", String(page));
    params.set("limit", "12");
    return params.toString();
  };

  const { data, isLoading } = useQuery({
    queryKey: [
      "listings",
      pillar,
      category,
      location,
      search,
      minPrice,
      maxPrice,
      startDate,
      endDate,
      page,
    ],
    queryFn: () =>
      api.get<ListingsResponse>(
        `/listings?${buildQuery()}`,
        undefined,
        BOOKING_URL,
      ),
  });

  const listings = data?.listings ?? [];
  const pagination = data?.pagination;

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.set("page", "1");
    setSearchParams(next);
  };

  const applyFilters = () => {
    const next = new URLSearchParams();
    if (pillar) next.set("pillar", pillar);
    if (category && category !== "All") next.set("category", category);
    if (locationInput) next.set("location", locationInput);
    if (searchInput) next.set("search", searchInput);
    if (minPriceInput) next.set("minPrice", minPriceInput);
    if (maxPriceInput) next.set("maxPrice", maxPriceInput);
    if (startDateInput) next.set("startDate", startDateInput);
    if (endDateInput) next.set("endDate", endDateInput);
    next.set("page", "1");
    setSearchParams(next);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setSearchParams({});
    setSearchInput("");
    setLocationInput("");
    setMinPriceInput("");
    setMaxPriceInput("");
    setStartDateInput("");
    setEndDateInput("");
  };

  const hasFilters =
    pillar ||
    (category && category !== "All") ||
    location ||
    search ||
    minPrice ||
    maxPrice ||
    startDate ||
    endDate;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Header */}
      <section className="dark-section relative overflow-hidden pt-28 pb-12">
        <div className="grain-overlay" />
        <div className="relative z-10 container mx-auto px-4">
          <p className="section-label">Explore</p>
          <GoldLine className="w-10 mb-4" />
          <h1 className="text-display text-4xl md:text-5xl text-white mb-4">
            Browse Listings
          </h1>
          <p className="section-body-dark max-w-xl">
            Find verified rentals and services across Zambia.
          </p>

          {/* Search bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="mt-8 flex gap-3 max-w-2xl flex-wrap"
          >
            <div className="flex-1 relative min-w-48">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
              />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search listings..."
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm outline-none transition-colors focus:border-gold/60"
              />
            </div>
            <div className="flex-1 relative min-w-36">
              <MapPin
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
              />
              <input
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="Location..."
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm outline-none transition-colors focus:border-gold/60"
              />
            </div>
            <Button type="submit" variant="gold" size="md">
              Search
            </Button>
          </form>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar filters — desktop */}
          <aside className="hidden lg:flex flex-col gap-6 w-56 shrink-0">
            <div>
              <p className="text-micro text-foreground/60 mb-3">Category</p>
              <div className="flex flex-col gap-1">
                {pillars.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setFilter("pillar", p.value)}
                    className={cn(
                      "text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors",
                      pillar === p.value
                        ? "bg-gold/15 text-gold"
                        : "text-foreground/50 hover:text-foreground hover:bg-foreground/5",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <GoldLine className="opacity-20" />

            <div>
              <p className="text-micro text-foreground/60 mb-3">Type</p>
              <div className="flex flex-col gap-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() =>
                      setFilter("category", cat === "All" ? "" : cat)
                    }
                    className={cn(
                      "text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors capitalize",
                      (cat === "All" && !category) || category === cat
                        ? "bg-gold/15 text-gold"
                        : "text-foreground/50 hover:text-foreground hover:bg-foreground/5",
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <GoldLine className="opacity-20" />

            <div>
              <p className="text-micro text-foreground/60 mb-3">
                Price Range (ZMW/day)
              </p>
              <div className="flex flex-col gap-2">
                <input
                  type="number"
                  value={minPriceInput}
                  onChange={(e) => setMinPriceInput(e.target.value)}
                  placeholder="Min"
                  className="w-full h-9 px-3 rounded-xl bg-background border border-border text-foreground placeholder:text-foreground/30 text-sm outline-none focus:border-gold/60"
                />
                <input
                  type="number"
                  value={maxPriceInput}
                  onChange={(e) => setMaxPriceInput(e.target.value)}
                  placeholder="Max"
                  className="w-full h-9 px-3 rounded-xl bg-background border border-border text-foreground placeholder:text-foreground/30 text-sm outline-none focus:border-gold/60"
                />
              </div>
            </div>

            <GoldLine className="opacity-20" />

            <div>
              <p className="text-micro text-foreground/60 mb-3">Availability</p>
              <div className="flex flex-col gap-2">
                <div>
                  <p className="text-xs text-foreground/40 mb-1">From</p>
                  <input
                    type="date"
                    value={startDateInput}
                    onChange={(e) => setStartDateInput(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full h-9 px-3 rounded-xl bg-background border border-border text-foreground text-sm outline-none focus:border-gold/60"
                  />
                </div>
                <div>
                  <p className="text-xs text-foreground/40 mb-1">To</p>
                  <input
                    type="date"
                    value={endDateInput}
                    onChange={(e) => setEndDateInput(e.target.value)}
                    min={
                      startDateInput || new Date().toISOString().split("T")[0]
                    }
                    className="w-full h-9 px-3 rounded-xl bg-background border border-border text-foreground text-sm outline-none focus:border-gold/60"
                  />
                </div>
              </div>
            </div>

            <Button
              variant="gold"
              size="sm"
              className="w-full"
              onClick={applyFilters}
            >
              Apply Filters
            </Button>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 text-xs text-destructive hover:text-destructive/80 transition-colors"
              >
                <X size={12} /> Clear all filters
              </button>
            )}
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-6 gap-4">
              <p className="text-foreground/50 text-sm">
                {isLoading
                  ? "Loading..."
                  : `${pagination?.total ?? 0} listing${pagination?.total !== 1 ? "s" : ""} found`}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground transition-colors"
                >
                  <SlidersHorizontal size={15} />
                  Filters
                  {hasFilters && (
                    <span className="w-2 h-2 rounded-full bg-gold" />
                  )}
                </button>
                <div className="hidden md:flex gap-2">
                  {pillars.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setFilter("pillar", p.value)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                        pillar === p.value
                          ? "bg-gold text-lenda-dark"
                          : "bg-background border border-border text-foreground/50 hover:border-gold/40",
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile filters panel */}
            {showFilters && (
              <div className="lg:hidden glass-card p-5 border border-border mb-6 flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  {pillars.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setFilter("pillar", p.value)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                        pillar === p.value
                          ? "bg-gold text-lenda-dark"
                          : "bg-background border border-border text-foreground/50",
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() =>
                        setFilter("category", cat === "All" ? "" : cat)
                      }
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize",
                        (cat === "All" && !category) || category === cat
                          ? "bg-gold text-lenda-dark"
                          : "bg-background border border-border text-foreground/50",
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    value={minPriceInput}
                    onChange={(e) => setMinPriceInput(e.target.value)}
                    placeholder="Min price"
                    className="h-9 px-3 rounded-xl bg-background border border-border text-foreground placeholder:text-foreground/30 text-sm outline-none focus:border-gold/60"
                  />
                  <input
                    type="number"
                    value={maxPriceInput}
                    onChange={(e) => setMaxPriceInput(e.target.value)}
                    placeholder="Max price"
                    className="h-9 px-3 rounded-xl bg-background border border-border text-foreground placeholder:text-foreground/30 text-sm outline-none focus:border-gold/60"
                  />
                  <input
                    type="date"
                    value={startDateInput}
                    onChange={(e) => setStartDateInput(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="h-9 px-3 rounded-xl bg-background border border-border text-foreground text-sm outline-none focus:border-gold/60"
                  />
                  <input
                    type="date"
                    value={endDateInput}
                    onChange={(e) => setEndDateInput(e.target.value)}
                    min={
                      startDateInput || new Date().toISOString().split("T")[0]
                    }
                    className="h-9 px-3 rounded-xl bg-background border border-border text-foreground text-sm outline-none focus:border-gold/60"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="gold"
                    size="sm"
                    className="flex-1"
                    onClick={applyFilters}
                  >
                    Apply
                  </Button>
                  {hasFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Listings grid */}
            {isLoading ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="glass-card border border-border h-72 animate-pulse"
                  />
                ))}
              </div>
            ) : listings.length === 0 ? (
              <div className="glass-card p-16 border border-border flex flex-col items-center gap-4">
                <Search size={32} className="text-foreground/20" />
                <p className="text-foreground/40 text-sm">No listings found</p>
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-gold text-sm hover:text-gold/80 transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {listings.map((listing) => {
                  const primaryImage =
                    listing.images?.find((i) => i.isPrimary)?.url ??
                    listing.images?.[0]?.url;
                  const hostInitial = listing.host?.fullName?.[0] ?? "H";

                  return (
                    <Link
                      key={listing.id}
                      to={`/listings/${listing.id}`}
                      className="group"
                    >
                      <div className="glass-card border border-border hover:border-gold/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg overflow-hidden">
                        <div className="relative h-48 bg-foreground/5 overflow-hidden">
                          {primaryImage ? (
                            <img
                              src={primaryImage}
                              alt={listing.title}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <MapPin
                                size={32}
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
                          <button className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-gold transition-colors">
                            <Heart size={14} />
                          </button>
                        </div>

                        <div className="p-4">
                          <h3 className="font-display font-bold text-sm text-foreground uppercase tracking-tight leading-tight truncate mb-1">
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
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center text-gold text-xs font-bold overflow-hidden">
                                {listing.host?.photoUrl ? (
                                  <img
                                    src={listing.host.photoUrl}
                                    alt="Host"
                                    loading="lazy"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  hostInitial
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <Star
                                  size={10}
                                  className="text-gold fill-gold"
                                />
                                <span className="text-foreground/40 text-xs">
                                  {listing.discoveryScore.toFixed(1)}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
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

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <button
                  onClick={() => setFilter("page", String(page - 1))}
                  disabled={page === 1}
                  className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-foreground/50 hover:text-foreground hover:border-gold/40 transition-colors disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: pagination.pages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setFilter("page", String(i + 1))}
                    className={cn(
                      "w-9 h-9 rounded-xl text-sm font-medium transition-colors",
                      page === i + 1
                        ? "bg-gold text-lenda-dark"
                        : "border border-border text-foreground/50 hover:border-gold/40",
                    )}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  onClick={() => setFilter("page", String(page + 1))}
                  disabled={page === pagination.pages}
                  className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-foreground/50 hover:text-foreground hover:border-gold/40 transition-colors disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
