import { PrismaClient } from "@prisma/client";
declare global { var journalDb: PrismaClient | undefined; var journalDbVersion: number | undefined; }
const cached = global.journalDb;
const db = cached?.journalSettings && global.journalDbVersion === 3 ? cached : new PrismaClient();
if (cached && cached !== db) {
  void cached.$disconnect().catch((error: unknown) => {
    console.error("Could not disconnect the outdated Prisma client", error);
  });
}
if (!db.journalSettings) {
  throw new Error("Prisma client is outdated. Stop the development server, run npm run setup, then restart npm run dev.");
}
if (process.env.NODE_ENV !== "production") { global.journalDb = db; global.journalDbVersion = 3; }
export default db;
