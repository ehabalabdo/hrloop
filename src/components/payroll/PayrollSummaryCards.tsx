"use client";

// ============================================================
// Payroll Summary Cards
// Top-level financial overview for the admin dashboard
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
      label: "Total Payroll Cost",
      value: formatCurrency(summary.totalPayrollCost),
      prefix: "$",
      color: "text-brand-magenta dark:text-brand-magenta",
      bg: "bg-brand-magenta/5 dark:bg-brand-magenta/10",
      border: "border-brand-magenta/15 dark:border-brand-magenta/20",
      large: true,
    },
    {
      icon: Users,
      label: "Employees",
      value: summary.totalEmployees.toString(),
      color: "text-brand-purple",
      bg: "bg-brand-purple/5 dark:bg-brand-purple/10",
      border: "border-brand-purple/15",
    },
    {
      icon: Calculator,
      label: "Average Salary",
      value: formatCurrency(summary.averageSalary),
      prefix: "$",
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/30",
      border: "border-purple-200 dark:border-purple-800",
    },
    {
      icon: TrendingDown,
      label: "Total Deductions",
      value: formatCurrency(summary.totalDeductions),
      prefix: "-$",
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-950/30",
      border: "border-red-200 dark:border-red-800",
    },
    {
      icon: TrendingUp,
      label: "Total Bonuses",
      value: formatCurrency(summary.totalBonuses),
      prefix: "+$",
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-950/30",
      border: "border-green-200 dark:border-green-800",
    },
    {
      icon: Clock,
      label: "Total Overtime (hrs)",
      value: summary.totalOvertimePay.toFixed(1),
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-800",
    },
  ];

  return (
    <div>
      <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
        {monthLabel} — Financial Summary
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`${card.bg} border ${card.border} rounded-xl p-3 ${
              card.large ? "col-span-2 sm:col-span-1" : ""
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <card.icon className={`w-4 h-4 ${card.color}`} />
              <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                {card.label}
              </span>
            </div>
            <div className={`text-lg font-bold ${card.color}`}>
              {card.prefix && (
                <span className="text-sm font-medium opacity-70">
                  {card.prefix}
                </span>
              )}
              {card.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
