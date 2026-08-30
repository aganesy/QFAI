# Upstream Artifact Ordering

What to do when a row's own test asserts over the **content** of an artifact this skill may not write
— a decision record in `07_Decisions.md`, a contract, another spec file.

## The row is not implementable here, and all three moves lose

1. **Write the artifact.** Forbidden: `07_Decisions.md` and `09_delta.md` are upstream SSOT this skill
   may not patch, and writing spec artifacts other than this skill's own ledger belongs to `/qfai-sdd`.
2. **Leave the row at `todo` and say nothing.** Correct by the letter, and it strands the row on an
   artifact only another skill can produce, with no mechanism that summons that skill. A later reader
   sees a row waiting on nothing in particular and waits with it.
3. **Weaken the assertion** so it no longer needs the artifact. Forbidden, and it discards the
   obligation the row exists to carry.

None of the three is a good outcome, which is why the situation is a defect in the arrangement rather
than a decision for the agent that meets it.

## What to do instead

Stop at the row. Raise a Change Request naming the artifact and the rows that read it, and let
`/qfai-sdd` produce it. The row stays where it is until that lands — the Change Request is the
mechanism that summons the other skill, which is the thing option 2 above is missing.

Record the artifact's absence as the reason, not the calendar. A row whose recorded anomaly says
"waiting" tells the next reader to wait; a row that names the missing artifact tells them what to go
and get.

## The constraint that prevents it

`/qfai-sdd` carries the other half: a test case whose assertion reads an upstream artifact's content
must not be written before that artifact exists. This file is what to do when you meet a row written
before that constraint was in force.
