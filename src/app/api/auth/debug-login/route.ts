import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return NextResponse.json({ step: "ENV", error: "DATABASE_URL not set" });
    }

    const sql = neon(dbUrl);

    // Step 1: Find user
    const users = await sql`
      SELECT id, email, full_name, role, password_hash, is_active
      FROM users
      WHERE email = ${email.toLowerCase().trim()}
      LIMIT 1
    `;

    if (users.length === 0) {
      // Check all emails in DB
      const allEmails = await sql`SELECT email FROM users`;
      return NextResponse.json({ 
        step: "USER_NOT_FOUND", 
        searchedFor: email.toLowerCase().trim(),
        allEmails: allEmails.map((u: Record<string, unknown>) => u.email)
      });
    }

    const user = users[0];

    if (!user.is_active) {
      return NextResponse.json({ step: "USER_INACTIVE", email: user.email });
    }

    // Step 2: Compare password
    const hashFromDb = user.password_hash as string;
    const passwordValid = await bcrypt.compare(password, hashFromDb);

    // Step 3: Generate a fresh hash and compare
    const freshHash = await bcrypt.hash(password, 12);
    const freshValid = await bcrypt.compare(password, freshHash);

    return NextResponse.json({
      step: "PASSWORD_CHECK",
      email: user.email,
      role: user.role,
      isActive: user.is_active,
      hashLength: hashFromDb.length,
      hashPrefix: hashFromDb.substring(0, 10),
      hashEnd: hashFromDb.substring(hashFromDb.length - 5),
      passwordMatch: passwordValid,
      freshHashWorks: freshValid,
      passwordLength: password.length,
    });
  } catch (error) {
    return NextResponse.json({ 
      step: "ERROR", 
      message: error instanceof Error ? error.message : String(error) 
    });
  }
}
