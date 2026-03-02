"use client";

// ============================================================
// Employee Chip Component
// Draggable chip representing an employee in the schedule grid
// Color-coded by role: Manager (blue), Staff (emerald)
// ============================================================

import { GripVertical, X } from "lucide-react";
import type { ScheduleEntry } from "@/lib/schedule-types";

interface EmployeeChipProps {
  entry: ScheduleEntry;
  onRemove?: (shiftId: string) => void;
  isDraft: boolean;
}

export default function EmployeeChip({
  entry,
  onRemove,
  isDraft,
}: EmployeeChipProps) {
  const isManager = entry.userRole === "MANAGER";

  const roleStyles = isManager
    ? "bg-brand-purple/5 dark:bg-brand-purple/10 border-brand-purple/15 text-brand-purple dark:text-brand-purple/70"
    : "bg-brand-magenta/5 dark:bg-brand-magenta/10 border-brand-magenta/15 dark:border-brand-magenta/20 text-brand-magenta dark:text-brand-magenta/70";

  const statusDot = entry.status === "DRAFT"
    ? "bg-amber-400"
    : "bg-brand-magenta";

  return (
    <div
      draggable={isDraft}
      onDragStart={(e) => {
        e.dataTransfer.setData("shiftId", entry.shiftId);
        e.dataTransfer.setData("userId", entry.userId);
        e.dataTransfer.setData("userName", entry.userName);
        e.dataTransfer.setData("sourceBranchId", entry.branchId);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={`group flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium cursor-grab active:cursor-grabbing transition-all hover:shadow-sm ${roleStyles} ${
        isDraft ? "border-dashed" : ""
      }`}
      title={`${entry.userName} (${entry.userRole}) — ${entry.status}`}
    >
      {isDraft && (
        <GripVertical className="w-3 h-3 opacity-40 group-hover:opacity-100 shrink-0" />
      )}

      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot}`} />

      <span className="truncate max-w-[100px]">{entry.userName}</span>

      {isManager && (
        <span className="text-[9px] font-bold opacity-60 shrink-0">MGR</span>
      )}

      {isDraft && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(entry.shiftId);
          }}
          className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
          title="Remove shift"
        >
          <X className="w-3 h-3 text-red-500" />
        </button>
      )}
    </div>
  );
}
