import { PrismaClient } from ".prisma/client";
import { neon } from "@neondatabase/serverless";
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

  // Parse DATABASE_URL and set PG* env vars.
  // PrismaNeon adapter internally creates Pool/Client connections
  // that fall back to these env vars for connection info.
  try {
    const url = new URL(connectionString);
    process.env.PGHOST = url.hostname;
    process.env.PGPORT = url.port || "5432";
    process.env.PGDATABASE = url.pathname.slice(1);
    process.env.PGUSER = decodeURIComponent(url.username);
    process.env.PGPASSWORD = decodeURIComponent(url.password);
    process.env.PGSSLMODE = "require";
  } catch {
    // Ignore parse errors
  }

  // Use neon() HTTP function — works reliably on Vercel serverless
  const sql = neon(connectionString);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaNeon(sql as any);
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
