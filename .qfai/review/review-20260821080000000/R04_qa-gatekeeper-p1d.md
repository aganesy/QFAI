# R04 — qa-gatekeeper, P1d branch-3 DR gate (round 7)

- Reviewer: `qa-gatekeeper`
- Stage: `/qfai-atdd spec-0017`, gate **P1d** (sixth pass, fifth re-route)
- Audit subject: `.qfai/decisions/DR-0017-0010-two-tuning-guard-rows-cannot-be-reddened-before-the-history-they-measure-exists.md`,
  plus `.qfai/decisions/CR-20260820-0012-tdd-0069-waits-for-a-ci-run-that-is-gated-on-the-annotation-it-would-justify.md`
  insofar as the `blocked` re-classification hangs on it, and the two rows' handover entries in
  `.qfai/evidence/atdd-spec-0017.md`
- Rows: `TDD-0069`, `TDD-0070`
- Revision reviewed: `9a37421c`
- Prior verdicts: **REVISE** on `16f611c7`, `1473897a`, `54d8d325`, `3f815725`, `cb91e089`
  (`TDD-0069 -> blocked` released on the fourth)
- Verdict: **PASS**, with two conditions on the edit that records it

## Provenance of this run

`git rev-parse --short HEAD` = `9a37421c` at start **and** at finish; `git status --porcelain` empty at
both. HEAD did not move. Nothing was mutated except this file; scratch under `tmp/r04-p1d-round7/`.

HEAD-accurate validate evidence was taken read-only, because `.qfai/report/validate.log` is tracked and
shared: `git archive HEAD` into `tmp/r04-p1d-round7/shadow`, the 83 tracked symlink entries enumerated
from the index and every one confirmed content-reachable (`total=83 missing=0`), then
`validate --profile tdd --fail-on error --root tmp/r04-p1d-round7/shadow` — **unscoped**, the shape the
`build` job's failing step runs. The run-log landed inside the shadow
(`.../shadow/.qfai/report/run-20260821024440280`); the tracked log was not touched. Counts:
`info=5 warning=376 error=3`, the third error being the shadow artifact `QFAI-LINK-001` (70 wrappers
`tar` dereferenced into real directories), excluded exactly as rounds 4-6 excluded it. Real-tree
unscoped error count: **2**. The CLI used was the prebuilt `packages/qfai/dist/cli/index.mjs`;
`git diff cb91e089..HEAD` touches no `src/**`, so it is HEAD-equivalent for the validators.

Live evidence: **23** runs on this branch (20 failure, 3 cancelled, **none green**), and run
`32398791703` at `headSha 9a37421c` — `build` failure, `ci-pass` failure, with `lint`, `detect`,
`check-types`, `check-types-future`, `scanner-coverage` and all **seven** test legs green, including
`test (e2e)`, the project that owns `tests/assets/**`.

## What round 6 required, and what the revision did

| Round-6 required fix | Status |
| --- | --- |
| 1. `atdd-spec-0017.md:879-881` — the "degenerate rather than satisfied" sentence | **Done, at `:940-942`, and now enforced** — Judgement 1 |
| 2. The six round-count sites | **1 of 6 done** (`:899`); five untouched, one newly stale — Judgement 5 |
| 3. `CR-20260820-0012:130` — the "three times" clause | **Done, and its italics twin with it** — Judgement 1 |

The scope of the diff, measured: `git diff --name-only cb91e089..HEAD` returns twelve paths.
**`DR-0017-0010` is not among them.** Its last touch is `c40b2358`, an ancestor of the revision round 6
reviewed, so the DR is byte-identical to what I read last round.

## Verified correct at this HEAD

1. **Row identity is exact on all three fields, both rows**, read column by column against the header
   at `.qfai/specs/spec-0017/tdd/test-list.md:37`
   (`TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Blocked-By | Evidence`):
   `Layer = Integration`, `Test file = packages/qfai/tests/assets/actionPinBumpOwner.test.ts`, and the
   two selectors verbatim, matching the DR (`:39-40`, `:93-94`) and the handover (`:385-386`, `:448-449`).
2. **Nothing has been written ahead of this gate.** Both rows are `Status = todo`, `DR-ID = -`,
   `Blocked-By = -`. The handover says so twice and asserts neither status as already written.
3. **Obligation references are exact.** `06_Test-Cases.md:134-135` — `TC-0017-0069 -> EX-0017-0053`
   (`boundary`), `TC-0017-0070 -> EX-0017-0054` (`error`), both under `AC-0017-0029`, parent
   `US-0017-0007`.
4. **`EX-0017-0053` is still quoted verbatim** (DR 45-46 against `05_Examples.md:84`), both clauses;
   and `EX-0017-0054` / `BR-0017-0054` (`04_Business-Rules.md:103`) do scope the measurement to
   **default-branch** verdict runs **after** a merge, above one in twenty.
5. **The ID space is clean.** `07_Decisions.md` ends at `DR-0017-0009`; one `DR-0017-*` on disk.
6. **The `DR-ID` / `Blocked-By` separation is intact** in the handover table (`:279-282`), with the
   `execution-ledger.md` quotation that makes it matter.
7. **Both errors persist at this HEAD, and the unscoped membership is exactly as the CR records it.**
   My own unscoped run:

   ```text
   QFAI-ATDD-112  15 TC   SPEC-0003 1 (TC-0003-0032)
                          SPEC-0008 4 (TC-0008-0015..0018)
                          SPEC-0015 2 (TC-0015-0035, 0036)
                          SPEC-0017 8 (TC-0017-0016, 0030, 0032..0035, 0069, 0070)
   QFAI-ATDD-111  12 US   SPEC-0003 8 (US-0003-0021..0028), SPEC-0006 1, SPEC-0008 1,
                          SPEC-0015 1, SPEC-0017 1 (US-0017-0007)
   ```

   15 across four specs, 12 across five. `TC-0017-0069` and `TC-0017-0070` are still unannotated;
   `US-0017-0007` is still uncovered.
8. **`TDD-0070`'s own account is sustained, for the seventh round.** The surface `EX-0017-0054`
   measures cannot exist on the branch introducing the tuning: branch 1 fails on the GREEN side,
   branch 2 has no satisfied state to mutate, `exception` with a `DR-*` is the right shape.
9. **The `blocked` clause still applies to `TDD-0069`.** Sixth verification: `CR-20260820-0012` is
   `Status: open`, `Approved by: -`, `Approved option: -`, and names `spec-0017 TDD-0069` in its
   `Blocked set`.
10. **The Coverage Depth Matrix exists at a committed path** — `.qfai/evidence/coverage-depth-spec-0017.md`,
    `git ls-files` confirms it tracked, its `US-0017-0007` row is a full row of unmet cells and is
    justified by name at `:131` (class A, every column enumerated) and again at `:260-273`, and the
    totals are derived by `coverageDepthMatrix.test.ts`. `TC-0017-0069` is the `boundary` case and
    `TC-0017-0070` the `error` case for `AC-0017-0029`, so that AC has both depth categories. Outside
    this gate's subject; recorded because my role contract requires the check from the ATDD cycle onward.
11. **`.qfai/decisions/` is inside both `prettier -c` and `markdownlint`** (neither ignore list covers
    it), and `prettier -c` on both decision records and the evidence file exits 0. `proseWrap` is
    `preserve` and `MD013.line_length` is 200, so the un-reflowed lines the repair left in the CR are
    not a `ci:lint` failure. I checked because the formatter is what defeated the guard last round.

## Judgement 1 — both blocking items are fixed, in both files at once, and I verified it by mutation rather than by eye

This is the first round in seven where an item named second in the fix list was not the one skipped.

**Item 3, the CR.** `CR-20260820-0012:127-131` now reads:

> (An earlier version of this option said clause 1 was "degenerate against this runner". P1d's third
> pass showed that is false: ... `DR-0017-0010` records the history — two wrong readings and one
> correction, not, as an earlier version of this sentence had it, "wrong about clause 1 three times".)

Both refuted wordings are inside double quotation marks, and the count now agrees with the DR at
`:151` ("wrong about clause 1 **twice**") and `:159` ("Two wrong readings and a correction"). **The pair
is consistent in both files simultaneously**, which is what round 6 required and what three prior rounds
each half-did. The CR also names the mechanism honestly at `:133-135`: italics were doing the quoting,
italics are emphasis, and the rule is now enforced by a test rather than announced.

**Item 1, the handover.** `:940-942` now reads: `DR-0017-0010` "now records clause 1 as **unsatisfied** —
not, as an earlier version of this line said, "degenerate rather than satisfied", which P1d refuted by
showing `maxConcurrency` is project-scoped". Correct against the DR at `:144`, and the retracted variant
is quoted rather than asserted.

**I did not take either on inspection.** Copying both decision records to `tmp/` and replaying the
guard's own `flatten` / `quotedSpans` / enclosure predicate over five planted mutations:

```text
DR as committed                       violations: []
DR unquote the real span              violations: ["degenerate against this runner"]
DR italicise that span                violations: ["degenerate against this runner"]
CR as committed                       violations: []
CR unquote "degenerate against ..."   violations: ["degenerate against this runner"]
CR unquote "wrong about clause 1 ..." violations: ["wrong about clause 1 three times"]
CR italicise "degenerate against ..." violations: ["degenerate against this runner"]
```

Note the DR's first two mutations were **no-ops** until I found the real span: the DR quotes the longer
"clause 1's row would still be degenerate against this runner (see above)", so a naive unquote of the
short needle changes nothing. Recorded because a reviewer who stopped at the first attempt would have
reported the DR as unguarded, which is false.

## Judgement 2 — the guard now holds over both decision records, and over everything else this spec owns

Round 6's finding was that the guard was green **because** its list excluded the live violation. Four
things changed and I verified each against the source rather than the docstring:

- **whitespace collapsed on both sides** — `flatten` at `:112-114` applies to haystack (`:151`) and
  needle (`:154`), so a claim straddling Prettier's wrap is visible. Hole 2 closed;
- **no per-entry file list** — `RETRACTED` carries `claim` / `why` only, and `occurrences()` searches
  every claim in every `GOVERNANCE` file. Hole 1 closed at the root, not by adding one entry;
- **quotations extracted per paragraph** — a blank-line split of the raw text at `:150`, so an unbalanced
  quote is bounded. This is the fix for a defect the guard itself caused last round;
- **italics are not quotes** — `flatten` strips `*` and `_`; `quotedSpans` counts only the three
  double-quote characters. Which is exactly what `CR-20260820-0012` had been relying on.

Each of those four is also asserted by its own `it`, and the third `it` is a genuine self-oracle rather
than a restatement. All five tests pass locally
(`pnpm exec vitest run tests/assets/retractedClaims.test.ts` -> 5 passed) and in CI at HEAD.

**And the entry list no longer has a live hole.** I swept **60** markdown files — everything under
`.qfai/decisions/`, `.qfai/evidence/` and `.qfai/specs/spec-0017/` — for all ten listed claims, using
the guard's own predicate. Exactly one unquoted occurrence exists in the whole set:

```text
OUT-OF-SET  .qfai/specs/spec-0017/tdd/test-list.md :: becomes implementable once the pull request has three green
```

That is the file the guard deliberately excludes and the handover names as a writer instruction. Inside
the guard's own file set: **zero**. Round 6's holes 1, 2 and 3 are closed, and hole 3's specific
instance — the variant wording "degenerate rather than satisfied" — is now entry 5.

**Asked whether a retraction from my six passes is still missing: one is, and it is now harmless.**
"NOT BLOCKED by a CR" (pass 1's N1 line and pass 4's A1) has no entry. Its only occurrences anywhere are
`atdd-spec-0017.md:312` and `:318`, both **quoted**, and the two ledger cells in the excluded file. So
adding it costs nothing today and would catch the claim migrating into a file this stage does own. That
is **A1** below, not a hold. Entry 10 — the unreachable exit — was the one I named last round as
missing, and it has been added.

## Judgement 3 — excluding `tdd/test-list.md` is the right call, and one fact decides it

I put the evasion reading first, because it is the same shape I rejected last round: green because the
scope excludes the live violation. Three things separate this from that.

1. **The stage has no write authority there.** The `execution-ledger.md` carve-out gives `Status`,
   `DR-ID`, `Blocked-By` and `Evidence` to `/qfai-implement`; `/qfai-atdd` is never the ledger's
   writer. A guard that reddens on a file the responsible stage may not edit is not a gate, it is a
   permanent break — and it would break `test (e2e)`, which takes `ci-pass` down with it, for a reason
   no one on this stage can clear. Last round's hole was silent and self-serving; this exclusion is
   declared in the docstring at `:34-38` with the reason, and the claim is **routed** rather than dropped.
2. **A needle search over that file would produce a false positive as well as a true one.** Both
   `TDD-0069`'s and `TDD-0070`'s `Evidence` cells open "NOT BLOCKED by a CR". For `TDD-0069` that is
   refuted — it is about to receive `Blocked-By: CR-20260820-0012`. For `TDD-0070` it is **true**: that
   row takes `exception` with a `DR-*` and no `Blocked-By` at all. A per-file scan cannot tell which
   table row a cell belongs to, so the rule as coded would accuse a correct statement. That is not a
   tuning problem; it is the wrong instrument for a per-row obligation.
3. **The exclusion is file-scoped, not claim-scoped.** Entry 10 still carries the unreachable exit, so
   if that claim migrates into a governance file the stage owns, it reddens there.

The compensating control has to be real for this to hold, and it is — Judgement 4.

## Judgement 4 — the handover carries the condition I attached, and it says what I required

`.qfai/evidence/atdd-spec-0017.md:306-330`, section "What the writer must change in the same edit".
Checked against what round 6 required (replace the row's `Evidence` text in the same edit) and against
the cell itself:

- it names the file **and** the line — `tdd/test-list.md:107`;
- it quotes the cell, and every fragment is **verbatim**. I compared the three quoted spans against the
  live cell word for word: "NOT BLOCKED by a CR - waiting on data that does not exist yet",
  "the workflow changes are unmerged and CI has not run them", and "becomes implementable once the pull
  request has three green ci-pass runs to cite". The elisions are marked and nothing is paraphrased;
- it names **three** refuted statements with the reason for each: the negation of the `Blocked-By` the
  row is being given; the obstacle that is not the obstacle (`ci-pass` exists at `ci.yml:469` and has
  run); and the exit my first pass showed unreachable;
- it gives the instruction as an instruction — replace that `Evidence` text in the same edit that
  writes `Blocked-By` — and states the consequence of not doing so;
- and it explains the guard exclusion in the same place, so a reader does not have to reconcile a
  silent gap.

Its attribution is accurate and I checked it rather than assuming:
`review-20260821060000000/R02_completion-reviewer.md:70-72` and `:341-367` raise the same condition. It
under-credits — `R03_qa-gatekeeper.md:538` and `:649` raise it too — which is not a defect.

This is the disposition I asked for, done at the source, in the section a consumer of the handover
reaches. **A1 from round 6 is discharged**, for the row whose write was already released.

## Judgement 5 — the round counts are 1 of 6, and they are not a hold. Here is why, and it is not indulgence

Measured, not read. Five of the six sites I named by line last round are byte-identical at HEAD, and one
that was **correct** at `cb91e089` has gone stale since:

| site | says | truth at `9a37421c` |
| --- | --- | --- |
| `DR-0017-0010:10-12` (`Status`) | "REVISE three times"; "Revised a third time"; "a fourth re-route is owed" | five; not revised this round; a sixth pass is running |
| `atdd-spec-0017.md:439` | "P1d has returned `REVISE` three times" | five |
| `atdd-spec-0017.md:458` | "the row P1d sustained across three passes" | five |
| `atdd-spec-0017.md:797` | "whose account P1d has sustained four times running" | five — correct last round, stale now |
| `atdd-spec-0017.md:899` | "P1d has run **five times** ... REVISE every time" | **correct** — the one that was fixed |
| `atdd-spec-0017.md:973` | "A fourth P1d re-route and a fifth stage round are owed" | contradicted by `:1062` of the same file, which lists round 7 / P1d pass 6 as in flight |
| `atdd-spec-0017.md:1000` | "P1d has returned `REVISE` three times" | five |

**And the commit message claims the repair was general.** `ac4700d1`: "Also corrected: P1d has run
**five** times, not three, and passes 3-5 are recorded with what each found." One site was corrected.
The same message closes "A seventh round and a sixth P1d pass are owed" — so the commit knows the number
the record it is amending still gets wrong at `:973`. That is the "are gone now" shape one round after
the stage shipped a guard against it, relocated from the record into the commit message, which is where
my charter tells me a narrative repair claim carries no weight.

**I am nonetheless not holding the gate on it, and I said so last round in writing.** The round 6 report
ends: "I would not have held the gate on the counts, the two attribution slips, or the guard's holes
alone." That was a termination guarantee, made deliberately, and reneging on it would convert this gate
into an unbounded loop and would be exactly the reviewer-originated escalation `drift-protocol.md`
forbids. Three further reasons, each independent:

- **The counts cannot be correct at the moment of a PASS, by construction.** At the instant this gate
  passes, the true statement is "P1d has run six times, returned REVISE five times, then PASS". No
  revision authored *before* my verdict can say that. `:797` demonstrates the mechanism rather than my
  asserting it: it was **correct** at `cb91e089` and became wrong the moment pass 5 landed. Every count
  site decrements by one on every pass. Requiring them right before the PASS requires the record to
  predict the verdict.
- **No stale count contradicts an instruction, and every one errs conservatively.** Each of the six
  evidence-file sites sits inside a sentence whose operative claim is that the transition is **not** yet
  authorised — `:439`, `:458`, `:797`, `:973` and `:1000` all say the PASS is outstanding. A reader
  misled by "three times" concludes the row is *less* ready than it is, never more. There is no path by
  which a stale round count produces a wrong ledger write. Contrast round 6's B1, which asserted the
  opposite of what the DR says about the anomaly, on the distinction that decides whether it can ever
  clear.
- **The PASS-recording edit must rewrite all six of them anyway.** `qfai-implement/SKILL.md` step 3b
  writes `todo -> exception` only when the entry carries the `qa-gatekeeper` PASS P1d took on that
  `DR-*`, so the stage has to record this verdict in the `TDD-0070` entry before the write exists.
  Every one of the six evidence sites asserts that the PASS is still owed, so every one is false the
  moment the PASS is recorded and must change in that same edit. The condition is not extra work; it is
  the same edit. And the step 3b rule that an entry "absent, names no branch, or is malformed in any
  other way leaves the row at `todo`" enforces it without my inventing a new gate.

The one site the mechanics do **not** force is `DR-0017-0010:10-12`, because the DR's `Status` stays
`open` while the anomaly is unresolved and nothing else compels a touch. I name it explicitly below.

## Gate decision

**PASS** on the branch-3 Decision Record `DR-0017-0010` for `TDD-0070`.

My charter's branch-3 rule is that the verdict turns on a `DR-*` that records "what could not be
observed and why each branch was unavailable". `DR-0017-0010` does exactly that, and has for six
rounds: the unobservable surface is a rerun-to-green rate over at least twenty **default-branch**
verdict runs **after** a merge (`EX-0017-0054` / `BR-0017-0054`, quoted and verified); branch 1 is
unavailable **on the GREEN side** — a test that can never pass on this branch is a permanently red test
committed to a shared suite, not a RED observation; branch 2 is unavailable because there is no
satisfied state to mutate, reasoned from the requirement that gives it a **GREEN pair** rather than from
the wrong clause. The row identity, the obligation reference, the `DR-ID` and the artifact — the four
things `red-provenance.md` fixes as my subject — are present and exact, and were recorded in
`58c29d9f` before any gate routed.

**What changed this round is not the DR; it is that the record around it no longer contradicts it.**
Round 6 sustained the DR whole and held on two sentences elsewhere. Both are repaired, at the source, in
both files simultaneously, and — for the first time in this sequence — the repair is **enforced by an
executable predicate that I demonstrated discriminates**, over a set I widened to 60 files and found
clean. That is the difference between this round and the last: not a shorter list of prose defects, but
a mechanism that makes the class of defect detectable by someone who is not me.

**`/qfai-implement` MAY write `todo -> exception` with `DR-ID: DR-0017-0010` for `TDD-0070`**, once
the stage records this PASS in that row's entry as step 3b requires. **Two conditions on that edit**, both
of them the record's own consistency rather than fresh gate scope:

1. **The six round-count sites.** `atdd-spec-0017.md:439`, `:458`, `:797`, `:973` and `:1000` are
   all inside sentences asserting the PASS is still owed, so they must be rewritten anyway; write the
   count as **five REVISEs across six passes, then this PASS**, and add a sixth-pass row to the
   "P1d verdicts" section. `:973` must stop saying a fourth re-route is owed when `:1062` of the same
   file lists round 7 as in flight.
2. **`DR-0017-0010:10-12`.** The `Status` line is the one site the mechanics do not force. It currently
   tells a reader the record has been reviewed three times and awaits a fourth. Better still, take
   `CR-20260820-0006`'s own lesson, which this DR cites twice: drop the figure and point at the pack directory,
   which is derivable.

**`/qfai-implement` MAY still write `todo -> blocked` with `Blocked-By: CR-20260820-0012` for
`TDD-0069`.** Released at pass 4 and nothing has regressed: the table row is intact with the blocker in
its own column, the anchored section is coherent about the transition, both retracted sentences are
quotations, the clause has verified six rounds running, and **the condition I attached to that release
is now discharged in the handover** (Judgement 4) rather than left to the writer's memory.

**What this PASS does not do.** Per my charter it covers the observation for this round and nothing
else. It does not ratify item scope, and it does not clear the completion gate. `red-provenance.md` is
explicit that branch 3 does not close a spec: the `exception` needs a user-approved `TDDLIST-001`
waiver or the row stays parked. `US-0017-0007` is still uncovered, the scoped gate is still
`error=2`, the unscoped one still needs 12 US and 15 TCs across five specs, six `blocked` rows remain,
and this stage's status is still `FAIL`. Nothing in this verdict touches any of that.

## Still open — none of it blocking, all of it named so the closure list is complete

- **M1 — option 2's own text.** `CR-20260820-0012:92` still opens "Breaks the cycle for every future
  row of this class, not just this one", which my probe confirms stands as a bare assertion, refuted by
  the paragraph at `:171-176` eighty lines below it. This governs a **user decision**, not a ledger
  write, and `red-provenance.md` puts the option set outside my subject — but a user reads the option
  before the correction. Fix it where the reader meets it, before the approval is sought.
- **A1 — one retraction still absent from the guard's list.** "NOT BLOCKED by a CR". Free to add today
  (both occurrences in governance files are quoted), and it closes the last claim-level gap.
- **A2 — the round table stops at round 4 and misstates my verdict there.** `:946-955` reports round 4's
  `qa-gatekeeper` (P1d) as "3 blocking"; it was **2 blocking** (B1, B2) plus 3 major. There are no
  round-5 or round-6 rows, although both packs are on disk and sealed. Note that
  `stageEvidenceCounts.test.ts` derives file counts, vitest outputs, annotated describes and pack
  seals — but **not** review-round counts, which is why this class keeps surviving.
- **A3 — the DR's untouched housekeeping, all of it round 6's A4.** `:224` still opens "`blocked` was
  considered for both and **is wrong**" and closes by adopting it for `TDD-0069`; the `Rows:` header
  still lists both rows without saying which one it backs; `:210` still groups "These two rows, the six
  `blocked` ones" as distinct categories after one joined the six; the cycle block at `:66-73` is
  still the scoped one where the CR carries the unscoped strand.
- **A4 — two attribution slips inside the DR's repaired paragraph**, unchanged from round 6. `:180`
  credits "P1d's third pass" with a finding that is the **fourth** pass's; `:184` attributes "repair the
  pointer, not the payload" to `CR-20260820-0006`, which names the counting pattern instead.
- **A5 — "has run twelve times on this branch"** (`DR-0017-0010:87`, `atdd-spec-0017.md:398`) is now
  **23** runs, 20 failure and 3 cancelled. The load-bearing point holds; the figure goes stale every
  commit.
- **A6 — the duplicated handover paragraph.** `:284-287` and `:302-304` both say "Neither ledger cell
  has been written". Both true; one is redundant.
- **A7 — the correction table's third pointer.** `:430` sends "branch 3 it is" to "this section's
  opening"; the corrected statement is at `:410`, the fourth paragraph of six. Row 4 resolves.

## Residual risk of this PASS

The row acquires a completion-satisfying status pointing at a record I have now sustained whole twice,
and the risk is not in the record but in the arithmetic around it: if the PASS-recording edit does not
also fix the six count sites and the DR `Status` line, `TDD-0070` will carry `exception` while five
sentences in the handover and the DR's own header say the PASS that authorised it is still outstanding.
That is a self-contradicting entry under the step 3b rule, which would send the row back to `todo`
with a handoff note — so the failure mode is another round, not a wrong write. I have stated it as a
condition rather than a hold because the edit that records the PASS must touch every one of those
sentences regardless, and because no revision authored before this verdict could have stated the count
correctly.

The larger residual risk is unchanged and is not mine to clear: the `exception` parks an obligation
that only a merge plus twenty default-branch runs can discharge, and it needs a user-approved
`TDDLIST-001` waiver or the spec stays open. It does.

## Sign-off

- [x] Review verdict is explicit — **PASS**, with two named conditions on the edit that records it, and
      `TDD-0069 -> blocked` still released
- [x] Findings cite concrete artifacts, line numbers, a replicated and **mutation-tested** run of the
      guard's own predicate over both decision records, a 60-file sweep of its claim list, a HEAD-accurate
      unscoped validate run taken read-only in a shadow root, live run ids, and the diff range and file
      list that show exactly what the repair touched
- [x] Required gates and residual risks are recorded
