"use client";

// ============================================================
// AppSidebar — Modern Navigation Redesign
// Desktop: Grouped nav with section headers | Mobile: Floating dock
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
  Zap,
  Shield,
} from "lucide-react";
import { logoutAction } from "@/app/login/actions";

// Nav with section grouping
const NAV_SECTIONS = [
  {
    title: "الرئيسية",
    items: [
      { href: "/dashboard", label: "لوحة التحكم", shortLabel: "التحكم", icon: LayoutDashboard, roles: ["OWNER", "MANAGER"] as string[] },
      { href: "/attendance", label: "الحضور", shortLabel: "الحضور", icon: Fingerprint, roles: ["OWNER", "MANAGER", "STAFF"] as string[] },
      { href: "/availability", label: "ساعاتي", shortLabel: "ساعاتي", icon: Clock, roles: ["STAFF"] as string[] },
    ],
  },
  {
    title: "إدارة العمل",
    items: [
      { href: "/schedule", label: "الورديات", shortLabel: "الورديات", icon: CalendarDays, roles: ["OWNER", "MANAGER"] as string[] },
      { href: "/leaves", label: "الإجازات", shortLabel: "إجازات", icon: TreePalm, roles: ["OWNER", "MANAGER", "STAFF"] as string[] },
      { href: "/swap", label: "تبديل الورديات", shortLabel: "تبديل", icon: ArrowLeftRight, roles: ["OWNER", "MANAGER", "STAFF"] as string[] },
      { href: "/payroll", label: "الرواتب", shortLabel: "الرواتب", icon: Wallet, roles: ["OWNER"] as string[] },
    ],
  },
  {
    title: "النظام",
    items: [
      { href: "/news", label: "الأخبار", shortLabel: "أخبار", icon: Megaphone, roles: ["OWNER", "MANAGER", "STAFF"] as string[] },
      { href: "/activity", label: "النشاط", shortLabel: "النشاط", icon: Activity, roles: ["OWNER"] as string[] },
      { href: "/settings", label: "الإعدادات", shortLabel: "إعدادات", icon: Settings, roles: ["OWNER"] as string[] },
    ],
  },
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
  const pathname = usePathname();

  const isActive = (href: string) => pathname.startsWith(href);

  // Flatten for mobile
  const allItems = NAV_SECTIONS.flatMap(s => s.items).filter(item => item.roles.includes(user.role));
  const mobileItems = allItems.slice(0, 5);

  return (
    <div className="flex min-h-screen relative z-[1]">
      {/* ===== Desktop Sidebar ===== */}
      <aside className="hidden lg:flex flex-col w-[260px] bg-white shrink-0 min-h-screen sticky top-0 z-10 border-l border-zinc-200">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-3.5 px-6 py-6">
          <div className="w-10 h-10 rounded-xl gradient-purple flex items-center justify-center shadow-purple-sm">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-extrabold text-foreground tracking-tight">
            HR Loop
          </span>
        </Link>

        {/* Nav Sections */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {NAV_SECTIONS.map((section) => {
            const visibleItems = section.items.filter(item => item.roles.includes(user.role));
            if (visibleItems.length === 0) return null;
            return (
              <div key={section.title} className="mb-3">
                <div className="px-4 py-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  {section.title}
                </div>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 ${
                          active
                            ? "gradient-purple text-white shadow-purple-sm"
                            : "text-zinc-600 hover:text-foreground hover:bg-zinc-100/60"
                        }`}
                      >
                        <item.icon className={`w-[18px] h-[18px] shrink-0 ${active ? "" : "opacity-60"}`} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-3 border-t border-zinc-200/50">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50/80">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${ROLE_COLORS[user.role]} flex items-center justify-center shrink-0`}>
              <span className="text-white text-xs font-bold">
                {user.fullName.split(" ").map(w => w[0]).join("").slice(0, 2)}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground truncate">
                {user.fullName}
              </p>
              <span className="text-xs text-zinc-400">
                {ROLE_LABELS[user.role]}
              </span>
            </div>
          </div>
          <form action={logoutAction} className="mt-1.5">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-zinc-400 hover:text-rose-500 hover:bg-rose-50/50 rounded-xl transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              تسجيل الخروج
            </button>
          </form>
        </div>
      </aside>

      {/* ===== Mobile Top Bar ===== */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-zinc-200 px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-purple flex items-center justify-center shadow-purple-sm">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-extrabold text-foreground">
            HR Loop
          </span>
        </Link>

        <button
          onClick={() => setShowProfile(!showProfile)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-50 text-foreground"
        >
          <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${ROLE_COLORS[user.role]} flex items-center justify-center`}>
            <span className="text-white text-[9px] font-bold">
              {user.fullName.split(" ").map(w => w[0]).join("").slice(0, 2)}
            </span>
          </div>
          <span className="text-xs font-bold max-w-[80px] truncate">{user.fullName}</span>
          <ChevronDown className="w-3 h-3 text-zinc-400" />
        </button>
      </div>

      {/* Mobile Profile Dropdown */}
      {showProfile && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setShowProfile(false)}
          />
          <div className="lg:hidden fixed top-14 left-4 z-50 w-64 bg-white rounded-2xl shadow-2xl border border-zinc-200/50 overflow-hidden">
            <div className="p-4 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${ROLE_COLORS[user.role]} flex items-center justify-center`}>
                  <span className="text-white text-xs font-bold">
                    {user.fullName.split(" ").map(w => w[0]).join("").slice(0, 2)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{user.fullName}</p>
                  <p className="text-xs text-zinc-400">{user.email}</p>
                </div>
              </div>
              <span className="inline-block mt-3 text-xs font-bold px-2.5 py-1 rounded-lg bg-brand-purple/10 text-brand-purple">
                {ROLE_LABELS[user.role]}
              </span>
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
      <main className="flex-1 min-w-0 lg:pt-0 pt-16 pb-24 lg:pb-0">
        {children}
      </main>

      {/* ===== Mobile Bottom Nav — Floating Dock ===== */}
      <nav className="lg:hidden fixed bottom-4 left-4 right-4 z-40 bg-white rounded-2xl shadow-xl border border-zinc-200 safe-area-pb">
        <div className="flex items-stretch justify-around px-1">
          {mobileItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 py-3 px-2 flex-1 min-w-0 transition-all relative`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  active
                    ? "gradient-purple shadow-purple-sm"
                    : "text-zinc-400"
                }`}>
                  <item.icon className={`w-5 h-5 ${active ? "text-white" : ""}`} />
                </div>
                <span className={`text-[10px] font-bold truncate max-w-full ${active ? "text-brand-primary" : "text-zinc-400"}`}>
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
