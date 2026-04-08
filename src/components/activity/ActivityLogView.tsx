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
import { useLang } from "@/lib/i18n";

interface ActivityLogViewProps {
  initialLogs: ActivityLogItem[];
}

export default function ActivityLogView({
  initialLogs,
}: ActivityLogViewProps) {
  const [logs, setLogs] = useState<ActivityLogItem[]>(initialLogs);
  const [isPending, startTransition] = useTransition();
  const { t, lang } = useLang();

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
    if (mins < 1) return t.activity.justNow;
    if (mins < 60) return `${mins}${t.dashboard.min}`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}${t.dashboard.hrs}`;
    const days = Math.floor(hours / 24);
    return `${days}${t.dashboard.days}`;
  };

  const actionColor = (action: string): string => {
    if (action.includes("CREATE") || action.includes("SUBMIT"))
      return "text-brand-primary bg-brand-primary/5";
    if (action.includes("DELETE") || action.includes("REJECT") || action.includes("CANCEL"))
      return "text-red-600 bg-red-50";
    if (action.includes("UPDATE") || action.includes("REVIEW") || action.includes("APPROVE"))
      return "text-amber-600 bg-amber-50";
    return "text-zinc-500 bg-zinc-50";
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 pb-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-foreground">{t.activity.title}</h1>
          <p className="text-xs text-zinc-400">
            {logs.length} {t.activity.events}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            {t.activity.refresh}
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-lg transition-colors"
          >
            <Download className="w-3 h-3" />
            {t.activity.exportCsv}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
        <div className="bg-white rounded-xl border border-zinc-200/50 overflow-hidden">
          {logs.length === 0 ? (
            <div className="p-12 text-center text-zinc-400">
              {t.dashboard.noActivity}
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {logs.map((log: ActivityLogItem) => (
                <div
                  key={log.id}
                  className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2 hover:bg-zinc-50 transition-colors"
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
