"use server";

// ============================================================
// News / Announcements — Server Actions
// ============================================================

import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

export interface AnnouncementItem {
  id: string;
  content: string;
  mediaUrl: string | null;
  mediaType: string | null;
  isPinned: boolean;
  createdAt: string;
  author: {
    id: string;
    fullName: string;
    role: string;
  };
}

/**
 * Get all announcements, pinned first then newest.
 */
export async function getAnnouncements(page = 1, limit = 20): Promise<{
  items: AnnouncementItem[];
  total: number;
}> {
  const session = await getSession();
  if (!session) return { items: [], total: 0 };

  const [items, total] = await Promise.all([
    prisma.announcement.findMany({
      include: {
        author: {
          select: { id: true, fullName: true, role: true },
        },
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.announcement.count(),
  ]);

  return {
    items: items.map((a: typeof items[number]) => ({
      id: a.id,
      content: a.content,
      mediaUrl: a.mediaUrl,
      mediaType: a.mediaType,
      isPinned: a.isPinned,
      createdAt: a.createdAt.toISOString(),
      author: {
        id: a.author.id,
        fullName: a.author.fullName,
        role: a.author.role,
      },
    })),
    total,
  };
}

/**
 * Create a new announcement. Only OWNER and MANAGER can post.
 */
export async function createAnnouncement(data: {
  content: string;
  mediaUrl?: string;
  mediaType?: string;
}): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session || (session.role !== "OWNER" && session.role !== "MANAGER")) {
    return { success: false, error: "Unauthorized" };
  }

  if (!data.content.trim()) {
    return { success: false, error: "Content is required" };
  }

  await prisma.announcement.create({
    data: {
      authorId: session.userId,
      content: data.content.trim(),
      mediaUrl: data.mediaUrl || null,
      mediaType: data.mediaType || null,
    },
  });

  return { success: true };
}

/**
 * Delete an announcement. Author or OWNER can delete.
 */
export async function deleteAnnouncement(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const announcement = await prisma.announcement.findUnique({
    where: { id },
  });

  if (!announcement) {
    return { success: false, error: "Post not found" };
  }

  // Only the author or OWNER can delete
  if (announcement.authorId !== session.userId && session.role !== "OWNER") {
    return { success: false, error: "Not authorized to delete" };
  }

  await prisma.announcement.delete({ where: { id } });
  return { success: true };
}

/**
 * Toggle pin status. Only OWNER can pin/unpin.
 */
export async function togglePinAnnouncement(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return { success: false, error: "Only the owner can pin posts" };
  }

  const announcement = await prisma.announcement.findUnique({
    where: { id },
  });

  if (!announcement) {
    return { success: false, error: "Post not found" };
  }

  await prisma.announcement.update({
    where: { id },
    data: { isPinned: !announcement.isPinned },
  });

  return { success: true };
}
