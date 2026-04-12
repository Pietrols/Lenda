import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { api, AUTH_URL } from "@/api/client";
import { GoldLine } from "@/components/ui/GoldLine";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import {
  Search,
  ShieldOff,
  ShieldCheck,
  Award,
  ChevronLeft,
  ChevronRight,
  Users,
  ExternalLink,
  FileSearch,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AdminUser = {
  id: string;
  email: string;
  fullName: string | null;
  photoUrl?: string | null;
  bio?: string | null;
  location?: string | null;
  roles: string[];
  kycStatus: string;
  isActive: boolean;
  createdAt: string;
  badges?: string[];
  _count?: { kycDocuments: number };
};

type AdminUsersResponse = {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
};

type KycDocument = {
  id: string;
  type: string;
  url: string;
  uploadedAt: string;
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

const docTypeLabels: Record<string, string> = {
  NRC_FRONT: "NRC Front",
  NRC_BACK: "NRC Back",
  PROOF_OF_RESIDENCE: "Proof of Residence",
  SELFIE: "Recent Photo",
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
  const [kycReviewUser, setKycReviewUser] = useState<AdminUser | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

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

  const { data: kycDocsData } = useQuery({
    queryKey: ["admin-kyc-docs", kycReviewUser?.id],
    queryFn: () =>
      api.get<{ documents: KycDocument[] }>(
        `/admin/users/${kycReviewUser!.id}/kyc-documents`,
        accessToken,
        AUTH_URL,
      ),
    enabled: !!kycReviewUser && !!accessToken,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BadgeForm>({
    resolver: zodResolver(badgeSchema),
  });

  const kycMutation = useMutation({
    mutationFn: ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: string;
      reason?: string;
    }) =>
      api.patch(
        `/admin/users/${id}/kyc`,
        { status, reason },
        accessToken,
        AUTH_URL,
      ),
    onSuccess: (_, { status }) => {
      toast.success(
        `KYC ${status === "APPROVED" ? "approved" : "rejected"}. User has been notified.`,
      );
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setKycReviewUser(null);
      setRejectionReason("");
    },
    onError: (err: Error) =>
      toast.error(err.message ?? "Failed to update KYC status."),
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
    onError: (err: Error) =>
      toast.error(err.message ?? "Failed to award badge."),
  });

  const suspendMutation = useMutation({
    mutationFn: ({ id, suspend }: { id: string; suspend: boolean }) =>
      api.patch(
        `/admin/users/${id}/suspend`,
        { suspend },
        accessToken,
        AUTH_URL,
      ),
    onSuccess: (_, { suspend }) => {
      toast.success(suspend ? "User suspended." : "User unsuspended.");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: Error) => toast.error(err.message ?? "Action failed."),
  });

  const allUsers = data?.users ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const filtered = allUsers.filter((u) => {
    const matchesSearch =
      search === "" ||
      u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.roles.includes(roleFilter);
    const matchesKyc = kycFilter === "ALL" || u.kycStatus === kycFilter;
    return matchesSearch && matchesRole && matchesKyc;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (a.kycStatus === "PENDING" && b.kycStatus !== "PENDING") return -1;
    if (a.kycStatus !== "PENDING" && b.kycStatus === "PENDING") return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const kycDocs = kycDocsData?.documents ?? [];

  function onBadgeSubmit(values: BadgeForm) {
    if (!badgeUserId) return;
    badgeMutation.mutate({ id: badgeUserId, badge: values.badge });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <GoldLine className="w-10 mb-3" />
        <h2 className="font-display font-bold text-xl text-foreground uppercase tracking-tight">
          User Management
        </h2>
        <p className="text-foreground/50 text-sm mt-1">
          Manage user accounts, KYC verification, and badges.
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
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-xl text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-gold/50"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 text-sm bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-gold/50"
        >
          <option value="ALL">All Roles</option>
          <option value="GUEST">Guest</option>
          <option value="HOST">Host</option>
          <option value="ADMIN">Admin</option>
        </select>
        <select
          value={kycFilter}
          onChange={(e) => {
            setKycFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 text-sm bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-gold/50"
        >
          <option value="ALL">All KYC Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="glass-card p-4 border border-border h-20 animate-pulse"
            />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="glass-card p-10 border border-border text-center">
          <Users size={36} className="text-foreground/20 mx-auto mb-3" />
          <p className="text-foreground/40 text-sm">
            No users match your filters.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((user) => {
            const hasSubmittedDocs = (user._count?.kycDocuments ?? 0) > 0;
            const effectiveStatus =
              user.kycStatus === "PENDING" && !hasSubmittedDocs
                ? "NOT_SUBMITTED"
                : user.kycStatus;
            const kycCfg =
              kycStatusConfig[effectiveStatus] ?? kycStatusConfig.NOT_SUBMITTED;

            return (
              <div
                key={user.id}
                className="glass-card p-4 border border-border flex flex-col lg:flex-row lg:items-center gap-4"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold font-bold text-sm shrink-0 overflow-hidden">
                    {user.photoUrl ? (
                      <img
                        src={user.photoUrl}
                        alt="avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (user.fullName?.[0] ?? user.email[0].toUpperCase())
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {user.fullName ?? "—"}
                    </p>
                    <p className="text-xs text-foreground/50 truncate">
                      {user.email}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {user.roles.map((role) => (
                        <span
                          key={role}
                          className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border border-gold/20 text-gold/70"
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

                <div className="text-xs text-foreground/40 shrink-0">
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <Link to={`/admin/users/${user.id}`}>
                    <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border text-foreground/50 hover:text-foreground hover:border-gold/30 transition-colors">
                      <ExternalLink size={12} /> View
                    </button>
                  </Link>
                  {user.kycStatus === "PENDING" && hasSubmittedDocs && (
                    <button
                      onClick={() => setKycReviewUser(user)}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gold/40 text-gold hover:bg-gold/10 transition-colors"
                    >
                      <FileSearch size={13} /> Review KYC
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setBadgeUserId(user.id);
                      reset();
                    }}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gold/30 text-gold hover:bg-gold/10 transition-colors"
                  >
                    <Award size={13} /> Badge
                  </button>
                  <button
                    onClick={() => {
                      if (user.isActive) {
                        setConfirmState({
                          title: "Suspend User",
                          message: `Suspend ${user.fullName ?? user.email}?`,
                          confirmLabel: "Suspend",
                          variant: "destructive",
                          onConfirm: () =>
                            suspendMutation.mutate({
                              id: user.id,
                              suspend: true,
                            }),
                        });
                      } else {
                        suspendMutation.mutate({ id: user.id, suspend: false });
                      }
                    }}
                    className={cn(
                      "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors",
                      user.isActive
                        ? "border-destructive/30 text-destructive hover:bg-destructive/10"
                        : "border-green-400/30 text-green-400 hover:bg-green-400/10",
                    )}
                  >
                    {user.isActive ? (
                      <>
                        <ShieldOff size={13} /> Suspend
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={13} /> Unsuspend
                      </>
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
          <p className="text-xs text-foreground/40">
            Page {page} of {totalPages} — {total} users total
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-border text-foreground/50 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-border text-foreground/50 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* KYC Review Modal */}
      {kycReviewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-card border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-foreground uppercase tracking-tight">
                  KYC Review
                </h3>
                <GoldLine className="w-8 mt-2" />
              </div>
              <button
                onClick={() => {
                  setKycReviewUser(null);
                  setRejectionReason("");
                }}
                className="text-foreground/40 hover:text-foreground transition-colors text-xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5">
              {/* Profile */}
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-xl shrink-0 overflow-hidden">
                  {kycReviewUser.photoUrl ? (
                    <img
                      src={kycReviewUser.photoUrl}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (kycReviewUser.fullName?.[0] ??
                    kycReviewUser.email[0].toUpperCase())
                  )}
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {kycReviewUser.fullName ?? "No name"}
                  </p>
                  <p className="text-sm text-foreground/50">
                    {kycReviewUser.email}
                  </p>
                  <p className="text-xs text-foreground/30 mt-0.5">
                    Joined{" "}
                    {new Date(kycReviewUser.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Application info */}
              {(kycReviewUser.bio || kycReviewUser.location) && (
                <div className="flex flex-col gap-2 p-4 rounded-xl border border-border bg-background">
                  {kycReviewUser.location && (
                    <p className="text-xs text-foreground/60">
                      <span className="font-semibold text-foreground/80">
                        Location:
                      </span>{" "}
                      {kycReviewUser.location}
                    </p>
                  )}
                  {kycReviewUser.bio && (
                    <div>
                      <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-1">
                        Host Application
                      </p>
                      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                        {kycReviewUser.bio}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* KYC Documents */}
              <div>
                <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-3">
                  Submitted Documents
                </p>
                {kycDocs.length === 0 ? (
                  <p className="text-sm text-foreground/40">
                    No documents submitted yet.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {kycDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-border bg-background"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {docTypeLabels[doc.type] ?? doc.type}
                          </p>
                          <p className="text-xs text-foreground/40">
                            Uploaded{" "}
                            {new Date(doc.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gold hover:text-gold/80 font-medium border border-gold/30 px-3 py-1.5 rounded-lg hover:bg-gold/5 transition-colors"
                        >
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Rejection reason */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                  Rejection Reason (required if rejecting)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  placeholder="Explain why the KYC is being rejected..."
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-foreground/30 text-sm outline-none focus:border-gold/60 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="gold"
                  size="md"
                  className="flex-1 gap-2"
                  disabled={kycMutation.isPending}
                  onClick={() =>
                    kycMutation.mutate({
                      id: kycReviewUser.id,
                      status: "APPROVED",
                    })
                  }
                >
                  <CheckCircle size={15} />
                  {kycMutation.isPending ? "Processing..." : "Approve KYC"}
                </Button>
                <Button
                  variant="destructive"
                  size="md"
                  className="flex-1 gap-2"
                  disabled={kycMutation.isPending || !rejectionReason.trim()}
                  onClick={() =>
                    kycMutation.mutate({
                      id: kycReviewUser.id,
                      status: "REJECTED",
                      reason: rejectionReason,
                    })
                  }
                >
                  <XCircle size={15} /> Reject
                </Button>
              </div>
            </div>
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
            <p className="text-foreground/60 text-sm mb-6">
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
            <form
              onSubmit={handleSubmit(onBadgeSubmit)}
              className="flex flex-col gap-4"
            >
              <div>
                <label className="block text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-1.5">
                  Badge Name
                </label>
                <input
                  {...register("badge")}
                  placeholder="e.g. Top Host, Verified Pro"
                  className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-gold/50"
                />
                {errors.badge && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.badge.message}
                  </p>
                )}
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setBadgeUserId(null);
                    reset();
                  }}
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
