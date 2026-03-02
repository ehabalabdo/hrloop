// ============================================================
// Attendance Types
// Shared types for attendance-related operations
// ============================================================

export type AttendanceAction = "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END";

export interface AttendanceState {
  status: "not_clocked_in" | "clocked_in" | "on_break";
  currentShift: {
    id: string;
    scheduledStart: string;
    scheduledEnd: string;
    branchName: string;
    branchId: string;
    branchLatitude: number;
    branchLongitude: number;
    geofenceRadius: number;
  } | null;
  lastAction: {
    type: AttendanceAction;
    timestamp: string;
  } | null;
  isLate: boolean;
  lateMinutes: number;
  clockInTime: string | null;
}

export interface AttendanceRequest {
  userId: string;
  shiftId: string;
  action: AttendanceAction;
  latitude: number;
  longitude: number;
  isWithinFence: boolean;
}

export interface AttendanceResponse {
  success: boolean;
  message: string;
  error?: string;
}
