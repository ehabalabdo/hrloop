"use client";

// ============================================================
// Shift Info — Branch & shift hours. Arabic, mobile-first.
// ============================================================

import { Building2, CalendarClock, AlertTriangle } from "lucide-react";

interface ShiftInfoProps {
  branchName: string;
  scheduledStart: string;
  scheduledEnd: string;
  isLate: boolean;
  lateMinutes: number;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function ShiftInfo({
  branchName,
  scheduledStart,
  scheduledEnd,
  isLate,
  lateMinutes,
}: ShiftInfoProps) {
  return (
    <div className="w-full space-y-3">
      {/* Branch + Shift in a 2-col grid on mobile */}
      <div className="grid grid-cols-2 gap-3">
        {/* Branch Name */}
        <div className="bg-white dark:bg-zinc-800/60 rounded-3xl px-5 py-4 border border-zinc-100 dark:border-zinc-700/40 shadow-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <Building2 className="w-4 h-4 text-brand-purple/60" />
            <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
              الفرع
            </span>
          </div>
          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
            {branchName}
          </p>
        </div>

        {/* Shift Hours */}
        <div className="bg-white dark:bg-zinc-800/60 rounded-3xl px-5 py-4 border border-zinc-100 dark:border-zinc-700/40 shadow-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <CalendarClock className="w-4 h-4 text-brand-purple/60" />
            <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
              وقت الوردية
            </span>
          </div>
          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100" dir="ltr">
            {formatTime(scheduledStart)} – {formatTime(scheduledEnd)}
          </p>
        </div>
      </div>

      {/* Late Badge */}
      {isLate && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-800/40 rounded-2xl px-5 py-3">
          <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0" />
          <div className="flex-1">
            <span className="text-sm font-bold text-red-700 dark:text-red-400">
              تأخر {lateMinutes} دقيقة
            </span>
            <p className="text-xs text-red-500/80 dark:text-red-500/60 mt-0.5">
              سيؤثر على الراتب
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
