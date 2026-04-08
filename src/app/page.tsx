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
      <header className="px-6 py-5 border-b border-border-main">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground">
              HR Loop
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-semibold text-brand-primary hover:text-brand-primary dark:text-brand-primary dark:hover:text-brand-primary/70 transition-colors"
            >
              Sign In →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 bg-brand-primary/5 dark:bg-brand-primary/10 border border-brand-magenta/15 dark:border-brand-magenta/20 rounded-full px-4 py-1.5 mb-6">
            <div className="w-2 h-2 bg-brand-primary/50 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-brand-primary dark:text-brand-primary">
              System Active — 40 Branches
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight leading-tight mb-4">
            Smart HR for Modern
            <br />
            <span className="text-brand-primary dark:text-brand-primary">
              Retail Chains
            </span>
          </h1>

          <p className="text-lg text-muted max-w-lg mx-auto mb-10">
            Biometric attendance, GPS geofencing, and automated scheduling
            — all in one platform built for your workforce.
          </p>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold px-8 py-4 rounded-2xl shadow-lg shadow-brand-magenta/25 hover:shadow-brand-magenta/40 transition-all duration-200 active:scale-95 text-lg"
          >
            <LayoutDashboard className="w-5 h-5" />
            Sign In
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mt-16 w-full">
          <div className="bg-background rounded-2xl p-5 text-center">
            <div className="w-10 h-10 bg-brand-purple/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Fingerprint className="w-5 h-5 text-brand-purple" />
            </div>
            <h3 className="font-semibold text-foreground text-sm mb-1">
              Biometric Auth
            </h3>
            <p className="text-xs text-muted">
              Face ID & Touch ID for secure attendance verification
            </p>
          </div>

          <div className="bg-background rounded-2xl p-5 text-center">
            <div className="w-10 h-10 bg-brand-primary/10 dark:bg-brand-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <MapPin className="w-5 h-5 text-brand-primary dark:text-brand-primary" />
            </div>
            <h3 className="font-semibold text-foreground text-sm mb-1">
              GPS Geofencing
            </h3>
            <p className="text-xs text-muted">
              Automatic location verification at each branch
            </p>
          </div>

          <div className="bg-background rounded-2xl p-5 text-center">
            <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Clock className="w-5 h-5 text-pink-600 dark:text-pink-400" />
            </div>
            <h3 className="font-semibold text-foreground text-sm mb-1">
              Smart Scheduling
            </h3>
            <p className="text-xs text-muted">
              Automated shifts based on employee availability
            </p>
          </div>

          <div className="bg-background rounded-2xl p-5 text-center">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Wallet className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="font-semibold text-foreground text-sm mb-1">
              Payroll Engine
            </h3>
            <p className="text-xs text-muted">
              Automated salary reconciliation with deductions & overtime
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-8 mt-12 text-center">
          <div>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Building2 className="w-4 h-4 text-zinc-400" />
              <span className="text-2xl font-bold text-foreground">40</span>
            </div>
            <span className="text-xs text-zinc-400">Branches</span>
          </div>
          <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-700" />
          <div>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Users className="w-4 h-4 text-zinc-400" />
              <span className="text-2xl font-bold text-foreground">3</span>
            </div>
            <span className="text-xs text-zinc-400">Roles</span>
          </div>
          <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-700" />
          <div>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Shield className="w-4 h-4 text-zinc-400" />
              <span className="text-2xl font-bold text-foreground">24/7</span>
            </div>
            <span className="text-xs text-zinc-400">Monitoring</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-border-main text-center">
        <p className="text-xs text-muted-light">
          HR Loop © {new Date().getFullYear()} — Employee Management System
        </p>
      </footer>
    </div>
  );
}
