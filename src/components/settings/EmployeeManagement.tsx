"use client";

// ============================================================
// Employee Management — Complete CRUD UI
// Add, edit, assign to branch, toggle, delete employees
// Arabic, mobile-first, card-based design
// ============================================================

import { useState, useTransition, useRef } from "react";
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
  FileText,
  Upload,
  Download,
  ExternalLink,
  Hash,
  Clock,
  CalendarDays,
  Briefcase,
  Paperclip,
  DollarSign,
  Bus,
} from "lucide-react";
import type {
  EmployeeWithBranch,
  EmployeeFormData,
  EmployeeDocument,
} from "@/app/(app)/settings/employee-actions";
import {
  createEmployee,
  updateEmployee,
  toggleEmployeeActive,
  deleteEmployee,
  deleteEmployeeDocument,
} from "@/app/(app)/settings/employee-actions";
import { useLang } from "@/lib/i18n";

interface EmployeeManagementProps {
  initialEmployees: EmployeeWithBranch[];
  branches: { id: string; name: string }[];
}

const DAY_LABELS_AR = [
  "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت",
];

const ROLE_LABELS_MAP: Record<string, string> = {
  OWNER: "مالك",
  MANAGER: "مدير",
  STAFF: "موظف",
};

const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  MANAGER:
    "bg-brand-purple/10 dark:bg-brand-purple/20 text-brand-purple",
  STAFF: "bg-surface-hover text-muted",
};

const emptyForm: EmployeeFormData = {
  fullName: "",
  email: "",
  password: "",
  role: "STAFF",
  primaryBranchId: "",
  phoneNumber: "",
  socialSecurityNumber: "",
  employmentType: "FULL_TIME",
  assignedBranchIds: [],
  hourlyRate: 0,
  baseSalary: 0,
  transportationAllowance: 0,
  isFlexibleSchedule: false,
  availability: [],
};

export default function EmployeeManagement({
  initialEmployees,
  branches,
}: EmployeeManagementProps) {
  const [employees, setEmployees] =
    useState<EmployeeWithBranch[]>(initialEmployees);
  const { t, lang } = useLang();
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
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [expandedDocs, setExpandedDocs] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      socialSecurityNumber: emp.socialSecurityNumber || "",
      employmentType: emp.employmentType || "FULL_TIME",
      assignedBranchIds: emp.assignedBranches?.map((ab) => ab.branch.id) || [],
      hourlyRate: emp.payrollProfile?.hourlyRate ?? 0,
      baseSalary: emp.payrollProfile?.baseSalary ?? 0,
      transportationAllowance: emp.payrollProfile?.transportationAllowance ?? 0,
      isFlexibleSchedule: emp.isFlexibleSchedule ?? false,
      availability: emp.availability?.map((a) => ({
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
      })) || [],
    });
    setEditingId(emp.id);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.fullName.trim()) {
      showToast(t.settings.fullName + " " + t.common.required, "error");
      return;
    }
    if (!form.email.trim()) {
      showToast(t.settings.emailLabel + " " + t.common.required, "error");
      return;
    }
    if (!editingId && (!form.password || form.password.length < 6)) {
      showToast(t.settings.minChars, "error");
      return;
    }

    startTransition(async () => {
      const data: EmployeeFormData = {
        ...form,
        primaryBranchId: form.primaryBranchId || undefined,
        phoneNumber: form.phoneNumber || undefined,
        socialSecurityNumber: form.socialSecurityNumber || undefined,
        assignedBranchIds: form.assignedBranchIds || [],
      };

      let result;
      if (editingId) {
        result = await updateEmployee(editingId, data);
      } else {
        result = await createEmployee(data);
      }

      if (result.success) {
        showToast(
          editingId ? t.settings.employeeUpdated : t.settings.employeeAdded,
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
        showToast(result.error || t.settings.error, "error");
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
          !currentActive ? t.settings.employeeEnabled : t.settings.employeeDisabled,
          "success"
        );
      } else {
        showToast(result.error || t.settings.error, "error");
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteEmployee(id);
      if (result.success) {
        setEmployees((prev) => prev.filter((e) => e.id !== id));
        showToast(t.settings.employeeDeleted, "success");
        setConfirmDelete(null);
      } else {
        showToast(result.error || t.settings.error, "error");
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

  const handleFileUpload = async (userId: string, file: File) => {
    setUploadingFor(userId);
    try {
      const formData = new FormData();
      formData.append("userId", userId);
      formData.append("file", file);

      const res = await fetch("/api/employees/upload", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();

      if (result.success) {
        showToast(t.leaves.uploadSuccess, "success");
        const { getEmployees } = await import(
          "@/app/(app)/settings/employee-actions"
        );
        const fresh = await getEmployees();
        setEmployees(fresh);
      } else {
        showToast(result.error || t.settings.error, "error");
      }
    } catch {
      showToast(t.settings.error, "error");
    } finally {
      setUploadingFor(null);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    startTransition(async () => {
      const result = await deleteEmployeeDocument(docId);
      if (result.success) {
        showToast(t.settings.employeeDeleted, "success");
        const { getEmployees } = await import(
          "@/app/(app)/settings/employee-actions"
        );
        const fresh = await getEmployees();
        setEmployees(fresh);
      } else {
        showToast(result.error || t.settings.error, "error");
      }
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const activeCount = employees.filter((e) => e.isActive).length;

  return (
    <div className="space-y-5">
      {/* Stats Row */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1">
        <div className="shrink-0 bg-surface/60 border border-border-main/40 shadow-sm rounded-2xl p-4 min-w-[120px] text-center">
          <div className="text-2xl font-bold text-brand-purple">
            {employees.length}
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">{t.settings.totalEmployees}</div>
        </div>
        <div className="shrink-0 bg-surface/60 border border-border-main/40 shadow-sm rounded-2xl p-4 min-w-[120px] text-center">
          <div className="text-2xl font-bold text-emerald-600">
            {activeCount}
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">{t.settings.active}</div>
        </div>
        <div className="shrink-0 bg-surface/60 border border-border-main/40 shadow-sm rounded-2xl p-4 min-w-[120px] text-center">
          <div className="text-2xl font-bold text-zinc-400">
            {employees.length - activeCount}
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">{t.settings.disabled}</div>
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
            placeholder={t.settings.searchPlaceholder}
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-surface/60 border border-border-main/40 text-sm text-foreground placeholder:text-zinc-400 focus:ring-2 focus:ring-brand-purple/30 focus:border-brand-purple/50 outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1">
            {[
              { key: "ALL", label: t.settings.allFilter },
              { key: "OWNER", label: t.sidebar.owner },
              { key: "MANAGER", label: t.sidebar.manager },
              { key: "STAFF", label: t.sidebar.staff },
            ].map((r) => (
              <button
                key={r.key}
                onClick={() => setFilterRole(r.key)}
                className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-bold transition-all ${
                  filterRole === r.key
                    ? "bg-brand-purple text-white shadow-md shadow-brand-purple/20"
                    : "bg-surface-hover text-muted"
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
            className="shrink-0 flex items-center gap-1.5 bg-brand-purple hover:bg-brand-primary-dark text-white px-4 py-2.5 rounded-2xl text-sm font-bold shadow-lg shadow-brand-purple/20 transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            {t.settings.addEmployee}
          </button>
        </div>
      </div>

      {/* Employee Form */}
      {showForm && (
        <div className="bg-surface/60 border border-border-main/40 shadow-sm rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-brand-purple" />
              {editingId ? t.settings.editEmployee : t.settings.addNewEmployee}
            </h3>
            <button
              onClick={resetForm}
              className="p-2 rounded-xl hover:bg-surface-hover transition"
            >
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              {t.settings.fullName} *
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={form.fullName}
                onChange={(e) =>
                  setForm({ ...form, fullName: e.target.value })
                }
                placeholder={t.settings.namePlaceholder}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-hover border border-border-main text-sm text-foreground placeholder:text-zinc-400 focus:ring-2 focus:ring-brand-purple/30 outline-none"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              {t.settings.emailLabel} *
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
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-hover border border-border-main text-sm text-foreground placeholder:text-zinc-400 focus:ring-2 focus:ring-brand-purple/30 outline-none"
              />
            </div>
            <a
              href="https://accounts.google.com/signup"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-1.5 text-xs text-brand-purple hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              {t.settings.noEmailHint}
            </a>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              {t.settings.passwordLabel} {editingId ? `(${t.settings.keepEmpty})` : "*"}
            </label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={form.password || ""}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                placeholder={editingId ? "••••••" : t.settings.minChars}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-surface-hover border border-border-main text-sm text-foreground placeholder:text-zinc-400 focus:ring-2 focus:ring-brand-purple/30 outline-none"
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
            <label className="block text-xs font-medium text-muted mb-1.5">
              {t.settings.phone}
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
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-hover border border-border-main text-sm text-foreground placeholder:text-zinc-400 focus:ring-2 focus:ring-brand-purple/30 outline-none"
              />
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              {t.settings.role} *
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
                      : "bg-surface-hover text-muted hover:bg-surface-hover"
                  }`}
                >
                  {r === "OWNER" ? t.sidebar.owner : r === "MANAGER" ? t.sidebar.manager : t.sidebar.staff}
                </button>
              ))}
            </div>
          </div>

          {/* Branch */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              {t.settings.primaryBranch}
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <select
                value={form.primaryBranchId || ""}
                onChange={(e) =>
                  setForm({ ...form, primaryBranchId: e.target.value })
                }
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-hover border border-border-main text-sm text-foreground focus:ring-2 focus:ring-brand-purple/30 outline-none appearance-none"
              >
                <option value="">{t.settings.noBranch}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assigned Branches (Checkboxes) */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              <Building2 className="inline w-3.5 h-3.5 ml-1" />
              {t.settings.allowedBranchesWork}
            </label>
            <div className="bg-surface-hover border border-border-main rounded-xl p-3 max-h-40 overflow-y-auto space-y-2">
              {branches.length === 0 ? (
                <div className="text-xs text-zinc-400 text-center py-2">{t.settings.noBranchesAvailable}</div>
              ) : (
                branches.map((b) => (
                  <label
                    key={b.id}
                    className="flex items-center gap-2.5 cursor-pointer hover:bg-surface-hover rounded-lg px-2 py-1.5 transition"
                  >
                    <input
                      type="checkbox"
                      checked={form.assignedBranchIds?.includes(b.id) || false}
                      onChange={(e) => {
                        const current = form.assignedBranchIds || [];
                        if (e.target.checked) {
                          setForm({
                            ...form,
                            assignedBranchIds: [...current, b.id],
                          });
                        } else {
                          setForm({
                            ...form,
                            assignedBranchIds: current.filter((id) => id !== b.id),
                          });
                        }
                      }}
                      className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-brand-purple focus:ring-brand-purple/30 accent-brand-purple"
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      {b.name}
                    </span>
                  </label>
                ))
              )}
            </div>
            {(form.assignedBranchIds?.length ?? 0) > 0 && (
              <div className="text-xs text-brand-purple mt-1">
                {t.settings.branchSelected}: {form.assignedBranchIds!.length}
              </div>
            )}
          </div>

          {/* Social Security Number */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              {t.settings.ssn}
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={form.socialSecurityNumber || ""}
                onChange={(e) =>
                  setForm({ ...form, socialSecurityNumber: e.target.value })
                }
                placeholder="XXX-XX-XXXX"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-hover border border-border-main text-sm text-foreground placeholder:text-zinc-400 focus:ring-2 focus:ring-brand-purple/30 outline-none"
              />
            </div>
          </div>

          {/* Employment Type */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              {t.settings.employmentType} *
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, employmentType: "FULL_TIME" })}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                  form.employmentType === "FULL_TIME"
                    ? "bg-brand-purple text-white shadow-md shadow-brand-purple/20"
                    : "bg-surface-hover text-muted hover:bg-surface-hover"
                }`}
              >
                <Briefcase className="w-4 h-4" />
                {t.settings.fullTime}
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, employmentType: "HOURLY" })}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                  form.employmentType === "HOURLY"
                    ? "bg-brand-purple text-white shadow-md shadow-brand-purple/20"
                    : "bg-surface-hover text-muted hover:bg-surface-hover"
                }`}
              >
                <Clock className="w-4 h-4" />
                {t.settings.hourly}
              </button>
            </div>
          </div>

          {/* Pay Info — conditional on employment type */}
          {form.employmentType === "HOURLY" ? (
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                {t.settings.hourlyRate} *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={form.hourlyRate || ""}
                  onChange={(e) =>
                    setForm({ ...form, hourlyRate: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-hover border border-border-main text-sm text-foreground placeholder:text-zinc-400 focus:ring-2 focus:ring-brand-purple/30 outline-none"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                {t.settings.monthlySalary} *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.baseSalary || ""}
                  onChange={(e) =>
                    setForm({ ...form, baseSalary: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-hover border border-border-main text-sm text-foreground placeholder:text-zinc-400 focus:ring-2 focus:ring-brand-purple/30 outline-none"
                />
              </div>
            </div>
          )}

          {/* Transportation Allowance */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              {t.settings.transportAllowance}
            </label>
            <div className="relative">
              <Bus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="number"
                min="0"
                step="1"
                value={form.transportationAllowance || ""}
                onChange={(e) =>
                  setForm({ ...form, transportationAllowance: parseFloat(e.target.value) || 0 })
                }
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-hover border border-border-main text-sm text-foreground placeholder:text-zinc-400 focus:ring-2 focus:ring-brand-purple/30 outline-none"
              />
            </div>
          </div>

          {/* Schedule Type Toggle */}
          <div className="sm:col-span-2 border-t border-border-main pt-4">
            <label className="block text-xs font-medium text-muted mb-2 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              {t.settings.scheduleType}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, isFlexibleSchedule: false })}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  !form.isFlexibleSchedule
                    ? "bg-brand-purple text-white shadow-lg shadow-brand-purple/20"
                    : "bg-surface-hover text-zinc-500"
                }`}
              >
                {t.settings.fixedSchedule}
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, isFlexibleSchedule: true, availability: [] })}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  form.isFlexibleSchedule
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                    : "bg-surface-hover text-zinc-500"
                }`}
              >
                {t.settings.flexibleSchedule}
              </button>
            </div>
          </div>

          {/* Availability Picker (when not flexible) */}
          {!form.isFlexibleSchedule && (
            <div className="sm:col-span-2 space-y-2">
              <label className="block text-xs font-medium text-muted mb-1">
                {t.settings.workDaysHours}
              </label>
              {t.dayNames.map((label: string, dayIdx: number) => {
                const existing = form.availability?.find((a) => a.dayOfWeek === dayIdx);
                const isActive = !!existing;
                return (
                  <div key={dayIdx} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (isActive) {
                          setForm({
                            ...form,
                            availability: (form.availability || []).filter((a) => a.dayOfWeek !== dayIdx),
                          });
                        } else {
                          setForm({
                            ...form,
                            availability: [
                              ...(form.availability || []),
                              { dayOfWeek: dayIdx, startTime: "09:00", endTime: "17:00" },
                            ],
                          });
                        }
                      }}
                      className={`w-20 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isActive
                          ? "bg-brand-purple text-white"
                          : "bg-surface-hover text-zinc-400"
                      }`}
                    >
                      {label}
                    </button>
                    {isActive && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="time"
                          value={existing.startTime}
                          onChange={(e) => {
                            setForm({
                              ...form,
                              availability: (form.availability || []).map((a) =>
                                a.dayOfWeek === dayIdx ? { ...a, startTime: e.target.value } : a
                              ),
                            });
                          }}
                          className="text-xs border border-border-main rounded-lg px-2 py-1.5 bg-surface text-foreground"
                        />
                        <span className="text-zinc-400 text-xs">—</span>
                        <input
                          type="time"
                          value={existing.endTime}
                          onChange={(e) => {
                            setForm({
                              ...form,
                              availability: (form.availability || []).map((a) =>
                                a.dayOfWeek === dayIdx ? { ...a, endTime: e.target.value } : a
                              ),
                            });
                          }}
                          className="text-xs border border-border-main rounded-lg px-2 py-1.5 bg-surface text-foreground"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Save / Cancel */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={resetForm}
              className="flex-1 bg-surface-hover text-zinc-700 dark:text-zinc-300 rounded-2xl py-3 text-sm font-bold hover:bg-surface-hover transition active:scale-95"
            >
              {t.common.cancel}
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex-1 bg-brand-purple hover:bg-brand-primary-dark text-white rounded-2xl py-3 text-sm font-bold shadow-lg shadow-brand-purple/20 disabled:opacity-50 transition flex items-center justify-center gap-2 active:scale-95"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {editingId ? t.settings.update : t.settings.add}
            </button>
          </div>
        </div>
      )}

      {/* Employee List */}
      {filtered.length === 0 ? (
        <div className="bg-surface/60 border border-border-main/40 shadow-sm rounded-3xl p-8 text-center">
          <Users className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <div className="text-sm text-muted">
            {search || filterRole !== "ALL"
              ? t.settings.noResults
              : t.settings.noEmployees}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((emp) => (
            <div
              key={emp.id}
              className={`bg-surface/60 border shadow-sm rounded-3xl p-4 transition-all ${
                emp.isActive
                  ? "border-border-main/40"
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
                        : "bg-surface-hover text-muted"
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
                      <span className="font-bold text-sm text-foreground truncate">
                        {emp.fullName}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold ${ROLE_COLORS[emp.role]}`}
                      >
                        {emp.role === "OWNER" ? t.sidebar.owner : emp.role === "MANAGER" ? t.sidebar.manager : t.sidebar.staff}
                      </span>
                      {!emp.isActive && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                          {t.settings.disabled}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted truncate">
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
                    {emp.primaryBranch?.name || t.settings.noBranch}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{emp.phoneNumber || "—"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  {emp.employmentType === "FULL_TIME" ? (
                    <Briefcase className="w-3.5 h-3.5" />
                  ) : (
                    <Clock className="w-3.5 h-3.5" />
                  )}
                  <span>{emp.employmentType === "FULL_TIME" ? t.settings.fullTime : t.settings.hourly}</span>
                </div>
                {emp.payrollProfile && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>
                      {emp.employmentType === "HOURLY"
                        ? `${Number(emp.payrollProfile.hourlyRate).toFixed(2)}${t.settings.hourlyUnit}`
                        : `${Number(emp.payrollProfile.baseSalary).toFixed(0)} ${t.settings.monthlyUnit}`}
                    </span>
                  </div>
                )}
                {emp.payrollProfile && Number(emp.payrollProfile.transportationAllowance) > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Bus className="w-3.5 h-3.5" />
                    <span>{t.settings.transportLabel}: {Number(emp.payrollProfile.transportationAllowance).toFixed(0)}</span>
                  </div>
                )}
                {emp.socialSecurityNumber && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Hash className="w-3.5 h-3.5" />
                    <span>SSN: ••••{emp.socialSecurityNumber.slice(-4)}</span>
                  </div>
                )}
              </div>

              {/* Assigned Branches */}
              {emp.assignedBranches && emp.assignedBranches.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-zinc-400 mb-1">{t.settings.allowedBranches}:</div>
                  <div className="flex flex-wrap gap-1">
                    {emp.assignedBranches.map((ab) => (
                      <span
                        key={ab.branch.id}
                        className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                      >
                        {ab.branch.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Schedule Info */}
              <div className="mb-3">
                {emp.isFlexibleSchedule ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                    {t.settings.flexibleSchedule}
                  </span>
                ) : emp.availability && emp.availability.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {emp.availability.map((a) => (
                      <span
                        key={a.dayOfWeek}
                        className="px-2 py-0.5 rounded-full text-xs font-medium bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400"
                      >
                        {t.dayNames[a.dayOfWeek]}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-zinc-400">{t.settings.workDaysHours}</span>
                )}
              </div>

              {/* Stats Row */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 bg-surface-hover/50 rounded-xl px-3 py-2 text-center">
                  <div className="text-sm font-bold text-brand-purple">
                    {emp._count.shifts}
                  </div>
                  <div className="text-xs text-zinc-400">{t.settings.shifts}</div>
                </div>
                <div className="flex-1 bg-surface-hover/50 rounded-xl px-3 py-2 text-center">
                  <div className="text-sm font-bold text-brand-purple">
                    {emp._count.attendanceLogs}
                  </div>
                  <div className="text-xs text-zinc-400">{t.settings.attendanceLog}</div>
                </div>
                {emp.managedBranches.length > 0 && (
                  <div className="flex-1 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2 text-center">
                    <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      {emp.managedBranches.length}
                    </div>
                    <div className="text-xs text-zinc-400">{t.settings.managesBranches}</div>
                  </div>
                )}
              </div>

              {/* Actions Row */}
              <div className="flex items-center gap-2 border-t border-border-main/40 pt-3">
                {/* Document Upload Button */}
                <button
                  onClick={() => {
                    setUploadingFor(emp.id);
                    fileInputRef.current?.click();
                  }}
                  disabled={uploadingFor === emp.id}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition active:scale-95"
                >
                  {uploadingFor === emp.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  {t.settings.uploadFile}
                </button>

                {/* Expand Documents */}
                {emp.documents && emp.documents.length > 0 && (
                  <button
                    onClick={() =>
                      setExpandedDocs(expandedDocs === emp.id ? null : emp.id)
                    }
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-surface-hover/50 text-muted text-xs font-bold hover:bg-surface-hover transition active:scale-95"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    {emp.documents.length} {t.settings.fileCount}
                  </button>
                )}

                <button
                  onClick={() => startEdit(emp)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-surface-hover text-zinc-700 dark:text-zinc-300 rounded-xl py-2 text-xs font-bold hover:bg-surface-hover transition active:scale-95"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  {t.settings.edit}
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
                  {emp.isActive ? t.settings.disable : t.settings.enable}
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
                        t.settings.confirm
                      )}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="px-3 py-2 rounded-xl bg-surface-hover text-zinc-500 text-xs font-bold transition"
                    >
                      {t.common.no}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(emp.id)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {t.settings.deleteLabel}
                  </button>
                )}
              </div>

              {/* Expanded Documents Panel */}
              {expandedDocs === emp.id && emp.documents && emp.documents.length > 0 && (
                <div className="mt-3 border-t border-border-main/40 pt-3 space-y-2">
                  <div className="text-xs font-bold text-muted flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    {t.settings.uploadFile}
                  </div>
                  {emp.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between bg-surface-hover/50 rounded-xl px-3 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="w-4 h-4 text-brand-purple shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
                            {doc.originalName}
                          </div>
                          <div className="text-xs text-zinc-400">
                            {formatFileSize(doc.fileSize)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={`/api/employees/documents/${doc.fileName}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-surface-hover transition"
                          title={t.common.download}
                        >
                          <Download className="w-3.5 h-3.5 text-brand-purple" />
                        </a>
                        <button
                          onClick={() => handleDeleteDoc(doc.id)}
                          disabled={isPending}
                          className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition"
                          title={t.common.delete}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadingFor) {
            handleFileUpload(uploadingFor, file);
          }
          e.target.value = "";
        }}
      />

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
