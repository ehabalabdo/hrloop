"use client";

// ============================================================
// AppSidebar — Metro-branded Navigation for HR Loop
// Desktop: Purple sidebar | Mobile: Glassmorphic bottom nav
// Role-based filtering for OWNER / MANAGER / STAFF
// ============================================================

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Fingerprint,
  CalendarDays,
  Wallet,
  TreePalm,
  Settings,
  Activity,
  Clock,
  LogOut,
  User,
} from "lucide-react";
import { logoutAction } from "@/app/login/actions";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "لوحة التحكم",
    shortLabel: "التحكم",
    icon: LayoutDashboard,
    roles: ["OWNER", "MANAGER"] as string[],
  },
  {
    href: "/attendance",
    label: "الحضور",
    shortLabel: "الحضور",
    icon: Fingerprint,
    roles: ["OWNER", "MANAGER", "STAFF"] as string[],
  },
  {
    href: "/schedule",
    label: "الورديات",
    shortLabel: "الورديات",
    icon: CalendarDays,
    roles: ["OWNER", "MANAGER"] as string[],
  },
  {
    href: "/payroll",
    label: "الرواتب",
    shortLabel: "الرواتب",
    icon: Wallet,
    roles: ["OWNER"] as string[],
  },
  {
    href: "/leaves",
    label: "الإجازات",
    shortLabel: "إجازات",
    icon: TreePalm,
    roles: ["OWNER", "MANAGER", "STAFF"] as string[],
  },
  {
    href: "/activity",
    label: "النشاط",
    shortLabel: "النشاط",
    icon: Activity,
    roles: ["OWNER"] as string[],
  },
  {
    href: "/settings",
    label: "الإعدادات",
    shortLabel: "إعدادات",
    icon: Settings,
    roles: ["OWNER"] as string[],
  },
];

const ROLE_LABELS: Record<string, string> = {
  OWNER: "مالك النظام",
  MANAGER: "مدير فرع",
  STAFF: "موظف",
};

type UserInfo = {
  fullName: string;
  email: string;
  role: "OWNER" | "MANAGER" | "STAFF";
};

export default function AppSidebar({
  children,
  user,
}: {
  children: React.ReactNode;
  user: UserInfo;
}) {
  const [showProfile, setShowProfile] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => pathname.startsWith(href);

  // Filter nav items based on user role
  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(user.role)
  );

  // Mobile bottom nav: max 5 items
  const mobileItems = visibleItems.slice(0, 5);

  return (
    <div className="flex min-h-screen bg-white dark:bg-[#0f0a19]">
      {/* ===== Desktop Sidebar ===== */}
      <aside className="hidden lg:flex flex-col w-60 bg-brand-purple-dark shrink-0 min-h-screen">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-6 py-5 border-b border-white/10"
        >
          <div className="w-9 h-9 bg-brand-magenta rounded-xl flex items-center justify-center shadow-lg shadow-brand-magenta/30">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-base font-bold text-white tracking-tight">
              HR Loop
            </span>
            <p className="text-[10px] text-white/50 font-medium">Metro by T-Mobile</p>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-1">
          {visibleItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-white/60 hover:text-white hover:bg-white/[0.08]"
                }`}
              >
                <item.icon className={`w-[18px] h-[18px] ${active ? "text-brand-magenta" : ""}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-9 h-9 bg-brand-magenta/20 rounded-xl flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-brand-magenta" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">
                {user.fullName}
              </p>
              <span className="text-[10px] text-white/50 font-medium">
                {ROLE_LABELS[user.role]}
              </span>
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-white/60 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              تسجيل الخروج
            </button>
          </form>
        </div>
      </aside>

      {/* ===== Mobile Top Bar ===== */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-brand-purple-dark px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-magenta rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-white tracking-tight">
            HR Loop
          </span>
        </Link>

        {/* Profile Toggle */}
        <button
          onClick={() => setShowProfile(!showProfile)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 text-white"
        >
          <User className="w-4 h-4" />
          <span className="text-xs font-medium max-w-[80px] truncate">{user.fullName}</span>
        </button>
      </div>

      {/* Mobile Profile Dropdown */}
      {showProfile && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/40"
            onClick={() => setShowProfile(false)}
          />
          <div className="lg:hidden fixed top-14 right-3 z-50 w-56 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {user.fullName}
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">{user.email}</p>
              <span className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-purple/10 text-brand-purple">
                {ROLE_LABELS[user.role]}
              </span>
            </div>
            <form action={logoutAction} className="p-2">
              <button
                type="submit"
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
                تسجيل الخروج
              </button>
            </form>
          </div>
        </>
      )}

      {/* ===== Main Content ===== */}
      <main className="flex-1 min-w-0 lg:pt-0 pt-14 pb-20 lg:pb-0">
        {children}
      </main>

      {/* ===== Mobile Bottom Nav — Polished, larger touch targets ===== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-t border-zinc-200/60 dark:border-zinc-800/40 safe-area-pb">
        <div className="flex items-stretch justify-around px-1">
          {mobileItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 py-3 px-2 flex-1 min-w-0 transition-all relative ${
                  active
                    ? "text-brand-purple"
                    : "text-zinc-400 dark:text-zinc-500 active:text-brand-purple/60"
                }`}
              >
                {/* Active indicator dot */}
                {active && (
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 w-5 h-1 rounded-full bg-brand-purple" />
                )}
                <div
                  className={`p-2 rounded-2xl transition-all ${
                    active ? "bg-brand-purple/10" : ""
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${active ? "text-brand-purple" : ""}`} />
                </div>
                <span className={`text-[10px] font-bold truncate max-w-full ${active ? "text-brand-purple" : ""}`}>
                  {item.shortLabel}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
