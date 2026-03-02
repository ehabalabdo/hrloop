"use client";

// ============================================================
// Employee Management — Complete CRUD UI
// Add, edit, assign to branch, toggle, delete employees
// Arabic, mobile-first, card-based design
// ============================================================

import { useState, useTransition } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Loader2,
  Users,
  Mail,
  Phone,
  Building2,
  Shield,
  Eye,
  EyeOff,
  UserPlus,
  Search,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import type {
  EmployeeWithBranch,
  EmployeeFormData,
} from "@/app/(app)/settings/employee-actions";
import {
  createEmployee,
  updateEmployee,
  toggleEmployeeActive,
  deleteEmployee,
} from "@/app/(app)/settings/employee-actions";

interface EmployeeManagementProps {
  initialEmployees: EmployeeWithBranch[];
  branches: { id: string; name: string }[];
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "مالك",
  MANAGER: "مدير",
  STAFF: "موظف",
};

const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  MANAGER:
    "bg-brand-purple/10 dark:bg-brand-purple/20 text-brand-purple",
  STAFF: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
};

const emptyForm: EmployeeFormData = {
  fullName: "",
  email: "",
  password: "",
  role: "STAFF",
  primaryBranchId: "",
  phoneNumber: "",
};

export default function EmployeeManagement({
  initialEmployees,
  branches,
}: EmployeeManagementProps) {
  const [employees, setEmployees] =
    useState<EmployeeWithBranch[]>(initialEmployees);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeFormData>(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("ALL");

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
    setShowPassword(false);
  };

  const startEdit = (emp: EmployeeWithBranch) => {
    setForm({
      fullName: emp.fullName,
      email: emp.email,
      password: "",
      role: emp.role,
      primaryBranchId: emp.primaryBranchId || "",
      phoneNumber: emp.phoneNumber || "",
    });
    setEditingId(emp.id);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.fullName.trim()) {
      showToast("اسم الموظف مطلوب", "error");
      return;
    }
    if (!form.email.trim()) {
      showToast("البريد الإلكتروني مطلوب", "error");
      return;
    }
    if (!editingId && (!form.password || form.password.length < 6)) {
      showToast("كلمة المرور مطلوبة (6 أحرف على الأقل)", "error");
      return;
    }

    startTransition(async () => {
      const data: EmployeeFormData = {
        ...form,
        primaryBranchId: form.primaryBranchId || undefined,
        phoneNumber: form.phoneNumber || undefined,
      };

      let result;
      if (editingId) {
        result = await updateEmployee(editingId, data);
      } else {
        result = await createEmployee(data);
      }

      if (result.success) {
        showToast(
          editingId ? "تم تحديث بيانات الموظف" : "تم إضافة الموظف بنجاح",
          "success"
        );
        resetForm();
        // Refetch — dynamic import to avoid circular dependency
        const { getEmployees } = await import(
          "@/app/(app)/settings/employee-actions"
        );
        const fresh = await getEmployees();
        setEmployees(fresh);
      } else {
        showToast(result.error || "حدث خطأ", "error");
      }
    });
  };

  const handleToggle = (id: string, currentActive: boolean) => {
    startTransition(async () => {
      const result = await toggleEmployeeActive(id, !currentActive);
      if (result.success) {
        setEmployees((prev) =>
          prev.map((e) =>
            e.id === id ? { ...e, isActive: !currentActive } : e
          )
        );
        showToast(
          !currentActive ? "تم تفعيل الموظف" : "تم تعطيل الموظف",
          "success"
        );
      } else {
        showToast(result.error || "حدث خطأ", "error");
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteEmployee(id);
      if (result.success) {
        setEmployees((prev) => prev.filter((e) => e.id !== id));
        showToast("تم حذف الموظف", "success");
        setConfirmDelete(null);
      } else {
        showToast(result.error || "حدث خطأ", "error");
        setConfirmDelete(null);
      }
    });
  };

  // Filtered employees
  const filtered = employees.filter((e) => {
    const matchSearch =
      !search ||
      e.fullName.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "ALL" || e.role === filterRole;
    return matchSearch && matchRole;
  });

  const activeCount = employees.filter((e) => e.isActive).length;

  return (
    <div className="space-y-5">
      {/* Stats Row */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1">
        <div className="shrink-0 bg-white dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/40 shadow-sm rounded-2xl p-4 min-w-[120px] text-center">
          <div className="text-2xl font-bold text-brand-purple">
            {employees.length}
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">إجمالي الموظفين</div>
        </div>
        <div className="shrink-0 bg-white dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/40 shadow-sm rounded-2xl p-4 min-w-[120px] text-center">
          <div className="text-2xl font-bold text-emerald-600">
            {activeCount}
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">نشط</div>
        </div>
        <div className="shrink-0 bg-white dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/40 shadow-sm rounded-2xl p-4 min-w-[120px] text-center">
          <div className="text-2xl font-bold text-zinc-400">
            {employees.length - activeCount}
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">معطل</div>
        </div>
      </div>

      {/* Search + Filter + Add Button */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو البريد..."
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/40 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-brand-purple/30 focus:border-brand-purple/50 outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1">
            {[
              { key: "ALL", label: "الكل" },
              { key: "OWNER", label: "مالك" },
              { key: "MANAGER", label: "مدير" },
              { key: "STAFF", label: "موظف" },
            ].map((r) => (
              <button
                key={r.key}
                onClick={() => setFilterRole(r.key)}
                className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-bold transition-all ${
                  filterRole === r.key
                    ? "bg-brand-purple text-white shadow-md shadow-brand-purple/20"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="shrink-0 flex items-center gap-1.5 bg-brand-purple hover:bg-brand-purple-dark text-white px-4 py-2.5 rounded-2xl text-sm font-bold shadow-lg shadow-brand-purple/20 transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            إضافة موظف
          </button>
        </div>
      </div>

      {/* Employee Form */}
      {showForm && (
        <div className="bg-white dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/40 shadow-sm rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-brand-purple" />
              {editingId ? "تعديل بيانات الموظف" : "إضافة موظف جديد"}
            </h3>
            <button
              onClick={resetForm}
              className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
              الاسم الكامل *
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={form.fullName}
                onChange={(e) =>
                  setForm({ ...form, fullName: e.target.value })
                }
                placeholder="أحمد محمد علي"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-brand-purple/30 outline-none"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
              البريد الإلكتروني *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
                placeholder="ahmed@hrloop.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-brand-purple/30 outline-none"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
              كلمة المرور {editingId ? "(اتركها فارغة للإبقاء)" : "*"}
            </label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={form.password || ""}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                placeholder={editingId ? "••••••" : "6 أحرف على الأقل"}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-brand-purple/30 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-zinc-400" />
                ) : (
                  <Eye className="w-4 h-4 text-zinc-400" />
                )}
              </button>
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
              رقم الجوال
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="tel"
                value={form.phoneNumber || ""}
                onChange={(e) =>
                  setForm({ ...form, phoneNumber: e.target.value })
                }
                placeholder="05xxxxxxxx"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-brand-purple/30 outline-none"
              />
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
              الدور *
            </label>
            <div className="flex gap-2">
              {(["STAFF", "MANAGER", "OWNER"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm({ ...form, role: r })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                    form.role === r
                      ? "bg-brand-purple text-white shadow-md shadow-brand-purple/20"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          </div>

          {/* Branch */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
              الفرع الأساسي
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <select
                value={form.primaryBranchId || ""}
                onChange={(e) =>
                  setForm({ ...form, primaryBranchId: e.target.value })
                }
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-brand-purple/30 outline-none appearance-none"
              >
                <option value="">بدون فرع</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Save / Cancel */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={resetForm}
              className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-2xl py-3 text-sm font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition active:scale-95"
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex-1 bg-brand-purple hover:bg-brand-purple-dark text-white rounded-2xl py-3 text-sm font-bold shadow-lg shadow-brand-purple/20 disabled:opacity-50 transition flex items-center justify-center gap-2 active:scale-95"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {editingId ? "تحديث" : "إضافة"}
            </button>
          </div>
        </div>
      )}

      {/* Employee List */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/40 shadow-sm rounded-3xl p-8 text-center">
          <Users className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            {search || filterRole !== "ALL"
              ? "لا توجد نتائج مطابقة"
              : "لا يوجد موظفين. أضف أول موظف!"}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((emp) => (
            <div
              key={emp.id}
              className={`bg-white dark:bg-zinc-900/60 border shadow-sm rounded-3xl p-4 transition-all ${
                emp.isActive
                  ? "border-zinc-100 dark:border-zinc-800/40"
                  : "border-red-200/50 dark:border-red-900/30 opacity-60"
              }`}
            >
              {/* Header Row */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Avatar */}
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0 ${
                      emp.role === "OWNER"
                        ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                        : emp.role === "MANAGER"
                        ? "bg-brand-purple/10 dark:bg-brand-purple/20 text-brand-purple"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {emp.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                        {emp.fullName}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ROLE_COLORS[emp.role]}`}
                      >
                        {ROLE_LABELS[emp.role]}
                      </span>
                      {!emp.isActive && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                          معطل
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {emp.email}
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Row */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Building2 className="w-3.5 h-3.5" />
                  <span className="truncate">
                    {emp.primaryBranch?.name || "بدون فرع"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{emp.phoneNumber || "—"}</span>
                </div>
              </div>

              {/* Stats Row */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-3 py-2 text-center">
                  <div className="text-sm font-bold text-brand-purple">
                    {emp._count.shifts}
                  </div>
                  <div className="text-[10px] text-zinc-400">ورديات</div>
                </div>
                <div className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-3 py-2 text-center">
                  <div className="text-sm font-bold text-brand-purple">
                    {emp._count.attendanceLogs}
                  </div>
                  <div className="text-[10px] text-zinc-400">سجل حضور</div>
                </div>
                {emp.managedBranches.length > 0 && (
                  <div className="flex-1 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2 text-center">
                    <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      {emp.managedBranches.length}
                    </div>
                    <div className="text-[10px] text-zinc-400">يدير فروع</div>
                  </div>
                )}
              </div>

              {/* Actions Row */}
              <div className="flex items-center gap-2 border-t border-zinc-100 dark:border-zinc-800/40 pt-3">
                <button
                  onClick={() => startEdit(emp)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl py-2 text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition active:scale-95"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  تعديل
                </button>

                <button
                  onClick={() => handleToggle(emp.id, emp.isActive)}
                  disabled={isPending}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition active:scale-95 ${
                    emp.isActive
                      ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                      : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                  }`}
                >
                  {emp.isActive ? (
                    <ToggleRight className="w-3.5 h-3.5" />
                  ) : (
                    <ToggleLeft className="w-3.5 h-3.5" />
                  )}
                  {emp.isActive ? "تعطيل" : "تفعيل"}
                </button>

                {confirmDelete === emp.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDelete(emp.id)}
                      disabled={isPending}
                      className="px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-bold transition active:scale-95"
                    >
                      {isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        "تأكيد"
                      )}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs font-bold transition"
                    >
                      لا
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(emp.id)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    حذف
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-24 left-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-lg text-sm font-bold text-center ${
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
