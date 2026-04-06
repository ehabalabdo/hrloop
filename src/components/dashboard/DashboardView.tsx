"use client";

// ============================================================
// Executive Dashboard — Compact Redesign
// Icon+number KPIs, dense branch list, minimal activity feed
// ============================================================

import {
  Users,
  Building2,
  DollarSign,
  TrendingUp,
  Timer,
  TreePalm,
  CheckCircle2,
  Activity,
  Wifi,
  WifiOff,
  Download,
  Trophy,
  Clock,
  UserX,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

import type {
  DashboardMetrics,
  BranchPerformance,
  ActivityLogItem,
  OvertimeAlert,
} from "@/lib/dashboard-types";
import { downloadCSV } from "@/lib/csv-export";

interface DashboardViewProps {
  metrics: DashboardMetrics;
  branches: BranchPerformance[];
  activities: ActivityLogItem[];
  overtimeAlerts: OvertimeAlert[];
  health: {
    database: boolean;
    timestamp: string;
    userCount: number;
    branchCount: number;
  };
}

function formatCurrency(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `${mins}د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}س`;
  return `${Math.floor(hrs / 24)}ي`;
}

export default function DashboardView({
  metrics,
  branches,
  activities,
  health,
  overtimeAlerts,
}: DashboardViewProps) {
  const [showAllBranches, setShowAllBranches] = useState(false);
  const [showChart, setShowChart] = useState(false);

  const chartData = [...branches]
    .sort((a, b) => b.lateFrequency - a.lateFrequency)
    .slice(0, 15)
    .map((b) => ({
      name: b.name.length > 10 ? b.name.slice(0, 10) + "…" : b.name,
      lateFrequency: b.lateFrequency,
    }));

  const rankedBranches = [...branches].sort(
    (a, b) => b.attendanceScore - a.attendanceScore
  );
  const visibleBranches = showAllBranches ? rankedBranches : rankedBranches.slice(0, 5);

  const handleExportBranches = () => {
    downloadCSV(
      rankedBranches.map((b: BranchPerformance) => ({
        Branch: b.name,
        Employees: b.employeeCount,
        "Total Shifts": b.totalShifts,
        "Late Frequency": b.lateFrequency,
        "Late Minutes": b.totalLateMinutes,
        Absences: b.totalAbsences,
        "Attendance Score": b.attendanceScore,
      })),
      "branch-performance"
    );
  };

  return (
    <div className="min-h-screen bg-background pb-28 font-sans">
      {/* ─── Header ─── */}
      <div className="bg-surface border-b border-border-main sticky top-0 z-20 shadow-[0_2px_16px_-6px_rgba(0,0,0,0.06)]">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-purple to-brand-purple-dark rounded-xl flex items-center justify-center shadow-lg shadow-brand-purple/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">
                لوحة التحكم
              </h1>
              <p className="text-xs text-muted font-medium">
                نظرة شاملة على جميع الفروع
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-full border ${
            health.database
              ? "text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400"
              : "text-rose-600 bg-rose-50 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400"
          }`}>
            {health.database ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {health.database ? "متصل" : "غير متصل"}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-5 space-y-4">
        
        {/* ─── Compact KPI Strip ─── */}
        <div className="bg-surface rounded-2xl border border-border-main shadow-sm overflow-hidden">
          <div className="grid grid-cols-5 divide-x divide-border-main rtl:divide-x-reverse">
            {/* Staff */}
            <KpiCell icon={Users} value={metrics.totalStaff} label="موظفين" color="text-brand-purple" bg="bg-brand-purple/10" />
            {/* Active Today */}
            <KpiCell icon={Timer} value={metrics.activeToday} label="متصل" color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-500/10" sub={`${metrics.todayAttendancePct}%`} />
            {/* Payroll */}
            <KpiCell icon={DollarSign} value={`$${formatCurrency(metrics.monthlyPayrollCost)}`} label="رواتب" color="text-amber-600" bg="bg-amber-50 dark:bg-amber-500/10" />
            {/* Branches */}
            <KpiCell icon={Building2} value={metrics.totalBranches} label="فروع" color="text-blue-600" bg="bg-blue-50 dark:bg-blue-500/10" />
            {/* Pending Leaves */}
            <KpiCell icon={TreePalm} value={metrics.pendingLeaves} label="إجازات" color="text-orange-600" bg="bg-orange-50 dark:bg-orange-500/10" />
          </div>
        </div>

        {/* ─── Overtime Alerts ─── */}
        {overtimeAlerts.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-500/5 rounded-2xl border border-amber-200/70 dark:border-amber-500/20 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-amber-200/50 dark:border-amber-500/15 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-bold text-amber-800 dark:text-amber-300">
                تنبيه: تجاوز ٤٠ ساعة أسبوعياً
              </span>
              <span className="mr-auto text-xs font-bold text-amber-600/70 dark:text-amber-400/60 bg-amber-100 dark:bg-amber-500/10 px-2 py-0.5 rounded-full">
                {overtimeAlerts.length}
              </span>
            </div>
            <div className="divide-y divide-amber-200/40 dark:divide-amber-500/10">
              {overtimeAlerts.map((alert: OvertimeAlert) => (
                <div key={alert.userId} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-amber-200/60 dark:bg-amber-500/15 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-amber-900 dark:text-amber-200 truncate">
                      {alert.fullName}
                    </p>
                    <p className="text-xs text-amber-700/70 dark:text-amber-400/60">
                      {alert.branchName}
                    </p>
                  </div>
                  <span className="text-[14px] font-bold text-amber-700 dark:text-amber-300 shrink-0">
                    {alert.weeklyHours}<span className="text-xs font-bold mr-0.5">س</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Top Branches Podium (mini) ─── */}
        {metrics.topPerfectBranches.length > 0 && (
          <div className="bg-surface rounded-2xl border border-border-main shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-bold text-muted uppercase tracking-wider">
                أفضل الفروع
              </span>
            </div>
            <div className="flex gap-2">
              {metrics.topPerfectBranches.map(
                (branch: { name: string; score: number }, idx: number) => (
                  <div
                    key={branch.name}
                    className={`flex-1 flex items-center gap-2.5 py-2.5 px-3 rounded-xl border ${
                      idx === 0
                        ? "bg-amber-50/60 border-amber-200/60 dark:bg-amber-500/5 dark:border-amber-500/20"
                        : idx === 1
                        ? "bg-zinc-50 border-zinc-200/60 dark:bg-surface-hover dark:border-zinc-700/50"
                        : "bg-orange-50/60 border-orange-200/60 dark:bg-orange-500/5 dark:border-orange-500/20"
                    }`}
                  >
                    <span className={`text-sm font-bold ${
                      idx === 0 ? "text-amber-500" : idx === 1 ? "text-zinc-400" : "text-orange-400"
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-foreground truncate">
                        {branch.name}
                      </div>
                      <div className={`text-xs font-bold ${
                        idx === 0 ? "text-amber-600" : idx === 1 ? "text-zinc-500" : "text-orange-500"
                      }`}>
                        {branch.score}%
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* ─── Branch Ranking (Dense) ─── */}
        <div className="bg-surface rounded-2xl border border-border-main shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border-main flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">
              ترتيب الفروع
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowChart(!showChart)}
                className={`p-1.5 rounded-lg transition-colors ${showChart ? "bg-brand-purple/10 text-brand-purple" : "bg-surface-hover text-zinc-400 hover:text-zinc-600"}`}
                title="رسم بياني"
              >
                <BarChart3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleExportBranches}
                className="p-1.5 rounded-lg bg-surface-hover text-zinc-400 hover:text-brand-purple transition-colors"
                title="تصدير CSV"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Chart (collapsible) */}
          {showChart && chartData.length > 0 && (
            <div className="px-4 py-3 border-b border-border-main bg-background/30">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#a1a1aa" }} angle={-25} textAnchor="end" height={45} />
                  <YAxis tick={{ fontSize: 9, fill: "#a1a1aa" }} allowDecimals={false} width={25} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #3f3f46",
                      borderRadius: "8px",
                      fontSize: "11px",
                      color: "#e4e4e7",
                    }}
                  />
                  <Bar dataKey="lateFrequency" radius={[3, 3, 0, 0]}>
                    {chartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={index < 3 ? "#EC008C" : index < 7 ? "#FA9D27" : "#6E329F"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Dense Branch Rows */}
          {rankedBranches.length === 0 ? (
            <div className="px-4 py-10 text-center text-zinc-400 text-sm">
              لا توجد بيانات فروع
            </div>
          ) : (
            <div className="divide-y divide-zinc-100/80 dark:divide-zinc-800/50">
              {visibleBranches.map((b: BranchPerformance, idx: number) => (
                <div key={b.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors">
                  {/* Rank */}
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    idx === 0 ? "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                    : idx === 1 ? "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                    : idx === 2 ? "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400"
                    : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
                  }`}>
                    {idx + 1}
                  </span>

                  {/* Name */}
                  <span className="flex-1 text-sm font-bold text-foreground truncate min-w-0">
                    {b.name}
                  </span>

                  {/* Compact stat pills */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <StatPill icon={Users} value={b.employeeCount} />
                    <StatPill icon={CalendarCheck} value={b.totalShifts} />
                    <StatPill icon={Clock} value={b.lateFrequency} warn={b.lateFrequency > 0} />
                    <StatPill icon={UserX} value={b.totalAbsences} warn={b.totalAbsences > 0} />
                  </div>

                  {/* Score */}
                  <span className={`text-sm font-bold w-10 text-left shrink-0 ${
                    b.attendanceScore >= 80 ? "text-emerald-600 dark:text-emerald-400"
                    : b.attendanceScore >= 60 ? "text-amber-600 dark:text-amber-400"
                    : "text-rose-600 dark:text-rose-400"
                  }`}>
                    {b.attendanceScore}%
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Show more/less */}
          {rankedBranches.length > 5 && (
            <button
              onClick={() => setShowAllBranches(!showAllBranches)}
              className="w-full px-4 py-2.5 text-center text-sm font-bold text-brand-purple hover:bg-brand-purple/5 transition-colors flex items-center justify-center gap-1 border-t border-border-main"
            >
              {showAllBranches ? (
                <><ChevronUp className="w-3.5 h-3.5" /> عرض أقل</>
              ) : (
                <><ChevronDown className="w-3.5 h-3.5" /> عرض الكل ({rankedBranches.length})</>
              )}
            </button>
          )}
        </div>

        {/* ─── Activity Feed (Compact) ─── */}
        <div className="bg-surface rounded-2xl border border-border-main shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border-main flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-purple" />
            <span className="text-sm font-bold text-foreground">
              النشاط الأخير
            </span>
          </div>
          {activities.length === 0 ? (
            <div className="px-4 py-8 text-center text-zinc-400 text-sm">
              لا يوجد نشاط حديث
            </div>
          ) : (
            <div className="divide-y divide-border-main">
              {activities.slice(0, 10).map((a: ActivityLogItem) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-purple/60 shrink-0" />
                  <p className="flex-1 text-sm text-muted truncate min-w-0">
                    <span className="font-bold text-foreground">{a.actorName}</span>{" "}
                    {a.description}
                  </p>
                  <span className="text-xs text-zinc-400 font-semibold shrink-0">
                    {timeAgo(a.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ============================================================
// Compact KPI Cell
// ============================================================
function KpiCell({ icon: Icon, value, label, color, bg, sub }: {
  icon: React.ComponentType<{ className?: string }>;
  value: string | number;
  label: string;
  color: string;
  bg: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col items-center py-4 px-2 gap-1.5">
      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <span className={`text-lg font-bold ${color} leading-none`}>{value}</span>
      <span className="text-xs text-muted-light font-semibold leading-none">{label}</span>
      {sub && <span className={`text-xs font-bold ${color} opacity-60 leading-none -mt-0.5`}>{sub}</span>}
    </div>
  );
}

// ============================================================
// Tiny Stat Pill for branch rows
// ============================================================
function StatPill({ icon: Icon, value, warn }: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  warn?: boolean;
}) {
  return (
    <div className={`flex items-center gap-1 px-1.5 py-1 rounded-lg text-xs font-bold ${
      warn
        ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
    }`}>
      <Icon className="w-3 h-3" />
      {value}
    </div>
  );
}
