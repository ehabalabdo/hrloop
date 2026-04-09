// ============================================================
// Login Server Actions
// Handles authentication: login and logout
// Uses @neondatabase/serverless directly to avoid Prisma init
// issues in serverless environments
// ============================================================

"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";
import { createSession, deleteSession } from "@/lib/auth";

export type LoginState = {
  error?: string;
  success?: boolean;
};

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  try {
    const sql = neon(process.env.DATABASE_URL!);

    // Find user by email
    const users = await sql`
      SELECT id, email, full_name, role, password_hash, is_active
      FROM users
      WHERE email = ${email.toLowerCase().trim()}
      LIMIT 1
    `;

    const user = users[0];

    if (!user) {
      return { error: "User not found — check your email" };
    }

    if (!user.is_active) {
      return { error: "This account is disabled. Contact the manager" };
    }

    if (!user.password_hash) {
      return { error: "No password set — contact the manager" };
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash as string);

    if (!passwordValid) {
      return { error: "Wrong password — try again" };
    }

    // Create session
    await createSession({
      userId: user.id as string,
      email: user.email as string,
      fullName: user.full_name as string,
      role: user.role as "OWNER" | "MANAGER" | "STAFF",
    });
  } catch (err) {
    console.error("Login error:", err);
    return { error: "A system error occurred. Try again" };
  }

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
