"use client";

// ============================================================
// Action Buttons — Contextual attendance hub
// One big primary action per state. Mobile-first, Arabic.
// ============================================================

import { Fingerprint, LogIn, LogOut, Coffee, Play, Loader2, ClipboardCheck } from "lucide-react";
import { useLang } from "@/lib/i18n";

interface ActionButtonsProps {
  status: "not_clocked_in" | "clocked_in" | "on_break";
  isWithinFence: boolean;
  isLoading: boolean;
  hasBiometric: boolean;
  onAction: (action: "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END") => void;
  onRegisterBiometric: () => void;
  checklistComplete?: boolean;
}

export default function ActionButtons({
  status,
  isWithinFence,
  isLoading,
  hasBiometric,
  onAction,
  onRegisterBiometric,
  checklistComplete = false,
}: ActionButtonsProps) {
  const { t } = useLang();
  const disabled = !isWithinFence || isLoading;

  // ── Biometric Registration ──
  if (!hasBiometric) {
    return (
      <div className="flex flex-col items-center gap-5 w-full px-2">
        <p className="text-sm text-muted text-center leading-relaxed">
          {t.checkin.registerBiometric}
          <br />
          <span className="text-xs text-zinc-400">{t.checkin.oneTimeOnly}</span>
        </p>
        <button
          onClick={onRegisterBiometric}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 px-6 py-5 rounded-3xl text-lg font-bold bg-brand-purple text-white shadow-xl shadow-brand-purple/20 hover:shadow-brand-purple/40 transition-all duration-300 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Fingerprint className="w-6 h-6" />
          )}
          <span>{isLoading ? t.checkin.registering : t.checkin.registerFingerprint}</span>
        </button>
      </div>
    );
  }

  // ── Not Clocked In → Big "تسجيل حضور" (Check In) ──
  if (status === "not_clocked_in") {
    return (
      <div className="flex flex-col items-center gap-5 w-full px-2">
        {/* Giant circular action button */}
        <button
          onClick={() => onAction("CLOCK_IN")}
          disabled={disabled}
          className="relative w-44 h-44 sm:w-48 sm:h-48 rounded-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-brand-magenta to-brand-magenta/80 text-white shadow-2xl shadow-brand-magenta/30 hover:shadow-brand-magenta/50 transition-all duration-300 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {/* Pulse ring animation */}
          {!disabled && (
            <div className="absolute inset-0 rounded-full bg-brand-primary/20 animate-ping" />
          )}
          <div className="relative z-10 flex flex-col items-center gap-2">
            {isLoading ? (
              <Loader2 className="w-10 h-10 animate-spin" />
            ) : (
              <LogIn className="w-10 h-10" />
            )}
            <span className="text-xl font-bold">
              {isLoading ? t.checkin.verifying : t.checkin.checkIn}
            </span>
          </div>
        </button>

        {!isWithinFence && (
          <div className="text-center bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl px-5 py-3">
            <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
              {t.checkin.mustBeAtBranch}
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── Clocked In → Break + Check Out ──
  if (status === "clocked_in") {
    const checkoutDisabled = disabled || !checklistComplete;
    return (
      <div className="flex flex-col items-center gap-4 w-full px-2">
        {/* Primary: Start Break */}
        <button
          onClick={() => onAction("BREAK_START")}
          disabled={disabled}
          className="w-full flex items-center justify-center gap-3 px-6 py-5 rounded-3xl text-lg font-bold bg-brand-orange text-white shadow-xl shadow-brand-orange/20 hover:shadow-brand-orange/40 transition-all duration-300 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Coffee className="w-6 h-6" />
          )}
          <span>{t.checkin.startBreak}</span>
        </button>

        {/* Secondary: Check Out */}
        <button
          onClick={() => onAction("CLOCK_OUT")}
          disabled={checkoutDisabled}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-3xl text-base font-semibold border-2 border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/10 hover:bg-red-100 dark:hover:bg-red-950/30 transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <LogOut className="w-5 h-5" />
          <span>{t.checkin.checkOut}</span>
        </button>
        {!checklistComplete && (
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
            <ClipboardCheck className="w-4 h-4" />
            <span>{t.checkin.completeChecklistFirst}</span>
          </div>
        )}
      </div>
    );
  }

  // ── On Break → End Break (primary) + Check Out (secondary) ──
  if (status === "on_break") {
    const checkoutDisabled = disabled || !checklistComplete;
    return (
      <div className="flex flex-col items-center gap-4 w-full px-2">
        {/* Break indicator */}
        <div className="flex items-center gap-2 text-brand-orange animate-pulse">
          <Coffee className="w-5 h-5" />
          <span className="text-base font-semibold">{t.checkin.onBreakNow}</span>
        </div>

        {/* Primary: End Break */}
        <button
          onClick={() => onAction("BREAK_END")}
          disabled={disabled}
          className="w-full flex items-center justify-center gap-3 px-6 py-5 rounded-3xl text-lg font-bold bg-gradient-to-r from-brand-purple-light to-brand-purple text-white shadow-xl shadow-brand-purple/20 hover:shadow-brand-purple/40 transition-all duration-300 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Play className="w-6 h-6" />
          )}
          <span>{isLoading ? t.checkin.verifying : t.checkin.endBreak}</span>
        </button>

        {/* Secondary: Check Out */}
        <button
          onClick={() => onAction("CLOCK_OUT")}
          disabled={checkoutDisabled}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-3xl text-base font-semibold border-2 border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/10 hover:bg-red-100 dark:hover:bg-red-950/30 transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <LogOut className="w-5 h-5" />
          <span>{t.checkin.checkOut}</span>
        </button>
        {!checklistComplete && (
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
            <ClipboardCheck className="w-4 h-4" />
            <span>{t.checkin.completeChecklistFirst}</span>
          </div>
        )}
      </div>
    );
  }

  return null;
}
