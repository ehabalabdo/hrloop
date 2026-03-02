"use client";

// ============================================================
// Weekly Grid View
// Rows: Branches, Columns: Days of the week
// Drag & drop support for manual adjustments
// ============================================================

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Users,
} from "lucide-react";
import type {
  BranchWithSchedule,
  DaySchedule,
} from "@/lib/schedule-types";
import EmployeeChip from "./EmployeeChip";

const DAY_HEADERS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface WeeklyGridProps {
  branches: BranchWithSchedule[];
  weekDays: string[]; // ISO date strings for the 7 days
  onMoveShift: (shiftId: string, newBranchId: string) => Promise<void>;
  onDeleteShift: (shiftId: string) => Promise<void>;
  hasDrafts: boolean;
}

export default function WeeklyGrid({
  branches,
  weekDays,
  onMoveShift,
  onDeleteShift,
  hasDrafts,
}: WeeklyGridProps) {
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);

  // Get day-of-week index for each weekDay
  const dayIndexes = weekDays.map((d) => new Date(d).getDay());

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[900px]">
        {/* Header row */}
        <div className="grid grid-cols-[200px_repeat(7,1fr)] gap-px bg-zinc-200 dark:bg-zinc-700 rounded-t-xl overflow-hidden">
          {/* Branch column header */}
          <div className="bg-zinc-100 dark:bg-zinc-800 px-3 py-2.5 flex items-center gap-2">
            <Users className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
              Branch
            </span>
          </div>

          {/* Day headers */}
          {weekDays.map((dateStr, i) => {
            const date = new Date(dateStr);
            const dayNum = date.getDate();
            const dayName = DAY_HEADERS_SHORT[dayIndexes[i]];
            const isToday = dateStr === new Date().toISOString().split("T")[0];

            return (
              <div
                key={dateStr}
                className={`px-2 py-2.5 text-center ${
                  isToday
                    ? "bg-brand-magenta/5 dark:bg-brand-magenta/10"
                    : "bg-zinc-100 dark:bg-zinc-800"
                }`}
              >
                <div
                  className={`text-xs font-bold uppercase tracking-wide ${
                    isToday
                      ? "text-brand-magenta dark:text-brand-magenta"
                      : "text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  {dayName}
                </div>
                <div
                  className={`text-sm font-bold mt-0.5 ${
                    isToday
                      ? "text-brand-magenta dark:text-brand-magenta/70"
                      : "text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {dayNum}
                </div>
              </div>
            );
          })}
        </div>

        {/* Branch rows */}
        <div className="bg-zinc-200 dark:bg-zinc-700 rounded-b-xl overflow-hidden">
          {branches.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 px-6 py-12 text-center">
              <Users className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
              <p className="text-sm text-zinc-400 dark:text-zinc-500">
                No branches found. Add branches to start scheduling.
              </p>
            </div>
          ) : (
            branches.map((branch, branchIdx) => (
              <BranchRow
                key={branch.id}
                branch={branch}
                weekDays={weekDays}
                dayIndexes={dayIndexes}
                isEven={branchIdx % 2 === 0}
                dragOverCell={dragOverCell}
                setDragOverCell={setDragOverCell}
                onMoveShift={onMoveShift}
                onDeleteShift={onDeleteShift}
                hasDrafts={hasDrafts}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Branch Row Sub-component
// ============================================================

interface BranchRowProps {
  branch: BranchWithSchedule;
  weekDays: string[];
  dayIndexes: number[];
  isEven: boolean;
  dragOverCell: string | null;
  setDragOverCell: (cell: string | null) => void;
  onMoveShift: (shiftId: string, newBranchId: string) => Promise<void>;
  onDeleteShift: (shiftId: string) => Promise<void>;
  hasDrafts: boolean;
}

function BranchRow({
  branch,
  weekDays,
  dayIndexes,
  isEven,
  dragOverCell,
  setDragOverCell,
  onMoveShift,
  onDeleteShift,
  hasDrafts,
}: BranchRowProps) {
  // Check if any day has understaffing
  const hasAnyShortage = branch.days.some(
    (d) => d.shortage < 0 && d.requiredStaff > 0
  );

  return (
    <div className="grid grid-cols-[200px_repeat(7,1fr)] gap-px">
      {/* Branch name cell */}
      <div
        className={`px-3 py-2 flex flex-col justify-center ${
          isEven
            ? "bg-white dark:bg-zinc-900"
            : "bg-zinc-50 dark:bg-zinc-900/80"
        } ${hasAnyShortage ? "border-l-2 border-l-orange-400" : ""}`}
      >
        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
          {branch.name}
        </div>
        {branch.managerName && (
          <div className="text-[10px] text-brand-purple dark:text-brand-purple font-medium truncate mt-0.5">
            {branch.managerName}
          </div>
        )}
      </div>

      {/* Day cells */}
      {weekDays.map((dateStr, dayIdx) => {
        const day = branch.days.find((d) => d.date === dateStr);
        return (
          <DayCell
            key={dateStr}
            branchId={branch.id}
            dateStr={dateStr}
            day={day}
            isEven={isEven}
            cellId={`${branch.id}-${dateStr}`}
            isDragOver={dragOverCell === `${branch.id}-${dateStr}`}
            onDragEnter={() =>
              setDragOverCell(`${branch.id}-${dateStr}`)
            }
            onDragLeave={() => setDragOverCell(null)}
            onDrop={onMoveShift}
            onDeleteShift={onDeleteShift}
            hasDrafts={hasDrafts}
          />
        );
      })}
    </div>
  );
}

// ============================================================
// Day Cell Sub-component (Droppable)
// ============================================================

interface DayCellProps {
  branchId: string;
  dateStr: string;
  day: DaySchedule | undefined;
  isEven: boolean;
  cellId: string;
  isDragOver: boolean;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: (shiftId: string, newBranchId: string) => Promise<void>;
  onDeleteShift: (shiftId: string) => Promise<void>;
  hasDrafts: boolean;
}

function DayCell({
  branchId,
  dateStr,
  day,
  isEven,
  cellId,
  isDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  onDeleteShift,
  hasDrafts,
}: DayCellProps) {
  const isToday = dateStr === new Date().toISOString().split("T")[0];
  const shortage = day?.shortage ?? 0;
  const requiredStaff = day?.requiredStaff ?? 0;
  const assignedCount = day?.assignedStaff?.length ?? 0;
  const isUnderstaffed = shortage < 0 && requiredStaff > 0;
  const isFullyStaffed = assignedCount >= requiredStaff && requiredStaff > 0;

  let bgClass = isEven
    ? "bg-white dark:bg-zinc-900"
    : "bg-zinc-50 dark:bg-zinc-900/80";

  if (isToday) {
    bgClass = "bg-brand-magenta/5 dark:bg-brand-magenta/5";
  }

  if (isDragOver) {
    bgClass = "bg-brand-purple/5 dark:bg-brand-purple/10 ring-2 ring-brand-purple ring-inset";
  }

  if (isUnderstaffed && !isDragOver) {
    bgClass += " border-b-2 border-b-orange-300 dark:border-b-orange-700";
  }

  return (
    <div
      className={`px-1.5 py-1.5 min-h-[60px] ${bgClass} transition-colors`}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        onDragEnter();
      }}
      onDragLeave={() => onDragLeave()}
      onDrop={async (e) => {
        e.preventDefault();
        onDragLeave();
        const shiftId = e.dataTransfer.getData("shiftId");
        const sourceBranchId = e.dataTransfer.getData("sourceBranchId");
        if (shiftId && sourceBranchId !== branchId) {
          await onDrop(shiftId, branchId);
        }
      }}
    >
      {/* Staffing indicator */}
      {requiredStaff > 0 && (
        <div className="flex items-center justify-between mb-1">
          <span
            className={`text-[9px] font-bold ${
              isUnderstaffed
                ? "text-orange-600 dark:text-orange-400"
                : isFullyStaffed
                ? "text-brand-magenta dark:text-brand-magenta"
                : "text-zinc-400"
            }`}
          >
            {assignedCount}/{requiredStaff}
          </span>
          {isUnderstaffed && (
            <AlertTriangle className="w-3 h-3 text-orange-500" />
          )}
          {isFullyStaffed && (
            <CheckCircle2 className="w-3 h-3 text-brand-magenta" />
          )}
        </div>
      )}

      {/* Employee chips */}
      <div className="flex flex-col gap-1">
        {day?.assignedStaff?.map((entry) => (
          <EmployeeChip
            key={entry.shiftId}
            entry={entry}
            isDraft={entry.status === "DRAFT"}
            onRemove={
              entry.status === "DRAFT"
                ? () => onDeleteShift(entry.shiftId)
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
