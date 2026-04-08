"use client";

// ============================================================
// Week Picker — Arabic mobile-first
// ============================================================

import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useLang } from "@/lib/i18n";

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
  const { t } = useLang();
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
    <div className="flex items-center gap-2">
      <button
        onClick={() => shiftWeek(-7)}
        className="p-2.5 rounded-2xl bg-surface border border-border-main hover:bg-surface-hover transition-colors shadow-sm active:scale-95"
        title={t.scheduleExtra.prevWeek}
      >
        <ChevronRight className="w-4 h-4 text-muted" />
      </button>

      <div className="flex items-center gap-2 px-3 py-2 bg-surface border border-border-main rounded-2xl shadow-sm min-w-[180px] sm:min-w-[220px] justify-center">
        <Calendar className="w-4 h-4 text-brand-purple" />
        <span className="text-sm font-semibold text-foreground">
          {weekLabel}
        </span>
      </div>

      <button
        onClick={() => shiftWeek(7)}
        className="p-2.5 rounded-2xl bg-surface border border-border-main hover:bg-surface-hover transition-colors shadow-sm active:scale-95"
        title={t.scheduleExtra.nextWeek}
      >
        <ChevronLeft className="w-4 h-4 text-muted" />
      </button>

      <button
        onClick={goToCurrentWeek}
        className="px-3 py-2 text-xs font-semibold rounded-2xl bg-brand-purple/10 text-brand-purple border border-brand-purple/20 hover:bg-brand-purple/15 transition-colors active:scale-95"
      >
        {t.scheduleExtra.today}
      </button>
    </div>
  );
}
