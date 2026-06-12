import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Bell, BellOff, Check, CheckCheck, ArrowRight } from "lucide-react";
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
  referenceId: string | null;
  createdAt: string;
};

type NotificationsResponse = {
  notifications: Notification[];
};

const typeColors: Record<string, string> = {
  BOOKING_CREATED: "text-gold bg-gold/10",
  BOOKING_CONFIRMED: "text-green-400 bg-green-400/10",
  BOOKING_CANCELLED: "text-red-400 bg-red-400/10",
  BOOKING_EN_ROUTE: "text-blue-400 bg-blue-400/10",
  BOOKING_ACTIVE: "text-green-400 bg-green-400/10",
  BOOKING_RETURN_PENDING: "text-yellow-500 bg-yellow-500/10",
  BOOKING_COMPLETED: "text-gold bg-gold/10",
  HANDOVER_CONFIRMED: "text-blue-400 bg-blue-400/10",
  KYC_APPROVED: "text-green-400 bg-green-400/10",
  KYC_REJECTED: "text-red-400 bg-red-400/10",
  TIER_UPGRADED: "text-gold bg-gold/10",
  SUBSCRIPTION_EXPIRED: "text-red-400 bg-red-400/10",
  FIRST_BOOKING: "text-gold bg-gold/10",
  TIP: "text-foreground/60 bg-foreground/5",
  NEGOTIATION_COUNTER: "text-gold bg-gold/10",
  NEGOTIATION_FAILED: "text-red-400 bg-red-400/10",
};

const typeLabels: Record<string, string> = {
  BOOKING_CREATED: "New Booking Request",
  BOOKING_CONFIRMED: "Booking Confirmed",
  BOOKING_CANCELLED: "Booking Cancelled",
  BOOKING_EN_ROUTE: "En Route",
  BOOKING_ACTIVE: "Booking Active",
  BOOKING_RETURN_PENDING: "Return Pending",
  BOOKING_COMPLETED: "Booking Completed",
  HANDOVER_CONFIRMED: "Handover Confirmed",
  KYC_APPROVED: "KYC Approved",
  KYC_REJECTED: "KYC Rejected",
  TIER_UPGRADED: "Tier Upgraded",
  SUBSCRIPTION_EXPIRED: "Subscription Expired",
  FIRST_BOOKING: "Milestone",
  TIP: "Tip",
  NEGOTIATION_COUNTER: "Counter Offer",
  NEGOTIATION_FAILED: "Negotiation Failed",
};

const BOOKING_TYPES = new Set([
  "BOOKING_CREATED",
  "BOOKING_CONFIRMED",
  "BOOKING_CANCELLED",
  "BOOKING_EN_ROUTE",
  "BOOKING_ACTIVE",
  "BOOKING_RETURN_PENDING",
  "BOOKING_COMPLETED",
  "HANDOVER_CONFIRMED",
  "FIRST_BOOKING",
  "NEGOTIATION_COUNTER",
  "NEGOTIATION_FAILED",
]);

export default function DashboardNotifications() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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
    },
    onError: (err: Error) => toast.error(err.message),
  });

  useEffect(() => {
    if (accessToken) markRead([]);
    // markRead is stable from useMutation, safe to omit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const notifications = data?.notifications ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  function handleNotificationClick(notification: Notification) {
    if (notification.referenceId && BOOKING_TYPES.has(notification.type)) {
      navigate(`/dashboard/bookings/${notification.referenceId}`);
    }
  }

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
            const isClickable =
              !!notification.referenceId &&
              BOOKING_TYPES.has(notification.type);

            return (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  "glass-card p-4 border transition-all duration-200",
                  notification.isRead
                    ? "border-border opacity-60"
                    : "border-gold/20 bg-gold/[0.02]",
                  isClickable &&
                    "cursor-pointer hover:border-gold/40 hover:opacity-100",
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
                    {isClickable && (
                      <p className="text-gold text-xs mt-1.5 flex items-center gap-1">
                        View booking <ArrowRight size={11} />
                      </p>
                    )}
                  </div>
                  {!notification.isRead && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markRead([notification.id]);
                      }}
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
