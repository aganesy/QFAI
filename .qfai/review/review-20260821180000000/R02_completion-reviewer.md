**Verdict: REVISE.**

# R02 — completion-reviewer, round 12, spec-0017 (stage gates)

- **Revision:** `45e6f041` at start and at finish; `git status --porcelain` empty at both.
- **Scope:** the Completion Contract and the records — `.qfai/evidence/atdd-spec-0017.md`,
  `.qfai/evidence/coverage-depth-spec-0017.md`, `.qfai/decisions/**`, `.qfai/specs/spec-0017/**`,
  and the DoD in `.claude/skills/qfai-atdd/SKILL.md`.
- **Plant isolation honoured.** I planted nothing. The two mutations I ran are on the two evidence
  files, both restored in a `finally` with a printed sha256 comparison (`restored=true` for both, both
  runs), and `git status --porcelain` was empty after each. I did not touch
  `packages/qfai/assets/init/root/.github/workflows/` — that is the `qa-gatekeeper`'s this round — and I
  did not need it.
- **P1d not re-opened.** Nothing below rules on `DR-0017-0010`'s branch-3 account or on the pass-6
  PASS. Where a finding touches `DR-0017-0010` it touches a sentence in the record around it.
- Scratch: `tmp/r12-completion/` (shadow root, gate logs, suite logs, mutation harness).

## Gate result, stated plainly

`node packages/qfai/dist/cli/index.mjs validate --profile atdd --fail-on error --spec 0017`, run in a
`git archive HEAD` shadow root with the 83 tracked symlinks re-materialised:

```text
counts: info=2 warning=0 error=1
[error] QFAI-ATDD-112 ... tests/integration/** -> SPEC-0017:TC-0017-0016, TC-0017-0032, TC-0017-0033,
        TC-0017-0034, TC-0017-0035, TC-0017-0069, TC-0017-0070
exit=1
```

`QFAI-ATDD-111` is gone and `QFAI-ATDD-112` names **seven**. Both the brief's figure and the record's
"seven" reproduce; `review_request.md`'s "six" predates commit `45e6f041` and is not a defect in the
record (`A2`). **No stage gate passed**, so the verdict cannot be PASS.

## What I could not reproduce, and did not attempt

Stated first so no finding below is read as covering it.

- **The four falsifications of `tests/e2e/spec0017RunnerParallelismE2E.test.ts`** (record ll. 459-464).
  Not re-run — that is the `implementation-reviewer`'s section 2. I confirmed only that the file exists,
  is annotated, contains `peakConcurrency(` and `spawnSync(`, and passes inside a green `test:e2e`.
- **`pnpm ci:lint` / `check-types` / `verify:pack` exit codes** (record l. 1611-1617). Not run. I
  verified one thing about that block: `package.json` `ci:lint` has exactly **eleven** `&&`-joined
  members, which the record states correctly.
- **Round 11's `R01 m7`** order-dependence observation. Not re-attempted; it stays open as the record
  says.

## Rulings the brief asked for

**1. The `TC-0017-0016` withdrawal is complete, and it is the right call.** Measured: the annotation is
gone from `spec0017OwnWorkflowScope.test.ts:70-80` (the `describe` is unannotated and carries the reason),
the ledger line is gone from `tests/integration/qfai-traceability.md`, `git grep TC-0017-0016` finds no
annotation anywhere, and the gate reports the row again. Keeping the test unannotated is the right
residue: it asserts the property all three of `CR-20260818-0007`'s options share, and restoring coverage
under Option A costs one line. The record's account of the episode (ll. 501-541) is accurate against
`CR-20260818-0007` — `Class: intent`, `Status: open`, `Approved by: -`, `Approved option: -`,
`Blocked set: spec-0017 TDD-0016 (TC-0017-0016)`, and the quoted boundary-row reason is verbatim.

**2. There IS another place, and it is `B1`.** The brief asked whether any other gate finding was
discharged by adopting a recommendation rather than an approval. `TC-0017-0030` is exactly that, and the
withdrawal commit denies it in terms.

**3. The `US-0017-0007` category-error reading is CORRECT.** Ruled against
`.qfai/specs/spec-0017/02_User-stories.md:133-145`. The title is "Runner parallelism derived from
**QFAI's own** workload"; the goal is "As a maintainer tuning a **415-file suite** I want **each vitest
project** to carry explicit pool, worker, concurrency, file-parallelism and hook-timeout settings, and I
want the three slice surfaces — **vitest project names, the CI matrix slice list, and the per-slice
scripts** — to hold the same names as each other". Every named surface is this repository's. "No knob
file ships" was never this story's obstacle, and the record is right to call it a category error rather
than a gap. Two consequences the record did not follow through: `m4` and `B3`.

### B1 — `TC-0017-0030` was covered off an open intent CR's recommendation, and the case's own oracle is false of the tree

**Artifact:** `packages/qfai/tests/integration/spec0017OwnWorkflowScope.test.ts:127-160`;
`tests/integration/qfai-traceability.md:558`; `.qfai/evidence/atdd-spec-0017.md:466`; commit `45e6f041`'s
message.
**Contract:** `SKILL.md` § Success Criteria ("All required `TC` are covered from the directory their
declared `Level` routes to") read with § Not-done ("Any required `TC` remains uncovered"); the
drift-protocol prohibition the record itself states at ll. 526-531 and 539-541; and the same authority
argument the stage applied to `TC-0017-0016` one commit earlier.
**Severity:** Blocking. **Traces to:** `defect:correctness` (the annotated assertion is green while the
case's stated oracle is false of the tree) plus a stage resolving an open `intent` question.

**Measurement, in three parts.**

*(a) A CR does name it.* Commit `45e6f041`'s message asserts "`TC-0017-0030` keeps its coverage; **no CR
names it**." Measured:

```text
.qfai/decisions/CR-20260820-0001-br0027-is-tree-wide-but-the-plan-scopes-release-yml-to-pins.md
  Class: intent    Status: open    Approved by: -    Approved option: -
  Blocked set: spec-0017 TDD-0030 (TC-0017-0030)
  Decision needed from user: Choose A, B or C. TDD-0030 stays todo until then.
```

`.qfai/specs/spec-0017/tdd/test-list.md:68` carries `TDD-0030` at `Status: blocked`,
`Blocked-By: CR-20260820-0001`, with an `Evidence` cell that opens "BLOCKED by `CR-20260820-0001`, which
names this row in its blocked set." That is the same shape, the same class and the same
`Approved option: -` as `CR-20260818-0007`. The record's own newly-declared rule — "**grep
`.qfai/decisions/` for a CR naming it in its `Blocked set` before writing anything**" (l. 540) — was
declared in the same commit that failed to apply it to the row beside it.

*(b) The oracle is false of the tree.* `06_Test-Cases.md:95` gives `TC-0017-0030`'s oracle as: "The own
workflows tree holds **zero** workflow-level Node version literals and the definition reads the version
from a file." Measured over `.github/workflows/`:

```text
.github/workflows/release.yml:40   NODE_LTS: "20.19"        <- workflow-level env, a Node version literal
.github/workflows/release.yml:49   NODE_PUBLISH: "24"       <- workflow-level env, a Node version literal
.github/workflows/release.yml:146          node-version: ${{ env.NODE_LTS }}
.github/workflows/release.yml:232          node-version: ${{ env.NODE_PUBLISH }}
```

These are the two literals `CR-20260820-0001` measured at `28b7a8e2` as the reason the row cannot be
satisfied. They are still there. So the case's oracle is **not** met.

*(c) The annotated test cannot see them.* The assertion at
`spec0017OwnWorkflowScope.test.ts:137` is `/node-version:\s*(\S.*)$/`, and it classifies a
`${{ ... }}` value as a compliant "reference". `NODE_LTS: "20.19"` never matches `node-version:` at all.
So the test is green over a tree that fails the case, `QFAI-ATDD-112` stopped naming the row, and the
only remaining signal that `CR-20260820-0001` awaits a user's choice between A, B and C is now quiet.
This is the gate-laundering shape the record describes at ll. 501-541 — committed a second time, in the
commit that recorded the first.

**Rework.** Withdraw the `TC-0017-0030` annotation and the
`tests/integration/qfai-traceability.md` ledger line, exactly as `TC-0017-0016`'s were. Keep the test if
it is worth keeping, unannotated, with a `describe` comment naming `CR-20260820-0001` and saying which
option turns it into coverage — and say in the comment that it asserts a property strictly narrower than
the case's oracle. Then correct commit `45e6f041`'s claim in the record: the record must state that a CR
does name `TDD-0030`, and that the stage checked one row and not the other.

### B2 — the record asserts both "all nine are covered" and "`US-0017-0007` is uncovered", at eleven live sites

**Artifact:** `.qfai/evidence/atdd-spec-0017.md`.
**Contract:** `SKILL.md` § Evidence (the required sections are the completion gate's inputs) and
§ Success Criteria / § Not-done, which a reader resolves from `## Coverage obligations checklist` and
`## Final status`.
**Severity:** Blocking. **Traces to:** `defect:record-integrity` — the section a completion gate reads
for the answer states the opposite of the headline.

The headline (l. 11) reads "**All nine are covered**", and § "The gate moved" (ll. 435-464) explains why.
Measured at HEAD, these eleven sites still assert the withdrawn state:

```text
l.  736-740  "The scoped gate is back at error=2, and that is the honest number." + the whole paragraph
l.  757      "US-0017-0007 - not covered, deliberately. Claim withdrawn; QFAI-ATDD-111 reports it"
l.  948-949  "It does not clear completion: US-0017-0007 is uncovered, the scoped gate is error=2"
l.  983-984  "These two rows, the six blocked ones and US-0017-0007 are why the completion status ... FAIL"
l. 1400-1401 item 2: "US-0017-0007 is uncovered by choice. The knobs do not ship, so no honest
             assertion exists. It becomes coverable when they do."
l. 1416      "plus US-0017-0007 makes 12"
l. 1620      "validate --profile atdd --spec 0017     info=2 warning=0 error=2"
l. 1873      "of which this spec owns 1 and 8"
l. 1887      "eight of spec-0017's nine US-* are covered"
l. 1905      "US-0017-0007 is uncovered, so QFAI-ATDD-111 reports it and the scoped gate is error=2"
l.  746-748  the Test volume estimate table: E2E Signal 8, note "except -0007, withdrawn in round 1"
```

Two of these are the load-bearing ones. **`## Coverage obligations checklist`** is the section the DoD is
read out of, and it is wrong three ways (see `B6`). **`## Final status`** certifies "eight of nine" and
"the scoped gate is `error=2`" — a verdict section stating a gate value the gate does not produce.

Item 2 at l. 1400 is the sharpest: it asserts as an open risk exactly the obstacle § "The gate moved"
calls a category error and says "was never the obstacle".

**Rework.** These are not eleven separate edits with eleven separate wordings; they are one fact. Apply
it by `grep -n "US-0017-0007" .qfai/evidence/atdd-spec-0017.md` **after** the edit, which is the
countermeasure the record itself adopted at l. 1970-1971 and did not use here.

### B3 — `coverage-depth-spec-0017.md` was not touched this round, and its own guard now pins the false statement

**Artifact:** `.qfai/evidence/coverage-depth-spec-0017.md` (unchanged since round 11 —
`git diff 2ee4874b..HEAD` lists it nowhere); `packages/qfai/tests/assets/coverageDepthMatrix.test.ts:471-483`.
**Contract:** `SKILL.md` § Evidence — the Coverage Depth Matrix is a **required, committed** section with
"one justification per `❌`"; § Not-done — "Coverage Depth Matrix is missing or contains unjustified `❌`
cells". A justification refuted by the tree is not a justification.
**Severity:** Blocking. **Traces to:** `defect:record-integrity` + `defect:correctness` (the guard
enforces the refuted text).

The matrix still reads, at HEAD:

```text
l.   4-5   "**Eight are covered; `US-0017-0007` is not** - its claim was withdrawn in round 1 and the
            row is scored as the gap it is."
l.  53     | US-0017-0007 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
l. 347     "### US-0017-0007 - runner parallelism derived from QFAI's own workload: ❌ and NOT COVERED"
l. 349     "No knob file ships."
l. 361-362 "`QFAI-ATDD-111` reports this story again, deliberately. It becomes coverable when the
            knobs ship."
```

Every one of those five is refuted by the annotation at
`tests/e2e/spec0017RunnerParallelismE2E.test.ts`, by `tests/e2e/qfai-traceability.md:220`, and by the
gate no longer reporting `QFAI-ATDD-111`. The stage changed the guard for this round and left the record
the guard reads.

**And the guard now makes the correction impossible.** `coverageDepthMatrix.test.ts:471-483` requires
every `US-0017-0007` heading section in the matrix to contain the word "withdrawn", inside a test whose
own name is "requires the **restored** `US-0017-0007` claim…". Measured, mutation `A` — the two sentences
rewritten to say the claim is restored, everything else untouched:

```text
PRE  .qfai/evidence/coverage-depth-spec-0017.md 33244B 92242ab42a3fac66
MUT  .qfai/evidence/coverage-depth-spec-0017.md 33233B 0f96d5ac2fb80f92  (changed=true)
FAIL |e2e| tests/assets/coverageDepthMatrix.test.ts > requires the restored US-0017-0007 claim ...
  AssertionError: every section for the withdrawn story must say the claim was withdrawn:
    expected [ Array(1) ] to deeply equal []
exit=1
POST .qfai/evidence/coverage-depth-spec-0017.md 33244B 92242ab42a3fac66  restored=true
POST .qfai/evidence/atdd-spec-0017.md           159293B 5bf57b3c09908e71  restored=true
```

So the guard built to stop the matrix drifting from the tree is what holds it there. Nobody can honestly
fix the matrix without reddening a required CI leg (`tests/assets/**` runs in the `e2e` project).

**Rework.** Re-score `US-0017-0007`, rewrite its justification section to the own-tree surface the story
actually names, correct l. 4-5, and change `coverageDepthMatrix.test.ts:478-483` from "must say
withdrawn" to a rule that survives the restoration — e.g. the section must name the carrier file, and the
`withdrawn` history must appear only inside quotation marks, which is `retractedClaims.test.ts`'s job and
its right home. Also settle the scope statement at matrix ll. 12-19 and 98-111, which still declares
`qfai init` as the only surface every cell is scored against (see `m4`).

### B4 — every gate citation in the record states a value the gate does not produce, and the current one is cited nowhere

**Artifact:** `.qfai/evidence/atdd-spec-0017.md:337-343` (`## Commands executed + key outputs`),
`:1620-1622` (`### P7 quality gates`), `:736-740`, `:949`, `:1905`.
**Contract:** `SKILL.md` § Success Criteria ("Validation passes for this spec: … `--fail-on error --spec
<spec-id>`") and the record's own § "Validate Hard Gate evidence" (ll. 729-734), which names the two
admissible citations.
**Severity:** Blocking. **Traces to:** `defect:record-integrity`.

Measured (shadow root, HEAD): `info=2 warning=0 error=1`. The record's two citation blocks read:

```text
l. 338-339   before this stage:  info=2 warning=0 error=2   QFAI-ATDD-111 (9 US), -112 (8 TC)
             after round 1:      info=2 warning=0 error=2   QFAI-ATDD-111 (1 US), -112 (8 TC)
l. 1620      node ... validate --profile atdd --spec 0017     info=2 warning=0 error=2
```

`## Commands executed` records the pre-stage and round-1 values and **no current row at all**, so the
one section whose contract is "commands executed + key outputs" does not contain the gate output this
round produced. `### P7 quality gates` asserts `error=2` as a current measurement.

**One thing in this area holds and is worth recording.** The tracked artifact is good: I parsed
`.qfai/report/validate.spec-0017.json` and a fresh shadow-root run of the same command and they are
deep-equal after normalising volatile keys (3278 bytes each). The rule at ll. 723-727 is satisfied.

**Rework.** Add the current row to `## Commands executed` with the seven-TC content, correct l. 1620, and
correct the three prose sites. Keep the historical rows labelled as history, as they already are.

### B5 — both P7 suite totals are wrong at HEAD, the sentence claims to be measured there, and the record's own rule yields the right numbers

**Artifact:** `.qfai/evidence/atdd-spec-0017.md:1579-1582`, and the sequence at `:1640-1664`.
**Contract:** the record's own stated invariant at ll. 1602-1603 and 1681-1683 — "any commit that changes
an `it` / `test` callsite under the e2e project's two include globs owes a row in the sequence below" —
and `SKILL.md` § Success Criteria "Repository quality gates … pass **with evidence**".
**Severity:** Blocking. **Traces to:** `defect:record-integrity`. This is the seventh round on one
sentence.

The record says, in terms that make it checkable: "**These numbers are measured at the working tree of
this commit**, which carries every repair through round 11: the e2e figure is **1440** and the
integration+unit figure **1212**." Measured at `45e6f041`:

```text
pnpm -C packages/qfai test:e2e                          Tests 1443 passed | 16 skipped   (record: 1440)
vitest run --project integration --project unit         Tests 1215 passed | 19 skipped   (record: 1212)
```

Two further defects fall out of the same measurement:

- **"which carries every repair through round 11"** is false of HEAD, which carries three round-12
  commits (`54a25be6`, `9174df54`, `45e6f041`).
- **The record's own derivation refutes its own total.** The sequence's base is `3f815725 1422`
  at 858 callsites; the derived line `e2e callsites at this tree: 879` is correct (`stageEvidenceCounts`
  passes on it). `1422 + (879 - 858) = 1443` — the measured value. The stated 1440 is refuted by the
  method printed twelve lines above it.
- **Five commits owe rows and have none.** The sequence's last row is `7af579c3 1437 873`. Recomputed
  per commit from `git show` over the project's two globs:

```text
737d009b  874 (+1)   apply round 10's advisories        -> owes a row
b510843b  875 (+1)   close round 10's R02 series        -> owes a row
699202b4  876 (+1)   make the instrument fail closed    -> owes a row
1b842190  877 (+1)   derive the ledger's five numbers   -> owes a row
54a25be6  879 (+2)   cover the two open obligations     -> owes a row
```

**Rework.** Re-measure both totals, add the five rows, and note that the integration+unit figure still
has no sequence and no derivation — which is the asymmetry the record names at ll. 1605-1608 and has now
paid for a second time.

### B6 — `## Coverage obligations checklist`, the section the DoD is read out of, is wrong in three ways

**Artifact:** `.qfai/evidence/atdd-spec-0017.md:754-762`.
**Contract:** `SKILL.md` § Evidence (required section) and § Success Criteria / § Not-done.
**Severity:** Blocking. **Traces to:** `defect:record-integrity`.

```text
l. 757  "`US-0017-0007` - not covered, deliberately."                     FALSE (B2)
l. 759  "`TC-0017-*` at `L3` - 63 of 71 covered"                          measured: 64 of 71
l. 760  "the 8 uncovered are the 6 `blocked` and 2 `todo` rows"           measured: 7 uncovered, and
        they are 5 of the 6 blocked plus the 2 todo - TDD-0030 is blocked AND covered
l. 761  "`QFAI-ATDD-112` names exactly those eight"                       measured: seven
```

Cross-tabulated from `tdd/test-list.md` (82 rows): `71 Integration / 11 Unit`; `74 refactor / 6 blocked /
2 todo`; `63 Integration refactor / 6 Integration blocked / 2 Integration todo / 11 Unit refactor`. The
record's ledger counts at ll. 25-27, 195 and 748 are all **correct**; it is the derived coverage arithmetic
in this section that is not. Blocked set = `{0016, 0030, 0032, 0033, 0034, 0035}`; uncovered set =
`{0016, 0032, 0033, 0034, 0035, 0069, 0070}`.

**Rework.** Restate as 64 of 71, seven uncovered, and name the two rows that break the old identity
(`TDD-0030`, covered while blocked — which `B1` says should be withdrawn; and `TDD-0069`/`TDD-0070`,
uncovered while `todo`).

### M1 — two refuted numerals stand as a bolded "Measured:" three lines above the paragraph declaring them removed

**Artifact:** `.qfai/evidence/atdd-spec-0017.md:370-384`.
**Contract:** the record's own retracted-claims rule (§ "W1-W13", `retractedClaims.test.ts`) — a claim a
review round refuted appears only inside quotation marks.
**Severity:** Major. **Traces to:** `defect:record-integrity`; recurring class item 7.

```text
l. 376-377  "... Measured: **55 of 55 planted builds refused, 6 of 6 shipped shapes
             accepted**, where the classifier caught 6 of 50."
l. 380-382  "Those two numerals were 55 and 6 for a round, against a corpus of 62 and 8 - and both were
             written as measurements. **No numeral for either list is stated here now** ..."
```

Measured from `packages/qfai/tests/unit/shippedLaneCommands.test.ts`: `PLANTED` (ll. 45-111) holds **62**
top-level entries and `SHIPPED` (ll. 114-123) holds **8**. So the repair paragraph was written, the
sentence it replaces was never deleted, and the record now states the two values its next paragraph
identifies as wrong while asserting that neither is stated. `retractedClaims.test.ts` is green over it —
"55 of 55" is not in `RETRACTED`.

**The same paragraph also carries a broken fragment**, which is how the deletion failed:

```text
l. 375-376  "A program that cannot reach a build whatever its arguments
             and are allowed by name; six could, and are allowed only as exact invocations, ..."
```

A numeral and its clause were removed mid-sentence, leaving a subject with no predicate. And "six could"
is itself an unretracted numeral in a paragraph that opens "The set the shipped tree invokes is **pinned
in the test, not counted here**". Measured in `packages/qfai/tests/helpers/shippedLaneCommands.ts`:
`HARMLESS_PROGRAMS` has **12** members, `ALLOWED_INVOCATIONS` has **10**, `TAKES_NO_PACKAGE` has **5**;
seven distinct programs appear among the allowed invocations. **Low confidence on which set "six" was
meant to count** — none of the four is six — which is the point: the numeral is unresolvable.

**Rework.** Delete ll. 376-377's "Measured: …" sentence, repair the fragment at ll. 375-376 without a
numeral, and add "55 of 55 planted builds refused" to `RETRACTED` so the sentence cannot come back.

### M2 — `### Findings per round` is one round behind in both of its own figures, and owes three rows

**Artifact:** `.qfai/evidence/atdd-spec-0017.md:1780-1790` and the table at `:1792-1827`.
**Contract:** the paragraph's own claim to describe how the table was built.
**Severity:** Major. **Traces to:** `defect:record-integrity`.

The paragraph asserts "**The rule below reproduces 25 of the 27 numeral-bearing rows**" and "ran it over
all **27** rows". Measured on the table at HEAD: **34** data rows, of which **30** carry a numeral in the
`findings` column (four carry `—`). I implemented the stated rule — distinct finding identifiers at
heading level two to four, optionally backtick-wrapped — over every `R0*.md` from `FIRST_PACK`:

```text
round 11  R01_implementation-reviewer.md  rule=16   record 16   agrees
round 11  R02_completion-reviewer.md      rule=17   record 17   agrees
round 11  R03_qa-gatekeeper.md            rule=15   record 15   agrees
(the only disagreements remain round 4's stage R03 and round 7's P1d, both already named)
```

So the rule now reproduces **28 of 30**, not 25 of 27. Round 11's three rows were appended without
re-deriving the sentence above them — in the paragraph whose entire subject is that counts must be
derived rather than described. That is the sixth occurrence of this class on this one block.

Round 12 owes three rows (`implementation-reviewer`, `completion-reviewer`, `qa-gatekeeper`), and the
denominator moves to 33 when they land.

### M3 — the `## Final status` rounds table stops at round 10 while the same section certifies twelve rounds

**Artifact:** `.qfai/evidence/atdd-spec-0017.md:1943-1954`, against `:1923-1924`.
**Contract:** `SKILL.md` § Evidence — `## Final status (PASS/FAIL) + who confirmed`.
**Severity:** Major. **Traces to:** `defect:record-integrity`.

The verdict sentence reads "Counted from the packs on disk: **twelve** rounds, **32** reviewer responses,
**31 REVISE and one PASS**". Measured: 12 pack directories from `FIRST_PACK`, and **32** `R0*.md` files
across them (round 12's has none yet) — so all three figures are **correct at HEAD**, and the derivation
works. But the table below it, whose job is "who confirmed", has **10** data rows: rounds 11 and 12 are
absent. The `### Findings per round` table has round 11; this one does not, so the record's two round
tables disagree on how many rounds exist.

**Rework.** Add rounds 11 and 12. The three certified numbers will move to 35 responses when this round's
reports land, and the guard will fail then — which the record correctly predicts at ll. 1934-1941.

### M4 — every figure in the unscoped-profile sentence is wrong

**Artifact:** `.qfai/evidence/atdd-spec-0017.md:1872-1877` (`### The full profile`) and item 3/4 at
`:1402-1416`.
**Contract:** `SKILL.md` § Success Criteria — the unscoped profile is what `build` runs, so these are the
figures a completion decision turns on.
**Severity:** Major. **Traces to:** `defect:record-integrity`.

`validate --profile full --fail-on error` in the shadow root: `info=4 warning=404 error=4` — the
**error=4 is correct**, and the two `QFAI-REVIEW-004/-005` errors are indeed this stage's in-flight pack
(`review-20260821180000000`), exactly as the record says. The item breakdown is not:

```text
record l. 1873   "12 US across five specs and 15 TCs across four, of which this spec owns 1 and 8"
measured         11 US across FOUR specs   (0003:8, 0006:1, 0008:1, 0015:1; spec-0017 owns 0)
                 14 TCs across four specs  (0003:1, 0008:4, 0015:2, 0017:7)

record l. 1402   "QFAI-ATDD-112 reports 8 spec-0017 TCs, and 15 repo-wide ... spec-0017 (8)"
measured         7 and 14

record l. 1416   "keep QFAI-ATDD-111 at 11 items repo-wide, plus US-0017-0007 makes 12"
measured         the 11 IS the total; spec-0017 contributes nothing
```

Item 3 also still says the uncovered eight are "the 6 blocked and 2 todo rows here", which `B6` measures
false.

### M5 — "127 of 208" is stated at three sites; this stage's own commit made it 209

**Artifact:** `.qfai/evidence/atdd-spec-0017.md:247-248`, `:324`, `:1422`.
**Contract:** `SKILL.md` § Evidence; and l. 324 sits inside `## Commands executed + key outputs`, where a
line is a quoted output.
**Severity:** Major. **Traces to:** `defect:record-integrity`.

Measured: `grep -cE '^- QFAI:' tests/e2e/qfai-traceability.md` gives **209** at HEAD and **208** at
`2ee4874b`. The extra line is `US-0017-0007`, added by this stage in `54a25be6`. The unbacked count is
still **127** (`node scripts/check-atdd-annotation-ledger.mjs` exits 1 with 127 lines; `spec-0012` = 28,
`spec-0017` = 0), so the ratchet `toBeLessThanOrEqual(127)` is intact and the scoped
`9 claim(s) backed ..., exit 0` is correct. Only the denominator moved, and the stage moved it.

Line 324 is worse than stale: the script prints no total at all, so the recorded
`-> exit 1; 127 of 208 claims unbacked` is not a quoted output but a paraphrase — which is why no guard
caught it.

### M6 — the Delta Rejected Guard promises a re-run over every artifact added since, and this round's two are absent

**Artifact:** `.qfai/evidence/atdd-spec-0017.md:56-67` (the artifact/rejected-option table).
**Contract:** `SKILL.md` § "Delta Rejected Guard (Mandatory)" ->
`shared-skill-operating-baseline.md#delta-rejected-guard-mandatory`; and the section's own sentence
"**Re-run against every artifact added since**, because for five rounds this section reasoned only about
the round-1 and round-2 set and each round faulted it for that."
**Severity:** Major. **Traces to:** `defect:process-contract`.

The table's six rows are `buildCommand.ts`, `buildCommand.test.ts`, `coverageDepthMatrix.test.ts`,
`stageEvidenceCounts.test.ts`, `retractedClaims.test.ts` and `CR-20260820-0012` option 5. The two
artifacts this round added — `tests/e2e/spec0017RunnerParallelismE2E.test.ts` and
`tests/integration/spec0017OwnWorkflowScope.test.ts` — appear in neither the table nor the prose after
it. So the section makes exactly the claim five earlier rounds faulted it for, one round after declaring
it fixed.

For the record: I checked both artifacts against the nine rejected options myself and found **no
reintroduction I can demonstrate**. The nearest is `DR-0017-0009` — "the declared parallelism value of
ten measured flakier, and was kept", with `BR-0017-0051` reserving any revision of the declared value to
the user — and the new e2e test uses the documented override in a fixture rather than editing a
declaration, which is the mechanism `DR-0017-0009`'s Consequences explicitly preserves. The finding is
that the mandatory section does not say so. **No RE-OPEN is required**, and I confirm the record's
conclusion on that point.

### M7 — "the uncovered set and the recorded-blocked set are the same set" is false in both directions

**Artifact:** `.qfai/evidence/atdd-spec-0017.md:466-471`.
**Contract:** `SKILL.md` § Evidence; it is the sentence a reader uses to decide the seven are accounted
for.
**Severity:** Major. **Traces to:** `defect:record-integrity`.

```text
uncovered (gate, measured)    {0016, 0032, 0033, 0034, 0035, 0069, 0070}
blocked   (ledger, measured)  {0016, 0030, 0032, 0033, 0034, 0035}
```

`TDD-0030` is blocked and not uncovered (`B1`); `TDD-0069` and `TDD-0070` are uncovered and not blocked —
both are `todo` with `DR-ID: -` and `Blocked-By: -`, which the record's own § "Ledger rows advanced"
(ll. 775-778, 791-796) calls a row that never started. So "**every one of the seven is a parked row**"
holds for five of the seven.

### M8 — the "four of seven closed packs" sentence is asserted at l. 1981 and declared retracted at l. 2051

**Artifact:** `.qfai/evidence/atdd-spec-0017.md:1980-1982` against `:2050-2052`.
**Contract:** the record's own retracted-claims rule (§ "W1-W13").
**Severity:** Major. **Traces to:** `defect:record-integrity`.

```text
l. 1981  "... § 'When each pack was actually sealed' below measures four of seven closed packs
          missing it by one to three commits."
l. 2051  "The table is the claim; the sentence that used to summarise it said 'four of the seven closed
          packs' and went stale as packs closed, which is the third count in this record to fail that way."
```

Measured from the table at ll. 2054-2067: **11** closed packs, of which **4** (rounds 2, 5, 6, 7) show a
gap, of 3, 1, 1 and 1 commits. The retracted sentence stands 70 lines above its own retraction. The seal
block itself is sound — 12 `Review pack:` and 12 `Review pack seal:` lines, the in-flight one named
without a seal, and `stageEvidenceCounts.test.ts` green over all eleven closed recomputations.

### M9 — the matrix guard's replacement comment claims a gate the test does not have

**Artifact:** `packages/qfai/tests/assets/coverageDepthMatrix.test.ts:452-465`.
**Contract:** the comment is a claim about what the test does, and this instrument is what stood in for
`SKILL.md` § Not-done ("Coverage Depth Matrix ... contains unjustified cells").
**Severity:** Major. **Traces to:** `defect:correctness` — a test whose stated property is not asserted.

The replacement comment says the assertion "no longer demands all-ternary-cross — it demands **the row
not claim more than the test delivers** ... what is not [defensible] is a raised score with no test
behind it, which the ledger check below is what actually prevents."

Measured, mutation `B` — `US-0017-0007`'s `Oracle strength` raised one grade with the partition kept
consistent (class A row, `A 30` to `A 29`, `38` cells to `37` in both records):

```text
MUT  coverage-depth-spec-0017.md  33227B d15a93122ff90bf3  (changed=true)
MUT  atdd-spec-0017.md           159293B 8521e82775fa1b13  (changed=true)
--- vitest verdict for mutation B ---
 Test Files  3 passed (3)   [coverageDepthMatrix, stageEvidenceCounts, retractedClaims]
exit=0
POST  both files restored=true
```

Nothing ties any cell's score to any test. The "ledger check below" requires an annotation, a carrier
file, `peakConcurrency(` and `spawnSync(` — none of which constrains a score in any column. Two smaller
defects in the same block: the comment at ll. 452-453 ("A floor first: `every` over an empty map is
vacuously true, so without this a row whose cells failed to parse would pass **the assertion below**")
now points at an assertion that was deleted; and ll. 454-457 and 463-465 are the **same**
`toHaveLength(COLUMNS.length)` assertion written twice.

**Rework.** Either assert the property the comment claims — a raised depth cell must be accompanied by a
named assertion in the carrier — or delete the claim and state plainly that the scores are unpinned.
Remove the duplicate assertion and the orphaned comment.

### m1 — `## Work performed (what changed, where)` omits both files this round added

**Artifact:** `.qfai/evidence/atdd-spec-0017.md:252-306`. **Severity:** Minor.
**Traces to:** `defect:record-integrity` — `SKILL.md` § Evidence names the section.

The list of `**new**` bullets ends at round-11 artifacts. Neither
`tests/e2e/spec0017RunnerParallelismE2E.test.ts` nor `tests/integration/spec0017OwnWorkflowScope.test.ts`
appears in it; each is mentioned once in narrative prose elsewhere (ll. 449, 466) and nowhere in the
section whose contract is what changed and where. The two files are this round's entire substantive
change.

### m2 — `## Test volume estimate` signals are both one behind

**Artifact:** `.qfai/evidence/atdd-spec-0017.md:744-750`. **Severity:** Minor.
**Traces to:** `defect:record-integrity` — `SKILL.md` § Volume Signals / § Estimator output table.

E2E `Signal` is `8` with the note "one describe each except `-0007`, withdrawn in round 1"; measured, nine
stories are annotated, so it is 9 and the note is refuted. Integration `Signal` is `63`; measured, 64 of
71 `Integration` TCs are covered.

### m3 — "twenty-nine reports" against 32

**Artifact:** `.qfai/evidence/atdd-spec-0017.md:1940`; the same figure at `:418`. **Severity:** Minor.
**Traces to:** `defect:record-integrity`.

"a verdict is not written in any parseable form by more than two of **twenty-nine** reports" — measured,
**32** `R0*.md` from `FIRST_PACK`, which is the figure the same section derives correctly nineteen lines
earlier. The A3 paragraph at l. 418 carries the same stale twenty-nine.

### m4 — "four of the nine stories name the own tree explicitly" is now five, by the record's own new reading

**Artifact:** `.qfai/evidence/atdd-spec-0017.md:130-140`;
`.qfai/evidence/coverage-depth-spec-0017.md:84-111`. **Severity:** Minor.
**Traces to:** `defect:record-integrity`.

Both records enumerate four own-tree stories (`-0002`, `-0003`, `-0005`, `-0008`). § "The gate moved" now
argues, correctly (see my ruling 3), that `US-0017-0007`'s subject is the own repository — so the
enumeration owes a fifth row. The consequence is larger in the matrix: its § "The scoring surface" states
"Those assertions are `Integration` rows of `tdd/test-list.md` and are scored there, not here", and
`US-0017-0007`'s own-tree assertion is an **E2E** file in this spec's own annotation set, which that
sentence has no room for. The matrix's scope statement at ll. 12-19 ("Every cell below is scored against
**that** surface", meaning `qfai init`) is likewise now false of one row.

### m5 — a duplicated paragraph and a broken clause in § "Review packs and their seals"

**Artifact:** `.qfai/evidence/atdd-spec-0017.md:1980-1996`. **Severity:** Minor.
**Traces to:** `defect:record-integrity`.

Lines 1984-1986 and 1992-1996 say the same thing about the same guard ("It is now derived —
`stageEvidenceCounts.test.ts` compares the packs ... against the directories on disk") twelve lines apart.
That is the two-copies-that-drifted shape the record reports fixing at ll. 780-783. Line 1982-1983 also
carries an orphaned clause — "This sentence asserted the practice for two rounds while its own table
refuted it and before this record's verdict was written" — where an edit was welded onto a fragment.

### m6 — the two new test files are outside `TRACKED`, so nothing derives or records either

**Artifact:** `packages/qfai/tests/assets/stageEvidenceCounts.test.ts:46-58`;
`.qfai/evidence/atdd-spec-0017.md:310-343`. **Severity:** Minor.
**Traces to:** `defect:process-contract`; § Not-done "Tests exist but were never executed".

`TRACKED` holds seven files and was not extended for either file added this round. Its own comment
(ll. 51-57) records that exact defect for round 11's one new file — "It was the one new test file outside
this list, so its count was checked by the recorded-vitest-output rule and its `.each` / `.for`
precondition was not". This round it is worse: `## Commands executed + key outputs` quotes no run of
either file, so neither count is stated anywhere and neither `.each` precondition is checked. The suite
does execute them (both are inside the green `test:e2e` / `integration` runs I measured), so this is a
record gap rather than an unexecuted test.

### m7 — `CR-20260820-0007` blocks nine rows and the ledger blocks four of them

**Artifact:** `.qfai/decisions/CR-20260820-0007-*.md:14`; `.qfai/specs/spec-0017/tdd/test-list.md`.
**Severity:** Minor, **low confidence on ownership**. **Traces to:** `defect:record-integrity`.

The CR's `Blocked set` reads `spec-0017 TDD-0032, TDD-0033, TDD-0034, TDD-0035, TDD-0052, TDD-0066,
TDD-0067, TDD-0074, TDD-0075` — "all nine, held while this CR is open". Measured, only `TDD-0032`..`0035`
are `blocked`; `TDD-0052`, `TDD-0066`, `TDD-0067`, `TDD-0074` and `TDD-0075` are `refactor` and annotated.
I cannot tell from here whether that is an over-broad blocked set or five rows advanced past an open CR,
and `tdd/test-list.md`'s cells are `/qfai-implement`'s. Raised because it bears directly on `M7`: the
record's "recorded-blocked set" is not a well-defined set while the CR and the ledger disagree by five
rows. **Not blocking** on this stage.

### m8 — `TDD-0069` / `TDD-0070` described as parked while their ledger cells say the opposite

**Artifact:** `.qfai/evidence/atdd-spec-0017.md:466-471` and `:1521-1533`. **Severity:** Minor.
**Traces to:** `defect:record-integrity`.

Both rows read, at `tdd/test-list.md:107-108`, `Status: todo`, `DR-ID: -`, `Blocked-By: -`, and an
`Evidence` cell opening "**NOT BLOCKED by a CR** - waiting on data that does not exist yet ... the
workflow changes are unmerged". The record retracts all three of those statements at ll. 808-816 and
correctly says at ll. 775-778 that neither cell has been written — so calling them "parked rows" at l. 467
asserts a status the artifact contradicts, in the one sentence a reader uses to accept the seven. This is
`M7` at a finer grain and is listed separately because the fix is a wording fix, not an arithmetic one.

### A1 — the fifteenth entry for the recurring-class list, and a runner-up

**Artifact:** `.qfai/evidence/atdd-spec-0017.md:1442-1499` (item 7, fourteen entries — I counted them and
the number is right). **Severity:** Advisory. **Traces to:** `advisory:record-quality`.

**Entry 15 (primary): the matrix guard's replacement gate.** `M9`. The comment asserts that the test
"demands the row not claim more than the test delivers" and that "the ledger check below is what actually
prevents" a raised score. Measured by running it: raising a depth cell with the partition kept consistent
leaves all three guards green. It is a claim about how the test is **written** — there is a check below —
standing in for what it **does**, and it was written in the commit that restored the claim, inside the
guard built to stop the matrix over-claiming. That is the same "written while applying a finding about
this class" signature as entries 3, 9 and 14, and it belongs beside entry 5 and entry 13 as the
*replacement* assertion being justified by a sibling that does not cover it.

**Runner-up: "No numeral for either list is stated here now" (l. 381-382).** `M1`. A claim about how the
record is written, false of the same paragraph three lines above it, and the two numerals it declares
absent are the two the same sentence identifies as wrong. Structurally this is entry 10 with the polarity
flipped — entry 10 was a false claim that a count came from one enumeration; this is a false claim that
no count is stated at all.

If only one is taken, take the first: it is verified by running rather than by reading, which is the
countermeasure the list itself names.

### A2 — `review_request.md` says six TCs and the gate says seven

**Artifact:** `.qfai/review/review-20260821180000000/review_request.md:34-36`. **Severity:** Advisory.
**Traces to:** `advisory:process-note` — a sequencing note, not a defect.

The request was committed in `9174df54` and the `TC-0017-0016` withdrawal landed in `45e6f041` after it,
so the request describes a tree one commit old. Noted so no later reader reads the discrepancy as a
record defect. Both reviewers after me will see seven.

### A3 — the in-flight pack, recorded as a sequencing note

**Artifact:** `.qfai/review/review-20260821180000000/`. **Severity:** Advisory.
**Traces to:** `advisory:process-note`.

The pack holds `review_request.md` and no `R0*.md` and no `summary.json`, which is why
`validate --profile full` reports `QFAI-REVIEW-004` / `-005` against it. That is the contract, not a gap,
and the record states it correctly at ll. 1873-1877 and 2087-2095. `git status --porcelain --ignored
.qfai/review/review-20260821180000000` is **empty**, so the request is tracked; this report and the other
two will need `git add -f` at the sealing step, per `.gitignore:61`.

## Counts I checked and found correct

Recorded because the brief asked for a per-number verdict, and a number that holds is a result.

```text
82 ledger rows; 71 Integration / 11 Unit; 74 refactor / 6 blocked / 2 todo          correct
cross-tab 63 Integration refactor / 6 blocked / 2 todo / 11 Unit refactor           correct (derived)
09_delta § Rejected: three candidates                                              correct
07_Decisions.md: six rejected alternatives across three DRs, at :133 :137 :203
  :206 :242 :249 (the file carries nine DRs)                                       correct
9 claim(s) backed by a test annotation (spec-0017), exit 0                          correct (derived)
127 unbacked repo-wide; spec-0012 = 28; spec-0017 = 0                              correct
e2e callsites at this tree: 879                                                    correct (derived)
validate --profile full: error=4                                                   correct
twelve packs; 32 reviewer responses; 31 REVISE + 1 PASS sums to 32                  correct (derived)
sealing-timing table: eleven rows, no "(this commit)" left                          correct
ci:lint has eleven && members                                                      correct
item 7 holds fourteen entries                                                      correct
Coverage Depth Matrix totals ✅ 3 / ⚠️ 1 / ❌ 5; ❌ partition A 30 / B 7 / C 1 = 38   correct (derived)
.qfai/report/validate.spec-0017.json deep-equals a fresh scoped run                correct
TDD-0069 / TDD-0070 are still todo, DR-ID: -, Blocked-By: -                        correct
```

## Completion contract — the summary

- **Claimed done that is:** `US-0017-0007` is genuinely covered, by a test that observes an effect rather
  than a declaration, and the reason it stood uncovered for eleven rounds is correctly diagnosed. That is
  a real advance and the first movement of this gate.
- **Claimed done that is not:** `TC-0017-0030` (`B1`). Its ledger row is `blocked` on an open `intent` CR
  with `Approved option: -`, the case's own oracle is false of the tree, and the annotated assertion
  cannot see the violation. The gate went quiet over an unmet obligation.
- **Claimed blocked that is not:** nothing, on this stage's side. `TDD-0069` / `TDD-0070` are correctly
  reported as unwritten; the defect is calling them "parked" (`m8`).
- **Verdict field:** `## Final status` says **FAIL**, which is right. It says FAIL for reasons that are no
  longer true (`B2`, `B4`), which is the problem.
- **`error=1` is real and is this stage's, minus `TC-0017-0030`.** Withdrawing that annotation returns
  `QFAI-ATDD-112` to eight TCs, not to `error=2` — `QFAI-ATDD-111` stays clear. So the honest statement
  after the rework is `error=2 -> error=1`, on eight TCs, seven of them parked and one (`TDD-0030`) parked
  and previously silenced.

## Rework list, ordered

1. `B1` — withdraw the `TC-0017-0030` annotation and ledger line; correct the "no CR names it" claim.
2. `B2`, `B4`, `B6` — one fact, eleven sites plus the two gate blocks. Verify with `grep` after editing.
3. `B3` — rewrite the matrix's `US-0017-0007` section and scope statement, and change the guard rule that
   currently forbids the correction.
4. `B5` — re-measure both suite totals; add the five owed sequence rows.
5. `M1`-`M9` — the retracted numerals, the two round tables, the unscoped figures, the ledger denominator,
   the Delta guard re-run, the two set claims, and the guard comment.
6. `m1`-`m8`, then `A1`.

## Open risks and residual gates

- **No stage gate has passed in twelve rounds**, and the scoped gate cannot pass while seven `TC`s are
  uncovered — six of which are unreachable from this stage (`CR-20260818-0007`, `CR-20260820-0007`,
  `CR-20260820-0012`, `DR-0017-0010`), and one of which (`TDD-0030`) becomes the seventh again once `B1`
  is applied. **`CR-20260818-0007`, `CR-20260820-0001`, `CR-20260820-0007` and `CR-20260820-0012` are all
  open with `Approved option: -`.** Four user decisions are the critical path, not more test writing.
- `--profile full` stays at `error=4`, two of them this pack, and `build` runs that profile.
- `CR-20260820-0011`'s 127 unbacked ledger claims remain a cross-spec obligation.
- **No self-approval:** I did not author or edit any artifact under review. The two mutations are measured
  and reverted; HEAD is `45e6f041` at start and finish and `git status --porcelain` is empty at both.
