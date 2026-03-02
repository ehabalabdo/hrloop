import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const results: Record<string, unknown> = {};
  
  // Test 1: Enum filter (the query that was failing)
  try {
    const totalStaff = await prisma.user.count({
      where: { isActive: true, role: { in: ["MANAGER", "STAFF"] } },
    });
    results.enumFilter = { ok: true, count: totalStaff };
  } catch (e) {
    results.enumFilter = { ok: false, error: String(e).substring(0, 300) };
  }

  // Test 2: Nested relations with enum filters (actual dashboard query)
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      select: {
        name: true,
        shifts: {
          where: {
            date: { gte: monthStart, lte: monthEnd },
            status: { in: ["PUBLISHED", "COMPLETED"] },
          },
          select: {
            attendanceLogs: {
              where: { type: "CLOCK_IN" },
              select: { timestamp: true },
            },
            scheduledStart: true,
          },
        },
      },
    });
    results.nestedRelations = { ok: true, branchCount: branches.length };
  } catch (e) {
    results.nestedRelations = { ok: false, error: String(e).substring(0, 300) };
  }

  // Test 3: Leave status enum
  try {
    const pendingLeaves = await prisma.leaveRequest.count({
      where: { status: "PENDING" },
    });
    results.leaveEnum = { ok: true, count: pendingLeaves };
  } catch (e) {
    results.leaveEnum = { ok: false, error: String(e).substring(0, 300) };
  }

  // Test 4: Full getDashboardMetrics simulation
  try {
    const { getDashboardMetrics } = await import("@/app/(app)/dashboard/actions");
    const metrics = await getDashboardMetrics();
    results.dashboardMetrics = { ok: true, metrics };
  } catch (e) {
    results.dashboardMetrics = { ok: false, error: String(e).substring(0, 500) };
  }

  return NextResponse.json(results);
}
