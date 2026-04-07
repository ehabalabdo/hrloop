"use client";

// ============================================================
// Branch Management — Full CRUD UI
// Add, edit, toggle, delete branches
// ============================================================

import { useState, useTransition, lazy, Suspense } from "react";
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
  Map,
  Clock,
  AlertTriangle,
} from "lucide-react";

// Dynamic import — Leaflet uses window/document and can't be SSR'd
const MapPicker = lazy(() => import("./MapPicker"));
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
  openTime: "",
  closeTime: "",
  shiftStartTime: "",
  shiftEndTime: "",
  minStaff: 0,
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
      openTime: branch.openTime || "",
      closeTime: branch.closeTime || "",
      shiftStartTime: branch.shiftStartTime || "",
      shiftEndTime: branch.shiftEndTime || "",
      minStaff: branch.minStaff ?? 0,
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
        minStaff: Number(form.minStaff) || 0,
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
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3.5 rounded-2xl shadow-lg text-sm font-semibold text-white ${
            toast.type === "success" ? "bg-emerald-600" : "bg-red-500"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-sm text-muted">
          <Building2 className="w-5 h-5" />
          <span className="font-medium">{branches.length} فرع</span>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setForm(emptyForm);
              setEditingId(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-5 py-3 gradient-purple text-white text-sm font-semibold rounded-xl transition-colors shadow-purple-sm"
          >
            <Plus className="w-4 h-4" />
            إضافة فرع
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card p-8 space-y-6 border-brand-primary/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-foreground">
              {editingId ? "تعديل الفرع" : "إضافة فرع جديد"}
            </h3>
            <button
              onClick={resetForm}
              className="p-2 rounded-xl hover:bg-surface-hover text-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Branch Name */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">
                اسم الفرع *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="مثال: فرع الرياض - العليا"
                className="w-full text-sm border border-border-main rounded-xl px-4 py-2.5 bg-surface text-foreground placeholder:text-muted-light focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 transition-colors"
              />
            </div>

            {/* Map Picker */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-1">
                <Map className="w-3.5 h-3.5" />
                موقع الفرع على الخريطة
              </label>
              <Suspense
                fallback={
                  <div className="w-full h-64 rounded-xl border border-border-main bg-surface-hover flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                  </div>
                }
              >
                <MapPicker
                  latitude={form.latitude}
                  longitude={form.longitude}
                  onLocationChange={(lat, lng, address) => {
                    setForm((prev) => ({
                      ...prev,
                      latitude: lat,
                      longitude: lng,
                      ...(address ? { address } : {}),
                    }));
                  }}
                />
              </Suspense>
            </div>

            {/* Address (auto-filled from map, editable) */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">
                العنوان
              </label>
              <input
                type="text"
                value={form.address || ""}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="يتم تعبئته تلقائياً عند اختيار الموقع"
                className="w-full text-sm border border-border-main rounded-xl px-4 py-2.5 bg-surface text-foreground placeholder:text-muted-light focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 transition-colors"
                dir="rtl"
              />
            </div>

            {/* Geofence Radius */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
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
                className="w-full text-sm border border-border-main rounded-xl px-4 py-2.5 bg-surface text-foreground focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 transition-colors"
              />
            </div>

            {/* Manager Dropdown */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                المدير المسؤول
              </label>
              <select
                value={form.managerId || ""}
                onChange={(e) =>
                  setForm({ ...form, managerId: e.target.value })
                }
                className="w-full text-sm border border-border-main rounded-xl px-4 py-2.5 bg-surface text-foreground focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 transition-colors"
              >
                <option value="">— بدون مدير —</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName}
                  </option>
                ))}
              </select>
            </div>

            {/* Branch Operating Hours */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                ساعات فتح وإغلاق الفرع
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-muted mb-0.5">وقت الفتح</label>
                  <input
                    type="time"
                    value={form.openTime || ""}
                    onChange={(e) => setForm({ ...form, openTime: e.target.value })}
                    className="w-full text-sm border border-border-main rounded-xl px-4 py-2.5 bg-surface text-foreground focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 transition-colors"
                  />
                </div>
                <span className="text-zinc-400 mt-4">—</span>
                <div className="flex-1">
                  <label className="block text-xs text-muted mb-0.5">وقت الإغلاق</label>
                  <input
                    type="time"
                    value={form.closeTime || ""}
                    onChange={(e) => setForm({ ...form, closeTime: e.target.value })}
                    className="w-full text-sm border border-border-main rounded-xl px-4 py-2.5 bg-surface text-foreground focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Employee Shift Hours */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                ساعات دوام الموظفين
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-muted mb-0.5">بداية الدوام</label>
                  <input
                    type="time"
                    value={form.shiftStartTime || ""}
                    onChange={(e) => setForm({ ...form, shiftStartTime: e.target.value })}
                    className="w-full text-sm border border-border-main rounded-xl px-4 py-2.5 bg-surface text-foreground focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 transition-colors"
                  />
                </div>
                <span className="text-zinc-400 mt-4">—</span>
                <div className="flex-1">
                  <label className="block text-xs text-muted mb-0.5">نهاية الدوام</label>
                  <input
                    type="time"
                    value={form.shiftEndTime || ""}
                    onChange={(e) => setForm({ ...form, shiftEndTime: e.target.value })}
                    className="w-full text-sm border border-border-main rounded-xl px-4 py-2.5 bg-surface text-foreground focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Min Staff */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                الحد الأدنى للموظفين
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.minStaff ?? 0}
                onChange={(e) =>
                  setForm({
                    ...form,
                    minStaff: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full text-sm border border-border-main rounded-xl px-4 py-2.5 bg-surface text-foreground focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 transition-colors"
              />
              <p className="text-xs text-muted mt-0.5">عدد الموظفين المطلوب كحد أدنى (تنبيهي فقط)</p>
            </div>
          </div>

          {/* Save / Cancel */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm text-muted hover:bg-white/40 rounded-lg transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-2 px-6 py-3 gradient-purple text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors shadow-purple-sm"
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
      <div className="space-y-4">
        {branches.length === 0 && (
          <div className="text-center py-16 text-zinc-400">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-base">لا توجد فروع - أضف فرعك الأول</p>
          </div>
        )}

        {branches.map((branch) => (
          <div
            key={branch.id}
            className={`card p-6 transition-colors ${
              branch.isActive
                ? ""
                : "border-red-300/50 opacity-60"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              {/* Branch Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-2">
                  <h3 className="text-base font-bold text-foreground truncate">
                    {branch.name}
                  </h3>
                  {!branch.isActive && (
                    <span className="text-xs px-2 py-0.5 bg-red-100/60 text-red-600 rounded-lg font-semibold">
                      معطّل
                    </span>
                  )}
                </div>

                {branch.address && (
                  <p className="text-sm text-muted mb-2.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    {branch.address}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {branch._count.users} موظف
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {branch.latitude.toFixed(4)}, {branch.longitude.toFixed(4)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Map className="w-3.5 h-3.5" />
                    {branch.geofenceRadius}م
                  </span>
                  {branch.manager && (
                    <span className="text-[#E20074] font-medium flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      {branch.manager.fullName}
                    </span>
                  )}
                  {branch.minStaff > 0 && (
                    <span className="text-amber-600 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      حد أدنى: {branch.minStaff} موظف
                    </span>
                  )}
                </div>

                {/* Hours Display */}
                {(branch.openTime || branch.shiftStartTime) && (
                  <div className="flex flex-wrap items-center gap-4 mt-2.5 text-sm">
                    {branch.openTime && branch.closeTime && (
                      <span className="flex items-center gap-1.5 text-emerald-600">
                        <Clock className="w-3.5 h-3.5" />
                        الفرع: {branch.openTime} — {branch.closeTime}
                      </span>
                    )}
                    {branch.shiftStartTime && branch.shiftEndTime && (
                      <span className="flex items-center gap-1.5 text-blue-600">
                        <Clock className="w-3.5 h-3.5" />
                        الدوام: {branch.shiftStartTime} — {branch.shiftEndTime}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggle(branch.id, branch.isActive)}
                  disabled={isPending}
                  className="p-1.5 rounded-lg hover:bg-white/40 text-muted transition-colors"
                  title={branch.isActive ? "تعطيل" : "تفعيل"}
                >
                  {branch.isActive ? (
                    <ToggleRight className="w-5 h-5 text-brand-primary" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-zinc-400" />
                  )}
                </button>

                <button
                  onClick={() => startEdit(branch)}
                  disabled={isPending}
                  className="p-1.5 rounded-lg hover:bg-white/40 text-muted transition-colors"
                  title="تعديل"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                {confirmDelete === branch.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDelete(branch.id)}
                      disabled={isPending}
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded font-medium"
                    >
                      {isPending ? "..." : "تأكيد"}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="px-2 py-1 text-xs bg-zinc-200/60 text-muted rounded font-medium"
                    >
                      إلغاء
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(branch.id)}
                    disabled={isPending}
                    className="p-1.5 rounded-lg hover:bg-red-50/60 text-zinc-400 hover:text-red-500 transition-colors"
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
