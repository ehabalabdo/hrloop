"use server";

// ============================================================
// Scheduling Engine - Server Actions
// Auto-distributes employees across 40 branches weekly
//
// ALGORITHM PRIORITY (Weighted Scoring):
//   1. Availability Match  — REQUIRED gate (employee must be free)
//   2. Geographic Proximity — 40% weight (closer = higher score)
//   3. Weekly Hours Balance — 30% weight (fewer hours = higher score, fairness)
//   4. Primary Branch Pref — 20% weight (primary branch gets bonus)
//   5. Role Match          — 10% weight (manager → their managed branch)
// ============================================================

import prisma from "@/lib/db";
import {
  type WeekRange,
  type WeeklyScheduleData,
  type BranchWithSchedule,
  type DaySchedule,
  type ScheduleEntry,
  type ScheduleStats,
  type GenerateResult,
  DAY_NAMES,
} from "@/lib/schedule-types";

// ============================================================
// HELPERS
// ============================================================

/** Haversine distance in km between two coordinates */
function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Get the Monday of the week that contains `date` */
function getWeekStartLocal(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Get Sunday of the same week */
function getWeekEnd(monday: Date): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Build array of 7 Date objects for Mon–Sun */
function getWeekDates(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

/** Build array of 14 Date objects for Mon–Sun x 2 weeks */
function getBiweeklyDates(monday: Date): Date[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

/** Get end of biweekly period (Sunday of 2nd week) */
function getBiweeklyEnd(monday: Date): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + 13);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** dayOfWeek in our DB: 0=Sunday, 6=Saturday. JS Date.getDay() is same. */
function dateToDayOfWeek(date: Date): number {
  return date.getDay();
}

/** Format date to ISO date string YYYY-MM-DD */
function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

/** Format a WeekRange label */
function formatWeekLabel(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`;
}

// ============================================================
// GET WEEKLY SCHEDULE
// ============================================================

export async function getWeeklySchedule(
  weekStartISO: string
): Promise<WeeklyScheduleData> {
  const monday = new Date(weekStartISO);
  monday.setHours(0, 0, 0, 0);
  const sunday = getWeekEnd(monday);
  const weekDates = getWeekDates(monday);

  // Fetch all branches with requirements and manager info
  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    include: {
      manager: { select: { id: true, fullName: true } },
      requirements: true,
    },
    orderBy: { name: "asc" },
  });

  // Fetch all shifts for this week
  const shifts = await prisma.shift.findMany({
    where: {
      date: { gte: monday, lte: sunday },
    },
    include: {
      user: { select: { id: true, fullName: true, role: true } },
      branch: { select: { id: true, name: true } },
    },
    orderBy: { scheduledStart: "asc" },
  });

  // Build schedule data
  let totalShifts = 0;
  let draftShifts = 0;
  let publishedShifts = 0;
  let understaffedSlots = 0;
  let fullyStaffedBranches = 0;

  type BranchWithIncludes = (typeof branches)[number];
  type ShiftWithIncludes = (typeof shifts)[number];

  const branchSchedules: BranchWithSchedule[] = branches.map((branch: BranchWithIncludes) => {
    let branchFullyStaffed = true;

    const days: DaySchedule[] = weekDates.map((date) => {
      const dow = dateToDayOfWeek(date);
      const dateStr = toDateStr(date);

      // Find requirement for this branch on this day
      const req = branch.requirements.find(
        (r: { dayOfWeek: number }) => r.dayOfWeek === dow
      );
      const requiredStaff = req?.requiredStaff ?? 0;

      // Find assigned shifts
      const dayShifts = shifts.filter(
        (s: ShiftWithIncludes) => s.branchId === branch.id && toDateStr(new Date(s.date)) === dateStr
      );

      const assignedStaff: ScheduleEntry[] = dayShifts.map((s: ShiftWithIncludes) => ({
        id: s.id,
        shiftId: s.id,
        userId: s.user.id,
        userName: s.user.fullName,
        userRole: s.user.role as "OWNER" | "MANAGER" | "STAFF",
        branchId: s.branchId,
        branchName: s.branch.name,
        date: dateStr,
        dayOfWeek: dow,
        scheduledStart: s.scheduledStart.toISOString(),
        scheduledEnd: s.scheduledEnd.toISOString(),
        status: s.status as "DRAFT" | "PUBLISHED" | "COMPLETED",
      }));

      totalShifts += dayShifts.length;
      draftShifts += dayShifts.filter((s: ShiftWithIncludes) => s.status === "DRAFT").length;
      publishedShifts += dayShifts.filter((s: ShiftWithIncludes) => s.status === "PUBLISHED").length;

      const shortage = assignedStaff.length - requiredStaff;
      if (shortage < 0 && requiredStaff > 0) {
        understaffedSlots++;
        branchFullyStaffed = false;
      }

      return {
        date: dateStr,
        dayOfWeek: dow,
        dayName: DAY_NAMES[dow],
        requiredStaff,
        assignedStaff,
        shortage,
      };
    });

    if (branchFullyStaffed) fullyStaffedBranches++;

    return {
      id: branch.id,
      name: branch.name,
      address: branch.address,
      managerId: branch.managerId,
      managerName: branch.manager?.fullName ?? null,
      isActive: branch.isActive,
      days,
    };
  });

  const stats: ScheduleStats = {
    totalShifts,
    draftShifts,
    publishedShifts,
    understaffedSlots,
    fullyStaffedBranches,
    totalBranches: branches.length,
  };

  return {
    weekLabel: formatWeekLabel(monday, sunday),
    weekStart: toDateStr(monday),
    weekEnd: toDateStr(sunday),
    branches: branchSchedules,
    stats,
  };
}

// ============================================================
// GENERATE BIWEEKLY SCHEDULE (The Algorithm — 2-week cycle)
// ============================================================

export async function generateWeeklySchedule(
  weekStartISO: string
): Promise<GenerateResult> {
  try {
    const monday = new Date(weekStartISO);
    monday.setHours(0, 0, 0, 0);
    const biweeklyEnd = getBiweeklyEnd(monday);
    const allDates = getBiweeklyDates(monday);

    // 1. Check for existing drafts in the 2-week range (prevent duplicates)
    const existingDrafts = await prisma.shift.count({
      where: {
        date: { gte: monday, lte: biweeklyEnd },
        status: "DRAFT",
      },
    });

    if (existingDrafts > 0) {
      return {
        success: false,
        message: `يوجد ${existingDrafts} مسودة وردية لهذه الفترة. امسحها أولاً قبل إعادة التوليد.`,
        totalShiftsCreated: 0,
        understaffedSlots: 0,
        warnings: [],
      };
    }

    // 2. Fetch all active branches with requirements + minStaff
    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      include: { requirements: true },
    });

    // 3. Fetch all active employees with availability and primary branch info
    const employees = await prisma.user.findMany({
      where: { isActive: true, role: { in: ["MANAGER", "STAFF"] } },
      include: {
        availability: true,
        primaryBranch: {
          select: { id: true, latitude: true, longitude: true },
        },
        managedBranches: { select: { id: true } },
      },
    });

    // 4. Fetch already-published shifts for the 2-week range (to not double-book)
    const existingPublished = await prisma.shift.findMany({
      where: {
        date: { gte: monday, lte: biweeklyEnd },
        status: "PUBLISHED",
      },
      select: { userId: true, date: true },
    });

    // 4b. Fetch approved leaves that overlap the 2-week range
    const approvedLeaves = await prisma.leaveRequest.findMany({
      where: {
        status: "APPROVED",
        startDate: { lte: biweeklyEnd },
        endDate: { gte: monday },
      },
      select: { userId: true, startDate: true, endDate: true },
    });

    // Build set of "userId:dateStr" for employees on leave
    const leaveSet = new Set<string>();
    for (const leave of approvedLeaves) {
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);
      for (const date of allDates) {
        if (date >= leaveStart && date <= leaveEnd) {
          leaveSet.add(`${leave.userId}:${toDateStr(date)}`);
        }
      }
    }

    // Build a set of "userId:dateStr" for published shifts
    type PublishedShift = (typeof existingPublished)[number];
    const publishedSet = new Set(
      existingPublished.map((s: PublishedShift) => `${s.userId}:${toDateStr(new Date(s.date))}`)
    );

    // Per-week hour tracking (reset each 7-day week)
    // Week 1: days 0-6, Week 2: days 7-13
    const employeeHoursWeek1: Map<string, number> = new Map();
    const employeeHoursWeek2: Map<string, number> = new Map();
    type EmployeeWithIncludes = (typeof employees)[number];
    type BranchGenWithIncludes = (typeof branches)[number];
    employees.forEach((e: EmployeeWithIncludes) => {
      employeeHoursWeek1.set(e.id, 0);
      employeeHoursWeek2.set(e.id, 0);
    });

    // Track per-employee per-day assignments (prevent same day double booking)
    const employeeDayAssigned: Set<string> = new Set();

    // Shifts to create
    const shiftsToCreate: {
      userId: string;
      branchId: string;
      date: Date;
      scheduledStart: Date;
      scheduledEnd: Date;
    }[] = [];

    let understaffedSlots = 0;
    const warnings: string[] = [];
    const MAX_WEEKLY_HOURS = 40;

    // 5. For each day (14 days), for each branch, assign employees
    for (let dayIdx = 0; dayIdx < allDates.length; dayIdx++) {
      const date = allDates[dayIdx];
      const dow = dateToDayOfWeek(date);
      const dateStr = toDateStr(date);
      const isWeek2 = dayIdx >= 7;
      const employeeHours = isWeek2 ? employeeHoursWeek2 : employeeHoursWeek1;

      // Get all branch slots for this day
      interface BranchSlot {
        branchId: string;
        branchName: string;
        latitude: number;
        longitude: number;
        managerId: string | null;
        requiredStaff: number;
        minStaff: number;
      }

      const branchSlots: BranchSlot[] = branches
        .map((branch: BranchGenWithIncludes): BranchSlot => {
          const req = branch.requirements.find(
            (r: { dayOfWeek: number }) => r.dayOfWeek === dow
          );
          return {
            branchId: branch.id,
            branchName: branch.name,
            latitude: branch.latitude,
            longitude: branch.longitude,
            managerId: branch.managerId,
            requiredStaff: req?.requiredStaff ?? 0,
            minStaff: branch.minStaff ?? 0,
          };
        })
        .filter((slot: BranchSlot) => slot.requiredStaff > 0);

      // Sort branches by requirement count descending (fill highest need first)
      branchSlots.sort((a, b) => b.requiredStaff - a.requiredStaff);

      for (const slot of branchSlots) {
        let assigned = 0;

        // Default availability: 9:00–17:00 every day
        const defaultStart = new Date("1970-01-01T09:00:00");
        const defaultEnd = new Date("1970-01-01T17:00:00");

        // Find available candidates for this day
        const candidates = employees
          .filter((emp: EmployeeWithIncludes) => {
            // Flexible employees are available every day
            // Non-flexible: check availability records
            if (!emp.isFlexibleSchedule) {
              const hasAnyAvailability = emp.availability.length > 0;
              if (hasAnyAvailability) {
                const avail = emp.availability.find(
                  (a: { dayOfWeek: number }) => a.dayOfWeek === dow
                );
                if (!avail) return false;
              }
            }

            // Not already assigned this day
            if (employeeDayAssigned.has(`${emp.id}:${dateStr}`)) return false;

            // Not already published for this day
            if (publishedSet.has(`${emp.id}:${dateStr}`)) return false;

            // Not on approved leave this day
            if (leaveSet.has(`${emp.id}:${dateStr}`)) return false;

            // Not exceeding max weekly hours
            const currentHours = employeeHours.get(emp.id) ?? 0;
            if (currentHours >= MAX_WEEKLY_HOURS) return false;

            return true;
          })
          .map((emp: EmployeeWithIncludes) => {
            // If flexible or no explicit availability, use default 9-17
            const avail = emp.isFlexibleSchedule
              ? { startTime: defaultStart, endTime: defaultEnd }
              : emp.availability.find(
                  (a: { dayOfWeek: number }) => a.dayOfWeek === dow
                ) ?? { startTime: defaultStart, endTime: defaultEnd };

            // ---- SCORING ----
            let score = 0;

            // Geographic Proximity (40% weight) - max 40 points
            const empLat = emp.primaryBranch?.latitude ?? 0;
            const empLon = emp.primaryBranch?.longitude ?? 0;
            if (empLat !== 0 && empLon !== 0) {
              const distKm = haversineKm(
                empLat,
                empLon,
                slot.latitude,
                slot.longitude
              );
              score += Math.max(0, 40 * (1 - distKm / 100));
            }

            // Weekly Hours Balance (30% weight) - max 30 points
            const currentHours = employeeHours.get(emp.id) ?? 0;
            score += 30 * (1 - currentHours / MAX_WEEKLY_HOURS);

            // Primary Branch Preference (20% weight) - max 20 points
            if (emp.primaryBranchId === slot.branchId) {
              score += 20;
            }

            // Role Match (10% weight) - max 10 points
            if (
              emp.role === "MANAGER" &&
              emp.managedBranches.some(
                (mb: { id: string }) => mb.id === slot.branchId
              )
            ) {
              score += 10;
            }

            return {
              emp,
              avail,
              score,
            };
          });

        // Sort by score descending (best candidates first)
        candidates.sort((a: { score: number }, b: { score: number }) => b.score - a.score);

        // Assign top N candidates
        for (
          let i = 0;
          i < candidates.length && assigned < slot.requiredStaff;
          i++
        ) {
          const { emp, avail } = candidates[i];

          // Build scheduled start/end from availability times
          const startTime = new Date(avail.startTime);
          const endTime = new Date(avail.endTime);

          const scheduledStart = new Date(date);
          scheduledStart.setHours(
            startTime.getHours(),
            startTime.getMinutes(),
            0,
            0
          );

          const scheduledEnd = new Date(date);
          scheduledEnd.setHours(
            endTime.getHours(),
            endTime.getMinutes(),
            0,
            0
          );

          // Calculate hours for this shift
          const shiftHours =
            (scheduledEnd.getTime() - scheduledStart.getTime()) / (1000 * 60 * 60);

          shiftsToCreate.push({
            userId: emp.id,
            branchId: slot.branchId,
            date: new Date(date),
            scheduledStart,
            scheduledEnd,
          });

          // Update tracking
          employeeDayAssigned.add(`${emp.id}:${dateStr}`);
          employeeHours.set(
            emp.id,
            (employeeHours.get(emp.id) ?? 0) + shiftHours
          );
          assigned++;
        }

        if (assigned < slot.requiredStaff) {
          understaffedSlots++;
        }

        // Check minStaff warning
        if (slot.minStaff > 0 && assigned < slot.minStaff) {
          const dayName = DAY_NAMES[dow];
          warnings.push(
            `\u26A0\uFE0F ${slot.branchName} — ${dayName} ${dateStr}: تم تعيين ${assigned} من أصل ${slot.minStaff} كحد أدنى`
          );
        }
      }
    }

    // 6. Batch insert all shifts
    if (shiftsToCreate.length > 0) {
      await prisma.shift.createMany({
        data: shiftsToCreate.map((s) => ({
          userId: s.userId,
          branchId: s.branchId,
          date: s.date,
          scheduledStart: s.scheduledStart,
          scheduledEnd: s.scheduledEnd,
          status: "DRAFT" as const,
        })),
      });
    }

    return {
      success: true,
      message: `تم توليد ${shiftsToCreate.length} وردية مسودة لأسبوعين.${
        understaffedSlots > 0
          ? ` تنبيه: ${understaffedSlots} فرع-يوم يعاني من نقص موظفين.`
          : ""
      }`,
      totalShiftsCreated: shiftsToCreate.length,
      understaffedSlots,
      warnings,
    };
  } catch (error) {
    console.error("Schedule generation failed:", error);
    return {
      success: false,
      message: "فشل توليد الجدول. راجع سجلات الخادم.",
      totalShiftsCreated: 0,
      understaffedSlots: 0,
      warnings: [],
      error: String(error),
    };
  }
}

// ============================================================
// PUBLISH SCHEDULE
// ============================================================

export async function publishSchedule(
  weekStartISO: string
): Promise<{ success: boolean; message: string; count: number }> {
  try {
    const monday = new Date(weekStartISO);
    monday.setHours(0, 0, 0, 0);
    const biweeklyEnd = getBiweeklyEnd(monday);

    const result = await prisma.shift.updateMany({
      where: {
        date: { gte: monday, lte: biweeklyEnd },
        status: "DRAFT",
      },
      data: { status: "PUBLISHED" },
    });

    return {
      success: true,
      message: `تم نشر ${result.count} وردية. تم إشعار الموظفين.`,
      count: result.count,
    };
  } catch (error) {
    console.error("Publish failed:", error);
    return {
      success: false,
      message: "فشل نشر الجدول.",
      count: 0,
    };
  }
}

// ============================================================
// CLEAR WEEK DRAFTS
// ============================================================

export async function clearWeekDrafts(
  weekStartISO: string
): Promise<{ success: boolean; message: string; count: number }> {
  try {
    const monday = new Date(weekStartISO);
    monday.setHours(0, 0, 0, 0);
    const biweeklyEnd = getBiweeklyEnd(monday);

    const result = await prisma.shift.deleteMany({
      where: {
        date: { gte: monday, lte: biweeklyEnd },
        status: "DRAFT",
      },
    });

    return {
      success: true,
      message: `تم مسح ${result.count} مسودة وردية.`,
      count: result.count,
    };
  } catch (error) {
    console.error("Clear drafts failed:", error);
    return {
      success: false,
      message: "فشل مسح المسودات.",
      count: 0,
    };
  }
}

// ============================================================
// MOVE SHIFT (Manual Adjustment)
// ============================================================

export async function moveShift(
  shiftId: string,
  newBranchId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Verify shift exists and is a draft
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { user: { select: { fullName: true } } },
    });

    if (!shift) {
      return { success: false, message: "Shift not found." };
    }

    if (shift.status !== "DRAFT") {
      return {
        success: false,
        message: "Only draft shifts can be moved. Unpublish first.",
      };
    }

    // Verify target branch exists
    const branch = await prisma.branch.findUnique({
      where: { id: newBranchId },
      select: { name: true },
    });

    if (!branch) {
      return { success: false, message: "Target branch not found." };
    }

    await prisma.shift.update({
      where: { id: shiftId },
      data: { branchId: newBranchId },
    });

    return {
      success: true,
      message: `Moved ${shift.user.fullName} to ${branch.name}.`,
    };
  } catch (error) {
    console.error("Move shift failed:", error);
    return { success: false, message: "Failed to move shift." };
  }
}

// ============================================================
// DELETE SINGLE SHIFT
// ============================================================

export async function deleteShift(
  shiftId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) {
      return { success: false, message: "Shift not found." };
    }

    if (shift.status !== "DRAFT") {
      return { success: false, message: "Only draft shifts can be deleted." };
    }

    await prisma.shift.delete({ where: { id: shiftId } });

    return { success: true, message: "Shift deleted." };
  } catch (error) {
    console.error("Delete shift failed:", error);
    return { success: false, message: "Failed to delete shift." };
  }
}

// ============================================================
// UPDATE BRANCH REQUIREMENTS
// ============================================================

export async function updateBranchRequirements(
  branchId: string,
  requirements: { dayOfWeek: number; requiredStaff: number }[]
): Promise<{ success: boolean; message: string }> {
  try {
    // Upsert each day's requirement
    for (const req of requirements) {
      await prisma.branchRequirement.upsert({
        where: {
          branchId_dayOfWeek: {
            branchId,
            dayOfWeek: req.dayOfWeek,
          },
        },
        update: { requiredStaff: req.requiredStaff },
        create: {
          branchId,
          dayOfWeek: req.dayOfWeek,
          requiredStaff: req.requiredStaff,
        },
      });
    }

    return {
      success: true,
      message: "Branch staffing requirements updated.",
    };
  } catch (error) {
    console.error("Update requirements failed:", error);
    return { success: false, message: "Failed to update requirements." };
  }
}

// ============================================================
// GET ALL BRANCHES (for sidebar / filters)
// ============================================================

export async function getAllBranches(): Promise<
  {
    id: string;
    name: string;
    address: string | null;
    managerName: string | null;
    requirements: { dayOfWeek: number; requiredStaff: number }[];
  }[]
> {
  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    include: {
      manager: { select: { fullName: true } },
      requirements: {
        select: { dayOfWeek: true, requiredStaff: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return branches.map(
    (b: {
      id: string;
      name: string;
      address: string | null;
      manager: { fullName: string } | null;
      requirements: { dayOfWeek: number; requiredStaff: number }[];
    }) => ({
      id: b.id,
      name: b.name,
      address: b.address,
      managerName: b.manager?.fullName ?? null,
      requirements: b.requirements,
    })
  );
}

// ============================================================
// UTILITY: Get current/next week range
// ============================================================

export async function getWeekRange(
  weekStartISO?: string
): Promise<WeekRange> {
  const now = weekStartISO ? new Date(weekStartISO) : new Date();
  const start = getWeekStartLocal(now);
  const end = getWeekEnd(start);
  return {
    start,
    end,
    label: formatWeekLabel(start, end),
  };
}
