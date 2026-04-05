import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import crypto from "crypto";

// Max 10MB per file
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "حجم الملف يتجاوز الحد المسموح (10MB)" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "نوع الملف غير مدعوم. يُسمح بـ PDF, صور, و Word فقط" },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 });
    }

    // Generate safe filename
    const ext = path.extname(file.name).toLowerCase();
    const safeFileName = `${userId}_${crypto.randomUUID()}${ext}`;

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), "uploads", "employees");
    await mkdir(uploadDir, { recursive: true });

    // Write file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(path.join(uploadDir, safeFileName), buffer);

    // Save record in database
    const doc = await prisma.employeeDocument.create({
      data: {
        userId,
        fileName: safeFileName,
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
