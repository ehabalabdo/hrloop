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
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showWarnings, setShowWarnings] = useState(false);

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
    actionFn: () => Promise<{ success: boolean; message: string; warnings?: string[] }>
  ) => {
    setActionLoading(actionName);
    try {
      const r = await actionFn();
      showToast(r.message, r.success ? "success" : "error");
      if (r.warnings && r.warnings.length > 0) {
        setWarnings(r.warnings);
        setShowWarnings(true);
      }
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
    <div className="min-h-screen pb-36 font-sans">
      
      {/* ── STICKY TOP NAVIGATION & CALENDAR ── */}
      <div className="glass-strong sticky top-0 z-30">
        <div className="page-container pt-7 pb-7">
          
          {/* Header Row */}
          <div className="flex items-center justify-between mb-7">
            <div className="flex items-center gap-4">
              <div className="w-13 h-13 gradient-purple rounded-2xl flex items-center justify-center shadow-purple-sm" style={{ width: '52px', height: '52px' }}>
                <CalendarDays className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-foreground tracking-tight">
                  جدول الورديات
                </h1>
                <p className="text-sm text-muted font-medium mt-1">
                  تخطيط وتوزيع الموظفين
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isPending && <Loader2 className="w-5 h-5 animate-spin text-brand-purple" />}
              {hasShifts && !hasDrafts && (
                <button
                  onClick={() => {
                    if (window.confirm("سيتم إعادة توليد الورديات لأسبوعين للأماكن غير المغطاة. هل تريد الاستمرار؟")) {
                      handleAction("generate", () => generateWeeklySchedule(weekStart));
                    }
                  }}
                  disabled={actionLoading !== null}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white/40 text-zinc-700 rounded-xl text-[12px] font-bold shadow-sm disabled:opacity-50 transition-all active:scale-95 border border-white/30 hover:bg-white/60"
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
          <div className="flex items-center bg-white/30 rounded-2xl p-2 mb-7 border border-white/30 relative overflow-hidden gap-2">
            <button
              onClick={() => shiftWeek(-7)}
              className="p-3 bg-white/60 shadow-sm rounded-xl active:scale-95 transition-transform"
            >
              <ChevronRight className="w-4 h-4 text-muted" />
            </button>

            {/* Clickable week label — opens native date picker */}
            <label className="flex-[2] text-center cursor-pointer relative">
              <span className="font-bold text-foreground text-base">
                {data.weekLabel}
              </span>
              <span className="block text-xs text-brand-purple font-semibold mt-1">اضغط لاختيار أسبوع</span>
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
              className="p-3 bg-white/60 shadow-sm rounded-xl active:scale-95 transition-transform"
            >
              <ChevronLeft className="w-4 h-4 text-muted" />
            </button>
            
            <button 
              onClick={goToCurrentWeek}
              className="mr-2 px-4 py-3 bg-brand-purple/10 text-brand-purple font-bold text-xs rounded-xl active:scale-95 transition-all outline-dashed outline-1 outline-brand-purple/20 flex-1 hover:bg-brand-purple/15"
            >
              اليوم
            </button>
          </div>

          {/* Day Cards (horizontal scroll) */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-2 px-2 snap-x">
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
                  className={`relative flex-shrink-0 snap-center flex flex-col items-center justify-center w-[72px] h-[86px] rounded-2xl transition-all duration-200 ${
                    isSelected
                      ? "gradient-purple text-white shadow-purple scale-105 z-10"
                      : isDayToday
                      ? "bg-brand-purple/5 border border-brand-purple/30 text-brand-purple"
                      : "glass border border-white/40 text-muted hover:bg-white/50"
                  }`}
                >
                  <span className={`text-xs font-semibold mb-1.5 ${isSelected ? "opacity-90" : ""}`}>
                    {dayName}
                  </span>
                  <span className={`text-xl font-black ${isSelected ? "" : "text-foreground"}`}>
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
      <div className="page-container py-10">
        
        {/* Selected Day Header */}
        <div className="flex items-center justify-between mb-8 px-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-extrabold text-foreground tracking-tight">
              {DAY_NAMES_AR[currentDayOfWeek]}
            </h2>
            <span className="text-base font-medium text-muted">
              {new Date(currentDate).toLocaleDateString("ar-SA", { day: "numeric", month: "long" })}
            </span>
          </div>
          {isToday && (
            <span className="px-3.5 py-1.5 bg-emerald-50/70 text-emerald-700 text-xs font-extrabold rounded-full uppercase tracking-wider border border-emerald-100/50 shadow-sm">
              اليوم الحالي
            </span>
          )}
        </div>

        {/* Branches Feed */}
        {data.branches.length === 0 ? (
          <div className="card p-12 flex flex-col items-center text-center">
            <div className="w-18 h-18 bg-white/50 rounded-full flex items-center justify-center mb-5 border border-white/40" style={{ width: '72px', height: '72px' }}>
              <Briefcase className="w-9 h-9 text-muted-light" />
            </div>
            <h3 className="text-lg text-foreground font-bold mb-2">لا توجد فروع</h3>
            <p className="text-base text-zinc-500 max-w-[280px] leading-relaxed">
              يرجى إضافة فروع من الإعدادات للبدء بجدولة وتوزيع الموظفين.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
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
                  className={`card overflow-visible transition-all duration-300 relative ${
                    isUnderstaffed 
                      ? "border-orange-200/50" 
                      : isFull || isOverstaffed
                      ? "border-emerald-200/50"
                      : ""
                  }`}
                >
                  {/* Decorative Status Accent */}
                  <div className={`absolute top-0 right-10 left-10 h-[3px] rounded-b-full ${
                    isUnderstaffed ? "bg-orange-400/50" : isFull ? "bg-emerald-400/50" : "bg-transparent"
                  }`} />

                  {/* Branch Header */}
                  <div className="p-6 sm:p-7 flex items-start justify-between">
                    <div className="flex items-center gap-5">
                      {/* Branch Icon */}
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                        isUnderstaffed 
                          ? "bg-gradient-to-br from-orange-50/70 to-orange-100/70 border-orange-200/50 text-orange-600" 
                          : isFull || isOverstaffed 
                          ? "bg-gradient-to-br from-emerald-50/70 to-emerald-100/70 border-emerald-200/50 text-emerald-600"
                          : "bg-gradient-to-br from-white/60 to-white/30 border-white/40 text-zinc-500"
                      }`}>
                        <Building2 className="w-6 h-6" strokeWidth={2.5} />
                      </div>
                      
                      {/* Title & Subtitle */}
                      <div>
                        <h3 className="font-extrabold text-lg text-foreground leading-tight">
                          {branch.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-2.5 text-sm font-medium text-muted">
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
                  <div className="bg-white/30 p-5 sm:p-6 border-t border-white/30 min-h-[7rem] rounded-b-2xl">
                    {assigned === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center py-8 opacity-60">
                        <div className="w-14 h-14 bg-white/50 rounded-full flex items-center justify-center mb-3.5 border border-white/40">
                          <Users className="w-6 h-6 text-muted-light" />
                        </div>
                        <span className="text-sm font-semibold text-zinc-500">
                          {isUnplanned ? "لم يتم تحديد احتياج لهذا اليوم" : "يجب توليد أو إضافة موظفين"}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3.5">
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
        <div className="page-container flex gap-3 pointer-events-auto glass-strong p-3.5 rounded-2xl shadow-purple">
          
          {/* Generate Button (When 0 shifts) */}
          {!hasShifts && (
            <button
              onClick={() => handleAction("generate", () => generateWeeklySchedule(weekStart))}
              disabled={actionLoading !== null}
              className="flex-1 flex items-center justify-center gap-2.5 py-4 gradient-purple text-white rounded-xl text-base font-bold shadow-purple disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-95"
            >
              {actionLoading === "generate" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Wand2 className="w-5 h-5" />
              )}
              توليد الورديات لأسبوعين
            </button>
          )}

          {/* Publish and Clear Buttons (When Drafts Exist) */}
          {hasDrafts && (
            <>
              <button
                onClick={() => handleAction("publish", () => publishSchedule(weekStart))}
                disabled={actionLoading !== null}
                className="flex-[3] flex items-center justify-center gap-2.5 py-4 bg-emerald-600 text-white rounded-xl text-base font-bold shadow-lg shadow-emerald-600/25 disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-95"
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
                  if (window.confirm("هل أنت متأكد من حذف جميع المسودات لهذين الأسبوعين؟")) {
                    handleAction("clear", () => clearWeekDrafts(weekStart));
                  }
                }}
                disabled={actionLoading !== null}
                className="flex-1 flex items-center justify-center bg-rose-50/70 text-rose-600 rounded-xl shadow-sm disabled:opacity-50 transition-all hover:bg-rose-100/70 hover:scale-[1.01] active:scale-95 border border-rose-100/50"
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

      {/* ── WARNINGS MODAL ── */}
      {showWarnings && warnings.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="glass-strong rounded-3xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-lg text-foreground">تنبيهات الحد الأدنى</h3>
              </div>
              <button onClick={() => setShowWarnings(false)} className="p-1.5 rounded-xl hover:bg-surface-hover transition-colors">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {warnings.map((w, i) => (
                <div key={i} className="text-[13px] text-zinc-700 bg-amber-50/60 px-3 py-2 rounded-xl border border-amber-200/40">
                  {w}
                </div>
              ))}
            </div>
            <button onClick={() => setShowWarnings(false)} className="mt-4 w-full py-2.5 gradient-purple text-white rounded-xl font-bold text-[14px] shadow-purple-sm">
              حسناً
            </button>
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
    <div className={`group flex items-center justify-between py-4 px-5 rounded-2xl border transition-all ${
      isDraft 
        ? "bg-amber-50/40 border-amber-200/50" 
        : "glass border-white/40"
    } hover:shadow flex-wrap sm:flex-nowrap gap-y-3`}>
      
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border ${
          isManager 
            ? "bg-brand-purple/10 border-brand-purple/20 text-brand-purple" 
            : "bg-indigo-50/60 border-indigo-100/50 text-indigo-700"
        }`}>
          {getInitials(entry.userName)}
        </div>
        
        {/* Detail Info */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-base text-foreground">
              {entry.userName}
            </span>
            {isManager && (
               <span className="bg-brand-purple/10 text-brand-purple text-xs font-black px-2 py-0.5 rounded-lg border border-brand-purple/10">
                 مدير
               </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-muted mt-1.5">
            <Clock className="w-4 h-4 text-zinc-400" />
            <span dir="ltr" className="tracking-wide">{formatTime(entry.scheduledStart)} - {formatTime(entry.scheduledEnd)}</span>
          </div>
        </div>
      </div>

      {/* Right Side: Status Badge & Delete */}
      <div className="flex items-center gap-2.5 ml-auto sm:ml-0">
        <span className={`text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-2 border ${
          isDraft 
            ? "bg-amber-100/40 text-amber-700 border-amber-200/50"
            : "bg-emerald-50/60 text-emerald-700 border-emerald-100/50"
        }`}>
          <span className={`w-2 h-2 rounded-full ${isDraft ? "bg-amber-500" : "bg-emerald-500"}`} />
          {isDraft ? "مسودة" : "معتمد"}
        </span>

        {isDraft && (
          <button 
            onClick={() => onRemove(entry.shiftId)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-50/60 transition-colors active:scale-95 border border-transparent hover:border-rose-100/50"
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
      <div className="flex items-center gap-2 bg-white/40 p-2 rounded-2xl animate-in zoom-in-95 duration-200 border border-white/30">
        <button 
          onClick={() => onChange(Math.max(0, required - 1))}
          className="w-10 h-10 flex items-center justify-center bg-white/60 rounded-xl shadow-sm active:scale-95 transition-transform"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="w-9 text-center font-bold text-lg text-foreground">{required}</span>
        <button 
          onClick={() => onChange(required + 1)}
          className="w-10 h-10 flex items-center justify-center bg-brand-purple text-white rounded-xl shadow-sm shadow-brand-purple/30 active:scale-95 transition-transform"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button 
           onClick={() => setIsOpen(false)}
           className="w-10 h-10 flex items-center justify-center mr-1 text-zinc-400 hover:text-zinc-800"
        >
          <CheckCircle2 className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={() => setIsOpen(true)}
      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm border ${
        isUnderstaffed 
          ? "bg-orange-50/60 text-orange-700 border-orange-200/50" 
          : isFull 
          ? "bg-emerald-50/60 text-emerald-700 border-emerald-200/50"
          : "bg-white/50 text-zinc-700 border-white/40"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <Users className="w-4 h-4 opacity-80" />
        <span className="text-sm">المطلوب: {required}</span>
      </div>
      <span className="opacity-30 border-l h-3 mx-1"></span>
      <span className="text-sm">معين: {assigned}</span>
    </button>
  );
}