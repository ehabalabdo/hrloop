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
import { MONTH_NAMES } from "@/lib/payroll-types";

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
      "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
    REJECTED:
      "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
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
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === f
                ? "bg-violet-600 text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            No {filter.toLowerCase()} disputes
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d: DisputeItem) => (
            <div
              key={d.id}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            >
              {/* Header */}
              <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {d.userName}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      statusColors[d.status] ?? statusColors.PENDING
                    }`}
                  >
                    {d.status}
                  </span>
                </div>
                <span className="text-xs text-zinc-400">
                  {MONTH_NAMES[d.payslipMonth - 1]} {d.payslipYear}
                </span>
              </div>

              {/* Content */}
              <div className="px-5 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-xs text-zinc-500">
                      Disputed: <span className="font-medium uppercase">{d.disputeType}</span>
                    </span>
                  </div>
                  <span className="text-sm font-bold text-red-600 dark:text-red-400">
                    {d.originalAmount.toFixed(2)} SAR
                  </span>
                </div>

                <div>
                  <p className="text-xs font-medium text-zinc-500 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    Employee Reason
                  </p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-0.5">
                    {d.reason}
                  </p>
                </div>

                <div className="text-xs text-zinc-400">
                  Submitted: {new Date(d.createdAt).toLocaleString()}
                </div>

                {d.status !== "PENDING" && (
                  <div className="text-xs text-zinc-400 border-t border-zinc-100 dark:border-zinc-800 pt-2 mt-2">
                    Reviewed by {d.reviewerName} on{" "}
                    {d.reviewedAt
                      ? new Date(d.reviewedAt).toLocaleString()
                      : "N/A"}
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
                <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                  <input
                    type="text"
                    placeholder="Admin comment (optional)..."
                    value={comment[d.id] ?? ""}
                    onChange={(e) =>
                      setComment((prev) => ({
                        ...prev,
                        [d.id]: e.target.value,
                      }))
                    }
                    className="w-full text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleResolve(d.id, "APPROVED")}
                      disabled={isPending && processing === d.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                    >
                      {isPending && processing === d.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      Approve (+{d.originalAmount.toFixed(2)} SAR)
                    </button>
                    <button
                      onClick={() => handleResolve(d.id, "REJECTED")}
                      disabled={isPending && processing === d.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                    >
                      {isPending && processing === d.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      Reject
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
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
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
