"use client";

// ============================================================
// Shift Swap Dashboard — Two-step approval UI
// Role-aware: STAFF sees own requests, MANAGER/OWNER can review
// ============================================================

import { useState, useTransition } from "react";
import {
  ArrowLeftRight,
  Plus,
  Check,
  X,
  Clock,
  Loader2,
  ChevronDown,
  User,
  MapPin,
  Calendar,
  MessageSquare,
} from "lucide-react";

import type { SwapItem } from "@/app/(app)/swap/actions";
import {
  createSwapRequest,
  respondToSwap,
  reviewSwap,
  cancelSwap,
  getSwapRequests,
} from "@/app/(app)/swap/actions";

// ============================================================
// STATUS CONFIG
// ============================================================

const SWAP_STATUS_LABELS: Record<string, string> = {
  PENDING_REPLACEMENT: "بانتظار البديل",
  PENDING_MANAGER: "بانتظار المدير",
  APPROVED: "مقبول",
  REJECTED_REPLACEMENT: "رفض البديل",
  REJECTED_MANAGER: "رفض المدير",
  CANCELLED: "ملغي",
};

const SWAP_STATUS_COLORS: Record<string, string> = {
  PENDING_REPLACEMENT: "bg-yellow-50 text-yellow-700",
  PENDING_MANAGER: "bg-blue-50 text-blue-700",
  APPROVED: "bg-green-50 text-green-700",
  REJECTED_REPLACEMENT: "bg-red-50 text-red-700",
  REJECTED_MANAGER: "bg-red-50 text-red-700",
  CANCELLED: "bg-zinc-100 text-zinc-500",
};

const STATUS_FILTERS = [
  { value: "ALL", label: "الكل" },
  { value: "PENDING_REPLACEMENT", label: "بانتظار البديل" },
  { value: "PENDING_MANAGER", label: "بانتظار المدير" },
  { value: "APPROVED", label: "مقبول" },
  { value: "REJECTED_REPLACEMENT", label: "مرفوض" },
  { value: "CANCELLED", label: "ملغي" },
];

// ============================================================
// PROPS
// ============================================================

interface SwapDashboardProps {
  initialSwaps: SwapItem[];
  myShifts: {
    id: string;
    date: string;
    scheduledStart: string;
    scheduledEnd: string;
    branchName: string;
    status: string;
  }[];
  eligibleReplacements: { id: string; name: string; role: string }[];
  currentUserId: string;
  currentUserRole: "OWNER" | "MANAGER" | "STAFF";
}

// ============================================================
// COMPONENT
// ============================================================

export default function SwapDashboard({
  initialSwaps,
  myShifts,
  eligibleReplacements,
  currentUserId,
  currentUserRole,
}: SwapDashboardProps) {
  const [swaps, setSwaps] = useState<SwapItem[]>(initialSwaps);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [selectedShift, setSelectedShift] = useState("");
  const [selectedReplacement, setSelectedReplacement] = useState("");
  const [formReason, setFormReason] = useState("");

  // Review modal
  const [reviewingSwap, setReviewingSwap] = useState<SwapItem | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const isAdmin = currentUserRole === "OWNER" || currentUserRole === "MANAGER";

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const refresh = () => {
    startTransition(async () => {
      const data = await getSwapRequests(
        currentUserId,
        currentUserRole,
        statusFilter === "ALL" ? undefined : statusFilter
      );
      setSwaps(data);
    });
  };

  // ── Create swap request ──
  const handleCreate = () => {
    if (!selectedShift || !selectedReplacement) {
      showToast("يرجى اختيار الوردية والموظف البديل", "error");
      return;
    }
    startTransition(async () => {
      const result = await createSwapRequest({
        requesterId: currentUserId,
        replacementId: selectedReplacement,
        shiftId: selectedShift,
        reason: formReason || undefined,
      });
      showToast(result.message, result.success ? "success" : "error");
      if (result.success) {
        setShowForm(false);
        setSelectedShift("");
        setSelectedReplacement("");
        setFormReason("");
        refresh();
      }
    });
  };

  // ── Replacement responds ──
  const handleReplacementResponse = (swapId: string, action: "ACCEPT" | "REJECT") => {
    startTransition(async () => {
      const result = await respondToSwap({
        swapId,
        replacementId: currentUserId,
        action,
        note: reviewNote || undefined,
      });
      showToast(result.message, result.success ? "success" : "error");
      setReviewingSwap(null);
      setReviewNote("");
      if (result.success) refresh();
    });
  };

  // ── Manager review ──
  const handleManagerReview = (swapId: string, action: "APPROVED" | "REJECTED") => {
    startTransition(async () => {
      const result = await reviewSwap({
        swapId,
        managerId: currentUserId,
        action,
        note: reviewNote || undefined,
      });
      showToast(result.message, result.success ? "success" : "error");
      setReviewingSwap(null);
      setReviewNote("");
      if (result.success) refresh();
    });
  };

  // ── Cancel ──
  const handleCancel = (swapId: string) => {
    startTransition(async () => {
      const result = await cancelSwap(swapId, currentUserId);
      showToast(result.message, result.success ? "success" : "error");
      if (result.success) refresh();
    });
  };

  // ── Filtered swaps ──
  const filtered =
    statusFilter === "ALL"
      ? swaps
      : swaps.filter((s) => s.status === statusFilter);

  const pendingCount = swaps.filter(
    (s) =>
      (s.status === "PENDING_REPLACEMENT" && s.replacementId === currentUserId) ||
      (s.status === "PENDING_MANAGER" && isAdmin)
  ).length;

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ar-SA", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen pb-28">
      {/* ─── Toast ─── */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl text-sm font-bold shadow-xl transition-all ${
            toast.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* ─── Header ─── */}
      <div className="gradient-purple relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-10 w-20 h-20 bg-white/5 rounded-full translate-y-1/2" />
        <div className="page-container py-6 relative">
          <p className="text-white/70 text-xs font-bold mb-1">إدارة التبديلات</p>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-white">
                تبديل الورديات
              </h1>
              <p className="text-xs text-white/60 mt-0.5">
                {pendingCount > 0
                  ? `${pendingCount} طلب بانتظار ردك`
                  : "لا توجد طلبات معلّقة"}
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl bg-white text-brand-purple transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">طلب تبديل</span>
              <span className="sm:hidden">جديد</span>
            </button>
          </div>
        </div>
      </div>

      <div className="page-container py-8 section-gap">
        {/* ─── Create Form ─── */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-zinc-200/50 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-100">
              <h3 className="text-sm font-bold text-foreground">
                طلب تبديل جديد
              </h3>
            </div>

            <div className="p-5 space-y-4">
              {/* Select Shift */}
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">
                  اختر الوردية
                </label>
                <div className="relative">
                  <select
                    value={selectedShift}
                    onChange={(e) => setSelectedShift(e.target.value)}
                    className="w-full text-sm border border-zinc-200 rounded-xl px-4 py-3 bg-zinc-50 text-foreground appearance-none focus:ring-2 focus:ring-brand-purple focus:border-transparent outline-none"
                  >
                    <option value="">— اختر وردية —</option>
                    {myShifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {formatDate(s.date)} — {s.branchName} ({formatTime(s.scheduledStart)} - {formatTime(s.scheduledEnd)})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                </div>
                {myShifts.length === 0 && (
                  <p className="mt-2 text-xs text-zinc-400">لا توجد ورديات قادمة.</p>
                )}
              </div>

              {/* Select Replacement */}
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">
                  اختر الموظف البديل
                </label>
                <div className="relative">
                  <select
                    value={selectedReplacement}
                    onChange={(e) => setSelectedReplacement(e.target.value)}
                    className="w-full text-sm border border-zinc-200 rounded-xl px-4 py-3 bg-zinc-50 text-foreground appearance-none focus:ring-2 focus:ring-brand-purple focus:border-transparent outline-none"
                  >
                    <option value="">— اختر موظف —</option>
                    {eligibleReplacements.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">
                  السبب <span className="text-zinc-400 font-normal">(اختياري)</span>
                </label>
                <textarea
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  rows={2}
                  className="w-full text-sm border border-zinc-200 rounded-xl px-4 py-3 bg-zinc-50 text-foreground resize-none focus:ring-2 focus:ring-brand-purple focus:border-transparent outline-none"
                  placeholder="مثال: لدي موعد شخصي..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-3 text-sm font-bold rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleCreate}
                  disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold rounded-xl gradient-purple text-white disabled:opacity-50 transition-all shadow-purple-sm"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowLeftRight className="w-4 h-4" />
                  )}
                  إرسال الطلب
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Filter Chips ─── */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setStatusFilter(f.value);
                startTransition(async () => {
                  const data = await getSwapRequests(
                    currentUserId,
                    currentUserRole,
                    f.value === "ALL" ? undefined : f.value
                  );
                  setSwaps(data);
                });
              }}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                statusFilter === f.value
                  ? "gradient-purple text-white shadow-purple-sm"
                  : "bg-white text-zinc-500 border border-zinc-200/50 hover:bg-zinc-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ─── Swap Cards ─── */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <ArrowLeftRight className="w-10 h-10 mx-auto text-zinc-200 mb-3" />
            <p className="text-sm font-bold text-zinc-400">
              لا توجد طلبات تبديل
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((swap) => {
              const isRequester = swap.requesterId === currentUserId;
              const isReplacement = swap.replacementId === currentUserId;
              const canReplacementRespond =
                isReplacement && swap.status === "PENDING_REPLACEMENT";
              const canManagerReview =
                isAdmin && swap.status === "PENDING_MANAGER";
              const canCancel =
                isRequester &&
                (swap.status === "PENDING_REPLACEMENT" || swap.status === "PENDING_MANAGER");

              return (
                <div
                  key={swap.id}
                  className="bg-white rounded-2xl border border-zinc-200/50 overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="px-4 py-3.5 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${
                            SWAP_STATUS_COLORS[swap.status] ?? "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          {SWAP_STATUS_LABELS[swap.status] ?? swap.status}
                        </span>
                        {isRequester && (
                          <span className="text-xs text-zinc-400">طلبك</span>
                        )}
                        {isReplacement && (
                          <span className="text-xs text-brand-purple font-semibold">
                            أنت البديل
                          </span>
                        )}
                      </div>

                      {/* Shift info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-zinc-700">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="font-semibold">{formatDate(swap.shiftDate)}</span>
                          <span className="text-zinc-400">
                            {formatTime(swap.shiftStart)} - {formatTime(swap.shiftEnd)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted">
                          <MapPin className="w-3.5 h-3.5" />
                          {swap.branchName}
                        </div>
                      </div>

                      {/* People */}
                      <div className="mt-3 flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="text-muted">
                            الطالب: <strong>{swap.requesterName}</strong>
                          </span>
                        </div>
                        <ArrowLeftRight className="w-3 h-3 text-zinc-300" />
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-brand-purple" />
                          <span className="text-muted">
                            البديل: <strong>{swap.replacementName}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Reason */}
                      {swap.reason && (
                        <div className="mt-2 flex items-start gap-1.5 text-xs text-muted">
                          <MessageSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          {swap.reason}
                        </div>
                      )}

                      {/* Notes */}
                      {swap.replacementNote && (
                        <div className="mt-1 text-xs text-zinc-400">
                          ملاحظة البديل: {swap.replacementNote}
                        </div>
                      )}
                      {swap.managerNote && (
                        <div className="mt-1 text-xs text-zinc-400">
                          ملاحظة المدير: {swap.managerNote}
                        </div>
                      )}
                      {swap.managerName && (
                        <div className="mt-1 text-xs text-zinc-400">
                          المراجع: {swap.managerName}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {(canReplacementRespond || canManagerReview || canCancel) && (
                    <div className="px-4 py-3 border-t border-zinc-100 flex items-center gap-2">
                      {/* Replacement can accept/reject */}
                      {canReplacementRespond && (
                        <>
                          <button
                            onClick={() => {
                              setReviewingSwap(swap);
                              setReviewNote("");
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold rounded-xl bg-green-500 hover:bg-green-600 text-white transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            قبول
                          </button>
                          <button
                            onClick={() => handleReplacementResponse(swap.id, "REJECT")}
                            disabled={isPending}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" />
                            رفض
                          </button>
                        </>
                      )}

                      {/* Manager can approve/reject */}
                      {canManagerReview && (
                        <>
                          <button
                            onClick={() => {
                              setReviewingSwap(swap);
                              setReviewNote("");
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold rounded-xl bg-green-500 hover:bg-green-600 text-white transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            موافقة
                          </button>
                          <button
                            onClick={() => handleManagerReview(swap.id, "REJECTED")}
                            disabled={isPending}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" />
                            رفض
                          </button>
                        </>
                      )}

                      {/* Requester can cancel */}
                      {canCancel && !canReplacementRespond && !canManagerReview && (
                        <button
                          onClick={() => handleCancel(swap.id)}
                          disabled={isPending}
                          className="px-4 py-2.5 text-xs font-bold rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors disabled:opacity-50"
                        >
                          إلغاء الطلب
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Review Modal (for acceptance with optional note) ─── */}
      {reviewingSwap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setReviewingSwap(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4">
            <h3 className="text-sm font-bold text-foreground">
              {reviewingSwap.status === "PENDING_REPLACEMENT"
                ? "قبول طلب التبديل"
                : "الموافقة على التبديل"}
            </h3>

            <div className="text-sm text-muted space-y-1">
              <p>
                <strong>الطالب:</strong> {reviewingSwap.requesterName}
              </p>
              <p>
                <strong>البديل:</strong> {reviewingSwap.replacementName}
              </p>
              <p>
                <strong>التاريخ:</strong> {formatDate(reviewingSwap.shiftDate)}
              </p>
              <p>
                <strong>الفرع:</strong> {reviewingSwap.branchName}
              </p>
              {reviewingSwap.reason && (
                <p>
                  <strong>السبب:</strong> {reviewingSwap.reason}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1.5">
                ملاحظة <span className="text-zinc-400 font-normal">(اختياري)</span>
              </label>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={2}
                className="w-full text-sm border border-zinc-200 rounded-xl px-4 py-3 bg-zinc-50 text-foreground resize-none focus:ring-2 focus:ring-brand-purple focus:border-transparent outline-none"
                placeholder="أضف ملاحظة..."
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setReviewingSwap(null)}
                className="flex-1 px-4 py-3 text-sm font-bold rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors"
              >
                رجوع
              </button>
              <button
                onClick={() => {
                  if (reviewingSwap.status === "PENDING_REPLACEMENT") {
                    handleReplacementResponse(reviewingSwap.id, "ACCEPT");
                  } else {
                    handleManagerReview(reviewingSwap.id, "APPROVED");
                  }
                }}
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold rounded-xl bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 transition-all"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                تأكيد الموافقة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
