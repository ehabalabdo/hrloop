"use client";

// ============================================================
// Executive Dashboard View
// Charts, KPIs, branch performance, activity log
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
} from "lucide-react";
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
} from "@/lib/dashboard-types";
import { downloadCSV } from "@/lib/csv-export";

interface DashboardViewProps {
  metrics: DashboardMetrics;
  branches: BranchPerformance[];
  activities: ActivityLogItem[];
  health: {
    database: boolean;
    timestamp: string;
    userCount: number;
    branchCount: number;
  };
}

function formatCurrency(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} س`;
  return `منذ ${Math.floor(hrs / 24)} يوم`;
}

export default function DashboardView({
  metrics,
  branches,
  activities,
  health,
}: DashboardViewProps) {
  // Sort branches by late frequency for the chart (top 15)
  const chartData = [...branches]
    .sort(
      (a: BranchPerformance, b: BranchPerformance) =>
        b.lateFrequency - a.lateFrequency
    )
    .slice(0, 15)
    .map((b: BranchPerformance) => ({
      name: b.name.length > 12 ? b.name.slice(0, 12) + "…" : b.name,
      lateFrequency: b.lateFrequency,
      lateMinutes: b.totalLateMinutes,
    }));

  // Sort branches by attendance score for the table
  const rankedBranches = [...branches].sort(
    (a: BranchPerformance, b: BranchPerformance) =>
      b.attendanceScore - a.attendanceScore
  );

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

  const kpiCards = [
    {
      icon: Users,
      label: "إجمالي الموظفين",
      value: metrics.totalStaff.toString(),
      color: "text-brand-purple",
      bg: "bg-brand-purple/5",
      border: "border-brand-purple/15",
    },
    {
      icon: Timer,
      label: "متصل اليوم",
      value: metrics.activeToday.toString(),
      sub: `${metrics.todayAttendancePct}% حضور`,
      color: "text-brand-magenta",
      bg: "bg-brand-magenta/5",
      border: "border-brand-magenta/15",
    },
    {
      icon: DollarSign,
      label: "الرواتب الشهرية",
      value: `$${formatCurrency(metrics.monthlyPayrollCost)}`,
      color: "text-brand-orange",
      bg: "bg-brand-orange/5",
      border: "border-brand-orange/15",
    },
    {
      icon: Building2,
      label: "الفروع النشطة",
      value: metrics.totalBranches.toString(),
      color: "text-brand-purple-light",
      bg: "bg-brand-purple-light/5",
      border: "border-brand-purple-light/15",
    },
    {
      icon: TreePalm,
      label: "إجازات معلقة",
      value: metrics.pendingLeaves.toString(),
      color: "text-brand-orange-dark",
      bg: "bg-brand-orange-dark/5",
      border: "border-brand-orange-dark/15",
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0f0a19] pb-28">
      {/* ─── Header ─── */}
      <div className="bg-white dark:bg-zinc-900/80 border-b border-zinc-100 dark:border-zinc-800/40 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              لوحة التحكم
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              نظرة شاملة على جميع الفروع
            </p>
          </div>

          <div className="flex items-center gap-2">
            {health.database ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-950/20 rounded-full px-3 py-1">
                <Wifi className="w-3.5 h-3.5" />
                متصل
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-red-600 font-medium bg-red-50 dark:bg-red-950/20 rounded-full px-3 py-1">
                <WifiOff className="w-3.5 h-3.5" />
                غير متصل
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-5 space-y-5">
        {/* ─── KPI Cards ─── */}
        <div className="grid grid-cols-2 gap-3">
          {kpiCards.map((card) => (
            <div
              key={card.label}
              className="bg-white dark:bg-zinc-900/60 rounded-3xl border border-zinc-100 dark:border-zinc-800/40 shadow-sm p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-2xl ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
              <div className={`text-2xl font-bold ${card.color}`}>
                {card.value}
              </div>
              <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mt-1 block">
                {card.label}
              </span>
              {card.sub && (
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  {card.sub}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ─── Top Branches + Chart ─── */}
        <div className="space-y-5">
          {/* Top Perfect Branches */}
          <div className="bg-white dark:bg-zinc-900/60 rounded-3xl border border-zinc-100 dark:border-zinc-800/40 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-brand-magenta" />
              <h2 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                أفضل الفروع أداءً
              </h2>
            </div>
            <div className="space-y-3">
              {metrics.topPerfectBranches.map(
                (
                  branch: { name: string; score: number },
                  idx: number
                ) => (
                  <div key={branch.name} className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0
                          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600"
                          : idx === 1
                          ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                          : "bg-orange-100 dark:bg-orange-900/30 text-orange-600"
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {branch.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-magenta" />
                      <span className="text-sm font-bold text-brand-magenta">
                        {branch.score}%
                      </span>
                    </div>
                  </div>
                )
              )}
              {metrics.topPerfectBranches.length === 0 && (
                <p className="text-xs text-zinc-400 italic">
                  لا توجد بيانات فروع بعد
                </p>
              )}
            </div>
          </div>

          {/* Lateness Frequency Chart */}
          <div className="bg-white dark:bg-zinc-900/60 rounded-3xl border border-zinc-100 dark:border-zinc-800/40 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                التأخير حسب الفرع (أعلى 15)
              </h2>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#27272a"
                    opacity={0.3}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "#a1a1aa" }}
                    angle={-30}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#a1a1aa" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #3f3f46",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#e4e4e7",
                    }}
                  />
                  <Bar dataKey="lateFrequency" radius={[4, 4, 0, 0]}>
                    {chartData.map(
                      (
                        _entry: {
                          name: string;
                          lateFrequency: number;
                          lateMinutes: number;
                        },
                        index: number
                      ) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            index < 3
                              ? "#EC008C"
                              : index < 7
                              ? "#FA9D27"
                              : "#6E329F"
                          }
                        />
                      )
                    )}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-sm text-zinc-400">
                لا توجد بيانات حضور بعد
              </div>
            )}
          </div>
        </div>

        {/* ─── Branch Performance Cards (Mobile-first) ─── */}
        <div className="bg-white dark:bg-zinc-900/60 rounded-3xl border border-zinc-100 dark:border-zinc-800/40 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/40 flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              ترتيب أداء الفروع
            </h2>
            <button
              onClick={handleExportBranches}
              className="p-2 rounded-2xl bg-zinc-50 dark:bg-zinc-800 text-zinc-500 hover:text-brand-purple transition-colors"
              title="تصدير CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

          {rankedBranches.length === 0 ? (
            <div className="px-5 py-12 text-center text-zinc-400 text-sm">
              لا توجد بيانات فروع
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
              {rankedBranches.map((b: BranchPerformance, idx: number) => (
                <div key={b.id} className="px-5 py-4">
                  {/* Branch name & rank */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? "bg-amber-100 text-amber-600" : idx === 1 ? "bg-zinc-200 text-zinc-600" : idx === 2 ? "bg-orange-100 text-orange-600" : "bg-zinc-100 text-zinc-400"
                      }`}>
                        {idx + 1}
                      </div>
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{b.name}</span>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                      b.attendanceScore >= 80
                        ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600"
                        : b.attendanceScore >= 60
                        ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600"
                        : "bg-red-50 dark:bg-red-950/20 text-red-600"
                    }`}>
                      {b.attendanceScore}%
                    </span>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-xl px-2.5 py-2 text-center">
                      <span className="text-[10px] text-zinc-400 block">الموظفين</span>
                      <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{b.employeeCount}</span>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-xl px-2.5 py-2 text-center">
                      <span className="text-[10px] text-zinc-400 block">الورديات</span>
                      <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{b.totalShifts}</span>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-xl px-2.5 py-2 text-center">
                      <span className="text-[10px] text-zinc-400 block">التأخير</span>
                      <span className={`text-sm font-bold ${b.lateFrequency > 0 ? "text-red-600" : "text-zinc-300"}`}>{b.lateFrequency}</span>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-xl px-2.5 py-2 text-center">
                      <span className="text-[10px] text-zinc-400 block">الغياب</span>
                      <span className={`text-sm font-bold ${b.totalAbsences > 0 ? "text-amber-600" : "text-zinc-300"}`}>{b.totalAbsences}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Activity Log ─── */}
        <div className="bg-white dark:bg-zinc-900/60 rounded-3xl border border-zinc-100 dark:border-zinc-800/40 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-brand-purple" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              النشاط الأخير
            </h2>
          </div>
          <div className="space-y-2">
            {activities.length === 0 ? (
              <p className="text-xs text-zinc-400 italic">
                لا يوجد نشاط حديث
              </p>
            ) : (
              activities.map((a: ActivityLogItem) => (
                <div
                  key={a.id}
                  className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-magenta mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-700 dark:text-zinc-300">
                      <span className="font-semibold">{a.actorName}</span>{" "}
                      {a.description}
                    </p>
                  </div>
                  <span className="text-[10px] text-zinc-400 shrink-0">
                    {timeAgo(a.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
