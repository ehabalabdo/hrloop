"use client";

// ============================================================
// Branch Management — Full CRUD UI
// Add, edit, toggle, delete branches
// ============================================================

import { useState, useTransition } from "react";
import {
  Plus,
  MapPin,
  Edit2,
  Trash2,
  Users,
  Save,
  X,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Building2,
} from "lucide-react";
import type { BranchWithManager, BranchFormData } from "@/app/(app)/settings/branch-actions";
import {
  createBranch,
  updateBranch,
  toggleBranchActive,
  deleteBranch,
} from "@/app/(app)/settings/branch-actions";

interface BranchManagementProps {
  initialBranches: BranchWithManager[];
  managers: { id: string; fullName: string }[];
}

const emptyForm: BranchFormData = {
  name: "",
  address: "",
  latitude: 24.7136,
  longitude: 46.6753,
  geofenceRadius: 50,
  managerId: "",
};

export default function BranchManagement({
  initialBranches,
  managers,
}: BranchManagementProps) {
  const [branches, setBranches] = useState<BranchWithManager[]>(initialBranches);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BranchFormData>(emptyForm);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
  };

  const startEdit = (branch: BranchWithManager) => {
    setForm({
      name: branch.name,
      address: branch.address || "",
      latitude: branch.latitude,
      longitude: branch.longitude,
      geofenceRadius: branch.geofenceRadius,
      managerId: branch.managerId || "",
    });
    setEditingId(branch.id);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      showToast("اسم الفرع مطلوب", "error");
      return;
    }

    startTransition(async () => {
      const data: BranchFormData = {
        ...form,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        geofenceRadius: Number(form.geofenceRadius),
        managerId: form.managerId || undefined,
      };

      const result = editingId
        ? await updateBranch(editingId, data)
        : await createBranch(data);

      if (result.success) {
        showToast(
          editingId ? "تم تحديث الفرع بنجاح" : "تم إضافة الفرع بنجاح",
          "success"
        );
        resetForm();
        // Reload branches by re-importing getBranches
        const { getBranches } = await import(
          "@/app/(app)/settings/branch-actions"
        );
        const updated = await getBranches();
        setBranches(updated);
      } else {
        showToast(result.error || "حدث خطأ", "error");
      }
    });
  };

  const handleToggle = (id: string, currentActive: boolean) => {
    startTransition(async () => {
      const result = await toggleBranchActive(id, !currentActive);
      if (result.success) {
        setBranches((prev) =>
          prev.map((b) => (b.id === id ? { ...b, isActive: !currentActive } : b))
        );
        showToast(
          !currentActive ? "تم تفعيل الفرع" : "تم تعطيل الفرع",
          "success"
        );
      } else {
        showToast(result.error || "حدث خطأ", "error");
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteBranch(id);
      if (result.success) {
        setBranches((prev) => prev.filter((b) => b.id !== id));
        showToast("تم حذف الفرع", "success");
      } else {
        showToast(result.error || "حدث خطأ", "error");
      }
      setConfirmDelete(null);
    });
  };

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium text-white ${
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Building2 className="w-4 h-4" />
          <span>{branches.length} فرع</span>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setForm(emptyForm);
              setEditingId(null);
              setShowForm(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            إضافة فرع
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-violet-200 dark:border-violet-800 p-5 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {editingId ? "تعديل الفرع" : "إضافة فرع جديد"}
            </h3>
            <button
              onClick={resetForm}
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Branch Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                اسم الفرع *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="مثال: فرع الرياض - العليا"
                className="w-full text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
              />
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                العنوان
              </label>
              <input
                type="text"
                value={form.address || ""}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="العنوان التفصيلي للفرع"
                className="w-full text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
              />
            </div>

            {/* Latitude */}
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                خط العرض (Latitude)
              </label>
              <input
                type="number"
                step="0.0001"
                value={form.latitude}
                onChange={(e) =>
                  setForm({ ...form, latitude: parseFloat(e.target.value) || 0 })
                }
                className="w-full text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
            </div>

            {/* Longitude */}
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                خط الطول (Longitude)
              </label>
              <input
                type="number"
                step="0.0001"
                value={form.longitude}
                onChange={(e) =>
                  setForm({
                    ...form,
                    longitude: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
            </div>

            {/* Geofence Radius */}
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                نطاق السياج الجغرافي (متر)
              </label>
              <input
                type="number"
                min="10"
                max="500"
                value={form.geofenceRadius}
                onChange={(e) =>
                  setForm({
                    ...form,
                    geofenceRadius: parseInt(e.target.value) || 50,
                  })
                }
                className="w-full text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
            </div>

            {/* Manager Dropdown */}
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                المدير المسؤول
              </label>
              <select
                value={form.managerId || ""}
                onChange={(e) =>
                  setForm({ ...form, managerId: e.target.value })
                }
                className="w-full text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              >
                <option value="">— بدون مدير —</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Save / Cancel */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {editingId ? "حفظ التعديلات" : "إضافة الفرع"}
            </button>
          </div>
        </div>
      )}

      {/* Branch List */}
      <div className="space-y-3">
        {branches.length === 0 && (
          <div className="text-center py-12 text-zinc-400">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">لا توجد فروع - أضف فرعك الأول</p>
          </div>
        )}

        {branches.map((branch) => (
          <div
            key={branch.id}
            className={`bg-white dark:bg-zinc-900 rounded-xl border p-4 transition-colors ${
              branch.isActive
                ? "border-zinc-200 dark:border-zinc-800"
                : "border-red-200 dark:border-red-900/50 opacity-60"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              {/* Branch Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {branch.name}
                  </h3>
                  {!branch.isActive && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full font-medium">
                      معطّل
                    </span>
                  )}
                </div>

                {branch.address && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {branch.address}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {branch._count.users} موظف
                  </span>
                  <span>
                    📍 {branch.latitude.toFixed(4)}, {branch.longitude.toFixed(4)}
                  </span>
                  <span>🔲 {branch.geofenceRadius}م</span>
                  {branch.manager && (
                    <span className="text-violet-600 dark:text-violet-400 font-medium">
                      👤 {branch.manager.fullName}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggle(branch.id, branch.isActive)}
                  disabled={isPending}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"
                  title={branch.isActive ? "تعطيل" : "تفعيل"}
                >
                  {branch.isActive ? (
                    <ToggleRight className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-zinc-400" />
                  )}
                </button>

                <button
                  onClick={() => startEdit(branch)}
                  disabled={isPending}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"
                  title="تعديل"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                {confirmDelete === branch.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDelete(branch.id)}
                      disabled={isPending}
                      className="px-2 py-1 text-[10px] bg-red-600 text-white rounded font-medium"
                    >
                      {isPending ? "..." : "تأكيد"}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="px-2 py-1 text-[10px] bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded font-medium"
                    >
                      إلغاء
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(branch.id)}
                    disabled={isPending}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-zinc-400 hover:text-red-500 transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
