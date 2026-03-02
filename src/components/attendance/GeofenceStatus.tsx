"use client";

// ============================================================
// Geofence Status Component
// Shows real-time location status relative to the branch.
// ============================================================

import { useEffect, useState, useCallback } from "react";
import { MapPin, MapPinOff, Loader2 } from "lucide-react";
import { checkGeofence, getGeolocationErrorMessage } from "@/lib/geofence";
import type { GeofenceResult } from "@/lib/geofence";

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
        setErrorMessage("Could not determine your location.");
      }
      onStatusChange(null);
    }
  }, [branchLatitude, branchLongitude, geofenceRadius, onStatusChange]);

  useEffect(() => {
    checkLocation();

    // Recheck every 30 seconds
    const interval = setInterval(checkLocation, 30000);
    return () => clearInterval(interval);
  }, [checkLocation]);

  return (
    <div className="w-full">
      {status === "checking" && (
        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-xl px-4 py-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Checking your location...</span>
        </div>
      )}

      {status === "within" && (
        <div className="flex items-center gap-2 text-brand-magenta dark:text-brand-magenta bg-brand-magenta/5 dark:bg-brand-magenta/10 rounded-xl px-4 py-3 border border-brand-magenta/15 dark:border-brand-magenta/20">
          <MapPin className="w-5 h-5" />
          <div className="flex-1">
            <span className="text-sm font-medium">You are at the branch</span>
            {distance !== null && (
              <span className="text-xs ml-1 opacity-70">({distance}m away)</span>
            )}
          </div>
          <button
            onClick={checkLocation}
            className="text-xs underline opacity-60 hover:opacity-100 transition-opacity"
          >
            Refresh
          </button>
        </div>
      )}

      {status === "outside" && (
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-xl px-4 py-3 border border-amber-200 dark:border-amber-800">
          <MapPinOff className="w-5 h-5" />
          <div className="flex-1">
            <span className="text-sm font-medium">You are not at the branch location</span>
            {distance !== null && (
              <span className="text-xs ml-1 opacity-70">({distance}m away, max {geofenceRadius}m)</span>
            )}
          </div>
          <button
            onClick={checkLocation}
            className="text-xs underline opacity-60 hover:opacity-100 transition-opacity"
          >
            Retry
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center gap-2 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-xl px-4 py-3 border border-red-200 dark:border-red-800">
          <MapPinOff className="w-5 h-5" />
          <div className="flex-1">
            <span className="text-sm font-medium">{errorMessage}</span>
          </div>
          <button
            onClick={checkLocation}
            className="text-xs underline opacity-60 hover:opacity-100 transition-opacity"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
