"use server";

// ============================================================
// Availability Actions — Hourly employees set their weekly hours
// Once saved, locked for 1 week (cannot be edited)
// ============================================================

import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export interface AvailabilitySlot {
  dayOfWeek: number;
  dayName: string;
  startTime: string;
  endTime: string;
  isLocked: boolean;
  lockedUntil: string | null;
}

// ============================================================
// GET AVAILABILITY — Current user's weekly slots
// ============================================================
export async function getMyAvailability(): Promise<{
  slots: AvailabilitySlot[];
  employmentType: string;
  isAllLocked: boolean;
  lockExpiresAt: string | null;
}> {
  const session = await getSession();
  if (!session) throw new Error("غير مصرح");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { employmentType: true },
  });

  const records = await prisma.availability.findMany({
    where: { userId: session.userId },
    orderBy: { dayOfWeek: "asc" },
  });

  const now = new Date();

  // Build 7 days with saved data
  const slots: AvailabilitySlot[] = [];
  for (let d = 0; d < 7; d++) {
    const record = records.find((r) => r.dayOfWeek === d);
    const isLocked = record?.lockedUntil ? new Date(record.lockedUntil) > now : false;

    slots.push({
      dayOfWeek: d,
      dayName: DAY_NAMES[d],
      startTime: record?.startTime || "",
      endTime: record?.endTime || "",
      isLocked,
      lockedUntil: record?.lockedUntil ? record.lockedUntil.toISOString() : null,
    });
  }

  const isAllLocked = slots.some((s) => s.isLocked);
  const firstLock = slots.find((s) => s.isLocked);

  return {
    slots,
    employmentType: user?.employmentType || "FULL_TIME",
    isAllLocked,
    lockExpiresAt: firstLock?.lockedUntil || null,
  };
}

// ============================================================
// SAVE AVAILABILITY — Save & lock for 1 week
// ============================================================
export async function saveAvailability(
  entries: { dayOfWeek: number; startTime: string; endTime: string }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "غير مصرح" };

    // Verify user is HOURLY
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { employmentType: true },
    });
    if (user?.employmentType !== "HOURLY") {
      return { success: false, error: "هذه الميزة متاحة فقط لموظفي الدوام بالساعة" };
    }

    // Check if any existing slots are still locked
    const now = new Date();
    const existing = await prisma.availability.findMany({
      where: { userId: session.userId },
    });
    const hasLocked = existing.some(
      (e) => e.lockedUntil && new Date(e.lockedUntil) > now
    );
    if (hasLocked) {
      return { success: false, error: "لا يمكن تعديل الساعات — مقفلة لمدة أسبوع" };
    }

    // Validate entries
    const validEntries = entries.filter(
      (e) => e.startTime && e.endTime && e.startTime < e.endTime
    );
    if (validEntries.length === 0) {
      return { success: false, error: "يجب تحديد ساعات صحيحة ليوم واحد على الأقل" };
    }

    // Lock until 1 week from now
    const lockedUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Delete old entries and create new ones
    await prisma.availability.deleteMany({
      where: { userId: session.userId },
    });

    await prisma.availability.createMany({
      data: validEntries.map((e) => ({
        userId: session.userId,
        dayOfWeek: e.dayOfWeek,
        startTime: e.startTime,
        endTime: e.endTime,
        lockedUntil,
      })),
    });

    return { success: true };
  } catch (e) {
    console.error("Failed to save availability:", e);
    return { success: false, error: "فشل في حفظ الساعات" };
  }
}
