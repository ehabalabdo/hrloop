"use client";

// ============================================================
// Leave Management — Mobile-first, Arabic, card-based
// ============================================================

import { useState, useTransition } from "react";
import {
  TreePalm,
  Plus,
  Check,
  X,
  Clock,
  Loader2,
  Download,
  Calendar,
  ChevronDown,
} from "lucide-react";

import type { LeaveRequestItem } from "@/lib/leave-types";
import {
  LEAVE_TYPE_LABELS,
  LEAVE_STATUS_COLORS,
  LEAVE_STATUS_LABELS,
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
      showToast("يرجى تعبئة جميع الحقول المطلوبة", "error");
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

  const STATUS_FILTERS = [
    { value: "ALL", label: "الكل" },
    { value: "PENDING", label: "معلّقة" },
    { value: "APPROVED", label: "مقبولة" },
    { value: "REJECTED", label: "مرفوضة" },
    { value: "CANCELLED", label: "ملغاة" },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0f0a19] pb-28">
      {/* ─── Header ─── */}
      <div className="bg-white dark:bg-zinc-900/80 border-b border-zinc-100 dark:border-zinc-800/40 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-purple/10 dark:bg-brand-purple/20 rounded-2xl flex items-center justify-center">
              <TreePalm className="w-5 h-5 text-brand-purple" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                الإجازات
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {pendingCount > 0
                  ? `${pendingCount} طلب بانتظار الموافقة`
                  : "جميع الطلبات مُعالجة"}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold rounded-2xl bg-brand-magenta hover:bg-brand-magenta/90 text-white shadow-lg shadow-brand-magenta/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">طلب إجازة</span>
            <span className="sm:hidden">جديد</span>
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-5 space-y-5">
        {/* ─── Leave Request Form (Bottom Sheet style) ─── */}
        {showForm && (
          <div className="bg-white dark:bg-zinc-900/80 rounded-3xl border border-zinc-100 dark:border-zinc-800/40 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/40">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                طلب إجازة جديد
              </h3>
            </div>

            <div className="p-6 space-y-5">
              {/* Employee */}
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  الموظف
                </label>
                <div className="relative">
                  <select
                    value={formUserId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setFormUserId(e.target.value)
                    }
                    className="w-full text-sm border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3.5 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 appearance-none focus:ring-2 focus:ring-brand-purple focus:border-transparent outline-none"
                  >
                    {employees.map(
                      (emp: { id: string; name: string; role: string }) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      )
                    )}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                </div>
              </div>

              {/* Leave Type */}
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  نوع الإجازة
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["ANNUAL", "SICK", "EMERGENCY", "UNPAID"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormType(type)}
                      className={`px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                        formType === type
                          ? "bg-brand-purple text-white shadow-md shadow-brand-purple/20"
                          : "bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {LEAVE_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                    من تاريخ
                  </label>
                  <input
                    type="date"
                    value={formStart}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormStart(e.target.value)
                    }
                    className="w-full text-sm border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3.5 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 focus:ring-2 focus:ring-brand-purple focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                    إلى تاريخ
                  </label>
                  <input
                    type="date"
                    value={formEnd}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormEnd(e.target.value)
                    }
                    className="w-full text-sm border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3.5 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 focus:ring-2 focus:ring-brand-purple focus:border-transparent outline-none"
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  السبب <span className="text-zinc-400 font-normal">(اختياري)</span>
                </label>
                <textarea
                  value={formReason}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormReason(e.target.value)
                  }
                  rows={2}
                  className="w-full text-sm border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 resize-none focus:ring-2 focus:ring-brand-purple focus:border-transparent outline-none"
                  placeholder="مثال: إجازة عائلية..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-3.5 text-sm font-bold rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-bold rounded-2xl bg-brand-purple hover:bg-brand-purple-dark text-white disabled:opacity-50 transition-all shadow-lg shadow-brand-purple/20"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  إرسال الطلب
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Filter Chips + Export ─── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => {
                  setStatusFilter(f.value);
                  startTransition(async () => {
                    const data = await getLeaveRequests(
                      f.value === "ALL" ? undefined : f.value
                    );
                    setRequests(data);
                  });
                }}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  statusFilter === f.value
                    ? "bg-brand-purple text-white shadow-md shadow-brand-purple/20"
                    : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                }`}
              >
                {f.label}
                {f.value === "PENDING" && pendingCount > 0 && (
                  <span className="mr-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/20 text-[10px]">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={handleExport}
            className="shrink-0 p-2.5 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-brand-purple transition-colors"
            title="تصدير CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        {isPending && (
          <div className="flex items-center justify-center gap-2 text-sm text-zinc-500 py-4 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin" />
            جاري التحميل...
          </div>
        )}

        {/* ─── Leave Requests — Card List (mobile) ─── */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-zinc-900/60 rounded-3xl border border-zinc-100 dark:border-zinc-800/40">
              <Calendar className="w-12 h-12 mx-auto text-zinc-200 dark:text-zinc-700 mb-3" />
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                لا توجد طلبات إجازة
              </p>
            </div>
          ) : (
            filtered.map((r: LeaveRequestItem) => (
              <div
                key={r.id}
                className="bg-white dark:bg-zinc-900/60 rounded-3xl border border-zinc-100 dark:border-zinc-800/40 shadow-sm overflow-hidden"
              >
                {/* Card Header */}
                <div className="px-5 py-4 flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {r.userName}
                      </h4>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${LEAVE_STATUS_COLORS[r.status].bg} ${LEAVE_STATUS_COLORS[r.status].text}`}
                      >
                        {r.status === "PENDING" && <Clock className="w-3 h-3" />}
                        {r.status === "APPROVED" && <Check className="w-3 h-3" />}
                        {LEAVE_STATUS_LABELS[r.status]}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {r.branchName ?? "بدون فرع"}
                    </p>
                  </div>

                  {/* Actions */}
                  {r.status === "PENDING" && (
                    <div className="flex items-center gap-1.5 shrink-0 mr-2">
                      <button
                        onClick={() => {
                          setReviewingId(r.id);
                          setReviewNote("");
                        }}
                        className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
                        title="مراجعة"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleCancel(r.id, r.userId)}
                        disabled={isPending}
                        className="p-2 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors"
                        title="إلغاء"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Card Body: details in a clean grid */}
                <div className="px-5 pb-4 grid grid-cols-3 gap-3">
                  <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl px-3 py-2.5 text-center">
                    <span className="text-[10px] text-zinc-400 font-medium block mb-0.5">النوع</span>
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      {LEAVE_TYPE_LABELS[r.type]}
                    </span>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl px-3 py-2.5 text-center">
                    <span className="text-[10px] text-zinc-400 font-medium block mb-0.5">المدة</span>
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300" dir="ltr">
                      {new Date(r.startDate).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}
                      {" – "}
                      {new Date(r.endDate).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl px-3 py-2.5 text-center">
                    <span className="text-[10px] text-zinc-400 font-medium block mb-0.5">الأيام</span>
                    <span className="text-lg font-bold text-brand-purple">{r.days}</span>
                  </div>
                </div>

                {/* Paid / Reason strip */}
                {(r.reason || true) && (
                  <div className="px-5 pb-4 flex items-center gap-3 text-xs">
                    <span className={`px-2.5 py-1 rounded-full font-bold ${
                      r.isPaid
                        ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400"
                    }`}>
                      {r.isPaid ? "مدفوعة" : "بدون راتب"}
                    </span>
                    {r.reason && (
                      <span className="text-zinc-400 dark:text-zinc-500 truncate flex-1">
                        {r.reason}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ─── Review Modal (Bottom Sheet) ─── */}
      {reviewingId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md">
            <div className="p-6 space-y-5">
              <div className="w-10 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full mx-auto sm:hidden" />
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                مراجعة طلب الإجازة
              </h3>

              <textarea
                value={reviewNote}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setReviewNote(e.target.value)
                }
                rows={3}
                className="w-full text-sm border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 resize-none focus:ring-2 focus:ring-brand-purple focus:border-transparent outline-none"
                placeholder="ملاحظة للموظف (اختياري)..."
              />

              <div className="flex gap-3">
                <button
                  onClick={() => handleReview("APPROVED")}
                  disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-bold rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  قبول
                </button>
                <button
                  onClick={() => handleReview("REJECTED")}
                  disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-bold rounded-2xl bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition-colors"
                >
                  <X className="w-4 h-4" />
                  رفض
                </button>
                <button
                  onClick={() => setReviewingId(null)}
                  className="px-4 py-3.5 text-sm font-bold rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Toast (above bottom nav) ─── */}
      {toast && (
        <div
          className={`fixed bottom-24 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-semibold ${
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
