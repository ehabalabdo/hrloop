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
      return { success: false, message: "لا يمكنك اختيار نفسك كبديل." };
    }

    // Verify the shift belongs to the requester
    const shift = await prisma.shift.findUnique({
      where: { id: data.shiftId },
      include: {
        user: { select: { fullName: true } },
        branch: { select: { name: true } },
      },
    });

    if (!shift) return { success: false, message: "الوردية غير موجودة." };
    if (shift.userId !== data.requesterId) {
      return { success: false, message: "هذه الوردية ليست مسجلة لك." };
    }

    // Check no existing pending swap for same shift
    const existing = await prisma.shiftSwap.findFirst({
      where: {
        shiftId: data.shiftId,
        status: { in: ["PENDING_REPLACEMENT", "PENDING_MANAGER"] },
      },
    });

    if (existing) {
      return { success: false, message: "يوجد بالفعل طلب تبديل على هذه الوردية." };
    }

    const replacement = await prisma.user.findUnique({
      where: { id: data.replacementId },
      select: { fullName: true },
    });

    if (!replacement) {
      return { success: false, message: "الموظف البديل غير موجود." };
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
    const shiftDate = new Date(shift.date).toLocaleDateString("ar-SA");
    await prisma.notification.create({
      data: {
        userId: data.replacementId,
        title: "طلب تبديل وردية",
        message: `${shift.user.fullName} يطلب منك تغطية ورديته في ${shift.branch.name} بتاريخ ${shiftDate}`,
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
        description: `${shift.user.fullName} طلب تبديل وردية مع ${replacement.fullName}`,
      },
    });

    return { success: true, message: "تم إرسال طلب التبديل بنجاح." };
  } catch (error) {
    console.error("Create swap failed:", error);
    return { success: false, message: "فشل في إنشاء طلب التبديل." };
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

    if (!swap) return { success: false, message: "طلب التبديل غير موجود." };
    if (swap.replacementId !== data.replacementId) {
      return { success: false, message: "غير مصرّح لك بالرد على هذا الطلب." };
    }
    if (swap.status !== "PENDING_REPLACEMENT") {
      return { success: false, message: "هذا الطلب لم يعد بانتظار ردك." };
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
          title: "رفض طلب التبديل",
          message: `${swap.replacement.fullName} رفض طلب تبديل الوردية.${data.note ? ` السبب: ${data.note}` : ""}`,
          type: "warning",
          link: "/swap",
        },
      });

      return { success: true, message: "تم رفض طلب التبديل." };
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

    const shiftDate = new Date(swap.shift.date).toLocaleDateString("ar-SA");
    for (const mgr of managers) {
      await prisma.notification.create({
        data: {
          userId: mgr.id,
          title: "طلب تبديل بانتظار الموافقة",
          message: `${swap.requester.fullName} يريد تبديل ورديته مع ${swap.replacement.fullName} في ${swap.shift.branch.name} بتاريخ ${shiftDate}`,
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
        description: `${swap.replacement.fullName} وافق على تغطية وردية ${swap.requester.fullName}`,
      },
    });

    return { success: true, message: "تمت الموافقة. بانتظار موافقة المدير." };
  } catch (error) {
    console.error("Respond to swap failed:", error);
    return { success: false, message: "فشل في تحديث طلب التبديل." };
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

    if (!swap) return { success: false, message: "طلب التبديل غير موجود." };
    if (swap.status !== "PENDING_MANAGER") {
      return { success: false, message: "هذا الطلب ليس بانتظار موافقة المدير." };
    }

    const manager = await prisma.user.findUnique({
      where: { id: data.managerId },
      select: { fullName: true, role: true },
    });

    if (!manager || (manager.role !== "OWNER" && manager.role !== "MANAGER")) {
      return { success: false, message: "غير مصرّح لك بمراجعة هذا الطلب." };
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
      const shiftDate = new Date(swap.shift.date).toLocaleDateString("ar-SA");
      const msg = `رفض المدير طلب تبديل الوردية بتاريخ ${shiftDate}.${data.note ? ` السبب: ${data.note}` : ""}`;
      await prisma.notification.createMany({
        data: [
          { userId: swap.requesterId, title: "رفض طلب التبديل", message: msg, type: "warning", link: "/swap" },
          { userId: swap.replacementId, title: "رفض طلب التبديل", message: msg, type: "warning", link: "/swap" },
        ],
      });

      return { success: true, message: "تم رفض طلب التبديل." };
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
    const shiftDate = new Date(swap.shift.date).toLocaleDateString("ar-SA");
    await prisma.notification.createMany({
      data: [
        {
          userId: swap.requesterId,
          title: "تمت الموافقة على التبديل",
          message: `تمت الموافقة على تبديل ورديتك بتاريخ ${shiftDate}. ${swap.replacement.fullName} سيغطي مكانك.`,
          type: "success",
          link: "/swap",
        },
        {
          userId: swap.replacementId,
          title: "تمت الموافقة على التبديل",
          message: `تمت الموافقة على تغطيتك لوردية ${swap.requester.fullName} في ${swap.shift.branch.name} بتاريخ ${shiftDate}.`,
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
        description: `${manager.fullName} وافق على تبديل وردية ${swap.requester.fullName} مع ${swap.replacement.fullName}`,
      },
    });

    return { success: true, message: "تمت الموافقة وتم تحديث الوردية." };
  } catch (error) {
    console.error("Review swap failed:", error);
    return { success: false, message: "فشل في مراجعة طلب التبديل." };
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

    if (!swap) return { success: false, message: "طلب التبديل غير موجود." };
    if (swap.requesterId !== userId) {
      return { success: false, message: "غير مصرّح لك بإلغاء هذا الطلب." };
    }
    if (swap.status !== "PENDING_REPLACEMENT" && swap.status !== "PENDING_MANAGER") {
      return { success: false, message: "لا يمكن إلغاء هذا الطلب." };
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
          title: "إلغاء طلب التبديل",
          message: "تم إلغاء طلب تبديل الوردية من قبل الموظف.",
          type: "info",
          link: "/swap",
        },
      });
    }

    return { success: true, message: "تم إلغاء طلب التبديل." };
  } catch (error) {
    console.error("Cancel swap failed:", error);
    return { success: false, message: "فشل في إلغاء طلب التبديل." };
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
