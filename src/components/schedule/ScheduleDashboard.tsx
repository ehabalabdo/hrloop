"use client";

// ============================================================
// Schedule Dashboard — Ultra-simple mobile-first
// One button to generate, branch cards with inline requirements
// ============================================================

import { useState, useCallback, useTransition } from "react";
import {
  CalendarDays,
  Wand2,
  Send,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Users,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Minus,
  Plus,
} from "lucide-react";

import type {
  WeeklyScheduleData,
  BranchWithSchedule,
} from "@/lib/schedule-types";
import { DAY_NAMES_AR, DAY_NAMES_SHORT_AR } from "@/lib/schedule-types";

import {
  getWeeklySchedule,
  generateWeeklySchedule,
  publishSchedule,
  clearWeekDrafts,
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
  const [isPending, startTransition] = useTransition();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Selected day
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

  // Actions
  const handleGenerate = async () => {
    setActionLoading("generate");
    try {
      const r = await generateWeeklySchedule(weekStart);
      showToast(r.message, r.success ? "success" : "error");
      await refreshData();
    } catch {
      showToast("حدث خطأ", "error");
    }
    setActionLoading(null);
  };

  const handlePublish = async () => {
    setActionLoading("publish");
    try {
      const r = await publishSchedule(weekStart);
      showToast(r.message, r.success ? "success" : "error");
      await refreshData();
    } catch {
      showToast("حدث خطأ", "error");
    }
    setActionLoading(null);
  };

  const handleClear = async () => {
    if (!window.confirm("حذف جميع المسودات؟")) return;
    setActionLoading("clear");
    try {
      const r = await clearWeekDrafts(weekStart);
      showToast(r.message, r.success ? "success" : "error");
      await refreshData();
    } catch {
      showToast("حدث خطأ", "error");
    }
    setActionLoading(null);
  };

  const handleDeleteShift = async (shiftId: string) => {
    await deleteShift(shiftId);
    await refreshData();
  };

  // Update requirement for a branch on a specific day
  const handleUpdateReq = async (
    branchId: string,
    dayOfWeek: number,
    newVal: number
  ) => {
    const branch = branches.find((b) => b.id === branchId);
    if (!branch) return;

    const reqs = Array.from({ length: 7 }, (_, i) => {
      if (i === dayOfWeek) return { dayOfWeek: i, requiredStaff: newVal };
      const existing = branch.requirements.find((r) => r.dayOfWeek === i);
      return { dayOfWeek: i, requiredStaff: existing?.requiredStaff ?? 0 };
    });

    await updateBranchRequirements(branchId, reqs);
    await refreshData();
  };

  // Current day data
  const currentDate = weekDays[selectedDay];
  const currentDayOfWeek = new Date(currentDate).getDay();
  const isToday = currentDate === todayStr;
  const { stats } = data;
  const hasShifts = stats.totalShifts > 0;
  const hasDrafts = stats.draftShifts > 0;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0f0a19] pb-28">
      {/* ── Sticky Header ── */}
      <div className="bg-white dark:bg-zinc-900/80 border-b border-zinc-100 dark:border-zinc-800/40 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-3">
          {/* Title */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-brand-purple/10 dark:bg-brand-purple/20 rounded-2xl flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-brand-purple" />
            </div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              جدول الورديات
            </h1>
            {isPending && (
              <div className="w-5 h-5 border-2 border-brand-purple border-t-transparent rounded-full animate-spin mr-auto" />
            )}
          </div>

          {/* Week Nav */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => shiftWeek(-7)}
              className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 active:scale-95 transition"
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
              className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 active:scale-95 transition"
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

          {/* Day Tabs */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5">
            {weekDays.map((dateStr, i) => {
              const date = new Date(dateStr);
              const dayNum = date.getDate();
              const dayIdx = date.getDay();
              const dayShort = DAY_NAMES_SHORT_AR[dayIdx];
              const isDayToday = dateStr === todayStr;
              const isSelected = i === selectedDay;

              const dayShortages = data.branches.reduce((sum, b) => {
                const d = b.days.find((dd) => dd.date === dateStr);
                return sum + (d && d.shortage < 0 ? 1 : 0);
              }, 0);

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDay(i)}
                  className={`shrink-0 flex flex-col items-center min-w-[48px] px-2.5 py-2 rounded-2xl text-xs font-bold transition-all relative ${
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
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {/* Day Label */}
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
              isToday
                ? "bg-brand-purple/10 text-brand-purple"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
            }`}
          >
            {DAY_NAMES_AR[currentDayOfWeek]} —{" "}
            {new Date(currentDate).toLocaleDateString("ar-SA", {
              day: "numeric",
              month: "long",
            })}
          </span>
          {isToday && (
            <span className="text-[10px] font-bold text-brand-purple bg-brand-purple/10 px-2 py-1 rounded-full">
              اليوم
            </span>
          )}
        </div>

        {/* Branch Cards */}
        {data.branches.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/40 rounded-3xl p-8 text-center">
            <Building2 className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">
              لا توجد فروع — أضف فروع من الإعدادات
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.branches.map((branch) => {
              const day = branch.days.find((d) => d.date === currentDate);
              const required = day?.requiredStaff ?? 0;
              const assigned = day?.assignedStaff?.length ?? 0;
              const isUnderstaffed = assigned < required && required > 0;
              const isFull = assigned >= required && required > 0;

              return (
                <BranchCard
                  key={branch.id}
                  branch={branch}
                  required={required}
                  assigned={assigned}
                  isUnderstaffed={isUnderstaffed}
                  isFull={isFull}
                  day={day}
                  currentDayOfWeek={currentDayOfWeek}
                  onUpdateReq={(val) =>
                    handleUpdateReq(branch.id, currentDayOfWeek, val)
                  }
                  onDeleteShift={handleDeleteShift}
                />
              );
            })}
          </div>
        )}

        {/* ── Action Buttons — Fixed bottom ── */}
        <div className="fixed bottom-20 left-0 right-0 z-30 px-4">
          <div className="max-w-2xl mx-auto flex gap-2">
            {/* Generate */}
            {!hasShifts && (
              <button
                onClick={handleGenerate}
                disabled={actionLoading !== null}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-l from-brand-purple-dark to-brand-purple text-white rounded-2xl text-sm font-bold shadow-xl shadow-brand-purple/30 disabled:opacity-50 transition active:scale-95"
              >
                {actionLoading === "generate" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                توليد الورديات تلقائياً
              </button>
            )}

            {/* Publish */}
            {hasDrafts && (
              <button
                onClick={handlePublish}
                disabled={actionLoading !== null}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-emerald-600 text-white rounded-2xl text-sm font-bold shadow-xl shadow-emerald-600/25 disabled:opacity-50 transition active:scale-95"
              >
                {actionLoading === "publish" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                نشر الجدول
              </button>
            )}

            {/* Clear */}
            {hasDrafts && (
              <button
                onClick={handleClear}
                disabled={actionLoading !== null}
                className="flex items-center justify-center gap-2 px-4 py-3.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-red-500 rounded-2xl text-sm font-bold shadow-lg disabled:opacity-50 transition active:scale-95"
              >
                {actionLoading === "clear" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Regenerate (when already has shifts) */}
            {hasShifts && !hasDrafts && (
              <button
                onClick={handleGenerate}
                disabled={actionLoading !== null}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white dark:bg-zinc-800 border border-brand-purple/30 text-brand-purple rounded-2xl text-sm font-bold shadow-lg disabled:opacity-50 transition active:scale-95"
              >
                {actionLoading === "generate" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                إعادة التوليد
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed bottom-24 left-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-lg text-sm font-bold text-center ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Branch Card — with inline +/- requirement control
// ============================================================

function BranchCard({
  branch,
  required,
  assigned,
  isUnderstaffed,
  isFull,
  day,
  currentDayOfWeek,
  onUpdateReq,
  onDeleteShift,
}: {
  branch: BranchWithSchedule;
  required: number;
  assigned: number;
  isUnderstaffed: boolean;
  isFull: boolean;
  day: BranchWithSchedule["days"][number] | undefined;
  currentDayOfWeek: number;
  onUpdateReq: (val: number) => void;
  onDeleteShift: (id: string) => void;
}) {
  const [showReqControl, setShowReqControl] = useState(false);

  return (
    <div
      className={`bg-white dark:bg-zinc-900/60 border shadow-sm rounded-3xl overflow-hidden transition-all ${
        isUnderstaffed
          ? "border-orange-200 dark:border-orange-900/40"
          : isFull
          ? "border-emerald-200 dark:border-emerald-900/40"
          : "border-zinc-100 dark:border-zinc-800/40"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isUnderstaffed
                ? "bg-orange-100 dark:bg-orange-900/30"
                : isFull
                ? "bg-emerald-100 dark:bg-emerald-900/30"
                : "bg-zinc-100 dark:bg-zinc-800"
            }`}
          >
            <Building2
              className={`w-4 h-4 ${
                isUnderstaffed
                  ? "text-orange-600 dark:text-orange-400"
                  : isFull
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-zinc-400"
              }`}
            />
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

        {/* Staffing badge — tap to toggle requirement editor */}
        <button
          onClick={() => setShowReqControl(!showReqControl)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold transition active:scale-95 ${
            isUnderstaffed
              ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
              : isFull
              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
          }`}
        >
          {isUnderstaffed ? (
            <AlertTriangle className="w-3 h-3" />
          ) : isFull ? (
            <CheckCircle2 className="w-3 h-3" />
          ) : (
            <Users className="w-3 h-3" />
          )}
          {assigned}/{required}
        </button>
      </div>

      {/* Inline Requirement Editor */}
      {showReqControl && (
        <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-100 dark:border-zinc-800/30 flex items-center justify-between">
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            عدد الموظفين المطلوب لهذا اليوم
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onUpdateReq(Math.max(0, required - 1))}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 active:scale-90 transition"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100 min-w-[24px] text-center">
              {required}
            </span>
            <button
              onClick={() => onUpdateReq(required + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-brand-purple text-white active:scale-90 transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Assigned Staff */}
      <div className="px-4 py-3 border-t border-zinc-50 dark:border-zinc-800/20">
        {assigned === 0 ? (
          <div className="text-xs text-zinc-400 dark:text-zinc-500 italic py-1 text-center">
            {required === 0
              ? "اضغط على الرقم أعلاه لتحديد عدد الموظفين"
              : "اضغط «توليد» لتوزيع الموظفين تلقائياً"}
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
                    ? () => onDeleteShift(entry.shiftId)
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
