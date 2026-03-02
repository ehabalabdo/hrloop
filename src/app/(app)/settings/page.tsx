import SettingsPanel from "@/components/settings/SettingsPanel";
import { getGlobalSettings } from "@/app/(app)/dashboard/actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getGlobalSettings();

  return <SettingsPanel initialSettings={settings} />;
}
