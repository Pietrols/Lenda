import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { api, AUTH_URL } from "@/api/client";
import { GoldLine } from "@/components/ui/GoldLine";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { CheckCircle, Crown, Zap } from "lucide-react";

type SubscriptionStatus = {
  subscriptionPlan: string;
  subscriptionStatus: string | null;
  subscriptionEndsAt: string | null;
  commissionRate: number;
  listingTier: number;
  effectiveListingLimit: number;
};

const plans = [
  {
    id: "FREE",
    label: "Free",
    price: "0",
    period: "forever",
    commission: "15%",
    slots: "Tier based",
    boost: false,
    features: [
      "Up to tier limit listings",
      "15% commission per booking",
      "Standard discovery ranking",
      "Basic profile",
    ],
  },
  {
    id: "PRO_MONTHLY",
    label: "Pro Monthly",
    price: "99",
    period: "per month",
    commission: "10%",
    slots: "+3 extra slots",
    boost: true,
    features: [
      "+3 listing slots above tier limit",
      "10% commission per booking",
      "Boosted discovery ranking",
      "Pro badge on profile",
    ],
  },
  {
    id: "PRO_ANNUAL",
    label: "Pro Annual",
    price: "899",
    period: "per year",
    commission: "10%",
    slots: "+3 extra slots",
    boost: true,
    features: [
      "+3 listing slots above tier limit",
      "10% commission per booking",
      "Boosted discovery ranking",
      "Pro badge on profile",
      "2 months free vs monthly",
    ],
  },
];

export default function DashboardSubscription() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: () =>
      api.get<{ subscription: SubscriptionStatus }>(
        "/subscriptions/status",
        accessToken,
        AUTH_URL,
      ),
    enabled: !!accessToken,
  });

  const { mutate: upgrade, isPending: isUpgrading } = useMutation({
    mutationFn: (plan: string) =>
      api.post<{ subscription: SubscriptionStatus }>(
        "/subscriptions/upgrade",
        { plan },
        accessToken,
        AUTH_URL,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      toast.success("Subscription upgraded successfully.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { mutate: cancel, isPending: isCancelling } = useMutation({
    mutationFn: () =>
      api.post<{ subscription: SubscriptionStatus }>(
        "/subscriptions/cancel",
        {},
        accessToken,
        AUTH_URL,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      toast.success(
        "Subscription cancelled. You retain Pro benefits until the end of your billing period.",
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const current = subscription?.subscription;
  const currentPlan = current?.subscriptionPlan ?? "FREE";
  const isGracePeriod = current?.subscriptionStatus === "GRACE_PERIOD";

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="glass-card p-6 border border-border h-40 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Header */}
      <div>
        <p className="section-label">Billing</p>
        <GoldLine className="w-10 mb-3" />
        <h2 className="font-display font-bold text-2xl text-foreground uppercase tracking-tight">
          Subscription
        </h2>
        <p className="text-foreground/50 text-sm mt-1">
          Manage your Lenda subscription and listing slots.
        </p>
      </div>

      {/* Current status card */}
      <div className="glass-card p-6 border border-gold/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="section-label">Current Plan</p>
            <div className="flex items-center gap-2 mt-1">
              <Crown size={18} className="text-gold" />
              <h3 className="font-display font-bold text-xl text-foreground uppercase tracking-tight">
                {currentPlan === "FREE"
                  ? "Free"
                  : currentPlan === "PRO_MONTHLY"
                    ? "Pro Monthly"
                    : "Pro Annual"}
              </h3>
            </div>
            {isGracePeriod && current?.subscriptionEndsAt && (
              <p className="text-gold text-xs mt-2">
                Grace period — Pro benefits active until{" "}
                {new Date(current.subscriptionEndsAt).toLocaleDateString()}
              </p>
            )}
            {currentPlan !== "FREE" &&
              !isGracePeriod &&
              current?.subscriptionEndsAt && (
                <p className="text-foreground/40 text-xs mt-2">
                  Renews{" "}
                  {new Date(current.subscriptionEndsAt).toLocaleDateString()}
                </p>
              )}
          </div>
          <div className="text-right">
            <p className="text-foreground/50 text-xs">Commission rate</p>
            <p className="font-display font-bold text-2xl text-foreground">
              {((current?.commissionRate ?? 0.15) * 100).toFixed(0)}%
            </p>
            <p className="text-foreground/50 text-xs mt-1">
              {current?.effectiveListingLimit === Infinity
                ? "Unlimited"
                : current?.effectiveListingLimit}{" "}
              listing slots
            </p>
          </div>
        </div>

        {currentPlan !== "FREE" && !isGracePeriod && (
          <div className="mt-4 pt-4 border-t border-border">
            <button
              onClick={() => cancel()}
              disabled={isCancelling}
              className="text-sm text-destructive hover:text-destructive/80 transition-colors"
            >
              {isCancelling ? "Cancelling..." : "Cancel subscription"}
            </button>
          </div>
        )}
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const isPro = plan.id !== "FREE";

          return (
            <div
              key={plan.id}
              className={cn(
                "glass-card p-6 border flex flex-col gap-4 transition-all duration-200",
                isCurrent
                  ? "border-gold/40 bg-gold/[0.02]"
                  : "border-border hover:border-gold/20",
              )}
            >
              {/* Plan header */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="section-label">{plan.label}</p>
                  {isPro && <Zap size={14} className="text-gold" />}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-display font-black text-3xl text-foreground">
                    K{plan.price}
                  </span>
                  <span className="text-foreground/40 text-sm">
                    {plan.period}
                  </span>
                </div>
                <GoldLine className="w-8 mt-3" />
              </div>

              {/* Features */}
              <ul className="flex flex-col gap-2 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <CheckCircle
                      size={13}
                      className="text-gold mt-0.5 shrink-0"
                    />
                    <span className="text-foreground/60 text-xs leading-relaxed">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrent ? (
                <Button
                  variant="outlineGold"
                  size="sm"
                  className="w-full"
                  disabled
                >
                  Current Plan
                </Button>
              ) : plan.id === "FREE" ? (
                <Button
                  variant="outlineGold"
                  size="sm"
                  className="w-full opacity-40"
                  disabled
                >
                  Downgrade
                </Button>
              ) : (
                <Button
                  variant="gold"
                  size="sm"
                  className="w-full"
                  disabled={isUpgrading || currentPlan !== "FREE"}
                  onClick={() => upgrade(plan.id)}
                >
                  {isUpgrading ? "Upgrading..." : "Upgrade"}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Note */}
      <p className="text-foreground/30 text-xs">
        Prices shown in Zambian Kwacha (ZMW). Stripe payment integration coming
        soon — subscriptions can currently be activated by contacting support.
      </p>
    </div>
  );
}
