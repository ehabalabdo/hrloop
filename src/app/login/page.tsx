// ============================================================
// Login Page — Unified login for all roles (OWNER/MANAGER/STAFF)
// Outside (app) route group — no sidebar
// ============================================================

import LoginForm from "./LoginForm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Clock } from "lucide-react";

export const metadata = {
  title: "HR Loop — تسجيل الدخول",
  description: "صفحة تسجيل الدخول لنظام الموارد البشرية",
};

export default async function LoginPage() {
  // If already logged in, redirect to dashboard
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 via-emerald-50/30 to-zinc-100 dark:from-zinc-950 dark:via-emerald-950/20 dark:to-zinc-900 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-600/20">
            <Clock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            HR Loop
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            نظام إدارة الموارد البشرية
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-200/50 dark:shadow-zinc-900/50 p-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 text-center mb-6">
            تسجيل الدخول
          </h2>
          <LoginForm />
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-zinc-400 mt-6">
          HR Loop v1.0 — {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
