"use server";

// ============================================================
// Employee Management — Server Actions
// CRUD operations for employees (users)
// ============================================================

import prisma from "@/lib/db";
import bcrypt from "bcryptjs";

// ============================================================
// Types
// ============================================================

export interface EmployeeFormData {
  fullName: string;
  email: string;
  password?: string; // required for create, optional for update
  role: "OWNER" | "MANAGER" | "STAFF";
  primaryBranchId?: string;
  phoneNumber?: string;
}

export interface EmployeeWithBranch {
  id: string;
  fullName: string;
  email: string;
  role: "OWNER" | "MANAGER" | "STAFF";
  phoneNumber: string | null;
  primaryBranchId: string | null;
  isActive: boolean;
  createdAt: Date;
  primaryBranch: { id: string; name: string } | null;
  managedBranches: { id: string; name: string }[];
  _count: { shifts: number; attendanceLogs: number };
}

// ============================================================
// GET ALL EMPLOYEES
// ============================================================
export async function getEmployees(): Promise<EmployeeWithBranch[]> {
  const users = await prisma.user.findMany({
    include: {
      primaryBranch: {
        select: { id: true, name: true },
      },
      managedBranches: {
        select: { id: true, name: true },
      },
      _count: {
        select: { shifts: true, attendanceLogs: true },
      },
    },
    orderBy: [{ role: "asc" }, { fullName: "asc" }],
  });

  return users as unknown as EmployeeWithBranch[];
}

// ============================================================
// GET BRANCHES (for dropdown)
// ============================================================
export async function getActiveBranches(): Promise<
  { id: string; name: string }[]
> {
  return prisma.branch.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

// ============================================================
// CREATE EMPLOYEE
// ============================================================
export async function createEmployee(
  data: EmployeeFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!data.fullName.trim()) {
      return { success: false, error: "اسم الموظف مطلوب" };
    }
    if (!data.email.trim()) {
      return { success: false, error: "البريد الإلكتروني مطلوب" };
    }
    if (!data.password || data.password.length < 6) {
      return { success: false, error: "كلمة المرور مطلوبة (6 أحرف على الأقل)" };
    }

    // Check for duplicate email
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });
    if (existing) {
      return { success: false, error: "البريد الإلكتروني مستخدم بالفعل" };
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const newUser = await prisma.user.create({
      data: {
        fullName: data.fullName.trim(),
        email: data.email.toLowerCase().trim(),
        passwordHash,
        role: data.role,
        primaryBranchId: data.primaryBranchId || null,
        phoneNumber: data.phoneNumber?.trim() || null,
      },
    });

    // Create default PayrollProfile so payroll works for this employee
    await prisma.payrollProfile.create({
      data: {
        userId: newUser.id,
        baseSalary: 0,
        hourlyRate: 0,
        overtimeRate: 0,
      },
    });

    return { success: true };
  } catch (e) {
    console.error("Failed to create employee:", e);
    return { success: false, error: "فشل في إنشاء الموظف" };
  }
}

// ============================================================
// UPDATE EMPLOYEE
// ============================================================
export async function updateEmployee(
  id: string,
  data: EmployeeFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!data.fullName.trim()) {
      return { success: false, error: "اسم الموظف مطلوب" };
    }
    if (!data.email.trim()) {
      return { success: false, error: "البريد الإلكتروني مطلوب" };
    }

    // Check for duplicate email (exclude self)
    const existing = await prisma.user.findFirst({
      where: { email: data.email.toLowerCase().trim(), id: { not: id } },
    });
    if (existing) {
      return { success: false, error: "البريد الإلكتروني مستخدم بالفعل" };
    }

    const updateData: Record<string, unknown> = {
      fullName: data.fullName.trim(),
      email: data.email.toLowerCase().trim(),
      role: data.role,
      primaryBranchId: data.primaryBranchId || null,
      phoneNumber: data.phoneNumber?.trim() || null,
    };

    // Only update password if provided
    if (data.password && data.password.length >= 6) {
      updateData.passwordHash = await bcrypt.hash(data.password, 12);
    }

    await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return { success: true };
  } catch (e) {
    console.error("Failed to update employee:", e);
    return { success: false, error: "فشل في تحديث بيانات الموظف" };
  }
}

// ============================================================
// TOGGLE EMPLOYEE ACTIVE STATUS
// ============================================================
export async function toggleEmployeeActive(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.user.update({
      where: { id },
      data: { isActive },
    });
    return { success: true };
  } catch (e) {
    console.error("Failed to toggle employee:", e);
    return { success: false, error: "فشل في تحديث حالة الموظف" };
  }
}

// ============================================================
// DELETE EMPLOYEE (only if no shifts/attendance)
// ============================================================
export async function deleteEmployee(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: { select: { shifts: true, attendanceLogs: true, managedBranches: true } },
      },
    });

    if (!user) {
      return { success: false, error: "الموظف غير موجود" };
    }

    if (user._count.managedBranches > 0) {
      return {
        success: false,
        error: `لا يمكن حذف الموظف — مسؤول عن ${user._count.managedBranches} فرع`,
      };
    }

    if (user._count.shifts > 0 || user._count.attendanceLogs > 0) {
      return {
        success: false,
        error: "لا يمكن حذف الموظف — لديه سجلات ورديات أو حضور. يمكنك تعطيله بدلاً من ذلك",
      };
    }

    await prisma.user.delete({ where: { id } });
    return { success: true };
  } catch (e) {
    console.error("Failed to delete employee:", e);
    return { success: false, error: "فشل في حذف الموظف" };
  }
}
