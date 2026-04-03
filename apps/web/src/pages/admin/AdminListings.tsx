import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { api, BOOKING_URL } from "@/api/client";
import { GoldLine } from "@/components/ui/GoldLine";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import {
  CheckCircle,
  ShieldOff,
  ExternalLink,
  ListChecks,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AdminListing = {
  id: string;
  title: string;
  description?: string;
  pillar?: string;
  category?: string;
  status?: string;
  isVerified: boolean;
  isSuspended: boolean;
  createdAt: string;
  host?: {
    id: string;
    fullName: string | null;
    email: string;
  };
};

type AdminListingsResponse = {
  listings: AdminListing[];
  total?: number;
};

type ConfirmState = {
  title: string;
  message: string;
  confirmLabel: string;
  variant: "destructive" | "gold";
  onConfirm: () => void;
};

const pillarOptions = ["ALL", "GOODS", "SERVICES", "SPACES", "EXPERIENCES"];

const listingStatusConfig = (listing: AdminListing) => {
  if (listing.status === "SUSPENDED") {
    return {
      label: "Suspended",
      className: "text-destructive border-destructive/30 bg-destructive/10",
    };
  }
  if (listing.status === "ACTIVE") {
    return {
      label: "Active",
      className: "text-green-400 border-green-400/30 bg-green-400/10",
    };
  }
  return {
    label: listing.status ?? "Draft",
    className: "text-gold border-gold/30 bg-gold/10",
  };
};

export default function AdminListings() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [pillarFilter, setPillarFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-listings"],
    queryFn: () =>
      api.get<AdminListingsResponse>(
        "/admin/listings",
        accessToken,
        BOOKING_URL,
      ),
    enabled: !!accessToken,
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/admin/listings/${id}/verify`, {}, accessToken, BOOKING_URL),
    onSuccess: () => {
      toast.success("Listing verified successfully.");
      queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to verify listing.");
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/admin/listings/${id}/suspend`, {}, accessToken, BOOKING_URL),
    onSuccess: () => {
      toast.success("Listing suspended.");
      queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to suspend listing.");
    },
  });

  const allListings = data?.listings ?? [];

  const filtered = allListings.filter((listing) => {
    const matchesSearch =
      search === "" ||
      listing.title.toLowerCase().includes(search.toLowerCase()) ||
      listing.host?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      listing.host?.email.toLowerCase().includes(search.toLowerCase());

    const matchesPillar =
      pillarFilter === "ALL" || listing.pillar === pillarFilter;

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "VERIFIED" &&
        listing.isVerified &&
        !listing.isSuspended) ||
      (statusFilter === "UNVERIFIED" &&
        !listing.isVerified &&
        !listing.isSuspended) ||
      (statusFilter === "SUSPENDED" && listing.isSuspended);

    return matchesSearch && matchesPillar && matchesStatus;
  });

  function handleVerify(listing: AdminListing) {
    setConfirmState({
      title: "Verify Listing",
      message: `Verify "${listing.title}"? It will become publicly visible and bookable.`,
      confirmLabel: "Verify",
      variant: "gold",
      onConfirm: () => verifyMutation.mutate(listing.id),
    });
  }

  function handleSuspend(listing: AdminListing) {
    setConfirmState({
      title: "Suspend Listing",
      message: `Suspend "${listing.title}"? It will be hidden from all users.`,
      confirmLabel: "Suspend",
      variant: "destructive",
      onConfirm: () => suspendMutation.mutate(listing.id),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <GoldLine className="w-10 mb-3" />
        <h2 className="font-display font-bold text-xl text-foreground uppercase tracking-tight">
          Listing Management
        </h2>
        <p className="text-foreground/50 text-sm mt-1 font-body">
          Verify, monitor, and moderate marketplace listings.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30"
          />
          <input
            type="text"
            placeholder="Search listings or hosts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-xl text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-gold/50"
          />
        </div>
        <select
          value={pillarFilter}
          onChange={(e) => setPillarFilter(e.target.value)}
          className="px-4 py-2 text-sm bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-gold/50"
        >
          {pillarOptions.map((p) => (
            <option key={p} value={p}>
              {p === "ALL" ? "All Pillars" : p}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 text-sm bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-gold/50"
        >
          <option value="ALL">All Statuses</option>
          <option value="VERIFIED">Verified</option>
          <option value="UNVERIFIED">Unverified</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      {/* Listing count */}
      {!isLoading && (
        <p className="text-xs text-foreground/40 font-body">
          Showing {filtered.length} of {allListings.length} listings
        </p>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="glass-card p-4 border border-border h-24 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-10 border border-border text-center">
          <ListChecks size={36} className="text-foreground/20 mx-auto mb-3" />
          <p className="text-foreground/40 text-sm font-body">
            No listings match your filters.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((listing) => {
            const statusCfg = listingStatusConfig(listing);
            return (
              <div
                key={listing.id}
                className="glass-card p-4 border border-border flex flex-col lg:flex-row lg:items-center gap-4"
              >
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-foreground">
                      {listing.title}
                    </p>
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full border shrink-0",
                        statusCfg.className,
                      )}
                    >
                      {statusCfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    {listing.pillar && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border border-gold/20 text-gold/70 font-body">
                        {listing.pillar}
                      </span>
                    )}
                    {listing.category && (
                      <span className="text-xs text-foreground/40 font-body">
                        {listing.category}
                      </span>
                    )}
                    <span className="text-xs text-foreground/40 font-body">
                      Host:{" "}
                      {listing.host?.fullName ??
                        listing.host?.email ??
                        "Unknown"}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/30 font-body mt-1">
                    Added {new Date(listing.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <Link to={`/listings/${listing.id}`} target="_blank">
                    <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border text-foreground/50 hover:text-foreground hover:border-gold/30 transition-colors">
                      <ExternalLink size={12} /> View
                    </button>
                  </Link>
                  {!listing.isVerified && !listing.isSuspended && (
                    <button
                      onClick={() => handleVerify(listing)}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-green-400/30 text-green-400 hover:bg-green-400/10 transition-colors"
                    >
                      <CheckCircle size={13} /> Verify
                    </button>
                  )}
                  {!listing.isSuspended && (
                    <button
                      onClick={() => handleSuspend(listing)}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <ShieldOff size={13} /> Suspend
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm dialog */}
      {confirmState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 border border-border max-w-sm w-full mx-4">
            <h3 className="font-display font-bold text-lg text-foreground uppercase tracking-tight mb-2">
              {confirmState.title}
            </h3>
            <GoldLine className="w-8 mb-4" />
            <p className="text-foreground/60 text-sm font-body mb-6">
              {confirmState.message}
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmState(null)}
              >
                Cancel
              </Button>
              <Button
                variant={
                  confirmState.variant === "destructive"
                    ? "destructive"
                    : "gold"
                }
                size="sm"
                onClick={() => {
                  confirmState.onConfirm();
                  setConfirmState(null);
                }}
              >
                {confirmState.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
