"use client";

// ============================================================
// Service Worker Registration + Offline Sync Hook
// Registers the SW and auto-replays queued attendance actions.
// ============================================================

import { useEffect, useState, useCallback, useRef } from "react";
import {
  getPendingActions,
  removeAction,
  pendingCount,
  type OfflinePayload,
} from "@/lib/offline-sync";

/**
 * Register the Service Worker for offline PWA support.
 */
export function useServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.warn("[SW] Registration failed:", err));
    }
  }, []);
}

/**
 * Hook that monitors online/offline state and provides
 * automatic retry of queued offline attendance actions.
 */
export function useOfflineSync(
  onSync?: (
    payload: OfflinePayload
  ) => Promise<{ success: boolean; message: string }>
) {
  const [isOnline, setIsOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  // Track online status
  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Refresh pending count
  const refreshPending = useCallback(async () => {
    if (typeof window === "undefined") return;
    try {
      const count = await pendingCount();
      setPending(count);
    } catch {
      // IndexedDB not available
    }
  }, []);

  // Sync all pending actions
  const syncPending = useCallback(async () => {
    if (!onSync || syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setSyncing(true);

    try {
      const actions = await getPendingActions();
      for (const action of actions) {
        try {
          const result = await onSync(action);
          if (result.success && action.id) {
            await removeAction(action.id);
          }
        } catch {
          // Skip failed items, will retry next time
        }
      }
    } finally {
      syncingRef.current = false;
      setSyncing(false);
      await refreshPending();
    }
  }, [onSync, refreshPending]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pending > 0) {
      syncPending();
    }
  }, [isOnline, pending, syncPending]);

  // Initial pending count
  useEffect(() => {
    refreshPending();
  }, [refreshPending]);

  return { isOnline, pending, syncing, refreshPending, syncPending };
}
