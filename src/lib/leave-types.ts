// ============================================================
// Leave Management Types
// ============================================================

export type LeaveType = "ANNUAL" | "SICK" | "EMERGENCY" | "UNPAID";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface LeaveRequestItem {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  branchName: string | null;
  type: LeaveType;
  status: LeaveStatus;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  isPaid: boolean;
  reviewerName: string | null;
  reviewedAt: string | null;
  reviewerNote: string | null;
  createdAt: string;
}

export interface LeaveBalance {
  annual: { used: number; total: number; remaining: number };
  sick: { used: number };
  emergency: { used: number; total: number; remaining: number };
  unpaid: { used: number };
}

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  ANNUAL: "Annual Leave",
  SICK: "Sick Leave",
  EMERGENCY: "Emergency Leave",
  UNPAID: "Unpaid Leave",
};

export const LEAVE_STATUS_COLORS: Record<
  LeaveStatus,
  { bg: string; text: string }
> = {
  PENDING: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
  },
  APPROVED: {
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  REJECTED: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
  },
  CANCELLED: {
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-500 dark:text-zinc-400",
  },
};
