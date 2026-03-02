"use server";

// ============================================================
// Resilience Server Actions
// Device Reset, Manual Override, Disputes, Safety Notifications
// All critical actions are wrapped with the immutable system logger.
// ============================================================

import prisma from "@/lib/db";
import { logSystemAction } from "@/lib/system-logger";

// ============================================================
// 1. DEVICE RESET FLOW (WebAuthn Management)
// ============================================================

/**
 * Reset a user's WebAuthn biometric credentials.
 * Clears credential ID, public key, and sign count.
 * Logged to the immutable system_logs table.
 */
export async function resetUserBiometrics(params: {
  targetUserId: string;
  actorId: string;
  actorName: string;
  reason?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    // Capture old values before reset
    const user = await prisma.user.findUnique({
      where: { id: params.targetUserId },
      select: {
        fullName: true,
        webauthnCredentialId: true,
        webauthnPublicKey: true,
        webauthnSignCount: true,
      },
    });

    if (!user) return { success: false, message: "User not found." };

    if (!user.webauthnCredentialId) {
      return { success: false, message: "User has no biometric credentials to reset." };
    }

    // Clear credentials
    await prisma.user.update({
      where: { id: params.targetUserId },
      data: {
        webauthnCredentialId: null,
        webauthnPublicKey: null,
        webauthnSignCount: 0,
      },
    });

    // Immutable audit log
    await logSystemAction({
      actorId: params.actorId,
      actionType: "DEVICE_RESET",
      targetType: "user",
      targetId: params.targetUserId,
      oldValue: {
        credentialId: user.webauthnCredentialId ? "***REDACTED***" : null,
        signCount: user.webauthnSignCount,
      },
      newValue: { credentialId: null, signCount: 0 },
      description: `${params.actorName} reset biometrics for ${user.fullName}. Reason: ${params.reason ?? "Not specified"}`,
    });

    // Activity log (visible in dashboard)
    await prisma.activityLog.create({
      data: {
        actorId: params.actorId,
        actorName: params.actorName,
        action: "DEVICE_RESET",
        entityType: "user",
        entityId: params.targetUserId,
        description: `Reset biometric credentials for ${user.fullName}`,
      },
    });

    return {
      success: true,
      message: `Biometric credentials reset for ${user.fullName}. They can register a new device on next login.`,
    };
  } catch (error) {
    console.error("Device reset failed:", error);
    return { success: false, message: "Failed to reset biometrics." };
  }
}

/**
 * Get all employees with their biometric status for the admin panel.
 */
export async function getEmployeeBiometricStatus() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      fullName: true,
      role: true,
      webauthnCredentialId: true,
      webauthnSignCount: true,
      primaryBranch: { select: { name: true } },
    },
    orderBy: { fullName: "asc" },
  });

  type UserRow = (typeof users)[number];

  return users.map((u: UserRow) => ({
    id: u.id,
    fullName: u.fullName,
    role: u.role,
    branchName: u.primaryBranch?.name ?? "Unassigned",
    hasCredential: !!u.webauthnCredentialId,
    signCount: u.webauthnSignCount,
  }));
}

// ============================================================
// 2. MANUAL CHECK-IN OVERRIDE (GPS Drift Helper)
// ============================================================

/**
 * Submit a manual override request when blocked by geofencing.
 * Creates a PENDING attendance log with override metadata.
 */
export async function requestManualOverride(params: {
  userId: string;
  shiftId: string;
  action: string;
  latitude: number;
  longitude: number;
  photoDataUrl: string; // Base64 live photo
  reason: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const shift = await prisma.shift.findFirst({
      where: { id: params.shiftId, userId: params.userId },
      include: { branch: { select: { name: true, managerId: true } } },
    });

    if (!shift) return { success: false, message: "Shift not found." };

    // Create attendance log with override status = PENDING
    const log = await prisma.attendanceLog.create({
      data: {
        userId: params.userId,
        shiftId: params.shiftId,
        type: params.action as "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END",
        timestamp: new Date(),
        latitude: params.latitude,
        longitude: params.longitude,
        isWithinFence: false,
        overrideStatus: "PENDING",
        overridePhotoUrl: params.photoDataUrl,
        overrideReason: params.reason,
      },
    });

    // Notify manager
    if (shift.branch.managerId) {
      const user = await prisma.user.findUnique({
        where: { id: params.userId },
        select: { fullName: true },
      });

      await prisma.notification.create({
        data: {
          userId: shift.branch.managerId,
          title: "Manual Override Request",
          message: `${user?.fullName ?? "An employee"} at ${shift.branch.name} is requesting a manual check-in override.`,
          type: "warning",
          link: `/attendance?overrideId=${log.id}`,
        },
      });
    }

    // System log
    await logSystemAction({
      actorId: params.userId,
      actionType: "MANUAL_OVERRIDE_REQUEST",
      targetType: "attendance",
      targetId: log.id,
      newValue: {
        action: params.action,
        reason: params.reason,
        latitude: params.latitude,
        longitude: params.longitude,
      },
      description: `Manual override requested for ${params.action} at shift ${params.shiftId}`,
    });

    return {
      success: true,
      message: "Override request submitted. Your manager will review the photo evidence.",
    };
  } catch (error) {
    console.error("Manual override request failed:", error);
    return { success: false, message: "Failed to submit override request." };
  }
}

/**
 * Review (approve/reject) a manual override request.
 */
export async function reviewManualOverride(params: {
  attendanceLogId: string;
  reviewerId: string;
  reviewerName: string;
  action: "APPROVED" | "REJECTED";
}): Promise<{ success: boolean; message: string }> {
  try {
    const log = await prisma.attendanceLog.findUnique({
      where: { id: params.attendanceLogId },
      include: {
        user: { select: { fullName: true } },
      },
    });

    if (!log) return { success: false, message: "Record not found." };
    if (log.overrideStatus !== "PENDING") {
      return { success: false, message: "This override has already been reviewed." };
    }

    await prisma.attendanceLog.update({
      where: { id: params.attendanceLogId },
      data: {
        overrideStatus: params.action,
        isWithinFence: params.action === "APPROVED",
        reviewedById: params.reviewerId,
        reviewedAt: new Date(),
      },
    });

    // If rejected, the attendance log stays but isWithinFence = false
    // which means it won't count for payroll normally

    // Notify employee
    await prisma.notification.create({
      data: {
        userId: log.userId,
        title: `Override ${params.action}`,
        message: `Your manual check-in override has been ${params.action.toLowerCase()} by ${params.reviewerName}.`,
        type: params.action === "APPROVED" ? "success" : "error",
      },
    });

    // Immutable log
    await logSystemAction({
      actorId: params.reviewerId,
      actionType: `MANUAL_OVERRIDE_${params.action}`,
      targetType: "attendance",
      targetId: params.attendanceLogId,
      oldValue: { overrideStatus: "PENDING" },
      newValue: { overrideStatus: params.action },
      description: `${params.reviewerName} ${params.action.toLowerCase()} manual override for ${log.user.fullName}`,
    });

    return {
      success: true,
      message: `Override ${params.action.toLowerCase()} successfully.`,
    };
  } catch (error) {
    console.error("Override review failed:", error);
    return { success: false, message: "Failed to review override." };
  }
}

/**
 * Get pending override requests for a manager's branches.
 */
export async function getPendingOverrides(managerId?: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { overrideStatus: "PENDING" };

  const logs = await prisma.attendanceLog.findMany({
    where,
    include: {
      user: { select: { id: true, fullName: true } },
      shift: {
        include: { branch: { select: { name: true, managerId: true } } },
      },
    },
    orderBy: { timestamp: "desc" },
  });

  type OverrideRow = (typeof logs)[number];

  const filtered = managerId
    ? logs.filter(
        (l: OverrideRow) => l.shift?.branch?.managerId === managerId
      )
    : logs;

  return filtered.map((l: OverrideRow) => ({
    id: l.id,
    userId: l.userId,
    userName: l.user.fullName,
    branchName: l.shift?.branch?.name ?? "Unknown",
    action: l.type,
    timestamp: l.timestamp.toISOString(),
    latitude: l.latitude,
    longitude: l.longitude,
    photoUrl: l.overridePhotoUrl,
    reason: l.overrideReason,
  }));
}

// ============================================================
// 3. PENALTY DISPUTE SYSTEM
// ============================================================

/**
 * Submit a dispute for a late deduction on a payslip.
 */
export async function submitDispute(params: {
  userId: string;
  payslipId: string;
  shiftId?: string;
  disputeType: string;
  originalAmount: number;
  reason: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const payslip = await prisma.monthlyPayslip.findUnique({
      where: { id: params.payslipId },
    });

    if (!payslip) return { success: false, message: "Payslip not found." };
    if (payslip.userId !== params.userId) {
      return { success: false, message: "This payslip does not belong to you." };
    }

    // Check for existing dispute on same shift/payslip combo
    const existing = await prisma.dispute.findFirst({
      where: {
        userId: params.userId,
        payslipId: params.payslipId,
        shiftId: params.shiftId ?? undefined,
        status: "PENDING",
      },
    });

    if (existing) {
      return { success: false, message: "You already have a pending dispute for this item." };
    }

    const dispute = await prisma.dispute.create({
      data: {
        userId: params.userId,
        payslipId: params.payslipId,
        shiftId: params.shiftId ?? null,
        disputeType: params.disputeType,
        originalAmount: params.originalAmount,
        reason: params.reason,
      },
    });

    // Notify all owners
    const owners = await prisma.user.findMany({
      where: { role: "OWNER", isActive: true },
      select: { id: true },
    });

    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { fullName: true },
    });

    for (const owner of owners) {
      await prisma.notification.create({
        data: {
          userId: owner.id,
          title: "New Penalty Dispute",
          message: `${user?.fullName ?? "Employee"} disputed a ${params.disputeType} deduction of ${params.originalAmount} SAR.`,
          type: "warning",
          link: `/payroll?disputeId=${dispute.id}`,
        },
      });
    }

    // System log
    await logSystemAction({
      actorId: params.userId,
      actionType: "DISPUTE_SUBMITTED",
      targetType: "dispute",
      targetId: dispute.id,
      newValue: {
        payslipId: params.payslipId,
        disputeType: params.disputeType,
        originalAmount: params.originalAmount,
        reason: params.reason,
      },
      description: `Dispute submitted for ${params.disputeType}: ${params.originalAmount} SAR`,
    });

    return { success: true, message: "Dispute submitted. The owner will review it." };
  } catch (error) {
    console.error("Submit dispute failed:", error);
    return { success: false, message: "Failed to submit dispute." };
  }
}

/**
 * Resolve a dispute (approve or reject).
 * If approved → recalculate the payslip with the disputed amount removed.
 */
export async function resolveDispute(params: {
  disputeId: string;
  reviewerId: string;
  reviewerName: string;
  action: "APPROVED" | "REJECTED";
  adminComment?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const dispute = await prisma.dispute.findUnique({
      where: { id: params.disputeId },
      include: {
        payslip: true,
        user: { select: { fullName: true } },
      },
    });

    if (!dispute) return { success: false, message: "Dispute not found." };
    if (dispute.status !== "PENDING") {
      return { success: false, message: "This dispute has already been resolved." };
    }

    const oldNetSalary = Number(dispute.payslip.finalNetSalary);
    const oldDeductions = Number(dispute.payslip.totalDeductions);
    const disputedAmount = Number(dispute.originalAmount);

    // Update dispute status
    await prisma.dispute.update({
      where: { id: params.disputeId },
      data: {
        status: params.action,
        adminComment: params.adminComment ?? null,
        reviewedBy: params.reviewerId,
        reviewedAt: new Date(),
      },
    });

    // If approved, recalculate the payslip net salary
    let newNetSalary = oldNetSalary;
    if (params.action === "APPROVED") {
      newNetSalary = oldNetSalary + disputedAmount;
      const newDeductions = Math.max(0, oldDeductions - disputedAmount);

      await prisma.monthlyPayslip.update({
        where: { id: dispute.payslipId },
        data: {
          totalDeductions: newDeductions,
          finalNetSalary: newNetSalary,
        },
      });
    }

    // Notify employee
    await prisma.notification.create({
      data: {
        userId: dispute.userId,
        title: `Dispute ${params.action}`,
        message:
          params.action === "APPROVED"
            ? `Your dispute for ${disputedAmount} SAR has been approved. Net salary adjusted to ${newNetSalary.toFixed(2)} SAR.`
            : `Your dispute for ${disputedAmount} SAR has been rejected. ${params.adminComment ?? ""}`,
        type: params.action === "APPROVED" ? "success" : "error",
      },
    });

    // Immutable system log
    await logSystemAction({
      actorId: params.reviewerId,
      actionType: `DISPUTE_${params.action}`,
      targetType: "dispute",
      targetId: params.disputeId,
      oldValue: {
        status: "PENDING",
        netSalary: oldNetSalary,
        totalDeductions: oldDeductions,
      },
      newValue: {
        status: params.action,
        netSalary: newNetSalary,
        totalDeductions: params.action === "APPROVED"
          ? Math.max(0, oldDeductions - disputedAmount)
          : oldDeductions,
        adminComment: params.adminComment,
      },
      description: `${params.reviewerName} ${params.action.toLowerCase()} dispute by ${dispute.user.fullName} for ${disputedAmount} SAR`,
    });

    return {
      success: true,
      message: `Dispute ${params.action.toLowerCase()}. ${
        params.action === "APPROVED" ? `Net salary adjusted by +${disputedAmount} SAR.` : ""
      }`,
    };
  } catch (error) {
    console.error("Resolve dispute failed:", error);
    return { success: false, message: "Failed to resolve dispute." };
  }
}

/**
 * Get disputes with filtering.
 */
export async function getDisputes(params?: {
  userId?: string;
  status?: string;
  limit?: number;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (params?.userId) where.userId = params.userId;
  if (params?.status) where.status = params.status;

  const disputes = await prisma.dispute.findMany({
    where,
    include: {
      user: { select: { fullName: true } },
      payslip: {
        select: { month: true, year: true, finalNetSalary: true },
      },
      reviewer: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: params?.limit ?? 50,
  });

  type DisputeRow = (typeof disputes)[number];

  return disputes.map((d: DisputeRow) => ({
    id: d.id,
    userId: d.userId,
    userName: d.user.fullName,
    payslipId: d.payslipId,
    payslipMonth: d.payslip.month,
    payslipYear: d.payslip.year,
    shiftId: d.shiftId,
    disputeType: d.disputeType,
    originalAmount: Number(d.originalAmount),
    reason: d.reason,
    status: d.status,
    adminComment: d.adminComment,
    reviewerName: d.reviewer?.fullName ?? null,
    reviewedAt: d.reviewedAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
  }));
}

// ============================================================
// 4. SAFETY NOTIFICATIONS (Branch Health Alerts)
// ============================================================

/**
 * Check all branches for "no check-in" alerts.
 * If a branch hasn't seen a single check-in 30 minutes after
 * opening time, create an EMERGENCY notification for the owner.
 */
export async function checkBranchHealthAlerts(): Promise<{
  alertsSent: number;
  details: string[];
}> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get all active branches with today's shifts
  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    include: {
      shifts: {
        where: {
          date: { gte: today, lt: tomorrow },
          status: { in: ["PUBLISHED", "COMPLETED"] },
        },
        select: {
          id: true,
          scheduledStart: true,
          attendanceLogs: {
            where: { type: "CLOCK_IN" },
            select: { id: true },
          },
        },
      },
    },
  });

  type BranchRow = (typeof branches)[number];
  type ShiftRow = BranchRow["shifts"][number];

  const alerts: string[] = [];

  // Get all owners
  const owners = await prisma.user.findMany({
    where: { role: "OWNER", isActive: true },
    select: { id: true },
  });

  for (const branch of branches) {
    if (branch.shifts.length === 0) continue;

    // Find earliest shift start
    const earliest = branch.shifts.reduce(
      (min: Date, s: ShiftRow) =>
        new Date(s.scheduledStart) < min ? new Date(s.scheduledStart) : min,
      new Date(branch.shifts[0].scheduledStart)
    );

    // Is it 30+ minutes past earliest start?
    const minutesPast = (now.getTime() - earliest.getTime()) / 60000;
    if (minutesPast < 30) continue;

    // Check if ANY check-in exists today for this branch
    const hasCheckIn = branch.shifts.some(
      (s: ShiftRow) => s.attendanceLogs.length > 0
    );

    if (!hasCheckIn) {
      const alertMsg = `ALERT: No check-ins detected at ${branch.name} — ${Math.round(minutesPast)} minutes past opening.`;
      alerts.push(alertMsg);

      // Send notification to all owners
      for (const owner of owners) {
        // Check if we already sent this alert today
        const existingAlert = await prisma.notification.findFirst({
          where: {
            userId: owner.id,
            type: "emergency",
            message: { contains: branch.name },
            createdAt: { gte: today },
          },
        });

        if (!existingAlert) {
          await prisma.notification.create({
            data: {
              userId: owner.id,
              title: "🚨 Branch Emergency Alert",
              message: alertMsg,
              type: "emergency",
              link: `/dashboard`,
            },
          });
        }
      }
    }
  }

  return { alertsSent: alerts.length, details: alerts };
}

/**
 * Handle offline-synced attendance (original timestamp preserved).
 */
export async function syncOfflineAttendance(params: {
  userId: string;
  shiftId: string;
  action: string;
  latitude: number;
  longitude: number;
  isWithinFence: boolean;
  originalTimestamp: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const shift = await prisma.shift.findFirst({
      where: { id: params.shiftId, userId: params.userId },
    });

    if (!shift) return { success: false, message: "Shift not found." };

    await prisma.attendanceLog.create({
      data: {
        userId: params.userId,
        shiftId: params.shiftId,
        type: params.action as "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END",
        timestamp: new Date(params.originalTimestamp), // Preserve original time
        latitude: params.latitude,
        longitude: params.longitude,
        isWithinFence: params.isWithinFence,
      },
    });

    // Log offline sync
    await logSystemAction({
      actorId: params.userId,
      actionType: "OFFLINE_SYNC",
      targetType: "attendance",
      targetId: params.shiftId,
      newValue: {
        action: params.action,
        originalTimestamp: params.originalTimestamp,
        syncedAt: new Date().toISOString(),
      },
      description: `Offline attendance synced: ${params.action} originally at ${params.originalTimestamp}`,
    });

    return { success: true, message: "Offline attendance synced successfully." };
  } catch (error) {
    console.error("Offline sync failed:", error);
    return { success: false, message: "Failed to sync offline attendance." };
  }
}
