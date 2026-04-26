import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { api, BOOKING_URL } from "@/api/client";
import { GoldLine } from "@/components/ui/GoldLine";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  Plus,
  ListChecks,
  MapPin,
  Pencil,
  Trash2,
  Eye,
  Star,
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
  images: { url: string; isPrimary: boolean }[];
  createdAt: string;
};

type StatusConfig = {
  label: string;
  className: string;
};

const statusConfig: Record<string, StatusConfig> = {
  DRAFT: {
    label: "Draft",
    className: "text-foreground/50 bg-foreground/5 border-border",
  },
  PENDING_VERIFICATION: {
    label: "Pending Review",
    className: "text-gold bg-gold/10 border-gold/30",
  },
  ACTIVE: {
    label: "Active",
    className: "text-gold bg-gold/10 border-gold/30",
  },
  SUSPENDED: {
    label: "Suspended",
    className: "text-destructive bg-destructive/10 border-destructive/30",
  },
  ARCHIVED: {
    label: "Archived",
    className: "text-foreground/30 bg-foreground/5 border-border",
  },
};

export default function DashboardListings() {
  const { accessToken, user } = useAuth();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
  queryKey: ["my-listings"],
  queryFn: () =>
    api.get<{ listings: Listing[] }>("/listings/mine", accessToken, BOOKING_URL),
  enabled: !!accessToken,
});

  const { mutate: deleteListing, isPending: isDeleting } = useMutation({
    mutationFn: (listingId: string) =>
      api.delete<{ message: string }>(
        `/listings/${listingId}`,
        accessToken,
        BOOKING_URL,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      toast.success("Listing deleted.");
      setConfirmDelete(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Filter to only show the current host's listings
  const myListings = data?.listings ?? [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="section-label">Manage</p>
          <GoldLine className="w-10 mb-3" />
          <h2 className="font-display font-bold text-2xl text-foreground uppercase tracking-tight">
            My Listings
          </h2>
          <p className="text-foreground/50 text-sm mt-1">
            {myListings.length} active listing
            {myListings.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link to="/dashboard/listings/create">
          <Button variant="gold" size="sm" className="gap-2 shrink-0">
            <Plus size={15} />
            New Listing
          </Button>
        </Link>
      </div>

      {/* Listings */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="glass-card p-4 border border-border h-28 animate-pulse"
            />
          ))}
        </div>
      ) : myListings.length === 0 ? (
        <div className="glass-card p-12 border border-border flex flex-col items-center justify-center gap-4">
          <ListChecks size={32} className="text-foreground/20" />
          <p className="text-foreground/40 text-sm">No listings yet</p>
          <Link to="/dashboard/listings/create">
            <Button variant="gold" size="sm" className="gap-2">
              <Plus size={14} />
              Create your first listing
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {myListings.map((listing) => {
            const status = statusConfig[listing.status] ?? {
              label: listing.status,
              className: "text-foreground/50 bg-foreground/5 border-border",
            };
            const primaryImage =
              listing.images.find((i) => i.isPrimary)?.url ??
              listing.images[0]?.url;

            return (
              <div
                key={listing.id}
                className="glass-card border border-border hover:border-gold/30 transition-all duration-200"
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Image */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-foreground/5 shrink-0">
                    {primaryImage ? (
                      <img
                        src={primaryImage}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ListChecks size={20} className="text-foreground/20" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 overflow-hidden">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {listing.title}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin size={11} className="text-foreground/30" />
                      <p className="text-foreground/40 text-xs truncate">
                        {listing.location}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-foreground/40 text-xs">
                        {listing.currency} {listing.pricePerDay}/day
                      </p>
                      <div className="flex items-center gap-1">
                        <Star size={10} className="text-gold" />
                        <p className="text-foreground/40 text-xs">
                          {listing.discoveryScore.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full border",
                        status.className,
                      )}
                    >
                      {status.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/listings/${listing.id}`}
                        className="p-1.5 rounded-lg text-foreground/30 hover:text-foreground hover:bg-foreground/5 transition-colors"
                        title="View"
                      >
                        <Eye size={14} />
                      </Link>
                      <Link
                        to={`/dashboard/listings/${listing.id}/edit`}
                        className="p-1.5 rounded-lg text-foreground/30 hover:text-gold hover:bg-gold/5 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </Link>
                      {confirmDelete === listing.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => deleteListing(listing.id)}
                            disabled={isDeleting}
                            className="text-xs text-destructive font-medium px-2 py-1 rounded-lg bg-destructive/10 hover:bg-destructive/20 transition-colors"
                          >
                            {isDeleting ? "..." : "Confirm"}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="text-xs text-foreground/40 px-2 py-1 rounded-lg hover:bg-foreground/5 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(listing.id)}
                          className="p-1.5 rounded-lg text-foreground/30 hover:text-destructive hover:bg-destructive/5 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Subscription upsell if on free plan */}
      {user?.roles.includes("HOST") && (
        <div className="dark-section rounded-2xl p-6 relative overflow-hidden">
          <div className="grain-overlay" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <p className="section-label">Pro Plan</p>
              <h3 className="font-display font-bold text-lg text-white uppercase tracking-tight mt-1">
                Get More Listing Slots
              </h3>
              <p className="text-white/50 text-sm mt-1">
                Upgrade to Pro for 3 extra listing slots and boosted visibility.
              </p>
            </div>
            <Link to="/dashboard/subscription">
              <Button variant="gold" size="sm" className="shrink-0">
                View Plans
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
