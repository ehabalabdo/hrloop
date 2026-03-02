"use client";

// ============================================================
// Audit Trail Viewer
// Filterable immutable system log viewer
// ============================================================

import { useState, useTransition, useEffect } from "react";
import {
  Shield,
  Filter,
  Search,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
} from "lucide-react";
import {
  getSystemLogs,
  getSystemLogActionTypes,
  getSystemLogActors,
} from "@/lib/system-logger";

interface LogEntry {
  id: string;
  actorId: string | null;
  actorName: string | null;
  actionType: string;
  targetType: string | null;
  targetId: string | null;
  description: string | null;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  createdAt: string;
}

interface AuditTrailProps {
  initialLogs: LogEntry[];
  actionTypes: string[];
  actors: { id: string; name: string }[];
}

export default function AuditTrailViewer({
  initialLogs,
  actionTypes,
  actors,
}: AuditTrailProps) {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const [filterAction, setFilterAction] = useState<string>("");
  const [filterActor, setFilterActor] = useState<string>("");
  const [searchText, setSearchText] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const applyFilters = () => {
    startTransition(async () => {
      const result = await getSystemLogs({
        actionType: filterAction || undefined,
        actorId: filterActor || undefined,
        limit: 100,
      });
      setLogs(result as LogEntry[]);
    });
  };

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterAction, filterActor]);

  const displayed = searchText
    ? logs.filter(
        (l: LogEntry) =>
          l.description?.toLowerCase().includes(searchText.toLowerCase()) ||
          l.actionType.toLowerCase().includes(searchText.toLowerCase()) ||
          l.actorName?.toLowerCase().includes(searchText.toLowerCase())
      )
    : logs;

  const actionColors: Record<string, string> = {
    DEVICE_RESET: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    MANUAL_OVERRIDE_REQUEST: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    MANUAL_OVERRIDE_APPROVED: "bg-brand-magenta/10 dark:bg-brand-magenta/10 text-brand-magenta dark:text-brand-magenta",
    MANUAL_OVERRIDE_REJECTED: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    DISPUTE_SUBMITTED: "bg-brand-purple/10 text-brand-purple dark:text-brand-purple",
    DISPUTE_APPROVED: "bg-brand-magenta/10 dark:bg-brand-magenta/10 text-brand-magenta dark:text-brand-magenta",
    DISPUTE_REJECTED: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    OFFLINE_SYNC: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
    SETTING_UPDATE: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400",
  };

  const defaultBadge = "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400";

  return (
    <div className="space-y-4">
      {/* Filters Row */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
          />
        </div>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="text-sm border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 focus:ring-2 focus:ring-violet-500 outline-none"
        >
          <option value="">All Actions</option>
          {actionTypes.map((a: string) => (
            <option key={a} value={a}>
              {a.replace(/_/g, " ")}
            </option>
          ))}
        </select>

        <select
          value={filterActor}
          onChange={(e) => setFilterActor(e.target.value)}
          className="text-sm border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 focus:ring-2 focus:ring-violet-500 outline-none"
        >
          <option value="">All Actors</option>
          {actors.map((a: { id: string; name: string }) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <button
          onClick={applyFilters}
          disabled={isPending}
          className="p-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
          title="Refresh"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Log Count */}
      <div className="text-xs text-zinc-500">
        Showing {displayed.length} log{displayed.length !== 1 ? "s" : ""}
      </div>

      {/* Log List */}
      {displayed.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <Shield className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">No logs found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
          {displayed.map((log: LogEntry) => (
            <div key={log.id}>
              <button
                onClick={() =>
                  setExpandedId(expandedId === log.id ? null : log.id)
                }
                className="w-full px-5 py-3 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        actionColors[log.actionType] ?? defaultBadge
                      }`}
                    >
                      {log.actionType.replace(/_/g, " ")}
                    </span>
                    {log.actorName && (
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {log.actorName}
                      </span>
                    )}
                  </div>
                  {log.description && (
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-1 truncate">
                      {log.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                  {expandedId === log.id ? (
                    <ChevronUp className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  )}
                </div>
              </button>

              {/* Expanded Details */}
              {expandedId === log.id && (
                <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="font-medium text-zinc-500 mb-1">Target</p>
                      <p className="text-zinc-700 dark:text-zinc-300">
                        {log.targetType ?? "N/A"}{" "}
                        {log.targetId && (
                          <span className="font-mono text-zinc-400">
                            ({log.targetId.slice(0, 8)}...)
                          </span>
                        )}
                      </p>
                    </div>
                    {log.ipAddress && (
                      <div>
                        <p className="font-medium text-zinc-500 mb-1">
                          IP Address
                        </p>
                        <p className="text-zinc-700 dark:text-zinc-300 font-mono">
                          {log.ipAddress}
                        </p>
                      </div>
                    )}
                    {log.oldValue != null && (
                      <div>
                        <p className="font-medium text-zinc-500 mb-1">
                          Old Value
                        </p>
                        <pre className="text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-lg p-2 overflow-x-auto max-h-32">
                          {JSON.stringify(log.oldValue, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.newValue != null && (
                      <div>
                        <p className="font-medium text-zinc-500 mb-1">
                          New Value
                        </p>
                        <pre className="text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-lg p-2 overflow-x-auto max-h-32">
                          {JSON.stringify(log.newValue, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
