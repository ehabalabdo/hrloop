"use server";

// ============================================================
// Attendance Server Actions
// Handles all attendance-related database operations using Prisma.
// ============================================================

import prisma from "@/lib/db";
import type { AttendanceAction } from "@/lib/types";

/**
 * Get the current attendance state for a user.
 * Determines if they're clocked in, on break, or not started.
 */
export async function getAttendanceState(userId: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get today's shift for the user
  const shift = await prisma.shift.findFirst({
    where: {
      userId,
      date: {
        gte: today,
        lt: tomorrow,
      },
      status: { in: ["PUBLISHED", "COMPLETED"] },
    },
    include: {
      branch: true,
    },
    orderBy: { scheduledStart: "asc" },
  });

  if (!shift) {
    return {
      status: "not_clocked_in" as const,
      currentShift: null,
      lastAction: null,
      isLate: false,
      lateMinutes: 0,
      clockInTime: null,
    };
  }

  // Get the latest attendance log for this shift
  const logs = await prisma.attendanceLog.findMany({
    where: {
      userId,
      shiftId: shift.id,
    },
    orderBy: { timestamp: "desc" },
  });

  const lastLog = logs[0] || null;
  const clockInLog = logs.find((l) => l.type === "CLOCK_IN");

  // Determine current status
  let status: "not_clocked_in" | "clocked_in" | "on_break" = "not_clocked_in";
  if (lastLog) {
    switch (lastLog.type) {
      case "CLOCK_IN":
      case "BREAK_END":
        status = "clocked_in";
        break;
      case "BREAK_START":
        status = "on_break";
        break;
      case "CLOCK_OUT":
        status = "not_clocked_in";
        break;
    }
  }

  // Check if late
  const isLate = clockInLog
    ? new Date(clockInLog.timestamp) > new Date(shift.scheduledStart)
    : now > new Date(shift.scheduledStart) && !clockInLog;

  const lateMinutes = clockInLog
    ? Math.max(
        0,
        Math.floor(
          (new Date(clockInLog.timestamp).getTime() -
            new Date(shift.scheduledStart).getTime()) /
            60000
        )
      )
    : 0;

  return {
    status,
    currentShift: {
      id: shift.id,
      scheduledStart: shift.scheduledStart.toISOString(),
      scheduledEnd: shift.scheduledEnd.toISOString(),
      branchName: shift.branch.name,
      branchId: shift.branch.id,
      branchLatitude: shift.branch.latitude,
      branchLongitude: shift.branch.longitude,
      geofenceRadius: shift.branch.geofenceRadius,
    },
    lastAction: lastLog
      ? {
          type: lastLog.type as AttendanceAction,
          timestamp: lastLog.timestamp.toISOString(),
        }
      : null,
    isLate,
    lateMinutes,
    clockInTime: clockInLog?.timestamp.toISOString() || null,
  };
}

/**
 * Record an attendance action (Clock In/Out, Break Start/End).
 * Uses a Prisma transaction for atomicity.
 */
export async function handleAttendance(params: {
  userId: string;
  shiftId: string;
  action: AttendanceAction;
  latitude: number;
  longitude: number;
  isWithinFence: boolean;
}) {
  const { userId, shiftId, action, latitude, longitude, isWithinFence } = params;

  // Validate: must be within geofence
  if (!isWithinFence) {
    return {
      success: false,
      message: "You are not at the branch location.",
      error: "OUTSIDE_GEOFENCE",
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Verify the shift exists and belongs to this user
      const shift = await tx.shift.findFirst({
        where: { id: shiftId, userId },
      });

      if (!shift) {
        throw new Error("Shift not found or does not belong to you.");
      }

      // Validate action sequence
      const lastLog = await tx.attendanceLog.findFirst({
        where: { userId, shiftId },
        orderBy: { timestamp: "desc" },
      });

      const lastType = lastLog?.type;

      // Validate the action sequence
      if (action === "CLOCK_IN" && lastType && lastType !== "CLOCK_OUT") {
        throw new Error("You are already clocked in.");
      }
      if (action === "CLOCK_OUT" && (!lastType || lastType === "CLOCK_OUT")) {
        throw new Error("You are not clocked in.");
      }
      if (action === "BREAK_START" && lastType !== "CLOCK_IN" && lastType !== "BREAK_END") {
        throw new Error("You must be clocked in to start a break.");
      }
      if (action === "BREAK_END" && lastType !== "BREAK_START") {
        throw new Error("You are not on a break.");
      }

      // Insert the attendance log
      const log = await tx.attendanceLog.create({
        data: {
          userId,
          shiftId,
          type: action,
          timestamp: new Date(),
          latitude,
          longitude,
          isWithinFence,
        },
      });

      // If checking out, mark shift as COMPLETED
      if (action === "CLOCK_OUT") {
        await tx.shift.update({
          where: { id: shiftId },
          data: { status: "COMPLETED" },
        });
      }

      return log;
    });

    const messages: Record<AttendanceAction, string> = {
      CLOCK_IN: "Successfully clocked in! Have a great shift.",
      CLOCK_OUT: "Successfully clocked out! Great work today.",
      BREAK_START: "Break started. Enjoy your break!",
      BREAK_END: "Welcome back! Break ended.",
    };

    return {
      success: true,
      message: messages[action],
      logId: result.id,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    return {
      success: false,
      message,
      error: "TRANSACTION_ERROR",
    };
  }
}

/**
 * Check if a user has registered biometric credentials.
 */
export async function hasWebAuthnCredential(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { webauthnCredentialId: true },
  });
  return !!user?.webauthnCredentialId;
}

/**
 * Get user details needed for the attendance page.
 */
export async function getUserForAttendance(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      webauthnCredentialId: true,
      primaryBranch: {
        select: {
          id: true,
          name: true,
          latitude: true,
          longitude: true,
          geofenceRadius: true,
        },
      },
    },
  });
  return user;
}
