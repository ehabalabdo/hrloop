import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyRegistration } from "@/lib/webauthn-server";

export async function POST(request: NextRequest) {
  try {
    const { userId, registration } = await request.json();

    if (!userId || !registration) {
      return NextResponse.json(
        { error: "userId and registration are required" },
        { status: 400 }
      );
    }

    const verification = await verifyRegistration(userId, registration);

    if (verification.verified && verification.registrationInfo) {
      const { credential } = verification.registrationInfo;

      // Store credential in the database
      await prisma.user.update({
        where: { id: userId },
        data: {
          webauthnCredentialId: credential.id,
          webauthnPublicKey: Buffer.from(credential.publicKey).toString("base64"),
          webauthnSignCount: credential.counter,
        },
      });

      return NextResponse.json({ verified: true });
    }

    return NextResponse.json({ verified: false, error: "Verification failed" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Registration verify error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
