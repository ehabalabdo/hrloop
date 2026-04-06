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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-purple-dark via-brand-purple to-brand-purple-light px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-brand-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-brand-magenta/30">
            <Clock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            HR Loop
          </h1>
          <p className="text-sm text-white/60 mt-1">
            نظام إدارة الموارد البشرية
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-surface rounded-3xl border border-white/20 shadow-2xl shadow-black/20 p-6">
          <h2 className="text-lg font-semibold text-foreground text-center mb-6">
            تسجيل الدخول
          </h2>
          <LoginForm />
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-white/40 mt-6">
          HR Loop v1.0 — {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
