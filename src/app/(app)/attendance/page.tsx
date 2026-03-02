// ============================================================
// Attendance Page (Server Component)
// Entry point for the employee attendance interface.
// Uses auth session for the current user.
// ============================================================

import { redirect } from "next/navigation";
import AttendanceDashboard from "@/components/attendance/AttendanceDashboard";
import { getAttendanceState, getUserForAttendance } from "./actions";
import { getSession } from "@/lib/auth";

export default async function AttendancePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const userId = session.userId;

  // Get user data
  const user = await getUserForAttendance(userId);

  if (!user || !user.isActive) {
    redirect("/");
  }

  // Get attendance state
  const attendanceState = await getAttendanceState(userId);

  return (
    <AttendanceDashboard
      userId={user.id}
      userName={user.fullName}
      hasBiometricRegistered={!!user.webauthnCredentialId}
      initialState={attendanceState}
    />
  );
}
