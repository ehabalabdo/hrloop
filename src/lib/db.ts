import { PrismaClient } from ".prisma/client";
import { Pool } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";

// Lazy singleton — PrismaClient is NOT created at module-load time.
// This avoids crashes in Vercel serverless where env vars or the
// adapter aren't ready during static analysis / bundling.

const globalForPrisma = globalThis as unknown as {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _prisma: any;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Parse DATABASE_URL and set PG* env vars as fallback
  // This fixes PrismaNeon adapter which creates internal Pool/Client
  // without forwarding the connection string
  try {
    const url = new URL(connectionString);
    if (!process.env.PGHOST) process.env.PGHOST = url.hostname;
    if (!process.env.PGPORT) process.env.PGPORT = url.port || "5432";
    if (!process.env.PGDATABASE) process.env.PGDATABASE = url.pathname.slice(1);
    if (!process.env.PGUSER) process.env.PGUSER = decodeURIComponent(url.username);
    if (!process.env.PGPASSWORD) process.env.PGPASSWORD = decodeURIComponent(url.password);
    if (!process.env.PGSSLMODE) process.env.PGSSLMODE = "require";
  } catch {
    // Ignore parse errors — Pool will use connectionString directly
  }

  const pool = new Pool({ connectionString });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaNeon(pool as any);
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

function getPrisma() {
  if (!globalForPrisma._prisma) {
    globalForPrisma._prisma = createPrismaClient();
  }
  return globalForPrisma._prisma as PrismaClient;
}

// Use a Proxy so that `prisma.user.findMany(...)` etc. work
// without calling prisma at module scope.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (client as any)[prop];
  },
});

export default prisma;
