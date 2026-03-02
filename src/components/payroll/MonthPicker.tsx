"use client";

// ============================================================
// Month Picker — Arabic mobile-first
// ============================================================

import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { MONTH_NAMES_AR } from "@/lib/payroll-types";

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
    <div className="flex items-center gap-2">
      <button
        onClick={prev}
        className="p-2.5 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm active:scale-95"
        title="الشهر السابق"
      >
        <ChevronRight className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
      </button>

      <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl shadow-sm min-w-[160px] sm:min-w-[200px] justify-center">
        <Calendar className="w-4 h-4 text-brand-purple" />
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {MONTH_NAMES_AR[month - 1]} {year}
        </span>
      </div>

      <button
        onClick={next}
        className="p-2.5 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm active:scale-95"
        title="الشهر التالي"
      >
        <ChevronLeft className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
      </button>

      <button
        onClick={goToCurrentMonth}
        className="px-3 py-2 text-xs font-semibold rounded-2xl bg-brand-purple/10 text-brand-purple border border-brand-purple/20 hover:bg-brand-purple/15 transition-colors active:scale-95"
      >
        الشهر الحالي
      </button>
    </div>
  );
}
