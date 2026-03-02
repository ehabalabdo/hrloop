import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const results: Record<string, unknown> = {};

  // Step 1: Check env
  results.hasDbUrl = !!process.env.DATABASE_URL;
  results.dbUrlPrefix = process.env.DATABASE_URL?.substring(0, 30) + "...";

  // Step 2: Test neon() direct
  try {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`SELECT COUNT(*) as cnt FROM users`;
    results.neonDirect = { ok: true, count: rows[0].cnt };
  } catch (e) {
    results.neonDirect = { ok: false, error: String(e) };
  }

  // Step 3: Test Pool directly (no Prisma)
  try {
    const { Pool } = await import("@neondatabase/serverless");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
    const client = await pool.connect();
    const res = await client.query("SELECT COUNT(*) as cnt FROM users");
    results.poolDirect = { ok: true, count: res.rows[0].cnt };
    client.release();
  } catch (e) {
    results.poolDirect = { ok: false, error: String(e), stack: (e as Error).stack?.substring(0, 300) };
  }

  // Step 4: Test Pool with parsed params (no Prisma)
  try {
    const { Pool } = await import("@neondatabase/serverless");
    const dbUrl = new URL(process.env.DATABASE_URL!);
    const pool = new Pool({
      host: dbUrl.hostname,
      port: parseInt(dbUrl.port || "5432"),
      database: dbUrl.pathname.slice(1),
      user: decodeURIComponent(dbUrl.username),
      password: decodeURIComponent(dbUrl.password),
      ssl: true,
    });
    const client = await pool.connect();
    const res = await client.query("SELECT COUNT(*) as cnt FROM users");
    results.poolParsed = { ok: true, count: res.rows[0].cnt };
    client.release();
  } catch (e) {
    results.poolParsed = { ok: false, error: String(e), stack: (e as Error).stack?.substring(0, 300) };
  }

  // Step 5: Test Client directly
  try {
    const { Client } = await import("@neondatabase/serverless");
    const client = new Client(process.env.DATABASE_URL!);
    await client.connect();
    const res = await client.query("SELECT COUNT(*) as cnt FROM users");
    results.clientDirect = { ok: true, count: res.rows[0].cnt };
    await client.end();
  } catch (e) {
    results.clientDirect = { ok: false, error: String(e), stack: (e as Error).stack?.substring(0, 300) };
  }

  // Step 4: Test Prisma with neon() HTTP adapter
  try {
    const { PrismaClient } = await import(".prisma/client");
    const { neon } = await import("@neondatabase/serverless");
    const { PrismaNeon } = await import("@prisma/adapter-neon");

    const sql = neon(process.env.DATABASE_URL!);
    const adapter = new PrismaNeon(sql as any);
    const prisma = new PrismaClient({ adapter } as any);

    const count = await prisma.user.count();
    results.prismaNeonHttp = { ok: true, count };
    await prisma.$disconnect();
  } catch (e) {
    results.prismaNeonHttp = { ok: false, error: String(e), stack: (e as Error).stack?.substring(0, 500) };
  }

  return NextResponse.json(results, { status: 200 });
}
