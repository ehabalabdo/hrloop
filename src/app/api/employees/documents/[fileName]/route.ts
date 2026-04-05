import { NextRequest, NextResponse } from "next/server";
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

    // Look up document record by fileName (which is now a blob URL)
    const doc = await prisma.employeeDocument.findFirst({
      where: {
        OR: [
          { fileName },
          { fileName: { contains: fileName } },
        ],
      },
    });
    if (!doc) {
      return NextResponse.json({ error: "الملف غير موجود" }, { status: 404 });
    }

    // STAFF can only view their own files
    if (session.role === "STAFF" && doc.userId !== session.userId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    // Redirect to Vercel Blob URL
    return NextResponse.redirect(doc.fileName);
  } catch {
    return NextResponse.json({ error: "فشل في تحميل الملف" }, { status: 500 });
  }
}
