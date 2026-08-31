# Change Request

- ID: `CR-20260820-0002`
- Title: `TC-0017-0063 and EX-0017-0055 require a runner behaviour vitest does not implement — an unknown project name is filtered, not rejected`
- Raised by: `/qfai-implement orchestrator, spec-0017 change 5; the assertion was written as specified, the mutation oracle proved it vacuous, and both states were then measured directly`
- Raised at: `2026-08-20T00:00:00Z`
- Class: `intent`
- Status: `approved`
- Approved by: `user (interactive decision, /qfai-sdd session)`
- Approved at: `2026-08-23T00:00:00Z`
- Approved option: `A` — the runner filters an unknown project name, it does not reject it
- Applied at: `2026-08-23T00:00:00Z` — TC-0017-0063 and EX-0017-0055 reworded to the observable vitest implements
- Superseded by: `-`
- Blocked set: `none — TDD-0063 is implemented against the intent; what is open is which text moves`

## The specified observable does not exist

`TC-0017-0063` (boundary): "Selecting the deleted project name **fails to resolve** instead of matching
zero files."

`EX-0017-0055`: "Deleted, and its name **no longer resolves** as a project selector."

Both sentences assume the runner distinguishes an unknown project name from a known one with no files
behind it. It does not. Measured on the runner this package pins, same command, two tree states:

```text
A  project ABSENT  (the state change 5 produced)
   exit status 1
   | RUN  v2.1.9 .../packages/qfai
   | projects: compatibility
   | No test files found, exiting with code 1

B  project PRESENT, its include directory missing
   exit status 1
   | RUN  v2.1.9 .../packages/qfai
   | projects: compatibility
   | [compatibility] Config
   |   include: tests/compatibility/**/*.test.ts
   |   exclude: ...
   | No test files found, exiting with code 1
```

`--project <name>` does not reject an unknown name; it filters the project set to nothing. The exit
status is 1 in both states, for the same reason and with the same message. The only difference in the
whole output is a `[compatibility] Config` echo, which is reporter output.

## How this was found, rather than argued

The first draft of the row asserted exactly what the TC says — `expect(status).not.toBe(0)` — and it
passed. The mutation oracle is what contradicted it: round R1 restored the deleted project, and the
fresh-failure set was

```text
R1  fresh: :162:78  :165:8  :170:71  :198:12
```

four locations, none of them the spawn. A mutation that recreates precisely the defect the row exists to
detect left that assertion green, which is the definition of a vacuous assertion. The two-state
measurement above was taken afterwards to explain why.

Also worth recording: the docblock I had written asserted that a zero-file project "resolves, matches
nothing, and **exits 0**". That was never measured and is false. Three separate prose claims in this row
were wrong before measurement — the exit-0 premise, a claim that `tests/compatibility/` "never existed"
(it held four tests, removed in `c47d3db5`), and the implied claim that the project was the only
instance of the defect.

## What the row asserts now, and why it is stronger than the literal wording

`TDD-0063` asserts what actually differs between the two states, plus the general invariant behind the
boundary:

1. the deleted name is not declared in the runner workspace;
2. its include directory is gone;
3. every declared include glob has the shape the population check can count;
4. **every declared include glob has at least one test file behind it.**

Claim 4 is the reason this matters beyond wording. The tree held a **second, live instance** of the same
defect: the `integration` project declared a glob under `tests/review`, and that directory has not
existed since `017fe9fd` deleted the last file under it. The glob was correct when `48f4f3a6` wrote it.
Because `integration` has four other globs with files behind them, a per-project check — and every
formulation scoped to the one deleted name — passes straight over it. The per-glob invariant reddened on
it immediately, and change 5 removes it.

Oracle rounds R6 and R7 confirm claims 3 and 4 discriminate rather than overlap: planting a dead glob
reddens only claim 4, and planting a glob whose shape the counter cannot handle reddens only claim 3.

## Disclosure: option A is already in the tree

**Added 2026-08-20, after review finding B1.** The options above are presented as a choice, and one
of them has already been made. That has to be stated before anyone reads them as open.

`TC-0017-0063`'s ledger `Selector` and the test's `describe` title both read **"no declared slice can
match zero test files"** — which is option A's proposed wording, verbatim. Recorded here rather than
left for a reviewer to find twice:

```text
a23220de (ledger seed)  Selector: TC-0017-0063 (TDD-0063): the deleted project name no longer resolves   status todo
01c9f6ff (change 5)     Selector: TC-0017-0063 (TDD-0063): no declared slice can match zero test files   status refactor
```

**Why the edit was permitted at the moment it was made.** The Drift Protocol allows the `Selector`
cell to be edited while `selectorResolves` is false. At the seed commit the row's test file did not
exist, so the selector resolved against nothing and the cell was inside the carve-out. It is outside
it now — the selector resolves — so this wording cannot be edited again under the same authority.
That is what makes the disclosure load-bearing rather than a formality: undoing it is no longer a
cell edit.

**What was NOT changed.** `06_Test-Cases.md` is untouched on this branch after the seed commit, and
still reads "The deleted project name no longer resolves / Selecting the deleted project name fails
to resolve instead of matching zero files". So the upstream text and the ledger row currently
disagree, and that live divergence is exactly what this CR exists to resolve. No upstream artifact
was patched to make the row work.

**What this does to the options.** It makes them unequal in a way the section above does not show:

- **Option A** costs an upstream text edit. Nothing in the ledger or the test moves.
- **Options B and C** cost an upstream text edit AND a rewrite of a landed row's selector and
  assertion — a selector that now resolves, so the rewrite needs this CR's approval as its warrant
  rather than the Drift Protocol's carve-out.

That asymmetry is a consequence of the order the work happened in, not an argument for A. It is
stated so the choice is made with it visible; a reader who prefers B or C should read the extra cost
as the price of my having implemented before the text was settled, not as a reason to prefer A.

## Options

**A — reword `TC-0017-0063` and `EX-0017-0055` to the observable that exists (recommended).** The TC
becomes "no declared slice can match zero test files": the deleted name is absent from the declaration,
and every declared include glob has at least one file behind it. This is what the row now proves, it
keeps the boundary character (the population floor is one, not zero), and it generalises to the second
instance instead of pinning the first.

**B — keep the literal wording and assert on the reporter's `Config` echo.** Writable: the echo appears
only when the project exists. Rejected on cost — it couples a structural obligation to reporter output,
which is not a stability surface, and it still says nothing about any glob other than the deleted one.

**C — keep the wording and mark the row an exception.** Honest but wasteful: it discards a claim that
already found a real defect, and leaves the population invariant unowned.

## Why this is filed rather than decided

Option A edits `06_Test-Cases.md` and `05_Examples.md` — spec text, upstream of the ledger row. The
measurement settles what the runner does; it does not settle whether the specification should be
reworded or the row re-scoped, and rewriting a boundary TC's meaning to match what I could implement is
exactly the move the drift protocol exists to prevent. The row ships against the intent, the divergence
from the literal text is recorded here and in
`.qfai/evidence/implement-spec-0017.md#tdd-0063`, and the wording waits for the user.

## Related

- `BR-0017-0055`, `AC-0017-0027`, `EX-0017-0055`, `TC-0017-0063`
- `spec-0017` `TDD-0063`, `packages/qfai/tests/scripts/sliceSurfaceAlignment.test.ts`
- `017fe9fd`, `48f4f3a6`, `c47d3db5` — the three commits that produced the two instances

## Impact

- Specs: `spec-0017 — TC-0017-0063 and EX-0017-0055`
- Plans: `none`
- Tests: `packages/qfai/tests/scripts/sliceSurfaceAlignment.test.ts — TDD-0063`
- Contracts: `none`
- Schema: `none`

## Decision needed from user

Take option A — reword `TC-0017-0063` and `EX-0017-0055` to "no declared slice can match zero test
files", the observable that exists and the one the row already proves — or keep the literal wording
and accept option B's coupling to reporter output, or option C's exception?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd` rerun scope: move the text, not the test. Reword `TC-0017-0063` and `EX-0017-0055` in
   `spec-0017` to the observable vitest actually implements — an unknown project name is filtered,
   not rejected. Mode: **`re-derive`**. The TC and EX wording is what changes, so the artifact is
   regenerated rather than confirmed. Note the asymmetry the disclosure section records: the
   ledger row and the test already carry option A's wording, so a `re-derive` that chose option B
   or C would also sweep this row.
2. Downstream ledger sweep: **no rows are reset** under the recommended option, because the row is
   implemented against the intent and its evidence stays true. Named so a later sweep cannot widen:
   - not reset under option A: `TDD-0063`
   - conditional reset under option B or C: `TDD-0063` alone, since no other row asserts over the
     unknown-project observable.
3. Cross-check after applying: the row's `Selector` and its assertion must both describe a filtered
   project rather than a rejected one, and the evidence cell's citation of this CR for the vacuous
   first draft must end up saying the same thing as this record.

## Resolution

<!--
Filled in when Status leaves `open`. Record the reworded TC and EX text, and the re-measured row.
-->
