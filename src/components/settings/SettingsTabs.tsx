"use client";

// ============================================================
// Settings Tabs — Wraps Settings, Device Management, Audit Trail
// ============================================================

import { useState, type ReactNode } from "react";
import { Settings, Fingerprint, Shield } from "lucide-react";

interface SettingsTabsProps {
  settingsPanel: ReactNode;
  deviceManagement: ReactNode;
  auditTrail: ReactNode;
}

const TABS = [
  { key: "settings", label: "Global Settings", icon: Settings },
  { key: "devices", label: "Device Management", icon: Fingerprint },
  { key: "audit", label: "Audit Trail", icon: Shield },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function SettingsTabs({
  settingsPanel,
  deviceManagement,
  auditTrail,
}: SettingsTabsProps) {
  const [tab, setTab] = useState<TabKey>("settings");

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center">
              <Settings className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Admin Settings
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                System configuration, devices &amp; audit trail
              </p>
            </div>
          </div>

          {/* Tab Bar */}
          <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-700 -mb-[1px]">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    tab === t.key
                      ? "border-violet-600 text-violet-600 dark:text-violet-400"
                      : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {tab === "settings" && settingsPanel}
        {tab === "devices" && deviceManagement}
        {tab === "audit" && auditTrail}
      </div>
    </div>
  );
}
