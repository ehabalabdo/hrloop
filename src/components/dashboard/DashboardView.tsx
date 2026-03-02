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
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
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
      label: "Total Staff",
      value: metrics.totalStaff.toString(),
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-200 dark:border-blue-800",
    },
    {
      icon: Timer,
      label: "Online Today",
      value: metrics.activeToday.toString(),
      sub: `${metrics.todayAttendancePct}% attendance`,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      border: "border-emerald-200 dark:border-emerald-800",
    },
    {
      icon: DollarSign,
      label: "Monthly Payroll",
      value: `$${formatCurrency(metrics.monthlyPayrollCost)}`,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-800",
    },
    {
      icon: Building2,
      label: "Active Branches",
      value: metrics.totalBranches.toString(),
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/30",
      border: "border-purple-200 dark:border-purple-800",
    },
    {
      icon: TreePalm,
      label: "Pending Leaves",
      value: metrics.pendingLeaves.toString(),
      color: "text-cyan-600 dark:text-cyan-400",
      bg: "bg-cyan-50 dark:bg-cyan-950/30",
      border: "border-cyan-200 dark:border-cyan-800",
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Executive Dashboard
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Real-time overview across all branches
            </p>
          </div>

          {/* System Status */}
          <div className="flex items-center gap-2">
            {health.database ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <Wifi className="w-3.5 h-3.5" />
                System Online
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
                <WifiOff className="w-3.5 h-3.5" />
                DB Offline
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {kpiCards.map((card) => (
            <div
              key={card.label}
              className={`${card.bg} border ${card.border} rounded-xl p-4`}
            >
              <div className="flex items-center gap-2 mb-2">
                <card.icon className={`w-4 h-4 ${card.color}`} />
                <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  {card.label}
                </span>
              </div>
              <div className={`text-xl font-bold ${card.color}`}>
                {card.value}
              </div>
              {card.sub && (
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  {card.sub}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Top Branches + Chart Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Perfect Branches */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <h2 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Top Performing Branches
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
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {branch.score}%
                      </span>
                    </div>
                  </div>
                )
              )}
              {metrics.topPerfectBranches.length === 0 && (
                <p className="text-xs text-zinc-400 italic">
                  No branch data yet
                </p>
              )}
            </div>
          </div>

          {/* Lateness Frequency Chart */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Lateness Frequency by Branch (Top 15)
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
                              ? "#ef4444"
                              : index < 7
                              ? "#f59e0b"
                              : "#10b981"
                          }
                        />
                      )
                    )}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-sm text-zinc-400">
                No attendance data available yet
              </div>
            )}
          </div>
        </div>

        {/* Branch Performance Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
            <h2 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Branch Performance Ranking
            </h2>
            <button
              onClick={handleExportBranches}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg transition-colors"
            >
              <Download className="w-3 h-3" />
              Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Branch
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Staff
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Shifts
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Late
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Late (min)
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Absences
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody>
                {rankedBranches.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-12 text-center text-zinc-400"
                    >
                      No branch data available
                    </td>
                  </tr>
                ) : (
                  rankedBranches.map(
                    (b: BranchPerformance, idx: number) => (
                      <tr
                        key={b.id}
                        className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                      >
                        <td className="px-4 py-2.5 text-zinc-400 font-medium">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-zinc-900 dark:text-zinc-100">
                          {b.name}
                        </td>
                        <td className="px-4 py-2.5 text-center text-zinc-600 dark:text-zinc-400">
                          {b.employeeCount}
                        </td>
                        <td className="px-4 py-2.5 text-center text-zinc-600 dark:text-zinc-400">
                          {b.totalShifts}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {b.lateFrequency > 0 ? (
                            <span className="text-red-600 dark:text-red-400 font-medium">
                              {b.lateFrequency}
                            </span>
                          ) : (
                            <span className="text-zinc-300 dark:text-zinc-600">
                              0
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {b.totalLateMinutes > 0 ? (
                            <span className="text-red-600 dark:text-red-400 font-medium">
                              {b.totalLateMinutes}
                            </span>
                          ) : (
                            <span className="text-zinc-300 dark:text-zinc-600">
                              0
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {b.totalAbsences > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              {b.totalAbsences}
                            </span>
                          ) : (
                            <span className="text-zinc-300 dark:text-zinc-600">
                              0
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                              b.attendanceScore >= 80
                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                : b.attendanceScore >= 60
                                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                            }`}
                          >
                            {b.attendanceScore}%
                          </span>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-pink-500" />
            <h2 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Recent Activity
            </h2>
          </div>
          <div className="space-y-2">
            {activities.length === 0 ? (
              <p className="text-xs text-zinc-400 italic">
                No recent activity
              </p>
            ) : (
              activities.map((a: ActivityLogItem) => (
                <div
                  key={a.id}
                  className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-pink-400 mt-1.5 shrink-0" />
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
