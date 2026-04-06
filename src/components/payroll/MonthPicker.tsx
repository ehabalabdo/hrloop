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
        className="p-2.5 rounded-2xl bg-surface border border-border-main hover:bg-surface-hover transition-colors shadow-sm active:scale-95"
        title="الشهر السابق"
      >
        <ChevronRight className="w-4 h-4 text-muted" />
      </button>

      <div className="flex items-center gap-2 px-3 py-2 bg-surface border border-border-main rounded-2xl shadow-sm min-w-[160px] sm:min-w-[200px] justify-center">
        <Calendar className="w-4 h-4 text-brand-purple" />
        <span className="text-sm font-semibold text-foreground">
          {MONTH_NAMES_AR[month - 1]} {year}
        </span>
      </div>

      <button
        onClick={next}
        className="p-2.5 rounded-2xl bg-surface border border-border-main hover:bg-surface-hover transition-colors shadow-sm active:scale-95"
        title="الشهر التالي"
      >
        <ChevronLeft className="w-4 h-4 text-muted" />
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
