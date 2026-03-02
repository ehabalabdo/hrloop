import { PrismaClient } from ".prisma/client";
import { Pool } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";

// Lazy singleton — PrismaClient is NOT created at module-load time.

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
  // The PrismaNeon adapter internally creates new Client/Pool instances
  // that read from these env vars instead of the connection string.
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

  // Use Pool (WebSocket) — required for full enum support
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
