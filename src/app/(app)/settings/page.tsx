import SettingsPanel from "@/components/settings/SettingsPanel";
import DeviceManagement from "@/components/settings/DeviceManagement";
import BranchManagement from "@/components/settings/BranchManagement";
import EmployeeManagement from "@/components/settings/EmployeeManagement";
import AuditTrailViewer from "@/components/activity/AuditTrailViewer";
import { getGlobalSettings } from "@/app/(app)/dashboard/actions";
import { getEmployeeBiometricStatus } from "@/app/(app)/attendance/resilience-actions";
import {
  getSystemLogs,
  getSystemLogActionTypes,
  getSystemLogActors,
} from "@/lib/system-logger";
import { getBranches, getAvailableManagers } from "@/app/(app)/settings/branch-actions";
import { getEmployees, getActiveBranches } from "@/app/(app)/settings/employee-actions";
import SettingsTabs from "@/components/settings/SettingsTabs";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const [settings, biometricEmployees, logs, actionTypes, actors, branches, managers, allEmployees, activeBranches] = await Promise.all([
    getGlobalSettings(),
    getEmployeeBiometricStatus(),
    getSystemLogs({ limit: 100 }),
    getSystemLogActionTypes(),
    getSystemLogActors(),
    getBranches(),
    getAvailableManagers(),
    getEmployees(),
    getActiveBranches(),
  ]);

  const actorId = session.userId;
  const actorName = session.fullName;

  return (
    <SettingsTabs
      settingsPanel={<SettingsPanel initialSettings={settings} actorId={actorId} actorName={actorName} />}
      employeeManagement={
        <EmployeeManagement
          initialEmployees={allEmployees}
          branches={activeBranches}
        />
      }
      deviceManagement={
        <DeviceManagement
          employees={biometricEmployees}
          actorId={actorId}
          actorName={actorName}
        />
      }
      branchManagement={
        <BranchManagement
          initialBranches={branches}
          managers={managers}
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
