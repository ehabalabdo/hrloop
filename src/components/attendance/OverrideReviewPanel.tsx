"use client";

// ============================================================
// Override Review Panel
// Managers review pending manual override requests with photo evidence
// ============================================================

import { useState, useTransition } from "react";
import {
  Camera,
  CheckCircle2,
  XCircle,
  Loader2,
  MapPin,
  Clock,
  User,
} from "lucide-react";
import {
  getPendingOverrides,
  reviewManualOverride,
} from "@/app/(app)/attendance/resilience-actions";

interface OverrideRequest {
  id: string;
  userId: string;
  userName: string;
  branchName: string;
  action: string;
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  photoUrl: string | null;
  reason: string | null;
}

interface OverrideReviewPanelProps {
  overrides: OverrideRequest[];
  reviewerId: string;
  reviewerName: string;
}

export default function OverrideReviewPanel({
  overrides: initialOverrides,
  reviewerId,
  reviewerName,
}: OverrideReviewPanelProps) {
  const [overrides, setOverrides] = useState<OverrideRequest[]>(initialOverrides);
  const [processing, setProcessing] = useState<string | null>(null);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleReview = (id: string, action: "APPROVED" | "REJECTED") => {
    setProcessing(id);
    startTransition(async () => {
      const result = await reviewManualOverride({
        attendanceLogId: id,
        reviewerId,
        reviewerName,
        action,
      });

      if (result.success) {
        // Refresh list
        const updated = await getPendingOverrides(reviewerId);
        setOverrides(updated);
        showToast(result.message, "success");
      } else {
        showToast(result.message, "error");
      }
      setProcessing(null);
    });
  };

  if (overrides.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          No pending override requests
        </p>
        <p className="text-xs text-zinc-400 mt-1">
          All override requests have been reviewed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {overrides.length} pending override{overrides.length > 1 ? "s" : ""} to review
      </div>

      {overrides.map((ov: OverrideRequest) => (
        <div
          key={ov.id}
          className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
        >
          {/* Header */}
          <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {ov.userName}
              </span>
              <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium uppercase">
                {ov.action.replace("_", " ")}
              </span>
            </div>
            <span className="text-xs text-zinc-400">
              {ov.branchName}
            </span>
          </div>

          {/* Details */}
          <div className="px-5 py-3 grid grid-cols-2 gap-3">
            {/* Photo Evidence */}
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-1.5 flex items-center gap-1">
                <Camera className="w-3 h-3" />
                Photo Evidence
              </p>
              {ov.photoUrl ? (
                <button
                  onClick={() =>
                    setExpandedPhoto(
                      expandedPhoto === ov.id ? null : ov.id
                    )
                  }
                  className="w-full"
                >
                  <img
                    src={ov.photoUrl}
                    alt="Override evidence"
                    className={`rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:opacity-80 transition ${
                      expandedPhoto === ov.id
                        ? "max-h-96"
                        : "h-32 object-cover w-full"
                    }`}
                  />
                </button>
              ) : (
                <div className="h-32 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center text-xs text-zinc-400">
                  No photo
                </div>
              )}
            </div>

            {/* Info */}
            <div className="space-y-2">
              <div>
                <p className="text-xs font-medium text-zinc-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Time
                </p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  {new Date(ov.timestamp).toLocaleString()}
                </p>
              </div>
              {ov.latitude && ov.longitude && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Location
                  </p>
                  <p className="text-xs text-zinc-500 font-mono">
                    {ov.latitude.toFixed(5)}, {ov.longitude.toFixed(5)}
                  </p>
                </div>
              )}
              {ov.reason && (
                <div>
                  <p className="text-xs font-medium text-zinc-500">Reason</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    {ov.reason}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 flex gap-3">
            <button
              onClick={() => handleReview(ov.id, "APPROVED")}
              disabled={isPending && processing === ov.id}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors"
            >
              {isPending && processing === ov.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              Approve
            </button>
            <button
              onClick={() => handleReview(ov.id, "REJECTED")}
              disabled={isPending && processing === ov.id}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              {isPending && processing === ov.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              Reject
            </button>
          </div>
        </div>
      ))}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
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
