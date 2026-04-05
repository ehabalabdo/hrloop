import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

// Max 10MB per file
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "OWNER" && session.role !== "MANAGER")) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const formData = await request.formData();
    const userId = formData.get("userId") as string;
    const file = formData.get("file") as File | null;

    if (!userId || !file) {
      return NextResponse.json(
        { error: "بيانات ناقصة" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "حجم الملف يتجاوز الحد المسموح (10MB)" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "نوع الملف غير مدعوم" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 });
    }

    const blob = await put(`employees/${userId}/${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    });

    const doc = await prisma.employeeDocument.create({
      data: {
        userId,
        fileName: blob.url,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      },
    });

    return NextResponse.json({
      success: true,
      document: {
        id: doc.id,
        fileName: doc.fileName,
        originalName: doc.originalName,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        uploadedAt: doc.uploadedAt,
      },
    });
  } catch (e) {
    console.error("Upload failed:", e);
    return NextResponse.json(
      { error: "فشل في رفع الملف" },
      { status: 500 }
    );
  }
}
