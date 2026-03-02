// ============================================================
// Login Server Actions
// Handles authentication: login and logout
// ============================================================

"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
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
    return { error: "البريد الإلكتروني وكلمة المرور مطلوبان" };
  }

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      passwordHash: true,
      isActive: true,
    },
  });

  if (!user) {
    return { error: "بيانات الدخول غير صحيحة" };
  }

  if (!user.isActive) {
    return { error: "هذا الحساب معطل. تواصل مع المدير" };
  }

  // Verify password
  const passwordValid = await bcrypt.compare(password, user.passwordHash);

  if (!passwordValid) {
    return { error: "بيانات الدخول غير صحيحة" };
  }

  // Create session
  await createSession({
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  });

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
