import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getRegistrationOptions } from "@/lib/webauthn-server";

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
        email: true,
        fullName: true,
        webauthnCredentialId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const options = await getRegistrationOptions(
      user.id,
      user.email,
      user.fullName,
      user.webauthnCredentialId || undefined
    );

    return NextResponse.json(options);
  } catch (error: unknown) {
    console.error("Registration options error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
