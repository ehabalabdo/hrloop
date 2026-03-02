import { Clock, MapPin, Fingerprint, Building2, Users, Shield, Wallet, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  // If user is already logged in, redirect to dashboard
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-magenta rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              HR Loop
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-semibold text-brand-magenta hover:text-brand-magenta dark:text-brand-magenta dark:hover:text-brand-magenta/70 transition-colors"
            >
              تسجيل الدخول →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 bg-brand-magenta/5 dark:bg-brand-magenta/10 border border-brand-magenta/15 dark:border-brand-magenta/20 rounded-full px-4 py-1.5 mb-6">
            <div className="w-2 h-2 bg-brand-magenta/50 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-brand-magenta dark:text-brand-magenta">
              System Active — 40 Branches
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-tight mb-4">
            Smart HR for Modern
            <br />
            <span className="text-brand-magenta dark:text-brand-magenta">
              Retail Chains
            </span>
          </h1>

          <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto mb-10">
            Biometric attendance, GPS geofencing, and automated scheduling
            — all in one platform built for your workforce.
          </p>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-brand-magenta hover:bg-brand-magenta/90 text-white font-semibold px-8 py-4 rounded-2xl shadow-lg shadow-brand-magenta/25 hover:shadow-brand-magenta/40 transition-all duration-200 active:scale-95 text-lg"
          >
            <LayoutDashboard className="w-5 h-5" />
            تسجيل الدخول
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mt-16 w-full">
          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-5 text-center">
            <div className="w-10 h-10 bg-brand-purple/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Fingerprint className="w-5 h-5 text-brand-purple" />
            </div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm mb-1">
              Biometric Auth
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Face ID & Touch ID for secure attendance verification
            </p>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-5 text-center">
            <div className="w-10 h-10 bg-brand-magenta/10 dark:bg-brand-magenta/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <MapPin className="w-5 h-5 text-brand-magenta dark:text-brand-magenta" />
            </div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm mb-1">
              GPS Geofencing
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Automatic location verification at each branch
            </p>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-5 text-center">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm mb-1">
              Smart Scheduling
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Automated shifts based on employee availability
            </p>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-5 text-center">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Wallet className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm mb-1">
              Payroll Engine
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Automated salary reconciliation with deductions & overtime
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-8 mt-12 text-center">
          <div>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Building2 className="w-4 h-4 text-zinc-400" />
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">40</span>
            </div>
            <span className="text-xs text-zinc-400">Branches</span>
          </div>
          <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-700" />
          <div>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Users className="w-4 h-4 text-zinc-400" />
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">3</span>
            </div>
            <span className="text-xs text-zinc-400">Roles</span>
          </div>
          <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-700" />
          <div>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Shield className="w-4 h-4 text-zinc-400" />
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">24/7</span>
            </div>
            <span className="text-xs text-zinc-400">Monitoring</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 text-center">
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          HR Loop © {new Date().getFullYear()} — Employee Management System
        </p>
      </footer>
    </div>
  );
}
