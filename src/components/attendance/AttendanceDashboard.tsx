"use client";

// ============================================================
// Attendance Dashboard (Enhanced with Task 6 Resilience)
// Offline sync, manual override with camera, toast feedback
// ============================================================

import { useState, useCallback, useEffect, useRef } from "react";
import { Fingerprint, Wifi, WifiOff, Camera, Upload, Loader2, Store, Clock } from "lucide-react";
import LiveTimer from "./LiveTimer";
import GeofenceStatus from "./GeofenceStatus";
import ActionButtons from "./ActionButtons";
import ShiftInfo from "./ShiftInfo";
import CheckoutChecklist from "./CheckoutChecklist";
import { authenticateBiometric, registerBiometric, isWebAuthnSupported } from "@/lib/webauthn-client";
import { handleAttendance, getAttendanceState, getCheckoutChecklist, sendShiftReminder } from "@/app/(app)/attendance/actions";
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
  branchOpenTime?: string | null;
  branchCloseTime?: string | null;
}

export default function AttendanceDashboard({
  userId,
  userName,
  hasBiometricRegistered,
  initialState,
  branchOpenTime,
  branchCloseTime,
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

  // Checkout checklist state
  const [checklistData, setChecklistData] = useState<{
    inventoryCount: boolean;
    newMerchandise: boolean | null;
    insurancePhones: boolean;
    completedAt: string | null;
  } | null>(null);
  const [checklistLoaded, setChecklistLoaded] = useState(false);
  const [checklistComplete, setChecklistComplete] = useState(false);

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

  // Load checklist when clocked in
  useEffect(() => {
    if (state.status !== "not_clocked_in" && state.currentShift && !checklistLoaded) {
      getCheckoutChecklist(state.currentShift.id, userId).then((data) => {
        if (data) {
          setChecklistData({
            inventoryCount: data.inventoryCount,
            newMerchandise: data.newMerchandise,
            insurancePhones: data.insurancePhones,
            completedAt: data.completedAt?.toISOString() ?? null,
          });
          setChecklistComplete(!!data.completedAt);
        }
        setChecklistLoaded(true);
      });
    }
  }, [state.status, state.currentShift, userId, checklistLoaded]);

  // Send shift reminder on page load
  useEffect(() => {
    if (state.currentShift) {
      sendShiftReminder(userId).catch(() => {});
    }
  }, [userId, state.currentShift]);

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
      } else if (result.error === "CHECKLIST_INCOMPLETE" || result.message === "CHECKLIST_INCOMPLETE") {
        addToast("يجب إكمال لائحة المهام قبل تسجيل الانصراف", "error");
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

  // Arabic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "صباح الخير";
    if (hour < 17) return "مساء الخير";
    return "مساء النور";
  };

  // Status indicator
  const getStatusLabel = () => {
    switch (state.status) {
      case "clocked_in":
        return { text: "في الوردية", color: "bg-brand-primary", glow: "shadow-brand-magenta/40" };
      case "on_break":
        return { text: "في استراحة", color: "bg-brand-orange", glow: "shadow-brand-orange/40" };
      default:
        return { text: "لم يبدأ", color: "bg-zinc-400", glow: "" };
    }
  };

  const statusInfo = getStatusLabel();

  return (
    <div className="min-h-screen bg-background flex flex-col pb-24">
      {/* ─── Connectivity Banners ─── */}
      {!isOnline && (
        <div className="bg-red-600 text-white text-center py-2.5 px-4 text-sm flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          <span>أنت غير متصل بالإنترنت — سيتم حفظ العمليات ومزامنتها لاحقاً</span>
        </div>
      )}
      {syncing && (
        <div className="bg-amber-500 text-white text-center py-2.5 px-4 text-sm flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>جاري مزامنة العمليات المعلّقة...</span>
        </div>
      )}
      {!syncing && pendingOffline > 0 && isOnline && (
        <div className="bg-brand-purple text-white text-center py-2.5 px-4 text-sm flex items-center justify-center gap-2">
          <Upload className="w-4 h-4" />
          <span>{pendingOffline} عملية معلّقة بانتظار المزامنة</span>
        </div>
      )}

      {/* ─── Hero Section: Timer + Greeting ─── */}
      <div className="relative bg-gradient-to-br from-brand-purple-dark via-brand-purple to-brand-purple-light overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full" />

        <div className="relative z-10 px-6 pt-8 pb-10">
          {/* Top row: greeting + status */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-sm text-white/60 font-medium">{getGreeting()}</p>
              <h1 className="text-2xl font-bold text-white mt-0.5">{userName}</h1>
            </div>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-white/40" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-300" />
              )}
              <div className={`flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5`}>
                <div className={`w-2 h-2 rounded-full ${statusInfo.color} shadow-sm ${statusInfo.glow}`} />
                <span className="text-xs font-medium text-white/90">{statusInfo.text}</span>
              </div>
            </div>
          </div>

          {/* Big Timer */}
          <LiveTimer
            startTime={state.clockInTime}
            isActive={state.status === "clocked_in" || state.status === "on_break"}
          />
        </div>

        {/* Curved bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-background rounded-t-[2rem]" />
      </div>

      {/* ─── Main Content ─── */}
      <main className="flex-1 flex flex-col px-5 gap-5 -mt-1">
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

        {/* Branch Operating Hours */}
        {state.currentShift && (branchOpenTime || state.currentShift.branchOpenTime) && (
          <div className="w-full bg-surface/60 rounded-3xl border border-border-main shadow-sm px-5 py-4">
            <div className="flex items-center gap-2.5 mb-2">
              <Store className="w-5 h-5 text-brand-purple/60" />
              <span className="text-sm font-bold text-foreground">ساعات دوام الفرع</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted" dir="ltr">
              <Clock className="w-4 h-4 text-brand-purple/50" />
              <span>
                {branchOpenTime || state.currentShift.branchOpenTime} – {branchCloseTime || state.currentShift.branchCloseTime}
              </span>
            </div>
          </div>
        )}

        {/* No Shift Message */}
        {!state.currentShift && (
          <div className="w-full text-center py-12 bg-surface/60 rounded-3xl border border-border-main shadow-sm">
            <CalendarEmpty />
            <p className="text-muted font-semibold text-base mt-4">
              لا توجد وردية مجدولة اليوم
            </p>
            <p className="text-muted-light text-sm mt-1.5">
              تواصل مع مديرك لمعرفة جدول العمل
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
            className={`w-full rounded-2xl px-5 py-3.5 text-sm font-medium ${
              message.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40"
                : "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200/60 dark:border-red-800/40"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* ─── Checkout Checklist (when clocked in) ─── */}
        {state.currentShift && state.status !== "not_clocked_in" && checklistLoaded && (
          <CheckoutChecklist
            shiftId={state.currentShift.id}
            userId={userId}
            initialData={checklistData}
            onComplete={() => setChecklistComplete(true)}
          />
        )}

        {/* ─── Action Buttons (the hero CTA) ─── */}
        {state.currentShift && (
          <div className="w-full bg-surface/60 rounded-3xl border border-border-main shadow-sm px-6 py-8">
            <ActionButtons
              status={state.status}
              isWithinFence={geofenceResult?.isWithinFence ?? false}
              isLoading={isLoading}
              hasBiometric={hasBiometric}
              onAction={handleAction}
              onRegisterBiometric={handleRegisterBiometric}
              checklistComplete={checklistComplete}
            />
          </div>
        )}

        {/* Biometric Status Footer */}
        <div className="w-full py-4 mt-2">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-light">
            <Fingerprint className="w-3.5 h-3.5" />
            <span>
              {hasBiometric
                ? "البصمة مسجّلة — الجهاز مُعتمد"
                : "البصمة غير مسجّلة"}
            </span>
          </div>
        </div>
      </main>

      {/* ─── Manual Override Modal (Arabic, bottom sheet on mobile) ─── */}
      {showOverrideForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <div className="bg-surface rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-border-main">
              <div className="w-10 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" />
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2.5">
                <Camera className="w-5 h-5 text-brand-purple" />
                طلب تجاوز يدوي
              </h2>
              <p className="text-sm text-muted mt-1.5 leading-relaxed">
                أنت خارج نطاق الفرع. التقط صورة حية لتأكيد موقعك.
              </p>
            </div>

            <div className="p-6 space-y-5">
              {/* Camera Preview / Captured Photo */}
              <div className="relative w-full aspect-[4/3] bg-surface-hover rounded-2xl overflow-hidden">
                {overridePhoto ? (
                  <img
                    src={overridePhoto}
                    alt="صورة ملتقطة"
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
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-light">
                        <Camera className="w-10 h-10 mb-2" />
                        <span className="text-sm">الكاميرا غير مفعّلة</span>
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
                        className="flex-1 bg-brand-purple text-white rounded-2xl py-3.5 text-sm font-bold hover:bg-brand-primary-dark transition flex items-center justify-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        تشغيل الكاميرا
                      </button>
                    ) : (
                      <button
                        onClick={capturePhoto}
                        className="flex-1 bg-brand-primary text-white rounded-2xl py-3.5 text-sm font-bold hover:bg-brand-primary/90 transition flex items-center justify-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        التقاط صورة
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setOverridePhoto(null);
                      startCamera();
                    }}
                    className="flex-1 bg-surface-hover text-zinc-700 dark:text-zinc-200 rounded-2xl py-3.5 text-sm font-bold hover:bg-surface-hover transition"
                  >
                    إعادة التصوير
                  </button>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  سبب التجاوز
                </label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  rows={3}
                  placeholder="مثال: انحراف GPS، مدخل المبنى خارج النطاق..."
                  className="w-full rounded-2xl border border-border-main bg-surface-hover px-4 py-3 text-sm text-foreground placeholder:text-zinc-400 focus:ring-2 focus:ring-brand-purple focus:border-transparent outline-none resize-none"
                />
              </div>

              {/* Submit / Cancel */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={cancelOverride}
                  className="flex-1 bg-surface-hover text-zinc-700 dark:text-zinc-300 rounded-2xl py-3.5 text-sm font-bold hover:bg-surface-hover transition"
                >
                  إلغاء
                </button>
                <button
                  onClick={submitOverride}
                  disabled={!overridePhoto || !overrideReason.trim() || isLoading}
                  className="flex-1 bg-brand-purple text-white rounded-2xl py-3.5 text-sm font-bold hover:bg-brand-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  إرسال الطلب
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Toast Notifications (positioned above bottom nav) ─── */}
      <div className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-5 py-3.5 rounded-2xl text-sm font-semibold shadow-xl animate-in slide-in-from-bottom-3 fade-in duration-300 ${
              toast.type === "success"
                ? "bg-emerald-600 text-white"
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
      className="w-14 h-14 mx-auto text-zinc-200 dark:text-zinc-700"
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
