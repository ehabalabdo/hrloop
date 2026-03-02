// ============================================================
// Payroll Page - Server Component
// Admin dashboard for monthly payroll & deductions engine
// ============================================================

import { getPayrollList, getPayrollBranches } from "./actions";
import PayrollDashboard from "@/components/payroll/PayrollDashboard";

export const metadata = {
  title: "HR Loop — Payroll & Deductions",
  description: "Monthly salary reconciliation engine with penalties and overtime",
};

// Force dynamic rendering (we always need fresh data)
export const dynamic = "force-dynamic";

export default async function PayrollPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Fetch initial data in parallel
  const [payrollData, branches] = await Promise.all([
    getPayrollList(month, year),
    getPayrollBranches(),
  ]);

  return (
    <PayrollDashboard
      initialData={{
        items: payrollData.items,
        summary: payrollData.summary,
        branches,
        month,
        year,
      }}
    />
  );
}
