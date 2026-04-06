"use server";

// ============================================================
// Branch Management — Server Actions
// CRUD operations for branches
// ============================================================

import prisma from "@/lib/db";

export interface BranchFormData {
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  geofenceRadius: number;
  managerId?: string;
  openTime?: string;
  closeTime?: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
  minStaff?: number;
}

export interface BranchWithManager {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  geofenceRadius: number;
  managerId: string | null;
  openTime: string | null;
  closeTime: string | null;
  shiftStartTime: string | null;
  shiftEndTime: string | null;
  minStaff: number;
  isActive: boolean;
  createdAt: Date;
  manager: { id: string; fullName: string } | null;
  _count: { users: number; shifts: number };
}

// ============================================================
// GET ALL BRANCHES
// ============================================================
export async function getBranches(): Promise<BranchWithManager[]> {
  const branches = await prisma.branch.findMany({
    include: {
      manager: {
        select: { id: true, fullName: true },
      },
      _count: {
        select: { users: true, shifts: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return branches as unknown as BranchWithManager[];
}

// ============================================================
// GET MANAGERS (for dropdown)
// ============================================================
export async function getAvailableManagers(): Promise<
  { id: string; fullName: string }[]
> {
  const managers = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ["OWNER", "MANAGER"] },
    },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  return managers;
}

// ============================================================
// CREATE BRANCH
// ============================================================
export async function createBranch(
  data: BranchFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check for duplicate name
    const existing = await prisma.branch.findFirst({
      where: { name: data.name },
    });
    if (existing) {
      return { success: false, error: "يوجد فرع بنفس الاسم بالفعل" };
    }

    await prisma.branch.create({
      data: {
        name: data.name,
        address: data.address || null,
        latitude: data.latitude,
        longitude: data.longitude,
        geofenceRadius: data.geofenceRadius,
        managerId: data.managerId || null,
        openTime: data.openTime || null,
        closeTime: data.closeTime || null,
        shiftStartTime: data.shiftStartTime || null,
        shiftEndTime: data.shiftEndTime || null,
        minStaff: data.minStaff ?? 0,
      },
    });

    return { success: true };
  } catch (e) {
    console.error("Failed to create branch:", e);
    return { success: false, error: "فشل في إنشاء الفرع" };
  }
}

// ============================================================
// UPDATE BRANCH
// ============================================================
export async function updateBranch(
  id: string,
  data: BranchFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check for duplicate name (exclude self)
    const existing = await prisma.branch.findFirst({
      where: { name: data.name, id: { not: id } },
    });
    if (existing) {
      return { success: false, error: "يوجد فرع بنفس الاسم بالفعل" };
    }

    await prisma.branch.update({
      where: { id },
      data: {
        name: data.name,
        address: data.address || null,
        latitude: data.latitude,
        longitude: data.longitude,
        geofenceRadius: data.geofenceRadius,
        managerId: data.managerId || null,
        openTime: data.openTime || null,
        closeTime: data.closeTime || null,
        shiftStartTime: data.shiftStartTime || null,
        shiftEndTime: data.shiftEndTime || null,
        minStaff: data.minStaff ?? 0,
      },
    });

    return { success: true };
  } catch (e) {
    console.error("Failed to update branch:", e);
    return { success: false, error: "فشل في تحديث الفرع" };
  }
}

// ============================================================
// TOGGLE BRANCH ACTIVE STATUS
// ============================================================
export async function toggleBranchActive(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.branch.update({
      where: { id },
      data: { isActive },
    });
    return { success: true };
  } catch (e) {
    console.error("Failed to toggle branch:", e);
    return { success: false, error: "فشل في تحديث حالة الفرع" };
  }
}

// ============================================================
// DELETE BRANCH (only if no users/shifts)
// ============================================================
export async function deleteBranch(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check for dependencies
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, shifts: true } },
      },
    });

    if (!branch) {
      return { success: false, error: "الفرع غير موجود" };
    }

    if (branch._count.users > 0) {
      return {
        success: false,
        error: `لا يمكن حذف الفرع - يوجد ${branch._count.users} موظف مرتبط به`,
      };
    }

    if (branch._count.shifts > 0) {
      return {
        success: false,
        error: `لا يمكن حذف الفرع - يوجد ${branch._count.shifts} وردية مرتبطة به`,
      };
    }

    await prisma.branch.delete({ where: { id } });
    return { success: true };
  } catch (e) {
    console.error("Failed to delete branch:", e);
    return { success: false, error: "فشل في حذف الفرع" };
  }
}
