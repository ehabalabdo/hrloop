"use client";

// ============================================================
// Settings Tabs — Modern segmented navigation
// ============================================================

import { useState, type ReactNode } from "react";
import { Settings, Fingerprint, Shield, Building2, Users } from "lucide-react";

interface SettingsTabsProps {
  settingsPanel: ReactNode;
  deviceManagement: ReactNode;
  auditTrail: ReactNode;
  branchManagement: ReactNode;
  employeeManagement: ReactNode;
}

const TABS = [
  { key: "employees", label: "الموظفين", icon: Users },
  { key: "branches", label: "الفروع", icon: Building2 },
  { key: "settings", label: "الإعدادات", icon: Settings },
  { key: "devices", label: "الأجهزة", icon: Fingerprint },
  { key: "audit", label: "سجل النظام", icon: Shield },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function SettingsTabs({
  settingsPanel,
  deviceManagement,
  auditTrail,
  branchManagement,
  employeeManagement,
}: SettingsTabsProps) {
  const [tab, setTab] = useState<TabKey>("employees");

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div className="page-container pt-6 pb-2">
        <h1 className="text-xl font-extrabold text-foreground">إعدادات النظام</h1>
        <p className="text-zinc-400 text-sm">إدارة الموظفين، الفروع والإعدادات العامة</p>
      </div>

      {/* Tab Navigation */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-zinc-200/50">
        <div className="page-container">
          <div className="flex gap-0.5 overflow-x-auto no-scrollbar py-2">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    active
                      ? "gradient-purple text-white shadow-purple-sm"
                      : "text-zinc-500 hover:text-foreground hover:bg-zinc-100/60"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="page-container py-6">
        {tab === "employees" && employeeManagement}
        {tab === "settings" && settingsPanel}
        {tab === "branches" && branchManagement}
        {tab === "devices" && deviceManagement}
        {tab === "audit" && auditTrail}
      </div>
    </div>
  );
}
