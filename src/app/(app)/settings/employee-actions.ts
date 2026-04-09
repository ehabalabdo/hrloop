"use server";

// ============================================================
// Employee Management — Server Actions
// CRUD operations for employees (users)
// ============================================================

import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { unlink } from "fs/promises";
import path from "path";

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
  socialSecurityNumber?: string;
  employmentType: "FULL_TIME" | "HOURLY";
  assignedBranchIds?: string[];
  hourlyRate?: number;
  baseSalary?: number;
  transportationAllowance?: number;
  isFlexibleSchedule?: boolean;
  availability?: { dayOfWeek: number; startTime: string; endTime: string }[];
}

export interface EmployeeDocument {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
}

export interface EmployeeWithBranch {
  id: string;
  fullName: string;
  email: string;
  role: "OWNER" | "MANAGER" | "STAFF";
  phoneNumber: string | null;
  socialSecurityNumber: string | null;
  employmentType: "FULL_TIME" | "HOURLY";
  isFlexibleSchedule: boolean;
  primaryBranchId: string | null;
  isActive: boolean;
  createdAt: Date;
  primaryBranch: { id: string; name: string } | null;
  managedBranches: { id: string; name: string }[];
  assignedBranches: { branch: { id: string; name: string } }[];
  documents: EmployeeDocument[];
  availability: { dayOfWeek: number; startTime: string; endTime: string }[];
  payrollProfile: { baseSalary: number; hourlyRate: number; transportationAllowance: number } | null;
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
      assignedBranches: {
        include: {
          branch: { select: { id: true, name: true } },
        },
      },
      documents: {
        select: {
          id: true,
          fileName: true,
          originalName: true,
          fileSize: true,
          mimeType: true,
          uploadedAt: true,
        },
        orderBy: { uploadedAt: "desc" },
      },
      availability: {
        select: { dayOfWeek: true, startTime: true, endTime: true },
      },
      payrollProfile: {
        select: { baseSalary: true, hourlyRate: true, transportationAllowance: true },
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
      return { success: false, error: "Employee name is required" };
    }
    if (!data.email.trim()) {
      return { success: false, error: "Email is required" };
    }
    if (!data.password || data.password.length < 6) {
      return { success: false, error: "Password is required (at least 6 characters)" };
    }

    // Check for duplicate email
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });
    if (existing) {
      return { success: false, error: "Email is already in use" };
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
        socialSecurityNumber: data.socialSecurityNumber?.trim() || null,
        employmentType: data.employmentType || "FULL_TIME",
        isFlexibleSchedule: data.isFlexibleSchedule ?? false,
      },
    });

    // Create assigned branches
    if (data.assignedBranchIds && data.assignedBranchIds.length > 0) {
      await prisma.userBranch.createMany({
        data: data.assignedBranchIds.map((branchId) => ({
          userId: newUser.id,
          branchId,
        })),
      });
    }

    // Create availability records (for non-flexible employees)
    if (!data.isFlexibleSchedule && data.availability && data.availability.length > 0) {
      await prisma.availability.createMany({
        data: data.availability.map((a) => ({
          userId: newUser.id,
          dayOfWeek: a.dayOfWeek,
          startTime: a.startTime,
          endTime: a.endTime,
        })),
      });
    }

    // Create PayrollProfile with salary/rate info
    await prisma.payrollProfile.create({
      data: {
        userId: newUser.id,
        baseSalary: data.baseSalary ?? 0,
        hourlyRate: data.hourlyRate ?? 0,
        transportationAllowance: data.transportationAllowance ?? 0,
        overtimeRate: 0,
      },
    });

    return { success: true };
  } catch (e) {
    console.error("Failed to create employee:", e);
    return { success: false, error: "Failed to create employee" };
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
      return { success: false, error: "Employee name is required" };
    }
    if (!data.email.trim()) {
      return { success: false, error: "Email is required" };
    }

    // Check for duplicate email (exclude self)
    const existing = await prisma.user.findFirst({
      where: { email: data.email.toLowerCase().trim(), id: { not: id } },
    });
    if (existing) {
      return { success: false, error: "Email is already in use" };
    }

    const updateData: Record<string, unknown> = {
      fullName: data.fullName.trim(),
      email: data.email.toLowerCase().trim(),
      role: data.role,
      primaryBranchId: data.primaryBranchId || null,
      phoneNumber: data.phoneNumber?.trim() || null,
      socialSecurityNumber: data.socialSecurityNumber?.trim() || null,
      employmentType: data.employmentType || "FULL_TIME",
      isFlexibleSchedule: data.isFlexibleSchedule ?? false,
    };

    // Only update password if provided
    if (data.password && data.password.length >= 6) {
      updateData.passwordHash = await bcrypt.hash(data.password, 12);
    }

    await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Update PayrollProfile salary/rate
    await prisma.payrollProfile.upsert({
      where: { userId: id },
      update: {
        baseSalary: data.baseSalary ?? 0,
        hourlyRate: data.hourlyRate ?? 0,
        transportationAllowance: data.transportationAllowance ?? 0,
      },
      create: {
        userId: id,
        baseSalary: data.baseSalary ?? 0,
        hourlyRate: data.hourlyRate ?? 0,
        transportationAllowance: data.transportationAllowance ?? 0,
        overtimeRate: 0,
      },
    });

    // Update assigned branches: delete old and create new
    if (data.assignedBranchIds !== undefined) {
      await prisma.userBranch.deleteMany({ where: { userId: id } });
      if (data.assignedBranchIds.length > 0) {
        await prisma.userBranch.createMany({
          data: data.assignedBranchIds.map((branchId) => ({
            userId: id,
            branchId,
          })),
        });
      }
    }

    // Update availability records
    await prisma.availability.deleteMany({ where: { userId: id } });
    if (!data.isFlexibleSchedule && data.availability && data.availability.length > 0) {
      await prisma.availability.createMany({
        data: data.availability.map((a) => ({
          userId: id,
          dayOfWeek: a.dayOfWeek,
          startTime: a.startTime,
          endTime: a.endTime,
        })),
      });
    }

    return { success: true };
  } catch (e) {
    console.error("Failed to update employee:", e);
    return { success: false, error: "Failed to update employee" };
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
    return { success: false, error: "Failed to update employee status" };
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
      return { success: false, error: "Employee not found" };
    }

    if (user._count.managedBranches > 0) {
      return {
        success: false,
        error: `Cannot delete employee — manages ${user._count.managedBranches} branch(es)`,
      };
    }

    if (user._count.shifts > 0 || user._count.attendanceLogs > 0) {
      return {
        success: false,
        error: "Cannot delete employee — has shift or attendance records. You can deactivate instead.",
      };
    }

    await prisma.user.delete({ where: { id } });
    return { success: true };
  } catch (e) {
    console.error("Failed to delete employee:", e);
    return { success: false, error: "Failed to delete employee" };
  }
}

// ============================================================
// GET EMPLOYEE DOCUMENTS
// ============================================================
export async function getEmployeeDocuments(
  userId: string
): Promise<EmployeeDocument[]> {
  const docs = await prisma.employeeDocument.findMany({
    where: { userId },
    orderBy: { uploadedAt: "desc" },
  });
  return docs as unknown as EmployeeDocument[];
}

// ============================================================
// DELETE EMPLOYEE DOCUMENT
// ============================================================
export async function deleteEmployeeDocument(
  docId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const doc = await prisma.employeeDocument.findUnique({
      where: { id: docId },
    });
    if (!doc) {
      return { success: false, error: "File not found" };
    }

    // Delete file from filesystem
    const filePath = path.join(process.cwd(), "uploads", "employees", doc.fileName);
    try {
      await unlink(filePath);
    } catch {
      // File may already be deleted — continue
    }

    await prisma.employeeDocument.delete({ where: { id: docId } });
    return { success: true };
  } catch (e) {
    console.error("Failed to delete document:", e);
    return { success: false, error: "Failed to delete file" };
  }
}
