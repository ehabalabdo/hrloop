"use client";

// ============================================================
// Schedule Dashboard — Professional Mobile-First Redesign
// Ultra-clean typography, structured cards, precise controls
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
  Clock,
  Briefcase,
  X,
} from "lucide-react";

import type {
  WeeklyScheduleData,
  BranchWithSchedule,
  ScheduleEntry,
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

// Helper for Avatars
const getInitials = (name: string) => {
  if (!name) return "م";
  const parts = name.split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`;
  return name.substring(0, 2);
};

// Formatter for Shift Times
const formatTime = (dateString?: Date | string) => {
  if (!dateString) return "--:--";
  return new Date(dateString).toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

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

  // Selected day logic
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
    
    // Auto-select today if it falls in the current week
    const newWeekDays = Array.from({ length: 7 }, (_, i) => {
      const nd = new Date(monday);
      nd.setDate(nd.getDate() + i);
      return nd.toISOString().split("T")[0];
    });
    const tIdx = newWeekDays.indexOf(todayStr);
    setSelectedDay(tIdx >= 0 ? tIdx : 0);
    refreshData(newStart);
  };

  // Jump to a specific date's week
  const goToWeek = (dateStr: string) => {
    const picked = new Date(dateStr);
    if (isNaN(picked.getTime())) return;
    const day = picked.getDay();
    const diff = picked.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(picked);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    const newStart = monday.toISOString().split("T")[0];
    setWeekStart(newStart);
    
    // Select the picked day within the week
    const newWeekDays = Array.from({ length: 7 }, (_, i) => {
      const nd = new Date(monday);
      nd.setDate(nd.getDate() + i);
      return nd.toISOString().split("T")[0];
    });
    const pickedIdx = newWeekDays.indexOf(dateStr);
    setSelectedDay(pickedIdx >= 0 ? pickedIdx : 0);
    refreshData(newStart);
  };

  // Actions
  const handleAction = async (
    actionName: string,
    actionFn: () => Promise<{ success: boolean; message: string }>
  ) => {
    setActionLoading(actionName);
    try {
      const r = await actionFn();
      showToast(r.message, r.success ? "success" : "error");
      await refreshData();
    } catch {
      showToast("حدث خطأ", "error");
    } finally {
      setActionLoading(null);
    }
  };

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

  // Delete shift wrapper
  const handleDeleteShift = async (shiftId: string) => {
    await deleteShift(shiftId);
    await refreshData();
  };

  // Current day context
  const currentDate = weekDays[selectedDay];
  const currentDayOfWeek = new Date(currentDate).getDay();
  const isToday = currentDate === todayStr;
  const { stats } = data;
  const hasShifts = stats.totalShifts > 0;
  const hasDrafts = stats.draftShifts > 0;

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950 pb-36 font-sans">
      
      {/* ── STICKY TOP NAVIGATION & CALENDAR ── */}
      <div className="bg-white dark:bg-zinc-900 shadow-[0_4px_24px_-10px_rgba(0,0,0,0.05)] border-b border-zinc-200/50 dark:border-zinc-800/80 sticky top-0 z-30 rounded-b-[2rem]">
        <div className="max-w-2xl mx-auto px-5 pt-6 pb-6">
          
          {/* Header Row */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 bg-gradient-to-br from-brand-purple to-brand-purple-dark rounded-2xl flex items-center justify-center shadow-lg shadow-brand-purple/20">
                <CalendarDays className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                  جدول الورديات
                </h1>
                <p className="text-[13px] text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
                  تخطيط وتوزيع الموظفين
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isPending && <Loader2 className="w-5 h-5 animate-spin text-brand-purple" />}
              {hasShifts && !hasDrafts && (
                <button
                  onClick={() => {
                    if (window.confirm("سيتم إعادة توليد الورديات للأماكن غير المغطاة. هل تريد الاستمرار؟")) {
                      handleAction("generate", () => generateWeeklySchedule(weekStart));
                    }
                  }}
                  disabled={actionLoading !== null}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-xl text-[12px] font-bold shadow-sm disabled:opacity-50 transition-all active:scale-95 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                >
                  {actionLoading === "generate" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5" />
                  )}
                  إعادة التوليد
                </button>
              )}
            </div>
          </div>

          {/* Week Selector */}
          <div className="flex items-center bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-1.5 mb-6 border border-zinc-200/60 dark:border-zinc-700/50 relative overflow-hidden">
            <button
              onClick={() => shiftWeek(-7)}
              className="p-3 bg-white dark:bg-zinc-700 shadow-sm rounded-xl active:scale-95 transition-transform"
            >
              <ChevronRight className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
            </button>

            {/* Clickable week label — opens native date picker */}
            <label className="flex-[2] text-center cursor-pointer relative">
              <span className="font-bold text-zinc-800 dark:text-zinc-100 text-[15px]">
                {data.weekLabel}
              </span>
              <span className="block text-[11px] text-brand-purple font-semibold mt-0.5">اضغط لاختيار أسبوع</span>
              <input
                type="date"
                value={weekStart}
                onChange={(e) => {
                  if (e.target.value) goToWeek(e.target.value);
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </label>

            <button
              onClick={() => shiftWeek(7)}
              className="p-3 bg-white dark:bg-zinc-700 shadow-sm rounded-xl active:scale-95 transition-transform"
            >
              <ChevronLeft className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
            </button>
            
            <button 
              onClick={goToCurrentWeek}
              className="mr-2 px-4 py-3 bg-brand-purple/10 text-brand-purple dark:bg-brand-purple/20 font-bold text-xs rounded-xl active:scale-95 transition-all outline-dashed outline-1 outline-brand-purple/20 flex-1 hover:bg-brand-purple/15"
            >
              اليوم
            </button>
          </div>

          {/* Day Cards (horizontal scroll) */}
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-2 -mx-2 px-2 snap-x">
            {weekDays.map((dateStr, i) => {
              const date = new Date(dateStr);
              const dayNum = date.getDate();
              const dayIdx = date.getDay();
              const dayName = DAY_NAMES_SHORT_AR[dayIdx];
              const isSelected = i === selectedDay;
              const isDayToday = dateStr === todayStr;

              // Check for shortages on this day
              const dayShortages = data.branches.reduce((sum, b) => {
                const d = b.days.find((dd) => dd.date === dateStr);
                return sum + (d && d.shortage < 0 ? 1 : 0);
              }, 0);

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDay(i)}
                  className={`relative flex-shrink-0 snap-center flex flex-col items-center justify-center w-[66px] h-[78px] rounded-[22px] transition-all duration-200 ${
                    isSelected
                      ? "bg-brand-purple text-white shadow-xl shadow-brand-purple/25 scale-105 z-10"
                      : isDayToday
                      ? "bg-brand-purple/5 border border-brand-purple/30 text-brand-purple"
                      : "bg-white dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/50 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-sm"
                  }`}
                >
                  <span className={`text-[11px] font-semibold mb-1 ${isSelected ? "opacity-90" : ""}`}>
                    {dayName}
                  </span>
                  <span className={`text-[19px] font-black ${isSelected ? "" : "text-zinc-800 dark:text-zinc-200"}`}>
                    {dayNum}
                  </span>

                  {dayShortages > 0 && !isSelected && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                  )}
                  {isDayToday && !isSelected && (
                    <div className="absolute bottom-1.5 w-4 h-1 rounded-full bg-brand-purple opacity-40" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── DAY OVERVIEW & BRANCHES ── */}
      <div className="max-w-2xl mx-auto px-5 py-8">
        
        {/* Selected Day Header */}
        <div className="flex items-center justify-between mb-6 px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[19px] font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {DAY_NAMES_AR[currentDayOfWeek]}
            </h2>
            <span className="text-[15px] font-medium text-zinc-500 dark:text-zinc-400">
              {new Date(currentDate).toLocaleDateString("ar-SA", { day: "numeric", month: "long" })}
            </span>
          </div>
          {isToday && (
            <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-extrabold rounded-full uppercase tracking-wider border border-emerald-100 dark:border-emerald-800/50 shadow-sm">
              اليوم الحالي
            </span>
          )}
        </div>

        {/* Branches Feed */}
        {data.branches.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-[28px] p-10 flex flex-col items-center text-center shadow-sm">
            <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4 border border-zinc-100 dark:border-zinc-700/50">
              <Briefcase className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
            </div>
            <h3 className="text-zinc-800 dark:text-zinc-200 font-bold mb-2">لا توجد فروع</h3>
            <p className="text-[15px] text-zinc-500 max-w-[240px] leading-relaxed">
              يرجى إضافة فروع من الإعدادات للبدء بجدولة وتوزيع الموظفين.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {data.branches.map((branch) => {
              const day = branch.days.find((d) => d.date === currentDate);
              const required = day?.requiredStaff ?? 0;
              const assigned = day?.assignedStaff?.length ?? 0;
              
              // Status Logic
              const isUnderstaffed = assigned < required && required > 0;
              const isFull = assigned >= required && required > 0;
              const isUnplanned = required === 0 && assigned === 0;
              const isOverstaffed = assigned > required && required > 0;

              return (
                <div 
                  key={branch.id}
                  className={`bg-white dark:bg-zinc-900 rounded-[28px] overflow-visible border transition-all duration-300 relative ${
                    isUnderstaffed 
                      ? "border-orange-200 dark:border-orange-900/50 shadow-[0_8px_30px_-12px_rgba(249,115,22,0.15)]" 
                      : isFull || isOverstaffed
                      ? "border-emerald-200 dark:border-emerald-900/50 shadow-[0_8px_30px_-12px_rgba(16,185,129,0.1)]"
                      : "border-zinc-200/70 dark:border-zinc-800/80 shadow-sm"
                  }`}
                >
                  {/* Decorative Status Accent */}
                  <div className={`absolute top-0 right-10 left-10 h-[3px] rounded-b-full ${
                    isUnderstaffed ? "bg-orange-400/50" : isFull ? "bg-emerald-400/50" : "bg-transparent"
                  }`} />

                  {/* Branch Header */}
                  <div className="p-5 sm:p-6 flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      {/* Branch Icon */}
                      <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center shrink-0 border ${
                        isUnderstaffed 
                          ? "bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 text-orange-600 dark:from-orange-950/40 dark:to-orange-900/20 dark:border-orange-800/50 dark:text-orange-400" 
                          : isFull || isOverstaffed 
                          ? "bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-600 dark:from-emerald-950/40 dark:to-emerald-900/20 dark:border-emerald-800/50 dark:text-emerald-400"
                          : "bg-gradient-to-br from-zinc-50 to-zinc-100 border-zinc-200 text-zinc-500 dark:from-zinc-800/50 dark:to-zinc-800/20 dark:border-zinc-700/50 dark:text-zinc-400"
                      }`}>
                        <Building2 className="w-6 h-6" strokeWidth={2.5} />
                      </div>
                      
                      {/* Title & Subtitle */}
                      <div>
                        <h3 className="font-extrabold text-[17px] text-zinc-900 dark:text-zinc-100 leading-tight">
                          {branch.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-2 text-[12px] font-medium text-zinc-500 dark:text-zinc-400">
                          <Briefcase className="w-3.5 h-3.5 opacity-70" />
                          <span>{branch.managerName || "لا يوجد مدير مدخل"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Requirement Controls */}
                    <div className="flex flex-col items-end">
                      <UpdateRequirementControl 
                        required={required} 
                        assigned={assigned}
                        isUnderstaffed={isUnderstaffed}
                        isFull={isFull}
                        onChange={(val) => handleUpdateReq(branch.id, currentDayOfWeek, val)}
                      />
                    </div>
                  </div>

                  {/* Employees Workspace */}
                  <div className="bg-zinc-50/50 dark:bg-zinc-950/30 p-4 sm:p-5 border-t border-zinc-100/80 dark:border-zinc-800/80 min-h-[6rem] rounded-b-[28px]">
                    {assigned === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center py-6 opacity-60">
                        <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center mb-3 shadow-sm border border-zinc-100 dark:border-zinc-700">
                          <Users className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                        </div>
                        <span className="text-[13px] font-semibold text-zinc-500">
                          {isUnplanned ? "لم يتم تحديد احتياج لهذا اليوم" : "يجب توليد أو إضافة موظفين"}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {day?.assignedStaff?.map((entry) => (
                          <EmployeeRow 
                            key={entry.shiftId} 
                            entry={entry} 
                            onRemove={handleDeleteShift} 
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

      {/* ── FLOATING ACTION BAR ── */}
      {(!hasShifts || hasDrafts) && (
      <div className="fixed bottom-6 left-0 right-0 z-40 px-5 pointer-events-none">
        <div className="max-w-2xl mx-auto flex gap-3 pointer-events-auto bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl p-3 rounded-[28px] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.2)] border border-white/60 dark:border-zinc-700/60 ring-1 ring-black/5 dark:ring-white/5">
          
          {/* Generate Button (When 0 shifts) */}
          {!hasShifts && (
            <button
              onClick={() => handleAction("generate", () => generateWeeklySchedule(weekStart))}
              disabled={actionLoading !== null}
              className="flex-1 flex items-center justify-center gap-2.5 py-4 bg-zinc-900 dark:bg-brand-purple text-white rounded-[20px] text-[15px] font-bold shadow-lg shadow-zinc-900/20 dark:shadow-brand-purple/30 disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-95"
            >
              {actionLoading === "generate" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Wand2 className="w-5 h-5" />
              )}
              توليد الورديات تلقائياً
            </button>
          )}

          {/* Publish and Clear Buttons (When Drafts Exist) */}
          {hasDrafts && (
            <>
              <button
                onClick={() => handleAction("publish", () => publishSchedule(weekStart))}
                disabled={actionLoading !== null}
                className="flex-[3] flex items-center justify-center gap-2.5 py-4 bg-emerald-600 text-white rounded-[20px] text-[15px] font-bold shadow-lg shadow-emerald-600/25 disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-95"
              >
                {actionLoading === "publish" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                اعتماد ونشر الجدول
              </button>

              <button
                onClick={() => {
                  if (window.confirm("هل أنت متأكد من حذف جميع المسودات لهذا الأسبوع؟")) {
                    handleAction("clear", () => clearWeekDrafts(weekStart));
                  }
                }}
                disabled={actionLoading !== null}
                className="flex-1 flex items-center justify-center bg-rose-50 dark:bg-rose-500/10 text-rose-600 rounded-[20px] shadow-sm disabled:opacity-50 transition-all hover:bg-rose-100 hover:scale-[1.01] active:scale-95 border border-rose-100 dark:border-rose-500/20"
              >
                {actionLoading === "clear" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
              </button>
            </>
          )}

        </div>
      </div>
      )}

      {/* ── TOAST MESSAGES ── */}
      {toast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-2xl shadow-xl font-bold text-[15px] flex items-center gap-3 animate-in fade-in slide-in-from-top-6"
             style={{ 
               backgroundColor: toast.type === "success" ? "#10b981" : "#f43f5e", 
               color: "white" 
             }}>
          {toast.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          {toast.message}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Employee Row Component 
// ============================================================
function EmployeeRow({ entry, onRemove }: { entry: ScheduleEntry, onRemove: (id: string) => void }) {
  const isDraft = entry.status === "DRAFT";
  const isManager = entry.userRole === "MANAGER";
  
  return (
    <div className={`group flex items-center justify-between py-3 px-4 rounded-[20px] border transition-all ${
      isDraft 
        ? "bg-amber-50/60 border-amber-200/80 dark:bg-amber-500/5 dark:border-amber-500/20" 
        : "bg-white border-zinc-100 dark:bg-zinc-900 dark:border-zinc-700/60 shadow-sm"
    } hover:shadow flex-wrap sm:flex-nowrap gap-y-3`}>
      
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border ${
          isManager 
            ? "bg-brand-purple/10 border-brand-purple/20 text-brand-purple dark:bg-brand-purple/20" 
            : "bg-indigo-50 border-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400"
        }`}>
          {getInitials(entry.userName)}
        </div>
        
        {/* Detail Info */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[15px] text-zinc-900 dark:text-zinc-100">
              {entry.userName}
            </span>
            {isManager && (
               <span className="bg-brand-purple/10 text-brand-purple text-[10px] font-black px-2 py-0.5 rounded-lg border border-brand-purple/10">
                 مدير
               </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-zinc-500 dark:text-zinc-400 mt-1">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span dir="ltr" className="tracking-wide">{formatTime(entry.scheduledStart)} - {formatTime(entry.scheduledEnd)}</span>
          </div>
        </div>
      </div>

      {/* Right Side: Status Badge & Delete */}
      <div className="flex items-center gap-2.5 ml-auto sm:ml-0">
        <span className={`text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-2 border ${
          isDraft 
            ? "bg-amber-100/50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400"
            : "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400"
        }`}>
          <span className={`w-2 h-2 rounded-full ${isDraft ? "bg-amber-500" : "bg-emerald-500"}`} />
          {isDraft ? "مسودة" : "معتمد"}
        </span>

        {isDraft && (
          <button 
            onClick={() => onRemove(entry.shiftId)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors active:scale-95 border border-transparent hover:border-rose-100 dark:hover:border-rose-900/50"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
    </div>
  );
}

// ============================================================
// Expandable Requirement Control Panel
// ============================================================
function UpdateRequirementControl({ 
  required, 
  assigned, 
  isUnderstaffed, 
  isFull, 
  onChange 
}: { 
  required: number, 
  assigned: number, 
  isUnderstaffed: boolean, 
  isFull: boolean,
  onChange: (val: number) => void 
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (isOpen) {
    return (
      <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/80 p-1.5 rounded-[18px] animate-in zoom-in-95 duration-200 border border-zinc-200/60 dark:border-zinc-700">
        <button 
          onClick={() => onChange(Math.max(0, required - 1))}
          className="w-9 h-9 flex items-center justify-center bg-white dark:bg-zinc-700 rounded-[14px] shadow-sm active:scale-95 transition-transform"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="w-8 text-center font-bold text-[17px] text-zinc-900 dark:text-zinc-100">{required}</span>
        <button 
          onClick={() => onChange(required + 1)}
          className="w-9 h-9 flex items-center justify-center bg-brand-purple text-white rounded-[14px] shadow-sm shadow-brand-purple/30 active:scale-95 transition-transform"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button 
           onClick={() => setIsOpen(false)}
           className="w-9 h-9 flex items-center justify-center mr-1 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          <CheckCircle2 className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={() => setIsOpen(true)}
      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-[16px] text-xs font-bold transition-all active:scale-95 shadow-sm border ${
        isUnderstaffed 
          ? "bg-orange-50 text-orange-700 border-orange-200/80 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20" 
          : isFull 
          ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
          : "bg-white text-zinc-700 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700/80"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <Users className="w-4 h-4 opacity-80" />
        <span className="text-[13px]">المطلوب: {required}</span>
      </div>
      <span className="opacity-30 border-l h-3 mx-1"></span>
      <span className="text-[13px]">معين: {assigned}</span>
    </button>
  );
}