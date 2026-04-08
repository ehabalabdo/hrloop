"use client";

// ============================================================
// Schedule Sidebar
// Filters: Branch City, Manager Name, Understaffed Only
// Branch Requirements Editor
// ============================================================

import { useState } from "react";
import {
  Search,
  Filter,
  Building2,
  UserCog,
  AlertTriangle,
  Settings2,
  ChevronDown,
  ChevronRight,
  Save,
  X,
} from "lucide-react";
import type { ScheduleFilter } from "@/lib/schedule-types";
import { DAY_NAMES_SHORT_AR } from "@/lib/schedule-types";
import { useLang } from "@/lib/i18n";

interface SidebarProps {
  filters: ScheduleFilter;
  onFiltersChange: (filters: ScheduleFilter) => void;
  branches: {
    id: string;
    name: string;
    address: string | null;
    managerName: string | null;
    requirements: { dayOfWeek: number; requiredStaff: number }[];
  }[];
  onUpdateRequirements: (
    branchId: string,
    requirements: { dayOfWeek: number; requiredStaff: number }[]
  ) => Promise<void>;
  isOpen: boolean;
  onToggle: () => void;
}

export default function ScheduleSidebar({
  filters,
  onFiltersChange,
  branches,
  onUpdateRequirements,
  isOpen,
  onToggle,
}: SidebarProps) {
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [editReqs, setEditReqs] = useState<
    { dayOfWeek: number; requiredStaff: number }[]
  >([]);
  const [saving, setSaving] = useState(false);
  const { t } = useLang();

  // Extract unique cities from branch addresses
  const cities = Array.from(
    new Set(
      branches
        .map((b) => {
          if (!b.address) return null;
          // Try to extract city from address (last part after comma, or full address)
          const parts = b.address.split(",").map((p) => p.trim());
          return parts[parts.length - 1] || null;
        })
        .filter(Boolean)
    )
  ) as string[];

  // Extract unique manager names
  const managers = Array.from(
    new Set(branches.map((b) => b.managerName).filter(Boolean))
  ) as string[];

  const startEditing = (branchId: string) => {
    const branch = branches.find((b) => b.id === branchId);
    if (!branch) return;

    // Initialize with existing requirements, filling in 0 for missing days
    const reqs = Array.from({ length: 7 }, (_, i) => {
      const existing = branch.requirements.find((r) => r.dayOfWeek === i);
      return { dayOfWeek: i, requiredStaff: existing?.requiredStaff ?? 0 };
    });
    setEditReqs(reqs);
    setEditingBranchId(branchId);
  };

  const saveRequirements = async () => {
    if (!editingBranchId) return;
    setSaving(true);
    await onUpdateRequirements(editingBranchId, editReqs);
    setSaving(false);
    setEditingBranchId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="w-72 shrink-0 bg-surface border-r border-border-main overflow-y-auto h-full">
      <div className="p-4 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-500" />
            <span className="text-sm font-bold text-foreground">
              {t.scheduleExtra.filters}
            </span>
          </div>
          <button
            onClick={onToggle}
            className="p-1 rounded-md hover:bg-surface-hover"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        {/* Search / City Filter */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-muted mb-2">
            <Building2 className="w-3.5 h-3.5" />
            {t.scheduleExtra.city}
          </label>
          <select
            value={filters.branchCity || ""}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                branchCity: e.target.value || undefined,
              })
            }
            className="w-full px-3 py-2 text-sm rounded-lg border border-border-main bg-surface-hover text-foreground focus:outline-none focus:ring-2 focus:ring-brand-purple"
          >
            <option value="">{t.scheduleExtra.allCities}</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        {/* Manager Filter */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-muted mb-2">
            <UserCog className="w-3.5 h-3.5" />
            {t.scheduleExtra.managerFilter}
          </label>
          <select
            value={filters.managerName || ""}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                managerName: e.target.value || undefined,
              })
            }
            className="w-full px-3 py-2 text-sm rounded-lg border border-border-main bg-surface-hover text-foreground focus:outline-none focus:ring-2 focus:ring-brand-purple"
          >
            <option value="">{t.scheduleExtra.allManagers}</option>
            {managers.map((mgr) => (
              <option key={mgr} value={mgr}>
                {mgr}
              </option>
            ))}
          </select>
        </div>

        {/* Understaffed Filter */}
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={filters.showUnderstaffedOnly || false}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  showUnderstaffedOnly: e.target.checked || undefined,
                })
              }
              className="peer sr-only"
            />
            <div className="w-9 h-5 bg-zinc-200 dark:bg-zinc-700 rounded-full peer-checked:bg-orange-500 transition-colors" />
            <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm peer-checked:translate-x-4 transition-transform" />
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {t.scheduleExtra.understaffedOnly}
            </span>
          </div>
        </label>

        {/* Clear Filters */}
        {(filters.branchCity || filters.managerName || filters.showUnderstaffedOnly) && (
          <button
            onClick={() =>
              onFiltersChange({
                branchCity: undefined,
                managerName: undefined,
                showUnderstaffedOnly: undefined,
              })
            }
            className="w-full px-3 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 border border-border-main rounded-xl hover:bg-surface-hover transition-colors"
          >
            {t.scheduleExtra.clearFilters}
          </button>
        )}

        {/* Divider */}
        <div className="border-t border-border-main" />

        {/* Branch Requirements Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Settings2 className="w-4 h-4 text-zinc-500" />
            <span className="text-sm font-bold text-foreground">
              {t.scheduleExtra.staffRequirements}
            </span>
          </div>

          <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
            {branches.map((branch) => (
              <div key={branch.id}>
                <button
                  onClick={() =>
                    editingBranchId === branch.id
                      ? setEditingBranchId(null)
                      : startEditing(branch.id)
                  }
                  className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-lg hover:bg-surface-hover transition-colors group"
                >
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium truncate">
                    {branch.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-zinc-400 font-mono">
                      {branch.requirements
                        .reduce((sum, r) => sum + r.requiredStaff, 0)}
                      /wk
                    </span>
                    {editingBranchId === branch.id ? (
                      <ChevronDown className="w-3 h-3 text-zinc-400" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100" />
                    )}
                  </div>
                </button>

                {/* Edit panel */}
                {editingBranchId === branch.id && (
                  <div className="mx-2 mb-2 p-2 bg-surface-hover rounded-lg border border-border-main">
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {editReqs.map((req, i) => (
                        <div key={req.dayOfWeek} className="text-center">
                          <div className="text-[9px] font-bold text-zinc-400 mb-1">
                            {DAY_NAMES_SHORT_AR[req.dayOfWeek]}
                          </div>
                          <input
                            type="number"
                            min={0}
                            max={20}
                            value={req.requiredStaff}
                            onChange={(e) => {
                              const updated = [...editReqs];
                              updated[i] = {
                                ...updated[i],
                                requiredStaff:
                                  Math.max(0, parseInt(e.target.value) || 0),
                              };
                              setEditReqs(updated);
                            }}
                            className="w-full px-1 py-1 text-xs text-center rounded border border-zinc-300 dark:border-zinc-600 bg-surface text-foreground focus:outline-none focus:ring-1 focus:ring-brand-purple"
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={saveRequirements}
                      disabled={saving}
                      className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg disabled:opacity-50 transition-colors"
                    >
                      <Save className="w-3 h-3" />
                      {saving ? t.scheduleExtra.savingReqs : t.scheduleExtra.saveReqs}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
