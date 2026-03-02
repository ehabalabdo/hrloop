// ============================================================
// Leaves Page - Server Component
// ============================================================

import { getLeaveRequests, getLeaveEmployees } from "./actions";
import LeavesDashboard from "@/components/leaves/LeavesDashboard";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "HR Loop — Leave Management",
  description: "Leave requests and approval workflow",
};

export const dynamic = "force-dynamic";

export default async function LeavesPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const [requests, employees] = await Promise.all([
    getLeaveRequests(),
    getLeaveEmployees(),
  ]);

  return (
    <LeavesDashboard
      initialRequests={requests}
      employees={employees}
      currentUserId={session.userId}
      currentUserRole={session.role}
    />
  );
}
