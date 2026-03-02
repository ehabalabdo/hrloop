// ============================================================
// Employee Payslip Page - Server Component
// Displays a single employee payslip for a given month
// URL: /payslip/[userId]?month=6&year=2025
// ============================================================

import { getEmployeePayslip } from "@/app/(app)/payroll/actions";
import PayslipView from "@/components/payroll/PayslipView";

export const metadata = {
  title: "HR Loop — My Payslip",
  description: "View your monthly payslip details",
};

export const dynamic = "force-dynamic";

export default async function PayslipPage(props: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const { userId } = await props.params;
  const searchParams = await props.searchParams;

  const now = new Date();
  const month = searchParams.month ? parseInt(searchParams.month) : now.getMonth() + 1;
  const year = searchParams.year ? parseInt(searchParams.year) : now.getFullYear();

  const payslip = await getEmployeePayslip(userId, month, year);

  return <PayslipView payslip={payslip} />;
}
