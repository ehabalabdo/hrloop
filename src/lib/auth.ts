// ============================================================
// Auth — Session management via JWT + HTTP-only cookies
// Uses jose for Edge-compatible JWT operations
// ============================================================

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE = "hrloop_session";
const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "hrloop-default-secret-change-in-production-2024"
);

export type SessionPayload = {
  userId: string;
  email: string;
  fullName: string;
  role: "OWNER" | "MANAGER" | "STAFF";
};

// Create a session cookie with JWT
export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

// Get the current session from the cookie
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      fullName: payload.fullName as string,
      role: payload.role as SessionPayload["role"],
    };
  } catch {
    return null;
  }
}

// Delete the session cookie (logout)
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// Verify a JWT token string (for middleware — Edge compatible)
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      fullName: payload.fullName as string,
      role: payload.role as SessionPayload["role"],
    };
  } catch {
    return null;
  }
}
