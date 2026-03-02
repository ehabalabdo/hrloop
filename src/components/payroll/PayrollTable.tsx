"use client";

// ============================================================
// Payroll Table
// Admin view: all employees with financial breakdown
// ============================================================

import { useState } from "react";
import {
  ArrowUpDown,
  Lock,
  Unlock,
  Eye,
  Clock,
  AlertTriangle,
} from "lucide-react";
import type { PayrollListItem } from "@/lib/payroll-types";

interface PayrollTableProps {
  items: PayrollListItem[];
  onViewPayslip: (userId: string) => void;
}

type SortField =
  | "userName"
  | "totalShifts"
  | "totalLateMinutes"
  | "totalOvertimeHours"
  | "totalDeductions"
  | "finalNetSalary";

function formatCurrency(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function PayrollTable({
  items,
  onViewPayslip,
}: PayrollTableProps) {
  const [sortField, setSortField] = useState<SortField>("userName");
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sorted = [...items].sort((a, b) => {
    const av = a[sortField];
    const bv = b[sortField];
    const cmp =
      typeof av === "string"
        ? av.localeCompare(bv as string)
        : (av as number) - (bv as number);
    return sortAsc ? cmp : -cmp;
  });

  const columns: { key: SortField; label: string; align?: string }[] = [
    { key: "userName", label: "Employee" },
    { key: "totalShifts", label: "Shifts", align: "center" },
    { key: "totalLateMinutes", label: "Late (min)", align: "center" },
    { key: "totalOvertimeHours", label: "OT (hrs)", align: "center" },
    { key: "totalDeductions", label: "Deductions", align: "right" },
    { key: "finalNetSalary", label: "Net Salary", align: "right" },
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 font-semibold text-zinc-600 dark:text-zinc-400 text-xs uppercase tracking-wider cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-200 select-none transition-colors ${
                    col.align === "center"
                      ? "text-center"
                      : col.align === "right"
                      ? "text-right"
                      : "text-left"
                  }`}
                  onClick={() => handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <ArrowUpDown className="w-3 h-3 opacity-40" />
                  </span>
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center text-zinc-400 dark:text-zinc-500"
                >
                  No payroll data. Generate payslips first.
                </td>
              </tr>
            ) : (
              sorted.map((item, idx) => (
                <tr
                  key={item.userId}
                  className={`border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors ${
                    idx % 2 === 0 ? "" : "bg-zinc-25 dark:bg-zinc-900/50"
                  }`}
                >
                  {/* Employee */}
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {item.userName}
                      </div>
                      <div className="text-[11px] text-zinc-400 flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            item.userRole === "MANAGER"
                              ? "bg-brand-purple/10 text-brand-purple"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                          }`}
                        >
                          {item.userRole}
                        </span>
                        {item.branchName && (
                          <span className="truncate">{item.branchName}</span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Shifts */}
                  <td className="px-4 py-3 text-center font-medium text-zinc-700 dark:text-zinc-300">
                    {item.totalShifts}
                  </td>

                  {/* Late Minutes */}
                  <td className="px-4 py-3 text-center">
                    {item.totalLateMinutes > 0 ? (
                      <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                        <Clock className="w-3 h-3" />
                        {item.totalLateMinutes.toFixed(0)}
                      </span>
                    ) : (
                      <span className="text-zinc-300 dark:text-zinc-600">
                        0
                      </span>
                    )}
                  </td>

                  {/* Overtime */}
                  <td className="px-4 py-3 text-center">
                    {item.totalOvertimeHours > 0 ? (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        {item.totalOvertimeHours.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-zinc-300 dark:text-zinc-600">
                        0
                      </span>
                    )}
                  </td>

                  {/* Deductions */}
                  <td className="px-4 py-3 text-right">
                    {item.totalDeductions > 0 ? (
                      <span className="text-red-600 dark:text-red-400 font-semibold">
                        -${formatCurrency(item.totalDeductions)}
                      </span>
                    ) : (
                      <span className="text-zinc-300 dark:text-zinc-600">
                        $0.00
                      </span>
                    )}
                  </td>

                  {/* Net Salary */}
                  <td className="px-4 py-3 text-right">
                    <span className="text-brand-magenta dark:text-brand-magenta font-bold text-base">
                      ${formatCurrency(item.finalNetSalary)}
                    </span>
                  </td>

                  {/* Lock Status */}
                  <td className="px-4 py-3 text-center">
                    {item.isLocked ? (
                      <span className="inline-flex items-center gap-1 text-brand-magenta dark:text-brand-magenta text-xs font-medium">
                        <Lock className="w-3 h-3" />
                        Locked
                      </span>
                    ) : item.payslipId ? (
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-medium">
                        <Unlock className="w-3 h-3" />
                        Draft
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-zinc-400 text-xs">
                        <AlertTriangle className="w-3 h-3" />
                        None
                      </span>
                    )}
                  </td>

                  {/* View */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onViewPayslip(item.userId)}
                      className="p-1.5 rounded-lg hover:bg-brand-purple/5 dark:hover:bg-brand-purple/10 text-brand-purple transition-colors"
                      title="View payslip details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
