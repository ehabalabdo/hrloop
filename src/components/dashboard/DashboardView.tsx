"use client";

// ============================================================
// Executive Dashboard — Complete UI Redesign
// Modern card-based layout with clear visual hierarchy
// ============================================================

import {
  Users,
  Building2,
  DollarSign,
  Timer,
  TreePalm,
  Activity,
  Wifi,
  WifiOff,
  Download,
  Trophy,
  Clock,
  UserX,
  CalendarCheck,
  BarChart3,
  AlertTriangle,
  TrendingUp,
  Medal,
  Zap,
  Eye,
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
  const [activeTab, setActiveTab] = useState<"branches" | "activity">("branches");

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
    <div className="min-h-screen pb-28">
      {/* ─── Welcome Banner ─── */}
      <div className="relative overflow-hidden">
        <div className="gradient-purple px-6 py-8 sm:py-10">
          <div className="page-container relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1">
                  لوحة التحكم
                </h1>
                <p className="text-white/70 text-sm">
                  نظرة شاملة على أداء جميع الفروع
                </p>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold ${
                health.database
                  ? "bg-white/20 text-white"
                  : "bg-red-400/30 text-white"
              }`}>
                {health.database ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                {health.database ? "متصل" : "غير متصل"}
              </div>
            </div>
          </div>
          {/* Decorative circles */}
          <div className="absolute top-0 left-0 w-40 h-40 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-10 w-24 h-24 bg-white/5 rounded-full translate-y-1/3" />
        </div>
      </div>

      <div className="page-container mt-6 relative z-10">

        {/* ─── KPI Strip ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          <KpiCard
            icon={Users}
            value={metrics.totalStaff}
            label="إجمالي الموظفين"
            gradient="from-[#702F8A] to-[#E20074]"
          />
          <KpiCard
            icon={Timer}
            value={metrics.activeToday}
            label="حاضرين اليوم"
            gradient="from-emerald-500 to-teal-600"
            badge={`${metrics.todayAttendancePct}%`}
          />
          <KpiCard
            icon={DollarSign}
            value={`$${formatCurrency(metrics.monthlyPayrollCost)}`}
            label="الرواتب الشهرية"
            gradient="from-amber-500 to-orange-600"
          />
          <KpiCard
            icon={Building2}
            value={metrics.totalBranches}
            label="عدد الفروع"
            gradient="from-blue-500 to-indigo-600"
          />
          <KpiCard
            icon={TreePalm}
            value={metrics.pendingLeaves}
            label="طلبات الإجازة"
            gradient="from-rose-500 to-pink-600"
          />
        </div>

        {/* ─── Overtime Alerts ─── */}
        {overtimeAlerts.length > 0 && (
          <div className="mb-6 rounded-2xl overflow-hidden border border-amber-200/60">
            <div className="bg-amber-50 px-5 py-3.5 flex items-center gap-3 border-b border-amber-200/40">
              <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-bold text-amber-900">تنبيه العمل الإضافي</span>
                <span className="text-xs text-amber-700/70 block">تجاوز ٤٠ ساعة أسبوعياً</span>
              </div>
              <span className="w-7 h-7 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                {overtimeAlerts.length}
              </span>
            </div>
            <div className="bg-white/60 divide-y divide-amber-100">
              {overtimeAlerts.map((alert: OvertimeAlert) => (
                <div key={alert.userId} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-bold shrink-0">
                    {alert.fullName.split(" ").map(w => w[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{alert.fullName}</p>
                    <p className="text-xs text-muted">{alert.branchName}</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                    <Clock className="w-3 h-3" />
                    {alert.weeklyHours} ساعة
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Top Branches Podium ─── */}
        {metrics.topPerfectBranches.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-amber-600" />
              </div>
              <h2 className="text-base font-bold text-foreground">أفضل الفروع أداءً</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {metrics.topPerfectBranches.map(
                (branch: { name: string; score: number }, idx: number) => {
                  const medalColors = [
                    { bg: "bg-gradient-to-br from-amber-400 to-amber-600", text: "text-white", ring: "ring-amber-300/50" },
                    { bg: "bg-gradient-to-br from-zinc-300 to-zinc-500", text: "text-white", ring: "ring-zinc-200/50" },
                    { bg: "bg-gradient-to-br from-orange-400 to-orange-600", text: "text-white", ring: "ring-orange-300/50" },
                  ];
                  const medal = medalColors[idx] || medalColors[2];
                  return (
                    <div key={branch.name} className="card p-5 flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-2xl ${medal.bg} ring-4 ${medal.ring} flex items-center justify-center shrink-0`}>
                        <Medal className={`w-5 h-5 ${medal.text}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-foreground truncate">{branch.name}</div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${idx === 0 ? "bg-amber-500" : idx === 1 ? "bg-zinc-400" : "bg-orange-500"}`}
                              style={{ width: `${branch.score}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-muted shrink-0">{branch.score}%</span>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}

        {/* ─── Tab Switcher ─── */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-zinc-100 border border-zinc-200 mb-5 w-fit">
          <button
            onClick={() => setActiveTab("branches")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === "branches"
                ? "gradient-purple text-white shadow-purple-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Building2 className="w-4 h-4" />
            الفروع
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === "activity"
                ? "gradient-purple text-white shadow-purple-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Activity className="w-4 h-4" />
            النشاط
          </button>
        </div>

        {/* ─── Branch Ranking ─── */}
        {activeTab === "branches" && (
          <div className="card overflow-hidden">
            {/* Toolbar */}
            <div className="px-5 py-4 flex items-center justify-between border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-purple/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-brand-purple" />
                </div>
                <span className="text-sm font-bold text-foreground">ترتيب الفروع</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowChart(!showChart)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    showChart
                      ? "gradient-purple text-white shadow-purple-sm"
                      : "bg-zinc-100 text-muted hover:text-foreground hover:bg-zinc-200"
                  }`}
                  title="رسم بياني"
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleExportBranches}
                  className="w-9 h-9 rounded-xl bg-zinc-100 text-muted hover:text-foreground hover:bg-zinc-200 flex items-center justify-center transition-all"
                  title="تصدير CSV"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chart */}
            {showChart && chartData.length > 0 && (
              <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} angle={-25} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} allowDecimals={false} width={30} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "16px",
                        fontSize: "12px",
                        color: "#1e1b4b",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                      }}
                    />
                    <Bar dataKey="lateFrequency" radius={[8, 8, 0, 0]}>
                      {chartData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={index < 3 ? "#ef4444" : index < 7 ? "#f59e0b" : "#7c3aed"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Branch Rows */}
            {rankedBranches.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <Building2 className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                <p className="text-sm text-muted">لا توجد بيانات فروع</p>
              </div>
            ) : (
              <div>
                {visibleBranches.map((b: BranchPerformance, idx: number) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-3 px-5 py-4 hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-b-0"
                  >
                    {/* Medal/Rank */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                      idx === 0 ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white"
                      : idx === 1 ? "bg-gradient-to-br from-zinc-300 to-zinc-500 text-white"
                      : idx === 2 ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white"
                      : "bg-zinc-100 text-zinc-400 border border-zinc-200"
                    }`}>
                      {idx + 1}
                    </div>

                    {/* Branch info */}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-bold text-foreground block truncate">{b.name}</span>
                      <span className="text-xs text-muted">{b.employeeCount} موظف</span>
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-2 shrink-0">
                      <StatChip icon={CalendarCheck} value={b.totalShifts} label="وردية" />
                      <StatChip icon={Clock} value={b.lateFrequency} label="تأخير" warn={b.lateFrequency > 0} />
                      <StatChip icon={UserX} value={b.totalAbsences} label="غياب" warn={b.totalAbsences > 0} />
                    </div>

                    {/* Score bar */}
                    <div className="flex items-center gap-2 shrink-0 w-24">
                      <div className="flex-1 h-2.5 rounded-full bg-zinc-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            b.attendanceScore >= 80 ? "bg-emerald-500"
                            : b.attendanceScore >= 60 ? "bg-amber-500"
                            : "bg-rose-500"
                          }`}
                          style={{ width: `${b.attendanceScore}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold w-8 text-left ${
                        b.attendanceScore >= 80 ? "text-emerald-600"
                        : b.attendanceScore >= 60 ? "text-amber-600"
                        : "text-rose-600"
                      }`}>
                        {b.attendanceScore}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Show more/less */}
            {rankedBranches.length > 5 && (
              <button
                onClick={() => setShowAllBranches(!showAllBranches)}
                className="w-full px-5 py-3.5 text-sm font-bold text-brand-purple hover:bg-brand-purple/5 transition-colors flex items-center justify-center gap-2 border-t border-zinc-100"
              >
                <Eye className="w-4 h-4" />
                {showAllBranches ? "عرض أقل" : `عرض جميع الفروع (${rankedBranches.length})`}
              </button>
            )}
          </div>
        )}

        {/* ─── Activity Feed ─── */}
        {activeTab === "activity" && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-2.5 border-b border-zinc-100">
              <div className="w-8 h-8 rounded-xl bg-brand-purple/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-brand-purple" />
              </div>
              <span className="text-sm font-bold text-foreground">النشاط الأخير</span>
            </div>
            {activities.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <Activity className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                <p className="text-sm text-muted">لا يوجد نشاط حديث</p>
              </div>
            ) : (
              <div>
                {activities.slice(0, 10).map((a: ActivityLogItem) => (
                  <div key={a.id} className="flex items-start gap-4 px-5 py-4 border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50 transition-colors">
                    <div className="w-9 h-9 rounded-xl gradient-purple flex items-center justify-center shrink-0 text-white text-xs font-bold mt-0.5">
                      {a.actorName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-relaxed">
                        <span className="font-bold">{a.actorName}</span>{" "}
                        <span className="text-muted">{a.description}</span>
                      </p>
                    </div>
                    <span className="text-xs text-muted-light font-medium shrink-0 mt-0.5 bg-zinc-100 px-2.5 py-1 rounded-lg">
                      {timeAgo(a.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ============================================================
// KPI Card — gradient icon circle with large number
// ============================================================
function KpiCard({ icon: Icon, value, label, gradient, badge }: {
  icon: React.ComponentType<{ className?: string }>;
  value: string | number;
  label: string;
  gradient: string;
  badge?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-3 shadow-sm">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold text-zinc-900 leading-none">{value}</span>
          {badge && <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">{badge}</span>}
        </div>
        <span className="text-xs text-zinc-500 mt-1 block truncate">{label}</span>
      </div>
    </div>
  );
}

// ============================================================
// Stat Chip — compact stat inside branch row
// ============================================================
function StatChip({ icon: Icon, value, label, warn }: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  warn?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-center min-w-[56px] ${
      warn
        ? "bg-rose-50/80 border border-rose-200/40"
        : "bg-zinc-50 border border-zinc-200/50"
    }`}>
      <Icon className={`w-3.5 h-3.5 ${warn ? "text-rose-500" : "text-zinc-400"}`} />
      <span className={`text-sm font-bold leading-none ${warn ? "text-rose-600" : "text-foreground"}`}>{value}</span>
      <span className="text-[10px] text-muted leading-none">{label}</span>
    </div>
  );
}
