"use client";

// ============================================================
// Batch Action Buttons
// Generate Draft, Publish Schedule, Clear Week
// ============================================================

import { useState } from "react";
import {
  Wand2,
  Send,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface BatchActionsProps {
  weekStart: string;
  hasDrafts: boolean;
  hasPublished: boolean;
  totalShifts: number;
  onGenerate: () => Promise<{ success: boolean; message: string }>;
  onPublish: () => Promise<{ success: boolean; message: string }>;
  onClear: () => Promise<{ success: boolean; message: string }>;
}

export default function BatchActions({
  weekStart,
  hasDrafts,
  hasPublished,
  totalShifts,
  onGenerate,
  onPublish,
  onClear,
}: BatchActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleAction = async (
    action: string,
    fn: () => Promise<{ success: boolean; message: string }>
  ) => {
    setLoading(action);
    try {
      const result = await fn();
      showToast(result.success ? "success" : "error", result.message);
    } catch {
      showToast("error", "An unexpected error occurred.");
    }
    setLoading(null);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Generate Draft */}
        <button
          onClick={() => handleAction("generate", onGenerate)}
          disabled={loading !== null}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl shadow-lg shadow-purple-600/25 hover:shadow-purple-600/40 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
        >
          {loading === "generate" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Wand2 className="w-4 h-4" />
          )}
          Generate Draft
        </button>

        {/* Publish Schedule */}
        <button
          onClick={() => handleAction("publish", onPublish)}
          disabled={loading !== null || !hasDrafts}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-brand-magenta hover:bg-brand-magenta/90 text-white rounded-xl shadow-lg shadow-brand-magenta/25 hover:shadow-brand-magenta/40 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
        >
          {loading === "publish" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Publish Schedule
        </button>

        {/* Clear Week */}
        <button
          onClick={() => {
            if (
              window.confirm(
                "Are you sure you want to delete all DRAFT shifts for this week? This cannot be undone."
              )
            ) {
              handleAction("clear", onClear);
            }
          }}
          disabled={loading !== null || !hasDrafts}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/30 text-zinc-700 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 border border-zinc-200 dark:border-zinc-700 hover:border-red-300 dark:hover:border-red-800 rounded-xl disabled:opacity-50 transition-all active:scale-95"
        >
          {loading === "clear" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          Clear Drafts
        </button>
      </div>

      {/* Toast notification */}
      {toast && (
        <div
          className={`absolute top-full mt-3 left-0 right-0 sm:left-auto sm:right-0 sm:w-96 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border ${
            toast.type === "success"
              ? "bg-brand-magenta/5 dark:bg-brand-magenta/10 border-brand-magenta/15 dark:border-brand-magenta/20 text-brand-magenta dark:text-brand-magenta/70"
              : "bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-auto p-0.5 hover:opacity-70"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
