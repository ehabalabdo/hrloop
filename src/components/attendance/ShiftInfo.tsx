"use client";

// ============================================================
// Shift Info Component
// Displays branch name, shift hours, and late arrival badge.
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
  return date.toLocaleTimeString([], {
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
      {/* Branch Name */}
      <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-4 py-3">
        <Building2 className="w-5 h-5 text-zinc-400 dark:text-zinc-500 shrink-0" />
        <div>
          <span className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium">
            Branch
          </span>
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {branchName}
          </p>
        </div>
      </div>

      {/* Shift Hours */}
      <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-4 py-3">
        <CalendarClock className="w-5 h-5 text-zinc-400 dark:text-zinc-500 shrink-0" />
        <div>
          <span className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium">
            Shift Hours
          </span>
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {formatTime(scheduledStart)} — {formatTime(scheduledEnd)}
          </p>
        </div>
      </div>

      {/* Late Badge */}
      {isLate && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0" />
          <div>
            <span className="text-sm font-semibold text-red-700 dark:text-red-400">
              Late — {lateMinutes} min{lateMinutes !== 1 ? "s" : ""}
            </span>
            <p className="text-xs text-red-500 dark:text-red-500">
              Impact on payroll
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
