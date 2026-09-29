import { sql } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

// The schema is the ground truth for the database. To change it: edit here,
// run `pnpm db:generate` to turn the diff into a migration under drizzle/,
// and commit both — the migration applies automatically when the server
// boots (see src/lib/db.ts), locally and deployed. Never edit the database
// by hand: state on the deployed volume outlives every deploy, and the
// migration trail is what keeps old state and new code compatible.
export const printers = sqliteTable("printers", {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  location: text().notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Printer = typeof printers.$inferSelect;

// A printer's current status is derived from its latest report, not stored —
// one source of truth instead of two that can drift apart.
export const printerStatuses = ["ok", "low_paper", "low_toner", "jammed", "broken"] as const;
export type PrinterStatus = (typeof printerStatuses)[number];

export const reports = sqliteTable("reports", {
  id: int().primaryKey({ autoIncrement: true }),
  printerId: int("printer_id")
    .notNull()
    .references(() => printers.id, { onDelete: "cascade" }),
  status: text().notNull(),
  note: text(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Report = typeof reports.$inferSelect;
