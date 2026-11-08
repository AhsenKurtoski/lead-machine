import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// The same code runs in local Node and in a Cloudflare Worker:
// - locally Prisma uses the SQLite file from DATABASE_URL;
// - on Cloudflare it uses the D1 binding named DB.
// A Proxy is needed because Cloudflare bindings are only available inside a
// request, while this module is evaluated once per Worker isolate.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function isD1(): boolean {
  return process.env.DATABASE_PROVIDER === "d1";
}

function createClient(): PrismaClient {
  if (isD1()) {
    const { env } = getCloudflareContext();
    if (!env.DB) throw new Error("Binding D1 'DB' non configurato.");
    return new PrismaClient({
      adapter: new PrismaD1(env.DB),
      log: ["error"],
    });
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function client(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createClient();
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const value = client()[property as keyof PrismaClient];
    return typeof value === "function" ? value.bind(client()) : value;
  },
});

if (process.env.NODE_ENV !== "production" && !isD1()) {
  // Keep the local dev hot-reload from opening a new SQLite connection each time.
  globalForPrisma.prisma = client();
}
