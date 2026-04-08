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
  Ellipsis,
  X,
} from "lucide-react";
import { logoutAction } from "@/app/login/actions";
import { useLang, type Translations } from "@/lib/i18n";
import LangToggle from "./LangToggle";

const NAV_ITEMS = [
  { href: "/dashboard", labelKey: "dashboard" as const, icon: LayoutDashboard, roles: ["OWNER", "MANAGER"] as string[] },
  { href: "/attendance", labelKey: "attendance" as const, icon: Fingerprint, roles: ["OWNER", "MANAGER", "STAFF"] as string[] },
  { href: "/availability", labelKey: "myHours" as const, icon: Clock, roles: ["STAFF"] as string[] },
  { href: "/schedule", labelKey: "schedule" as const, icon: CalendarDays, roles: ["OWNER", "MANAGER"] as string[] },
  { href: "/leaves", labelKey: "leaves" as const, icon: TreePalm, roles: ["OWNER", "MANAGER", "STAFF"] as string[] },
  { href: "/swap", labelKey: "swap" as const, icon: ArrowLeftRight, roles: ["OWNER", "MANAGER", "STAFF"] as string[] },
  { href: "/payroll", labelKey: "payroll" as const, icon: Wallet, roles: ["OWNER"] as string[] },
  { href: "/news", labelKey: "news" as const, icon: Megaphone, roles: ["OWNER", "MANAGER", "STAFF"] as string[] },
  { href: "/activity", labelKey: "activity" as const, icon: Activity, roles: ["OWNER"] as string[] },
  { href: "/settings", labelKey: "settings" as const, icon: Settings, roles: ["OWNER"] as string[] },
];

function getRoleLabel(role: string, t: Translations["sidebar"]) {
  if (role === "OWNER") return t.owner;
  if (role === "MANAGER") return t.manager;
  return t.staff;
}

const ROLE_COLORS: Record<string, string> = {
  OWNER: "from-[#702F8A] to-[#E20074]",
  MANAGER: "from-[#E20074] to-[#FF2D9B]",
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
  const { t } = useLang();

  const isActive = (href: string) => pathname.startsWith(href);

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(user.role));
  // On mobile show max 4 + more button, on desktop show all
  const MOBILE_MAX = 4;
  const mobileMain = visibleItems.slice(0, MOBILE_MAX);
  const mobileOverflow = visibleItems.slice(MOBILE_MAX);

  return (
    <div className="min-h-screen relative">
      {/* ===== Main Content ===== */}
      <main className="pb-20">
        {children}
      </main>

      {/* Profile Popup — opens upward from dock */}
      {showProfile && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setShowProfile(false)} />
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-64 bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden">
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
                  <span className="text-[10px] font-bold text-brand-purple">{getRoleLabel(user.role, t.sidebar)}</span>
                </div>
              </div>
            </div>
            <div className="px-4 py-2 border-b border-zinc-100 flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400">{t.sidebar.myAccount}</span>
              <LangToggle />
            </div>
            <form action={logoutAction} className="p-2">
              <button
                type="submit"
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
                {t.sidebar.logout}
              </button>
            </form>
          </div>
        </>
      )}

      {/* ===== macOS-style Dock ===== */}
      <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40">
        {/* Desktop Dock — all items + user avatar */}
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
                  {t.sidebar[item.labelKey]}
                </span>
              </Link>
            );
          })}
          {/* Separator */}
          <div className="w-px h-10 bg-zinc-200 mx-1 self-center" />
          {/* User avatar in dock */}
          <button
            onClick={() => { setShowProfile(!showProfile); setShowMore(false); }}
            className="group flex flex-col items-center gap-0.5 px-1.5"
          >
            <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center transition-all duration-200 group-hover:scale-125 group-hover:-translate-y-1 bg-gradient-to-br ${ROLE_COLORS[user.role]}`}>
              <span className="text-white text-xs font-bold">
                {user.fullName.split(" ").map(w => w[0]).join("").slice(0, 2)}
              </span>
            </div>
            <span className="text-[9px] font-bold text-zinc-400 group-hover:text-zinc-600 transition-colors">
              {t.sidebar.myAccount}
            </span>
          </button>
        </div>

        {/* Mobile Dock — compact with overflow + user */}
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
                  {t.sidebar[item.labelKey]}
                </span>
              </Link>
            );
          })}
          {mobileOverflow.length > 0 && (
            <button
              onClick={() => { setShowMore(!showMore); setShowProfile(false); }}
              className="group flex flex-col items-center gap-0.5 px-1"
            >
              <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center transition-all duration-200 group-active:scale-90 ${
                showMore ? "gradient-purple shadow-purple-sm" : "bg-zinc-100 text-zinc-500"
              }`}>
                {showMore ? <X className="w-5 h-5 text-white" /> : <Ellipsis className="w-5 h-5" />}
              </div>
              <span className={`text-[9px] font-bold ${showMore ? "text-brand-purple" : "text-zinc-400"}`}>
                {t.sidebar.more}
              </span>
            </button>
          )}
          {/* User avatar in mobile dock */}
          <button
            onClick={() => { setShowProfile(!showProfile); setShowMore(false); }}
            className="group flex flex-col items-center gap-0.5 px-1"
          >
            <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center transition-all duration-200 group-active:scale-90 bg-gradient-to-br ${ROLE_COLORS[user.role]}`}>
              <span className="text-white text-xs font-bold">
                {user.fullName.split(" ").map(w => w[0]).join("").slice(0, 2)}
              </span>
            </div>
            <span className="text-[9px] font-bold text-zinc-400">
              {t.sidebar.myAccount}
            </span>
          </button>
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
                      {t.sidebar[item.labelKey]}
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
