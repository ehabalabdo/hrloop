"use client";

// ============================================================
// Month Picker for Payroll
// Select month and year for payroll processing
// ============================================================

import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { MONTH_NAMES } from "@/lib/payroll-types";

interface MonthPickerProps {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
}

export default function MonthPicker({
  month,
  year,
  onChange,
}: MonthPickerProps) {
  const prev = () => {
    if (month === 1) onChange(12, year - 1);
    else onChange(month - 1, year);
  };

  const next = () => {
    if (month === 12) onChange(1, year + 1);
    else onChange(month + 1, year);
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    onChange(now.getMonth() + 1, now.getFullYear());
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={prev}
        className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        title="Previous month"
      >
        <ChevronLeft className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
      </button>

      <div className="flex items-center gap-2 min-w-[200px] justify-center">
        <Calendar className="w-4 h-4 text-emerald-500" />
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {MONTH_NAMES[month - 1]} {year}
        </span>
      </div>

      <button
        onClick={next}
        className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        title="Next month"
      >
        <ChevronRight className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
      </button>

      <button
        onClick={goToCurrentMonth}
        className="ml-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors"
      >
        This Month
      </button>
    </div>
  );
}
