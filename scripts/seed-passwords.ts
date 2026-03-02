// ============================================================
// Seed Password Script
// Sets a default password for all users who don't have one yet.
// Run: npx tsx scripts/seed-passwords.ts
// ============================================================

import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";

const DEFAULT_PASSWORD = "HRLoop2024!";
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}

async function seedPasswords() {
  const sql = neon(DATABASE_URL!);
  
  console.log("🔐 Hashing default password...");
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  
  console.log("📋 Finding users without passwords...");
  
  // Update all users that have empty or placeholder passwords
  const result = await sql`
    UPDATE users 
    SET password_hash = ${hash}
    WHERE password_hash = '' OR password_hash = 'NOT_SET' OR password_hash IS NULL
    RETURNING id, full_name, email, role
  `;

  if (result.length === 0) {
    console.log("✅ All users already have passwords set.");
  } else {
    console.log(`✅ Updated ${result.length} users with default password:`);
    for (const user of result) {
      console.log(`   - ${user.full_name} (${user.email}) [${user.role}]`);
    }
  }
  
  console.log(`\n🔑 Default password: ${DEFAULT_PASSWORD}`);
  console.log("⚠️  Please change passwords after first login!");
}

seedPasswords().catch(console.error);
