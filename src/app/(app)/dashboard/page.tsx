// ============================================================
// Executive Dashboard - Server Component Page
// ============================================================

import {
  getDashboardMetrics,
  getBranchPerformance,
  getActivityLogs,
  getSystemHealth,
} from "./actions";
import DashboardView from "@/components/dashboard/DashboardView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "HR Loop — Executive Dashboard",
  description: "Analytics overview for all 40 branches",
};

export default async function DashboardPage() {
  const [metrics, branches, activities, health] = await Promise.all([
    getDashboardMetrics(),
    getBranchPerformance(),
    getActivityLogs(20),
    getSystemHealth(),
  ]);

  return (
    <DashboardView
      metrics={metrics}
      branches={branches}
      activities={activities}
      health={health}
    />
  );
}
