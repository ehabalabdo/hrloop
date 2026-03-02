// ============================================================
// Payroll Page - Server Component
// Admin dashboard for monthly payroll & deductions engine
// Includes disputes management and override review
// ============================================================

import { getPayrollList, getPayrollBranches } from "./actions";
import { getDisputes, getPendingOverrides } from "../attendance/resilience-actions";
import PayrollDashboard from "@/components/payroll/PayrollDashboard";
import DisputesManagement from "@/components/payroll/DisputesManagement";
import OverrideReviewPanel from "@/components/attendance/OverrideReviewPanel";
import PayrollTabs from "@/components/payroll/PayrollTabs";

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
  const [payrollData, branches, disputes, pendingOverrides] = await Promise.all([
    getPayrollList(month, year),
    getPayrollBranches(),
    getDisputes({ status: "PENDING" }),
    getPendingOverrides(),
  ]);

  // Actor info — in production, from session
  const reviewerId = "system";
  const reviewerName = "Admin";

  return (
    <PayrollTabs
      payrollDashboard={
        <PayrollDashboard
          initialData={{
            items: payrollData.items,
            summary: payrollData.summary,
            branches,
            month,
            year,
          }}
        />
      }
      disputesPanel={
        <DisputesManagement
          disputes={disputes}
          reviewerId={reviewerId}
          reviewerName={reviewerName}
        />
      }
      overridesPanel={
        <OverrideReviewPanel
          overrides={pendingOverrides}
          reviewerId={reviewerId}
          reviewerName={reviewerName}
        />
      }
      pendingDisputeCount={disputes.length}
      pendingOverrideCount={pendingOverrides.length}
    />
  );
}
