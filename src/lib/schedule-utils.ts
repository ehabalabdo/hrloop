// ============================================================
// Schedule Utilities (non-server-action helpers)
// ============================================================

/** Get the Monday of the week that contains `date` */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Get Sunday of the same week */
export function getWeekEnd(monday: Date): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Format date to ISO date string YYYY-MM-DD */
export function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}
