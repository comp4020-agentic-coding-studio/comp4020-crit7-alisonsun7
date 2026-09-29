import type { APIRoute } from "astro";
import { addReport } from "../../lib/db";
import { bus } from "../../lib/events";
import { printerStatuses } from "../../lib/schema";

// A plain HTML form POSTs here: a status report goes into SQLite and the
// printer's derived status is broadcast to every open SSE connection. The
// 303 redirect makes the form work with no client-side JavaScript at all —
// the submitting tab re-renders from the database; every *other* tab hears
// about it over the stream.
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const printerId = Number(form.get("printerId"));
  const status = String(form.get("status") ?? "");
  const note = String(form.get("note") ?? "").trim();

  if (Number.isInteger(printerId) && printerStatuses.includes(status as (typeof printerStatuses)[number])) {
    const report = addReport(printerId, status as (typeof printerStatuses)[number], note.slice(0, 280) || null);
    if (report) bus.emit("report", report);
  }

  return redirect("/", 303);
};
