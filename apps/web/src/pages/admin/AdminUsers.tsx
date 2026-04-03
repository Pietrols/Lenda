import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { api, AUTH_URL } from "@/api/client";
import { GoldLine } from "@/components/ui/GoldLine";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import {
  Search,
  CheckCircle,
  XCircle,
  ShieldOff,
  ShieldCheck,
  Award,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AdminUser = {
  id: string;
  email: string;
  fullName: string | null;
  roles: string[];
  kycStatus: string;
  isActive: boolean;
  createdAt: string;
  badges?: string[];
};

type AdminUsersResponse = {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
};

type ConfirmState = {
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "destructive" | "gold";
  onConfirm: () => void;
};

const kycStatusConfig: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: "Pending",
    className: "text-gold border-gold/30 bg-gold/10",
  },
  APPROVED: {
    label: "Approved",
    className: "text-green-400 border-green-400/30 bg-green-400/10",
  },
  REJECTED: {
    label: "Rejected",
    className: "text-destructive border-destructive/30 bg-destructive/10",
  },
  NOT_SUBMITTED: {
    label: "Not Submitted",
    className: "text-foreground/40 border-border bg-border/20",
  },
};

const badgeSchema = z.object({
  badge: z.string().min(1, "Badge name is required"),
});

type BadgeForm = z.infer<typeof badgeSchema>;

const PAGE_SIZE = 20;

export default function AdminUsers() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [kycFilter, setKycFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [badgeUserId, setBadgeUserId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", page],
    queryFn: () =>
      api.get<AdminUsersResponse>(
        `/admin/users?page=${page}&limit=${PAGE_SIZE}`,
        accessToken,
        AUTH_URL,
      ),
    enabled: !!accessToken,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<BadgeForm>({
    resolver: zodResolver(badgeSchema),
  });

  const kycMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      api.patch(`/admin/users/${id}/kyc`, { status, reason }, accessToken, AUTH_URL),
    onSuccess: () => {
      toast.success("KYC status updated.");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to update KYC status.");
    },
  });

  const badgeMutation = useMutation({
    mutationFn: ({ id, badge }: { id: string; badge: string }) =>
      api.post(`/admin/users/${id}/badge`, { badge }, accessToken, AUTH_URL),
    onSuccess: () => {
      toast.success("Badge awarded successfully.");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setBadgeUserId(null);
      reset();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to award badge.");
    },
  });

  const suspendMutation = useMutation({
    mutationFn: ({ id, suspend }: { id: string; suspend: boolean }) =>
      api.patch(`/admin/users/${id}/suspend`, { suspend }, accessToken, AUTH_URL),
    onSuccess: (_, { suspend }) => {
      toast.success(suspend ? "User suspended." : "User unsuspended.");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Action failed.");
    },
  });

  const allUsers = data?.users ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const filtered = allUsers.filter((u) => {
    const matchesSearch =
      search === "" ||
      u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole =
      roleFilter === "ALL" || u.roles.includes(roleFilter);
    const matchesKyc =
      kycFilter === "ALL" || u.kycStatus === kycFilter;
    return matchesSearch && matchesRole && matchesKyc;
  });

  function handleApproveKyc(user: AdminUser) {
    setConfirmState({
      title: "Approve KYC",
      message: `Approve KYC verification for ${user.fullName ?? user.email}?`,
      confirmLabel: "Approve",
      variant: "gold",
      onConfirm: () => kycMutation.mutate({ id: user.id, status: "APPROVED" }),
    });
  }

  function handleRejectKyc(user: AdminUser) {
    setConfirmState({
      title: "Reject KYC",
      message: `Reject KYC verification for ${user.fullName ?? user.email}? This action will notify the user.`,
      confirmLabel: "Reject",
      variant: "destructive",
      onConfirm: () => kycMutation.mutate({ id: user.id, status: "REJECTED" }),
    });
  }

  function handleSuspend(user: AdminUser) {
    if (user.isActive) {
      setConfirmState({
        title: "Suspend User",
        message: `Suspend ${user.fullName ?? user.email}? They will no longer be able to access their account.`,
        confirmLabel: "Suspend",
        variant: "destructive",
        onConfirm: () => suspendMutation.mutate({ id: user.id, suspend: true }),
      });
    } else {
      suspendMutation.mutate({ id: user.id, suspend: false });
    }
  }

  function onBadgeSubmit(values: BadgeForm) {
    if (!badgeUserId) return;
    badgeMutation.mutate({ id: badgeUserId, badge: values.badge });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <GoldLine className="w-10 mb-3" />
        <h2 className="font-display font-bold text-xl text-foreground uppercase tracking-tight">
          User Management
        </h2>
        <p className="text-foreground/50 text-sm mt-1 font-body">
          Manage user accounts, KYC verification, and badges.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-xl text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-gold/50"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 text-sm bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-gold/50"
        >
          <option value="ALL">All Roles</option>
          <option value="GUEST">Guest</option>
          <option value="HOST">Host</option>
          <option value="ADMIN">Admin</option>
        </select>
        <select
          value={kycFilter}
          onChange={(e) => { setKycFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 text-sm bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-gold/50"
        >
          <option value="ALL">All KYC Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="NOT_SUBMITTED">Not Submitted</option>
        </select>
      </div>

      {/* Table / List */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card p-4 border border-border h-20 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-10 border border-border text-center">
          <Users size={36} className="text-foreground/20 mx-auto mb-3" />
          <p className="text-foreground/40 text-sm font-body">No users match your filters.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((user) => {
            const kycCfg = kycStatusConfig[user.kycStatus] ?? kycStatusConfig.NOT_SUBMITTED;
            return (
              <div
                key={user.id}
                className="glass-card p-4 border border-border flex flex-col lg:flex-row lg:items-center gap-4"
              >
                {/* User info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold font-bold text-sm shrink-0">
                    {user.fullName?.[0] ?? user.email[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {user.fullName ?? "—"}
                    </p>
                    <p className="text-xs text-foreground/50 font-body truncate">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {user.roles.map((role) => (
                        <span
                          key={role}
                          className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border border-gold/20 text-gold/70 font-body"
                        >
                          {role}
                        </span>
                      ))}
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full border",
                          kycCfg.className,
                        )}
                      >
                        {kycCfg.label}
                      </span>
                      {!user.isActive && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full border text-destructive border-destructive/30 bg-destructive/10">
                          Suspended
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Meta */}
                <div className="text-xs text-foreground/40 font-body shrink-0">
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  {user.kycStatus === "PENDING" && (
                    <>
                      <button
                        onClick={() => handleApproveKyc(user)}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-green-400/30 text-green-400 hover:bg-green-400/10 transition-colors"
                      >
                        <CheckCircle size={13} /> Approve KYC
                      </button>
                      <button
                        onClick={() => handleRejectKyc(user)}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <XCircle size={13} /> Reject KYC
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => { setBadgeUserId(user.id); reset(); }}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gold/30 text-gold hover:bg-gold/10 transition-colors"
                  >
                    <Award size={13} /> Badge
                  </button>
                  <button
                    onClick={() => handleSuspend(user)}
                    className={cn(
                      "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors",
                      user.isActive
                        ? "border-destructive/30 text-destructive hover:bg-destructive/10"
                        : "border-green-400/30 text-green-400 hover:bg-green-400/10",
                    )}
                  >
                    {user.isActive ? (
                      <><ShieldOff size={13} /> Suspend</>
                    ) : (
                      <><ShieldCheck size={13} /> Unsuspend</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-foreground/40 font-body">
            Page {page} of {totalPages} &mdash; {total} users total
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-border text-foreground/50 hover:text-foreground hover:border-gold/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-border text-foreground/50 hover:text-foreground hover:border-gold/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>
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
            <p className="text-foreground/60 text-sm font-body mb-6">{confirmState.message}</p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmState(null)}
              >
                Cancel
              </Button>
              <Button
                variant={confirmState.variant === "destructive" ? "destructive" : "gold"}
                size="sm"
                onClick={() => {
                  confirmState.onConfirm();
                  setConfirmState(null);
                }}
              >
                {confirmState.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Badge dialog */}
      {badgeUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 border border-border max-w-sm w-full mx-4">
            <h3 className="font-display font-bold text-lg text-foreground uppercase tracking-tight mb-2">
              Award Badge
            </h3>
            <GoldLine className="w-8 mb-4" />
            <form onSubmit={handleSubmit(onBadgeSubmit)} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-1.5 font-body">
                  Badge Name
                </label>
                <input
                  {...register("badge")}
                  placeholder="e.g. Top Host, Verified Pro"
                  className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-gold/50"
                />
                {errors.badge && (
                  <p className="text-xs text-destructive mt-1 font-body">{errors.badge.message}</p>
                )}
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setBadgeUserId(null); reset(); }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="gold"
                  size="sm"
                  disabled={badgeMutation.isPending}
                >
                  {badgeMutation.isPending ? "Awarding..." : "Award Badge"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
