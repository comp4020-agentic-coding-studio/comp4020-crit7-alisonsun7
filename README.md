# Printer status

The ANU library printer, every semester: you queue for a print job that turns
out to be impossible because the machine is out of paper or toner, and nobody
told you. This is the full-stack replacement I wish existed — a shared status
board for a small set of printers. Anyone can report what a printer actually
has right now (OK, low paper, low toner, jammed, broken, plus an optional
note), and everyone else sees that report the moment it lands, without
reloading.

Data model: a `printer` (name, location) has many `report`s (status, note,
timestamp). A printer's current status is never stored on the printer row
itself — it's derived by reading its most recent report — so there's exactly
one place a status can live, and no way for a cached "current status" field to
drift out of sync with the report history that's supposed to justify it.

## What good looks like here

**The core loop has to survive a reload and reach other tabs live**, because
that's the entire value of a shared board over a sticky note on the printer:
if my report only helps me, I could have just remembered it myself. Submitting
a report writes to SQLite and redirects the submitting tab, which re-renders
from the database — no client JavaScript required for that half. Every *other*
open tab hears about the new report over a server-sent-events stream and
updates that printer's badge in place. `spec/printer-status.test.ts` checks
both halves of that promise directly against the running app.

**Status is a read, not a write**, on purpose. I could have added an "update
status" button that mutates a `printers.status` column, but that throws away
the history of who reported what and when, and invites the two-sources-of-
truth bug where the stored status and the report log disagree. Deriving it
from `reports` costs one query per page load in exchange for that being
structurally impossible.

**What I chose not to build:** no accounts or named reporters — anyone who can
reach the page can report, which matches how an actual "no paper" sticky note
works and keeps the prototype to the slice the brief asks for; no quota or
per-user print-page tracking, which is a real ANU system but a different one
from "is this printer usable right now"; no photo upload for a jammed tray.
Those are all real features a shipped version would want — they're out of
scope for a week's slice, not overlooked.

**Accessibility and structure** are the same invariants the starter shipped
with (one `<h1>`, a nav landmark, labelled form controls, no axe violations)
plus a status vocabulary (`OK` / `Low paper` / `Low toner` / `Jammed` /
`Broken`) that's colour-coded *and* spelled out as text, so the status isn't
carried by colour alone.

The printer names and locations seeded into a fresh database (`Library —
Level 1/2/Foyer`) are illustrative placeholders for the prototype, not a claim
about any specific machine's current condition.
