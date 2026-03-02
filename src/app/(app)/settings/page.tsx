import SettingsPanel from "@/components/settings/SettingsPanel";
import DeviceManagement from "@/components/settings/DeviceManagement";
import AuditTrailViewer from "@/components/activity/AuditTrailViewer";
import { getGlobalSettings } from "@/app/(app)/dashboard/actions";
import { getEmployeeBiometricStatus } from "@/app/(app)/attendance/resilience-actions";
import {
  getSystemLogs,
  getSystemLogActionTypes,
  getSystemLogActors,
} from "@/lib/system-logger";
import SettingsTabs from "@/components/settings/SettingsTabs";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const [settings, employees, logs, actionTypes, actors] = await Promise.all([
    getGlobalSettings(),
    getEmployeeBiometricStatus(),
    getSystemLogs({ limit: 100 }),
    getSystemLogActionTypes(),
    getSystemLogActors(),
  ]);

  const actorId = session.userId;
  const actorName = session.fullName;

  return (
    <SettingsTabs
      settingsPanel={<SettingsPanel initialSettings={settings} />}
      deviceManagement={
        <DeviceManagement
          employees={employees}
          actorId={actorId}
          actorName={actorName}
        />
      }
      auditTrail={
        <AuditTrailViewer
          initialLogs={logs}
          actionTypes={actionTypes}
          actors={actors}
        />
      }
    />
  );
}
