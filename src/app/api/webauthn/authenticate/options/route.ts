import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAuthenticationOptions } from "@/lib/webauthn-server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        webauthnCredentialId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.webauthnCredentialId) {
      return NextResponse.json(
        { error: "No biometric credential registered. Please register first." },
        { status: 400 }
      );
    }

    const options = await getAuthenticationOptions(user.id, user.webauthnCredentialId);

    return NextResponse.json(options);
  } catch (error: unknown) {
    console.error("Authentication options error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
