"use client";

// ============================================================
// Settings Tabs — Clean Arabic navigation
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
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="bg-surface border-b border-border-main sticky top-0 lg:top-0 z-20">
        <div className="max-w-3xl mx-auto px-5 py-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 bg-brand-primary-subtle rounded-xl flex items-center justify-center">
              <Settings className="w-5 h-5 text-brand-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">
                إعدادات النظام
              </h1>
              <p className="text-sm text-muted">
                إدارة الموظفين، الفروع والإعدادات العامة
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    active
                      ? "bg-brand-primary text-white shadow-sm shadow-brand-primary/20"
                      : "text-muted hover:text-foreground hover:bg-surface-hover"
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
      <div className="max-w-3xl mx-auto px-5 py-6">
        {tab === "employees" && employeeManagement}
        {tab === "settings" && settingsPanel}
        {tab === "branches" && branchManagement}
        {tab === "devices" && deviceManagement}
        {tab === "audit" && auditTrail}
      </div>
    </div>
  );
}
