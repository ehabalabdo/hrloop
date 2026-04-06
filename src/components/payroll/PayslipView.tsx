"use client";

// ============================================================
// PayslipView — Standalone Employee Payslip Page
// Full-page version of the payslip (not modal)
// Enhanced with dispute buttons on deductions
// ============================================================

import { useState, useTransition } from "react";
import {
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  TrendingDown,
  Printer,
  ArrowLeft,
  Ban,
  MessageSquare,
  Loader2,
} from "lucide-react";
import type { PayslipData, ShiftReconciliation } from "@/lib/payroll-types";
import Link from "next/link";
import { submitDispute } from "@/app/(app)/attendance/resilience-actions";

function formatCurrency(n: number): string {
  return n.toLocaleString("ar-SA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function PayslipView({ payslip }: { payslip: PayslipData }) {
  const p = payslip;
  const [disputeForm, setDisputeForm] = useState<{
    type: string;
    amount: number;
  } | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleDispute = () => {
    if (!disputeForm || !disputeReason.trim() || !p.payslipId) return;
    startTransition(async () => {
      const result = await submitDispute({
        userId: p.userId,
        payslipId: p.payslipId!,
        disputeType: disputeForm.type,
        originalAmount: disputeForm.amount,
        reason: disputeReason,
      });
      if (result.success) {
        showToast(result.message, "success");
        setDisputeForm(null);
        setDisputeReason("");
      } else {
        showToast(result.message, "error");
      }
    });
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="bg-surface border-b border-border-main">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/payroll"
              className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-zinc-500" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-foreground">
                {p.userName}
              </h1>
              <p className="text-xs text-muted">
                {p.monthLabel} — {p.branchName ?? "بدون فرع"} —{" "}
                <span className="uppercase">{p.userRole === "MANAGER" ? "مدير" : p.userRole === "OWNER" ? "مالك" : "موظف"}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-purple hover:bg-brand-primary-dark text-white rounded-lg transition-colors print:hidden"
          >
            <Printer className="w-3 h-3" />
            طباعة
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Financial Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-brand-purple/5 dark:bg-brand-purple/10 border border-brand-purple/15 dark:border-brand-purple/20 rounded-2xl p-4 text-center">
            <DollarSign className="w-6 h-6 text-brand-purple mx-auto mb-1" />
            <div className="text-xs text-zinc-500 mb-1">الراتب الأساسي</div>
            <div className="text-xl font-bold text-brand-purple">
              {formatCurrency(p.baseSalary)} ر.س
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-4 text-center">
            <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400 mx-auto mb-1" />
            <div className="text-xs text-zinc-500 mb-1">إجمالي الخصومات</div>
            <div className="text-xl font-bold text-red-600 dark:text-red-400">
              -{formatCurrency(p.totalDeductions)} ر.س
            </div>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 text-center">
            <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
            <div className="text-xs text-zinc-500 mb-1">صافي الراتب</div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(p.finalNetSalary)} ر.س
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="bg-surface/60 rounded-3xl border border-border-main shadow-sm p-5 space-y-4">
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
            تفاصيل الراتب والخصومات
          </h3>

          <div className="space-y-2">
            <Row label="الراتب الأساسي" value={p.baseSalary} type="earning" />
            {p.overtimePay > 0 && (
              <Row
                label={`العمل الإضافي (${p.totalOvertimeHours.toFixed(1)} ساعة)`}
                value={p.overtimePay}
                type="bonus"
              />
            )}
            {p.totalBonuses > 0 && (
              <Row label="المكافآت" value={p.totalBonuses} type="bonus" />
            )}
          </div>

          <div className="border-t border-border-main" />

          <div className="space-y-2">
            {p.latePenalties > 0 && (
              <DeductionRow
                label={`التأخير (${p.totalLateMinutes.toFixed(0)} دقيقة)`}
                value={p.latePenalties}
                canDispute={!!p.payslipId}
                onDispute={() =>
                  setDisputeForm({ type: "LATE_PENALTY", amount: p.latePenalties })
                }
              />
            )}
            {p.earlyLeavePenalties > 0 && (
              <DeductionRow
                label={`الخروج المبكر (${p.totalEarlyLeaveMinutes.toFixed(0)} دقيقة)`}
                value={p.earlyLeavePenalties}
                canDispute={!!p.payslipId}
                onDispute={() =>
                  setDisputeForm({
                    type: "EARLY_LEAVE_PENALTY",
                    amount: p.earlyLeavePenalties,
                  })
                }
              />
            )}
            {p.absenceDeductions > 0 && (
              <DeductionRow
                label={`الغياب (${p.totalAbsentDays} يوم)`}
                value={p.absenceDeductions}
                canDispute={!!p.payslipId}
                onDispute={() =>
                  setDisputeForm({
                    type: "ABSENCE_DEDUCTION",
                    amount: p.absenceDeductions,
                  })
                }
              />
            )}
            {p.totalDeductions === 0 && (
              <div className="text-xs text-zinc-400 italic">
                لا توجد خصومات هذا الشهر
              </div>
            )}
          </div>

          <div className="border-t border-border-main" />

          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">
              صافي الراتب
            </span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(p.finalNetSalary)} ر.س
            </span>
          </div>
        </div>

        {/* Attendance Stats */}
        <div className="grid grid-cols-4 gap-3">
          <StatBox
            icon={<Calendar className="w-5 h-5" />}
            label="إجمالي الورديات"
            value={p.totalShifts.toString()}
            color="text-brand-purple"
          />
          <StatBox
            icon={<Clock className="w-5 h-5" />}
            label="ساعات العمل"
            value={p.totalHoursWorked.toFixed(1)}
            color="text-brand-purple"
          />
          <StatBox
            icon={<AlertTriangle className="w-5 h-5" />}
            label="تأخير (د)"
            value={p.totalLateMinutes.toFixed(0)}
            color={
              p.totalLateMinutes > 0
                ? "text-red-600 dark:text-red-400"
                : "text-zinc-400"
            }
          />
          <StatBox
            icon={<Ban className="w-5 h-5" />}
            label="أيام الغياب"
            value={p.totalAbsentDays.toString()}
            color={
              p.totalAbsentDays > 0
                ? "text-red-600 dark:text-red-400"
                : "text-zinc-400"
            }
          />
        </div>

        {/* Shift Table */}
        {p.shifts.length > 0 && (
          <div className="bg-surface/60 rounded-3xl border border-border-main shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border-main">
              <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
                تفاصيل كل وردية
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface-hover/50 border-b border-border-main">
                    <th className="px-4 py-2.5 text-left font-semibold text-zinc-500">
                      التاريخ
                    </th>
                    <th className="px-4 py-2.5 text-left font-semibold text-zinc-500">
                      الفرع
                    </th>
                    <th className="px-4 py-2.5 text-center font-semibold text-zinc-500">
                      المجدول
                    </th>
                    <th className="px-4 py-2.5 text-center font-semibold text-zinc-500">
                      الفعلي
                    </th>
                    <th className="px-4 py-2.5 text-center font-semibold text-zinc-500">
                      الحالة
                    </th>
                    <th className="px-4 py-2.5 text-right font-semibold text-zinc-500">
                      تأخير
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {p.shifts.map((shift: ShiftReconciliation) => (
                    <tr
                      key={shift.shiftId}
                      className="border-b border-border-main hover:bg-surface-hover/30"
                    >
                      <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300 font-medium">
                        {new Date(shift.date).toLocaleDateString("ar-SA", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-2.5 text-muted truncate max-w-[120px]">
                        {shift.branchName}
                      </td>
                      <td className="px-4 py-2.5 text-center text-muted">
                        {formatTime(shift.scheduledStart)} –{" "}
                        {formatTime(shift.scheduledEnd)}
                      </td>
                      <td className="px-4 py-2.5 text-center text-muted">
                        {shift.actualClockIn
                          ? `${formatTime(shift.actualClockIn)} – ${
                              shift.actualClockOut
                                ? formatTime(shift.actualClockOut)
                                : "—"
                            }`
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <StatusBadge status={shift.status} />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {shift.lateMinutes > 0 ? (
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            {shift.lateMinutes.toFixed(0)}m
                          </span>
                        ) : (
                          <span className="text-zinc-300 dark:text-zinc-600">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-light py-4 print:py-2">
          HR Loop &bull;{" "}
          {new Date(p.generatedAt).toLocaleDateString("ar-SA")} &bull; كشف راتب إلكتروني
        </div>
      </div>

      {/* Dispute Form Modal */}
      {disputeForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 print:hidden">
          <div className="bg-surface rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-border-main">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-500" />
                اعتراض على الخصم
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                الاعتراض على{" "}
                <span className="font-semibold">
                  {disputeForm.type === "LATE_PENALTY" ? "عقوبة التأخير" : disputeForm.type === "EARLY_LEAVE_PENALTY" ? "عقوبة الخروج المبكر" : "خصم الغياب"}
                </span>{" "}
                — {disputeForm.amount.toFixed(2)} ر.س
              </p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  لماذا تعترض على هذا الخصم؟
                </label>
                <textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  rows={4}
                  placeholder="اشرح لماذا تعتقد أن هذا الخصم غير صحيح..."
                  className="w-full rounded-2xl border border-border-main bg-surface-hover px-3 py-2 text-sm text-foreground placeholder:text-zinc-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setDisputeForm(null);
                    setDisputeReason("");
                  }}
                  className="flex-1 bg-surface-hover text-zinc-700 dark:text-zinc-300 rounded-2xl py-2.5 text-sm font-medium hover:bg-surface-hover transition active:scale-95"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleDispute}
                  disabled={!disputeReason.trim() || isPending}
                  className="flex-1 bg-amber-500 text-white rounded-2xl py-2.5 text-sm font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 active:scale-95"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MessageSquare className="w-4 h-4" />
                  )}
                  إرسال الاعتراض
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-24 left-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-lg text-sm font-medium text-center print:hidden ${
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

// ============================================================
// Sub-components
// ============================================================

function Row({
  label,
  value,
  type,
}: {
  label: string;
  value: number;
  type: "earning" | "deduction" | "bonus";
}) {
  const colors = {
    earning: "text-zinc-700 dark:text-zinc-300",
    deduction: "text-red-600 dark:text-red-400",
    bonus: "text-green-600 dark:text-green-400",
  };
  const prefix = type === "deduction" ? "-" : type === "bonus" ? "+" : "";

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className={`font-semibold ${colors[type]}`}>
        {prefix}{formatCurrency(value)} ر.س
      </span>
    </div>
  );
}

function StatBox({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-surface/60 border border-border-main shadow-sm rounded-2xl p-3 text-center">
      <div className={`${color} mx-auto mb-1 flex justify-center`}>{icon}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-xs text-zinc-400 font-medium">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusLabels: Record<string, string> = {
    present: "حاضر",
    partial: "جزئي",
    absent: "غائب",
  };

  const styles = {
    present:
      "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
    partial:
      "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    absent:
      "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  };

  const icons = {
    present: <CheckCircle2 className="w-3 h-3" />,
    partial: <Clock className="w-3 h-3" />,
    absent: <Ban className="w-3 h-3" />,
  };

  const s = status as keyof typeof styles;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold uppercase ${
        styles[s] ?? styles.absent
      }`}
    >
      {icons[s] ?? icons.absent}
      {statusLabels[s] ?? status}
    </span>
  );
}

function DeductionRow({
  label,
  value,
  canDispute,
  onDispute,
}: {
  label: string;
  value: number;
  canDispute: boolean;
  onDispute: () => void;
}) {
  return (
    <div className="flex items-center justify-between text-sm gap-2">
      <span className="text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-red-600 dark:text-red-400">
          -{formatCurrency(value)} ر.س
        </span>
        {canDispute && (
          <button
            onClick={onDispute}
            className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-800/50 font-medium transition-colors print:hidden"
            title="اعتراض على هذا الخصم"
          >
            اعتراض
          </button>
        )}
      </div>
    </div>
  );
}
