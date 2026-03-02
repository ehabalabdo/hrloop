// ============================================================
// Schedule Page - Server Component
// Owner's dashboard for managing weekly employee schedule
// ============================================================

import { getWeeklySchedule, getAllBranches } from "./actions";
import { getWeekStart } from "@/lib/schedule-utils";
import ScheduleDashboard from "@/components/schedule/ScheduleDashboard";

export const metadata = {
  title: "HR Loop — Schedule Engine",
  description: "Automated weekly scheduling engine for 40 branches",
};

// Force dynamic rendering (we always need fresh data)
export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  // Get current week's Monday
  const now = new Date();
  const monday = getWeekStart(now);
  const weekStartISO = monday.toISOString().split("T")[0];

  // Fetch initial data in parallel
  const [scheduleData, branchesData] = await Promise.all([
    getWeeklySchedule(weekStartISO),
    getAllBranches(),
  ]);

  return (
    <ScheduleDashboard
      initialData={scheduleData}
      initialBranches={branchesData}
      initialWeekStart={weekStartISO}
    />
  );
}
