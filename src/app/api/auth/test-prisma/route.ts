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

  // Step 3: Test Prisma
  try {
    const { PrismaClient } = await import(".prisma/client");
    const { Pool } = await import("@neondatabase/serverless");
    const { PrismaNeon } = await import("@prisma/adapter-neon");

    const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
    const adapter = new PrismaNeon(pool as any);
    const prisma = new PrismaClient({ adapter } as any);

    const count = await prisma.user.count();
    results.prismaPool = { ok: true, count };
    await prisma.$disconnect();
  } catch (e) {
    results.prismaPool = { ok: false, error: String(e), stack: (e as Error).stack?.substring(0, 500) };
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
