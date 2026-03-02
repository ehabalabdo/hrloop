"use client";

// ============================================================
// Attendance Dashboard (Enhanced with Task 6 Resilience)
// Offline sync, manual override with camera, toast feedback
// ============================================================

import { useState, useCallback, useEffect, useRef } from "react";
import { Fingerprint, Wifi, WifiOff, Camera, Upload, Loader2 } from "lucide-react";
import LiveTimer from "./LiveTimer";
import GeofenceStatus from "./GeofenceStatus";
import ActionButtons from "./ActionButtons";
import ShiftInfo from "./ShiftInfo";
import { authenticateBiometric, registerBiometric, isWebAuthnSupported } from "@/lib/webauthn-client";
import { handleAttendance, getAttendanceState } from "@/app/(app)/attendance/actions";
import { requestManualOverride, syncOfflineAttendance } from "@/app/(app)/attendance/resilience-actions";
import { getCurrentPosition } from "@/lib/geofence";
import { queueOfflineAction } from "@/lib/offline-sync";
import { useServiceWorker, useOfflineSync } from "@/hooks/useOfflineSync";
import type { AttendanceState, AttendanceAction } from "@/lib/types";
import type { GeofenceResult } from "@/lib/geofence";
import type { OfflinePayload } from "@/lib/offline-sync";

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

  // Manual override state
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [overridePhoto, setOverridePhoto] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<AttendanceAction | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Toast state
  const [toasts, setToasts] = useState<
    { id: number; text: string; type: "success" | "error" | "info" }[]
  >([]);
  const toastIdRef = useRef(0);

  // Register Service Worker
  useServiceWorker();

  // Offline sync
  const handleOfflineSync = useCallback(
    async (payload: OfflinePayload) => {
      return syncOfflineAttendance({
        userId: payload.userId,
        shiftId: payload.shiftId,
        action: payload.action,
        latitude: payload.latitude,
        longitude: payload.longitude,
        isWithinFence: payload.isWithinFence,
        originalTimestamp: payload.timestamp,
      });
    },
    []
  );

  const { isOnline, pending: pendingOffline, syncing } = useOfflineSync(handleOfflineSync);

  const addToast = useCallback(
    (text: string, type: "success" | "error" | "info") => {
      const id = ++toastIdRef.current;
      setToasts((prev) => [...prev, { id, text, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

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
      addToast("No shift assigned for today.", "error");
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      // Step 1: Biometric verification
      const bioResult = await authenticateBiometric(userId);
      if (!bioResult.success) {
        addToast(bioResult.error || "Biometric verification failed.", "error");
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
        addToast("Could not get your location. Please enable GPS.", "error");
        setIsLoading(false);
        return;
      }

      // Step 2.5: If outside geofence, offer Manual Override
      if (!isWithinFence) {
        setPendingAction(action);
        setShowOverrideForm(true);
        setIsLoading(false);
        return;
      }

      // Step 3: If offline, queue for later sync
      if (!navigator.onLine) {
        await queueOfflineAction({
          userId,
          shiftId: state.currentShift.id,
          action,
          latitude,
          longitude,
          isWithinFence,
          timestamp: new Date().toISOString(),
        });
        addToast("You're offline. Action queued and will sync automatically.", "info");
        setIsLoading(false);
        return;
      }

      // Step 4: Record attendance via server action
      const result = await handleAttendance({
        userId,
        shiftId: state.currentShift.id,
        action,
        latitude,
        longitude,
        isWithinFence,
      });

      if (result.success) {
        addToast(result.message, "success");
        const fresh = await getAttendanceState(userId);
        setState(fresh);
      } else {
        addToast(result.message, "error");
      }
    } catch {
      addToast("An unexpected error occurred. Please try again.", "error");
    }

    setIsLoading(false);
  };

  // Camera for manual override
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      addToast("Camera access denied. Please enable camera permissions.", "error");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      setOverridePhoto(canvas.toDataURL("image/jpeg", 0.7));
    }
    // Stop camera
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const submitOverride = async () => {
    if (!overridePhoto || !overrideReason.trim() || !pendingAction || !state.currentShift) {
      addToast("Please capture a photo and provide a reason.", "error");
      return;
    }

    setIsLoading(true);
    try {
      let latitude = 0;
      let longitude = 0;
      try {
        const position = await getCurrentPosition();
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch {
        // Continue with 0,0 — the override request is what matters
      }

      const result = await requestManualOverride({
        userId,
        shiftId: state.currentShift.id,
        action: pendingAction,
        latitude,
        longitude,
        photoDataUrl: overridePhoto,
        reason: overrideReason,
      });

      addToast(result.message, result.success ? "success" : "error");
      if (result.success) {
        setShowOverrideForm(false);
        setOverridePhoto(null);
        setOverrideReason("");
        setPendingAction(null);
      }
    } catch {
      addToast("Failed to submit override request.", "error");
    }
    setIsLoading(false);
  };

  const cancelOverride = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setShowOverrideForm(false);
    setOverridePhoto(null);
    setOverrideReason("");
    setPendingAction(null);
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
        return { text: "في الوردية", color: "bg-brand-magenta" };
      case "on_break":
        return { text: "في استراحة", color: "bg-brand-orange" };
      default:
        return { text: "غير متصل", color: "bg-zinc-400" };
    }
  };

  const statusInfo = getStatusLabel();

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0a19] flex flex-col">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-red-600 text-white text-center py-2 px-4 text-sm flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          <span>You are offline. Actions will be queued and synced later.</span>
        </div>
      )}

      {/* Syncing / Pending Banner */}
      {syncing && (
        <div className="bg-amber-500 text-white text-center py-2 px-4 text-sm flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Syncing offline actions...</span>
        </div>
      )}
      {!syncing && pendingOffline > 0 && isOnline && (
        <div className="bg-brand-purple text-white text-center py-2 px-4 text-sm flex items-center justify-center gap-2">
          <Upload className="w-4 h-4" />
          <span>{pendingOffline} pending action{pendingOffline > 1 ? "s" : ""} to sync</span>
        </div>
      )}

      {/* Header */}
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-brand-purple-light">
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
                <Wifi className="w-4 h-4 text-brand-magenta" />
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
        <div className="w-full flex flex-col items-center py-8 bg-gradient-to-b from-brand-purple/5 to-transparent dark:from-brand-purple/10 rounded-3xl border border-brand-purple/10">
          <span className="text-xs text-brand-purple uppercase tracking-wider font-semibold mb-2">
            مدة الوردية
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
                ? "bg-brand-magenta/5 dark:bg-brand-magenta/10 text-brand-magenta dark:text-brand-magenta border border-brand-magenta/15 dark:border-brand-magenta/20"
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
              isLoading={isLoading}
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

      {/* Manual Override Form Modal */}
      {showOverrideForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Camera className="w-5 h-5 text-brand-purple" />
                طلب تجاوز يدوي
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                You appear to be outside the geofence. Take a live photo to verify your location.
              </p>
            </div>

            <div className="p-5 space-y-4">
              {/* Camera Preview / Captured Photo */}
              <div className="relative w-full aspect-[4/3] bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-hidden">
                {overridePhoto ? (
                  <img
                    src={overridePhoto}
                    alt="Captured"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {!streamRef.current && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500">
                        <Camera className="w-10 h-10 mb-2" />
                        <span className="text-sm">Camera not started</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Camera Controls */}
              <div className="flex gap-3">
                {!overridePhoto ? (
                  <>
                    {!streamRef.current ? (
                      <button
                        onClick={startCamera}
                        className="flex-1 bg-brand-purple text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-purple transition flex items-center justify-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        Start Camera
                      </button>
                    ) : (
                      <button
                        onClick={capturePhoto}
                        className="flex-1 bg-brand-magenta/50 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-magenta transition flex items-center justify-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        Capture Photo
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setOverridePhoto(null);
                      startCamera();
                    }}
                    className="flex-1 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl py-2.5 text-sm font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600 transition"
                  >
                    Retake Photo
                  </button>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Reason for override
                </label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  rows={3}
                  placeholder="E.g. GPS drift, building entrance not in range..."
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-brand-purple focus:border-transparent outline-none resize-none"
                />
              </div>

              {/* Submit / Cancel */}
              <div className="flex gap-3">
                <button
                  onClick={cancelOverride}
                  className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl py-2.5 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={submitOverride}
                  disabled={!overridePhoto || !overrideReason.trim() || isLoading}
                  className="flex-1 bg-brand-purple text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-purple disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Submit Override
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-xl text-sm font-medium shadow-lg animate-in slide-in-from-right-5 fade-in duration-300 ${
              toast.type === "success"
                ? "bg-brand-magenta text-white"
                : toast.type === "error"
                  ? "bg-red-600 text-white"
                  : "bg-brand-purple text-white"
            }`}
          >
            {toast.text}
          </div>
        ))}
      </div>
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
