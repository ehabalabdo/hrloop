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
    <div className="min-h-screen pb-28 font-sans">
      {/* ─── Header ─── */}
      <div className="glass-strong sticky top-0 z-20">
        <div className="page-container py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 gradient-purple rounded-2xl flex items-center justify-center shadow-purple-sm">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                لوحة التحكم
              </h1>
              <p className="text-sm text-muted font-medium mt-0.5">
                نظرة شاملة على جميع الفروع
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-full border ${
            health.database
              ? "text-emerald-600 bg-emerald-50/80 border-emerald-200/50"
              : "text-rose-600 bg-rose-50/80 border-rose-200/50"
          }`}>
            {health.database ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {health.database ? "متصل" : "غير متصل"}
          </div>
        </div>
      </div>

      <div className="page-container py-8 section-gap">
        
        {/* ─── KPI Cards Grid ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCell icon={Users} value={metrics.totalStaff} label="موظفين" color="text-brand-purple" bg="gradient-purple-soft" />
          <KpiCell icon={Timer} value={metrics.activeToday} label="متصل اليوم" color="text-emerald-600" bg="bg-emerald-50/60" sub={`${metrics.todayAttendancePct}%`} />
          <KpiCell icon={DollarSign} value={`$${formatCurrency(metrics.monthlyPayrollCost)}`} label="الرواتب الشهرية" color="text-amber-600" bg="bg-amber-50/60" />
          <KpiCell icon={Building2} value={metrics.totalBranches} label="الفروع" color="text-blue-600" bg="bg-blue-50/60" />
          <KpiCell icon={TreePalm} value={metrics.pendingLeaves} label="طلبات الإجازة" color="text-orange-600" bg="bg-orange-50/60" />
        </div>

        {/* ─── Overtime Alerts ─── */}
        {overtimeAlerts.length > 0 && (
          <div className="bg-amber-50/70 backdrop-blur-sm rounded-2xl border border-amber-200/50 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-amber-200/30 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-bold text-amber-800">
                تنبيه: تجاوز ٤٠ ساعة أسبوعياً
              </span>
              <span className="mr-auto text-xs font-bold text-amber-600/70 bg-amber-100/60 px-2 py-0.5 rounded-full">
                {overtimeAlerts.length}
              </span>
            </div>
            <div className="divide-y divide-amber-200/30">
              {overtimeAlerts.map((alert: OvertimeAlert) => (
                <div key={alert.userId} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-amber-200/40 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-amber-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-amber-900 truncate">
                      {alert.fullName}
                    </p>
                    <p className="text-xs text-amber-700/70">
                      {alert.branchName}
                    </p>
                  </div>
                  <span className="text-[14px] font-bold text-amber-700 shrink-0">
                    {alert.weeklyHours}<span className="text-xs font-bold mr-0.5">س</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Top Branches Podium (mini) ─── */}
        {metrics.topPerfectBranches.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-amber-500" />
              <span className="text-base font-bold text-foreground">
                أفضل الفروع
              </span>
            </div>
            <div className="flex gap-3">
              {metrics.topPerfectBranches.map(
                (branch: { name: string; score: number }, idx: number) => (
                  <div
                    key={branch.name}
                    className={`flex-1 flex items-center gap-3 py-4 px-4 rounded-xl border ${
                      idx === 0
                        ? "bg-amber-50/50 border-amber-200/40"
                        : idx === 1
                        ? "bg-white/40 border-white/40"
                        : "bg-orange-50/50 border-orange-200/40"
                    }`}
                  >
                    <span className={`text-lg font-bold ${
                      idx === 0 ? "text-amber-500" : idx === 1 ? "text-zinc-400" : "text-orange-400"
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-foreground truncate">
                        {branch.name}
                      </div>
                      <div className={`text-sm font-bold mt-0.5 ${
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
        <div className="card overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/30 flex items-center justify-between">
            <span className="text-base font-bold text-foreground">
              ترتيب الفروع
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowChart(!showChart)}
                className={`p-1.5 rounded-lg transition-colors ${showChart ? "bg-brand-purple/10 text-brand-purple" : "bg-white/40 text-zinc-400 hover:text-zinc-600"}`}
                title="رسم بياني"
              >
                <BarChart3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleExportBranches}
                className="p-1.5 rounded-lg bg-white/40 text-zinc-400 hover:text-brand-purple transition-colors"
                title="تصدير CSV"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Chart (collapsible) */}
          {showChart && chartData.length > 0 && (
            <div className="px-4 py-3 border-b border-white/30 bg-white/20">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#c4b5fd" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#6b7280" }} angle={-25} textAnchor="end" height={45} />
                  <YAxis tick={{ fontSize: 9, fill: "#6b7280" }} allowDecimals={false} width={25} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255,255,255,0.9)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(139,92,246,0.2)",
                      borderRadius: "12px",
                      fontSize: "11px",
                      color: "#1e1b4b",
                    }}
                  />
                  <Bar dataKey="lateFrequency" radius={[3, 3, 0, 0]}>
                    {chartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={index < 3 ? "#a855f7" : index < 7 ? "#c084fc" : "#7c3aed"} />
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
            <div className="divide-y divide-white/30">
              {visibleBranches.map((b: BranchPerformance, idx: number) => (
                <div key={b.id} className="flex items-center gap-4 px-6 py-4 hover:bg-surface-hover transition-colors">
                  {/* Rank */}
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    idx === 0 ? "bg-amber-100/70 text-amber-600"
                    : idx === 1 ? "bg-zinc-200/60 text-zinc-600"
                    : idx === 2 ? "bg-orange-100/70 text-orange-600"
                    : "bg-white/40 text-zinc-400"
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
                    b.attendanceScore >= 80 ? "text-emerald-600"
                    : b.attendanceScore >= 60 ? "text-amber-600"
                    : "text-rose-600"
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
              className="w-full px-4 py-2.5 text-center text-sm font-bold text-brand-purple hover:bg-brand-purple/5 transition-colors flex items-center justify-center gap-1 border-t border-white/30"
            >
              {showAllBranches ? (
                <><ChevronUp className="w-3.5 h-3.5" /> عرض أقل</>
              ) : (
                <><ChevronDown className="w-3.5 h-3.5" /> عرض الكل ({rankedBranches.length})</>
              )}
            </button>
          )}
        </div>

        {/* ─── Activity Feed ─── */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-white/30 flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-brand-purple" />
            <span className="text-base font-bold text-foreground">
              النشاط الأخير
            </span>
          </div>
          {activities.length === 0 ? (
            <div className="px-6 py-12 text-center text-zinc-400 text-sm">
              لا يوجد نشاط حديث
            </div>
          ) : (
            <div className="divide-y divide-border-main">
              {activities.slice(0, 10).map((a: ActivityLogItem) => (
                <div key={a.id} className="flex items-center gap-3.5 px-6 py-4">
                  <div className="w-2 h-2 rounded-full gradient-purple shrink-0" />
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
    <div className="card p-5 flex flex-col gap-3">
      <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <span className={`text-2xl font-bold ${color} leading-none block`}>{value}</span>
        {sub && <span className={`text-sm font-bold ${color} opacity-60 leading-none mt-1 block`}>{sub}</span>}
      </div>
      <span className="text-xs text-muted-light font-semibold leading-none">{label}</span>
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
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold ${
      warn
        ? "bg-rose-50/70 text-rose-600"
        : "bg-white/40 text-zinc-500"
    }`}>
      <Icon className="w-3 h-3" />
      {value}
    </div>
  );
}
