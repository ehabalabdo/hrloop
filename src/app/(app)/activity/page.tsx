import ActivityLogView from "@/components/activity/ActivityLogView";
import { getActivityLogs } from "@/app/(app)/dashboard/actions";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const logs = await getActivityLogs(100);

  return <ActivityLogView initialLogs={logs} />;
}
