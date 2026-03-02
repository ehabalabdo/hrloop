"use client";

// ============================================================
// Payroll Tabs — Wraps Payroll Dashboard, Disputes, Overrides
// ============================================================

import { useState, type ReactNode } from "react";
import { Wallet, AlertTriangle, Camera } from "lucide-react";

interface PayrollTabsProps {
  payrollDashboard: ReactNode;
  disputesPanel: ReactNode;
  overridesPanel: ReactNode;
  pendingDisputeCount: number;
  pendingOverrideCount: number;
}

const TABS = [
  { key: "payroll", label: "Payroll", icon: Wallet },
  { key: "disputes", label: "Disputes", icon: AlertTriangle },
  { key: "overrides", label: "Overrides", icon: Camera },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function PayrollTabs({
  payrollDashboard,
  disputesPanel,
  overridesPanel,
  pendingDisputeCount,
  pendingOverrideCount,
}: PayrollTabsProps) {
  const [tab, setTab] = useState<TabKey>("payroll");

  const badges: Record<string, number> = {
    disputes: pendingDisputeCount,
    overrides: pendingOverrideCount,
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Tab Bar */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const badge = badges[t.key] ?? 0;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.key
                    ? "border-amber-500 text-amber-600 dark:text-amber-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
                {badge > 0 && (
                  <span className="ml-1 text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {tab === "payroll" && payrollDashboard}
      {tab === "disputes" && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">
            Penalty Disputes
          </h2>
          {disputesPanel}
        </div>
      )}
      {tab === "overrides" && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">
            Manual Override Requests
          </h2>
          {overridesPanel}
        </div>
      )}
    </div>
  );
}
