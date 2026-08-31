# R04 — qa-gatekeeper, P1d branch-3 DR gate (round 6)

- Reviewer: `qa-gatekeeper`
- Stage: `/qfai-atdd spec-0017`, gate **P1d** (fifth pass, fourth re-route)
- Audit subject: `.qfai/decisions/DR-0017-0010-two-tuning-guard-rows-cannot-be-reddened-before-the-history-they-measure-exists.md`,
  plus `.qfai/decisions/CR-20260820-0012-tdd-0069-waits-for-a-ci-run-that-is-gated-on-the-annotation-it-would-justify.md`
  insofar as the `blocked` re-classification hangs on it, and the two rows' handover entries in
  `.qfai/evidence/atdd-spec-0017.md`
- Rows: `TDD-0069`, `TDD-0070`
- Revision reviewed: `cb91e089`
- Prior verdicts: **REVISE** on `16f611c7`, `1473897a`, `54d8d325`, `3f815725`
  (`TDD-0069 -> blocked` released on the fourth)
- Verdict: **REVISE** — two items, neither of them about the anomaly account

## Provenance of this run

`git rev-parse --short HEAD` = `cb91e089` at start **and** at finish; `git status --porcelain` empty at
both. HEAD did not move. Nothing was mutated except this file; scratch under `tmp/r04-p1d-round6/`.

HEAD-accurate validate evidence was taken read-only, because `.qfai/report/validate.log` is tracked and
shared: `git archive HEAD` into `tmp/r04-p1d-round6/shadow`, the 83 tracked symlink entries enumerated
from the index and every one confirmed content-reachable (`total=83 missing=0`), then
`validate --profile tdd --fail-on error --root tmp/r04-p1d-round6/shadow` — **unscoped**, the shape the
`build` job's failing step runs. The run-log landed inside the shadow
(`tmp/r04-p1d-round6/shadow/.qfai/report/run-20260821010031431`); the tracked log was not touched.
Counts: `info=5 warning=376 error=3`, the third error being the shadow artifact `QFAI-LINK-001` (70
wrappers `tar` dereferenced into real directories), excluded from every count below exactly as rounds 4
and 5 excluded it. Real-tree unscoped error count: **2**. The CLI used was the prebuilt
`packages/qfai/dist/cli/index.mjs`; `git diff 3f815725..HEAD` touches no `src/**`, so it is
HEAD-equivalent for the validators.

Live evidence: **21** runs on this branch (18 failure, 3 cancelled, **none green**), and run
`32388869527` at `headSha cb91e089` — `build` failure, `ci-pass` failure, with `lint`, `detect`,
`check-types`, `check-types-future`, `scanner-coverage` and all **seven** test legs green, including
`test (e2e)`, the project that owns `tests/assets/**`.

## What round 5 required, and what the revision did

| Round-5 required fix                                                                    | Status                                                                          |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1. DR 161-167 — drop "degenerate against this runner (see above)" and the contradiction | **Done, and done well** — Judgement 1                                           |
| 2. DR 151 **and** `CR-20260820-0012`:130 — make the count agree                         | DR **done**; `CR`:130 **untouched** — **B2**                                     |
| 3. `atdd-spec-0017.md:353-360` — repair at the source, replace the "are gone" claim     | **Done at the source**; the recurrence reappeared in another section — **B1**    |
| 4. Promote A1 into the handover                                                          | **Not done** — advisory, and now live                                            |
| 5. Option 2 (M1) and housekeeping (A2-A6)                                                | Option 2's **withdrawal** done and correct (Judgement 5); its text and A2-A6 open |

## Verified correct at this HEAD

1. **Row identity is exact on all three fields, both rows**, against
   `.qfai/specs/spec-0017/tdd/test-list.md:107-108`, read column by column against the header at `:37`
   (`TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Blocked-By | Evidence`):
   `Layer = Integration`, `Test file = packages/qfai/tests/assets/actionPinBumpOwner.test.ts`, and the
   two selectors verbatim, matching the DR (`:40`, `:94`) and the handover (`:360`, `:423`).
2. **Nothing has been written ahead of this gate.** Both rows are `Status = todo`, `DR-ID = -`,
   `Blocked-By = -`. The handover says so and asserts neither status as already written.
3. **Obligation references are exact.** `06_Test-Cases.md:134-135` — `TC-0017-0069 -> EX-0017-0053`
   (boundary), `TC-0017-0070 -> EX-0017-0054` (error), both under `AC-0017-0029`, parent `US-0017-0007`.
4. **`EX-0017-0053` is still quoted verbatim** (DR 45-46 against `05_Examples.md:84`), both clauses; and
   `EX-0017-0054` / `BR-0017-0054` (`04_Business-Rules.md:103`) do scope the measurement to
   **default-branch** verdict runs **after** a merge, above one in twenty.
5. **The ID space is clean.** `07_Decisions.md` ends at `DR-0017-0009`; one `DR-0017-*` on disk.
6. **The `DR-ID` / `Blocked-By` separation is intact** in the handover table
   (`.qfai/evidence/atdd-spec-0017.md:279-282`), with the `execution-ledger.md` quotation that makes it
   matter.
7. **Both errors persist at this HEAD, and the unscoped membership is exactly as the CR records it.** My
   own unscoped run:

   ```text
   QFAI-ATDD-112  15 TC   SPEC-0003 1 (TC-0003-0032)
                          SPEC-0008 4 (TC-0008-0015..0018)
                          SPEC-0015 2 (TC-0015-0035, 0036)
                          SPEC-0017 8 (TC-0017-0016, 0030, 0032..0035, 0069, 0070)
   QFAI-ATDD-111  12 US   SPEC-0003 8 (US-0003-0021..0028), SPEC-0006 1, SPEC-0008 1,
                          SPEC-0015 1, SPEC-0017 1 (US-0017-0007)
   ```

   15 across four specs, 12 across five. `TC-0017-0069` and `TC-0017-0070` are still unannotated, so the
   row's obstacle persists; `US-0017-0007` is still uncovered, so `QFAI-ATDD-111` still stands.
8. **`TDD-0070`'s own account is sustained, for the sixth round.** The surface `EX-0017-0054` measures
   cannot exist on the branch introducing the tuning: branch 1 fails on the GREEN side, branch 2 has no
   satisfied state to mutate, `exception` with a `DR-*` is the right shape. Its handover section
   (`:419-434`) is correct, including that the transition is still owed a P1d PASS.
9. **`TDD-0069`'s `blocked` clause still applies.** Fifth verification: `CR-20260820-0012` is
   `Status: open`, `Approved option: -`, and names `spec-0017 TDD-0069` in its `Blocked set`.
10. **The Coverage Depth Matrix exists at a committed path** — `.qfai/evidence/coverage-depth-spec-0017.md`,
    `git ls-files` confirms it tracked, `## Every ❌ cell, named` carries one justification per cell under
    a completeness / disjointness class taxonomy, and the totals are derived by
    `coverageDepthMatrix.test.ts`. Outside this gate's subject; recorded because my role contract
    requires the check from the ATDD cycle onward.

## Judgement 1 — item 1 is fixed, and this is the first round the DR's analysis is one I sustain whole

`git diff 3f815725..HEAD` shows the split paragraph rewritten, not re-pointed. All three defects round 5
named are gone:

- the assertion is now a quotation — DR 180-184 reads `It read "clause 1's row would still be degenerate
  against this runner (see above)"`, and I confirmed it by enclosure rather than by eye (Judgement 4's
  probe: `DR:181 quoted=true`);
- `(see above)` no longer points a reader at a retraction as if it were support; it sits inside the
  quoted prior text, with "Corrected here" after it;
- the self-contradiction pair is gone. DR 186-191 now says clause 1 is **unsatisfied**, so its
  post-split row is "ordinary work waiting on a tuning change, not an anomaly", the split "does not
  close `TDD-0069` on its own", and what it buys is "the two failures get named separately instead of
  one standing for both". Those three are consistent, and the "reachable half parked behind an
  unreachable one" clause that contradicted them is deleted.

The surviving-assertion pattern is named and described accurately in place ("The CR's twin paragraph was
corrected in the same commit range and this one was not"). Round 5's M2 is disposed of the way round 5
asked: the untriggered / unsatisfied caveat is recorded at DR 163-167 **and marked non-blocking**, with
the reason the row-level conclusion does not rest on it. That is the correct disposition, not a fourth
rewrite.

**Two attribution slips inside the new text**, both advisory. DR 180 credits "P1d's **third** pass" with
finding that the retraction had not reached this paragraph; `review-20260821020000000/R04` contains no
occurrence of "see above" or "option-5 paragraph" — the finding is the **fourth** pass's B1, whose
wording the sentence borrows, and the same file names the fourth pass correctly at 152 and 163. And
DR 184 attributes "repair the pointer, not the payload" to `CR-20260820-0006`, which names the
**counting** pattern instead (`CR-20260820-0006:201-203`, "the number is not the check. Derive it from
the ledger") — a lesson the DR does cite correctly at 157 and 194-196.

## Judgement 2 — item 2 is fixed in the DR and skipped in the CR, which is the third round of this pattern

The DR is right now: `:123` "wrong about clause 1 **twice**, in opposite directions", `:144` "**Third
statement**, and the narrow one", `:151-155` "wrong about clause 1 **twice** ... the statement above is
the third and, per P1d's fourth pass, the correct one", and `:157-161` explaining why the count matters.
Two wrong readings, one correction. Exactly what was asked, and the caveat filed as non-blocking.

`CR-20260820-0012:130` was named by file **and** line in round 5's required item 2, and is untouched in
the diff:

> See `DR-0017-0010`, which has now been wrong about clause 1 **three times** in three directions.

That is **B2**. Note the shape, because this is its third consecutive occurrence: round 4 repaired the
handover table and not the section it anchors; round 5 repaired the CR's option-5 paragraph and not the
DR's twin; round 6 repaired the DR's count and not the CR's twin. Each time, the half that was skipped is
the one the fix list named second.

## Judgement 3 — item 3 is fixed at the source, and the recurrence moved to the section that will carry my PASS

The `### TDD-0069` repair is real, and I verified it by enclosure rather than by reading:

- `.qfai/evidence/atdd-spec-0017.md:369-371` — the retracted branch-1 reason is now a quotation
  (`EVIDENCE:370 quoted=true`), with the true reason stated as the paragraph's own claim;
- `:376-382` — the retracted branch-2 sentence is now a quotation (`EVIDENCE:378 quoted=true`), followed
  by the corrected clause-1 / clause-2 finding, which matches the DR;
- `:389-408` — the "are gone now" claim is replaced by a table of where each correction landed, plus the
  statement that the first two are quoted rather than asserted. That is the right instrument: it is
  checkable, and I checked all four of its rows.

One nit inside that table: row 3 sends "branch 3 it is" to "this section's opening", but the corrected
statement (`**TDD-0070** is branch 3 ... **TDD-0069** is not`) is at `:384`, the fourth paragraph of six.
Row 4's pointer resolves correctly to `:410`.

**And then the same failure appears eighteen lines from where a P1d PASS would be recorded.**
`.qfai/evidence/atdd-spec-0017.md:879-881`, in `### P1d's verdicts`:

> `DR-0017-0010` now records clause 1 as **degenerate rather than satisfied**.

False at this HEAD, in the present tense, about the artifact this gate exists to audit: the DR records
clause 1 as **UNSATISFIED** (`:144`) and retracts "degenerate" by name (`:136-142`, `:151`). That is
**B1**. The same section undercounts the gate history in the same breath (`:859` "P1d has run **three
times**"; `:912` "A fourth P1d re-route and a fifth stage round are owed"), and `### TDD-0070` sends its
reader here: `:434` "The transition itself is still owed a P1d PASS — see § 'P1d's verdicts' below."

## Judgement 4 — the guard is green, and it covers none of the four live instances

`packages/qfai/tests/assets/retractedClaims.test.ts` passes locally
(`pnpm exec vitest run tests/assets/retractedClaims.test.ts` -> 3 passed) and in CI at HEAD (`test (e2e)`
success in run `32388869527`). Its design is a genuine improvement on the vacuous first version:
enclosure is syntactic, the second `it` is a real self-oracle that rejects proximity, and the third keeps
entries matchable. I put my charter's question to it — **does it hold for these two decision records** —
by replicating its own `normalise` / `quotedRanges` / `isQuoted` over the four artifacts. Measured, not
inferred:

```text
"wrong about clause 1 three times"   DR      no occurrence    <- the only file the entry lists
                                     CR:130  quoted=false     <- NOT in the entry's file list
"degenerate against this runner"     DR:181  quoted=true
                                     CR      no occurrence    <- listed, but unmatchable (hole 2)
"because the workflow changes are unmerged"  EVIDENCE:370, :402  quoted=true
"there is no run history to mutate"          EVIDENCE:378, :403  quoted=true
```

Four holes, each demonstrated:

1. **The entry for "wrong about clause 1 three times" lists `[DR]`, where the claim no longer occurs, and
   omits `[CR]`, where it stands unquoted at `:130`** (`retractedClaims.test.ts:87-90`). Adding the CR to
   that one entry reddens the test immediately. The guard is green **because** its list excludes the live
   violation — the weak-oracle shape my charter tells me to reject, arriving one round after the record
   wrote that "prose cannot be trusted to say whether prose was deleted, so the rule is enforced instead
   of announced".
2. **`normalise` strips `*`, `_` and backticks but does not collapse newlines**
   (`retractedClaims.test.ts:99-101`). `CR-20260820-0012:127-128` spells the claim across Prettier's
   wrap — "degenerate against this" / "runner" — so the needle cannot match. Here the CR's usage is a
   legitimate quotation-by-italics, so nothing is laundered; but the guard could not see it either way,
   and by the rule as coded italics is not a quotation, so an unwrapped version of that same sentence
   would redden. The third `it` guards claim **length** (< 80) against rewrapping; length does not stop a
   30-character claim straddling a wrap.
3. **The live instance in the evidence file uses a variant wording** — "degenerate rather than satisfied"
   (`:879-881`) — which no entry carries, while the closest entry does not list the evidence file. A
   literal-substring list tracks wording, not claims.
4. **`.qfai/specs/spec-0017/tdd/test-list.md` is in no entry's file list**, and it carries two refuted
   claims as bare assertions at `:107`: "**NOT BLOCKED by a CR** - waiting on data that does not exist
   yet" (about to be contradicted by the released `Blocked-By: CR-20260820-0012`) and "The row becomes
   implementable once the pull request has three green ci-pass runs to cite" — the exit my first pass
   showed unreachable and the DR retracts at `:75-77`. Its wording also evades the entry that does exist:
   the ledger says "the workflow changes are unmerged and CI has not run them", without the "because"
   the needle requires.

**Asked whether a retraction of mine is missing from the list: yes — the unreachable exit condition**
(pass 1, B2), which is the one refuted claim now standing as a bare assertion in the artifact
`/qfai-implement` writes; "NOT BLOCKED by a CR" is missing for the same reason. I record the reasonable
counter-argument: listing `tdd/test-list.md` would redden a required leg over text this stage may not
edit. That is an argument for promoting **A1** into the handover, not for the docstring claiming
enforcement the guard does not have.

## Judgement 5 — option 2's withdrawal is stated correctly, and the first reason still stands

Both premises re-verified at this HEAD rather than inherited from my own fourth pass.

**The withdrawal** (`CR-20260820-0012:164-170`) says what that pass found and no more: it names the
earlier paragraph's claim as its own error, states that all seven non-`spec-0017` TCs are themselves
`todo`, and concludes that option 2 as worded is general and would clear `QFAI-ATDD-112` outright.
Checked row by row in the owning ledgers — each of the seven has a ledger row, and every row is `todo`:

```text
TC-0003-0032        -> spec-0003 TDD-0032        todo
TC-0008-0015..0018  -> spec-0008 TDD-0015..0018  todo (x4)
TC-0015-0035        -> spec-0015 TDD-0036        todo
TC-0015-0036        -> spec-0015 TDD-0037        todo
```

**The first reason stands, and it is the one carrying the conclusion.** `QFAI-ATDD-111` is a `US`-level
finding — my unscoped run at this HEAD still names `SPEC-0017:US-0017-0007` among its twelve — and it has
no ledger rows to exempt, so an in-flight-row exemption cannot reach it; `--fail-on error` exits 1 at
`error=1`; `build` stays red. The CR's "by the **first** reason given above" resolves to the first bullet
of the same list, and that bullet is accurate.

**What is still open is option 2's own text** (`CR-20260820-0012:92`), which opens "Breaks the cycle for
every future row of this class, not just this one" — the sentence a reader meets first, and false for this
row today by the paragraph seventy lines below it. That was round 5's M1; it stays major, not blocking,
because `red-provenance.md` fixes my subject and the option set is the user's input.

## Blocking findings

### B1 — the section that will carry my PASS states the refuted claim as current fact, and undercounts the gate history

`.qfai/evidence/atdd-spec-0017.md:879-881` asserts that `DR-0017-0010` "now records clause 1 as
**degenerate rather than satisfied**". At this HEAD the DR records it as **unsatisfied** and retracts
"degenerate" three times over. This is not a stale figure; it is the sixth consecutive round in which this
file states something the tree does not hold, it is the same claim in a new place, and it arrives one
round after the stage shipped a guard against exactly that — a guard that cannot see this wording
(Judgement 4, hole 3).

Why it blocks rather than being filed as housekeeping:

- **`### TDD-0070` routes its reader here.** `:434` — "The transition itself is still owed a P1d PASS —
  see § 'P1d's verdicts' below". `references/red-provenance.md:267` makes the entry the table row plus its
  anchored section, and the anchored section's own cross-reference is where a consumer lands next.
- **It is a claim about the audit subject's content**, on the clause three rounds were spent on, and the
  distinction is the one my third pass said was not cosmetic: "unsatisfied" clears the first time a tuning
  pull request lands; "degenerate against this runner" never clears. `exception` is released only by
  `exception -> todo`, so which reading the record carries decides whether anyone retries.
- **`### P1d's verdicts` is where a PASS would be written.** Recording one there while the section says
  P1d has "run **three times** ... and returned **REVISE** every time" would place my verdict next to a
  denial that it exists.

**Second half, same edit — and it would not have held the gate alone.** Every review-round count in the
record is one short, uniformly:

| site                                                       | says                                                        | truth at `cb91e089`               |
| ---------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------- |
| `DR-0017-0010:10-12` (`Status`)                            | "REVISE three times"; "Revised a third time"; "fourth re-route owed" | four; fourth revision; fifth re-route |
| `.qfai/evidence/atdd-spec-0017.md:413`                     | "P1d has returned `REVISE` three times"                     | four                              |
| `.qfai/evidence/atdd-spec-0017.md:432`                     | "the row P1d sustained across three passes"                 | four                              |
| `.qfai/evidence/atdd-spec-0017.md:859`                     | "P1d has run **three times** ... REVISE every time"         | four runs                         |
| `.qfai/evidence/atdd-spec-0017.md:912`                     | "A fourth P1d re-route and a fifth stage round are owed"    | fifth re-route, sixth round       |
| `.qfai/evidence/atdd-spec-0017.md:939`                     | "P1d has returned `REVISE` three times"                     | four                              |

Six sites, all in files this stage owns, all one edit, and `:859` / `:912` are inside the section B1 is
about.

### B2 — `CR-20260820-0012:130` still says the DR has been wrong about clause 1 three times

Round 5 required this by file and line alongside its twin; the twin was fixed and this was not
(Judgement 2). The sentence disowns the DR's current, correct statement, and the DR points at this CR
twice — `:190` for option 5's wording and `:220` for the row's release condition — so a reader of the DR
following either pointer arrives at it. The fix is the one the DR already applied to itself, or dropping
the figure, per `CR-20260820-0006`'s own lesson.

## Major and advisory — they govern a user decision or a later edit, not either ledger write

Scoped out of the blocking set on the same narrowing rounds 4 and 5 used, and kept here so the closure
list is complete.

- **M1 — option 2's own text** (`CR-20260820-0012:92`). Judgement 5. Fix it where the reader meets it;
  the closing paragraph now says the opposite seventy lines later.
- **A1 (round 4's, round 5's, still open, and now live).** The ledger's `Evidence` cell for `TDD-0069`
  (`.qfai/specs/spec-0017/tdd/test-list.md:107`) still opens "**NOT BLOCKED by a CR**" and still ends
  with the exit the DR retracts. Round 5 required this promoted into the handover; I grepped — "NOT
  BLOCKED by a CR" has **no occurrence** in `.qfai/evidence/atdd-spec-0017.md`, so it was not promoted.
  Since `TDD-0069 -> blocked` is **released**, whoever writes `Blocked-By: CR-20260820-0012` will
  otherwise put a `CR-*` blocker next to the words "NOT BLOCKED by a CR". This is the one advisory a
  released write can make worse, for the second round running.
- **A2 — the guard's four coverage holes** (Judgement 4), and the docstring's "enforced instead of
  announced", which over-claims while all four live instances sit outside its reach. Adding `CR` to the
  "wrong about clause 1 three times" entry turns **B2** into a test failure rather than a review finding;
  collapsing whitespace in `normalise` closes hole 2.
- **A3 — the round table stops at round 4 and misstates my verdict there.**
  `.qfai/evidence/atdd-spec-0017.md:883-899` reports round 4's `qa-gatekeeper` (P1d) as "3 blocking"; it
  was **2 blocking** (B1, B2) plus 3 major. There is no round-5 row at all, although
  `.qfai/review/review-20260821040000000/` landed in this commit range with `R02`, `R03`, `R04` and a
  `summary.json`. The `--profile full` figure at `:903-910` (`error=4`) is likewise written against the
  previous pack.
- **A4 — round 5's A3, A4, A5 and A6 are all still open.** `DR-0017-0010:224` still opens "`blocked` was
  considered for both and **is wrong**" and closes by adopting it for `TDD-0069`; the DR's `Rows:` header
  still lists both rows without saying which one it now backs; `DR-0017-0010:210` and
  `.qfai/evidence/atdd-spec-0017.md:440` still group "These two rows, the six `blocked` ones" as distinct
  categories after one joined the six; `.qfai/evidence/atdd-spec-0017.md:284-287` and `:302-304` still
  duplicate the "neither cell has been written" paragraph; the DR's cycle block at `:66-73` is still the
  scoped one.
- **A5 — "has run twelve times on this branch"** (`DR-0017-0010:87`,
  `.qfai/evidence/atdd-spec-0017.md:372`) is now **21** runs, 18 failure and 3 cancelled. The load-bearing
  point — `ci-pass` exists and has run — holds; the figure goes stale every commit, which is
  `CR-20260820-0006`'s lesson applied to a run list rather than a row count.

## Gate decision

**REVISE**, and narrower than any prior round.

**`/qfai-implement` may NOT write `todo -> exception` for `TDD-0070`.** Sixth refusal — and for the first
time **nothing in the finding set says the anomaly account is wrong**. `DR-0017-0010` is, at this HEAD, a
record I sustain whole: `TDD-0070`'s branch-1 and branch-2 unavailability, the corrected clause-1 history,
the split-paragraph repair, the obligation quoted in full, and the `blocked` re-classification reasoned
rather than asserted. What blocks the write is the record **around** the DR: the section a consumer
reaches from the row's own entry — and the section a PASS would be written into — states as current fact
the claim the DR retracts (**B1**), while the Change Request the DR points at twice says the DR has been
wrong about that clause three times (**B2**).

**`/qfai-implement` MAY still write `todo -> blocked` with `Blocked-By: CR-20260820-0012` for
`TDD-0069`.** Round 5 released it and nothing has regressed: the table row is intact with the blocker in
its own column, the anchored section is coherent about the transition, both retracted sentences are now
quotations, and the `blocked` clause has verified five rounds running. One condition the writer owes, and
it is the ledger's own consistency rather than my gate: replace the row's `Evidence` text in the same edit
(**A1**).

**Mechanically, a PASS is still not self-executing.** `qfai-implement/SKILL.md` step 3b writes
`todo -> exception` only when the entry carries the `qa-gatekeeper` PASS P1d took on that `DR-*`. The
stage must therefore record the PASS in the `TDD-0070` entry once this gate passes — which is exactly why
B1's section has to be true first.

### What remains, exactly

1. `.qfai/evidence/atdd-spec-0017.md:879-881` — one sentence.
2. The six round-count sites — `DR-0017-0010:10-12` and `.qfai/evidence/atdd-spec-0017.md:413`, `:432`,
   `:859`, `:912`, `:939`.
3. `CR-20260820-0012:130` — one clause.

That is the whole blocking set. No measurement is owed: every fact the three fixes need is established in
this report and the wording for each is supplied. Items 1 and 2 are one edit in one file plus a header;
item 3 is the edit already applied to the DR's twin.

### Is the remaining set shrinking

**Yes — in kind as well as in count.**

| pass | subject of the blocking findings                                                            | count               |
| ---- | ------------------------------------------------------------------------------------------- | ------------------- |
| 1    | the substance of the anomaly: mischaracterised obstacle, unreachable exit, half-quoted example | 3 blocking          |
| 2    | handover index wrong; clause-1 finding contradicted by the repository; cycle incomplete      | 3 blocking          |
| 3    | anchored section unrepaired; clause 1 false in a third direction                             | 2 blocking + 3 major |
| 4    | retracted claim surviving in the DR; the count; two sentences in the evidence file           | 3 blocking + 2 major; `TDD-0069` released |
| 5    | two statements **about the review history**, in the CR and in a stage-evidence section       | 2 blocking          |

Every pass until now found something wrong with the reasoning. This one does not: the row's account, the
obligation, the identity, the `DR-ID`, the branch analysis and the corrected clause-1 history all hold, and
`TDD-0069`'s release stands. What is left is two sentences that describe the review itself.

I also record what I will not do, so this terminates. I have now swept all four artifacts mechanically for
every refuted-claim wording and every review-round count; **B1**, **B2** and the six count sites are the
complete result. I will not open a new finding of this class against the same material next round, and I
would not have held the gate on the counts, the two attribution slips, or the guard's holes alone.

## Residual risk if this were passed as-is

`TDD-0070` would carry a completion-satisfying status whose `DR-ID` points at a record that is right —
while the handover the ledger's writer reads tells that reader the record says the opposite, on the one
distinction that decides whether the anomaly can ever clear: "degenerate against this runner" never
resolves, "unsatisfied" resolves the first time a tuning pull request lands. My PASS would be filed in a
section asserting that P1d has returned REVISE every time it ran. And the Change Request the DR names as
`TDD-0069`'s release condition would tell its reader that the DR has been wrong about clause 1 three
times — including the statement it is currently making.

## Sign-off

- [x] Review verdict is explicit — **REVISE**, with `TDD-0069 -> blocked` still released
- [x] Findings cite concrete artifacts, line numbers, a replicated run of the new guard's own predicate, a
      HEAD-accurate unscoped validate run taken read-only in a shadow root, live run ids, and the diff
      range that shows what the repair touched
- [x] Required gates and residual risks are recorded
