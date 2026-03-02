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

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, employees, logs, actionTypes, actors] = await Promise.all([
    getGlobalSettings(),
    getEmployeeBiometricStatus(),
    getSystemLogs({ limit: 100 }),
    getSystemLogActionTypes(),
    getSystemLogActors(),
  ]);

  // Use system actor for now — in production, comes from session
  const actorId = "system";
  const actorName = "Admin";

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
