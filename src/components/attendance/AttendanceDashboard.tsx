"use client";

// ============================================================
// Attendance Dashboard
// The main component that an employee sees daily.
// Combines geofencing, biometric auth, and attendance actions.
// ============================================================

import { useState, useCallback, useEffect } from "react";
import { Fingerprint, Wifi, WifiOff } from "lucide-react";
import LiveTimer from "./LiveTimer";
import GeofenceStatus from "./GeofenceStatus";
import ActionButtons from "./ActionButtons";
import ShiftInfo from "./ShiftInfo";
import { authenticateBiometric, registerBiometric, isWebAuthnSupported } from "@/lib/webauthn-client";
import { handleAttendance, getAttendanceState } from "@/app/attendance/actions";
import { getCurrentPosition } from "@/lib/geofence";
import type { AttendanceState, AttendanceAction } from "@/lib/types";
import type { GeofenceResult } from "@/lib/geofence";

interface AttendanceDashboardProps {
  userId: string;
  userName: string;
  hasBiometricRegistered: boolean;
  initialState: AttendanceState;
}

export default function AttendanceDashboard({
  userId,
  userName,
  hasBiometricRegistered,
  initialState,
}: AttendanceDashboardProps) {
  const [state, setState] = useState<AttendanceState>(initialState);
  const [hasBiometric, setHasBiometric] = useState(hasBiometricRegistered);
  const [isLoading, setIsLoading] = useState(false);
  const [geofenceResult, setGeofenceResult] = useState<GeofenceResult | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Refresh state periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const fresh = await getAttendanceState(userId);
        setState(fresh);
      } catch {
        // Silently fail on refresh
      }
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [userId]);

  const handleGeofenceChange = useCallback((result: GeofenceResult | null) => {
    setGeofenceResult(result);
  }, []);

  // Handle biometric registration
  const handleRegisterBiometric = async () => {
    if (!isWebAuthnSupported()) {
      setMessage({ type: "error", text: "Your browser does not support biometric authentication." });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    const result = await registerBiometric(userId);

    if (result.success) {
      setHasBiometric(true);
      setMessage({ type: "success", text: "Biometrics registered successfully! You can now check in." });
    } else {
      setMessage({ type: "error", text: result.error || "Registration failed." });
    }

    setIsLoading(false);
  };

  // Handle attendance action (check in/out, break start/end)
  const handleAction = async (action: AttendanceAction) => {
    if (!state.currentShift) {
      setMessage({ type: "error", text: "No shift assigned for today." });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      // Step 1: Biometric verification
      const bioResult = await authenticateBiometric(userId);
      if (!bioResult.success) {
        setMessage({ type: "error", text: bioResult.error || "Biometric verification failed." });
        setIsLoading(false);
        return;
      }

      // Step 2: Get fresh GPS coordinates
      let latitude = 0;
      let longitude = 0;
      let isWithinFence = false;

      try {
        const position = await getCurrentPosition();
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        isWithinFence = geofenceResult?.isWithinFence ?? false;
      } catch {
        setMessage({ type: "error", text: "Could not get your location. Please enable GPS." });
        setIsLoading(false);
        return;
      }

      // Step 3: Record attendance via server action
      const result = await handleAttendance({
        userId,
        shiftId: state.currentShift.id,
        action,
        latitude,
        longitude,
        isWithinFence,
      });

      if (result.success) {
        setMessage({ type: "success", text: result.message });
        // Refresh state
        const fresh = await getAttendanceState(userId);
        setState(fresh);
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch {
      setMessage({ type: "error", text: "An unexpected error occurred. Please try again." });
    }

    setIsLoading(false);
  };

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // Status indicator
  const getStatusLabel = () => {
    switch (state.status) {
      case "clocked_in":
        return { text: "On Shift", color: "bg-emerald-500" };
      case "on_break":
        return { text: "On Break", color: "bg-amber-500" };
      default:
        return { text: "Off Duty", color: "bg-zinc-400" };
    }
  };

  const statusInfo = getStatusLabel();

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-red-600 text-white text-center py-2 px-4 text-sm flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          <span>You are offline. Attendance actions require an internet connection.</span>
        </div>
      )}

      {/* Header */}
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              {getGreeting()}
            </p>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {userName}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Online indicator */}
            <div className="flex items-center gap-1.5">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-emerald-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
            </div>
            {/* Status Badge */}
            <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-full px-3 py-1.5">
              <div className={`w-2 h-2 rounded-full ${statusInfo.color}`} />
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                {statusInfo.text}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-5 pb-8 gap-6">
        {/* Live Timer */}
        <div className="w-full flex flex-col items-center py-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl">
          <span className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium mb-2">
            Shift Duration
          </span>
          <LiveTimer
            startTime={state.clockInTime}
            isActive={state.status === "clocked_in" || state.status === "on_break"}
          />
        </div>

        {/* Shift Info */}
        {state.currentShift && (
          <ShiftInfo
            branchName={state.currentShift.branchName}
            scheduledStart={state.currentShift.scheduledStart}
            scheduledEnd={state.currentShift.scheduledEnd}
            isLate={state.isLate}
            lateMinutes={state.lateMinutes}
          />
        )}

        {/* No Shift Message */}
        {!state.currentShift && (
          <div className="w-full text-center py-8 bg-zinc-50 dark:bg-zinc-900 rounded-2xl">
            <CalendarEmpty />
            <p className="text-zinc-500 dark:text-zinc-400 font-medium mt-3">
              No shift scheduled for today
            </p>
            <p className="text-zinc-400 dark:text-zinc-500 text-sm mt-1">
              Check with your manager for schedule updates.
            </p>
          </div>
        )}

        {/* Geofence Status */}
        {state.currentShift && (
          <GeofenceStatus
            branchLatitude={state.currentShift.branchLatitude}
            branchLongitude={state.currentShift.branchLongitude}
            geofenceRadius={state.currentShift.geofenceRadius}
            onStatusChange={handleGeofenceChange}
          />
        )}

        {/* Message Banner */}
        {message && (
          <div
            className={`w-full rounded-xl px-4 py-3 text-sm font-medium ${
              message.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Action Buttons */}
        {state.currentShift && (
          <div className="w-full flex flex-col items-center mt-2">
            <ActionButtons
              status={state.status}
              isWithinFence={geofenceResult?.isWithinFence ?? false}
              isLoading={isLoading || !isOnline}
              hasBiometric={hasBiometric}
              onAction={handleAction}
              onRegisterBiometric={handleRegisterBiometric}
            />
          </div>
        )}

        {/* Biometric Status Footer */}
        <div className="w-full mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
            <Fingerprint className="w-3.5 h-3.5" />
            <span>
              {hasBiometric
                ? "Biometrics registered — Device verified"
                : "Biometrics not registered"}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}

// Simple empty calendar icon for "no shift" state
function CalendarEmpty() {
  return (
    <svg
      className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
      />
    </svg>
  );
}
