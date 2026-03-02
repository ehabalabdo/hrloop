"use server";

// ============================================================
// Payroll Engine - Server Actions
// Reconciles scheduled shifts with actual attendance logs
// to calculate monthly salaries with penalties and bonuses.
//
// RECONCILIATION LOGIC:
//   For each published shift in the month:
//   1. Find matching CLOCK_IN / CLOCK_OUT attendance logs
//   2. Late = max(0, clockIn - scheduledStart - gracePeriod)
//   3. Early Leave = max(0, scheduledEnd - clockOut)
//   4. Overtime = max(0, actualDuration - scheduledDuration)
//   5. Absent = published shift with NO attendance log
//
// NET SALARY FORMULA:
//   BaseSalary + OvertimePay + Bonuses - LatePenalties
//   - EarlyLeavePenalties - AbsenceDeductions
//
// All monetary values use 2-decimal precision (round half-up).
// ============================================================

import prisma from "@/lib/db";
import {
  type PayslipData,
  type ShiftReconciliation,
  type PayrollListItem,
  type PayrollSummary,
  MONTH_NAMES,
} from "@/lib/payroll-types";

// ============================================================
// HELPERS
// ============================================================

/** Round to 2 decimal places (financial rounding) */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Get first and last day of a month */
function getMonthRange(
  month: number,
  year: number
): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

/** Difference in minutes between two dates */
function diffMinutes(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (1000 * 60);
}

// ============================================================
// CALCULATE MONTHLY PAYROLL (Single Employee)
// ============================================================

export async function calculateMonthlyPayroll(
  userId: string,
  month: number,
  year: number
): Promise<PayslipData> {
  const { start, end } = getMonthRange(month, year);

  // Fetch user with profile and branch
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      payrollProfile: true,
      primaryBranch: { select: { name: true } },
    },
  });

  const profile = user.payrollProfile;
  const baseSalary = profile ? Number(profile.baseSalary) : 0;
  const hourlyRate = profile ? Number(profile.hourlyRate) : 0;
  const overtimeRate = profile ? Number(profile.overtimeRate) : 0;
  const latePenaltyPerMin = profile
    ? Number(profile.latePenaltyPerMinute)
    : 0;
  const gracePeriodMin = profile ? profile.gracePeriodMinutes : 5;

  // Fetch all PUBLISHED/COMPLETED shifts for this user in the month
  const shifts = await prisma.shift.findMany({
    where: {
      userId,
      date: { gte: start, lte: end },
      status: { in: ["PUBLISHED", "COMPLETED"] },
    },
    include: {
      branch: { select: { name: true } },
      attendanceLogs: {
        orderBy: { timestamp: "asc" },
      },
    },
    orderBy: { date: "asc" },
  });

  type ShiftWithIncludes = (typeof shifts)[number];
  type AttendanceLogItem = ShiftWithIncludes["attendanceLogs"][number];

  // Reconcile each shift
  let totalHoursWorked = 0;
  let totalOvertimeMinutes = 0;
  let totalLateMinutes = 0;
  let totalEarlyLeaveMinutes = 0;
  let totalAbsentDays = 0;
  let totalRegularPay = 0;
  let totalOvertimePay = 0;
  let totalLatePenalties = 0;
  let totalEarlyLeavePenalties = 0;
  let totalAbsenceDeductions = 0;

  const shiftReconciliations: ShiftReconciliation[] = shifts.map(
    (shift: ShiftWithIncludes) => {
      const scheduledStart = new Date(shift.scheduledStart);
      const scheduledEnd = new Date(shift.scheduledEnd);
      const scheduledMinutes = diffMinutes(scheduledStart, scheduledEnd);
      const scheduledHours = round2(scheduledMinutes / 60);
      const logs = shift.attendanceLogs;

      // Find CLOCK_IN and CLOCK_OUT
      const clockInLog = logs.find(
        (l: AttendanceLogItem) => l.type === "CLOCK_IN"
      );
      const clockOutLog = logs.find(
        (l: AttendanceLogItem) => l.type === "CLOCK_OUT"
      );

      // Find break times
      const breakStarts = logs.filter(
        (l: AttendanceLogItem) => l.type === "BREAK_START"
      );
      const breakEnds = logs.filter(
        (l: AttendanceLogItem) => l.type === "BREAK_END"
      );
      let breakMinutes = 0;
      for (
        let i = 0;
        i < Math.min(breakStarts.length, breakEnds.length);
        i++
      ) {
        breakMinutes += diffMinutes(
          new Date(breakStarts[i].timestamp),
          new Date(breakEnds[i].timestamp)
        );
      }
      breakMinutes = Math.max(0, round2(breakMinutes));

      // ABSENT: No clock in at all
      if (!clockInLog) {
        totalAbsentDays++;
        // Full day deduction: scheduledHours * hourlyRate
        const absenceDeduction = round2(scheduledHours * hourlyRate);
        totalAbsenceDeductions += absenceDeduction;

        return {
          shiftId: shift.id,
          date: new Date(shift.date).toISOString().split("T")[0],
          branchName: shift.branch.name,
          scheduledStart: scheduledStart.toISOString(),
          scheduledEnd: scheduledEnd.toISOString(),
          scheduledHours,
          actualClockIn: null,
          actualClockOut: null,
          actualHoursWorked: 0,
          lateMinutes: 0,
          earlyLeaveMinutes: 0,
          overtimeMinutes: 0,
          breakMinutes: 0,
          status: "absent" as const,
          latePenalty: 0,
          earlyLeavePenalty: 0,
          overtimePay: 0,
          regularPay: 0,
        };
      }

      const actualClockIn = new Date(clockInLog.timestamp);
      const actualClockOut = clockOutLog
        ? new Date(clockOutLog.timestamp)
        : scheduledEnd; // Assume end if no clock out

      // --- Late Calculation (with grace period) ---
      let lateMin = diffMinutes(scheduledStart, actualClockIn);
      lateMin = lateMin > gracePeriodMin ? round2(lateMin) : 0;

      // --- Early Leave ---
      let earlyLeaveMin = clockOutLog
        ? diffMinutes(actualClockOut, scheduledEnd)
        : 0;
      earlyLeaveMin = earlyLeaveMin > 0 ? round2(earlyLeaveMin) : 0;

      // --- Actual hours worked (minus breaks) ---
      const rawWorkMinutes = diffMinutes(actualClockIn, actualClockOut);
      const netWorkMinutes = Math.max(0, rawWorkMinutes - breakMinutes);
      const actualHours = round2(netWorkMinutes / 60);

      // --- Overtime ---
      let overtimeMin = netWorkMinutes - scheduledMinutes;
      overtimeMin = overtimeMin > 0 ? round2(overtimeMin) : 0;

      // --- Financial Calculations ---
      const regularHours = Math.min(actualHours, scheduledHours);
      const regularPay = round2(regularHours * hourlyRate);
      const otPay = round2((overtimeMin / 60) * overtimeRate);
      const latePenalty = round2(lateMin * latePenaltyPerMin);
      const earlyPenalty = round2(earlyLeaveMin * latePenaltyPerMin);

      // Accumulate
      totalHoursWorked += actualHours;
      totalOvertimeMinutes += overtimeMin;
      totalLateMinutes += lateMin;
      totalEarlyLeaveMinutes += earlyLeaveMin;
      totalRegularPay += regularPay;
      totalOvertimePay += otPay;
      totalLatePenalties += latePenalty;
      totalEarlyLeavePenalties += earlyPenalty;

      const status: "present" | "partial" =
        lateMin > 0 || earlyLeaveMin > 0 ? "partial" : "present";

      return {
        shiftId: shift.id,
        date: new Date(shift.date).toISOString().split("T")[0],
        branchName: shift.branch.name,
        scheduledStart: scheduledStart.toISOString(),
        scheduledEnd: scheduledEnd.toISOString(),
        scheduledHours,
        actualClockIn: actualClockIn.toISOString(),
        actualClockOut: actualClockOut.toISOString(),
        actualHoursWorked: actualHours,
        lateMinutes: lateMin,
        earlyLeaveMinutes: earlyLeaveMin,
        overtimeMinutes: overtimeMin,
        breakMinutes,
        status,
        latePenalty,
        earlyLeavePenalty: earlyPenalty,
        overtimePay: otPay,
        regularPay,
      };
    }
  );

  // Final calculations
  const totalOvertimeHours = round2(totalOvertimeMinutes / 60);
  const totalDeductions = round2(
    totalLatePenalties + totalEarlyLeavePenalties + totalAbsenceDeductions
  );
  const totalBonuses = 0; // Can be set manually by owner
  // Net salary = baseSalary + regularPay (hourly) + overtimePay + bonuses - deductions
  const finalNetSalary = round2(
    baseSalary + totalRegularPay + totalOvertimePay + totalBonuses - totalDeductions
  );

  // Look up existing payslip ID (if already generated)
  const existingPayslip = await prisma.monthlyPayslip.findUnique({
    where: { userId_month_year: { userId, month, year } },
    select: { id: true, isLocked: true },
  });

  return {
    payslipId: existingPayslip?.id ?? null,
    userId,
    userName: user.fullName,
    userRole: user.role,
    branchName: user.primaryBranch?.name ?? null,
    month,
    year,
    monthLabel: `${MONTH_NAMES[month - 1]} ${year}`,
    baseSalary,
    hourlyRate,
    overtimeRate,
    totalShifts: shifts.length,
    totalHoursWorked: round2(totalHoursWorked),
    totalOvertimeHours,
    totalLateMinutes: round2(totalLateMinutes),
    totalEarlyLeaveMinutes: round2(totalEarlyLeaveMinutes),
    totalAbsentDays,
    regularEarnings: round2(totalRegularPay),
    overtimePay: round2(totalOvertimePay),
    totalBonuses,
    latePenalties: round2(totalLatePenalties),
    earlyLeavePenalties: round2(totalEarlyLeavePenalties),
    absenceDeductions: round2(totalAbsenceDeductions),
    totalDeductions,
    finalNetSalary,
    isLocked: existingPayslip?.isLocked ?? false,
    generatedAt: new Date().toISOString(),
    shifts: shiftReconciliations,
  };
}

// ============================================================
// GENERATE ALL PAYSLIPS FOR A MONTH
// ============================================================

export async function generateAllPayslips(
  month: number,
  year: number
): Promise<{
  success: boolean;
  message: string;
  count: number;
}> {
  try {
    // Get all active employees (MANAGER + STAFF)
    const employees = await prisma.user.findMany({
      where: { isActive: true, role: { in: ["MANAGER", "STAFF"] } },
      select: { id: true },
    });

    let generated = 0;

    for (const emp of employees) {
      // Check if locked payslip already exists
      const existing = await prisma.monthlyPayslip.findUnique({
        where: {
          userId_month_year: {
            userId: emp.id,
            month,
            year,
          },
        },
      });

      if (existing?.isLocked) continue;

      // Calculate payroll
      const payslip = await calculateMonthlyPayroll(emp.id, month, year);

      // Upsert payslip
      await prisma.monthlyPayslip.upsert({
        where: {
          userId_month_year: {
            userId: emp.id,
            month,
            year,
          },
        },
        update: {
          totalShifts: payslip.totalShifts,
          totalHoursWorked: payslip.totalHoursWorked,
          totalOvertimeHours: payslip.totalOvertimeHours,
          totalLateMinutes: payslip.totalLateMinutes,
          totalEarlyLeaveMinutes: payslip.totalEarlyLeaveMinutes,
          totalAbsentDays: payslip.totalAbsentDays,
          totalDeductions: payslip.totalDeductions,
          totalBonuses: payslip.totalBonuses,
          finalNetSalary: payslip.finalNetSalary,
          generatedAt: new Date(),
        },
        create: {
          userId: emp.id,
          month,
          year,
          totalShifts: payslip.totalShifts,
          totalHoursWorked: payslip.totalHoursWorked,
          totalOvertimeHours: payslip.totalOvertimeHours,
          totalLateMinutes: payslip.totalLateMinutes,
          totalEarlyLeaveMinutes: payslip.totalEarlyLeaveMinutes,
          totalAbsentDays: payslip.totalAbsentDays,
          totalDeductions: payslip.totalDeductions,
          totalBonuses: payslip.totalBonuses,
          finalNetSalary: payslip.finalNetSalary,
        },
      });

      generated++;
    }

    return {
      success: true,
      message: `Generated payslips for ${generated} employees.`,
      count: generated,
    };
  } catch (error) {
    console.error("Generate payslips failed:", error);
    return {
      success: false,
      message: "Failed to generate payslips.",
      count: 0,
    };
  }
}

// ============================================================
// GET PAYROLL LIST (Admin View)
// ============================================================

export async function getPayrollList(
  month: number,
  year: number,
  branchId?: string
): Promise<{ items: PayrollListItem[]; summary: PayrollSummary }> {
  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userWhere: any = {
    isActive: true,
    role: { in: ["MANAGER", "STAFF"] },
  };
  if (branchId) {
    userWhere.primaryBranchId = branchId;
  }

  const employees = await prisma.user.findMany({
    where: userWhere,
    include: {
      primaryBranch: { select: { name: true } },
      monthlyPayslips: {
        where: { month, year },
        take: 1,
      },
    },
    orderBy: { fullName: "asc" },
  });

  type EmpWithIncludes = (typeof employees)[number];

  const items: PayrollListItem[] = employees.map((emp: EmpWithIncludes) => {
    const payslip = emp.monthlyPayslips[0] ?? null;
    return {
      userId: emp.id,
      userName: emp.fullName,
      userRole: emp.role,
      branchName: emp.primaryBranch?.name ?? null,
      totalShifts: payslip ? payslip.totalShifts : 0,
      totalLateMinutes: payslip ? Number(payslip.totalLateMinutes) : 0,
      totalOvertimeHours: payslip ? Number(payslip.totalOvertimeHours) : 0,
      totalDeductions: payslip ? Number(payslip.totalDeductions) : 0,
      totalBonuses: payslip ? Number(payslip.totalBonuses) : 0,
      finalNetSalary: payslip ? Number(payslip.finalNetSalary) : 0,
      isLocked: payslip ? payslip.isLocked : false,
      payslipId: payslip?.id ?? null,
    };
  });

  // Calculate summary
  const totalPayrollCost = items.reduce(
    (sum, i) => sum + i.finalNetSalary,
    0
  );
  const totalDeductions = items.reduce(
    (sum, i) => sum + i.totalDeductions,
    0
  );
  const totalBonuses = items.reduce(
    (sum, i) => sum + i.totalBonuses,
    0
  );
  // totalOvertimePay: We don't have per-employee overtimePay in the payslip table,
  // so approximate from finalNet: overtimePay = finalNet + deductions - bonuses - baseSalary
  // Since we also lack baseSalary per-item, use 0 (will show total regular earnings instead)
  const totalOvertimePay = 0;
  const totalRegularEarnings = items.reduce(
    (sum, i) => sum + i.finalNetSalary,
    0
  );

  const summary: PayrollSummary = {
    totalEmployees: items.length,
    totalPayrollCost: round2(totalPayrollCost),
    totalDeductions: round2(totalDeductions),
    totalBonuses: round2(totalBonuses),
    totalOvertimePay: round2(totalOvertimePay),
    totalRegularEarnings: round2(totalRegularEarnings),
    averageSalary: items.length > 0 ? round2(totalPayrollCost / items.length) : 0,
  };

  return { items, summary };
}

// ============================================================
// LOCK/APPROVE PAYROLL
// ============================================================

export async function lockPayroll(
  month: number,
  year: number
): Promise<{ success: boolean; message: string; count: number }> {
  try {
    const result = await prisma.monthlyPayslip.updateMany({
      where: { month, year, isLocked: false },
      data: { isLocked: true },
    });

    return {
      success: true,
      message: `Approved & locked ${result.count} payslips for ${MONTH_NAMES[month - 1]} ${year}.`,
      count: result.count,
    };
  } catch (error) {
    console.error("Lock payroll failed:", error);
    return {
      success: false,
      message: "Failed to lock payroll.",
      count: 0,
    };
  }
}

// ============================================================
// UNLOCK PAYROLL (for corrections)
// ============================================================

export async function unlockPayroll(
  month: number,
  year: number
): Promise<{ success: boolean; message: string }> {
  try {
    await prisma.monthlyPayslip.updateMany({
      where: { month, year, isLocked: true },
      data: { isLocked: false },
    });

    return {
      success: true,
      message: `Unlocked payslips for ${MONTH_NAMES[month - 1]} ${year}.`,
    };
  } catch (error) {
    console.error("Unlock payroll failed:", error);
    return { success: false, message: "Failed to unlock payroll." };
  }
}

// ============================================================
// GET EMPLOYEE PAYSLIP (Single view)
// ============================================================

export async function getEmployeePayslip(
  userId: string,
  month: number,
  year: number
): Promise<PayslipData> {
  return calculateMonthlyPayroll(userId, month, year);
}

// ============================================================
// GET ALL BRANCHES (for filter dropdown)
// ============================================================

export async function getPayrollBranches(): Promise<
  { id: string; name: string }[]
> {
  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return branches;
}
