# Which stage hands a row over

Split out of `red-provenance.md`, which answers what a RED observation is.
This file answers who takes the row through it and what each stage gate owes
at the handover. `red-provenance.md#which-stage-hands-a-row-over` points here.

All three branches are handed to `/qfai-implement`. None of them writes its own
ledger transition — that skill owns `Status` / `DR-ID` / `Evidence` for every
row — so a row `/qfai-atdd` never hands over stays at `todo` however complete
its work is. What differs is _when_, and a run consisting only of branch-2 or
only of branch-3 rows has to hand them over just as a branch-1 run does.

| Branch           | Handed over                     | Why then                                                                                                                                                                                                                                            |
| ---------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `observed-red`   | P1c, one row at a time          | The row ends with a deliberately failing test and no production code, and P5-P8 need a green suite. A second deliberate RED left open elsewhere fails the first full-suite checkpoint that reaches it.                                              |
| `falsifiability` | P4b, after P4 and before P6     | The trio is produced by Phase Red **step 3c**, the only step that runs the mutation, and the mutation needs the surface P2-P4 build. The trio is the row's RED payload, so P6 has nothing to capture and P8 nothing to judge until step 3c has run. |
| `exception`      | P1d, once the `DR-*` is written | Only `/qfai-implement` can write `todo -> exception`. A run with no branch-1 row otherwise ends with the Decision Record recorded and the ledger untouched.                                                                                         |

A branch-2 row is _passed over_ by `/qfai-implement` when it is not the named
row — see the note above — which is neither a stop nor a defer of the branch:
P4b hands it over in its turn.

### What each stage gate owes

**P1b — choose, for every row.** A row with no branch chosen is the one that
leaves P1b with no legal transition out of `todo`. **The choice is provisional
until the row's own handoff**: re-run the test against the tree as it stands
immediately before handing the row over and take the branch that result names.
An earlier branch-1 row's production code can satisfy a later row's predicate,
so a branch recorded at P1b as `observed-red` can have no observable RED left by
the time that row's turn comes.

**P1b and P1c are one loop per `TDD-ID`**, not two phases. P1c takes each row through
GREEN and its checkpoint before the next row's failing test is written; completing every
branch-1 RED in P1b first would leave several deliberate failures open at once, and any
checkpoint that runs the full suite sees all of them. This file does not restate which
rows those are, or how often they come: the cadence is defined only in
`../../qfai-implement/references/relevant-test-suite.md#checkpoint-boundaries` and
this file states no condition of its own. Deferring the RED does not escape it either — a
spec cannot be declared complete without the spec-level boundary, which runs the full
suite unconditionally — so a stray RED is reached at the latest there, and the row whose
checkpoint it fails is then stranded at `refactor`, which Phase Red does not re-select.

**P1c — discharge branch 1, one row at a time.** Branch 1 ends with a
deliberately failing test and no production code, and this stage does not write
that code. P5-P8 require the suite and the repo quality gates to pass, which
the RED makes impossible, so the handover is not deferred to the end: run
`/qfai-implement` for the row now, let its Phase Green build the surface and
take the GREEN, and return with the tree green. Name the row in the handoff —
`/qfai-implement` passes over a branch-2 row sitting above it rather than
stopping, which is what keeps this round-trip from deadlocking against its own
P6.

**What the blocking `qa-gatekeeper` judges.** The `red` phase's gatekeeper
judges the rows that have evidence at P1b — the branch 1 ones. It cannot judge a
branch 2 row there: that row's payload is the falsifiability trio, which does
not exist yet by the same rule that lets the row leave P1b. A run whose rows are
all branch 2 passes P1b with nothing submitted, and its rows are gated when the
trio lands.

If the entry is absent, names no branch, or is malformed in any other way, the
row **stays at `todo`** and `/qfai-implement` **stops with a handoff note**.
Writing `red` first and discovering the gap afterwards parks a `red` row with
no RED behind it; inventing one for a test it did not author is a drift
violation, not a recovery.
