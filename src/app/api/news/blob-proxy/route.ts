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
    const res = await fetch(downloadUrl, { cache: "no-store" });

    if (!res.ok) {
      console.error("Blob fetch failed:", res.status, res.statusText);
      return NextResponse.json({ error: "فشل تحميل الملف" }, { status: 502 });
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    console.error("Blob proxy error:", error);
    return NextResponse.json({ error: "فشل تحميل الملف" }, { status: 500 });
  }
}
