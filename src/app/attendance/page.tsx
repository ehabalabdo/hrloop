// ============================================================
// Attendance Page (Server Component)
// Entry point for the employee attendance interface.
// In production, userId comes from the auth session.
// ============================================================

import { redirect } from "next/navigation";
import AttendanceDashboard from "@/components/attendance/AttendanceDashboard";
import { getAttendanceState, getUserForAttendance } from "./actions";

// For demo/development, use a query param or hardcoded user.
// In production, this would come from the auth session.
interface PageProps {
  searchParams: Promise<{ userId?: string }>;
}

export default async function AttendancePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const userId = params.userId;

  if (!userId) {
    // In production, redirect to login
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center p-5">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            HR Loop
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
            Employee Attendance System
          </p>
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-400">
            <p className="font-medium mb-1">Authentication Required</p>
            <p className="text-xs opacity-80">
              Pass <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">?userId=YOUR_UUID</code> to access the attendance dashboard.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
