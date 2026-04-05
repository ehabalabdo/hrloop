// ============================================================
// Dashboard Analytics Types
// ============================================================

export interface DashboardMetrics {
  totalStaff: number;
  activeToday: number;
  todayAttendancePct: number;
  monthlyPayrollCost: number;
  totalBranches: number;
  pendingLeaves: number;
  topPerfectBranches: { name: string; score: number }[];
}

export interface BranchPerformance {
  id: string;
  name: string;
  totalShifts: number;
  totalLateMinutes: number;
  totalAbsences: number;
  attendanceScore: number;
  lateFrequency: number;
  employeeCount: number;
}

export interface ActivityLogItem {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  description: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

export interface SettingItem {
  id: string;
  key: string;
  value: string;
  label: string;
  description: string | null;
  category: string;
}

export interface OvertimeAlert {
  userId: string;
  fullName: string;
  weeklyHours: number;
  branchName: string;
}
