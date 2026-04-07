"use client";

// ============================================================
// Payroll Table — Arabic, card-based mobile-first
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

  const sortOptions: { key: SortField; label: string }[] = [
    { key: "userName", label: "الاسم" },
    { key: "finalNetSalary", label: "صافي الراتب" },
    { key: "totalDeductions", label: "الخصومات" },
    { key: "totalLateMinutes", label: "التأخير" },
  ];

  if (sorted.length === 0) {
    return (
      <div className="bg-white border border-zinc-200/50 rounded-2xl p-8 text-center">
        <AlertTriangle className="w-8 h-8 text-zinc-200 mx-auto mb-3" />
        <p className="text-sm font-bold text-zinc-400">
          لا توجد بيانات رواتب. قم بتوليد كشوفات الرواتب أولاً.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Sort chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {sortOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => handleSort(opt.key)}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all active:scale-95 shrink-0 ${
              sortField === opt.key
                ? "gradient-purple text-white border-transparent shadow-purple-sm"
                : "bg-white text-zinc-500 border-zinc-200/50"
            }`}
          >
            {opt.label}
            <ArrowUpDown className="w-3 h-3 opacity-60" />
          </button>
        ))}
      </div>

      {/* Cards */}
      {sorted.map((item) => (
        <div
          key={item.userId}
          className="bg-white border border-zinc-200/50 rounded-2xl p-4"
        >
          {/* Header: name + status + view button */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="min-w-0">
                <div className="font-semibold text-foreground truncate">
                  {item.userName}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`px-1.5 py-0.5 rounded-lg text-[9px] font-bold ${
                      item.userRole === "MANAGER"
                        ? "bg-brand-purple/10 text-brand-purple"
                        : "bg-surface-hover text-zinc-500"
                    }`}
                  >
                    {item.userRole === "MANAGER" ? "مدير" : "موظف"}
                  </span>
                  {item.branchName && (
                    <span className="text-xs text-zinc-400 truncate">
                      {item.branchName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Status */}
              {item.isLocked ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold">
                  <Lock className="w-3 h-3" />
                  مقفل
                </span>
              ) : item.payslipId ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold">
                  <Unlock className="w-3 h-3" />
                  مسودة
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-50 text-zinc-400 text-xs font-bold">
                  بدون
                </span>
              )}

              <button
                onClick={() => onViewPayslip(item.userId)}
                className="p-2 rounded-xl bg-brand-purple/10 hover:bg-brand-purple/15 text-brand-purple transition-colors active:scale-95"
                title="عرض كشف الراتب"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-2 bg-zinc-50 rounded-xl">
              <div className="text-sm font-bold text-zinc-700">{item.totalShifts}</div>
              <div className="text-[9px] text-zinc-400">الورديات</div>
            </div>
            <div className="text-center p-2 bg-zinc-50 rounded-xl">
              <div className={`text-sm font-bold ${item.totalLateMinutes > 0 ? "text-red-600" : "text-zinc-400"}`}>
                {item.totalLateMinutes > 0 ? item.totalLateMinutes.toFixed(0) : "0"}
              </div>
              <div className="text-[9px] text-zinc-400">تأخير (د)</div>
            </div>
            <div className="text-center p-2 bg-zinc-50 rounded-xl">
              <div className={`text-sm font-bold ${item.totalDeductions > 0 ? "text-red-600" : "text-zinc-400"}`}>
                {item.totalDeductions > 0 ? `-$${formatCurrency(item.totalDeductions)}` : "$0"}
              </div>
              <div className="text-[9px] text-zinc-400">الخصومات</div>
            </div>
            <div className="text-center p-2 bg-brand-purple/5 rounded-xl">
              <div className="text-sm font-bold text-brand-purple">${formatCurrency(item.finalNetSalary)}</div>
              <div className="text-[9px] text-zinc-400">صافي الراتب</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
