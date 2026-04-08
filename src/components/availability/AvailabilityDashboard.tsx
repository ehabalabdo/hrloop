"use client";

// ============================================================
// Availability Dashboard — Hourly employees set weekly hours
// Locked for 1 week after saving
// ============================================================

import { useState, useTransition } from "react";
import {
  Clock,
  Save,
  Lock,
  Unlock,
  Loader2,
  CalendarDays,
  AlertCircle,
} from "lucide-react";
import type { AvailabilitySlot } from "@/app/(app)/availability/actions";
import { saveAvailability } from "@/app/(app)/availability/actions";
import { useLang } from "@/lib/i18n";

interface AvailabilityDashboardProps {
  initialSlots: AvailabilitySlot[];
  isAllLocked: boolean;
  lockExpiresAt: string | null;
}

export default function AvailabilityDashboard({
  initialSlots,
  isAllLocked,
  lockExpiresAt,
}: AvailabilityDashboardProps) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>(initialSlots);
  const [locked, setLocked] = useState(isAllLocked);
  const [expiresAt, setExpiresAt] = useState(lockExpiresAt);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const { t, lang } = useLang();

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const updateSlot = (
    dayOfWeek: number,
    field: "startTime" | "endTime",
    value: string
  ) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.dayOfWeek === dayOfWeek ? { ...s, [field]: value } : s
      )
    );
  };

  const toggleDay = (dayOfWeek: number) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.dayOfWeek === dayOfWeek
          ? { ...s, startTime: s.startTime ? "" : "09:00", endTime: s.endTime ? "" : "17:00" }
          : s
      )
    );
  };

  const handleSave = () => {
    const entries = slots
      .filter((s) => s.startTime && s.endTime)
      .map((s) => ({
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
      }));

    if (entries.length === 0) {
      showToast(t.availability.selectOneDay, "error");
      return;
    }

    // Validate times
    for (const e of entries) {
      if (e.startTime >= e.endTime) {
        const dayName = slots.find((s) => s.dayOfWeek === e.dayOfWeek)?.dayName;
        showToast(`${t.availability.startBeforeEnd} (${dayName})`, "error");
        return;
      }
    }

    startTransition(async () => {
      const result = await saveAvailability(entries);
      if (result.success) {
        showToast(t.availability.saved, "success");
        setLocked(true);
        setExpiresAt(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());
        // Mark all active slots as locked
        setSlots((prev) =>
          prev.map((s) => ({
            ...s,
            isLocked: s.startTime && s.endTime ? true : false,
          }))
        );
      } else {
        showToast(result.error || t.common.error, "error");
      }
    });
  };

  const formatLockExpiry = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(lang === "ar" ? "ar" : "en", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const activeDaysCount = slots.filter((s) => s.startTime && s.endTime).length;
  const totalHours = slots.reduce((acc, s) => {
    if (!s.startTime || !s.endTime) return acc;
    const [sh, sm] = s.startTime.split(":").map(Number);
    const [eh, em] = s.endTime.split(":").map(Number);
    return acc + (eh * 60 + em - sh * 60 - sm) / 60;
  }, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white border border-zinc-200/50 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl gradient-purple flex items-center justify-center">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              {t.availability.title}
            </h2>
            <p className="text-xs text-zinc-500">
              {t.availability.subtitle}
            </p>
          </div>
        </div>

        {/* Lock Status */}
        {locked && expiresAt && (
          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-3.5">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-bold text-amber-700 dark:text-amber-300">
                {t.availability.locked}
              </div>
              <div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                {t.availability.cantEditUntil}: {formatLockExpiry(expiresAt)}
              </div>
            </div>
          </div>
        )}

        {!locked && (
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3.5">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs text-blue-700">
                {t.availability.lockNote}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1">
        <div className="shrink-0 bg-white border border-zinc-200/50 rounded-xl p-4 min-w-[120px] text-center">
          <div className="text-2xl font-bold text-brand-purple">{activeDaysCount}</div>
          <div className="text-xs text-zinc-500 mt-0.5">{t.availability.workDays}</div>
        </div>
        <div className="shrink-0 bg-white border border-zinc-200/50 rounded-xl p-4 min-w-[120px] text-center">
          <div className="text-2xl font-bold text-emerald-600">{totalHours.toFixed(1)}</div>
          <div className="text-xs text-zinc-500 mt-0.5">{t.availability.hrsWeek}</div>
        </div>
      </div>

      {/* Days Grid */}
      <div className="space-y-3">
        {slots.map((slot) => {
          const isActive = slot.startTime && slot.endTime;
          return (
            <div
              key={slot.dayOfWeek}
              className={`bg-surface/60 border shadow-sm rounded-2xl p-4 transition-all ${
                isActive
                  ? "border-brand-purple/30 dark:border-brand-purple/20"
                  : "border-border-main opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <CalendarDays className={`w-4 h-4 ${isActive ? "text-brand-purple" : "text-zinc-400"}`} />
                  <span className="text-sm font-bold text-foreground">
                    {slot.dayName}
                  </span>
                  {slot.isLocked && (
                    <Lock className="w-3 h-3 text-amber-500" />
                  )}
                </div>
                <button
                  onClick={() => toggleDay(slot.dayOfWeek)}
                  disabled={locked}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    isActive
                      ? "bg-brand-purple"
                      : "bg-zinc-200 dark:bg-zinc-700"
                  } ${locked ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                      isActive ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>

              {isActive && (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-zinc-400 mb-0.5">{t.availability.from}</label>
                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) =>
                        updateSlot(slot.dayOfWeek, "startTime", e.target.value)
                      }
                      disabled={locked}
                      className="w-full text-sm border border-border-main rounded-xl px-3 py-2 bg-surface-hover text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  <span className="text-zinc-400 mt-4">—</span>
                  <div className="flex-1">
                    <label className="block text-xs text-zinc-400 mb-0.5">{t.availability.to}</label>
                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) =>
                        updateSlot(slot.dayOfWeek, "endTime", e.target.value)
                      }
                      disabled={locked}
                      className="w-full text-sm border border-border-main rounded-xl px-3 py-2 bg-surface-hover text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save Button */}
      {!locked && (
        <button
          onClick={handleSave}
          disabled={isPending || activeDaysCount === 0}
          className="w-full flex items-center justify-center gap-2 gradient-purple text-white rounded-xl py-3.5 text-sm font-bold shadow-purple-sm disabled:opacity-50 transition active:scale-95"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
                    {t.availability.saveAndLock}
        </button>
      )}

      {locked && (
        <div className="flex items-center justify-center gap-2 bg-zinc-100 text-zinc-500 rounded-xl py-3.5 text-sm font-bold">
          <Lock className="w-4 h-4" />
          {t.availability.lockedMsg}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-24 left-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-lg text-sm font-bold text-center ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
