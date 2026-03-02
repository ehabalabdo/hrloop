import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyAuthentication } from "@/lib/webauthn-server";

export async function POST(request: NextRequest) {
  try {
    const { userId, authentication } = await request.json();

    if (!userId || !authentication) {
      return NextResponse.json(
        { error: "userId and authentication are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        webauthnCredentialId: true,
        webauthnPublicKey: true,
        webauthnSignCount: true,
      },
    });

    if (!user || !user.webauthnCredentialId || !user.webauthnPublicKey) {
      return NextResponse.json(
        { error: "No biometric credential found for this user." },
        { status: 400 }
      );
    }

    // Device binding: verify the credential ID matches what's stored
    if (authentication.id !== user.webauthnCredentialId) {
      return NextResponse.json(
        { error: "Device mismatch. Please use the registered device." },
        { status: 403 }
      );
    }

    const verification = await verifyAuthentication(
      userId,
      authentication,
      user.webauthnCredentialId,
      user.webauthnPublicKey,
      user.webauthnSignCount
    );

    if (verification.verified) {
      // Update the sign count to prevent replay attacks
      await prisma.user.update({
        where: { id: userId },
        data: {
          webauthnSignCount: verification.authenticationInfo.newCounter,
        },
      });

      return NextResponse.json({ verified: true });
    }

    return NextResponse.json(
      { verified: false, error: "Biometric verification failed" },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error("Authentication verify error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
