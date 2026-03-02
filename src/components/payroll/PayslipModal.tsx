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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {payslip.userName}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {payslip.monthLabel} — {payslip.branchName ?? "No Branch"} —{" "}
              <span className="uppercase">{payslip.userRole}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onDownloadPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-purple hover:bg-brand-purple-dark text-white rounded-lg transition-colors"
            >
              <Download className="w-3 h-3" />
              PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-brand-magenta/5 dark:bg-brand-magenta/10 border border-brand-magenta/15 dark:border-brand-magenta/20 rounded-xl p-3 text-center">
              <DollarSign className="w-5 h-5 text-brand-magenta dark:text-brand-magenta mx-auto mb-1" />
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">
                Base Salary
              </div>
              <div className="text-lg font-bold text-brand-magenta dark:text-brand-magenta">
                ${formatCurrency(payslip.baseSalary)}
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3 text-center">
              <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400 mx-auto mb-1" />
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">
                Total Deductions
              </div>
              <div className="text-lg font-bold text-red-600 dark:text-red-400">
                -${formatCurrency(payslip.totalDeductions)}
              </div>
            </div>

            <div className="bg-brand-purple/5 dark:bg-brand-purple/10 border border-brand-purple/15 rounded-xl p-3 text-center">
              <DollarSign className="w-5 h-5 text-brand-purple mx-auto mb-1" />
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">
                Net Salary
              </div>
              <div className="text-lg font-bold text-brand-purple dark:text-brand-purple">
                ${formatCurrency(payslip.finalNetSalary)}
              </div>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Earnings & Deductions Breakdown
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

            <div className="border-t border-zinc-200 dark:border-zinc-700" />

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
                <div className="text-xs text-zinc-400 dark:text-zinc-500 italic">
                  No deductions this month
                </div>
              )}
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-700" />

            {/* Net */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Net Salary
              </span>
              <span className="text-lg font-bold text-brand-magenta dark:text-brand-magenta">
                ${formatCurrency(payslip.finalNetSalary)}
              </span>
            </div>
          </div>

          {/* Attendance Stats */}
          <div className="grid grid-cols-4 gap-2">
            <StatBox
              icon={<Calendar className="w-4 h-4" />}
              label="Total Shifts"
              value={payslip.totalShifts.toString()}
              color="text-brand-purple"
            />
            <StatBox
              icon={<Clock className="w-4 h-4" />}
              label="Hours Worked"
              value={payslip.totalHoursWorked.toFixed(1)}
              color="text-brand-magenta dark:text-brand-magenta"
            />
            <StatBox
              icon={<AlertTriangle className="w-4 h-4" />}
              label="Late (min)"
              value={payslip.totalLateMinutes.toFixed(0)}
              color={
                payslip.totalLateMinutes > 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-zinc-400"
              }
            />
            <StatBox
              icon={<Ban className="w-4 h-4" />}
              label="Absent Days"
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
              <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                Shift-by-Shift Breakdown
              </h3>
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
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
                        className="border-b border-zinc-100 dark:border-zinc-800"
                      >
                        <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300 font-medium">
                          {new Date(shift.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 truncate max-w-[100px]">
                          {shift.branchName}
                        </td>
                        <td className="px-3 py-2 text-center text-zinc-500 dark:text-zinc-400">
                          {formatTime(shift.scheduledStart)} –{" "}
                          {formatTime(shift.scheduledEnd)}
                        </td>
                        <td className="px-3 py-2 text-center text-zinc-600 dark:text-zinc-300">
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
    <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-2 text-center">
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
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
        styles[s] ?? styles.absent
      }`}
    >
      {icons[s] ?? icons.absent}
      {status}
    </span>
  );
}
