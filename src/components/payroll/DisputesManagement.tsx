"use client";

// ============================================================
// Disputes Management Panel
// Owners review & resolve penalty disputes from employees
// ============================================================

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  DollarSign,
  MessageSquare,
  Filter,
} from "lucide-react";
import {
  getDisputes,
  resolveDispute,
} from "@/app/(app)/attendance/resilience-actions";
import { MONTH_NAMES_AR } from "@/lib/payroll-types";

interface DisputeItem {
  id: string;
  userId: string;
  userName: string;
  payslipId: string;
  payslipMonth: number;
  payslipYear: number;
  shiftId: string | null;
  disputeType: string;
  originalAmount: number;
  reason: string;
  status: string;
  adminComment: string | null;
  reviewerName: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

interface DisputesManagementProps {
  disputes: DisputeItem[];
  reviewerId: string;
  reviewerName: string;
}

export default function DisputesManagement({
  disputes: initialDisputes,
  reviewerId,
  reviewerName,
}: DisputesManagementProps) {
  const [disputes, setDisputes] = useState<DisputeItem[]>(initialDisputes);
  const [filter, setFilter] = useState<string>("PENDING");
  const [processing, setProcessing] = useState<string | null>(null);
  const [comment, setComment] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleResolve = (disputeId: string, action: "APPROVED" | "REJECTED") => {
    setProcessing(disputeId);
    startTransition(async () => {
      const result = await resolveDispute({
        disputeId,
        reviewerId,
        reviewerName,
        action,
        adminComment: comment[disputeId] || undefined,
      });

      if (result.success) {
        const updated = await getDisputes({ status: filter === "ALL" ? undefined : filter });
        setDisputes(updated);
        showToast(result.message, "success");
      } else {
        showToast(result.message, "error");
      }
      setProcessing(null);
    });
  };

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    startTransition(async () => {
      const updated = await getDisputes({
        status: newFilter === "ALL" ? undefined : newFilter,
      });
      setDisputes(updated);
    });
  };

  const filtered = disputes;

  const statusColors: Record<string, string> = {
    PENDING:
      "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    APPROVED:
      "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400",
    REJECTED:
      "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  };

  const filterLabels: Record<string, string> = {
    PENDING: "معلقة",
    APPROVED: "مقبولة",
    REJECTED: "مرفوضة",
    ALL: "الكل",
  };

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-zinc-400" />
        {["PENDING", "APPROVED", "REJECTED", "ALL"].map((f: string) => (
          <button
            key={f}
            onClick={() => handleFilterChange(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all active:scale-95 ${
              filter === f
                ? "bg-brand-purple text-white shadow-sm"
                : "bg-surface-hover text-muted hover:bg-surface-hover"
            }`}
          >
            {filterLabels[f] ?? f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-surface/60 rounded-3xl border border-border-main p-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-muted">
            لا توجد اعتراضات {filter !== "ALL" ? filterLabels[filter] : ""}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d: DisputeItem) => (
            <div
              key={d.id}
              className="bg-surface/60 rounded-3xl border border-border-main overflow-hidden shadow-sm"
            >
              {/* Header */}
              <div className="px-5 py-3 border-b border-border-main flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold text-foreground">
                    {d.userName}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                      statusColors[d.status] ?? statusColors.PENDING
                    }`}
                  >
                    {d.status}
                  </span>
                </div>
                <span className="text-xs text-zinc-400">
                  {MONTH_NAMES_AR[d.payslipMonth - 1]} {d.payslipYear}
                </span>
              </div>

              {/* Content */}
              <div className="px-5 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-xs text-zinc-500">
                      المعترض عليه: <span className="font-medium uppercase">{d.disputeType}</span>
                    </span>
                  </div>
                  <span className="text-sm font-bold text-red-600 dark:text-red-400">
                    {d.originalAmount.toFixed(2)} SAR
                  </span>
                </div>

                <div>
                  <p className="text-xs font-medium text-zinc-500 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    سبب الاعتراض
                  </p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-0.5">
                    {d.reason}
                  </p>
                </div>

                <div className="text-xs text-zinc-400">
                  مقدم: {new Date(d.createdAt).toLocaleString("ar-SA")}
                </div>

                {d.status !== "PENDING" && (
                  <div className="text-xs text-zinc-400 border-t border-border-main pt-2 mt-2">
                    راجعه {d.reviewerName} في{" "}
                    {d.reviewedAt
                      ? new Date(d.reviewedAt).toLocaleString("ar-SA")
                      : "—"}
                    {d.adminComment && (
                      <p className="mt-1 text-zinc-500 italic">
                        &quot;{d.adminComment}&quot;
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Actions (only for pending) */}
              {d.status === "PENDING" && (
                <div className="px-5 py-3 border-t border-border-main space-y-3">
                  <input
                    type="text"
                    placeholder="تعليق الإدارة (اختياري)..."
                    value={comment[d.id] ?? ""}
                    onChange={(e) =>
                      setComment((prev) => ({
                        ...prev,
                        [d.id]: e.target.value,
                      }))
                    }
                    className="w-full text-sm border border-border-main rounded-2xl px-3 py-2 bg-surface-hover text-foreground placeholder:text-zinc-400 focus:ring-2 focus:ring-brand-purple focus:border-transparent outline-none"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleResolve(d.id, "APPROVED")}
                      disabled={isPending && processing === d.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 disabled:opacity-50 transition-all active:scale-95"
                    >
                      {isPending && processing === d.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      قبول (+{d.originalAmount.toFixed(2)} SAR)
                    </button>
                    <button
                      onClick={() => handleResolve(d.id, "REJECTED")}
                      disabled={isPending && processing === d.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-2xl hover:bg-red-100 disabled:opacity-50 transition-all active:scale-95"
                    >
                      {isPending && processing === d.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      رفض
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-24 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
