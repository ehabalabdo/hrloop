"use client";

// ============================================================
// Global Settings Panel
// Admin interface for system-wide configuration
// ============================================================

import { useState, useTransition } from "react";
import { Settings, Save, Loader2 } from "lucide-react";
import type { SettingItem } from "@/lib/dashboard-types";
import { updateGlobalSetting } from "@/app/(app)/dashboard/actions";

interface SettingsPanelProps {
  initialSettings: SettingItem[];
}

const SETTING_LABELS: Record<string, string> = {
  grace_period_minutes: "Grace Period (minutes)",
  late_penalty_per_minute: "Late Penalty per Minute (SAR)",
  overtime_multiplier: "Overtime Multiplier",
  default_geofence_radius: "Geofence Radius (meters)",
  company_work_start: "Work Start Time",
  company_work_end: "Work End Time",
  sick_leave_paid: "Sick Leave Paid",
  annual_leave_days: "Annual Leave Days (per year)",
  emergency_leave_days: "Emergency Leave Days (per year)",
};

const SETTING_DESCRIPTIONS: Record<string, string> = {
  grace_period_minutes: "Number of minutes after shift start before lateness is recorded",
  late_penalty_per_minute: "Deduction amount in SAR for each minute late after grace period",
  overtime_multiplier: "Pay multiplier for overtime hours (e.g., 1.5 = time and a half)",
  default_geofence_radius: "Radius in meters for GPS-based attendance validation",
  company_work_start: "Default daily work start time (HH:MM format)",
  company_work_end: "Default daily work end time (HH:MM format)",
  sick_leave_paid: "Whether sick leave days are paid (true/false)",
  annual_leave_days: "Total annual leave days allocated per employee per year",
  emergency_leave_days: "Total emergency leave days allocated per employee per year",
};

const SETTING_GROUPS: { label: string; keys: string[] }[] = [
  {
    label: "Attendance & Penalties",
    keys: [
      "grace_period_minutes",
      "late_penalty_per_minute",
      "overtime_multiplier",
      "default_geofence_radius",
    ],
  },
  {
    label: "Work Hours",
    keys: ["company_work_start", "company_work_end"],
  },
  {
    label: "Leave Policies",
    keys: ["sick_leave_paid", "annual_leave_days", "emergency_leave_days"],
  },
];

export default function SettingsPanel({ initialSettings }: SettingsPanelProps) {
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
      // Use system as actor for now
      const result = await updateGlobalSetting(key, value, "system", "Admin");
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
              className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            >
              <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  {group.label}
                </h2>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {group.keys.map((key: string) => (
                  <div
                    key={key}
                    className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {SETTING_LABELS[key] ?? key}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {SETTING_DESCRIPTIONS[key] ?? ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 sm:w-52">
                      {key === "sick_leave_paid" ? (
                        <select
                          value={getSettingValue(key)}
                          onChange={(
                            e: React.ChangeEvent<HTMLSelectElement>
                          ) => handleChange(key, e.target.value)}
                          className="flex-1 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                        >
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      ) : key.includes("work_start") ||
                        key.includes("work_end") ? (
                        <input
                          type="time"
                          value={getSettingValue(key)}
                          onChange={(
                            e: React.ChangeEvent<HTMLInputElement>
                          ) => handleChange(key, e.target.value)}
                          className="flex-1 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
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
                          className="flex-1 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                        />
                      )}
                      {isModified(key) && (
                        <button
                          onClick={() => handleSave(key)}
                          disabled={isPending && savingKey === key}
                          className="p-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 transition-colors"
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
              ? "bg-brand-magenta text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}