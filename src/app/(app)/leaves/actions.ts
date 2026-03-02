"use server";

// ============================================================
// Leave Management - Server Actions
// CRUD for leave requests + approval workflow
// When approved, marks employee unavailable for scheduling
// and affects payroll (paid vs unpaid)
// ============================================================

import prisma from "@/lib/db";
import type { LeaveRequestItem, LeaveBalance } from "@/lib/leave-types";

// ============================================================
// Helper: count business days between two dates
// ============================================================
function countDays(start: Date, end: Date): number {
  let count = 0;
  const d = new Date(start);
  while (d <= end) {
    count++;
    d.setDate(d.getDate() + 1);
  }
  return Math.max(count, 1);
}

// ============================================================
// CREATE LEAVE REQUEST
// ============================================================
export async function createLeaveRequest(data: {
  userId: string;
  type: string;
  startDate: string;
  endDate: string;
  reason?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    if (end < start) {
      return { success: false, message: "End date must be after start date." };
    }

    // Check for overlapping approved/pending leaves
    const overlap = await prisma.leaveRequest.findFirst({
      where: {
        userId: data.userId,
        status: { in: ["PENDING", "APPROVED"] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });

    if (overlap) {
      return {
        success: false,
        message: "Overlapping leave request already exists.",
      };
    }

    // Determine if paid
    const isPaid = data.type !== "UNPAID";

    await prisma.leaveRequest.create({
      data: {
        userId: data.userId,
        type: data.type as "ANNUAL" | "SICK" | "EMERGENCY" | "UNPAID",
        startDate: start,
        endDate: end,
        reason: data.reason || null,
        isPaid,
      },
    });

    // Log activity
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { fullName: true },
    });

    await prisma.activityLog.create({
      data: {
        actorId: data.userId,
        actorName: user?.fullName ?? "Unknown",
        action: "LEAVE_REQUESTED",
        entityType: "leave",
        description: `${user?.fullName} requested ${data.type} leave from ${data.startDate} to ${data.endDate}`,
      },
    });

    return { success: true, message: "Leave request submitted successfully." };
  } catch (error) {
    console.error("Create leave request failed:", error);
    return { success: false, message: "Failed to create leave request." };
  }
}

// ============================================================
// GET LEAVE REQUESTS (Admin / User)
// ============================================================
export async function getLeaveRequests(
  status?: string,
  userId?: string
): Promise<LeaveRequestItem[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (status && status !== "ALL") where.status = status;
  if (userId) where.userId = userId;

  const requests = await prisma.leaveRequest.findMany({
    where,
    include: {
      user: {
        select: {
          fullName: true,
          role: true,
          primaryBranch: { select: { name: true } },
        },
      },
      reviewer: {
        select: { fullName: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  type LeaveWithIncludes = (typeof requests)[number];

  return requests.map((r: LeaveWithIncludes) => ({
    id: r.id,
    userId: r.userId,
    userName: r.user.fullName,
    userRole: r.user.role,
    branchName: r.user.primaryBranch?.name ?? null,
    type: r.type,
    status: r.status,
    startDate: new Date(r.startDate).toISOString().split("T")[0],
    endDate: new Date(r.endDate).toISOString().split("T")[0],
    days: countDays(new Date(r.startDate), new Date(r.endDate)),
    reason: r.reason,
    isPaid: r.isPaid,
    reviewerName: r.reviewer?.fullName ?? null,
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    reviewerNote: r.reviewerNote,
    createdAt: r.createdAt.toISOString(),
  }));
}

// ============================================================
// APPROVE / REJECT LEAVE
// ============================================================
export async function reviewLeaveRequest(data: {
  leaveId: string;
  reviewerId: string;
  action: "APPROVED" | "REJECTED";
  note?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: data.leaveId },
      include: { user: { select: { fullName: true } } },
    });

    if (!leave) return { success: false, message: "Leave request not found." };
    if (leave.status !== "PENDING")
      return { success: false, message: "Leave is not in pending status." };

    const reviewer = await prisma.user.findUnique({
      where: { id: data.reviewerId },
      select: { fullName: true },
    });

    await prisma.leaveRequest.update({
      where: { id: data.leaveId },
      data: {
        status: data.action,
        reviewerId: data.reviewerId,
        reviewedAt: new Date(),
        reviewerNote: data.note || null,
      },
    });

    // If approved, create notification for employee
    if (data.action === "APPROVED") {
      await prisma.notification.create({
        data: {
          userId: leave.userId,
          title: "Leave Approved",
          message: `Your ${leave.type} leave from ${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()} has been approved.`,
          type: "success",
          link: "/leaves",
        },
      });
    } else {
      await prisma.notification.create({
        data: {
          userId: leave.userId,
          title: "Leave Rejected",
          message: `Your ${leave.type} leave request has been rejected. ${data.note ? `Reason: ${data.note}` : ""}`,
          type: "warning",
          link: "/leaves",
        },
      });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        actorId: data.reviewerId,
        actorName: reviewer?.fullName ?? "Unknown",
        action: `LEAVE_${data.action}`,
        entityType: "leave",
        entityId: data.leaveId,
        description: `${reviewer?.fullName} ${data.action.toLowerCase()} ${leave.user.fullName}'s ${leave.type} leave`,
      },
    });

    return {
      success: true,
      message: `Leave request ${data.action.toLowerCase()}.`,
    };
  } catch (error) {
    console.error("Review leave failed:", error);
    return { success: false, message: "Failed to review leave request." };
  }
}

// ============================================================
// CANCEL LEAVE
// ============================================================
export async function cancelLeaveRequest(
  leaveId: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
    });

    if (!leave) return { success: false, message: "Leave request not found." };
    if (leave.userId !== userId)
      return { success: false, message: "Not authorized." };
    if (leave.status !== "PENDING")
      return { success: false, message: "Only pending leaves can be cancelled." };

    await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: { status: "CANCELLED" },
    });

    return { success: true, message: "Leave request cancelled." };
  } catch (error) {
    console.error("Cancel leave failed:", error);
    return { success: false, message: "Failed to cancel leave request." };
  }
}

// ============================================================
// GET LEAVE BALANCE
// ============================================================
export async function getLeaveBalance(
  userId: string,
  year: number
): Promise<LeaveBalance> {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  const approvedLeaves = await prisma.leaveRequest.findMany({
    where: {
      userId,
      status: "APPROVED",
      startDate: { gte: yearStart },
      endDate: { lte: yearEnd },
    },
  });

  type ApprovedLeave = (typeof approvedLeaves)[number];

  let annualUsed = 0;
  let sickUsed = 0;
  let emergencyUsed = 0;
  let unpaidUsed = 0;

  for (const leave of approvedLeaves) {
    const days = countDays(new Date(leave.startDate), new Date(leave.endDate));
    switch ((leave as ApprovedLeave).type) {
      case "ANNUAL":
        annualUsed += days;
        break;
      case "SICK":
        sickUsed += days;
        break;
      case "EMERGENCY":
        emergencyUsed += days;
        break;
      case "UNPAID":
        unpaidUsed += days;
        break;
    }
  }

  // Fetch settings for leave limits
  const annualSetting = await prisma.globalSetting.findUnique({
    where: { key: "annual_leave_days" },
  });
  const emergencySetting = await prisma.globalSetting.findUnique({
    where: { key: "emergency_leave_days" },
  });

  const annualTotal = annualSetting ? parseInt(annualSetting.value) : 21;
  const emergencyTotal = emergencySetting
    ? parseInt(emergencySetting.value)
    : 5;

  return {
    annual: {
      used: annualUsed,
      total: annualTotal,
      remaining: Math.max(0, annualTotal - annualUsed),
    },
    sick: { used: sickUsed },
    emergency: {
      used: emergencyUsed,
      total: emergencyTotal,
      remaining: Math.max(0, emergencyTotal - emergencyUsed),
    },
    unpaid: { used: unpaidUsed },
  };
}

// ============================================================
// GET ALL EMPLOYEES (for leave form dropdown)
// ============================================================
export async function getLeaveEmployees(): Promise<
  { id: string; name: string; role: string }[]
> {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, fullName: true, role: true },
    orderBy: { fullName: "asc" },
  });

  type UserItem = (typeof users)[number];

  return users.map((u: UserItem) => ({
    id: u.id,
    name: u.fullName,
    role: u.role,
  }));
}
