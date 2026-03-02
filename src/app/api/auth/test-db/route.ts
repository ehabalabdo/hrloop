import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const results: Record<string, unknown> = {};
  
  // Test 1: Simple count
  try {
    const count = await prisma.user.count();
    results.userCount = { ok: true, count };
  } catch (e) {
    results.userCount = { ok: false, error: String(e).substring(0, 300) };
  }

  // Test 2: Branch count
  try {
    const count = await prisma.branch.count();
    results.branchCount = { ok: true, count };
  } catch (e) {
    results.branchCount = { ok: false, error: String(e).substring(0, 300) };
  }

  // Test 3: Dashboard metrics (the actual query that crashes)
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const totalStaff = await prisma.user.count({
      where: { isActive: true, role: { in: ["MANAGER", "STAFF"] } },
    });
    results.totalStaff = { ok: true, count: totalStaff };
  } catch (e) {
    results.totalStaff = { ok: false, error: String(e).substring(0, 300) };
  }

  // Test 4: findMany with relations
  try {
    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      take: 3,
    });
    results.branches = { ok: true, data: branches };
  } catch (e) {
    results.branches = { ok: false, error: String(e).substring(0, 300) };
  }

  return NextResponse.json(results);
}
