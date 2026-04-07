"use client";

// ============================================================
// Payroll Dashboard — Main Orchestrator
// Combines MonthPicker, SummaryCards, PayrollTable, PayslipModal
// Handles generate / lock / unlock actions and branch filtering
// ============================================================

import { useState, useEffect, useCallback, useTransition } from "react";
import {
  RefreshCw,
  Lock,
  Unlock,
  Filter,
  Loader2,
  Wallet,
} from "lucide-react";

import MonthPicker from "@/components/payroll/MonthPicker";
import PayrollSummaryCards from "@/components/payroll/PayrollSummaryCards";
import PayrollTable from "@/components/payroll/PayrollTable";
import PayslipModal from "@/components/payroll/PayslipModal";

import type {
  PayrollListItem,
  PayrollSummary,
  PayslipData,
} from "@/lib/payroll-types";
import { MONTH_NAMES_AR } from "@/lib/payroll-types";

import {
  getPayrollList,
  getPayrollBranches,
  generateAllPayslips,
  lockPayroll,
  unlockPayroll,
  getEmployeePayslip,
} from "@/app/(app)/payroll/actions";

// ============================================================

interface Branch {
  id: string;
  name: string;
}

interface InitialData {
  items: PayrollListItem[];
  summary: PayrollSummary;
  branches: Branch[];
  month: number;
  year: number;
}

export default function PayrollDashboard({
  initialData,
}: {
  initialData: InitialData;
}) {
  const [month, setMonth] = useState(initialData.month);
  const [year, setYear] = useState(initialData.year);
  const [branchId, setBranchId] = useState<string>("");
  const [items, setItems] = useState<PayrollListItem[]>(initialData.items);
  const [summary, setSummary] = useState<PayrollSummary>(initialData.summary);
  const [branches] = useState<Branch[]>(initialData.branches);

  const [selectedPayslip, setSelectedPayslip] = useState<PayslipData | null>(
    null
  );
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const [isPending, startTransition] = useTransition();
  const [loadingPayslip, setLoadingPayslip] = useState(false);

  const monthLabel = `${MONTH_NAMES_AR[month - 1]} ${year}`;

  // ----- Fetch payroll data -----
  const refresh = useCallback(
    (m: number, y: number, branch?: string) => {
      startTransition(async () => {
        const data = await getPayrollList(m, y, branch || undefined);
        setItems(data.items);
        setSummary(data.summary);
      });
    },
    []
  );

  // When month/year/branch change, refetch
  useEffect(() => {
    refresh(month, year, branchId);
  }, [month, year, branchId, refresh]);

  const handleMonthChange = (m: number, y: number) => {
    setMonth(m);
    setYear(y);
  };

  // ----- Generate Payslips -----
  const handleGenerate = () => {
    startTransition(async () => {
      const result = await generateAllPayslips(month, year);
      showToast(result.message, result.success ? "success" : "error");
      if (result.success) refresh(month, year, branchId);
    });
  };

  // ----- Lock / Unlock -----
  const handleLock = () => {
    startTransition(async () => {
      const result = await lockPayroll(month, year);
      showToast(result.message, result.success ? "success" : "error");
      if (result.success) refresh(month, year, branchId);
    });
  };

  const handleUnlock = () => {
    startTransition(async () => {
      const result = await unlockPayroll(month, year);
      showToast(result.message, result.success ? "success" : "error");
      if (result.success) refresh(month, year, branchId);
    });
  };

  // ----- View Payslip -----
  const handleViewPayslip = (userId: string) => {
    setLoadingPayslip(true);
    getEmployeePayslip(userId, month, year)
      .then((payslip: PayslipData) => {
        setSelectedPayslip(payslip);
      })
      .catch(() => {
        showToast("Failed to load payslip.", "error");
      })
      .finally(() => {
        setLoadingPayslip(false);
      });
  };

  // ----- PDF download placeholder -----
  const handleDownloadPDF = () => {
    if (!selectedPayslip) return;
    // Generate printable version
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const p = selectedPayslip;
    const fmt = (n: number) =>
      n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

    printWindow.document.write(`<!DOCTYPE html>
<html><head><title>Payslip — ${p.userName} — ${p.monthLabel}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 700px; margin: 40px auto; color: #18181b; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #71717a; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e4e4e7; font-size: 13px; }
  th { background: #f4f4f5; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; color: #52525b; }
  .right { text-align: right; }
  .red { color: #dc2626; }
  .green { color: #16a34a; }
  .bold { font-weight: 700; }
  .summary { display: flex; gap: 20px; margin: 20px 0; }
  .card { flex: 1; border: 1px solid #e4e4e7; border-radius: 8px; padding: 12px; text-align: center; }
  .card .val { font-size: 20px; font-weight: 700; }
  .card .lbl { font-size: 11px; color: #71717a; text-transform: uppercase; }
  .footer { margin-top: 32px; text-align: center; color: #a1a1aa; font-size: 11px; }
  @media print { body { margin: 20px; } }
</style></head><body>
<h1>HR Loop — Payslip</h1>
<p class="sub">${p.userName} &bull; ${p.userRole} &bull; ${p.branchName ?? "—"} &bull; ${p.monthLabel}</p>
<div class="summary">
  <div class="card"><div class="val">$${fmt(p.baseSalary)}</div><div class="lbl">Base Salary</div></div>
  <div class="card"><div class="val red">-$${fmt(p.totalDeductions)}</div><div class="lbl">Deductions</div></div>
  <div class="card"><div class="val green">$${fmt(p.finalNetSalary)}</div><div class="lbl">Net Salary</div></div>
</div>
<table>
  <tr><th colspan="2">Earnings</th></tr>
  <tr><td>Base Salary</td><td class="right">$${fmt(p.baseSalary)}</td></tr>
  <tr><td>Overtime (${p.totalOvertimeHours.toFixed(1)} hrs)</td><td class="right green">+$${fmt(p.overtimePay)}</td></tr>
  <tr><td>Bonuses</td><td class="right green">+$${fmt(p.totalBonuses)}</td></tr>
  <tr><th colspan="2">Deductions</th></tr>
  <tr><td>Late Penalties (${p.totalLateMinutes.toFixed(0)} min)</td><td class="right red">-$${fmt(p.latePenalties)}</td></tr>
  <tr><td>Early Leave (${p.totalEarlyLeaveMinutes.toFixed(0)} min)</td><td class="right red">-$${fmt(p.earlyLeavePenalties)}</td></tr>
  <tr><td>Absences (${p.totalAbsentDays} days)</td><td class="right red">-$${fmt(p.absenceDeductions)}</td></tr>
  <tr class="bold"><td>Net Salary</td><td class="right green">$${fmt(p.finalNetSalary)}</td></tr>
</table>
<table>
  <tr><th>Date</th><th>Branch</th><th>Scheduled</th><th>Actual</th><th>Status</th><th class="right">Late</th></tr>
  ${p.shifts
    .map(
      (s) => `<tr>
    <td>${new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
    <td>${s.branchName}</td>
    <td>${new Date(s.scheduledStart).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} – ${new Date(s.scheduledEnd).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</td>
    <td>${s.actualClockIn ? new Date(s.actualClockIn).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) + " – " + (s.actualClockOut ? new Date(s.actualClockOut).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—") : "—"}</td>
    <td>${s.status.toUpperCase()}</td>
    <td class="right ${s.lateMinutes > 0 ? "red" : ""}">${s.lateMinutes > 0 ? s.lateMinutes.toFixed(0) + "m" : "—"}</td>
  </tr>`
    )
    .join("")}
</table>
<div class="footer">
  Generated by HR Loop &bull; ${new Date().toLocaleDateString()} &bull; This is an electronic payslip.
</div>
</body></html>`);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  // ----- Toast -----
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Check if any items are locked
  const anyLocked = items.some((i: PayrollListItem) => i.isLocked);
  const allLocked =
    items.length > 0 && items.every((i: PayrollListItem) => i.isLocked);

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div className="page-container pt-6 pb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="text-zinc-400 text-xs font-bold mb-0.5">المحاسبة</p>
          <h1 className="text-xl font-extrabold text-foreground">الرواتب والخصومات</h1>
          <p className="text-xs text-zinc-400 mt-0.5">محرك تسوية الرواتب الشهري</p>
        </div>
        <MonthPicker
          month={month}
          year={year}
          onChange={handleMonthChange}
        />
      </div>

      {/* Content */}
      <div className="page-container py-8 section-gap">
        {/* Summary Cards */}
        <PayrollSummaryCards summary={summary} monthLabel={monthLabel} />

        {/* Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Branch Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-400" />
            <select
              value={branchId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setBranchId(e.target.value)
              }
              className="text-sm border border-zinc-200 rounded-xl px-3 py-2 bg-zinc-50 text-foreground focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
            >
              <option value="">جميع الفروع</option>
              {branches.map((b: Branch) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={isPending}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl gradient-purple text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-purple-sm"
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              توليد الكشوفات
            </button>

            {!allLocked && items.length > 0 && (
              <button
                onClick={handleLock}
                disabled={isPending}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl bg-brand-purple hover:bg-brand-primary-dark text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                <Lock className="w-3.5 h-3.5" />
                اعتماد وقفل
              </button>
            )}

            {anyLocked && (
              <button
                onClick={handleUnlock}
                disabled={isPending}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                <Unlock className="w-3.5 h-3.5" />
                فتح للتعديل
              </button>
            )}
          </div>
        </div>

        {/* Loading */}
        {isPending && (
          <div className="flex items-center gap-2 text-sm text-muted animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin" />
            جاري المعالجة...
          </div>
        )}

        {/* Payroll Table */}
        <PayrollTable items={items} onViewPayslip={handleViewPayslip} />
      </div>

      {/* Payslip Modal */}
      {loadingPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-brand-purple" />
            <span className="text-sm text-muted">
              جاري تحميل كشف الراتب...
            </span>
          </div>
        </div>
      )}

      {selectedPayslip && (
        <PayslipModal
          payslip={selectedPayslip}
          onClose={() => setSelectedPayslip(null)}
          onDownloadPDF={handleDownloadPDF}
        />
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
