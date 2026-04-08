"use client";

// ============================================================
// Payslip Detail Modal
// Shows detailed breakdown for a single employee
// ============================================================

import {
  X,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  TrendingDown,
  TrendingUp,
  Download,
  Ban,
} from "lucide-react";
import type { PayslipData, ShiftReconciliation } from "@/lib/payroll-types";
import { useLang } from "@/lib/i18n";

interface PayslipModalProps {
  payslip: PayslipData;
  onClose: () => void;
  onDownloadPDF: () => void;
}

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

export default function PayslipModal({
  payslip,
  onClose,
  onDownloadPDF,
}: PayslipModalProps) {
  const { t } = useLang();
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-main flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {payslip.userName}
            </h2>
            <p className="text-xs text-muted">
              {payslip.monthLabel} — {payslip.branchName ?? "No Branch"} —{" "}
              <span className="uppercase">{payslip.userRole}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onDownloadPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-purple hover:bg-brand-primary-dark text-white rounded-lg transition-colors"
            >
              <Download className="w-3 h-3" />
              PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors"
            >
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-brand-primary/5 dark:bg-brand-primary/10 border border-brand-magenta/15 dark:border-brand-magenta/20 rounded-xl p-3 text-center">
              <DollarSign className="w-5 h-5 text-brand-primary dark:text-brand-primary mx-auto mb-1" />
              <div className="text-xs text-muted mb-0.5">
                {t.payslipView.baseSalary}
              </div>
              <div className="text-lg font-bold text-brand-primary dark:text-brand-primary">
                ${formatCurrency(payslip.baseSalary)}
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3 text-center">
              <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400 mx-auto mb-1" />
              <div className="text-xs text-muted mb-0.5">
                {t.payslipView.totalDeductions}
              </div>
              <div className="text-lg font-bold text-red-600 dark:text-red-400">
                -${formatCurrency(payslip.totalDeductions)}
              </div>
            </div>

            <div className="bg-brand-purple/5 dark:bg-brand-purple/10 border border-brand-purple/15 rounded-xl p-3 text-center">
              <DollarSign className="w-5 h-5 text-brand-purple mx-auto mb-1" />
              <div className="text-xs text-muted mb-0.5">
                {t.payslipView.netSalary}
              </div>
              <div className="text-lg font-bold text-brand-purple dark:text-brand-purple">
                ${formatCurrency(payslip.finalNetSalary)}
              </div>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="bg-surface-hover/50 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
              {t.payslipView.salaryDetails}
            </h3>

            {/* Earnings */}
            <div className="space-y-1.5">
              <BreakdownRow
                label="Base Salary"
                value={payslip.baseSalary}
                type="earning"
              />
              {payslip.overtimePay > 0 && (
                <BreakdownRow
                  label={`Overtime (${payslip.totalOvertimeHours.toFixed(1)} hrs)`}
                  value={payslip.overtimePay}
                  type="earning"
                />
              )}
              {payslip.totalBonuses > 0 && (
                <BreakdownRow
                  label="Bonuses"
                  value={payslip.totalBonuses}
                  type="bonus"
                />
              )}
            </div>

            <div className="border-t border-border-main" />

            {/* Deductions */}
            <div className="space-y-1.5">
              {payslip.latePenalties > 0 && (
                <BreakdownRow
                  label={`Late Arrivals (${payslip.totalLateMinutes.toFixed(0)} min)`}
                  value={payslip.latePenalties}
                  type="deduction"
                />
              )}
              {payslip.earlyLeavePenalties > 0 && (
                <BreakdownRow
                  label={`Early Leave (${payslip.totalEarlyLeaveMinutes.toFixed(0)} min)`}
                  value={payslip.earlyLeavePenalties}
                  type="deduction"
                />
              )}
              {payslip.absenceDeductions > 0 && (
                <BreakdownRow
                  label={`Absences (${payslip.totalAbsentDays} days)`}
                  value={payslip.absenceDeductions}
                  type="deduction"
                />
              )}
              {payslip.totalDeductions === 0 && (
                <div className="text-xs text-muted-light italic">
                  {t.payslipView.noDeductions}
                </div>
              )}
            </div>

            <div className="border-t border-border-main" />

            {/* Net */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">
                {t.payslipView.netSalary}
              </span>
              <span className="text-lg font-bold text-brand-primary dark:text-brand-primary">
                ${formatCurrency(payslip.finalNetSalary)}
              </span>
            </div>
          </div>

          {/* Attendance Stats */}
          <div className="grid grid-cols-4 gap-2">
            <StatBox
              icon={<Calendar className="w-4 h-4" />}
              label={t.payslipView.totalShifts}
              value={payslip.totalShifts.toString()}
              color="text-brand-purple"
            />
            <StatBox
              icon={<Clock className="w-4 h-4" />}
              label={t.payslipView.workHours}
              value={payslip.totalHoursWorked.toFixed(1)}
              color="text-brand-primary dark:text-brand-primary"
            />
            <StatBox
              icon={<AlertTriangle className="w-4 h-4" />}
              label={t.payslipView.lateMinLabel}
              value={payslip.totalLateMinutes.toFixed(0)}
              color={
                payslip.totalLateMinutes > 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-zinc-400"
              }
            />
            <StatBox
              icon={<Ban className="w-4 h-4" />}
              label={t.payslipView.absentDaysLabel}
              value={payslip.totalAbsentDays.toString()}
              color={
                payslip.totalAbsentDays > 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-zinc-400"
              }
            />
          </div>

          {/* Shift Details Table */}
          {payslip.shifts.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">
                {t.payslipView.shiftDetails}
              </h3>
              <div className="bg-surface rounded-xl border border-border-main overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-surface-hover/50 border-b border-border-main">
                      <th className="px-3 py-2 text-left font-semibold text-zinc-500">
                        Date
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-500">
                        Branch
                      </th>
                      <th className="px-3 py-2 text-center font-semibold text-zinc-500">
                        Scheduled
                      </th>
                      <th className="px-3 py-2 text-center font-semibold text-zinc-500">
                        Actual
                      </th>
                      <th className="px-3 py-2 text-center font-semibold text-zinc-500">
                        Status
                      </th>
                      <th className="px-3 py-2 text-right font-semibold text-zinc-500">
                        Late
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {payslip.shifts.map((shift: ShiftReconciliation) => (
                      <tr
                        key={shift.shiftId}
                        className="border-b border-border-main"
                      >
                        <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300 font-medium">
                          {new Date(shift.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="px-3 py-2 text-muted truncate max-w-[100px]">
                          {shift.branchName}
                        </td>
                        <td className="px-3 py-2 text-center text-muted">
                          {formatTime(shift.scheduledStart)} –{" "}
                          {formatTime(shift.scheduledEnd)}
                        </td>
                        <td className="px-3 py-2 text-center text-muted">
                          {shift.actualClockIn
                            ? `${formatTime(shift.actualClockIn)} – ${
                                shift.actualClockOut
                                  ? formatTime(shift.actualClockOut)
                                  : "—"
                              }`
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <StatusBadge status={shift.status} />
                        </td>
                        <td className="px-3 py-2 text-right">
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
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function BreakdownRow({
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
    <div className="bg-surface-hover/50 rounded-lg p-2 text-center">
      <div className={`${color} mx-auto mb-0.5 flex justify-center`}>
        {icon}
      </div>
      <div className={`text-base font-bold ${color}`}>{value}</div>
      <div className="text-[9px] text-zinc-400 font-medium">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    present:
      "bg-brand-primary/10 dark:bg-brand-primary/10 text-brand-primary dark:text-brand-primary",
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
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold uppercase ${
        styles[s] ?? styles.absent
      }`}
    >
      {icons[s] ?? icons.absent}
      {status}
    </span>
  );
}
