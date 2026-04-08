"use client";

// ============================================================
// Global Settings Panel
// Admin interface for system-wide configuration
// ============================================================

import { useState, useTransition } from "react";
import { Settings, Save, Loader2 } from "lucide-react";
import type { SettingItem } from "@/lib/dashboard-types";
import { updateGlobalSetting } from "@/app/(app)/dashboard/actions";
import { useLang } from "@/lib/i18n";

interface SettingsPanelProps {
  initialSettings: SettingItem[];
  actorId: string;
  actorName: string;
}



export default function SettingsPanel({ initialSettings, actorId, actorName }: SettingsPanelProps) {
  const { t } = useLang();

  const SETTING_LABELS: Record<string, string> = {
    grace_period_minutes: t.settings.gracePeriod,
    late_penalty_per_minute: t.settings.latePenalty,
    overtime_multiplier: t.settings.overtimeMultiplier,
    default_geofence_radius: t.settings.geofenceRadiusLabel,
    company_work_start: t.settings.workStart,
    company_work_end: t.settings.workEnd,
    sick_leave_paid: t.settings.sickLeavePaid,
    annual_leave_days: t.settings.annualDays,
    emergency_leave_days: t.settings.emergencyDays,
  };

  const SETTING_GROUPS: { label: string; keys: string[] }[] = [
    {
      label: t.settings.attendancePenalties,
      keys: [
        "grace_period_minutes",
        "late_penalty_per_minute",
        "overtime_multiplier",
        "default_geofence_radius",
      ],
    },
    {
      label: t.settings.workHoursLabel,
      keys: ["company_work_start", "company_work_end"],
    },
    {
      label: t.settings.leavePolicies,
      keys: ["sick_leave_paid", "annual_leave_days", "emergency_leave_days"],
    },
  ];

  const [settings, setSettings] = useState<SettingItem[]>(initialSettings);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const getSettingValue = (key: string): string => {
    if (key in editValues) return editValues[key];
    const setting = settings.find((s: SettingItem) => s.key === key);
    return setting?.value ?? "";
  };

  const handleChange = (key: string, value: string) => {
    setEditValues((prev: Record<string, string>) => ({ ...prev, [key]: value }));
  };

  const handleSave = (key: string) => {
    const value = editValues[key];
    if (value === undefined) return;
    setSavingKey(key);
    startTransition(async () => {
      const result = await updateGlobalSetting(key, value, actorId, actorName);
      if (result.success) {
        setSettings((prev: SettingItem[]) =>
          prev.map((s: SettingItem) =>
            s.key === key ? { ...s, value } : s
          )
        );
        setEditValues((prev: Record<string, string>) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        showToast(`${SETTING_LABELS[key] ?? key} updated.`, "success");
      } else {
        showToast(`Failed to update setting.`, "error");
      }
      setSavingKey(null);
    });
  };

  const isModified = (key: string) => {
    if (!(key in editValues)) return false;
    const original = settings.find((s: SettingItem) => s.key === key);
    return editValues[key] !== (original?.value ?? "");
  };

  return (
    <>
      <div className="space-y-6">
        {SETTING_GROUPS.map(
          (group: { label: string; keys: string[] }) => (
            <div
              key={group.label}
              className="bg-surface rounded-xl border border-border-main overflow-hidden"
            >
              <div className="px-5 py-3 bg-surface-hover/50 border-b border-border-main">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  {group.label}
                </h2>
              </div>
              <div className="divide-y divide-border-main">
                {group.keys.map((key: string) => (
                  <div
                    key={key}
                    className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {SETTING_LABELS[key] ?? key}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 sm:w-52">
                      {key === "sick_leave_paid" ? (
                        <select
                          value={getSettingValue(key)}
                          onChange={(
                            e: React.ChangeEvent<HTMLSelectElement>
                          ) => handleChange(key, e.target.value)}
                          className="flex-1 text-sm border border-border-main rounded-lg px-3 py-2 bg-surface text-zinc-700 dark:text-zinc-300"
                        >
                          <option value="true">{t.common.yes}</option>
                          <option value="false">{t.common.no}</option>
                        </select>
                      ) : key.includes("work_start") ||
                        key.includes("work_end") ? (
                        <input
                          type="time"
                          value={getSettingValue(key)}
                          onChange={(
                            e: React.ChangeEvent<HTMLInputElement>
                          ) => handleChange(key, e.target.value)}
                          className="flex-1 text-sm border border-border-main rounded-lg px-3 py-2 bg-surface text-zinc-700 dark:text-zinc-300"
                        />
                      ) : (
                        <input
                          type="number"
                          step={
                            key.includes("multiplier") ||
                            key.includes("penalty")
                              ? "0.01"
                              : "1"
                          }
                          value={getSettingValue(key)}
                          onChange={(
                            e: React.ChangeEvent<HTMLInputElement>
                          ) => handleChange(key, e.target.value)}
                          className="flex-1 text-sm border border-border-main rounded-lg px-3 py-2 bg-surface text-zinc-700 dark:text-zinc-300"
                        />
                      )}
                      {isModified(key) && (
                        <button
                          onClick={() => handleSave(key)}
                          disabled={isPending && savingKey === key}
                          className="p-2 rounded-lg bg-[#E20074] hover:bg-[#B8005D] text-white disabled:opacity-50 transition-colors"
                          title="Save"
                        >
                          {isPending && savingKey === key ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
            toast.type === "success"
              ? "bg-brand-primary text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}