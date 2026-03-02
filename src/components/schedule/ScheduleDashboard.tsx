"use client";

// ============================================================
// Schedule Dashboard — Mobile-first, day-by-day card layout
// No sidebar — filters as bottom sheet, day tabs for navigation
// ============================================================

import { useState, useCallback, useTransition } from "react";
import {
  CalendarDays,
  Wand2,
  Send,
  Trash2,
  Loader2,
  Filter,
  Settings2,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Users,
  Building2,
  X,
  Save,
} from "lucide-react";

import type {
  WeeklyScheduleData,
  ScheduleFilter,
  BranchWithSchedule,
  DaySchedule,
} from "@/lib/schedule-types";
import { DAY_NAMES_AR, DAY_NAMES_SHORT_AR } from "@/lib/schedule-types";

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

import EmployeeChip from "./EmployeeChip";

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
  const [filters, setFilters] = useState<ScheduleFilter>({});
  const [isPending, startTransition] = useTransition();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);

  // Selected day index (0-6, default = today if in this week, else 0)
  const todayStr = new Date().toISOString().split("T")[0];
  const weekDays: string[] = (() => {
    const monday = new Date(weekStart);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      return d.toISOString().split("T")[0];
    });
  })();
  const todayIdx = weekDays.indexOf(todayStr);
  const [selectedDay, setSelectedDay] = useState(todayIdx >= 0 ? todayIdx : 0);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Refresh
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

  // Week change
  const shiftWeek = (days: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + days);
    const newStart = d.toISOString().split("T")[0];
    setWeekStart(newStart);
    setSelectedDay(0);
    refreshData(newStart);
  };

  const goToCurrentWeek = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    const newStart = monday.toISOString().split("T")[0];
    setWeekStart(newStart);
    const newWeekDays = Array.from({ length: 7 }, (_, i) => {
      const nd = new Date(monday);
      nd.setDate(nd.getDate() + i);
      return nd.toISOString().split("T")[0];
    });
    const tIdx = newWeekDays.indexOf(todayStr);
    setSelectedDay(tIdx >= 0 ? tIdx : 0);
    refreshData(newStart);
  };

  // Filter branches
  const filteredBranches: BranchWithSchedule[] = data.branches.filter((branch) => {
    if (filters.branchCity) {
      const parts = (branch.address ?? "").split(",").map((p) => p.trim());
      if (parts[parts.length - 1] !== filters.branchCity) return false;
    }
    if (filters.managerName && branch.managerName !== filters.managerName) return false;
    if (filters.showUnderstaffedOnly) {
      if (!branch.days.some((d) => d.shortage < 0 && d.requiredStaff > 0)) return false;
    }
    return true;
  });

  // Batch actions
  const handleAction = async (
    action: string,
    fn: () => Promise<{ success: boolean; message: string }>
  ) => {
    setActionLoading(action);
    try {
      const result = await fn();
      showToast(result.message, result.success ? "success" : "error");
    } catch {
      showToast("حدث خطأ غير متوقع", "error");
    }
    setActionLoading(null);
  };

  const handleGenerate = () =>
    handleAction("generate", async () => {
      const r = await generateWeeklySchedule(weekStart);
      await refreshData();
      return { success: r.success, message: r.message };
    });

  const handlePublish = () =>
    handleAction("publish", async () => {
      const r = await publishSchedule(weekStart);
      await refreshData();
      return r;
    });

  const handleClear = () => {
    if (!window.confirm("حذف جميع المسودات لهذا الأسبوع؟")) return;
    handleAction("clear", async () => {
      const r = await clearWeekDrafts(weekStart);
      await refreshData();
      return r;
    });
  };

  const handleDeleteShift = async (shiftId: string) => {
    await deleteShift(shiftId);
    await refreshData();
  };

  // Selected day data
  const currentDate = weekDays[selectedDay];
  const currentDayOfWeek = new Date(currentDate).getDay();
  const isToday = currentDate === todayStr;

  // Stats
  const { stats } = data;
  const hasFilters = !!(filters.branchCity || filters.managerName || filters.showUnderstaffedOnly);

  // Cities & managers for filters
  const cities = Array.from(
    new Set(
      data.branches
        .map((b) => (b.address ?? "").split(",").map((p) => p.trim()).pop())
        .filter(Boolean)
    )
  ) as string[];
  const managers = Array.from(
    new Set(data.branches.map((b) => b.managerName).filter(Boolean))
  ) as string[];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0f0a19] pb-28">
      {/* ── Header ── */}
      <div className="bg-white dark:bg-zinc-900/80 border-b border-zinc-100 dark:border-zinc-800/40 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-3">
          {/* Title Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-purple/10 dark:bg-brand-purple/20 rounded-2xl flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-brand-purple" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  الجدول الأسبوعي
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  توزيع الموظفين على الفروع
                </p>
              </div>
            </div>

            {/* Loading spinner */}
            {isPending && (
              <div className="w-6 h-6 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          {/* Week Navigation */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => shiftWeek(-7)}
              className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition active:scale-95"
            >
              <ChevronRight className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            </button>

            <div className="flex-1 text-center px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {data.weekLabel}
              </span>
            </div>

            <button
              onClick={() => shiftWeek(7)}
              className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition active:scale-95"
            >
              <ChevronLeft className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            </button>

            <button
              onClick={goToCurrentWeek}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-brand-purple/10 text-brand-purple border border-brand-purple/20 active:scale-95 transition"
            >
              اليوم
            </button>
          </div>

          {/* Day Tabs — horizontal scroll */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5">
            {weekDays.map((dateStr, i) => {
              const date = new Date(dateStr);
              const dayNum = date.getDate();
              const dayIdx = date.getDay();
              const dayShort = DAY_NAMES_SHORT_AR[dayIdx];
              const isDayToday = dateStr === todayStr;
              const isSelected = i === selectedDay;

              // Count issues for this day across branches
              const dayShortages = filteredBranches.reduce((sum, b) => {
                const d = b.days.find((dd) => dd.date === dateStr);
                return sum + (d && d.shortage < 0 ? 1 : 0);
              }, 0);

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDay(i)}
                  className={`shrink-0 flex flex-col items-center min-w-[52px] px-3 py-2 rounded-2xl text-xs font-bold transition-all relative ${
                    isSelected
                      ? "bg-brand-purple text-white shadow-md shadow-brand-purple/25"
                      : isDayToday
                      ? "bg-brand-purple/10 text-brand-purple border border-brand-purple/20"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  <span className="text-[10px] mb-0.5">{dayShort}</span>
                  <span className="text-base">{dayNum}</span>
                  {dayShortages > 0 && !isSelected && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {dayShortages}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/40 rounded-2xl p-3 text-center">
            <div className="text-lg font-bold text-brand-purple">{stats.totalShifts}</div>
            <div className="text-[10px] text-zinc-500">ورديات</div>
          </div>
          <div className="bg-white dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/40 rounded-2xl p-3 text-center">
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{stats.draftShifts}</div>
            <div className="text-[10px] text-zinc-500">مسودة</div>
          </div>
          <div className="bg-white dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/40 rounded-2xl p-3 text-center">
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{stats.publishedShifts}</div>
            <div className="text-[10px] text-zinc-500">منشورة</div>
          </div>
          <div className="bg-white dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/40 rounded-2xl p-3 text-center">
            <div className={`text-lg font-bold ${stats.understaffedSlots > 0 ? "text-red-600 dark:text-red-400" : "text-zinc-400"}`}>
              {stats.understaffedSlots}
            </div>
            <div className="text-[10px] text-zinc-500">نقص</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={actionLoading !== null}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-l from-brand-purple-dark to-brand-purple text-white rounded-2xl text-sm font-bold shadow-lg shadow-brand-purple/20 disabled:opacity-50 transition active:scale-95"
          >
            {actionLoading === "generate" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            توليد
          </button>
          <button
            onClick={handlePublish}
            disabled={actionLoading !== null || stats.draftShifts === 0}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition active:scale-95"
          >
            {actionLoading === "publish" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            نشر
          </button>
          <button
            onClick={handleClear}
            disabled={actionLoading !== null || stats.draftShifts === 0}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-2xl text-sm font-bold disabled:opacity-50 transition active:scale-95"
          >
            {actionLoading === "clear" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Filter & Requirements buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(true)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition active:scale-95 ${
              hasFilters
                ? "bg-brand-purple text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            فلاتر
            {hasFilters && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
          </button>
          <button
            onClick={() => setShowRequirements(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition active:scale-95"
          >
            <Settings2 className="w-3.5 h-3.5" />
            متطلبات الفروع
          </button>
        </div>

        {/* ── Selected Day Header ── */}
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-xl text-xs font-bold ${isToday ? "bg-brand-purple/10 text-brand-purple" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"}`}>
            {DAY_NAMES_AR[currentDayOfWeek]} — {new Date(currentDate).toLocaleDateString("ar-SA", { day: "numeric", month: "long" })}
          </div>
          {isToday && <span className="text-[10px] font-bold text-brand-purple bg-brand-purple/10 px-2 py-1 rounded-full">اليوم</span>}
        </div>

        {/* ── Branch Cards for Selected Day ── */}
        {filteredBranches.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/40 rounded-3xl p-8 text-center">
            <Building2 className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">لا توجد فروع</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBranches.map((branch) => {
              const day = branch.days.find((d) => d.date === currentDate);
              const required = day?.requiredStaff ?? 0;
              const assigned = day?.assignedStaff?.length ?? 0;
              const shortage = day?.shortage ?? 0;
              const isUnderstaffed = shortage < 0 && required > 0;
              const isFull = assigned >= required && required > 0;

              return (
                <div
                  key={branch.id}
                  className={`bg-white dark:bg-zinc-900/60 border shadow-sm rounded-3xl overflow-hidden transition-all ${
                    isUnderstaffed
                      ? "border-orange-200 dark:border-orange-900/40"
                      : "border-zinc-100 dark:border-zinc-800/40"
                  }`}
                >
                  {/* Branch Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isUnderstaffed
                          ? "bg-orange-100 dark:bg-orange-900/30"
                          : isFull
                          ? "bg-emerald-100 dark:bg-emerald-900/30"
                          : "bg-zinc-100 dark:bg-zinc-800"
                      }`}>
                        <Building2 className={`w-4 h-4 ${
                          isUnderstaffed
                            ? "text-orange-600 dark:text-orange-400"
                            : isFull
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-zinc-400"
                        }`} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {branch.name}
                        </div>
                        {branch.managerName && (
                          <div className="text-[10px] text-brand-purple font-medium truncate">
                            {branch.managerName}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Staffing Badge */}
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                      isUnderstaffed
                        ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                        : isFull
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                    }`}>
                      {isUnderstaffed ? (
                        <AlertTriangle className="w-3 h-3" />
                      ) : isFull ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <Users className="w-3 h-3" />
                      )}
                      {assigned}/{required}
                    </div>
                  </div>

                  {/* Assigned Staff */}
                  <div className="px-4 py-3">
                    {assigned === 0 ? (
                      <div className="text-xs text-zinc-400 dark:text-zinc-500 italic py-2 text-center">
                        {required === 0 ? "لا توجد متطلبات لهذا اليوم" : "لم يتم تعيين موظفين بعد"}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {day?.assignedStaff?.map((entry) => (
                          <EmployeeChip
                            key={entry.shiftId}
                            entry={entry}
                            isDraft={entry.status === "DRAFT"}
                            onRemove={
                              entry.status === "DRAFT"
                                ? () => handleDeleteShift(entry.shiftId)
                                : undefined
                            }
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Filter Bottom Sheet ── */}
      {showFilters && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowFilters(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Filter className="w-4 h-4 text-brand-purple" />
                  فلاتر الجدول
                </h3>
                <button onClick={() => setShowFilters(false)} className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <X className="w-4 h-4 text-zinc-400" />
                </button>
              </div>

              {/* City */}
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">المدينة</label>
                <select
                  value={filters.branchCity || ""}
                  onChange={(e) => setFilters({ ...filters, branchCity: e.target.value || undefined })}
                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-brand-purple/30"
                >
                  <option value="">جميع المدن</option>
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Manager */}
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">المدير</label>
                <select
                  value={filters.managerName || ""}
                  onChange={(e) => setFilters({ ...filters, managerName: e.target.value || undefined })}
                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-brand-purple/30"
                >
                  <option value="">جميع المدراء</option>
                  {managers.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* Understaffed toggle */}
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-zinc-700 dark:text-zinc-300 font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  نقص موظفين فقط
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={filters.showUnderstaffedOnly || false}
                    onChange={(e) => setFilters({ ...filters, showUnderstaffedOnly: e.target.checked || undefined })}
                    className="peer sr-only"
                  />
                  <div className="w-10 h-6 bg-zinc-200 dark:bg-zinc-700 rounded-full peer-checked:bg-brand-purple transition" />
                  <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-4 transition" />
                </div>
              </label>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                {hasFilters && (
                  <button
                    onClick={() => {
                      setFilters({});
                      setShowFilters(false);
                    }}
                    className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-2xl text-sm font-bold transition active:scale-95"
                  >
                    مسح الفلاتر
                  </button>
                )}
                <button
                  onClick={() => setShowFilters(false)}
                  className="flex-1 py-3 bg-brand-purple text-white rounded-2xl text-sm font-bold shadow-lg shadow-brand-purple/20 transition active:scale-95"
                >
                  تطبيق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Requirements Bottom Sheet ── */}
      {showRequirements && (
        <RequirementsSheet
          branches={branches}
          onClose={() => setShowRequirements(false)}
          onSave={async (branchId, reqs) => {
            await updateBranchRequirements(branchId, reqs);
            await refreshData();
          }}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-24 left-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-lg text-sm font-bold text-center ${
          toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Requirements Bottom Sheet
// ============================================================

function RequirementsSheet({
  branches,
  onClose,
  onSave,
}: {
  branches: {
    id: string;
    name: string;
    requirements: { dayOfWeek: number; requiredStaff: number }[];
  }[];
  onClose: () => void;
  onSave: (branchId: string, reqs: { dayOfWeek: number; requiredStaff: number }[]) => Promise<void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editReqs, setEditReqs] = useState<{ dayOfWeek: number; requiredStaff: number }[]>([]);
  const [saving, setSaving] = useState(false);

  const startEdit = (branchId: string) => {
    const branch = branches.find((b) => b.id === branchId);
    if (!branch) return;
    const reqs = Array.from({ length: 7 }, (_, i) => {
      const existing = branch.requirements.find((r) => r.dayOfWeek === i);
      return { dayOfWeek: i, requiredStaff: existing?.requiredStaff ?? 0 };
    });
    setEditReqs(reqs);
    setEditingId(branchId);
  };

  const saveReqs = async () => {
    if (!editingId) return;
    setSaving(true);
    await onSave(editingId, editReqs);
    setSaving(false);
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-brand-purple" />
              متطلبات الموظفين لكل فرع
            </h3>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          </div>

          <p className="text-xs text-zinc-500">
            حدد عدد الموظفين المطلوب لكل فرع في كل يوم من الأسبوع
          </p>

          <div className="space-y-2">
            {branches.map((branch) => {
              const totalReq = branch.requirements.reduce((s, r) => s + r.requiredStaff, 0);
              const isEditing = editingId === branch.id;

              return (
                <div key={branch.id} className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => isEditing ? setEditingId(null) : startEdit(branch.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm"
                  >
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{branch.name}</span>
                    <span className="text-xs text-zinc-400 font-mono">{totalReq}/أسبوع</span>
                  </button>

                  {isEditing && (
                    <div className="px-4 pb-4 space-y-3">
                      <div className="grid grid-cols-7 gap-1.5">
                        {editReqs.map((req, i) => (
                          <div key={req.dayOfWeek} className="text-center">
                            <div className="text-[10px] font-bold text-zinc-400 mb-1">
                              {DAY_NAMES_SHORT_AR[req.dayOfWeek]}
                            </div>
                            <input
                              type="number"
                              min={0}
                              max={20}
                              value={req.requiredStaff}
                              onChange={(e) => {
                                const updated = [...editReqs];
                                updated[i] = { ...updated[i], requiredStaff: Math.max(0, parseInt(e.target.value) || 0) };
                                setEditReqs(updated);
                              }}
                              className="w-full px-1 py-2 text-sm text-center rounded-xl border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-brand-purple/30 outline-none"
                            />
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={saveReqs}
                        disabled={saving}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-purple text-white rounded-xl text-sm font-bold disabled:opacity-50 transition active:scale-95"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {saving ? "جاري الحفظ..." : "حفظ"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
