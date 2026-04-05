"use server";

// ============================================================
// Executive Dashboard - Server Actions
// Analytics, metrics, branch performance, activity logs
// ============================================================

import prisma from "@/lib/db";
import type {
  DashboardMetrics,
  BranchPerformance,
  ActivityLogItem,
  NotificationItem,
  SettingItem,
  OvertimeAlert,
} from "@/lib/dashboard-types";

// ============================================================
// GET DASHBOARD METRICS
// ============================================================
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0
  );
  const todayEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59
  );
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Total active staff
  const totalStaff = await prisma.user.count({
    where: { isActive: true, role: { in: ["MANAGER", "STAFF"] } },
  });

  // Total branches
  const totalBranches = await prisma.branch.count({
    where: { isActive: true },
  });

  // Active today (clocked in)
  const clockInsToday = await prisma.attendanceLog.findMany({
    where: {
      type: "CLOCK_IN",
      timestamp: { gte: todayStart, lte: todayEnd },
    },
    select: { userId: true },
    distinct: ["userId"],
  });
  const activeToday = clockInsToday.length;

  // Today's shifts (scheduled)
  const todayShifts = await prisma.shift.count({
    where: {
      date: { gte: todayStart, lte: todayEnd },
      status: { in: ["PUBLISHED", "COMPLETED"] },
    },
  });
  const todayAttendancePct =
    todayShifts > 0 ? Math.round((activeToday / todayShifts) * 100) : 0;

  // Monthly payroll cost
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const payslips = await prisma.monthlyPayslip.findMany({
    where: { month, year },
    select: { finalNetSalary: true },
  });
  type PayslipRow = (typeof payslips)[number];
  const monthlyPayrollCost = payslips.reduce(
    (sum: number, p: PayslipRow) => sum + Number(p.finalNetSalary),
    0
  );

  // Pending leaves
  const pendingLeaves = await prisma.leaveRequest.count({
    where: { status: "PENDING" },
  });

  // Top 3 best branches (lowest total late minutes this month)
  const branchesData = await prisma.branch.findMany({
    where: { isActive: true },
    select: {
      name: true,
      shifts: {
        where: {
          date: { gte: monthStart, lte: monthEnd },
          status: { in: ["PUBLISHED", "COMPLETED"] },
        },
        select: {
          attendanceLogs: {
            where: { type: "CLOCK_IN" },
            select: { timestamp: true },
          },
          scheduledStart: true,
        },
      },
    },
  });

  type BranchDataItem = (typeof branchesData)[number];
  type ShiftItem = BranchDataItem["shifts"][number];

  const branchScores = branchesData
    .map((b: BranchDataItem) => {
      let totalLate = 0;
      let shiftCount = b.shifts.length;
      for (const shift of b.shifts as ShiftItem[]) {
        if (shift.attendanceLogs.length > 0) {
          const clockIn = new Date(shift.attendanceLogs[0].timestamp);
          const scheduled = new Date(shift.scheduledStart);
          const diff =
            (clockIn.getTime() - scheduled.getTime()) / (1000 * 60);
          if (diff > 5) totalLate += diff;
        }
      }
      const score =
        shiftCount > 0
          ? Math.round(Math.max(0, 100 - (totalLate / shiftCount) * 2))
          : 100;
      return { name: b.name, score };
    })
    .sort(
      (a: { name: string; score: number }, b: { name: string; score: number }) =>
        b.score - a.score
    );

  const topPerfectBranches = branchScores.slice(0, 3);

  return {
    totalStaff,
    activeToday,
    todayAttendancePct: Math.min(todayAttendancePct, 100),
    monthlyPayrollCost: Math.round(monthlyPayrollCost * 100) / 100,
    totalBranches,
    pendingLeaves,
    topPerfectBranches,
  };
}

// ============================================================
// GET BRANCH PERFORMANCE
// ============================================================
export async function getBranchPerformance(): Promise<BranchPerformance[]> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      users: {
        where: { isActive: true },
        select: { id: true },
      },
      shifts: {
        where: {
          date: { gte: monthStart, lte: monthEnd },
          status: { in: ["PUBLISHED", "COMPLETED"] },
        },
        select: {
          id: true,
          scheduledStart: true,
          attendanceLogs: {
            where: { type: "CLOCK_IN" },
            select: { timestamp: true },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  type BranchItem = (typeof branches)[number];
  type BranchShift = BranchItem["shifts"][number];

  return branches.map((b: BranchItem) => {
    let totalLateMinutes = 0;
    let totalAbsences = 0;
    let lateCount = 0;

    for (const shift of b.shifts as BranchShift[]) {
      if (shift.attendanceLogs.length === 0) {
        totalAbsences++;
      } else {
        const clockIn = new Date(shift.attendanceLogs[0].timestamp);
        const scheduled = new Date(shift.scheduledStart);
        const diffMin =
          (clockIn.getTime() - scheduled.getTime()) / (1000 * 60);
        if (diffMin > 5) {
          totalLateMinutes += Math.round(diffMin);
          lateCount++;
        }
      }
    }

    const totalShifts = b.shifts.length;
    const attendanceScore =
      totalShifts > 0
        ? Math.round(
            Math.max(
              0,
              100 -
                ((totalAbsences / totalShifts) * 50 +
                  (totalLateMinutes / Math.max(totalShifts, 1)) * 2)
            )
          )
        : 100;

    return {
      id: b.id,
      name: b.name,
      totalShifts,
      totalLateMinutes: Math.round(totalLateMinutes),
      totalAbsences,
      attendanceScore: Math.max(0, Math.min(100, attendanceScore)),
      lateFrequency: lateCount,
      employeeCount: b.users.length,
    };
  });
}

// ============================================================
// GET ACTIVITY LOGS
// ============================================================
export async function getActivityLogs(
  limit: number = 50
): Promise<ActivityLogItem[]> {
  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  type LogItem = (typeof logs)[number];

  return logs.map((l: LogItem) => ({
    id: l.id,
    actorName: l.actorName,
    action: l.action,
    entityType: l.entityType,
    description: l.description,
    createdAt: l.createdAt.toISOString(),
  }));
}

// ============================================================
// GET NOTIFICATIONS
// ============================================================
export async function getNotifications(
  userId: string,
  unreadOnly: boolean = false
): Promise<NotificationItem[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { userId };
  if (unreadOnly) where.isRead = false;

  const notifs = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  type NotifItem = (typeof notifs)[number];

  return notifs.map((n: NotifItem) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    isRead: n.isRead,
    link: n.link,
    createdAt: n.createdAt.toISOString(),
  }));
}

// ============================================================
// MARK NOTIFICATION READ
// ============================================================
export async function markNotificationRead(
  notificationId: string
): Promise<void> {
  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

// ============================================================
// MARK ALL NOTIFICATIONS READ
// ============================================================
export async function markAllNotificationsRead(
  userId: string
): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

// ============================================================
// GLOBAL SETTINGS
// ============================================================
export async function getGlobalSettings(): Promise<SettingItem[]> {
  const settings = await prisma.globalSetting.findMany({
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });

  type SettRow = (typeof settings)[number];

  return settings.map((s: SettRow) => ({
    id: s.id,
    key: s.key,
    value: s.value,
    label: s.label,
    description: s.description,
    category: s.category,
  }));
}

export async function updateGlobalSetting(
  key: string,
  value: string,
  actorId: string,
  actorName: string
): Promise<{ success: boolean; message: string }> {
  try {
    await prisma.globalSetting.update({
      where: { key },
      data: { value, updatedBy: actorId },
    });

    await prisma.activityLog.create({
      data: {
        actorId,
        actorName,
        action: "SETTING_UPDATED",
        entityType: "setting",
        entityId: key,
        description: `${actorName} updated setting "${key}" to "${value}"`,
      },
    });

    return { success: true, message: `Setting "${key}" updated.` };
  } catch (error) {
    console.error("Update setting failed:", error);
    return { success: false, message: "Failed to update setting." };
  }
}

// ============================================================
// OVERTIME ALERTS — Employees exceeding 40 hours/week
// ============================================================

export async function getOvertimeAlerts(): Promise<OvertimeAlert[]> {
  const now = new Date();
  // Get Monday of current week
  const day = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  // Get all attendance logs for this week
  const logs = await prisma.attendanceLog.findMany({
    where: {
      timestamp: { gte: monday, lte: sunday },
      type: { in: ["CLOCK_IN", "CLOCK_OUT"] },
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          isActive: true,
          primaryBranch: { select: { name: true } },
        },
      },
    },
    orderBy: { timestamp: "asc" },
  });

  type LogEntry = (typeof logs)[number];

  // Group logs by user
  const userLogs = new Map<string, LogEntry[]>();
  for (const log of logs) {
    if (!log.user.isActive) continue;
    const existing = userLogs.get(log.userId) ?? [];
    existing.push(log);
    userLogs.set(log.userId, existing);
  }

  const alerts: OvertimeAlert[] = [];

  for (const [, entries] of userLogs) {
    let totalMinutes = 0;
    let lastClockIn: Date | null = null;

    for (const entry of entries) {
      if (entry.type === "CLOCK_IN") {
        lastClockIn = new Date(entry.timestamp);
      } else if (entry.type === "CLOCK_OUT" && lastClockIn) {
        const diff = (new Date(entry.timestamp).getTime() - lastClockIn.getTime()) / (1000 * 60);
        if (diff > 0 && diff < 1440) { // sanity: max 24h per session
          totalMinutes += diff;
        }
        lastClockIn = null;
      }
    }

    const weeklyHours = Math.round((totalMinutes / 60) * 10) / 10;
    if (weeklyHours > 40) {
      const user = entries[0].user;
      alerts.push({
        userId: user.id,
        fullName: user.fullName,
        weeklyHours,
        branchName: user.primaryBranch?.name ?? "—",
      });
    }
  }

  // Sort by most hours first
  alerts.sort((a, b) => b.weeklyHours - a.weeklyHours);
  return alerts;
}

// ============================================================
// SYSTEM HEALTH CHECK
// ============================================================
export async function getSystemHealth(): Promise<{
  database: boolean;
  timestamp: string;
  userCount: number;
  branchCount: number;
}> {
  try {
    const [userCount, branchCount] = await Promise.all([
      prisma.user.count(),
      prisma.branch.count(),
    ]);

    return {
      database: true,
      timestamp: new Date().toISOString(),
      userCount,
      branchCount,
    };
  } catch {
    return {
      database: false,
      timestamp: new Date().toISOString(),
      userCount: 0,
      branchCount: 0,
    };
  }
}
