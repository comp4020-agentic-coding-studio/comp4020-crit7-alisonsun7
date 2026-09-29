# Crit 7 reflection

**What was the breakthrough that moved the work forward?**

Deciding not to store status. My first framing of "printer status" was a
mutable field on the printer row, updated whenever someone reports. Reading
back the schema before building on it, the more useful shape was obvious: a
printer's status is *derived* from its latest report, never written directly.
That single decision removed a whole class of bug (a cached status field
disagreeing with the report that's supposed to justify it) before it could
exist, and it's the kind of thing that's much cheaper to get right in the data
model than to patch later with a reconciliation job. The breakthrough wasn't a
clever feature — it was noticing that "current state" and "history of reports"
are the same information asked two different ways, so one of them should be
computed, not stored.

**What did this work change about who I want to be as a software developer?**

I want to be someone who checks the agent's output for the failure modes I
already know to look for, not just whether the feature works. The live-update
script's first draft built HTML with a template string carrying a user-typed
note straight through — an XSS hole the form makes trivial to hit. It got
caught and fixed before it shipped, but only because that's a pattern I know
to look for in exactly this shape of code: free-text field, DOM update,
string concatenation. That's the habit worth keeping — reading generated code
against a mental checklist of "how would I attack this," not just "does it
render."
