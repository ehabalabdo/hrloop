"use client";

// ============================================================
// Action Buttons Component
// Dynamic check-in/out and break buttons based on current state.
// ============================================================

import { Fingerprint, LogIn, LogOut, Coffee, Play, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionButtonsProps {
  status: "not_clocked_in" | "clocked_in" | "on_break";
  isWithinFence: boolean;
  isLoading: boolean;
  hasBiometric: boolean;
  onAction: (action: "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END") => void;
  onRegisterBiometric: () => void;
}

export default function ActionButtons({
  status,
  isWithinFence,
  isLoading,
  hasBiometric,
  onAction,
  onRegisterBiometric,
}: ActionButtonsProps) {
  const disabled = !isWithinFence || isLoading;

  // If user has no biometric registered, show registration button
  if (!hasBiometric) {
    return (
      <div className="flex flex-col items-center gap-4 w-full">
        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center px-4">
          Register your biometrics to start using attendance.
          This only needs to be done once.
        </p>
        <button
          onClick={onRegisterBiometric}
          disabled={isLoading}
          className={cn(
            "w-full max-w-xs flex items-center justify-center gap-3",
            "px-8 py-5 rounded-2xl text-lg font-semibold",
            "bg-blue-600 hover:bg-blue-700 text-white",
            "shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40",
            "transition-all duration-200 active:scale-95",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
          )}
        >
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Fingerprint className="w-6 h-6" />
          )}
          <span>{isLoading ? "Registering..." : "Register Biometrics"}</span>
        </button>
      </div>
    );
  }

  // Not clocked in - Show "Check In" button
  if (status === "not_clocked_in") {
    return (
      <div className="flex flex-col items-center gap-4 w-full">
        <button
          onClick={() => onAction("CLOCK_IN")}
          disabled={disabled}
          className={cn(
            "w-full max-w-xs flex items-center justify-center gap-3",
            "px-8 py-6 rounded-2xl text-xl font-bold",
            "bg-emerald-600 hover:bg-emerald-700 text-white",
            "shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50",
            "transition-all duration-200 active:scale-95",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
          )}
        >
          {isLoading ? (
            <Loader2 className="w-7 h-7 animate-spin" />
          ) : (
            <LogIn className="w-7 h-7" />
          )}
          <span>{isLoading ? "Verifying..." : "Check In"}</span>
        </button>
        {!isWithinFence && (
          <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
            Check-in is disabled until you are at the branch.
          </p>
        )}
      </div>
    );
  }

  // Clocked in - Show "Break" and "Check Out" buttons
  if (status === "clocked_in") {
    return (
      <div className="flex flex-col items-center gap-3 w-full">
        <button
          onClick={() => onAction("BREAK_START")}
          disabled={disabled}
          className={cn(
            "w-full max-w-xs flex items-center justify-center gap-3",
            "px-8 py-5 rounded-2xl text-lg font-semibold",
            "bg-amber-500 hover:bg-amber-600 text-white",
            "shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40",
            "transition-all duration-200 active:scale-95",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
          )}
        >
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Coffee className="w-6 h-6" />
          )}
          <span>Start Break</span>
        </button>

        <button
          onClick={() => onAction("CLOCK_OUT")}
          disabled={disabled}
          className={cn(
            "w-full max-w-xs flex items-center justify-center gap-3",
            "px-8 py-5 rounded-2xl text-lg font-semibold",
            "bg-red-600 hover:bg-red-700 text-white",
            "shadow-lg shadow-red-600/25 hover:shadow-red-600/40",
            "transition-all duration-200 active:scale-95",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
          )}
        >
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <LogOut className="w-6 h-6" />
          )}
          <span>Check Out</span>
        </button>
      </div>
    );
  }

  // On break - Show "End Break" button
  if (status === "on_break") {
    return (
      <div className="flex flex-col items-center gap-4 w-full">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 animate-pulse">
          <Coffee className="w-5 h-5" />
          <span className="text-sm font-medium">On Break</span>
        </div>

        <button
          onClick={() => onAction("BREAK_END")}
          disabled={disabled}
          className={cn(
            "w-full max-w-xs flex items-center justify-center gap-3",
            "px-8 py-6 rounded-2xl text-xl font-bold",
            "bg-blue-600 hover:bg-blue-700 text-white",
            "shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50",
            "transition-all duration-200 active:scale-95",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
          )}
        >
          {isLoading ? (
            <Loader2 className="w-7 h-7 animate-spin" />
          ) : (
            <Play className="w-7 h-7" />
          )}
          <span>{isLoading ? "Verifying..." : "End Break"}</span>
        </button>

        <button
          onClick={() => onAction("CLOCK_OUT")}
          disabled={disabled}
          className={cn(
            "w-full max-w-xs flex items-center justify-center gap-3",
            "px-6 py-4 rounded-2xl text-base font-semibold",
            "bg-red-600 hover:bg-red-700 text-white",
            "shadow-lg shadow-red-600/25 hover:shadow-red-600/40",
            "transition-all duration-200 active:scale-95",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
          )}
        >
          <LogOut className="w-5 h-5" />
          <span>Check Out</span>
        </button>
      </div>
    );
  }

  return null;
}
