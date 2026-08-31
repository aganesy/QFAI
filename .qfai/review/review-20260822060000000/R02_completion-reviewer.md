# R02 — completion-reviewer, round 15, spec-0017 (ATDD stage gate)

**Revision under review:** `21e2cdc6` at start. Re-checked at finish (recorded at the end of this
report). The subject did not move while this round ran.

**Verdict: REVISE.**

**A gate that passed, stated as the request requires:** the scoped ATDD gate. Read from the tracked
artifact `.qfai/report/validate.spec-0017.json` — *not* re-run, so `.qfai/report/validate.log` was
never rewritten — `counts` is `{"info": 2, "warning": 0, "error": 1}`, the single `error` is
`QFAI-ATDD-112` and it names exactly eight TCs: `TC-0017-0016`, `-0030`, `-0032`, `-0033`, `-0034`,
`-0035`, `-0069`, `-0070`. Section 5's gate bullet is **confirmed as stated**. That is the only
completion-relevant claim in section 5 that I could confirm without qualification.

**Scope of what I audited:** section 5 (the record after eleven corrections) and section 6 (what
round 14 accepted rather than fixed), plus the Completion Contract and Drift-Protocol obligations
and a sweep for claimed verdicts / measurements that do not exist.

**Plants made and restored.** Four, all against `.qfai/evidence/*`, each restored from a copy taken
before the plant (`tmp/r15/atdd-spec-0017.md.ORIG`, `tmp/r15/coverage.ORIG`) and verified by md5 and
by `git status --porcelain` returning empty. Nothing was planted in
`packages/qfai/assets/init/root/.github/workflows/`. No plant failed to restore.

**A sibling's plant is live in the tree and I did not measure through it.** At 04:07:40 local,
`packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml` and `qfai-validate.yml` became
modified in the working tree (`+8` lines: a `pnpm/action-setup` step, an `actions/setup-node` step
with `node-version: lts/*` / `cache: npm`, and an `if: ${{ github.actor == 'qfai-nobody' }}` on the
`qfai validate` step). That directory is `qa-gatekeeper`'s this round and I did not write it. Every
measurement I report below was taken either before 04:07:40 or from a surface the plant does not
reach — the `e2e` project run finished at ~04:04:10 and the `integration`+`unit` run at ~04:07:00,
both before it. My shadow root copy was taken after, so it carries the plant; nothing I measured in
the shadow reads `packages/qfai/assets/**` (the full-profile validate reads `.qfai/**`), and I say
so explicitly at the finding that uses it.

---

## Blocking

### B1 — a retracted claim is standing, unquoted, in a governance file the guard searches, and it is the load-bearing sentence of the CR that `TDD-0069` is blocked on

`RETRACTED` gained `"15 TC across five specs"` this round, retracted because the truth is *eleven US
across four specs*. The needle is live and quoted at `.qfai/evidence/atdd-spec-0017.md:1283`. But the
same double-count is standing as a plain assertion in a **different governance file, worded as two
counts instead of one**, so no needle in the list reaches it:

`.qfai/decisions/CR-20260820-0012-tdd-0069-waits-for-a-ci-run-that-is-gated-on-the-annotation-it-would-justify.md:160-162`

> and the scoped count is the wrong one to reason from. **`build` runs three UNSCOPED profiles**
> (`ci.yml:376-428`). Unscoped, `QFAI-ATDD-111` is **12 US across five specs** and `QFAI-ATDD-112` is
> **15 TCs across four**, re-derived here rather than taken on trust:

That file is member 4 of `GOVERNANCE` in `packages/qfai/tests/assets/retractedClaims.test.ts:67`, so
it is in the guard's own declared scope; the guard is green only because the wording differs.

**Measured, not inferred.** A full-profile run in a shadow root
(`node packages/qfai/dist/cli/index.mjs validate --root tmp/r15/shadow --profile full`; the real
`.qfai/report/validate.log` was never touched) returns `QFAI-ATDD-111` as:

```text
SPEC-0003:US-0003-0021 … -0028  (8)   SPEC-0006:US-0006-0011  (1)
SPEC-0008:US-0008-0008  (1)           SPEC-0015:US-0015-0016  (1)     = 11 US, four specs
```

`US-0017-0007` is absent because it is annotated at
`packages/qfai/tests/e2e/spec0017RunnerParallelismE2E.test.ts:77`. So `12 US across five specs` is
false at this revision, and Gaps item 4 (`atdd-spec-0017.md:1759-1762`) says so in the other
direction — "`QFAI-ATDD-111`'s eleven items repo-wide — **all of them**. This spec contributes none".

**The same CR carries the `US-0017-0007 is uncovered` claim in different words, at `:155-156`:**

> clearing `QFAI-ATDD-112` still leaves `error=1` from `QFAI-ATDD-111`, which stands **deliberately**
> because this stage withdrew `US-0017-0007`'s unearned annotation

The scoped gate's single `error` is `QFAI-ATDD-112` and nothing else
(`.qfai/report/validate.spec-0017.json`), so that sentence is false too. This is not cosmetic: those
two sentences are the CR's **third strand** of its "the cycle is over-determined" argument, and the
record's own handover (`atdd-spec-0017.md:1102`, `:1914`) instructs `/qfai-implement` to write
`Blocked-By: CR-20260820-0012` on `TDD-0069`. A future agent following that pointer reads a
re-derivation that the tree contradicts.

**Rework:** correct both sites in `CR-20260820-0012` (quote the old figures if the history matters),
and add a needle that binds the *subject* rather than the sentence — `12 US` alone would catch both
this wording and the one already listed, in the way `"rebuilt the scan around"` was shortened for
exactly this reason at `retractedClaims.test.ts:157`.

**Severity:** blocking. **Traces to:** `defect:record-contradicts-tree` — a governance artifact in
the guard's own declared scope asserting a figure this revision's gate refutes, and the artifact is
the one the ledger handover points a downstream writer at.

### B2 — `## P7 quality gates` certifies `validate --profile full  error=4`; the tree produces 50, and that line was not re-measured despite the block declaring it was

Commit `0f482647` is titled "…and re-run the gates block instead of carrying it", and its message
says the block "is re-measured rather than carried forward, which is what its own opening sentence
has demanded through six rounds". Three lines of the block were re-measured. The fourth was not:

`.qfai/evidence/atdd-spec-0017.md:2041`

```text
node ... validate --profile full                 error=4  (see § "The full profile")
```

and `§ "The full profile"`, `:2292-2297`:

> `validate --profile full` reports **`error=4`** at this stage's HEAD, and `build` runs that profile.
> Two are `QFAI-ATDD-111` / `-112` **unscoped** … the other two are `QFAI-REVIEW-004` / `-005` against
> **this stage's own in-flight review pack**

**Measured** in the shadow root, `counts: info=4 warning=403 error=51`, by code:

```text
QFAI-REVIEW-007  45      QFAI-REVIEW-004  2      QFAI-REVIEW-005  1
QFAI-ATDD-111     1      QFAI-ATDD-112    1      QFAI-LINK-001    1   <- shadow artifact only
```

`QFAI-LINK-001` is mine: `git ls-files` copies do not reproduce the 41 skill symlinks, so it is
subtracted. **The real figure is 50, not 4.** The dominant term, `QFAI-REVIEW-007` on 44 distinct
`summary.json` files — `revision_form` missing from the minimum schema — is not named anywhere in
this record. The already-present `.qfai/report/validate-full.json` (2026-08-21 16:35) independently
records `error=46` with `QFAI-REVIEW-007` × 44, so the figure has been wrong across at least round
14 as well as this one.

**And the two errors it does name are misattributed.** `QFAI-REVIEW-004` fires on **two** packs —
`review-20260822060000000` (this round's, in flight) and `review-20260821200000000` — and
`QFAI-REVIEW-005` fires only on `review-20260821200000000`, round 13's empty pack. The same record
says of that pack, at `:2470`, that "A pack with nothing in it is closed, not in flight". So the one
sentence attributing these to the in-flight pack contradicts the sentence six lines above it.

This matters for completion and not only for bookkeeping: `build` runs the unscoped full profile,
and the record uses `error=4` to argue that only two obligations plus an in-flight-pack artefact
stand between this branch and a green `build`. Fifty errors, forty-five of them a schema failure in
pack artefacts this stage writes, is a different completion picture.

**Rework:** re-measure the line and rewrite `§ "The full profile"` from the measurement, naming
`QFAI-REVIEW-007` and what it would take to clear it; fix the pack attribution; and put the
full-profile figure under the same derivation discipline the block's other numbers now have, or
state plainly that it is not derived and expires.

**Severity:** blocking. **Traces to:** `defect:stale-gate-evidence` — a recorded gate output the
command does not produce, inside the block whose repair this round claims to be.

### B3 — the new derived mechanism count has no floor, so going inert is indistinguishable from being right; and the sentence introducing it names three numerals it does not cover

Two defects in one correction, both demonstrated by planting into
`.qfai/evidence/atdd-spec-0017.md` (restored from `tmp/r15/atdd-spec-0017.md.ORIG`, md5 verified,
`git status --porcelain` empty after).

**(a) No floor.** `packages/qfai/tests/assets/stageEvidenceCounts.test.ts` (the block added by
`0f482647`) loops three `matchAll` patterns and pushes an offender only when a match's number
disagrees. A pattern that matches **nothing** contributes nothing.

- **Plant P3 (positive control):** `29 mechanisms pinned` -> `31 mechanisms pinned`. **RED**:
  `"mechanisms pinned: record says 31, corpus holds 29"`. The number axis works.
- **Plant P2 (the hole):** keep the numbers wrong at 31 and reword all three sites —
  `31 mechanisms are pinned`, `lets all 31 of them through`, `with all 31 of them listed`. **GREEN,
  11 of 11.** Three wrong numerals, nothing reported.

This is the exact failure its sibling pin already documents. `retractedClaims.test.ts:648-654`
carries a floor with the reason spelled out — *"A FLOOR, because matching nothing was a pass. This
pin held for eight rounds and then went inert … the way it went inert was by matching zero times,
which is indistinguishable from correctness without this line."* And **this same file** has a floor
on all three of its other prose pins: `:264-267` (`matches.length === 0` is an offender), `:303-306`
(the `OWED` list must all be quoted), `:372-375` (`stated.length` must be `> 0`). The new block is
the only one without one, in the file whose convention it is.

**(b) The sentence introducing it is false about which numerals are covered.**
`.qfai/evidence/atdd-spec-0017.md:1022` reads "**The three numerals in that block are derived**". The
block is `:1010-1016`. Of its three `29`s, the guard covers the two on `:1015`; the third —
`:1011`, `escape corpus  29 mechanisms, 0 still open` — is covered by no pattern, and the third
pattern (`with all (\d+) listed`) matches `:1019`, which is **outside the block**.

- **Plant P1:** `:1011` -> `31 mechanisms, 0 still open`. **GREEN, 11 of 11.** A typed numeral inside
  the block the record says is derived, moved by two, reported by nothing.

**Rework:** add the floor (an unmatched pattern is an offender, as the file's other three pins do);
extend the pattern set to `(\d+) mechanisms,` so the block's third numeral is actually derived; and
either move the `with all N listed` site into the block or correct the sentence to say which sites
are covered.

**Severity:** blocking. **Traces to:** `defect:vacuous-guard` — the "a row that cannot fail looks
like coverage" rejected option of `09_delta.md § Rejected`, which
`atdd-spec-0017.md:82-87` names as the option these guards are most at risk of reintroducing and
records having reintroduced three times already.

### B4 — the merged class C accepts a cell that is simply untested, which is the negation of its own stated property

The request asked whether "neither A nor B" is vacuous in the other direction. It is, and the roster
does not close it.

`packages/qfai/tests/assets/coverageDepthMatrix.test.ts:302-303`

```ts
C: (row, column) =>
  statusOf.get(row) !== "❌" && column !== "State transitions" && column !== "Combinatorial",
```

and the prose it pins, `coverage-depth-spec-0017.md:183-184`: *"the cell is inapplicable by the
design rather than untested"*. The predicate cannot express "rather than untested" — it is
`not-A ∧ not-B` over coordinates, satisfied by **every** `❌` cell on a covered row outside the two
class-B columns, whatever the reason.

**Plant P4, demonstrated.** In `coverage-depth-spec-0017.md`: scored `US-0017-0002 × Boundary values`
`❌` (that row's `Status` is `✅`, so it is not class A, and the column is not class B); added
`| C | US-0017-0002 | Boundary values |` to the partition table; moved the counts to
`35 depth cells are ❌` / `**A 23, B 9, C 3 — 35 cells.**` and the restated pair in
`atdd-spec-0017.md` to `at 4 rows and 35`; and added the roster bullet the guard demands, with a
reason that says the opposite of the property:

> - `US-0017-0002` × `Boundary values` — **nothing exercises it.** No assertion anywhere reaches a
>   boundary for this story; it is simply untested, and no one has looked.

**GREEN — `coverageDepthMatrix.test.ts` 5 of 5, and `coverageDepthMatrixHome`, `oracleStrength`,
`stageEvidenceCounts` and `retractedClaims` 53 of 53 alongside it.** An untested cell filed as
"inapplicable by design", with its stated reason being that it is untested, passes every guard.

The roster is real but weak in a second way: `namedInProse` is built by scanning the **whole
document** for `` `US-0017-NNNN` × `Column` `` (`:358-362`), so any sentence anywhere that happens to
pair a row with a column satisfies it — it demands a mention, not a reason.

**And the roster's own comment claims a check that is not written.** `:356-357` says *"a member the
prose does not name is a cell reclassified without a reason, **and a name with no member is a reason
for a cell that moved**"*. Only the first direction is asserted (`:366-369`); there is no
`namedInProse \ classC` check. That is a claim about what a test does, written in that test — which
is Gaps item 7 entry 15, the entry this record calls "the purest instance in the list".

**Rework:** give class C a property with content — the honest one is a **closed roster**: `C` holds
exactly the pairs the record enumerates, asserted set-equal in both directions, so adding a member is
an edit a reviewer sees rather than a predicate that admits it. Anchor the roster scan to the class C
paragraph rather than the whole document. And either write the second direction the comment promises
or delete the promise.

**Severity:** blocking. **Traces to:** `defect:vacuous-guard` — same `09_delta.md § Rejected`
"a row that cannot fail looks like coverage" option; the merge closed the coordinate-naming vacuity
in one direction and opened a wider one in the other.

### B5 — three refuted claims about `US-0017-0007` are standing as plain assertions in the E2E carrier file, which no needle reaches because `GOVERNANCE` is `.qfai/**` only

Round 14's `B3` was that the `US-0017-0007` correction "moved one paragraph and left five sites". The
five `.qfai/**` sites are closed and the needle is live. **The sweep stopped at the guard's file
list.** `packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts` — the file that carries this
spec's E2E surface, and the first artifact a downstream agent reads — asserts the retracted claim
three times, at `:773-790`:

> `US-0017-0007` … is NOT covered here, and the annotation for it has been **REMOVED** from
> `tests/e2e/qfai-traceability.md`.
> …
> So `QFAI-ATDD-111` reports `US-0017-0007` again, deliberately. Measured: no knob file ships … The
> row becomes coverable when the knobs ship.

and again in the file's header table at `:27`:

```text
 *     US-0017-0007  parallelism knobs derived from the workload      no knob file ships
```

listed under "five are not [satisfied]".

**Each is measurably false at this revision:**

1. `tests/e2e/qfai-traceability.md:220` carries `- QFAI:SPEC-0017:US-0017-0007`. The annotation was
   restored, not removed. `node scripts/check-atdd-annotation-ledger.mjs --spec 0017` reports
   `9 claim(s) backed by a test annotation`, exit 0 — nine of nine, `US-0017-0007` among them.
2. `QFAI-ATDD-111` does not report it. The scoped run has one `error` and it is `QFAI-ATDD-112`
   (`.qfai/report/validate.spec-0017.json`); the unscoped run lists eleven US and none is
   `SPEC-0017`'s (measured in the shadow, B1 above).
3. "becomes coverable when the knobs ship" is the framing Gaps item 2 retracts outright:
   *"`US-0017-0007` is covered, and the ten rounds it spent uncovered were a category error."* It is
   carried by `tests/e2e/spec0017RunnerParallelismE2E.test.ts`, which
   `coverageDepthMatrix.test.ts:474` has a whole test enforcing.

The guard cannot see any of it: `retractedClaims.test.ts:63-69` lists five files, all under `.qfai/`.
That exclusion is argued for `tdd/test-list.md` (a file this stage may not edit, and named in the
handover instead) — but this file **is** this stage's, it was edited this round (`4d737f3a..HEAD`
shows `92` changed lines in it), and no argument covers it.

**Rework:** correct all four sites; and either add
`packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts` (and its sibling carriers) to
`GOVERNANCE`, or state in the guard's docstring which non-`.qfai` artifacts are deliberately out of
scope and why — the docstring currently argues only the `tdd/test-list.md` exclusion, which reads as
though the list were complete.

**Severity:** blocking. **Traces to:** `defect:record-contradicts-tree` — the retraction discipline
this stage enforces by test ("a refuted claim may appear only as a quotation") violated three times
in the carrier for the story being retracted about.

## Major

### M1 — the two tables in `## Final status` that both record rounds disagree by three rounds, and the one nothing derives is the stale one

`### Findings per round` (`:2205-2247`) runs to **round 14**. The verdict table under
`## Final status` (`:2367-2380`) stops at **round 12** — rounds 13, 14 and 15 have no rows — while
the sentence above it certifies "**fifteen** rounds". Round 14 returned twelve blocking findings
across three reviewers and appears in one table and not the other.

`stageEvidenceCounts.test.ts` derives the round count, the response count and the split (`:477-548`)
and derives nothing about this table; I grepped `packages/qfai/tests/**` for its revisions
(`8fb48002`, `56daee8d`) and for its header and found no reader. So it is exactly the shape this
record has faulted itself for eleven times: a hand-maintained table beside a derived numeral, going
stale on a schedule.

**Rework:** add the missing rows (round 13 is already narrated at `:2244` and at `:2406`, so its row
is `— none ran`), or delete the table and point at `### Findings per round`, which carries the same
information and one more column. If it stays, tie its row count to `packsOnDisk()` the way the
numerals above it are tied — a table that gains a row per round and that nothing counts is the
liability the deleted per-commit sequence was deleted for (`:2058-2068`), by this record's own
argument.

**Severity:** major. **Traces to:** `defect:stale-record` — two sections of the certifying record
disagreeing about the same fact.

### M2 — "A ninth stage round is owed" is six rounds stale, in the paragraph that closes the record

`.qfai/evidence/atdd-spec-0017.md:2302-2304`:

> P1d's gate is **closed** — it passed at pass 6 and round 8 did not re-route it, because
> re-deciding a decided gate is not a review. **A ninth stage round is owed.** This stage does not
> claim its own repairs reviewed.

Rounds 9, 10, 11, 12, 14 have run and round 15 is running. The sentence is written in the present
tense and is the last statement `§ "The full profile"` makes about what completion still needs. The
sibling sentences in the same paragraph were re-measured this round — `"which was `error=2` when this
was written and is `error=1` now"` — so the paragraph was edited and this line was read past.

The honest form is the one the block above it already found for the callsite line: state the **rule**
rather than the ordinal. "The round after the current one is owed; this stage does not claim its own
repairs reviewed" cannot go stale.

**Severity:** major. **Traces to:** `defect:stale-record` — an ordinal that expires every round,
inside the section that states what completion is waiting for.

### M3 — the response-count guard reddens a required CI leg for the whole of every review round, which is the defect the file's own docstring says it fixed

`stageEvidenceCounts.test.ts:477-548` requires `## Final status`'s response count to equal the
`R0*.md` files on disk from `FIRST_PACK` onward. **Writing this report made the `e2e` project red.**
Measured, `npx vitest run --project e2e`:

```text
+   "responses: record says 38, disk holds 39",
+   "the verdict split sums to 38 against 39 responses",
 Tests  1 failed | 1443 passed | 16 skipped (1460)
```

I am the 39th response. `tests/assets/**` runs in the `e2e` project, which `ci.yml` executes as a
required matrix leg — so from the moment the first reviewer of a round writes, until the stage
updates the sentence after the round closes, `test (e2e)` is red for a reason that is not a defect in
the subject.

This is defect 1 from the file's own docstring, at `:12-17`, in a second form: *"It made the suite
red at the commit that added it … it asserted something no honest edit could satisfy during a
round."* That version was about seals, and the repair was to exclude in-flight packs from the seal
requirement. The response count has the same shape and no such relief, and `:2358-2362` records the
stage noticing the round-count half of it and choosing to live with it — commit `21e2cdc6` moved
`fourteen -> fifteen` **before** the reviewers ran precisely to dodge it. That works for the pack
count, which moves once. It cannot work for the response count, which moves three times per round
and cannot be pre-declared without asserting responses that do not exist.

**Rework:** exclude the newest pack from the response count and the split — the same relief the seal
requirement already has — or count responses only in **sealed** packs, so an in-flight round costs
nothing and the number becomes true the moment the round closes.

**Severity:** major. **Traces to:** `defect:unsatisfiable-gate` — a repository quality gate that a
correct in-flight state cannot satisfy, on the required `test (e2e)` leg.

## Minor

### m1 — the callsite guard reads the workspace globs and then walks hardcoded directories, which is the thing its comment says it avoids

`stageEvidenceCounts.test.ts:430-455`:

```ts
// The globs are the e2e project's, read from the workspace file rather than assumed, because a
// guard over "the e2e project's callsites" that hardcodes the directories is one include away
// from measuring something else.
const globs = [...workspace.matchAll(/"(tests\/(?:e2e|assets)\/[^"]*)"/g)].map((m) => m[1] ?? "");
expect(globs.length, "the e2e project must declare its includes").toBeGreaterThan(0);
…
for (const dir of ["packages/qfai/tests/e2e", "packages/qfai/tests/assets"]) {
```

`globs` is asserted non-empty and then never used. The directories **are** hardcoded, and the regex
that reads them is itself hardcoded to `e2e|assets`, so adding a third include to the `e2e` project
in `vitest.workspace.ts` changes what the suite runs and not what this measures — the exact failure
the comment claims is prevented. The count is correct today (I measured 880 independently by walking
the same two directories with the same regex, matching the record's
`e2e callsites at this tree: 880`), so this is latent rather than live.

**Rework:** derive the walk roots from `globs`, or delete the sentence. It is a claim about how the
code is written, false, in the file whose subject is claims of that kind — Gaps item 7's class.

**Severity:** minor. **Traces to:** `defect:docstring-contradicts-code`.

### m2 — the body allowlist is a multiset on one side only, so two steps swapping reviewed bodies is invisible and a body legitimately shipped twice is inexpressible

`spec0017LayeredCiScaffoldE2E.test.ts:604-610` compares `bodies.map((b) => b.digest).sort()` against
`[...ALLOWED_STEP_BODIES].sort()`, where `ALLOWED_STEP_BODIES` is a `ReadonlySet<string>`
(`shippedLaneCommands.ts:790`). Two consequences follow from the types alone — I did not plant,
because the shipped-workflow tree is `qa-gatekeeper`'s this round and carries its plant:

- **Swapping two reviewed bodies between two steps, or moving one between jobs, leaves both sorted
  arrays identical.** Each lane then executes a body that was reviewed *for a different lane*. The
  record's claim at `:600-603` is scoped to replication — "a reviewed body replicated into a second
  step is a second thing to review" — and is true as written; what is worth saying is that the gate
  is an identity check over a **bag of strings with no positions**, so *which* lane runs *which*
  reviewed body is outside it. That is the honest scope and the record does not state it.
- **The right-hand side cannot hold a duplicate.** If the shipped tree ever legitimately runs one
  reviewed body in two steps, the `Set` cannot express it and the assertion becomes unsatisfiable —
  the multiset repair traded one unsatisfiable state for another. Latent today (twelve distinct
  bodies), and cheap to fix: make the allowlist a `readonly string[]` and compare sorted arrays.

**Severity:** minor. **Traces to:** `defect:incomplete-boundary`.

### m3 — Gaps item 9 describes `working-directory` as an open channel in the present tense, and this round closed it

`atdd-spec-0017.md:1939-1942`:

> until round 14 refuted it with a channel that needs no write at all: `working-directory` **lets**
> the lane choose which tree the allowed install runs in, so the manifest that executes is selected
> rather than created.

At this revision `working-directory` is not in `ALLOWED_STEP_KEYS` and `defaults` is in neither
`ALLOWED_JOB_KEYS` nor `ALLOWED_WORKFLOW_KEYS` (`shippedLaneCommands.ts:675-702`), and
`readUses` refuses any key not on the level's list at all three levels
(`spec0017LayeredCiScaffoldE2E.test.ts:628-630, 696, 706, 710`). The channel is closed.

The item's **conclusion** survives — the scope statement "the shipped TEXT invokes only these
programs" is right, and it is right for a reason that does not depend on this channel: an adopter's
existing manifest is not this scan's to read. But the sentence carrying the justification reads as a
live hole, which is the opposite of the state, in the item whose whole job is stating what the
repairs do **not** close. Answering the request's section 6 question directly: the scope statement is
complete; its supporting sentence is a tense behind.

**Severity:** minor. **Traces to:** `defect:stale-record`.

### m4 — class C's "own reasoning" phrase is one member's reason, so it cannot survive that member moving

`coverageDepthMatrix.test.ts:379-383` pins class C's body with
`/no sequence, count or limit to sit at the edge of/` — the reason for
`US-0017-0001 × Boundary values` specifically, not for the merged class. If that cell is ever
rescored, class C's body check demands prose for a member it no longer has, while the merged
property and the roster would both be satisfied. The A and B phrases are class-level; this one is
not.

**Severity:** minor. **Traces to:** `defect:brittle-guard`.

## Advisory

### A1 — the Delta Rejected Guard table still omits the two artifacts that now carry the boundary

`§ "Delta Rejected Guard — confirmation"` (`:35-126`) tabulates nine artifacts against the rejected
options. `packages/qfai/tests/helpers/shippedLaneCommands.ts` and
`packages/qfai/tests/unit/shippedLaneCommands.test.ts` — the allowlist, the key enumerations, the
digest boundary and their corpus, i.e. the artifacts this round's repairs are almost entirely about —
have no rows. They are reasoned about in the prose below the table (`:107`, `:113-115`), so the
substantive obligation is discharged; what is missing is the row.

The section already discloses this, precisely and without excuse: *"nothing ties this table's rows to
the files `## Work performed` lists. Recorded as a gap rather than papered over, because the
alternative is a table that reads as exhaustive and is not."* I am recording it as **advisory rather
than blocking** for that reason — the honest disclosure is the right behaviour and I am not going to
punish it. But the disclosure is now two rounds old and the artifacts it is missing are the ones the
spec's central claim rests on.

**Suggestion, not an obligation:** the tie the section says does not exist is cheap —
`stageEvidenceCounts.test.ts` already holds `TRACKED`, the list of files this stage added. Requiring
every `TRACKED` member to appear in this table's first column would close it with one assertion and
no new list.

**Severity:** advisory. **Traces to:** `advisory:disclosed-gap`.

### A2 — a Change Request I am not filing, and why

Nothing in this report proposes a new product obligation, so no Change Request is owed under
`.qfai/assistant/constitution/drift-protocol.md#reviewer-originated-obligations`. Every finding above
is demonstrable from the artifacts under review: B1, B2 and B5 are contradictions between the record
and a measured gate; B3 and B4 are guards demonstrated green on a state they exist to refuse; M3 is a
required CI leg red on a correct in-flight state. None asks for behaviour upstream never asked for.

**Severity:** advisory. **Traces to:** n/a (process note).

---

## What I verified and found correct

Recorded because a REVISE that lists only failures misrepresents the round. Every item here was
measured, not read.

| claim | where | verdict |
| ----- | ----- | ------- |
| scoped gate `info=2 warning=0 error=1` | `.qfai/report/validate.spec-0017.json` `counts` | correct |
| `QFAI-ATDD-112` on **eight** TCs | same artifact: `-0016, -0030, -0032, -0033, -0034, -0035, -0069, -0070` | correct |
| each of the eight has a recorded reason where the ledger says to look | `tdd/test-list.md:54,68,70,71,72,73,107,108` — every row's `Evidence` cell is populated | correct |
| `e2e callsites at this tree: 880` | walked `tests/e2e` + `tests/assets` with the same `CALLSITE` regex: **880** | correct |
| `vitest --project integration --project unit` `1219 passed / 19 skipped, exit 0` | ran it: `1219 passed | 19 skipped (1238)`, 173 files | correct |
| `test:e2e` `1444 passed / 16 skipped` | ran it: `1443 passed | 1 failed | 16 skipped (1460)`; the one failure is `M3` — my own report file — so the figure is right and the exit code is not | correct figure |
| `node scripts/check-atdd-annotation-ledger.mjs --spec 0017` `9 claim(s) backed, exit 0` | ran it: identical | correct |
| the six new `RETRACTED` needles are live, not inert | each matches **exactly once**, quoted: `:2329` ×2, `:1283`, `:1042`, `:1874`, `:1939`; and the suite's own inert-entry test is green | correct |
| the mechanism corpus size | `MECHANISMS` holds **29**; all three record sites say 29 | correct |
| no rejected option reintroduced; `CR-20260820-0012` options 1-4 stay rejected | `09_delta.md § Rejected` (three candidates) and the CR's four; `TDD-0069` is `blocked` with a `Blocked-By`, no gate narrowed, no waiver, nothing merged | correct — no RE-OPEN owed |
| the record claims no verdict that does not exist | `## Final status` counts round 15 at **zero** responses (`38`, `37 REVISE and one PASS`) and seals its pack `IN FLIGHT`; `### Findings per round` has no round-15 row | correct |
| the `TDD-0069` `Evidence` cell's three refuted phrases are handed over rather than edited | `:1128-1152` names all three verbatim and instructs the writer; `retractedClaims.test.ts:49-53` argues the exclusion | correct |

## Completion Contract and Drift Protocol

- **Completion status is honest.** `FAIL — incomplete by this skill's own Definition of Done`, with
  five unsatisfied items enumerated. Nothing in the record claims the stage passed.
- **No self-approval.** The record states "This stage does not claim its own repairs reviewed" and
  routes this round. P1d is not re-opened.
- **Drift Protocol.** The ledger cells this stage may not write are unwritten, and the handover names
  what `/qfai-implement` owes in the same edit. Correct.
- **The blocking set below does not change that verdict** — it is already `FAIL`. What B1, B2 and B5
  change is whether a reader of the record gets the right picture of *why*.

## Residual risks

1. **I did not run `pnpm ci:lint`, `pnpm check-types` or `pnpm verify:pack`.** The `## P7 quality
   gates` block certifies all three at exit 0 and I verified four of its lines, not seven. Given B2 —
   one line of that block carried forward from round 4 while the commit message said the block was
   re-measured — the three I did not run should be treated as unverified rather than as inherited.
2. **My full-profile figure is a shadow measurement.** `error=51` in `tmp/r15/shadow`, of which
   `QFAI-LINK-001` (×1) is an artifact of copying `git ls-files` output, which does not reproduce the
   41 skill symlinks. Real value 50. `.qfai/report/validate-full.json`, which I did not write,
   independently records `error=46` on 2026-08-21 with the same dominant term, so the order of
   magnitude does not rest on my copy.
3. **A sibling's plant was live in the tree from 04:07:40.** Nothing I measured reads
   `packages/qfai/assets/**` after that time. The `e2e` and `integration`+`unit` runs both completed
   before it; the shadow root carries the plant but the full-profile run reads `.qfai/**`.
4. **B4's plant showed class C accepts an untested cell; it did not show that any current member is
   one.** Both existing members' reasons are genuine inapplicability. The finding is about what the
   guard permits, not about the two cells in it today.

## Plants: made, measured, restored

| id | file | mutation | result |
| -- | ---- | -------- | ------ |
| P1 | `.qfai/evidence/atdd-spec-0017.md:1011` | `29 mechanisms, 0 still open` -> `31` | GREEN (hole) |
| P2 | same, `:1015` + `:1019` | all three pinned phrasings reworded, numbers 31 | GREEN (hole) |
| P3 | same, `:1015` | `29 mechanisms pinned` -> `31`, wording kept | RED (control) |
| P4 | `coverage-depth-spec-0017.md` + `atdd-spec-0017.md:1334` | an untested cell filed under class C, roster line added | GREEN (hole) |

Restored from `tmp/r15/atdd-spec-0017.md.ORIG` (md5 `a6bd3df46c155e9d001a8a4a886e4ba9`) and
`tmp/r15/coverage.ORIG` (md5 `0ada4268786bafbecbec3acbbf1b2418`), both verified after restore. No
`git checkout` was used on any path. **Every plant restored.** All scratch under `tmp/r15/`.

## Revision at finish

`git rev-parse --short HEAD` = `21e2cdc6`, unchanged from start. `git status --porcelain` shows only
the two `qa-gatekeeper` workflow files described above; nothing of mine is in the working tree.

## Verdict

**REVISE.** Blocking: `B1`, `B2`, `B3`, `B4`, `B5`. Major: `M1`, `M2`, `M3`. Minor: `m1`, `m2`, `m3`,
`m4`. Advisory: `A1`, `A2`.

The gate that passed and is stated as such: the scoped ATDD gate, `info=2 warning=0 error=1`,
`QFAI-ATDD-112` on the eight TCs named above, read from `.qfai/report/validate.spec-0017.json`.

Round 14's rework instructions were followed in full — all three of my predecessor's blockers are
closed and the six needles are live. Four of my five blockers are defects **introduced by or left
open by those corrections**: the derived count that cannot fail (`B3`), the merged class that admits
its own negation (`B4`), the sweep that stopped at the guard's file list (`B5`), and the block that
declared itself re-measured while one of its lines was ten rounds old (`B2`). That is the pattern
this stage's own history predicts, and it is the reason to keep spending the round.
