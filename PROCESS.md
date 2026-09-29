# Process overview

## What I built

A shared printer status board — report what a printer actually has right now
(OK, low paper, low toner, jammed, broken) so the next person doesn't queue
for a job it can't finish. `README.md` has the full account of what it is and
what good means here; this is how I got there.

## How I got here

I directed the agent with the idea already sliced, not the mechanics: a few
printers, a status report per printer (paper / toner / jammed / broken / OK),
a list that shows the latest status after a reload. I pointed it at crit 7's
published spec and left the implementation — schema, routes, live updates,
tests, this file — to it, reviewing the result rather than the intermediate
steps.

Grounding: the printers/reports schema in `src/lib/schema.ts` predates this
session's visible work (it was already sitting uncommitted when the agent
picked the task up), so the agent's first move was reading that schema back
before touching it, rather than assuming its own design. Building from it, the
agent chose to derive a printer's status from its latest `reports` row instead
of storing a `status` column on `printers` — one source of truth instead of
two that can drift, and the right call given the schema already separated the
two tables. That shaped `listPrinters` in
[`2eb4ee7`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-alisonsun7/commit/2eb4ee7).

Landing the feature took three commits: schema and migrations first
([`2eb4ee7`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-alisonsun7/commit/2eb4ee7)),
then the printer/report routes and pages replacing the guestbook
([`395809e`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-alisonsun7/commit/395809e)),
then a spec test proving the reload-persistence and live-broadcast promises
against the running app, mirroring the retired guestbook check
([`3fcbf57`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-alisonsun7/commit/3fcbf57)).

Correcting: mid-implementation, the agent's own first draft of the live-update
script built the new feed item with `innerHTML` and a template string carrying
the user-submitted note field straight through — an XSS hole the moment
someone reports a printer with markup in the note. It caught this itself
before committing and rebuilt that block with `textContent`/`append()`
instead, which is what `395809e` actually contains; I checked the diff against
that class of bug before accepting it, since a form with a free-text field is
exactly where I'd expect an agent to reach for the convenient unsafe API.
`pnpm check` is green on all 28 tests, including the accessibility floor.

## Before you ship

`pnpm check:evidence` passes locally.
