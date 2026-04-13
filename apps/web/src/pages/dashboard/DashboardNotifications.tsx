import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, BellOff, Check, CheckCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { api, BOOKING_URL } from "@/api/client";
import { GoldLine } from "@/components/ui/GoldLine";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

type Notification = {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

type NotificationsResponse = {
  notifications: Notification[];
};

const typeColors: Record<string, string> = {
  BOOKING_CONFIRMED: "text-green-400 bg-green-400/10",
  BOOKING_CANCELLED: "text-red-400 bg-red-400/10",
  HANDED_OVER: "text-blue-400 bg-blue-400/10",
  RETURN_PENDING: "text-yellow-500 bg-yellow-500/10",
  COMPLETED: "text-gold bg-gold/10",
  KYC_APPROVED: "text-green-400 bg-green-400/10",
  KYC_REJECTED: "text-red-400 bg-red-400/10",
  TIER_UPGRADED: "text-gold bg-gold/10",
  SUBSCRIPTION_EXPIRED: "text-red-400 bg-red-400/10",
};

const typeLabels: Record<string, string> = {
  BOOKING_CONFIRMED: "Booking Confirmed",
  BOOKING_CANCELLED: "Booking Cancelled",
  HANDED_OVER: "Handed Over",
  RETURN_PENDING: "Return Pending",
  COMPLETED: "Completed",
  KYC_APPROVED: "KYC Approved",
  KYC_REJECTED: "KYC Rejected",
  TIER_UPGRADED: "Tier Upgraded",
  SUBSCRIPTION_EXPIRED: "Subscription Expired",
};

export default function DashboardNotifications() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () =>
      api.get<NotificationsResponse>(
        "/notifications",
        accessToken,
        BOOKING_URL,
      ),
    enabled: !!accessToken,
  });

  // Fix the mutation:
  const { mutate: markRead, isPending: isMarking } = useMutation({
    mutationFn: (ids?: string[]) =>
      api.patch<{ message: string }>(
        "/notifications/read",
        { ids },
        accessToken,
        BOOKING_URL,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["notifications", "unread-count"],
      });
      toast.success("Notifications marked as read.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Add after mutation definition - auto-mark all read on page open:
  useEffect(() => {
    if (accessToken) markRead([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const notifications = data?.notifications ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 max-w-2xl">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="glass-card p-4 border border-border h-20 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="section-label">Inbox</p>
          <GoldLine className="w-10 mb-3" />
          <h2 className="font-display font-bold text-2xl text-foreground uppercase tracking-tight">
            Notifications
          </h2>
          <p className="text-foreground/50 text-sm mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "You are all caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outlineGold"
            size="sm"
            className="gap-2 shrink-0"
            onClick={() => markRead([])}
            disabled={isMarking}
          >
            <CheckCheck size={14} />
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="glass-card p-12 border border-border flex flex-col items-center gap-3">
          <BellOff size={32} className="text-foreground/20" />
          <p className="text-foreground/40 text-sm">No notifications yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((notification) => {
            const color =
              typeColors[notification.type] ??
              "text-foreground/60 bg-foreground/5";
            const label = typeLabels[notification.type] ?? notification.type;

            return (
              <div
                key={notification.id}
                className={cn(
                  "glass-card p-4 border transition-all duration-200",
                  notification.isRead
                    ? "border-border opacity-60"
                    : "border-gold/20 bg-gold/[0.02]",
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                      color,
                    )}
                  >
                    <Bell size={14} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "text-xs font-semibold uppercase tracking-wide",
                          color.split(" ")[0],
                        )}
                      >
                        {label}
                      </span>
                      <span className="text-foreground/30 text-xs shrink-0">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-foreground/70 text-sm mt-1 leading-relaxed">
                      {notification.message}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <button
                      onClick={() => markRead([notification.id])}
                      className="text-foreground/30 hover:text-gold transition-colors shrink-0"
                      title="Mark as read"
                    >
                      <Check size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
