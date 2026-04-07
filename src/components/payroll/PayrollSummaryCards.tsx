"use client";

// ============================================================
// Payroll Summary Cards — Arabic mobile-first
// ============================================================

import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Users,
  Clock,
  Calculator,
} from "lucide-react";
import type { PayrollSummary } from "@/lib/payroll-types";

interface SummaryCardsProps {
  summary: PayrollSummary;
  monthLabel: string;
}

function formatCurrency(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function PayrollSummaryCards({
  summary,
  monthLabel,
}: SummaryCardsProps) {
  const cards = [
    {
      icon: DollarSign,
      label: "إجمالي الرواتب",
      value: formatCurrency(summary.totalPayrollCost),
      prefix: "$",
      color: "text-brand-purple",
      iconBg: "bg-brand-purple/10",
      large: true,
    },
    {
      icon: Users,
      label: "الموظفين",
      value: summary.totalEmployees.toString(),
      color: "text-brand-purple",
      iconBg: "bg-brand-purple/10",
    },
    {
      icon: Calculator,
      label: "متوسط الراتب",
      value: formatCurrency(summary.averageSalary),
      prefix: "$",
      color: "text-brand-purple",
      iconBg: "bg-brand-purple/10",
    },
    {
      icon: TrendingDown,
      label: "إجمالي الخصومات",
      value: formatCurrency(summary.totalDeductions),
      prefix: "-$",
      color: "text-red-600",
      iconBg: "bg-red-50",
    },
    {
      icon: TrendingUp,
      label: "إجمالي المكافآت",
      value: formatCurrency(summary.totalBonuses),
      prefix: "+$",
      color: "text-emerald-600",
      iconBg: "bg-emerald-50",
    },
    {
      icon: Clock,
      label: "العمل الإضافي (ساعات)",
      value: summary.totalOvertimePay.toFixed(1),
      color: "text-amber-600",
      iconBg: "bg-amber-50",
    },
  ];

  return (
    <div>
      <div className="text-xs font-semibold text-muted mb-3">
        {monthLabel} — الملخص المالي
      </div>
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`flex items-center gap-2.5 px-3 py-3 bg-white border border-zinc-200/50 rounded-xl min-w-fit shrink-0 ${
              card.large ? "min-w-[180px]" : ""
            }`}
          >
            <div className={`w-9 h-9 ${card.iconBg} rounded-xl flex items-center justify-center shrink-0`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <div className="text-right">
              <div className={`text-lg font-bold leading-none ${card.color}`}>
                {card.prefix && (
                  <span className="text-sm font-medium opacity-70">
                    {card.prefix}
                  </span>
                )}
                {card.value}
              </div>
              <div className="text-xs text-muted font-medium mt-0.5">
                {card.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
