// ============================================================
// Setup Passwords API — One-time setup for existing users
// POST /api/auth/setup-passwords
// Sets a default password for all users without one
// Uses @neondatabase/serverless directly to avoid Prisma init issues
// ============================================================

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";

const DEFAULT_PASSWORD = "HRLoop2024!";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return NextResponse.json(
        { error: "DATABASE_URL not set" },
        { status: 500 }
      );
    }

    const sql = neon(dbUrl);
    const hash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

    // Get all active users
    const users = await sql`
      SELECT id, full_name, email, role FROM users WHERE is_active = true
    `;

    if (users.length === 0) {
      return NextResponse.json({
        message: "No active users found",
        updated: 0,
      });
    }

    // Set default password for all active users
    await sql`
      UPDATE users SET password_hash = ${hash} WHERE is_active = true
    `;

    return NextResponse.json({
      message: `Updated ${users.length} users with default password`,
      defaultPassword: DEFAULT_PASSWORD,
      updated: users.length,
      users: users.map((u: Record<string, unknown>) => ({
        name: u.full_name,
        email: u.email,
        role: u.role,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Setup passwords error:", message);
    return NextResponse.json(
      { error: "Failed to setup passwords", details: message },
      { status: 500 }
    );
  }
}
