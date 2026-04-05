"use client";

// ============================================================
// News Feed — Announcements dashboard
// Managers/Owners post, all employees see
// ============================================================

import { useState, useTransition, useRef } from "react";
import {
  Plus,
  Trash2,
  Pin,
  PinOff,
  Image as ImageIcon,
  Video,
  Send,
  X,
  Loader2,
  Megaphone,
  MoreVertical,
  Shield,
} from "lucide-react";
import type { AnnouncementItem } from "@/app/(app)/news/actions";
import {
  createAnnouncement,
  deleteAnnouncement,
  togglePinAnnouncement,
  getAnnouncements,
} from "@/app/(app)/news/actions";

interface NewsFeedProps {
  initialItems: AnnouncementItem[];
  initialTotal: number;
  userRole: string;
  userId: string;
}

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  OWNER: { label: "مالك", color: "bg-brand-purple text-white" },
  MANAGER: { label: "مدير", color: "bg-brand-magenta text-white" },
  STAFF: { label: "موظف", color: "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300" },
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "الآن";
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `منذ ${diffDays} يوم`;
  return date.toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
}

export default function NewsFeed({
  initialItems,
  initialTotal,
  userRole,
  userId,
}: NewsFeedProps) {
  const [items, setItems] = useState<AnnouncementItem[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [showComposer, setShowComposer] = useState(false);
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const canPost = userRole === "OWNER" || userRole === "MANAGER";
  const isOwner = userRole === "OWNER";

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/news/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "فشل رفع الملف");
        setUploading(false);
        return;
      }

      const data = await res.json();
      setMediaUrl(data.url);
      setMediaType(data.mediaType);
    } catch {
      alert("فشل رفع الملف");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handlePost = () => {
    if (!content.trim() && !mediaUrl) return;

    startTransition(async () => {
      const result = await createAnnouncement({
        content: content.trim(),
        mediaUrl: mediaUrl || undefined,
        mediaType: mediaType || undefined,
      });

      if (result.success) {
        setContent("");
        setMediaUrl(null);
        setMediaType(null);
        setShowComposer(false);
        // Refresh
        const fresh = await getAnnouncements(1);
        setItems(fresh.items);
        setTotal(fresh.total);
        setPage(1);
      } else {
        alert(result.error);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنشور؟")) return;

    startTransition(async () => {
      const result = await deleteAnnouncement(id);
      if (result.success) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        setTotal((t) => t - 1);
      }
    });
  };

  const handlePin = (id: string) => {
    startTransition(async () => {
      const result = await togglePinAnnouncement(id);
      if (result.success) {
        const fresh = await getAnnouncements(1);
        setItems(fresh.items);
        setTotal(fresh.total);
        setPage(1);
      }
    });
  };

  const loadMore = async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    const fresh = await getAnnouncements(nextPage);
    setItems((prev) => [...prev, ...fresh.items]);
    setPage(nextPage);
    setLoadingMore(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0f0a19] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-purple-dark via-brand-purple to-brand-purple-light px-5 pt-8 pb-10 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full" />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Megaphone className="w-7 h-7 text-white/80" />
              <h1 className="text-2xl font-bold text-white">الأخبار</h1>
            </div>
            {canPost && (
              <button
                onClick={() => setShowComposer(!showComposer)}
                className="flex items-center gap-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-2xl px-4 py-2.5 text-sm font-bold transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                منشور جديد
              </button>
            )}
          </div>
          <p className="text-sm text-white/50 mt-2">
            {total} منشور
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-zinc-50 dark:bg-[#0f0a19] rounded-t-[2rem]" />
      </div>

      {/* Composer */}
      {showComposer && canPost && (
        <div className="px-5 -mt-1 mb-4">
          <div className="bg-white dark:bg-zinc-900/60 rounded-3xl border border-zinc-100 dark:border-zinc-800/40 shadow-lg overflow-hidden">
            <div className="p-5">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="اكتب منشوراً..."
                rows={3}
                className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-brand-purple/30 outline-none resize-none"
                dir="rtl"
              />

              {/* Media Preview */}
              {mediaUrl && (
                <div className="relative mt-3 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  {mediaType === "image" ? (
                    <img src={mediaUrl} alt="مرفق" className="w-full max-h-64 object-cover" />
                  ) : (
                    <video src={mediaUrl} controls className="w-full max-h-64" />
                  )}
                  <button
                    onClick={() => { setMediaUrl(null); setMediaType(null); }}
                    className="absolute top-2 left-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Upload progress */}
              {uploading && (
                <div className="mt-3 flex items-center gap-2 text-sm text-brand-purple">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري رفع الملف...</span>
                </div>
              )}
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/40 px-5 py-3">
              <div className="flex items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition disabled:opacity-50"
                >
                  <ImageIcon className="w-4 h-4" />
                  صورة
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition disabled:opacity-50"
                >
                  <Video className="w-4 h-4" />
                  فيديو
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowComposer(false); setContent(""); setMediaUrl(null); setMediaType(null); }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                  إلغاء
                </button>
                <button
                  onClick={handlePost}
                  disabled={isPending || (!content.trim() && !mediaUrl)}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-brand-purple text-white hover:bg-brand-purple-dark disabled:opacity-50 transition active:scale-95"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  نشر
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feed */}
      <div className="px-5 -mt-1 space-y-4">
        {items.length === 0 && (
          <div className="text-center py-20">
            <Megaphone className="w-14 h-14 mx-auto text-zinc-200 dark:text-zinc-700 mb-4" />
            <p className="text-zinc-500 dark:text-zinc-400 font-semibold">لا توجد منشورات بعد</p>
            {canPost && (
              <p className="text-zinc-400 dark:text-zinc-500 text-sm mt-1">
                كن أول من ينشر خبراً!
              </p>
            )}
          </div>
        )}

        {items.map((item) => {
          const badge = ROLE_BADGE[item.author.role] || ROLE_BADGE.STAFF;
          const canDelete = item.author.id === userId || isOwner;

          return (
            <article
              key={item.id}
              className={`bg-white dark:bg-zinc-900/60 rounded-3xl border shadow-sm overflow-hidden ${
                item.isPinned
                  ? "border-brand-purple/30 dark:border-brand-purple/20 ring-1 ring-brand-purple/10"
                  : "border-zinc-100 dark:border-zinc-800/40"
              }`}
            >
              {/* Pinned badge */}
              {item.isPinned && (
                <div className="bg-brand-purple/5 dark:bg-brand-purple/10 px-5 py-2 flex items-center gap-2 text-xs font-bold text-brand-purple">
                  <Pin className="w-3.5 h-3.5" />
                  مثبّت
                </div>
              )}

              {/* Author row */}
              <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-purple to-brand-magenta flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {item.author.fullName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {item.author.fullName}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                    <span className="text-xs text-zinc-400">{timeAgo(item.createdAt)}</span>
                  </div>
                </div>

                {/* Menu */}
                {(canDelete || isOwner) && (
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === item.id ? null : item.id)}
                      className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                    >
                      <MoreVertical className="w-4 h-4 text-zinc-400" />
                    </button>
                    {menuOpen === item.id && (
                      <div className="absolute left-0 top-10 z-10 w-40 bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-700 overflow-hidden">
                        {isOwner && (
                          <button
                            onClick={() => { handlePin(item.id); setMenuOpen(null); }}
                            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
                          >
                            {item.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                            {item.isPinned ? "إلغاء التثبيت" : "تثبيت"}
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => { handleDelete(item.id); setMenuOpen(null); }}
                            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                            حذف
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="px-5 pb-3">
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap" dir="rtl">
                  {item.content}
                </p>
              </div>

              {/* Media */}
              {item.mediaUrl && (
                <div className="px-5 pb-4">
                  {item.mediaType === "image" ? (
                    <img
                      src={item.mediaUrl}
                      alt="مرفق"
                      className="w-full rounded-2xl object-cover max-h-96"
                    />
                  ) : item.mediaType === "video" ? (
                    <video
                      src={item.mediaUrl}
                      controls
                      className="w-full rounded-2xl max-h-96"
                    />
                  ) : null}
                </div>
              )}
            </article>
          );
        })}

        {/* Load More */}
        {items.length < total && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full py-4 rounded-2xl text-sm font-bold text-brand-purple bg-brand-purple/5 hover:bg-brand-purple/10 transition flex items-center justify-center gap-2"
          >
            {loadingMore ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            {loadingMore ? "جاري التحميل..." : "عرض المزيد"}
          </button>
        )}
      </div>
    </div>
  );
}
