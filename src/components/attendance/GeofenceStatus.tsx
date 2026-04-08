"use client";

// ============================================================
// Geofence Status — Arabic, compact pill design
// ============================================================

import { useEffect, useState, useCallback } from "react";
import { MapPin, MapPinOff, Loader2, RefreshCw } from "lucide-react";
import { checkGeofence, getGeolocationErrorMessage } from "@/lib/geofence";
import type { GeofenceResult } from "@/lib/geofence";
import { useLang } from "@/lib/i18n";

interface GeofenceStatusProps {
  branchLatitude: number;
  branchLongitude: number;
  geofenceRadius: number;
  onStatusChange: (result: GeofenceResult | null) => void;
}

export default function GeofenceStatus({
  branchLatitude,
  branchLongitude,
  geofenceRadius,
  onStatusChange,
}: GeofenceStatusProps) {
  const [status, setStatus] = useState<"checking" | "within" | "outside" | "error">("checking");
  const [distance, setDistance] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { t } = useLang();

  const checkLocation = useCallback(async () => {
    setStatus("checking");
    setErrorMessage(null);

    try {
      const result = await checkGeofence(branchLatitude, branchLongitude, geofenceRadius);
      setDistance(result.distanceMeters);
      setStatus(result.isWithinFence ? "within" : "outside");
      onStatusChange(result);
    } catch (error: unknown) {
      setStatus("error");
      if (error && typeof error === "object" && "code" in error) {
        setErrorMessage(getGeolocationErrorMessage(error as GeolocationPositionError));
      } else {
        setErrorMessage(t.checkin.locationError);
      }
      onStatusChange(null);
    }
  }, [branchLatitude, branchLongitude, geofenceRadius, onStatusChange]);

  useEffect(() => {
    checkLocation();
    const interval = setInterval(checkLocation, 15000); // Poll every 15 seconds for continuous tracking
    return () => clearInterval(interval);
  }, [checkLocation]);

  const RefreshBtn = () => (
    <button
      onClick={checkLocation}
      className="p-1.5 rounded-full hover:bg-zinc-100 transition-colors"
      aria-label={t.checkin.refreshLocation}
    >
      <RefreshCw className="w-3.5 h-3.5" />
    </button>
  );

  return (
    <div className="w-full">
      {status === "checking" && (
        <div className="flex items-center justify-center gap-2 text-muted bg-surface-hover/40 rounded-2xl px-5 py-3.5">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">{t.checkin.detectingLocation}</span>
        </div>
      )}

      {status === "within" && (
        <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 rounded-2xl px-5 py-3.5">
          <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              {t.checkin.insideBranch}
            </span>
            {distance !== null && (
              <span className="text-xs text-emerald-600/70 dark:text-emerald-500/60 mr-1.5">
                ({distance} {t.checkin.meters})
              </span>
            )}
          </div>
          <RefreshBtn />
        </div>
      )}

      {status === "outside" && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-2xl px-5 py-3.5">
          <MapPinOff className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              {t.checkin.outsideBranch}
            </span>
            {distance !== null && (
              <span className="text-xs text-amber-600/70 dark:text-amber-500/60 mr-1.5">
                ({distance} {t.checkin.meters} {t.checkin.metersOf} {geofenceRadius})
              </span>
            )}
          </div>
          <RefreshBtn />
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-800/40 rounded-2xl px-5 py-3.5">
          <MapPinOff className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-red-700 dark:text-red-400">
              {errorMessage}
            </span>
          </div>
          <RefreshBtn />
        </div>
      )}
    </div>
  );
}
