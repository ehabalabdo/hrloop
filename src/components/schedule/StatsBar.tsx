"use client";

// ============================================================
// Schedule Stats Bar
// Shows key metrics at the top of the dashboard
// ============================================================

import {
  CalendarDays,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Building2,
} from "lucide-react";
import type { ScheduleStats } from "@/lib/schedule-types";

interface StatsBarProps {
  stats: ScheduleStats;
}

export default function StatsBar({ stats }: StatsBarProps) {
  const statItems = [
    {
      icon: CalendarDays,
      label: "Total Shifts",
      value: stats.totalShifts,
      color: "text-brand-purple",
      bg: "bg-brand-purple/5 dark:bg-brand-purple/10",
    },
    {
      icon: FileText,
      label: "Drafts",
      value: stats.draftShifts,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
      icon: CheckCircle2,
      label: "Published",
      value: stats.publishedShifts,
      color: "text-brand-magenta dark:text-brand-magenta",
      bg: "bg-brand-magenta/5 dark:bg-brand-magenta/10",
    },
    {
      icon: AlertTriangle,
      label: "Understaffed",
      value: stats.understaffedSlots,
      color:
        stats.understaffedSlots > 0
          ? "text-red-600 dark:text-red-400"
          : "text-zinc-400 dark:text-zinc-500",
      bg:
        stats.understaffedSlots > 0
          ? "bg-red-50 dark:bg-red-950/30"
          : "bg-zinc-50 dark:bg-zinc-800",
    },
    {
      icon: Building2,
      label: "Fully Staffed",
      value: `${stats.fullyStaffedBranches}/${stats.totalBranches}`,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {statItems.map((item) => (
        <div
          key={item.label}
          className={`${item.bg} rounded-xl p-3 flex items-center gap-3`}
        >
          <item.icon className={`w-5 h-5 ${item.color} shrink-0`} />
          <div>
            <div className={`text-lg font-bold ${item.color}`}>
              {item.value}
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
              {item.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
