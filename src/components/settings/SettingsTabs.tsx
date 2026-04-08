"use client";

// ============================================================
// Settings Tabs — Modern segmented navigation
// ============================================================

import { useState, type ReactNode } from "react";
import { Settings, Fingerprint, Shield, Building2, Users } from "lucide-react";
import { useLang } from "@/lib/i18n";

interface SettingsTabsProps {
  settingsPanel: ReactNode;
  deviceManagement: ReactNode;
  auditTrail: ReactNode;
  branchManagement: ReactNode;
  employeeManagement: ReactNode;
}

const TABS = [
  { key: "employees", labelKey: "employees" as const, icon: Users },
  { key: "branches", labelKey: "branches" as const, icon: Building2 },
  { key: "settings", labelKey: "settingsTab" as const, icon: Settings },
  { key: "devices", labelKey: "devices" as const, icon: Fingerprint },
  { key: "audit", labelKey: "systemLog" as const, icon: Shield },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function SettingsTabs({
  settingsPanel,
  deviceManagement,
  auditTrail,
  branchManagement,
  employeeManagement,
}: SettingsTabsProps) {
  const { t } = useLang();
  const [tab, setTab] = useState<TabKey>("employees");

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="page-container pt-4 pb-1">
        <h1 className="text-xl font-extrabold text-foreground">{t.settings.title}</h1>
        <p className="text-zinc-400 text-sm">{t.settings.subtitle}</p>
      </div>

      {/* Tab Navigation */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-zinc-200/50">
        <div className="page-container">
          <div className="flex gap-0.5 overflow-x-auto no-scrollbar py-2">
            {TABS.map((item) => {
              const Icon = item.icon;
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    active
                      ? "gradient-purple text-white shadow-purple-sm"
                      : "text-zinc-500 hover:text-foreground hover:bg-zinc-100/60"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.settings[item.labelKey]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="page-container py-4">
        {tab === "employees" && employeeManagement}
        {tab === "settings" && settingsPanel}
        {tab === "branches" && branchManagement}
        {tab === "devices" && deviceManagement}
        {tab === "audit" && auditTrail}
      </div>
    </div>
  );
}
