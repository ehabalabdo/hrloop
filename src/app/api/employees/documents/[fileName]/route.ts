import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileName: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { fileName } = await params;

    // Look up document record
    const doc = await prisma.employeeDocument.findFirst({
      where: { fileName },
    });
    if (!doc) {
      return NextResponse.json({ error: "الملف غير موجود" }, { status: 404 });
    }

    // STAFF can only view their own files
    if (session.role === "STAFF" && doc.userId !== session.userId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const filePath = path.join(process.cwd(), "uploads", "employees", fileName);
    const fileBuffer = await readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(doc.originalName)}"`,
        "Content-Length": String(doc.fileSize),
      },
    });
  } catch {
    return NextResponse.json({ error: "فشل في تحميل الملف" }, { status: 500 });
  }
}
