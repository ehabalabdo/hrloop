"use client";

// ============================================================
// Settings Tabs — Arabic, mobile-first pill tabs
// ============================================================

import { useState, type ReactNode } from "react";
import { Settings, Fingerprint, Shield, Building2 } from "lucide-react";

interface SettingsTabsProps {
  settingsPanel: ReactNode;
  deviceManagement: ReactNode;
  auditTrail: ReactNode;
  branchManagement: ReactNode;
}

const TABS = [
  { key: "settings", label: "الإعدادات", icon: Settings },
  { key: "branches", label: "الفروع", icon: Building2 },
  { key: "devices", label: "الأجهزة", icon: Fingerprint },
  { key: "audit", label: "سجل النظام", icon: Shield },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function SettingsTabs({
  settingsPanel,
  deviceManagement,
  auditTrail,
  branchManagement,
}: SettingsTabsProps) {
  const [tab, setTab] = useState<TabKey>("settings");

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0f0a19] pb-28">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900/80 border-b border-zinc-100 dark:border-zinc-800/40 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-5 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-brand-purple/10 dark:bg-brand-purple/20 rounded-2xl flex items-center justify-center">
              <Settings className="w-5 h-5 text-brand-purple" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                إعدادات النظام
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                الإعدادات، الأجهزة، الفروع وسجل النظام
              </p>
            </div>
          </div>

          {/* Scrollable Pill Tabs */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-bold transition-all ${
                    tab === t.key
                      ? "bg-brand-purple text-white shadow-md shadow-brand-purple/20"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
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
      <div className="max-w-2xl mx-auto px-5 py-5">
        {tab === "settings" && settingsPanel}
        {tab === "branches" && branchManagement}
        {tab === "devices" && deviceManagement}
        {tab === "audit" && auditTrail}
      </div>
    </div>
  );
}
