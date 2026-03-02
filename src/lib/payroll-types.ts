// ============================================================
// Payroll Types
// Types for the payroll & deductions engine
// ============================================================

export interface PayrollProfile {
  baseSalary: number;
  hourlyRate: number;
  overtimeRate: number;
  latePenaltyPerMinute: number;
  gracePeriodMinutes: number;
}

export interface ShiftReconciliation {
  shiftId: string;
  date: string;
  branchName: string;
  scheduledStart: string;
  scheduledEnd: string;
  scheduledHours: number;
  actualClockIn: string | null;
  actualClockOut: string | null;
  actualHoursWorked: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  breakMinutes: number;
  status: "present" | "absent" | "partial";
  latePenalty: number;
  earlyLeavePenalty: number;
  overtimePay: number;
  regularPay: number;
}

export interface PayslipData {
  payslipId: string | null; // null if not yet generated/saved
  userId: string;
  userName: string;
  userRole: string;
  branchName: string | null;
  month: number;
  year: number;
  monthLabel: string;

  // Profile
  baseSalary: number;
  hourlyRate: number;
  overtimeRate: number;

  // Totals
  totalShifts: number;
  totalHoursWorked: number;
  totalOvertimeHours: number;
  totalLateMinutes: number;
  totalEarlyLeaveMinutes: number;
  totalAbsentDays: number;

  // Financial
  regularEarnings: number;
  overtimePay: number;
  totalBonuses: number;
  latePenalties: number;
  earlyLeavePenalties: number;
  absenceDeductions: number;
  totalDeductions: number;
  finalNetSalary: number;

  // Status
  isLocked: boolean;
  generatedAt: string;

  // Detail breakdown
  shifts: ShiftReconciliation[];
}

export interface PayrollSummary {
  totalEmployees: number;
  totalPayrollCost: number;
  totalDeductions: number;
  totalBonuses: number;
  totalOvertimePay: number;
  totalRegularEarnings: number;
  averageSalary: number;
}

export interface PayrollListItem {
  userId: string;
  userName: string;
  userRole: string;
  branchName: string | null;
  totalShifts: number;
  totalLateMinutes: number;
  totalOvertimeHours: number;
  totalDeductions: number;
  totalBonuses: number;
  finalNetSalary: number;
  isLocked: boolean;
  payslipId: string | null;
}

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const MONTH_NAMES_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];
