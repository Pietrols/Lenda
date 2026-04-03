import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useWatch } from "react-hook-form";
import { useAuth } from "@/hooks/useAuth";
import { api, AUTH_URL } from "@/api/client";
import { GoldLine } from "@/components/ui/GoldLine";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import {
  Wallet,
  Users,
  ArrowDownCircle,
  ArrowUpCircle,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AdminUser = {
  id: string;
  email: string;
  fullName: string | null;
  roles: string[];
  isActive: boolean;
};

type AdminUsersResponse = {
  users: AdminUser[];
  total: number;
};

type FloatAccount = {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  provider?: string;
  number?: string;
  pendingTopups?: number;
  pendingWithdrawals?: number;
  bookingCount?: number;
};

type FloatResponse = {
  account: FloatAccount;
};

const topupSchema = z.object({
  userId: z.string().min(1, "Select a user"),
  amount: z.coerce.number().positive("Amount must be positive"),
  reference: z.string().min(1, "Reference is required"),
});

const withdrawalSchema = z.object({
  floatId: z.string().min(1, "Float account ID is required"),
  reference: z.string().min(1, "Reference is required"),
});

type TopupForm = z.infer<typeof topupSchema>;
type WithdrawalForm = z.infer<typeof withdrawalSchema>;

function UserFloatCard({
  user,
  onTopup,
}: {
  user: AdminUser;
  onTopup: (userId: string) => void;
}) {
  const { accessToken } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["float", user.id],
    queryFn: () =>
      api.get<FloatResponse>(`/float/${user.id}`, accessToken, AUTH_URL),
    enabled: !!accessToken,
    retry: false,
  });

  const account = data?.account;

  return (
    <div className="glass-card p-4 border border-border flex flex-col sm:flex-row sm:items-center gap-4">
      {/* User info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold font-bold text-sm shrink-0">
          {user.fullName?.[0] ?? user.email[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {user.fullName ?? user.email}
          </p>
          <p className="text-xs text-foreground/50 font-body truncate">
            {user.email}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {user.roles.map((role) => (
              <span
                key={role}
                className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border border-gold/20 text-gold/70 font-body"
              >
                {role}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Balance */}
      <div className="text-right shrink-0">
        {isLoading ? (
          <div className="h-6 w-24 bg-foreground/10 rounded animate-pulse" />
        ) : account ? (
          <>
            <p className="text-lg font-bold text-gold font-display">
              {account.currency ?? "ZMW"}{" "}
              {Number(account.balance ?? 0).toLocaleString()}
            </p>
            {account.provider && (
              <p className="text-xs text-foreground/40 font-body">
                {account.provider}
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-foreground/30 font-body">
            No float account
          </p>
        )}
      </div>

      {/* Action */}
      <button
        onClick={() => onTopup(user.id)}
        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gold/30 text-gold hover:bg-gold/10 transition-colors shrink-0"
      >
        <ArrowUpCircle size={13} /> Top Up
      </button>
    </div>
  );
}

export default function AdminFloat() {
  const { accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "accounts" | "topup" | "withdrawal"
  >("accounts");
  const [search, setSearch] = useState("");

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-float-users"],
    queryFn: () =>
      api.get<AdminUsersResponse>(
        "/admin/users?limit=200",
        accessToken,
        AUTH_URL,
      ),
    enabled: !!accessToken,
  });

  const topupForm = useForm<TopupForm>({
    resolver: zodResolver(topupSchema),
    defaultValues: { userId: "", amount: 0, reference: "" },
  });

  const withdrawalForm = useForm<WithdrawalForm>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: { floatId: "", reference: "" },
  });

  const selectedUserId = useWatch({
    control: topupForm.control,
    name: "userId",
  });

  const topupMutation = useMutation({
    mutationFn: ({ userId, amount, reference }: TopupForm) =>
      api.patch(
        `/float/admin/${userId}/topup`,
        { amount, reference },
        accessToken,
        AUTH_URL,
      ),
    onSuccess: () => {
      toast.success("Float account credited successfully.");
      topupForm.reset();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Top-up failed.");
    },
  });

  const withdrawalMutation = useMutation({
    mutationFn: ({ floatId, reference }: WithdrawalForm) =>
      api.patch(
        `/float/admin/${floatId}/approve-withdrawal`,
        { reference },
        accessToken,
        AUTH_URL,
      ),
    onSuccess: () => {
      toast.success("Withdrawal approved.");
      withdrawalForm.reset();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Approval failed.");
    },
  });

  function handleTopupShortcut(userId: string) {
    topupForm.setValue("userId", userId);
    setActiveTab("topup");
  }

  const allUsers = usersData?.users ?? [];
  const hostUsers = allUsers.filter((u) => u.roles.includes("HOST"));

  const filteredHosts = hostUsers.filter(
    (u) =>
      search === "" ||
      u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const tabs = [
    { id: "accounts" as const, label: "Float Accounts", icon: Wallet },
    { id: "topup" as const, label: "Top Up", icon: ArrowUpCircle },
    {
      id: "withdrawal" as const,
      label: "Approve Withdrawal",
      icon: ArrowDownCircle,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <GoldLine className="w-10 mb-3" />
        <h2 className="font-display font-bold text-xl text-foreground uppercase tracking-tight">
          Float Account Management
        </h2>
        <p className="text-foreground/50 text-sm mt-1 font-body">
          Manage host float balances, credit top-ups, and approve withdrawals.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border transition-all",
                activeTab === tab.id
                  ? "bg-gold/15 border-gold/30 text-gold"
                  : "border-border text-foreground/50 hover:text-foreground hover:border-gold/20",
              )}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content — Float Accounts */}
      {activeTab === "accounts" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs text-foreground/40 font-body">
              Showing float accounts for {filteredHosts.length} host
              {filteredHosts.length !== 1 ? "s" : ""}
            </p>
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30"
              />
              <input
                type="text"
                placeholder="Search hosts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-xl text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-gold/50"
              />
            </div>
          </div>

          {usersLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="glass-card p-4 border border-border h-20 animate-pulse"
                />
              ))}
            </div>
          ) : filteredHosts.length === 0 ? (
            <div className="glass-card p-10 border border-border text-center">
              <Users size={36} className="text-foreground/20 mx-auto mb-3" />
              <p className="text-foreground/40 text-sm font-body">
                No host accounts found.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredHosts.map((user) => (
                <UserFloatCard
                  key={user.id}
                  user={user}
                  onTopup={handleTopupShortcut}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab content — Top Up */}
      {activeTab === "topup" && (
        <div className="glass-card p-6 border border-border max-w-lg">
          <h3 className="font-display font-bold text-base uppercase tracking-tight text-foreground mb-1">
            Credit Float Account
          </h3>
          <p className="text-foreground/50 text-xs font-body mb-5">
            Select a host and enter the amount to credit to their float account.
          </p>
          <form
            onSubmit={topupForm.handleSubmit((v) => topupMutation.mutate(v))}
            className="flex flex-col gap-4"
          >
            <div>
              <label className="block text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-1.5 font-body">
                Host Account
              </label>
              <select
                {...topupForm.register("userId")}
                className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-gold/50"
              >
                <option value="">Select a host...</option>
                {hostUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName ?? u.email}
                  </option>
                ))}
              </select>
              {topupForm.formState.errors.userId && (
                <p className="text-xs text-destructive mt-1 font-body">
                  {topupForm.formState.errors.userId.message}
                </p>
              )}
              {selectedUserId && (
                <p className="text-xs text-foreground/40 font-mono mt-1">
                  ID: {selectedUserId}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-1.5 font-body">
                Amount (ZMW)
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                {...topupForm.register("amount")}
                placeholder="0.00"
                className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-gold/50"
              />
              {topupForm.formState.errors.amount && (
                <p className="text-xs text-destructive mt-1 font-body">
                  {topupForm.formState.errors.amount.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-1.5 font-body">
                Reference
              </label>
              <input
                type="text"
                {...topupForm.register("reference")}
                placeholder="e.g. TXN-20240101-001"
                className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-gold/50"
              />
              {topupForm.formState.errors.reference && (
                <p className="text-xs text-destructive mt-1 font-body">
                  {topupForm.formState.errors.reference.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="gold"
              size="md"
              disabled={topupMutation.isPending}
              className="w-full"
            >
              {topupMutation.isPending ? "Processing..." : "Credit Account"}
            </Button>
          </form>
        </div>
      )}

      {/* Tab content — Approve Withdrawal */}
      {activeTab === "withdrawal" && (
        <div className="glass-card p-6 border border-border max-w-lg">
          <h3 className="font-display font-bold text-base uppercase tracking-tight text-foreground mb-1">
            Approve Withdrawal Request
          </h3>
          <p className="text-foreground/50 text-xs font-body mb-5">
            Enter the float account ID and withdrawal reference to approve a
            pending withdrawal.
          </p>
          <form
            onSubmit={withdrawalForm.handleSubmit((v) =>
              withdrawalMutation.mutate(v),
            )}
            className="flex flex-col gap-4"
          >
            <div>
              <label className="block text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-1.5 font-body">
                Float Account ID
              </label>
              <input
                type="text"
                {...withdrawalForm.register("floatId")}
                placeholder="Float account ID or user ID"
                className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-gold/50 font-mono"
              />
              {withdrawalForm.formState.errors.floatId && (
                <p className="text-xs text-destructive mt-1 font-body">
                  {withdrawalForm.formState.errors.floatId.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-1.5 font-body">
                Withdrawal Reference
              </label>
              <input
                type="text"
                {...withdrawalForm.register("reference")}
                placeholder="e.g. WDR-20240101-001"
                className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-gold/50"
              />
              {withdrawalForm.formState.errors.reference && (
                <p className="text-xs text-destructive mt-1 font-body">
                  {withdrawalForm.formState.errors.reference.message}
                </p>
              )}
            </div>

            <div className="glass-card p-3 border border-gold/20 bg-gold/5">
              <p className="text-xs text-gold/70 font-body">
                Approving a withdrawal will release funds from the host's float
                account to their mobile money account. Ensure the reference
                matches a valid pending request.
              </p>
            </div>

            <Button
              type="submit"
              variant="gold"
              size="md"
              disabled={withdrawalMutation.isPending}
              className="w-full"
            >
              {withdrawalMutation.isPending
                ? "Approving..."
                : "Approve Withdrawal"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
