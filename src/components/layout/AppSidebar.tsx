"use client";

// ============================================================
// AppSidebar — Global Navigation for HR Loop
// Connects: Dashboard, Attendance, Schedule, Payroll, Leaves, Settings
// Shows current user info and logout button
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
  Menu,
  X,
  Clock,
  ChevronRight,
  LogOut,
  User,
} from "lucide-react";
import { logoutAction } from "@/app/login/actions";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    color: "text-blue-500",
  },
  {
    href: "/attendance",
    label: "Attendance",
    icon: Fingerprint,
    color: "text-emerald-500",
  },
  {
    href: "/schedule",
    label: "Schedule",
    icon: CalendarDays,
    color: "text-purple-500",
  },
  {
    href: "/payroll",
    label: "Payroll",
    icon: Wallet,
    color: "text-amber-500",
  },
  {
    href: "/leaves",
    label: "Leaves",
    icon: TreePalm,
    color: "text-cyan-500",
  },
  {
    href: "/activity",
    label: "Activity Log",
    icon: Activity,
    color: "text-pink-500",
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    color: "text-zinc-400",
  },
];

const ROLE_LABELS: Record<string, string> = {
  OWNER: "مالك",
  MANAGER: "مدير فرع",
  STAFF: "موظف",
};

const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  MANAGER: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  STAFF: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
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
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 shrink-0">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 px-5 py-4 border-b border-zinc-100 dark:border-zinc-800"
        >
          <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center">
            <Clock className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            HR Loop
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              <item.icon
                className={`w-4 h-4 ${
                  isActive(item.href) ? item.color : ""
                }`}
              />
              {item.label}
              {isActive(item.href) && (
                <ChevronRight className="w-3 h-3 ml-auto opacity-40" />
              )}
            </Link>
          ))}
        </nav>

        {/* User Info & Logout */}
        <div className="px-3 py-3 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5 px-2 mb-2">
            <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                {user.fullName}
              </p>
              <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-md mt-0.5 ${ROLE_COLORS[user.role]}`}>
                {ROLE_LABELS[user.role]}
              </span>
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              تسجيل الخروج
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center">
            <Clock className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            HR Loop
          </span>
        </Link>
        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          {open ? (
            <X className="w-5 h-5 text-zinc-600" />
          ) : (
            <Menu className="w-5 h-5 text-zinc-600" />
          )}
        </button>
      </div>

      {/* Mobile Overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile Slide-out */}
      <div
        className={`lg:hidden fixed top-0 left-0 bottom-0 z-40 w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 transform transition-transform duration-200 flex flex-col ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <Link
            href="/"
            className="flex items-center gap-2"
            onClick={() => setOpen(false)}
          >
            <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              HR Loop
            </span>
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        </div>

        <nav className="px-3 py-4 space-y-1 flex-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <item.icon
                className={`w-4 h-4 ${
                  isActive(item.href) ? item.color : ""
                }`}
              />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Mobile User Info & Logout */}
        <div className="px-3 py-3 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5 px-2 mb-2">
            <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                {user.fullName}
              </p>
              <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-md mt-0.5 ${ROLE_COLORS[user.role]}`}>
                {ROLE_LABELS[user.role]}
              </span>
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              تسجيل الخروج
            </button>
          </form>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 min-w-0 lg:pt-0 pt-14">{children}</main>
    </div>
  );
}
