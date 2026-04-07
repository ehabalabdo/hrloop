"use client";

// ============================================================
// Activity Log / Audit Trail View
// Read-only log of "who changed what"
// ============================================================

import { useState, useTransition } from "react";
import { ClipboardList, RefreshCw, Download, Loader2 } from "lucide-react";
import type { ActivityLogItem } from "@/lib/dashboard-types";
import { getActivityLogs } from "@/app/(app)/dashboard/actions";
import { downloadCSV } from "@/lib/csv-export";

interface ActivityLogViewProps {
  initialLogs: ActivityLogItem[];
}

export default function ActivityLogView({
  initialLogs,
}: ActivityLogViewProps) {
  const [logs, setLogs] = useState<ActivityLogItem[]>(initialLogs);
  const [isPending, startTransition] = useTransition();

  const refresh = () => {
    startTransition(async () => {
      const data = await getActivityLogs(200);
      setLogs(data);
    });
  };

  const handleExport = () => {
    downloadCSV(
      logs.map((l: ActivityLogItem) => ({
        Timestamp: l.createdAt,
        Actor: l.actorName,
        Action: l.action,
        Entity: l.entityType,
        Details: l.description ?? "",
      })),
      "activity-logs"
    );
  };

  const timeAgo = (isoStr: string): string => {
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const actionColor = (action: string): string => {
    if (action.includes("CREATE") || action.includes("SUBMIT"))
      return "text-brand-primary dark:text-brand-primary bg-brand-primary/5 dark:bg-brand-primary/10";
    if (action.includes("DELETE") || action.includes("REJECT") || action.includes("CANCEL"))
      return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30";
    if (action.includes("UPDATE") || action.includes("REVIEW") || action.includes("APPROVE"))
      return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30";
    return "text-muted bg-surface-hover";
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="glass-strong">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 gradient-purple rounded-xl flex items-center justify-center shadow-purple-sm">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">
                Activity Log
              </h1>
              <p className="text-xs text-muted">
                {logs.length} logged events
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-surface-hover hover:bg-surface-hover text-muted rounded-lg transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              Refresh
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-surface-hover hover:bg-surface-hover text-muted rounded-lg transition-colors"
            >
              <Download className="w-3 h-3" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="bg-surface rounded-xl border border-border-main overflow-hidden">
          {logs.length === 0 ? (
            <div className="p-12 text-center text-zinc-400">
              No activity logs yet.
            </div>
          ) : (
            <div className="divide-y divide-border-main">
              {logs.map((log: ActivityLogItem) => (
                <div
                  key={log.id}
                  className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2 hover:bg-surface-hover/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">
                        {log.actorName}
                      </span>
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold uppercase ${actionColor(log.action)}`}
                      >
                        {log.action}
                      </span>
                      <span className="text-xs text-muted">
                        {log.entityType}
                      </span>
                    </div>
                    {log.description && (
                      <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-lg">
                        {log.description}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-zinc-400 whitespace-nowrap">
                    {timeAgo(log.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
