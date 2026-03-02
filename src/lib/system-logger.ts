"use server";

// ============================================================
// System Logger — Immutable Audit Trail
// Wraps all critical Server Actions (Manual Shift Change,
// Salary Adjustment, Device Reset, Dispute Resolution)
// Records every manual intervention to prevent fraud.
// ============================================================

import prisma from "@/lib/db";

export interface SystemLogEntry {
  actorId: string;
  actionType: string;
  targetType: string;
  targetId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  description: string;
}

/**
 * Log a critical action to the immutable system_logs table.
 * This cannot be deleted or modified by any user.
 */
export async function logSystemAction(entry: SystemLogEntry): Promise<void> {
  try {
    await prisma.systemLog.create({
      data: {
        actorId: entry.actorId,
        actionType: entry.actionType,
        targetType: entry.targetType,
        targetId: entry.targetId ?? null,
        oldValue: entry.oldValue ? (entry.oldValue as object) : undefined,
        newValue: entry.newValue ? (entry.newValue as object) : undefined,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
        description: entry.description,
      },
    });
  } catch (error) {
    // Never let logging failure break the main operation
    console.error("[SystemLog] Failed to write log:", error);
  }
}

/**
 * Fetch system logs with filtering support for the audit trail UI.
 */
export async function getSystemLogs(params?: {
  actionType?: string;
  actorId?: string;
  targetType?: string;
  limit?: number;
}) {
  const limit = params?.limit ?? 100;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (params?.actionType) where.actionType = params.actionType;
  if (params?.actorId) where.actorId = params.actorId;
  if (params?.targetType) where.targetType = params.targetType;

  const logs = await prisma.systemLog.findMany({
    where,
    include: {
      actor: {
        select: { id: true, fullName: true, role: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  type LogRow = (typeof logs)[number];

  return logs.map((l: LogRow) => ({
    id: l.id,
    actorId: l.actorId,
    actorName: l.actor?.fullName ?? "System",
    actorRole: l.actor?.role ?? "SYSTEM",
    actionType: l.actionType,
    targetType: l.targetType,
    targetId: l.targetId,
    oldValue: l.oldValue as Record<string, unknown> | null,
    newValue: l.newValue as Record<string, unknown> | null,
    ipAddress: l.ipAddress,
    description: l.description,
    createdAt: l.createdAt.toISOString(),
  }));
}

/**
 * Get distinct action types for filter dropdowns.
 */
export async function getSystemLogActionTypes(): Promise<string[]> {
  const results = await prisma.systemLog.findMany({
    select: { actionType: true },
    distinct: ["actionType"],
    orderBy: { actionType: "asc" },
  });

  type ActionRow = (typeof results)[number];
  return results.map((r: ActionRow) => r.actionType);
}

/**
 * Get distinct actors for filter dropdowns.
 */
export async function getSystemLogActors(): Promise<
  { id: string; name: string }[]
> {
  const results = await prisma.systemLog.findMany({
    where: { actorId: { not: null } },
    select: { actorId: true, actor: { select: { fullName: true } } },
    distinct: ["actorId"],
  });

  type ActorRow = (typeof results)[number];
  return results
    .filter((r: ActorRow) => r.actorId !== null)
    .map((r: ActorRow) => ({
      id: r.actorId!,
      name: r.actor?.fullName ?? "Unknown",
    }));
}
