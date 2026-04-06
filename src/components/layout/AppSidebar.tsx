"use client";

// ============================================================
// AppSidebar — Clean Professional Navigation for HR Loop
// Desktop: Clean sidebar | Mobile: Bottom nav
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
  Megaphone,
  ArrowLeftRight,
  LogOut,
  User,
  ChevronDown,
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
    href: "/availability",
    label: "ساعاتي",
    shortLabel: "ساعاتي",
    icon: Clock,
    roles: ["STAFF"] as string[],
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
    href: "/swap",
    label: "تبديل الورديات",
    shortLabel: "تبديل",
    icon: ArrowLeftRight,
    roles: ["OWNER", "MANAGER", "STAFF"] as string[],
  },
  {
    href: "/news",
    label: "الأخبار",
    shortLabel: "أخبار",
    icon: Megaphone,
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

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(user.role)
  );

  const mobileItems = visibleItems.slice(0, 5);

  return (
    <div className="flex min-h-screen bg-background">
      {/* ===== Desktop Sidebar ===== */}
      <aside className="hidden lg:flex flex-col w-64 bg-surface border-e border-border-main shrink-0 min-h-screen sticky top-0">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-5 py-5 border-b border-border-main"
        >
          <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center shadow-md shadow-brand-primary/20">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-base font-bold text-foreground tracking-tight">
              HR Loop
            </span>
            <p className="text-xs text-muted font-medium">نظام إدارة الموظفين</p>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  active
                    ? "bg-brand-primary-subtle text-brand-primary font-semibold"
                    : "text-muted hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                <item.icon className={`w-[18px] h-[18px] shrink-0 ${active ? "text-brand-primary" : ""}`} />
                <span>{item.label}</span>
                {active && (
                  <div className="ms-auto w-1.5 h-1.5 rounded-full bg-brand-primary" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="px-3 py-4 border-t border-border-main">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-surface-hover">
            <div className="w-9 h-9 bg-brand-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-brand-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">
                {user.fullName}
              </p>
              <span className="text-xs text-muted">
                {ROLE_LABELS[user.role]}
              </span>
            </div>
          </div>
          <form action={logoutAction} className="mt-2">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-muted hover:text-danger hover:bg-danger-subtle rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </button>
          </form>
        </div>
      </aside>

      {/* ===== Mobile Top Bar ===== */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-xl border-b border-border-main px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center shadow-sm">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-foreground tracking-tight">
            HR Loop
          </span>
        </Link>

        {/* Profile Toggle */}
        <button
          onClick={() => setShowProfile(!showProfile)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-hover border border-border-main text-foreground"
        >
          <User className="w-4 h-4 text-muted" />
          <span className="text-xs font-semibold max-w-[80px] truncate">{user.fullName}</span>
          <ChevronDown className="w-3 h-3 text-muted" />
        </button>
      </div>

      {/* Mobile Profile Dropdown */}
      {showProfile && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowProfile(false)}
          />
          <div className="lg:hidden fixed top-14 left-4 z-50 w-64 bg-surface rounded-2xl shadow-xl border border-border-main overflow-hidden">
            <div className="p-4 border-b border-border-main">
              <p className="text-sm font-bold text-foreground">
                {user.fullName}
              </p>
              <p className="text-xs text-muted mt-1">{user.email}</p>
              <span className="inline-block mt-2 text-xs font-semibold px-2.5 py-1 rounded-lg bg-brand-primary-subtle text-brand-primary">
                {ROLE_LABELS[user.role]}
              </span>
            </div>
            <form action={logoutAction} className="p-2">
              <button
                type="submit"
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-danger hover:bg-danger-subtle rounded-xl transition-colors"
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

      {/* ===== Mobile Bottom Nav ===== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-xl border-t border-border-main safe-area-pb">
        <div className="flex items-stretch justify-around px-2">
          {mobileItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 px-2 flex-1 min-w-0 transition-all relative ${
                  active
                    ? "text-brand-primary"
                    : "text-muted-light active:text-brand-primary/60"
                }`}
              >
                {active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-brand-primary" />
                )}
                <item.icon className={`w-5 h-5 ${active ? "text-brand-primary" : ""}`} />
                <span className={`text-xs font-semibold truncate max-w-full ${active ? "text-brand-primary" : ""}`}>
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
