import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { api, AUTH_URL } from "@/api/client";
import { GoldLine } from "@/components/ui/GoldLine";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  AlertCircle,
  CheckCircle,
  Clock,
  Info,
  Phone,
} from "lucide-react";

type FloatTransaction = {
  id: string;
  type: string;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  status: string;
  note: string | null;
  reference: string | null;
  createdAt: string;
};

type FloatWithdrawal = {
  id: string;
  amount: string;
  fee: string;
  netAmount: string;
  provider: string;
  mobileNumber: string;
  status: string;
  createdAt: string;
};

type FloatAccount = {
  id: string;
  balance: string;
  totalEarned: string;
  totalDeducted: string;
  totalWithdrawn: string;
  bookingCount: number;
  mobileMoneyProvider: string;
  mobileMoneyNumber: string;
  isActive: boolean;
  transactions: FloatTransaction[];
  withdrawals: FloatWithdrawal[];
};

const setupSchema = z.object({
  mobileMoneyProvider: z.enum(["AIRTEL", "MTN", "ZAMTEL"]),
  mobileMoneyNumber: z
    .string()
    .min(10, "Enter a valid mobile number")
    .max(15, "Enter a valid mobile number"),
});

const withdrawSchema = z.object({
  amount: z.coerce
    .number()
    .min(100, "Minimum withdrawal is K100")
    .max(10000, "Maximum withdrawal is K10,000"),
});

type SetupForm = z.infer<typeof setupSchema>;
type WithdrawForm = z.infer<typeof withdrawSchema>;

const txTypeConfig: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  TOP_UP: {
    label: "Top Up",
    color: "text-gold",
    icon: <ArrowDownLeft size={14} />,
  },
  COMMISSION_DEDUCTION: {
    label: "Commission",
    color: "text-destructive",
    icon: <ArrowUpRight size={14} />,
  },
  WITHDRAWAL: {
    label: "Withdrawal",
    color: "text-destructive",
    icon: <ArrowUpRight size={14} />,
  },
  WITHDRAWAL_FEE: {
    label: "Withdrawal Fee",
    color: "text-destructive",
    icon: <ArrowUpRight size={14} />,
  },
  ADJUSTMENT: {
    label: "Adjustment",
    color: "text-foreground/60",
    icon: <Info size={14} />,
  },
};

const withdrawalStatusConfig: Record<
  string,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pending",
    className: "text-gold bg-gold/10 border-gold/30",
  },
  APPROVED: {
    label: "Approved",
    className: "text-gold bg-gold/10 border-gold/30",
  },
  PROCESSED: {
    label: "Processed",
    className: "text-foreground/40 bg-foreground/5 border-border",
  },
  REJECTED: {
    label: "Rejected",
    className: "text-destructive bg-destructive/10 border-destructive/30",
  },
};

export default function DashboardFloat() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [showWithdraw, setShowWithdraw] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["float"],
    queryFn: () =>
      api.get<{ float: FloatAccount }>("/float/me", accessToken, AUTH_URL),
    enabled: !!accessToken,
    retry: false,
  });

  const setupForm = useForm<SetupForm>({
    resolver: zodResolver(setupSchema),
    defaultValues: { mobileMoneyProvider: "AIRTEL" },
  });

  const withdrawForm = useForm<WithdrawForm>({
    resolver: zodResolver(withdrawSchema),
  });

  const { mutate: setupFloat, isPending: isSettingUp } = useMutation({
    mutationFn: (data: SetupForm) =>
      api.post<{ float: FloatAccount }>(
        "/float/setup",
        data,
        accessToken,
        AUTH_URL,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["float"] });
      toast.success("Float account created successfully.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { mutate: requestWithdrawal, isPending: isWithdrawing } = useMutation({
    mutationFn: (data: WithdrawForm) =>
      api.post<{ withdrawal: FloatWithdrawal }>(
        "/float/withdraw",
        data,
        accessToken,
        AUTH_URL,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["float"] });
      toast.success(
        "Withdrawal request submitted. Processing within 24 hours.",
      );
      setShowWithdraw(false);
      withdrawForm.reset();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const float = data?.float;
  const balance = float ? parseFloat(float.balance) : 0;
  const isLowBalance = balance < 50;
  const freeBookingsRemaining = float ? Math.max(0, 2 - float.bookingCount) : 2;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="glass-card p-6 border border-border h-32 animate-pulse"
          />
        ))}
      </div>
    );
  }

  // No float account yet — show setup form
  if (!float) {
    return (
      <div className="flex flex-col gap-6 max-w-lg">
        <div>
          <p className="section-label">Earnings</p>
          <GoldLine className="w-10 mb-3" />
          <h2 className="font-display font-bold text-2xl text-foreground uppercase tracking-tight">
            Float Account
          </h2>
          <p className="text-foreground/50 text-sm mt-1">
            Set up your float account to start receiving earnings from bookings.
          </p>
        </div>

        <div className="glass-card p-6 border border-border">
          <div className="flex items-start gap-3 mb-5 p-4 rounded-xl bg-gold/5 border border-gold/20">
            <Info size={16} className="text-gold mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">
                How the float works
              </p>
              <p className="text-foreground/50 text-xs leading-relaxed">
                Your first 2 bookings are commission-free. From booking 3
                onwards, Lenda deducts commission (15% free plan, 10% Pro) from
                your float balance automatically when a booking completes.
              </p>
            </div>
          </div>

          <form
            onSubmit={setupForm.handleSubmit((d) => setupFloat(d))}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-micro text-foreground/60">
                Mobile Money Provider
              </label>
              <select
                {...setupForm.register("mobileMoneyProvider")}
                className="w-full h-11 px-4 rounded-xl bg-background border border-border text-foreground text-sm outline-none transition-colors focus:border-gold/60"
              >
                <option value="AIRTEL">Airtel Money</option>
                <option value="MTN">MTN Mobile Money</option>
                <option value="ZAMTEL">Zamtel Kwacha</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-micro text-foreground/60">
                Mobile Money Number
              </label>
              <input
                {...setupForm.register("mobileMoneyNumber")}
                type="tel"
                placeholder="097 000 0000"
                className={cn(
                  "w-full h-11 px-4 rounded-xl bg-background border text-foreground placeholder:text-foreground/30 text-sm outline-none transition-colors focus:border-gold/60",
                  setupForm.formState.errors.mobileMoneyNumber
                    ? "border-destructive/60"
                    : "border-border",
                )}
              />
              {setupForm.formState.errors.mobileMoneyNumber && (
                <p className="text-destructive text-xs">
                  {setupForm.formState.errors.mobileMoneyNumber.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="gold"
              size="md"
              className="gap-2"
              disabled={isSettingUp}
            >
              <Wallet size={16} />
              {isSettingUp ? "Setting up..." : "Create Float Account"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Header */}
      <div>
        <p className="section-label">Earnings</p>
        <GoldLine className="w-10 mb-3" />
        <h2 className="font-display font-bold text-2xl text-foreground uppercase tracking-tight">
          Float Account
        </h2>
        <p className="text-foreground/50 text-sm mt-1">
          Manage your Lenda earnings and withdrawals.
        </p>
      </div>

      {/* Low balance warning */}
      {isLowBalance && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/20">
          <AlertCircle size={16} className="text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-destructive mb-0.5">
              {balance <= 0 ? "Float balance empty" : "Low float balance"}
            </p>
            <p className="text-foreground/50 text-xs">
              {balance <= 0
                ? "Top up your float to continue receiving new bookings."
                : `Your balance is K${balance.toFixed(2)}. Top up to avoid disruptions.`}
            </p>
          </div>
        </div>
      )}

      {/* Balance cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Balance",
            value: `K${balance.toFixed(2)}`,
            highlight: true,
          },
          {
            label: "Total Earned",
            value: `K${parseFloat(float.totalEarned).toFixed(2)}`,
            highlight: false,
          },
          {
            label: "Commission Paid",
            value: `K${parseFloat(float.totalDeducted).toFixed(2)}`,
            highlight: false,
          },
          {
            label: "Withdrawn",
            value: `K${parseFloat(float.totalWithdrawn).toFixed(2)}`,
            highlight: false,
          },
        ].map((card) => (
          <div
            key={card.label}
            className={cn(
              "glass-card p-4 border flex flex-col gap-1",
              card.highlight
                ? "border-gold/30 bg-gold/[0.02]"
                : "border-border",
            )}
          >
            <p className="text-micro text-foreground/50">{card.label}</p>
            <p
              className={cn(
                "font-display font-bold text-xl",
                card.highlight ? "text-gold" : "text-foreground",
              )}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Free bookings indicator */}
      {freeBookingsRemaining > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-gold/5 border border-gold/20">
          <CheckCircle size={16} className="text-gold mt-0.5 shrink-0" />
          <p className="text-foreground/60 text-sm">
            You have{" "}
            <span className="text-gold font-semibold">
              {freeBookingsRemaining} free booking
              {freeBookingsRemaining !== 1 ? "s" : ""}
            </span>{" "}
            remaining — no commission deducted on your first 2 completed
            bookings.
          </p>
        </div>
      )}

      {/* Top-up instructions */}
      <div className="glass-card p-6 border border-border">
        <div className="flex items-center gap-3 mb-4">
          <Plus size={16} className="text-gold" />
          <h3 className="font-display font-bold text-sm text-foreground uppercase tracking-tight">
            Top Up Your Float
          </h3>
        </div>
        <GoldLine className="w-8 mb-4" />
        <p className="text-foreground/50 text-sm mb-4">
          Send money to Lenda's mobile money number below, then contact support
          with your transaction reference and we will credit your float within 1
          hour.
        </p>
        <div className="grid md:grid-cols-3 gap-3">
          {[
            { provider: "Airtel Money", number: "0977 000 001" },
            { provider: "MTN MoMo", number: "0966 000 001" },
            { provider: "Zamtel Kwacha", number: "0955 000 001" },
          ].map((item) => (
            <div
              key={item.provider}
              className="p-3 rounded-xl bg-foreground/5 border border-border"
            >
              <p className="text-micro text-foreground/50 mb-1">
                {item.provider}
              </p>
              <div className="flex items-center gap-2">
                <Phone size={12} className="text-gold" />
                <p className="font-semibold text-sm text-foreground">
                  {item.number}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-foreground/30 text-xs mt-4">
          Minimum top-up: K50. After sending, email support@lenda.app with your
          reference number.
        </p>
      </div>

      {/* Withdrawal */}
      <div className="glass-card p-6 border border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ArrowUpRight size={16} className="text-gold" />
            <h3 className="font-display font-bold text-sm text-foreground uppercase tracking-tight">
              Withdraw Funds
            </h3>
          </div>
          {!showWithdraw && (
            <Button
              variant="outlineGold"
              size="sm"
              onClick={() => setShowWithdraw(true)}
              disabled={balance < 100}
            >
              Request Withdrawal
            </Button>
          )}
        </div>
        <GoldLine className="w-8 mb-4" />

        <div className="flex items-center gap-3 mb-4">
          <Phone size={14} className="text-foreground/30" />
          <div>
            <p className="text-xs text-foreground/40">Registered number</p>
            <p className="text-sm text-foreground font-medium">
              {float.mobileMoneyProvider} — {float.mobileMoneyNumber}
            </p>
          </div>
        </div>

        {balance < 100 && (
          <p className="text-foreground/40 text-xs mb-4">
            Minimum withdrawal is K100. Your current balance is K
            {balance.toFixed(2)}.
          </p>
        )}

        {showWithdraw && (
          <form
            onSubmit={withdrawForm.handleSubmit((d) => requestWithdrawal(d))}
            className="flex flex-col gap-4 pt-4 border-t border-border"
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-micro text-foreground/60">
                Withdrawal Amount (ZMW)
              </label>
              <input
                {...withdrawForm.register("amount")}
                type="number"
                placeholder="100"
                min={100}
                max={Math.floor(balance)}
                className={cn(
                  "w-full h-11 px-4 rounded-xl bg-background border text-foreground placeholder:text-foreground/30 text-sm outline-none transition-colors focus:border-gold/60",
                  withdrawForm.formState.errors.amount
                    ? "border-destructive/60"
                    : "border-border",
                )}
              />
              {withdrawForm.formState.errors.amount && (
                <p className="text-destructive text-xs">
                  {withdrawForm.formState.errors.amount.message}
                </p>
              )}
              <p className="text-foreground/30 text-xs">
                2.5% withdrawal fee applies. Available: K{balance.toFixed(2)}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                variant="gold"
                size="sm"
                className="gap-2"
                disabled={isWithdrawing}
              >
                {isWithdrawing ? "Submitting..." : "Submit Request"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowWithdraw(false);
                  withdrawForm.reset();
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Transaction history */}
      {float.transactions.length > 0 && (
        <div>
          <h3 className="font-display font-bold text-sm text-foreground uppercase tracking-tight mb-4">
            Transaction History
          </h3>
          <div className="flex flex-col gap-2">
            {float.transactions.map((tx) => {
              const config = txTypeConfig[tx.type] ?? {
                label: tx.type,
                color: "text-foreground/50",
                icon: <Info size={14} />,
              };
              const isCredit = tx.type === "TOP_UP" || tx.type === "ADJUSTMENT";

              return (
                <div
                  key={tx.id}
                  className="glass-card p-4 border border-border flex items-center gap-4"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      isCredit ? "bg-gold/10" : "bg-destructive/10",
                    )}
                  >
                    <span className={config.color}>{config.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {config.label}
                    </p>
                    {tx.note && (
                      <p className="text-foreground/40 text-xs truncate">
                        {tx.note}
                      </p>
                    )}
                    <p className="text-foreground/30 text-xs">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={cn(
                        "font-display font-bold text-sm",
                        isCredit ? "text-gold" : "text-destructive",
                      )}
                    >
                      {isCredit ? "+" : "-"}K{parseFloat(tx.amount).toFixed(2)}
                    </p>
                    <p className="text-foreground/30 text-xs">
                      K{parseFloat(tx.balanceAfter).toFixed(2)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Withdrawal history */}
      {float.withdrawals.length > 0 && (
        <div>
          <h3 className="font-display font-bold text-sm text-foreground uppercase tracking-tight mb-4">
            Withdrawal History
          </h3>
          <div className="flex flex-col gap-2">
            {float.withdrawals.map((w) => {
              const status = withdrawalStatusConfig[w.status] ?? {
                label: w.status,
                className: "text-foreground/50 bg-foreground/5 border-border",
              };

              return (
                <div
                  key={w.id}
                  className="glass-card p-4 border border-border flex items-center gap-4"
                >
                  <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center shrink-0">
                    {w.status === "PROCESSED" ? (
                      <CheckCircle size={14} className="text-foreground/40" />
                    ) : (
                      <Clock size={14} className="text-gold" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {w.provider} — {w.mobileNumber}
                    </p>
                    <p className="text-foreground/30 text-xs">
                      Fee: K{parseFloat(w.fee).toFixed(2)} · Net: K
                      {parseFloat(w.netAmount).toFixed(2)}
                    </p>
                    <p className="text-foreground/30 text-xs">
                      {new Date(w.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-bold text-sm text-foreground">
                      K{parseFloat(w.amount).toFixed(2)}
                    </p>
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full border",
                        status.className,
                      )}
                    >
                      {status.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
