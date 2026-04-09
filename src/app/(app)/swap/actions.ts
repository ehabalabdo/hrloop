"use server";

// ============================================================
// Shift Swap — Two-step approval flow
//   1. Employee creates swap → notification to replacement
//   2. Replacement accepts → notification to manager
//   3. Manager approves → swap confirmed, shift reassigned
// ============================================================

import prisma from "@/lib/db";

// ============================================================
// TYPES
// ============================================================

export type SwapItem = {
  id: string;
  requesterId: string;
  requesterName: string;
  replacementId: string;
  replacementName: string;
  shiftId: string;
  shiftDate: string;
  shiftStart: string;
  shiftEnd: string;
  branchName: string;
  status: string;
  reason: string | null;
  replacementNote: string | null;
  managerNote: string | null;
  managerName: string | null;
  replacementRespondedAt: string | null;
  managerRespondedAt: string | null;
  createdAt: string;
};

// ============================================================
// CREATE SWAP REQUEST — Employee picks a replacement
// ============================================================

export async function createSwapRequest(data: {
  requesterId: string;
  replacementId: string;
  shiftId: string;
  reason?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    if (data.requesterId === data.replacementId) {
      return { success: false, message: "You cannot select yourself as replacement." };
    }

    // Verify the shift belongs to the requester
    const shift = await prisma.shift.findUnique({
      where: { id: data.shiftId },
      include: {
        user: { select: { fullName: true } },
        branch: { select: { name: true } },
      },
    });

    if (!shift) return { success: false, message: "Shift not found." };
    if (shift.userId !== data.requesterId) {
      return { success: false, message: "This shift is not assigned to you." };
    }

    // Check no existing pending swap for same shift
    const existing = await prisma.shiftSwap.findFirst({
      where: {
        shiftId: data.shiftId,
        status: { in: ["PENDING_REPLACEMENT", "PENDING_MANAGER"] },
      },
    });

    if (existing) {
      return { success: false, message: "A swap request already exists for this shift." };
    }

    const replacement = await prisma.user.findUnique({
      where: { id: data.replacementId },
      select: { fullName: true },
    });

    if (!replacement) {
      return { success: false, message: "Replacement employee not found." };
    }

    // Create the swap request
    await prisma.shiftSwap.create({
      data: {
        requesterId: data.requesterId,
        replacementId: data.replacementId,
        shiftId: data.shiftId,
        reason: data.reason || null,
      },
    });

    // Notify the replacement employee
    const shiftDate = new Date(shift.date).toLocaleDateString("en-US");
    await prisma.notification.create({
      data: {
        userId: data.replacementId,
        title: "Shift Swap Request",
        message: `${shift.user.fullName} is asking you to cover their shift at ${shift.branch.name} on ${shiftDate}`,
        type: "info",
        link: "/swap",
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        actorId: data.requesterId,
        actorName: shift.user.fullName,
        action: "SWAP_REQUESTED",
        entityType: "shift_swap",
        entityId: data.shiftId,
        description: `${shift.user.fullName} requested a shift swap with ${replacement.fullName}`,
      },
    });

    return { success: true, message: "Swap request sent successfully." };
  } catch (error) {
    console.error("Create swap failed:", error);
    return { success: false, message: "Failed to create swap request." };
  }
}

// ============================================================
// REPLACEMENT RESPONDS — Accept or reject
// ============================================================

export async function respondToSwap(data: {
  swapId: string;
  replacementId: string;
  action: "ACCEPT" | "REJECT";
  note?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const swap = await prisma.shiftSwap.findUnique({
      where: { id: data.swapId },
      include: {
        requester: { select: { fullName: true } },
        replacement: { select: { fullName: true } },
        shift: { include: { branch: { select: { name: true, managerId: true } } } },
      },
    });

    if (!swap) return { success: false, message: "Swap request not found." };
    if (swap.replacementId !== data.replacementId) {
      return { success: false, message: "You are not authorized to respond to this request." };
    }
    if (swap.status !== "PENDING_REPLACEMENT") {
      return { success: false, message: "This request is no longer awaiting your response." };
    }

    if (data.action === "REJECT") {
      await prisma.shiftSwap.update({
        where: { id: data.swapId },
        data: {
          status: "REJECTED_REPLACEMENT",
          replacementNote: data.note || null,
          replacementRespondedAt: new Date(),
        },
      });

      // Notify requester that replacement declined
      await prisma.notification.create({
        data: {
          userId: swap.requesterId,
          title: "Swap Request Declined",
          message: `${swap.replacement.fullName} declined the swap request.${data.note ? ` Reason: ${data.note}` : ""}`,
          type: "warning",
          link: "/swap",
        },
      });

      return { success: true, message: "Swap request declined." };
    }

    // ACCEPT → move to PENDING_MANAGER
    await prisma.shiftSwap.update({
      where: { id: data.swapId },
      data: {
        status: "PENDING_MANAGER",
        replacementNote: data.note || null,
        replacementRespondedAt: new Date(),
      },
    });

    // Notify the branch manager (or all OWNER/MANAGER users)
    const managers = await prisma.user.findMany({
      where: {
        OR: [
          { role: "OWNER" },
          { role: "MANAGER" },
        ],
        isActive: true,
      },
      select: { id: true },
    });

    const shiftDate = new Date(swap.shift.date).toLocaleDateString("en-US");
    for (const mgr of managers) {
      await prisma.notification.create({
        data: {
          userId: mgr.id,
          title: "Swap Request Pending Approval",
          message: `${swap.requester.fullName} wants to swap their shift with ${swap.replacement.fullName} at ${swap.shift.branch.name} on ${shiftDate}`,
          type: "info",
          link: "/swap",
        },
      });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        actorId: data.replacementId,
        actorName: swap.replacement.fullName,
        action: "SWAP_REPLACEMENT_ACCEPTED",
        entityType: "shift_swap",
        entityId: data.swapId,
        description: `${swap.replacement.fullName} accepted to cover ${swap.requester.fullName}'s shift`,
      },
    });

    return { success: true, message: "Accepted. Awaiting manager approval." };
  } catch (error) {
    console.error("Respond to swap failed:", error);
    return { success: false, message: "Failed to update swap request." };
  }
}

// ============================================================
// MANAGER REVIEW — Final approval or rejection
// ============================================================

export async function reviewSwap(data: {
  swapId: string;
  managerId: string;
  action: "APPROVED" | "REJECTED";
  note?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const swap = await prisma.shiftSwap.findUnique({
      where: { id: data.swapId },
      include: {
        requester: { select: { fullName: true } },
        replacement: { select: { fullName: true } },
        shift: { include: { branch: { select: { name: true } } } },
      },
    });

    if (!swap) return { success: false, message: "Swap request not found." };
    if (swap.status !== "PENDING_MANAGER") {
      return { success: false, message: "This request is not awaiting manager approval." };
    }

    const manager = await prisma.user.findUnique({
      where: { id: data.managerId },
      select: { fullName: true, role: true },
    });

    if (!manager || (manager.role !== "OWNER" && manager.role !== "MANAGER")) {
      return { success: false, message: "You are not authorized to review this request." };
    }

    if (data.action === "REJECTED") {
      await prisma.shiftSwap.update({
        where: { id: data.swapId },
        data: {
          status: "REJECTED_MANAGER",
          managerId: data.managerId,
          managerNote: data.note || null,
          managerRespondedAt: new Date(),
        },
      });

      // Notify both employees
      const shiftDate = new Date(swap.shift.date).toLocaleDateString("en-US");
      const msg = `Manager declined the shift swap request on ${shiftDate}.${data.note ? ` Reason: ${data.note}` : ""}`;
      await prisma.notification.createMany({
        data: [
          { userId: swap.requesterId, title: "Swap Request Declined", message: msg, type: "warning", link: "/swap" },
          { userId: swap.replacementId, title: "Swap Request Declined", message: msg, type: "warning", link: "/swap" },
        ],
      });

      return { success: true, message: "Swap request declined." };
    }

    // APPROVED → reassign the shift to the replacement employee
    await prisma.$transaction([
      prisma.shiftSwap.update({
        where: { id: data.swapId },
        data: {
          status: "APPROVED",
          managerId: data.managerId,
          managerNote: data.note || null,
          managerRespondedAt: new Date(),
        },
      }),
      prisma.shift.update({
        where: { id: swap.shiftId },
        data: { userId: swap.replacementId },
      }),
    ]);

    // Notify both employees
    const shiftDate = new Date(swap.shift.date).toLocaleDateString("en-US");
    await prisma.notification.createMany({
      data: [
        {
          userId: swap.requesterId,
          title: "Swap Approved",
          message: `Your shift swap on ${shiftDate} has been approved. ${swap.replacement.fullName} will cover for you.`,
          type: "success",
          link: "/swap",
        },
        {
          userId: swap.replacementId,
          title: "Swap Approved",
          message: `Your coverage of ${swap.requester.fullName}'s shift at ${swap.shift.branch.name} on ${shiftDate} has been approved.`,
          type: "success",
          link: "/swap",
        },
      ],
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        actorId: data.managerId,
        actorName: manager.fullName,
        action: "SWAP_APPROVED",
        entityType: "shift_swap",
        entityId: data.swapId,
        description: `${manager.fullName} approved the shift swap between ${swap.requester.fullName} and ${swap.replacement.fullName}`,
      },
    });

    return { success: true, message: "Approved and shift updated." };
  } catch (error) {
    console.error("Review swap failed:", error);
    return { success: false, message: "Failed to review swap request." };
  }
}

// ============================================================
// CANCEL SWAP — Only requester can cancel (while still pending)
// ============================================================

export async function cancelSwap(
  swapId: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const swap = await prisma.shiftSwap.findUnique({
      where: { id: swapId },
      include: { replacement: { select: { fullName: true } } },
    });

    if (!swap) return { success: false, message: "Swap request not found." };
    if (swap.requesterId !== userId) {
      return { success: false, message: "You are not authorized to cancel this request." };
    }
    if (swap.status !== "PENDING_REPLACEMENT" && swap.status !== "PENDING_MANAGER") {
      return { success: false, message: "This request cannot be cancelled." };
    }

    await prisma.shiftSwap.update({
      where: { id: swapId },
      data: { status: "CANCELLED" },
    });

    // Notify replacement if they haven't responded yet
    if (swap.status === "PENDING_REPLACEMENT") {
      await prisma.notification.create({
        data: {
          userId: swap.replacementId,
          title: "Swap Request Cancelled",
          message: "The shift swap request was cancelled by the employee.",
          type: "info",
          link: "/swap",
        },
      });
    }

    return { success: true, message: "Swap request cancelled." };
  } catch (error) {
    console.error("Cancel swap failed:", error);
    return { success: false, message: "Failed to cancel swap request." };
  }
}

// ============================================================
// GET SWAP REQUESTS — Filtered view for all roles
// ============================================================

export async function getSwapRequests(
  userId: string,
  role: string,
  statusFilter?: string
): Promise<SwapItem[]> {
  try {
    // Build where clause based on role
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (statusFilter) {
      where.status = statusFilter;
    }

    // STAFF sees only their requests (as requester or replacement)
    if (role === "STAFF") {
      where.OR = [{ requesterId: userId }, { replacementId: userId }];
    }
    // MANAGER/OWNER see all

    const swaps = await prisma.shiftSwap.findMany({
      where,
      include: {
        requester: { select: { fullName: true } },
        replacement: { select: { fullName: true } },
        shift: {
          include: { branch: { select: { name: true } } },
        },
        manager: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    type SwapEntry = (typeof swaps)[number];

    return swaps.map((s: SwapEntry) => ({
      id: s.id,
      requesterId: s.requesterId,
      requesterName: s.requester.fullName,
      replacementId: s.replacementId,
      replacementName: s.replacement.fullName,
      shiftId: s.shiftId,
      shiftDate: new Date(s.shift.date).toISOString().split("T")[0],
      shiftStart: s.shift.scheduledStart.toISOString(),
      shiftEnd: s.shift.scheduledEnd.toISOString(),
      branchName: s.shift.branch.name,
      status: s.status,
      reason: s.reason,
      replacementNote: s.replacementNote,
      managerNote: s.managerNote,
      managerName: s.manager?.fullName ?? null,
      replacementRespondedAt: s.replacementRespondedAt?.toISOString() ?? null,
      managerRespondedAt: s.managerRespondedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error("Get swap requests failed:", error);
    return [];
  }
}

// ============================================================
// GET MY SHIFTS — Upcoming shifts for a user (to pick which to swap)
// ============================================================

export async function getMyShifts(userId: string) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const shifts = await prisma.shift.findMany({
      where: {
        userId,
        date: { gte: today },
        status: { in: ["DRAFT", "PUBLISHED"] },
      },
      include: { branch: { select: { name: true } } },
      orderBy: { date: "asc" },
    });

    type ShiftEntry = (typeof shifts)[number];

    return shifts.map((s: ShiftEntry) => ({
      id: s.id,
      date: new Date(s.date).toISOString().split("T")[0],
      scheduledStart: s.scheduledStart.toISOString(),
      scheduledEnd: s.scheduledEnd.toISOString(),
      branchName: s.branch.name,
      status: s.status,
    }));
  } catch (error) {
    console.error("Get my shifts failed:", error);
    return [];
  }
}

// ============================================================
// GET ELIGIBLE REPLACEMENTS — Active employees (excluding requester)
// ============================================================

export async function getEligibleReplacements(requesterId: string) {
  try {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        id: { not: requesterId },
      },
      select: { id: true, fullName: true, role: true },
      orderBy: { fullName: "asc" },
    });

    type UserEntry = (typeof users)[number];

    return users.map((u: UserEntry) => ({
      id: u.id,
      name: u.fullName,
      role: u.role,
    }));
  } catch (error) {
    console.error("Get eligible replacements failed:", error);
    return [];
  }
}
