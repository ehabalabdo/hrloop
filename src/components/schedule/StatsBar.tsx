"use client";

// ============================================================
// Schedule Stats Bar — Arabic mobile-first
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
      label: "إجمالي الورديات",
      value: stats.totalShifts,
      color: "text-brand-purple",
      iconBg: "bg-brand-purple/10",
    },
    {
      icon: FileText,
      label: "مسودات",
      value: stats.draftShifts,
      color: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-100 dark:bg-amber-950/40",
    },
    {
      icon: CheckCircle2,
      label: "منشورة",
      value: stats.publishedShifts,
      color: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-100 dark:bg-emerald-950/40",
    },
    {
      icon: AlertTriangle,
      label: "نقص موظفين",
      value: stats.understaffedSlots,
      color:
        stats.understaffedSlots > 0
          ? "text-red-600 dark:text-red-400"
          : "text-muted-light",
      iconBg:
        stats.understaffedSlots > 0
          ? "bg-red-100 dark:bg-red-950/40"
          : "bg-surface-hover",
    },
    {
      icon: Building2,
      label: "مكتمل التوظيف",
      value: `${stats.fullyStaffedBranches}/${stats.totalBranches}`,
      color: "text-brand-purple dark:text-brand-purple-light",
      iconBg: "bg-brand-purple/10",
    },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
      {statItems.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-2.5 px-3 py-2.5 bg-surface/60 border border-border-main rounded-2xl shadow-sm min-w-fit shrink-0"
        >
          <div className={`w-8 h-8 ${item.iconBg} rounded-xl flex items-center justify-center shrink-0`}>
            <item.icon className={`w-4 h-4 ${item.color}`} />
          </div>
          <div className="text-right">
            <div className={`text-lg font-bold leading-none ${item.color}`}>
              {item.value}
            </div>
            <div className="text-xs text-muted font-medium mt-0.5">
              {item.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
