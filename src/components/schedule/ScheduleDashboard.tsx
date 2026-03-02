"use client";

// ============================================================
// Schedule Dashboard - Main Orchestrator Component
// Combines WeekPicker, StatsBar, BatchActions, Sidebar, WeeklyGrid
// ============================================================

import { useState, useCallback, useEffect, useTransition } from "react";
import {
  PanelLeftOpen,
  PanelLeftClose,
  Clock,
  LayoutGrid,
} from "lucide-react";
import Link from "next/link";

import WeekPicker from "./WeekPicker";
import StatsBar from "./StatsBar";
import BatchActions from "./BatchActions";
import WeeklyGrid from "./WeeklyGrid";
import ScheduleSidebar from "./ScheduleSidebar";

import type {
  WeeklyScheduleData,
  ScheduleFilter,
  BranchWithSchedule,
} from "@/lib/schedule-types";

import {
  getWeeklySchedule,
  generateWeeklySchedule,
  publishSchedule,
  clearWeekDrafts,
  moveShift,
  deleteShift,
  updateBranchRequirements,
  getAllBranches,
} from "@/app/(app)/schedule/actions";

interface ScheduleDashboardProps {
  initialData: WeeklyScheduleData;
  initialBranches: {
    id: string;
    name: string;
    address: string | null;
    managerName: string | null;
    requirements: { dayOfWeek: number; requiredStaff: number }[];
  }[];
  initialWeekStart: string;
}

export default function ScheduleDashboard({
  initialData,
  initialBranches,
  initialWeekStart,
}: ScheduleDashboardProps) {
  const [data, setData] = useState<WeeklyScheduleData>(initialData);
  const [branches, setBranches] = useState(initialBranches);
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filters, setFilters] = useState<ScheduleFilter>({});
  const [isPending, startTransition] = useTransition();

  // Refresh data from server
  const refreshData = useCallback(
    async (ws?: string) => {
      const targetWeek = ws ?? weekStart;
      startTransition(async () => {
        const [newData, newBranches] = await Promise.all([
          getWeeklySchedule(targetWeek),
          getAllBranches(),
        ]);
        setData(newData);
        setBranches(newBranches);
      });
    },
    [weekStart]
  );

  // Week change handler
  const handleWeekChange = useCallback(
    (newWeekStart: string) => {
      setWeekStart(newWeekStart);
      refreshData(newWeekStart);
    },
    [refreshData]
  );

  // Build array of 7 ISO date strings for the week
  const weekDays: string[] = (() => {
    const monday = new Date(weekStart);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      return d.toISOString().split("T")[0];
    });
  })();

  // Filter branches based on sidebar filters
  const filteredBranches: BranchWithSchedule[] = data.branches.filter(
    (branch) => {
      // City filter
      if (filters.branchCity) {
        const addr = branch.address ?? "";
        const parts = addr.split(",").map((p) => p.trim());
        const city = parts[parts.length - 1] || "";
        if (city !== filters.branchCity) return false;
      }

      // Manager filter
      if (filters.managerName) {
        if (branch.managerName !== filters.managerName) return false;
      }

      // Understaffed filter
      if (filters.showUnderstaffedOnly) {
        const hasShortage = branch.days.some(
          (d) => d.shortage < 0 && d.requiredStaff > 0
        );
        if (!hasShortage) return false;
      }

      return true;
    }
  );

  // Batch action handlers
  const handleGenerate = async () => {
    const result = await generateWeeklySchedule(weekStart);
    await refreshData();
    return { success: result.success, message: result.message };
  };

  const handlePublish = async () => {
    const result = await publishSchedule(weekStart);
    await refreshData();
    return result;
  };

  const handleClear = async () => {
    const result = await clearWeekDrafts(weekStart);
    await refreshData();
    return result;
  };

  // Drag & drop move
  const handleMoveShift = async (shiftId: string, newBranchId: string) => {
    await moveShift(shiftId, newBranchId);
    await refreshData();
  };

  // Delete shift
  const handleDeleteShift = async (shiftId: string) => {
    await deleteShift(shiftId);
    await refreshData();
  };

  // Update requirements
  const handleUpdateRequirements = async (
    branchId: string,
    requirements: { dayOfWeek: number; requiredStaff: number }[]
  ) => {
    await updateBranchRequirements(branchId, requirements);
    await refreshData();
  };

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar */}
      <ScheduleSidebar
        filters={filters}
        onFiltersChange={setFilters}
        branches={branches}
        onUpdateRequirements={handleUpdateRequirements}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="shrink-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              {/* Sidebar toggle */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
              >
                {sidebarOpen ? (
                  <PanelLeftClose className="w-5 h-5 text-zinc-500" />
                ) : (
                  <PanelLeftOpen className="w-5 h-5 text-zinc-500" />
                )}
              </button>

              {/* Logo */}
              <Link
                href="/"
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div className="w-8 h-8 bg-brand-magenta rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100 hidden sm:inline">
                  HR Loop
                </span>
              </Link>

              <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 hidden sm:block" />

              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Schedule Engine
                </span>
              </div>
            </div>

            {/* Week Picker */}
            <WeekPicker
              weekLabel={data.weekLabel}
              weekStart={weekStart}
              onWeekChange={handleWeekChange}
            />
          </div>
        </header>

        {/* Stats & Actions Bar */}
        <div className="shrink-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 space-y-3">
          <StatsBar stats={data.stats} />
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <BatchActions
              weekStart={weekStart}
              hasDrafts={data.stats.draftShifts > 0}
              hasPublished={data.stats.publishedShifts > 0}
              totalShifts={data.stats.totalShifts}
              onGenerate={handleGenerate}
              onPublish={handlePublish}
              onClear={handleClear}
            />

            {/* Loading indicator */}
            {isPending && (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <div className="w-3 h-3 border-2 border-brand-magenta border-t-transparent rounded-full animate-spin" />
                Refreshing...
              </div>
            )}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto p-4">
          <WeeklyGrid
            branches={filteredBranches}
            weekDays={weekDays}
            onMoveShift={handleMoveShift}
            onDeleteShift={handleDeleteShift}
            hasDrafts={data.stats.draftShifts > 0}
          />

          {/* Legend */}
          <div className="mt-4 flex items-center gap-6 flex-wrap text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 rounded bg-brand-purple/15 dark:bg-brand-purple/20 border border-brand-purple/20 dark:border-brand-purple/30" />
              <span>Manager</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 rounded bg-brand-magenta/15 dark:bg-brand-magenta/15 border border-brand-magenta/20 dark:border-brand-magenta/30" />
              <span>Staff</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Draft</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-magenta" />
              <span>Published</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-l-2 border-orange-400" />
              <span>Understaffed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px]">⚡</span>
              <span>Drag & drop to move staff between branches</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
