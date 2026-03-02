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
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/payroll"
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-zinc-500" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {p.userName}
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {p.monthLabel} — {p.branchName ?? "No Branch"} —{" "}
                <span className="uppercase">{p.userRole}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-purple hover:bg-brand-purple-dark text-white rounded-lg transition-colors print:hidden"
          >
            <Printer className="w-3 h-3" />
            Print
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Financial Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-brand-magenta/5 dark:bg-brand-magenta/10 border border-brand-magenta/15 dark:border-brand-magenta/20 rounded-xl p-4 text-center">
            <DollarSign className="w-6 h-6 text-brand-magenta dark:text-brand-magenta mx-auto mb-1" />
            <div className="text-xs text-zinc-500 mb-1">Base Salary</div>
            <div className="text-xl font-bold text-brand-magenta dark:text-brand-magenta">
              ${formatCurrency(p.baseSalary)}
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-center">
            <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400 mx-auto mb-1" />
            <div className="text-xs text-zinc-500 mb-1">Total Deductions</div>
            <div className="text-xl font-bold text-red-600 dark:text-red-400">
              -${formatCurrency(p.totalDeductions)}
            </div>
          </div>

          <div className="bg-brand-purple/5 dark:bg-brand-purple/10 border border-brand-purple/15 rounded-xl p-4 text-center">
            <DollarSign className="w-6 h-6 text-brand-purple mx-auto mb-1" />
            <div className="text-xs text-zinc-500 mb-1">Net Salary</div>
            <div className="text-xl font-bold text-brand-purple dark:text-brand-purple">
              ${formatCurrency(p.finalNetSalary)}
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
          <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Earnings & Deductions Breakdown
          </h3>

          <div className="space-y-2">
            <Row label="Base Salary" value={p.baseSalary} type="earning" />
            {p.overtimePay > 0 && (
              <Row
                label={`Overtime (${p.totalOvertimeHours.toFixed(1)} hrs)`}
                value={p.overtimePay}
                type="bonus"
              />
            )}
            {p.totalBonuses > 0 && (
              <Row label="Bonuses" value={p.totalBonuses} type="bonus" />
            )}
          </div>

          <div className="border-t border-zinc-200 dark:border-zinc-700" />

          <div className="space-y-2">
            {p.latePenalties > 0 && (
              <DeductionRow
                label={`Late Arrivals (${p.totalLateMinutes.toFixed(0)} min)`}
                value={p.latePenalties}
                canDispute={!!p.payslipId}
                onDispute={() =>
                  setDisputeForm({ type: "LATE_PENALTY", amount: p.latePenalties })
                }
              />
            )}
            {p.earlyLeavePenalties > 0 && (
              <DeductionRow
                label={`Early Leave (${p.totalEarlyLeaveMinutes.toFixed(0)} min)`}
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
                label={`Absences (${p.totalAbsentDays} days)`}
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
                No deductions this month
              </div>
            )}
          </div>

          <div className="border-t border-zinc-200 dark:border-zinc-700" />

          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Net Salary
            </span>
            <span className="text-xl font-bold text-brand-magenta dark:text-brand-magenta">
              ${formatCurrency(p.finalNetSalary)}
            </span>
          </div>
        </div>

        {/* Attendance Stats */}
        <div className="grid grid-cols-4 gap-3">
          <StatBox
            icon={<Calendar className="w-5 h-5" />}
            label="Total Shifts"
            value={p.totalShifts.toString()}
            color="text-brand-purple"
          />
          <StatBox
            icon={<Clock className="w-5 h-5" />}
            label="Hours Worked"
            value={p.totalHoursWorked.toFixed(1)}
            color="text-brand-magenta dark:text-brand-magenta"
          />
          <StatBox
            icon={<AlertTriangle className="w-5 h-5" />}
            label="Late (min)"
            value={p.totalLateMinutes.toFixed(0)}
            color={
              p.totalLateMinutes > 0
                ? "text-red-600 dark:text-red-400"
                : "text-zinc-400"
            }
          />
          <StatBox
            icon={<Ban className="w-5 h-5" />}
            label="Absent Days"
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
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-700">
              <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Shift-by-Shift Breakdown
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
                    <th className="px-4 py-2.5 text-left font-semibold text-zinc-500">
                      Date
                    </th>
                    <th className="px-4 py-2.5 text-left font-semibold text-zinc-500">
                      Branch
                    </th>
                    <th className="px-4 py-2.5 text-center font-semibold text-zinc-500">
                      Scheduled
                    </th>
                    <th className="px-4 py-2.5 text-center font-semibold text-zinc-500">
                      Actual
                    </th>
                    <th className="px-4 py-2.5 text-center font-semibold text-zinc-500">
                      Status
                    </th>
                    <th className="px-4 py-2.5 text-right font-semibold text-zinc-500">
                      Late
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {p.shifts.map((shift: ShiftReconciliation) => (
                    <tr
                      key={shift.shiftId}
                      className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                    >
                      <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300 font-medium">
                        {new Date(shift.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400 truncate max-w-[120px]">
                        {shift.branchName}
                      </td>
                      <td className="px-4 py-2.5 text-center text-zinc-500 dark:text-zinc-400">
                        {formatTime(shift.scheduledStart)} –{" "}
                        {formatTime(shift.scheduledEnd)}
                      </td>
                      <td className="px-4 py-2.5 text-center text-zinc-600 dark:text-zinc-300">
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
        <div className="text-center text-xs text-zinc-400 dark:text-zinc-500 py-4 print:py-2">
          Generated by HR Loop &bull;{" "}
          {new Date(p.generatedAt).toLocaleDateString()} &bull; Electronic
          payslip
        </div>
      </div>

      {/* Dispute Form Modal */}
      {disputeForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-500" />
                Dispute Deduction
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                Disputing{" "}
                <span className="font-semibold uppercase">
                  {disputeForm.type.replace(/_/g, " ")}
                </span>{" "}
                — {disputeForm.amount.toFixed(2)} SAR
              </p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Why are you disputing this deduction?
                </label>
                <textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  rows={4}
                  placeholder="Explain why you believe this deduction is incorrect..."
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setDisputeForm(null);
                    setDisputeReason("");
                  }}
                  className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl py-2.5 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDispute}
                  disabled={!disputeReason.trim() || isPending}
                  className="flex-1 bg-amber-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MessageSquare className="w-4 h-4" />
                  )}
                  Submit Dispute
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium print:hidden ${
            toast.type === "success"
              ? "bg-brand-magenta text-white"
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
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
      <span className={`font-semibold ${colors[type]}`}>
        {prefix}${formatCurrency(value)}
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
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-center">
      <div className={`${color} mx-auto mb-1 flex justify-center`}>{icon}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-zinc-400 font-medium">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    present:
      "bg-brand-magenta/10 dark:bg-brand-magenta/10 text-brand-magenta dark:text-brand-magenta",
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
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
        styles[s] ?? styles.absent
      }`}
    >
      {icons[s] ?? icons.absent}
      {status}
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
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-red-600 dark:text-red-400">
          -${formatCurrency(value)}
        </span>
        {canDispute && (
          <button
            onClick={onDispute}
            className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-800/50 font-medium transition-colors print:hidden"
            title="Dispute this deduction"
          >
            Dispute
          </button>
        )}
      </div>
    </div>
  );
}
