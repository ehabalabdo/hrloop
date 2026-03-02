// ============================================================
// Setup Passwords API — One-time setup for existing users
// POST /api/auth/setup-passwords
// Sets a default password for all users without one
// ============================================================

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";

const DEFAULT_PASSWORD = "HRLoop2024!";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const hash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

    // Get all active users
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true, email: true, role: true },
    });

    if (users.length === 0) {
      return NextResponse.json({
        message: "No active users found",
        updated: 0,
      });
    }

    type UserRow = (typeof users)[number];

    // Set default password for all users
    await prisma.user.updateMany({
      where: {
        id: { in: users.map((u: UserRow) => u.id) },
      },
      data: { passwordHash: hash },
    });

    return NextResponse.json({
      message: `Updated ${users.length} users with default password`,
      defaultPassword: DEFAULT_PASSWORD,
      updated: users.length,
      users: users.map((u: UserRow) => ({
        name: u.fullName,
        email: u.email,
        role: u.role,
      })),
    });
  } catch (error) {
    console.error("Setup passwords error:", error);
    return NextResponse.json(
      { error: "Failed to setup passwords" },
      { status: 500 }
    );
  }
}
