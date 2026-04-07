"use client";

// ============================================================
// Device Management Panel
// Admin can view employee biometric status and reset credentials
// ============================================================

import { useState, useTransition } from "react";
import { Fingerprint, RotateCcw, Loader2, Search, ShieldCheck, ShieldOff } from "lucide-react";
import {
  getEmployeeBiometricStatus,
  resetUserBiometrics,
} from "@/app/(app)/attendance/resilience-actions";

interface Employee {
  id: string;
  fullName: string;
  role: string;
  branchName: string;
  hasCredential: boolean;
  signCount: number;
}

interface DeviceManagementProps {
  employees: Employee[];
  actorId: string;
  actorName: string;
}

export default function DeviceManagement({
  employees: initialEmployees,
  actorId,
  actorName,
}: DeviceManagementProps) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [search, setSearch] = useState("");
  const [resetting, setResetting] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleReset = (employee: Employee) => {
    if (
      !confirm(
        `Are you sure you want to reset biometric credentials for ${employee.fullName}? They will need to re-register their device.`
      )
    )
      return;

    setResetting(employee.id);
    startTransition(async () => {
      const result = await resetUserBiometrics({
        targetUserId: employee.id,
        actorId,
        actorName,
        reason: "Admin-initiated device reset",
      });

      if (result.success) {
        // Refresh the list
        const updated = await getEmployeeBiometricStatus();
        setEmployees(updated);
        showToast(result.message, "success");
      } else {
        showToast(result.message, "error");
      }
      setResetting(null);
    });
  };

  const filtered = employees.filter(
    (e: Employee) =>
      e.fullName.toLowerCase().includes(search.toLowerCase()) ||
      e.branchName.toLowerCase().includes(search.toLowerCase())
  );

  const registered = employees.filter((e: Employee) => e.hasCredential).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-brand-purple/5 dark:bg-brand-purple/10 border border-brand-purple/15 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-brand-purple dark:text-brand-purple">
            {employees.length}
          </div>
          <div className="text-xs text-zinc-500">Total Employees</div>
        </div>
        <div className="bg-brand-primary/5 dark:bg-brand-primary/10 border border-brand-magenta/15 dark:border-brand-magenta/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-brand-primary dark:text-brand-primary">
            {registered}
          </div>
          <div className="text-xs text-zinc-500">Registered</div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
            {employees.length - registered}
          </div>
          <div className="text-xs text-zinc-500">Not Registered</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search by name or branch..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-border-main rounded-xl bg-surface text-foreground placeholder:text-zinc-400 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Employee List */}
      <div className="bg-surface rounded-xl border border-border-main divide-y divide-border-main">
        {filtered.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-zinc-400">
            No employees found
          </div>
        )}
        {filtered.map((emp: Employee) => (
          <div
            key={emp.id}
            className="px-5 py-3.5 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  emp.hasCredential
                    ? "bg-brand-primary/10 dark:bg-brand-primary/10"
                    : "bg-surface-hover"
                }`}
              >
                {emp.hasCredential ? (
                  <ShieldCheck className="w-4 h-4 text-brand-primary dark:text-brand-primary" />
                ) : (
                  <ShieldOff className="w-4 h-4 text-zinc-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {emp.fullName}
                </p>
                <p className="text-xs text-zinc-400 truncate">
                  {emp.branchName} &middot;{" "}
                  <span className="uppercase">{emp.role}</span>
                  {emp.hasCredential && (
                    <span className="ml-1 text-brand-primary">
                      &middot; Sign count: {emp.signCount}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {emp.hasCredential && (
              <button
                onClick={() => handleReset(emp)}
                disabled={(isPending && resetting === emp.id) || resetting !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 transition-colors"
              >
                {isPending && resetting === emp.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RotateCcw className="w-3 h-3" />
                )}
                Reset
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
            toast.type === "success"
              ? "bg-brand-primary text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
