"use client";

// ============================================================
// Payroll Tabs — Arabic, pill-style
// ============================================================

import { useState, type ReactNode } from "react";
import { Wallet, AlertTriangle, Camera } from "lucide-react";
import { useLang } from "@/lib/i18n";

interface PayrollTabsProps {
  payrollDashboard: ReactNode;
  disputesPanel: ReactNode;
  overridesPanel: ReactNode;
  pendingDisputeCount: number;
  pendingOverrideCount: number;
}

const TABS = [
  { key: "payroll", label: "الرواتب", icon: Wallet },
  { key: "disputes", label: "الاعتراضات", icon: AlertTriangle },
  { key: "overrides", label: "التعديلات", icon: Camera },
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
  const { t } = useLang();

  const TABS_LABELS = [
    { key: "payroll" as const, label: t.payroll.salaries, icon: Wallet },
    { key: "disputes" as const, label: t.payroll.disputes, icon: AlertTriangle },
    { key: "overrides" as const, label: t.payroll.adjustments, icon: Camera },
  ];

  const badges: Record<string, number> = {
    disputes: pendingDisputeCount,
    overrides: pendingOverrideCount,
  };

  return (
    <div className="min-h-screen">
      {/* Tab Bar */}
        <div className="bg-white/90 backdrop-blur-xl sticky top-0 z-30 border-b border-zinc-100">
        <div className="page-container flex gap-2 overflow-x-auto no-scrollbar py-3">
          {TABS_LABELS.map((item) => {
            const Icon = item.icon;
            const badge = badges[item.key] ?? 0;
            return (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all active:scale-95 shrink-0 ${
                  tab === item.key
                    ? "gradient-purple text-white shadow-purple-sm"
                    : "text-zinc-500 hover:text-zinc-700 bg-zinc-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
                {badge > 0 && (
                  <span className="ml-1 text-xs font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
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
        <div className="page-container py-4 pb-20">
          <h2 className="text-xl font-bold text-foreground mb-5">
            {t.payroll.penaltyDisputes}
          </h2>
          {disputesPanel}
        </div>
      )}
      {tab === "overrides" && (
        <div className="page-container py-4 pb-20">
          <h2 className="text-xl font-bold text-foreground mb-5">
            {t.payroll.manualAdjustments}
          </h2>
          {overridesPanel}
        </div>
      )}
    </div>
  );
}
