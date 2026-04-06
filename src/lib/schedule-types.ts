// ============================================================
// Scheduling Engine Types
// Core types for the automated weekly scheduling system
// ============================================================

export interface WeekRange {
  start: Date; // Monday
  end: Date; // Sunday
  label: string; // e.g. "Mar 2 - Mar 8, 2026"
}

export interface BranchSlot {
  branchId: string;
  branchName: string;
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  date: Date;
  requiredStaff: number;
  assignedStaff: number;
  latitude: number;
  longitude: number;
  managerId: string | null;
}

export interface EmployeeCandidate {
  userId: string;
  fullName: string;
  role: "OWNER" | "MANAGER" | "STAFF";
  primaryBranchId: string | null;
  latitude: number; // Primary branch lat (or 0)
  longitude: number; // Primary branch lon (or 0)
  availableDays: number[]; // Array of dayOfWeek values
  availabilityMap: Map<
    number,
    { startTime: string; endTime: string }
  >;
  weeklyHoursScheduled: number;
  maxWeeklyHours: number;
}

export interface ScheduleEntry {
  id: string;
  shiftId: string;
  userId: string;
  userName: string;
  userRole: "OWNER" | "MANAGER" | "STAFF";
  branchId: string;
  branchName: string;
  date: string; // ISO date
  dayOfWeek: number;
  scheduledStart: string;
  scheduledEnd: string;
  status: "DRAFT" | "PUBLISHED" | "COMPLETED";
}

export interface WeeklyScheduleData {
  weekLabel: string;
  weekStart: string;
  weekEnd: string;
  branches: BranchWithSchedule[];
  stats: ScheduleStats;
}

export interface BranchWithSchedule {
  id: string;
  name: string;
  address: string | null;
  managerId: string | null;
  managerName: string | null;
  isActive: boolean;
  days: DaySchedule[];
}

export interface DaySchedule {
  date: string;
  dayOfWeek: number;
  dayName: string;
  requiredStaff: number;
  assignedStaff: ScheduleEntry[];
  shortage: number; // negative means understaffed
}

export interface ScheduleStats {
  totalShifts: number;
  draftShifts: number;
  publishedShifts: number;
  understaffedSlots: number;
  fullyStaffedBranches: number;
  totalBranches: number;
}

export interface GenerateResult {
  success: boolean;
  message: string;
  totalShiftsCreated: number;
  understaffedSlots: number;
  warnings: string[];
  error?: string;
}

export interface ScheduleFilter {
  branchCity?: string;
  managerName?: string;
  showUnderstaffedOnly?: boolean;
}

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const DAY_NAMES_SHORT = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

export const DAY_NAMES_AR = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

export const DAY_NAMES_SHORT_AR = [
  "أحد",
  "إثن",
  "ثلا",
  "أرب",
  "خمي",
  "جمع",
  "سبت",
];
