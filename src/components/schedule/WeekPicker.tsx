"use client";

// ============================================================
// Week Picker Component
// Navigate between weeks with prev/next buttons
// ============================================================

import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface WeekPickerProps {
  weekLabel: string;
  weekStart: string;
  onWeekChange: (newWeekStart: string) => void;
}

export default function WeekPicker({
  weekLabel,
  weekStart,
  onWeekChange,
}: WeekPickerProps) {
  const shiftWeek = (days: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + days);
    onWeekChange(d.toISOString().split("T")[0]);
  };

  const goToCurrentWeek = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    onWeekChange(monday.toISOString().split("T")[0]);
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => shiftWeek(-7)}
        className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        title="Previous week"
      >
        <ChevronLeft className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
      </button>

      <div className="flex items-center gap-2 min-w-[220px] justify-center">
        <Calendar className="w-4 h-4 text-emerald-500" />
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {weekLabel}
        </span>
      </div>

      <button
        onClick={() => shiftWeek(7)}
        className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        title="Next week"
      >
        <ChevronRight className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
      </button>

      <button
        onClick={goToCurrentWeek}
        className="ml-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors"
      >
        Today
      </button>
    </div>
  );
}
