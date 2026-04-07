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
    <div className="min-h-screen pb-36">
      
      {/* ── HEADER BANNER ── */}
      <div className="gradient-purple px-6 py-7 sm:py-8 relative overflow-hidden">
        <div className="page-container relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-extrabold text-white mb-0.5">جدول الورديات</h1>
              <p className="text-white/60 text-sm">تخطيط وتوزيع الموظفين</p>
            </div>
            <div className="flex items-center gap-2">
              {isPending && <Loader2 className="w-5 h-5 animate-spin text-white/70" />}
              {hasShifts && !hasDrafts && (
                <button
                  onClick={() => {
                    if (window.confirm("سيتم إعادة توليد الورديات لأسبوعين للأماكن غير المغطاة. هل تريد الاستمرار؟")) {
                      handleAction("generate", () => generateWeeklySchedule(weekStart));
                    }
                  }}
                  disabled={actionLoading !== null}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white/20 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-all active:scale-95 hover:bg-white/30"
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

          {/* Week Selector - inline */}
          <div className="flex items-center gap-2 bg-white/15 rounded-2xl p-1.5">
            <button
              onClick={() => shiftWeek(-7)}
              className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center active:scale-95 transition-transform hover:bg-white/25"
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
            <label className="flex-1 text-center cursor-pointer relative">
              <span className="font-bold text-white text-sm">{data.weekLabel}</span>
              <input
                type="date"
                value={weekStart}
                onChange={(e) => { if (e.target.value) goToWeek(e.target.value); }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </label>
            <button
              onClick={() => shiftWeek(7)}
              className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center active:scale-95 transition-transform hover:bg-white/25"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <button 
              onClick={goToCurrentWeek}
              className="px-4 py-2.5 bg-white text-brand-purple font-bold text-xs rounded-xl active:scale-95 transition-all"
            >
              اليوم
            </button>
          </div>
        </div>
        <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-8 w-20 h-20 bg-white/5 rounded-full translate-y-1/3" />
      </div>

      {/* ── DAY PILLS (sticky) ── */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-zinc-200/50">
        <div className="page-container py-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 snap-x">
            {weekDays.map((dateStr, i) => {
              const date = new Date(dateStr);
              const dayNum = date.getDate();
              const dayIdx = date.getDay();
              const dayName = DAY_NAMES_SHORT_AR[dayIdx];
              const isSelected = i === selectedDay;
              const isDayToday = dateStr === todayStr;

              const dayShortages = data.branches.reduce((sum, b) => {
                const d = b.days.find((dd) => dd.date === dateStr);
                return sum + (d && d.shortage < 0 ? 1 : 0);
              }, 0);

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDay(i)}
                  className={`relative flex-shrink-0 snap-center flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all duration-200 ${
                    isSelected
                      ? "gradient-purple text-white shadow-purple-sm"
                      : isDayToday
                      ? "bg-brand-purple/8 border-2 border-brand-purple/30 text-brand-purple"
                      : "bg-zinc-50 border border-zinc-200/50 text-zinc-500 hover:bg-zinc-100"
                  }`}
                >
                  <span className={`text-[10px] font-bold mb-0.5 ${isSelected ? "text-white/80" : ""}`}>
                    {dayName}
                  </span>
                  <span className={`text-lg font-black ${isSelected ? "" : "text-foreground"}`}>
                    {dayNum}
                  </span>
                  {dayShortages > 0 && !isSelected && (
                    <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── DAY OVERVIEW & BRANCHES ── */}
      <div className="page-container py-6">
        
        {/* Selected Day Header */}
        <div className="flex items-center justify-between mb-5 px-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-extrabold text-foreground">
              {DAY_NAMES_AR[currentDayOfWeek]}
            </h2>
            <span className="text-sm text-muted">
              {new Date(currentDate).toLocaleDateString("ar-SA", { day: "numeric", month: "long" })}
            </span>
          </div>
          {isToday && (
            <span className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg">
              اليوم
            </span>
          )}
        </div>

        {/* Branches Feed */}
        {data.branches.length === 0 ? (
          <div className="card p-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mb-4">
              <Briefcase className="w-7 h-7 text-zinc-300" />
            </div>
            <h3 className="text-base text-foreground font-bold mb-1">لا توجد فروع</h3>
            <p className="text-sm text-muted max-w-[280px]">
              يرجى إضافة فروع من الإعدادات للبدء بجدولة وتوزيع الموظفين.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.branches.map((branch) => {
              const day = branch.days.find((d) => d.date === currentDate);
              const required = day?.requiredStaff ?? 0;
              const assigned = day?.assignedStaff?.length ?? 0;
              
              const isUnderstaffed = assigned < required && required > 0;
              const isFull = assigned >= required && required > 0;
              const isUnplanned = required === 0 && assigned === 0;
              const isOverstaffed = assigned > required && required > 0;

              return (
                <div 
                  key={branch.id}
                  className="bg-white rounded-2xl border border-zinc-200/50 overflow-hidden shadow-sm"
                >
                  {/* Branch Header */}
                  <div className="p-5 sm:p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        isUnderstaffed 
                          ? "bg-gradient-to-br from-orange-400 to-orange-500 text-white" 
                          : isFull || isOverstaffed 
                          ? "bg-gradient-to-br from-emerald-400 to-emerald-500 text-white"
                          : "bg-zinc-100 text-zinc-400"
                      }`}>
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-foreground">{branch.name}</h3>
                        <span className="text-xs text-muted">{branch.managerName || "بدون مدير"}</span>
                      </div>
                    </div>

                    <UpdateRequirementControl 
                      required={required} 
                      assigned={assigned}
                      isUnderstaffed={isUnderstaffed}
                      isFull={isFull}
                      onChange={(val) => handleUpdateReq(branch.id, currentDayOfWeek, val)}
                    />
                  </div>

                  {/* Employees */}
                  <div className="bg-zinc-50/50 p-4 sm:p-5 border-t border-zinc-100 min-h-[6rem]">
                    {assigned === 0 ? (
                      <div className="flex flex-col items-center justify-center py-6 text-center">
                        <Users className="w-6 h-6 text-zinc-300 mb-2" />
                        <span className="text-xs font-medium text-zinc-400">
                          {isUnplanned ? "لم يتم تحديد احتياج لهذا اليوم" : "يجب توليد أو إضافة موظفين"}
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2">
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
        <div className="page-container flex gap-2 pointer-events-auto bg-white/95 backdrop-blur-xl p-3 rounded-2xl shadow-2xl border border-zinc-200/40">
          
          {/* Generate Button */}
          {!hasShifts && (
            <button
              onClick={() => handleAction("generate", () => generateWeeklySchedule(weekStart))}
              disabled={actionLoading !== null}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 gradient-purple text-white rounded-xl text-sm font-bold shadow-purple-sm disabled:opacity-50 transition-all active:scale-95"
            >
              {actionLoading === "generate" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              توليد الورديات لأسبوعين
            </button>
          )}

          {/* Publish and Clear */}
          {hasDrafts && (
            <>
              <button
                onClick={() => handleAction("publish", () => publishSchedule(weekStart))}
                disabled={actionLoading !== null}
                className="flex-[3] flex items-center justify-center gap-2 py-3.5 bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/25 disabled:opacity-50 transition-all active:scale-95"
              >
                {actionLoading === "publish" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                اعتماد ونشر
              </button>

              <button
                onClick={() => {
                  if (window.confirm("هل أنت متأكد من حذف جميع المسودات لهذين الأسبوعين؟")) {
                    handleAction("clear", () => clearWeekDrafts(weekStart));
                  }
                }}
                disabled={actionLoading !== null}
                className="w-12 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl disabled:opacity-50 transition-all active:scale-95 border border-rose-100"
              >
                {actionLoading === "clear" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </>
          )}

        </div>
      </div>
      )}

      {/* ── WARNINGS MODAL ── */}
      {showWarnings && warnings.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-zinc-200/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="font-bold text-base text-foreground">تنبيهات الحد الأدنى</h3>
              </div>
              <button onClick={() => setShowWarnings(false)} className="w-8 h-8 rounded-lg hover:bg-zinc-100 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {warnings.map((w, i) => (
                <div key={i} className="text-sm text-zinc-600 bg-amber-50 px-3 py-2 rounded-lg">
                  {w}
                </div>
              ))}
            </div>
            <button onClick={() => setShowWarnings(false)} className="mt-4 w-full py-2.5 gradient-purple text-white rounded-xl font-bold text-sm shadow-purple-sm">
              حسناً
            </button>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-2xl font-bold text-sm flex items-center gap-2"
             style={{ 
               backgroundColor: toast.type === "success" ? "#10b981" : "#f43f5e", 
               color: "white" 
             }}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
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
    <div className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all ${
      isDraft 
        ? "bg-amber-50 border border-amber-200/50" 
        : "bg-white border border-zinc-100"
    }`}>
      {/* Avatar */}
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
        isManager 
          ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white" 
          : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
      }`}>
        {getInitials(entry.userName)}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground truncate">{entry.userName}</span>
          {isManager && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-brand-purple/10 text-brand-purple rounded">مدير</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted mt-0.5">
          <Clock className="w-3 h-3" />
          <span dir="ltr">{formatTime(entry.scheduledStart)} - {formatTime(entry.scheduledEnd)}</span>
        </div>
      </div>

      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
        isDraft ? "bg-amber-100 text-amber-700" : "bg-emerald-50 text-emerald-700"
      }`}>
        {isDraft ? "مسودة" : "معتمد"}
      </span>

      {isDraft && (
        <button 
          onClick={() => onRemove(entry.shiftId)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
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
      <div className="flex items-center gap-1.5 bg-zinc-100 p-1.5 rounded-xl">
        <button 
          onClick={() => onChange(Math.max(0, required - 1))}
          className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm active:scale-95 transition-transform"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="w-8 text-center font-bold text-base text-foreground">{required}</span>
        <button 
          onClick={() => onChange(required + 1)}
          className="w-8 h-8 flex items-center justify-center gradient-purple text-white rounded-lg shadow-sm active:scale-95 transition-transform"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button 
           onClick={() => setIsOpen(false)}
           className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-foreground"
        >
          <CheckCircle2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={() => setIsOpen(true)}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
        isUnderstaffed 
          ? "bg-orange-50 text-orange-700 border border-orange-200/50" 
          : isFull 
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50"
          : "bg-zinc-50 text-zinc-600 border border-zinc-200/50"
      }`}
    >
      <Users className="w-3.5 h-3.5" />
      <span>{assigned}/{required}</span>
    </button>
  );
}