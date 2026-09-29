import { beforeAll, describe, expect, inject, it } from "vitest";

// The core promise of this prototype: reporting a printer's status persists
// (a fresh page load shows it) and reaches every other open tab live (over
// the SSE stream), the same two platform claims the starter's guestbook
// check made for messages.
const baseUrl = inject("baseUrl");

// Astro checks form POSTs carry a same-origin Origin header (CSRF
// protection); browsers send it automatically, a bare fetch doesn't.
const post = (path: string, body: URLSearchParams) =>
  fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: { origin: baseUrl },
    body,
    redirect: "manual",
  });

describe("printer status reports", () => {
  let printerId: string;

  beforeAll(async () => {
    const res = await fetch(baseUrl);
    const html = await res.text();
    const match = html.match(/id="printer-(\d+)"/);
    if (!match) throw new Error("no seeded printer found on the home page");
    printerId = match[1];
  });

  it("accepts a report and redirects back to the page", async () => {
    const res = await post("/api/reports", new URLSearchParams({ printerId, status: "low_paper" }));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/");
  });

  it("persists the report: a fresh page load reflects the new status", async () => {
    const note = `spec probe ${process.hrtime.bigint()}`;
    await post("/api/reports", new URLSearchParams({ printerId, status: "jammed", note }));

    const res = await fetch(baseUrl);
    const html = await res.text();
    expect(html).toContain(note);
    expect(html).toContain(`id="printer-${printerId}" data-status="jammed"`);
  });

  it("broadcasts new reports over the SSE stream", async () => {
    const note = `live probe ${process.hrtime.bigint()}`;

    // subscribe first, then post, then read until the event arrives
    const stream = await fetch(new URL("/api/events", baseUrl));
    expect(stream.headers.get("content-type")).toContain("text/event-stream");
    const reader = stream.body?.getReader();
    if (!reader) throw new Error("no response body");

    await post("/api/reports", new URLSearchParams({ printerId, status: "broken", note }));

    const decoder = new TextDecoder();
    let received = "";
    while (!received.includes(note)) {
      const { value, done } = await reader.read();
      if (done) throw new Error("stream ended before the event arrived");
      received += decoder.decode(value, { stream: true });
    }
    await reader.cancel();
    expect(received).toContain(`data: `);
    expect(received).toContain(note);
  }, 10_000);
});
