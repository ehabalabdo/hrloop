"use client";

// ============================================================
// Leave Management Dashboard
// Request form, approvals inbox, leave list
// ============================================================

import { useState, useTransition } from "react";
import {
  TreePalm,
  Plus,
  Check,
  X,
  Clock,
  Filter,
  Loader2,
  Download,
} from "lucide-react";

import type { LeaveRequestItem } from "@/lib/leave-types";
import {
  LEAVE_TYPE_LABELS,
  LEAVE_STATUS_COLORS,
} from "@/lib/leave-types";

import {
  createLeaveRequest,
  getLeaveRequests,
  reviewLeaveRequest,
  cancelLeaveRequest,
} from "@/app/(app)/leaves/actions";

import { downloadCSV } from "@/lib/csv-export";

interface LeavesDashboardProps {
  initialRequests: LeaveRequestItem[];
  employees: { id: string; name: string; role: string }[];
}

export default function LeavesDashboard({
  initialRequests,
  employees,
}: LeavesDashboardProps) {
  const [requests, setRequests] = useState<LeaveRequestItem[]>(initialRequests);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [formUserId, setFormUserId] = useState(employees[0]?.id ?? "");
  const [formType, setFormType] = useState("ANNUAL");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formReason, setFormReason] = useState("");

  // Review modal
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const refresh = () => {
    startTransition(async () => {
      const data = await getLeaveRequests(
        statusFilter === "ALL" ? undefined : statusFilter
      );
      setRequests(data);
    });
  };

  const handleSubmit = () => {
    if (!formUserId || !formStart || !formEnd) {
      showToast("Please fill all required fields.", "error");
      return;
    }
    startTransition(async () => {
      const result = await createLeaveRequest({
        userId: formUserId,
        type: formType,
        startDate: formStart,
        endDate: formEnd,
        reason: formReason || undefined,
      });
      showToast(result.message, result.success ? "success" : "error");
      if (result.success) {
        setShowForm(false);
        setFormReason("");
        setFormStart("");
        setFormEnd("");
        refresh();
      }
    });
  };

  const handleReview = (action: "APPROVED" | "REJECTED") => {
    if (!reviewingId) return;
    // Use first employee as reviewer (owner)
    const reviewerId = employees[0]?.id ?? "";
    startTransition(async () => {
      const result = await reviewLeaveRequest({
        leaveId: reviewingId,
        reviewerId,
        action,
        note: reviewNote || undefined,
      });
      showToast(result.message, result.success ? "success" : "error");
      setReviewingId(null);
      setReviewNote("");
      if (result.success) refresh();
    });
  };

  const handleCancel = (leaveId: string, userId: string) => {
    startTransition(async () => {
      const result = await cancelLeaveRequest(leaveId, userId);
      showToast(result.message, result.success ? "success" : "error");
      if (result.success) refresh();
    });
  };

  const handleExport = () => {
    downloadCSV(
      filtered.map((r: LeaveRequestItem) => ({
        Employee: r.userName,
        Type: r.type,
        Status: r.status,
        "Start Date": r.startDate,
        "End Date": r.endDate,
        Days: r.days,
        Paid: r.isPaid ? "Yes" : "No",
        Reason: r.reason ?? "",
        Reviewer: r.reviewerName ?? "",
      })),
      "leave-requests"
    );
  };

  const filtered =
    statusFilter === "ALL"
      ? requests
      : requests.filter(
          (r: LeaveRequestItem) => r.status === statusFilter
        );

  const pendingCount = requests.filter(
    (r: LeaveRequestItem) => r.status === "PENDING"
  ).length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl flex items-center justify-center">
              <TreePalm className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Leave Management
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {pendingCount > 0
                  ? `${pendingCount} pending approval${pendingCount > 1 ? "s" : ""}`
                  : "All requests processed"}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Leave Request
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Leave Request Form */}
        {showForm && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Submit Leave Request
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">
                  Employee
                </label>
                <select
                  value={formUserId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setFormUserId(e.target.value)
                  }
                  className="w-full text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                >
                  {employees.map(
                    (emp: { id: string; name: string; role: string }) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.role})
                      </option>
                    )
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">
                  Leave Type
                </label>
                <select
                  value={formType}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setFormType(e.target.value)
                  }
                  className="w-full text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                >
                  <option value="ANNUAL">Annual Leave</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="EMERGENCY">Emergency Leave</option>
                  <option value="UNPAID">Unpaid Leave</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formStart}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormStart(e.target.value)
                  }
                  className="w-full text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={formEnd}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormEnd(e.target.value)
                  }
                  className="w-full text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">
                Reason (optional)
              </label>
              <textarea
                value={formReason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormReason(e.target.value)
                }
                rows={2}
                className="w-full text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 resize-none"
                placeholder="Optional reason for leave..."
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors"
              >
                {isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Submit
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-400" />
            <select
              value={statusFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                setStatusFilter(e.target.value);
                startTransition(async () => {
                  const data = await getLeaveRequests(
                    e.target.value === "ALL" ? undefined : e.target.value
                  );
                  setRequests(data);
                });
              }}
              className="text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg transition-colors"
          >
            <Download className="w-3 h-3" />
            Export CSV
          </button>
        </div>

        {isPending && (
          <div className="flex items-center gap-2 text-sm text-zinc-500 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading...
          </div>
        )}

        {/* Leave Requests Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Days
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Paid
                  </th>
                  <th className="px-4 py-2.5 w-24" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-zinc-400"
                    >
                      No leave requests found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r: LeaveRequestItem) => (
                    <tr
                      key={r.id}
                      className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {r.userName}
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {r.branchName ?? "No branch"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium">
                          {LEAVE_TYPE_LABELS[r.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-zinc-600 dark:text-zinc-400">
                        {new Date(r.startDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        –{" "}
                        {new Date(r.endDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-zinc-700 dark:text-zinc-300">
                        {r.days}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${LEAVE_STATUS_COLORS[r.status].bg} ${LEAVE_STATUS_COLORS[r.status].text}`}
                        >
                          {r.status === "PENDING" && (
                            <Clock className="w-3 h-3" />
                          )}
                          {r.status === "APPROVED" && (
                            <Check className="w-3 h-3" />
                          )}
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs">
                        {r.isPaid ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            Paid
                          </span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            Unpaid
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {r.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => {
                                  setReviewingId(r.id);
                                  setReviewNote("");
                                }}
                                className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 transition-colors"
                                title="Review"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  handleCancel(r.id, r.userId)
                                }
                                disabled={isPending}
                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 transition-colors"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {reviewingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Review Leave Request
            </h3>
            <textarea
              value={reviewNote}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setReviewNote(e.target.value)
              }
              rows={3}
              className="w-full text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 resize-none"
              placeholder="Optional note for the employee..."
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleReview("APPROVED")}
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Approve
              </button>
              <button
                onClick={() => handleReview("REJECTED")}
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Reject
              </button>
              <button
                onClick={() => setReviewingId(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
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
