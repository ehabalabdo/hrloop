import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getSession } from "@/lib/auth";
import crypto from "crypto";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB for videos

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
  "video/mp4": "video",
  "video/webm": "video",
  "video/quicktime": "video",
};

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "OWNER" && session.role !== "MANAGER")) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "الملف مطلوب" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "حجم الملف يتجاوز الحد المسموح (50MB)" },
        { status: 400 }
      );
    }

    const mediaType = ALLOWED_TYPES[file.type];
    if (!mediaType) {
      return NextResponse.json(
        { error: "نوع الملف غير مدعوم. يُسمح بصور وفيديو فقط" },
        { status: 400 }
      );
    }

    const ext = path.extname(file.name).toLowerCase();
    const safeFileName = `${crypto.randomUUID()}${ext}`;

    const uploadDir = path.join(process.cwd(), "uploads", "news");
    await mkdir(uploadDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(path.join(uploadDir, safeFileName), buffer);

    return NextResponse.json({
      url: `/api/news/media/${safeFileName}`,
      mediaType,
      fileName: safeFileName,
    });
  } catch (error) {
    console.error("News upload error:", error);
    return NextResponse.json(
      { error: "فشل رفع الملف" },
      { status: 500 }
    );
  }
}
