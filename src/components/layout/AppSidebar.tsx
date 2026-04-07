"use client";

// ============================================================
// AppSidebar — macOS Dock Style Navigation
// Top bar for branding + user, bottom dock for navigation
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
  Zap,
  ChevronDown,
  Ellipsis,
  X,
} from "lucide-react";
import { logoutAction } from "@/app/login/actions";

const NAV_ITEMS = [
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard, roles: ["OWNER", "MANAGER"] as string[] },
  { href: "/attendance", label: "الحضور", icon: Fingerprint, roles: ["OWNER", "MANAGER", "STAFF"] as string[] },
  { href: "/availability", label: "ساعاتي", icon: Clock, roles: ["STAFF"] as string[] },
  { href: "/schedule", label: "الورديات", icon: CalendarDays, roles: ["OWNER", "MANAGER"] as string[] },
  { href: "/leaves", label: "الإجازات", icon: TreePalm, roles: ["OWNER", "MANAGER", "STAFF"] as string[] },
  { href: "/swap", label: "التبديل", icon: ArrowLeftRight, roles: ["OWNER", "MANAGER", "STAFF"] as string[] },
  { href: "/payroll", label: "الرواتب", icon: Wallet, roles: ["OWNER"] as string[] },
  { href: "/news", label: "الأخبار", icon: Megaphone, roles: ["OWNER", "MANAGER", "STAFF"] as string[] },
  { href: "/activity", label: "النشاط", icon: Activity, roles: ["OWNER"] as string[] },
  { href: "/settings", label: "الإعدادات", icon: Settings, roles: ["OWNER"] as string[] },
];

const ROLE_LABELS: Record<string, string> = {
  OWNER: "مالك النظام",
  MANAGER: "مدير فرع",
  STAFF: "موظف",
};

const ROLE_COLORS: Record<string, string> = {
  OWNER: "from-violet-500 to-purple-600",
  MANAGER: "from-blue-500 to-indigo-600",
  STAFF: "from-emerald-500 to-teal-600",
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
  const [showMore, setShowMore] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => pathname.startsWith(href);

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(user.role));
  // On mobile show max 4 + more button, on desktop show all
  const MOBILE_MAX = 4;
  const mobileMain = visibleItems.slice(0, MOBILE_MAX);
  const mobileOverflow = visibleItems.slice(MOBILE_MAX);

  return (
    <div className="min-h-screen relative">
      {/* ===== Top Bar ===== */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg gradient-purple flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-extrabold text-foreground">HR Loop</span>
          </Link>

          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-zinc-50 transition-colors"
          >
            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${ROLE_COLORS[user.role]} flex items-center justify-center`}>
              <span className="text-white text-[10px] font-bold">
                {user.fullName.split(" ").map(w => w[0]).join("").slice(0, 2)}
              </span>
            </div>
            <div className="hidden sm:block text-right">
              <span className="text-xs font-bold text-foreground block leading-tight">{user.fullName}</span>
              <span className="text-[10px] text-zinc-400">{ROLE_LABELS[user.role]}</span>
            </div>
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Profile Dropdown */}
      {showProfile && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
          <div className="fixed top-12 left-4 sm:left-auto sm:right-4 z-50 w-60 bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden">
            <div className="p-4 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${ROLE_COLORS[user.role]} flex items-center justify-center`}>
                  <span className="text-white text-xs font-bold">
                    {user.fullName.split(" ").map(w => w[0]).join("").slice(0, 2)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{user.fullName}</p>
                  <p className="text-[11px] text-zinc-400">{user.email}</p>
                </div>
              </div>
            </div>
            <form action={logoutAction} className="p-2">
              <button
                type="submit"
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
                تسجيل الخروج
              </button>
            </form>
          </div>
        </>
      )}

      {/* ===== Main Content ===== */}
      <main className="pt-12 pb-24">
        {children}
      </main>

      {/* ===== macOS-style Dock ===== */}
      <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40">
        {/* Desktop Dock — show all items */}
        <div className="hidden sm:flex items-end gap-1 bg-white/95 backdrop-blur-xl px-3 py-2 rounded-2xl shadow-2xl border border-zinc-200/80">
          {visibleItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex flex-col items-center gap-0.5 px-1.5"
              >
                <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center transition-all duration-200 group-hover:scale-125 group-hover:-translate-y-1 ${
                  active
                    ? "gradient-purple shadow-purple-sm scale-110"
                    : "bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200 group-hover:text-zinc-700"
                }`}>
                  <item.icon className={`w-5 h-5 ${active ? "text-white" : ""}`} />
                </div>
                <span className={`text-[9px] font-bold transition-colors ${active ? "text-brand-purple" : "text-zinc-400 group-hover:text-zinc-600"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Mobile Dock — compact with overflow */}
        <div className="flex sm:hidden items-end gap-1 bg-white/95 backdrop-blur-xl px-2.5 py-2 rounded-2xl shadow-2xl border border-zinc-200/80">
          {mobileMain.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex flex-col items-center gap-0.5 px-1"
              >
                <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center transition-all duration-200 group-active:scale-90 ${
                  active
                    ? "gradient-purple shadow-purple-sm"
                    : "bg-zinc-100 text-zinc-500"
                }`}>
                  <item.icon className={`w-5 h-5 ${active ? "text-white" : ""}`} />
                </div>
                <span className={`text-[9px] font-bold ${active ? "text-brand-purple" : "text-zinc-400"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
          {mobileOverflow.length > 0 && (
            <button
              onClick={() => setShowMore(!showMore)}
              className="group flex flex-col items-center gap-0.5 px-1"
            >
              <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center transition-all duration-200 group-active:scale-90 ${
                showMore ? "gradient-purple shadow-purple-sm" : "bg-zinc-100 text-zinc-500"
              }`}>
                {showMore ? <X className="w-5 h-5 text-white" /> : <Ellipsis className="w-5 h-5" />}
              </div>
              <span className={`text-[9px] font-bold ${showMore ? "text-brand-purple" : "text-zinc-400"}`}>
                المزيد
              </span>
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Overflow Grid */}
      {showMore && mobileOverflow.length > 0 && (
        <>
          <div className="sm:hidden fixed inset-0 z-30 bg-black/20" onClick={() => setShowMore(false)} />
          <div className="sm:hidden fixed bottom-24 left-4 right-4 z-40 bg-white rounded-2xl shadow-2xl border border-zinc-200 p-3">
            <div className="grid grid-cols-4 gap-2">
              {mobileOverflow.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className="flex flex-col items-center gap-1 py-2 rounded-xl transition-colors"
                  >
                    <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center ${
                      active
                        ? "gradient-purple shadow-purple-sm"
                        : "bg-zinc-100 text-zinc-500"
                    }`}>
                      <item.icon className={`w-5 h-5 ${active ? "text-white" : ""}`} />
                    </div>
                    <span className={`text-[10px] font-bold ${active ? "text-brand-purple" : "text-zinc-500"}`}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
