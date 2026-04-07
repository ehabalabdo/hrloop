import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDownloadUrl } from "@vercel/blob";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "URL مطلوب" }, { status: 400 });
  }

  try {
    const downloadUrl = await getDownloadUrl(url);
    // Redirect to the signed URL — browser will load directly
    return NextResponse.redirect(downloadUrl);
  } catch (error) {
    console.error("Blob proxy error:", error);
    return NextResponse.json({ error: "فشل تحميل الملف" }, { status: 500 });
  }
}
