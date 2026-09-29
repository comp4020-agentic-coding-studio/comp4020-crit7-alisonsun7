import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { type Printer, type PrinterStatus, type Report, printers, reports } from "./schema";

// One SQLite file is the app's whole persistent state. In production
// fly.toml points DATABASE_PATH at the machine's volume (/data), which is
// how state survives a reload and a redeploy; locally it defaults to an
// untracked file in .data/.
const path = process.env.DATABASE_PATH ?? "./.data/app.db";
mkdirSync(dirname(path), { recursive: true });

const client = new Database(path);
client.pragma("journal_mode = WAL");

export const db = drizzle(client);

// Migrations run at boot, on whatever machine holds the volume — the
// recommended shape for SQLite on Fly, where there's no separate machine to
// run them from. The flow: edit src/lib/schema.ts, `pnpm db:generate`,
// commit the migration it writes to drizzle/.
migrate(db, { migrationsFolder: "./drizzle" });

// A fresh volume (or a spec test's throwaway database) starts with no
// printers to report on, so seed the handful this prototype demos against.
// Names are illustrative locations, not a claim about any specific real
// machine's current state.
if (db.select().from(printers).all().length === 0) {
  db.insert(printers)
    .values([
      { name: "Level 1 printer", location: "Library — Level 1" },
      { name: "Level 2 printer", location: "Library — Level 2" },
      { name: "Foyer printer", location: "Library — Foyer" },
    ])
    .run();
}

export type { Printer, Report, PrinterStatus };

export type PrinterWithStatus = Printer & {
  status: PrinterStatus | null;
  statusNote: string | null;
  statusAt: string | null;
};

// A printer's current status is derived from its latest report, not stored —
// one source of truth instead of two that can drift apart.
export function listPrinters(): PrinterWithStatus[] {
  const allPrinters = db.select().from(printers).orderBy(printers.id).all();
  const latestByPrinter = new Map<number, Report>();
  for (const report of db.select().from(reports).orderBy(desc(reports.id)).all()) {
    if (!latestByPrinter.has(report.printerId)) {
      latestByPrinter.set(report.printerId, report);
    }
  }
  return allPrinters.map((printer) => {
    const latest = latestByPrinter.get(printer.id);
    return {
      ...printer,
      status: (latest?.status as PrinterStatus | undefined) ?? null,
      statusNote: latest?.note ?? null,
      statusAt: latest?.createdAt ?? null,
    };
  });
}

export type ReportWithPrinter = Report & { printerName: string; printerLocation: string };

export function listRecentReports(limit = 20): ReportWithPrinter[] {
  return db
    .select({
      id: reports.id,
      printerId: reports.printerId,
      status: reports.status,
      note: reports.note,
      createdAt: reports.createdAt,
      printerName: printers.name,
      printerLocation: printers.location,
    })
    .from(reports)
    .innerJoin(printers, eq(reports.printerId, printers.id))
    .orderBy(desc(reports.id))
    .limit(limit)
    .all();
}

export function addReport(printerId: number, status: PrinterStatus, note: string | null): ReportWithPrinter | null {
  const printer = db.select().from(printers).where(eq(printers.id, printerId)).get();
  if (!printer) return null;
  const report = db.insert(reports).values({ printerId, status, note }).returning().get();
  return { ...report, printerName: printer.name, printerLocation: printer.location };
}
