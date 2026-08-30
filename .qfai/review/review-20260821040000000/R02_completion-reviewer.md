# R02 — completion-reviewer, round 5

**Result: REVISE**

- Reviewer: `completion-reviewer` (independent; authored or edited nothing under review)
- Stage: `/qfai-atdd` (spec-0017), round 5
- **Reviewed revision: `3f815725`.** `git rev-parse --short HEAD` was `3f815725` at start and at
  finish; `git status --porcelain` was **empty** at both. HEAD did not move.
- **Audited evidence hash (stage review):
  `sha256:ca3bded855fff0d7d6e69b7eada587c2a7b24dd1b5cdd042a0782cc6588e852c`** — the four steps of
  `constitution/shared-skill-delegation-baseline.md:395-441`. Subject:
  `.qfai/evidence/atdd-spec-0017.md` minus `## Final status`
  (normalized `4cfdac6d6086c50c60035555a558e85059a60f93d7ee013a13a08d2d4e21d86b`) plus
  `.qfai/evidence/coverage-depth-spec-0017.md` whole
  (`80eefb70943792023882bb257738070a1fddfa3a872af1c2fc38c05e9ba950dd`), serialized as
  `path + NUL + sha256` sorted by path, hashed. `## Final status` is at `:805` and **no `##` heading
  follows it**, so truncating and excising remain byte-identical operations.
- Authored/edited under review: **none.**
- **Mutations: none.** Every finding below is derivable read-only, so no oracle round was planted and
  nothing needed reverting. `validate` ran three times against a `git archive HEAD` shadow root at
  `tmp/r5/shadow` with all **83** tracked symlinks re-materialised natively from the index (83
  declared, 83 created, 83 verified as links); the tracked `.qfai/report/validate.log` is
  `2b572934ce71305b4fcfc1ac40c34c164f83cf8d` before and after, equal to
  `git rev-parse HEAD:.qfai/report/validate.log`, mtime unchanged at 23:24:30. Scratch under `tmp/r5/`
  only. No `git checkout` / `stash` / `reset`, no commit, no push.
- **Shadow artifact, disclosed:** every shadow run reports one extra `QFAI-LINK-001` (70 wrappers read
  as dangling under the shadow root). It is an artifact of the shadow, as round 4's P1d also recorded,
  and is excluded from every count below. All quoted error counts are after that exclusion.

## Verdict summary

**Seven blocking, five major, five minor.**

Round 4 produced real repairs and I could not fault most of them. The third `ELOOP` site is guarded
(`check-atdd-annotation-ledger.mjs:154`) and the three loop tests exist; the ratchet no longer asserts
the claim count at all and its comment is honest about all three attempts; `msbuild MySolution.sln` is
back in the corpus with a comment forbidding its removal by outcome; the four-place build claim is
pinned as a set in `buildCommand.test.ts:307-313` and it is exactly right; the `Blocked-By` column
exists and `DR-ID` no longer carries a `CR-*`; round 3's missing stage gatekeeper is now disclosed;
`## Final status` gained round 4's B2 clauses; and every one of the figure groups the request sent me
to re-derive that does not depend on running the suite **reproduces exactly**.

What did not survive is, again, the same two mechanisms.

**The suite is RED at the revision under review** (B1). `pnpm -C packages/qfai test:e2e` exits **1**
with `1 failed | 1421 passed | 16 skipped`; the P7 block certifies `1422 passed / 16 skipped, exit 0`.
The failing test is this round's own new artifact, and it fails **by construction**: it requires every
pack directory on disk to be named and sealed in `## Final status`, and the practice that fixed round
1's moving-tree problem commits this round's pack before the reviewers launch, so the pack a reviewer
reads can never be sealed yet. The round's headline instrument is a test that punishes its own
process.

**`## Ledger rows advanced` is false for the fifth consecutive round** (B2), and this time the false
statement is the claim that the repair happened. `:369-373` says four statements "are gone now". Two of
them are **thirteen lines above that sentence**, and `git show 54d8d325:...md | sed -n '333,340p'` is
**byte-identical** (md5 `d6b22c98049f83b2310c59d84eed8672`) to `sed -n '353,360p'` at HEAD — the
paragraphs round 4 rejected were never touched. Round 3 fixed the table and not the prose; round 4
fixed the prose's second half and not its first, and wrote that it had fixed all of it.

And the "applied to one artifact, not the other" pattern repeated three more times: round 4's B2 landed
in `## Final status` and not in `## Gaps` item 8 (B3); P1d's clause-1 correction landed in
`CR-20260820-0012` and not in `DR-0017-0010`'s own option-5 paragraph or in the record's summary of it
(B4); P1d's `build`-is-unscoped strand landed in the CR and not in the record (M2).

---

## What I re-derived and could not fault

Every number below was measured from the tree at `3f815725`, not read from a prior report.

1. **The ledger, parsed mechanically** (`tmp/r5/ledger2.py`): **82** data rows of 9 cells,
   `TDD-0001`-`TDD-0082`, no duplicates. `Layer`: **71 `Integration` / 11 `Unit`**. `Status`: **74
   `refactor` / 6 `blocked` / 2 `todo`**. Cross-tab `Integration`: **63 / 6 / 2**, and `63+6+2 = 71`
   closes. `atdd:21-22`, `:247`, `:258` exact. The 6 `blocked` are
   `TDD-0016/0030/0032/0033/0034/0035` and exactly **four** carry `Blocked-By: CR-20260820-0007`
   (`atdd:640`, `coverage-depth:212` exact). `TDD-0069` / `TDD-0070` are at `test-list.md:107-108`,
   both `todo`, `DR-ID: -`, `Blocked-By: -` — `atdd:275`, `:292`, `:822-824` exact. The column list at
   `atdd:682-684` is verbatim correct against `test-list.md:37`.
2. **The matrix, parsed mechanically** (`tmp/r5/matrix.py`): 9 rows x 7 depth columns. `Status`
   **3 / 1 / 5** — `coverage-depth:57` and `atdd:411` exact. **38** depth failure cells plus 5 in
   `Status` — `coverage-depth:114` exact. The partition is **complete, disjoint, holds no non-failing
   member and names no non-depth column**; sizes **A 30 / B 7 / C 1 = 38** — `coverage-depth:139`
   exact. Class B is exactly the four rows whose `Status` is not a failure; class C is exactly
   `US-0017-0001` crossed with `Boundary values`.
3. **The scoped gate.** Shadow run: `info=2 warning=0 error=2`. `QFAI-ATDD-111` names
   **`SPEC-0017:US-0017-0007` and nothing else**; `QFAI-ATDD-112` names **exactly the eight**
   `TC-0017-0016, -0030, -0032, -0033, -0034, -0035, -0069, -0070` — the six `blocked` rows plus the
   two `todo` ones. `atdd:223`, `:236-239`, `:638-640`, `:820` exact.
4. **`validate --profile full` is `error=4`** (`info=4 warning=404`), and the four are
   `QFAI-REVIEW-004` and `-005` against **this round's own pack** plus `QFAI-ATDD-111` and `-112`.
   `atdd:795-796` is right about the count.
5. **The unscoped ATDD breakdown, exactly as `CR-20260820-0012:157-159` states it.** Measured from the
   shadow's `--profile full` run: `QFAI-ATDD-111` = `SPEC-0003 8, SPEC-0006 1, SPEC-0008 1,
   SPEC-0015 1, SPEC-0017 1` = **12**; `QFAI-ATDD-112` = `SPEC-0003 1, SPEC-0008 4, SPEC-0015 2,
   SPEC-0017 8` = **15**. P1d's round-4 M1 is fully applied **in the CR**. (Not in the record: M2.)
6. **All four pack seals reproduce, plus the superseded and the two-space variants**
   (`tmp/r5/seal.py`). Manifest form `<git hash-object><single space><path><LF>`, `LC_ALL=C` order,
   sha256 over the byte stream: round 1 `5c8cd425...c74317e3` (`atdd:857`), round 2
   `305ffd65...5983e77a` (`:861`), round 3 `257e793b...6d01bfd0` (`:864`), **round 4
   `aaa2d2a6...04db35ff` (`:867`) — the new one, and it is right**; the superseded
   `d8ac0a77...58967c9` (`:858`) over round 1's three reports **as they stand today**, which is what
   discharges the re-seal; and the two-space form gives exactly `fa8d6e83...d17e2526` at `:874`.
   Round 1's printed manifest at `:891-894` is byte-identical to what I hashed. `atdd:884-886`'s rule
   — recompare against the **recorded** values, not a tree-read expectation — is correct and is the
   reasoning `SKILL.md:298` asks for.
7. **`CR-20260820-0011`'s figures.** `tests/e2e/qfai-traceability.md` holds **208** unique claims;
   `check-atdd-annotation-ledger.mjs` reports **127** unbacked (exit 1), so **81** backed; the
   spec-0017 slice is **8** claims and the scoped guard reports `8 claim(s) backed`, exit 0.
   `atdd:111`, `:209`, `:212`, `:649-652` exact.
8. **P7's derivable members.** `pnpm ci:lint` **exit 0**, and `package.json`'s `ci:lint` splits on
   `&&` into exactly **eleven** members (`atdd:723` exact). The three-project invocation gives
   **1186 passed / 19 skipped**, exit 0 (`atdd:725-726` exact on the number; wrong on the invocation
   — M3).
9. **Every per-file count the new test pins.** Measured by running each file:
   `checkAtddAnnotationLedger.test.ts` **22**, `buildCommand.test.ts` **9**,
   `spec0017LayeredCiScaffoldE2E.test.ts` **9** across **8** annotated describes,
   `coverageDepthMatrix.test.ts` **4**. `atdd:110`, `:180`, `:188`, `:191`, `:193` and the recorded
   command output at `:202` are all exact. Round 4's B4 item 1 and B3's "restate as 11" are closed the
   right way round: the corpus moved out, so the file is 9 again and the record says 9.
10. **The three named corpora are the sizes claimed.** `REGRESSIONS` **20** entries
    (`buildCommand.test.ts:68-87`), `KEPT` **15** (`:98-112`), `NOT_BUILDS` **18** (`:121-138`) —
    `atdd:554-555` exact. `msbuild MySolution.sln` is in `REGRESSIONS` at `:87` with a comment at
    `:89-90` recording why it stays "whether it passes or not". Round 4's B4 selection-by-outcome
    finding is properly closed.
11. **The four-place build claim is exact and pinned.** `buildCommand.test.ts:307-313` pins the
    `ci.yml` direct build, the `release.yml` pack line, `heuristic::ci.yml::pnpm ci:build-verify` and
    `heuristic::release.yml::pnpm ci:gate` as a set; `atdd:558-563` restates it correctly, including
    that the last two are opaque to any command-line scan and land on `heuristic` by luck. Round 4's
    gatekeeper B1 and B2 are substantively answered.
12. **The six rejected alternatives, exact.** `07_Decisions.md` carries exactly **six**
    `Decision, rejected alternative` bullets, at `:133`, `:137`, `:203`, `:206`, `:242`, `:249` —
    `atdd:33-34` exact — and `09_delta.md` section `Rejected` carries exactly **three** candidate
    bullets at `:145`, `:153`, `:161`, each correctly characterised at `atdd:39-45`.
13. **Delta Rejected Guard — substance PASSES for this round's artifacts, which I checked myself
    because the record's section did not (M5).** No rejected option is reintroduced.
    `07_Decisions.md:133-136` rejects "a second parser over the same **YAML**", and
    `stageEvidenceCounts.test.ts` parses markdown evidence and the annotation ledger — no workflow
    YAML, no spec artifact. `:137-140` rejects a validator rule under the distributed validator
    surface; the round added a test and a test helper, neither of which is that surface.
    `CR-20260820-0012` option 5 splits one **example**, not the test-case table (`09_delta.md:145`)
    and not the spec (`:153`) — no collision, and **no RE-OPEN is required for anything in this
    round.**
14. **The ratchet's third form is right, and its comment is the record of it.**
    `checkAtddAnnotationLedger.test.ts:403-422` asserts `unbacked <= 127` plus "no spec-0017 entry
    unbacked" and **asserts the claim count nowhere**; `:404-413` states all three attempts and why
    each was wrong, including that the floor "punished the remediation just as squarely as equality
    punished the addition". Round 4's gatekeeper B3 option (c), applied as specified.
15. **The third `ELOOP` site and its tests.** `check-atdd-annotation-ledger.mjs:154` now admits
    `isLoop` in the `stat` catch, with `:150-153` recording that this was the unguarded site;
    `checkAtddAnnotationLedger.test.ts:206-270` adds the self-junction, the mutual cycle and the
    dangling-link cases. Round 4's gatekeeper B6 and B6b, applied. (The ids `L1`-`L3` the record gives
    these rounds are cited nowhere — B7.)
16. **Round 3's missing stage gatekeeper is disclosed.** `atdd:775-791` carries a round-3 / round-4
    verdict table with the finding counts and states plainly that round 3's stage-level
    `qa-gatekeeper` did not run, that `agent-routing.yml` has it mandatory and blocking, and that its
    slot went to the P1d re-route. Round 4's B5 first half, applied well.
17. **`DR-0017-0010`'s third statement of clause 1 is correct** — see the rulings. And "or by any
    other" is gone from the DR, as P1d required.

---

## BLOCKING

### B1 — the suite is RED at the revision under review, the P7 block certifies `exit 0`, and the failing test cannot be green during a review round

- **Artifacts**: `packages/qfai/tests/assets/stageEvidenceCounts.test.ts:111-131`;
  `.qfai/evidence/atdd-spec-0017.md:722-724`, `:736-745`, `:843`
- **Contract**: `qfai-atdd/SKILL.md:294` ("Repository quality gates (format/lint/type/tests/pack)
  pass with evidence"); `:305` Not-done ("Validation evidence is missing or failing"); `:313` ("Do not
  declare completion when any gate is FAIL"); Evidence (MANDATORY)
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Success Criteria (repository quality
  gates) plus Stage Gate **P7** / `defect:correctness`

Measured, twice, at `3f815725`:

```text
pnpm -C packages/qfai test:e2e
  ->  EXIT=1     Test Files  1 failed | 82 passed | 4 skipped (87)
                 Tests       1 failed | 1421 passed | 16 skipped (1438)

npx vitest run tests/assets/stageEvidenceCounts.test.ts
  ->  Tests 1 failed | 3 passed (4)
      "every pack this stage opened must be named in Final status":
      expected [4 packs] to deeply equal [5 packs]
      -   "review-20260821040000000"
      at tests/assets/stageEvidenceCounts.test.ts:127:7
```

`atdd:723` records that command as `1422 passed / 16 skipped, exit 0`. **1422 is the total** — 1421
passing plus the one failing — so the figure was true at the moment it was taken and the tree it
describes is not the tree under review. This is the P7 staleness failure mode for the **third**
consecutive round (round 3 found it at `16f611c7`, round 4 found the replacement stale, and `atdd:717`
says these numbers are "measured at the tree that carries every round-4 repair"). It is worse than the
previous two, because the cause is inside the repair: `3f815725` added the test **and** created
`.qfai/review/review-20260821040000000/`, and the suite was evidently run between those two acts.

**And the test cannot be satisfied at a revision a reviewer reads.** `:116-118` selects every pack
directory at or after `review-20260820200000000` and `:123-130` requires each to be named in
`## Final status` **with a seal**. `atdd:842-843` and `SKILL.md:298` both fix the seal at "when the
last reviewer response lands" — which, for the current round, is after this file. So the only
configurations that pass are (a) the record naming this round's pack with a premature seal that will
be wrong at completion, or (b) the record naming a pack it has not sealed, which `:130` rejects. The
committing-the-request-first practice is correct and is what fixed round 1's moving-tree problem; the
test is written as though it were not happening. This is the same in-flight-pack mechanism that
produces `QFAI-REVIEW-004` / `-005`, which the record **does** disclose at `:795-800` — reproduced in
the suite, where nothing discloses it.

**Required fix.** Exclude the pack whose own reviewer responses have not landed from the `packs` list
(the same scoping `QFAI-REVIEW-004` / `-005` needs), or assert over sealed packs only. Then re-measure
both P7 totals **after** the last artifact of the round changes, and record the revision each was
measured at — round 3's `B4` third clause, still open. Until the suite exits 0, `SKILL.md:313` bars
declaring completion, and the record must say the suite is red rather than that it is green.

### B2 — `## Ledger rows advanced` is false for the fifth consecutive round, and the false statement is the claim that the repair happened

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:353-357`, `:359-360` against `:369-373`;
  `.qfai/decisions/DR-0017-0010-*.md:86-89`, `:107`, `:144-149`
- **Contract**: `qfai-atdd/SKILL.md:322-325` (`## Ledger rows advanced` is an index table **plus one
  `### TDD-NNNN` section per row**, and "the payload goes in the section");
  `qfai-implement/SKILL.md:116` (step 3b reads that section); Evidence (MANDATORY)
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) plus Stage Gate
  P1b/P1d / `defect:correctness`

`:369-373` states:

> Four statements went in that pass and are gone now: that the workflow changes being unmerged is
> `TDD-0069`'s obstacle (it is not; the obstacle is the self-referential gate in `CR-20260820-0012`),
> that there is "no run history to mutate" for clause 1 (the correction is narrower — see the DR),
> that "branch 3 it is" for both rows, and that the blocking condition is the `exception` P1d PASS for
> both.

Two of the four are gone. **Two are thirteen and nine lines above that sentence.**

```text
:355-356   "it could not be made green on this branch at all, because the workflow changes are
            unmerged"                                        <- statement 1, claimed gone
:359-360   "Nothing satisfies this one - there is no run history to mutate."
                                                             <- statement 2, claimed gone
```

Proven, not inferred:

```text
git show 54d8d325:.qfai/evidence/atdd-spec-0017.md | sed -n '333,340p'
   -> md5 d6b22c98049f83b2310c59d84eed8672
sed -n '353,360p' .qfai/evidence/atdd-spec-0017.md
   -> md5 d6b22c98049f83b2310c59d84eed8672        diff -> identical

git diff -U0 54d8d325 0cfa67c9 -- .qfai/evidence/atdd-spec-0017.md | grep '^@@'
   -> hunks at -256,2  -260,4  -342,2  -346,7 ... and NOTHING between -333 and -341
```

So the round-4 repair replaced old `:342` ("Branch 3 it is") and old `:346-352` (the `exception`-gate
paragraph) and never entered the branch-1 and branch-2 paragraphs — the two P1d's B1 named **first**,
at its own `:200-203`, and the two my round-4 `B1` named as items 3a and 3b. Round 3 fixed the table
and not the prose; round 4 fixed half the prose and wrote that it had fixed all of it.

Both statements remain contradicted by the governing DR at the lines the record itself cites:
`DR:86-89` — "'the workflow changes that produce an aggregate verdict are unmerged' **was false** as
`TDD-0069`'s reason. `ci-pass` exists at `.github/workflows/ci.yml:469` and has run twelve times on
this branch" — and `DR:144-149`, which now attributes clause 1's unavailability to no tuning change
existing, **not** to absent run history.

**Two further defects in the same section.** `:274-277` and `:292-294` are the same paragraph twice
("Neither ledger cell has been written" / "Neither cell has been written yet", both citing
`test-list.md:107-108`, `DR-ID: -`, `Blocked-By: -`) — an insertion where a replacement was intended,
which is the same edit failure one level down. And `:285-286` says "Rounds 1, 2 and 3 each found a
false statement in this section"; round 4 found one too (my `B1`, P1d's `B1`), making it four.

**Required fix.** Rewrite `:353-360` for the `blocked` disposition: replace "because the workflow
changes are unmerged" with `DR:107`'s actual branch-1 reason ("the data it reads cannot exist here"),
and replace "there is no run history to mutate" with `DR:144-149`'s clause-1 / clause-2 split. Delete
one of the two duplicate paragraphs. Correct `:285` to four rounds. Then check the whole section
against `git diff` before claiming any statement is gone — three rounds have now claimed a repair the
diff does not contain.

### B3 — `## Gaps / Open risks` item 8 still asserts both ledger statuses as facts, and `## Final status` says the opposite

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:671-677` against `:822-833` and
  `.qfai/specs/spec-0017/tdd/test-list.md:107-108`
- **Contract**: `qfai-implement/references/execution-ledger.md` (`blocked` and `exception` are written
  statuses, not proposals); `qfai-atdd/SKILL.md:298` ("check that `## Final status` says what that
  pack says"); Evidence (MANDATORY)
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) /
  `defect:correctness`

Round 4's `B2` required both sentences moved to the not-yet form. It was applied to `## Final status`,
which is now correct and exemplary: `:822-824` — "**both rows are still `todo` in the ledger.**
`tdd/test-list.md:107-108`, `DR-ID: -`, `Blocked-By: -`. Nothing has moved"; `:825` — "`TDD-0070` is
**not yet** `exception`"; `:829` — "`TDD-0069` is **not yet** `blocked` either".

`## Gaps / Open risks` item 8 was not touched. `:672-673`:

> `TDD-0070` **is** `exception` against `DR-0017-0010` — post-merge history cannot exist pre-merge,
> which P1d sustained. `TDD-0069` **is** `blocked` on `CR-20260820-0012`

One record, two sections, opposite claims about the same two cells, and the ledger backs
`## Final status`: I parsed it mechanically and both rows are `todo` with `DR-ID: -` and
`Blocked-By: -`. This is the third round in which a two-place finding about these rows was applied to
one place.

**Required fix.** `:672-673` to the same not-yet form as `:825` and `:829`, naming the ledger cells.

### B4 — the record publishes the superseded clause-1 reading as the DR's current position, and `DR-0017-0010` still carries it in its own option-5 paragraph

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:770-771`, `:747-771`;
  `.qfai/decisions/DR-0017-0010-*.md:164-165`; against `DR:144-149` and
  `.qfai/decisions/CR-20260820-0012-*.md:125-127`
- **Contract**: `qfai-atdd/SKILL.md` Evidence (MANDATORY) — evidence verifiable by a party that did
  not author it; round 4's P1d `R04` required item 2 ("State clause 1 correctly, **in the DR and in
  option 5**") and item 4
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Stage Gate P1d plus Evidence
  (MANDATORY) / `defect:correctness`

P1d's round-4 `B2` ruled that "degenerate" was the **third wrong** statement of clause 1 and required
"unsatisfied, not degenerate" everywhere. Applied in one of the three places.

- **`CR-20260820-0012:125-127` is right**: "Clause 1 is **unsatisfied** — no tuning change has been
  made… (An earlier version of this option called clause 1 _degenerate against this_…"
- **`DR-0017-0010:144-149` is right**: "**Third statement, and the narrow one: clause 1 is
  UNSATISFIED.** Not unfalsifiable, not degenerate".
- **`DR-0017-0010:164-165` is wrong, and it points at the passage that corrects it**: "Clause 1's row
  would still be **degenerate against this runner** (see above), so the split does not close it
  either". "See above" is now `:144-149`, which says the opposite. This also reproduces verbatim the
  self-contradiction P1d's Judgement 5 identified — "does not close it either" beside "it would stop a
  reachable half being parked behind an unreachable one" — which P1d's required item 4 asked to be
  resolved once item 2 was applied.
- **`atdd:770-771` is wrong, and it is the record's only summary of the DR's position**: "An
  equivalent mutant, written while applying a finding about that clause. `DR-0017-0010` **now records
  clause 1 as degenerate rather than satisfied**." A completion gate reading `### P1d's verdicts` is
  told the DR holds the reading the DR retracts twenty lines later.

`### P1d's verdicts` (`:747-771`) is also missing its third pass entirely: `:749` says P1d ran three
times, and the section then narrates **First pass** (`16f611c7`) and **Second pass** (`1473897a`) and
stops. The pass on `54d8d325` — the one that produced this correction, plus M1's unscoped-`build`
strand and M3's option-5 warrant — appears only as a row in the `:776-784` table.

**Required fix.** `DR:164-165` to "unsatisfied", and resolve that paragraph's reachability
contradiction now that item 2 is applied. `atdd:770-771` to the DR's actual current statement. Add a
**Third pass** paragraph to `### P1d's verdicts` naming `54d8d325`, its two blocking findings and its
three majors.

### B5 — `## Final status` "who confirmed" has not moved in four rounds

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:836-839`; against `:687-697`, `:775-784` and
  `.qfai/review/review-20260821020000000/summary.json`
- **Contract**: `qfai-atdd/SKILL.md:298` ("check that `## Final status` says what that pack says");
  `:365` (`## Final status (PASS/FAIL) + who confirmed`); Success Criteria "Completion is approved by a
  reviewer who did not implement tests"
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md:298` Success Criteria /
  `defect:correctness`

`:836-839` still reads: "Confirmed by: round 1's two independent blocking reviewers, both **REVISE**,
on `8fb48002`" and names only `R02` and `R03` of `review-20260820200000000`.

Four rounds and twelve reviewer responses have landed. Round 4's pack alone holds three reports and a
`summary.json` recording `completion-reviewer` FAIL / 16, `qa-gatekeeper` FAIL / 12, `qa-gatekeeper`
FAIL / 8. Rounds 2, 3 and 4 appear in narrative tables at `:687-697` and `:775-784` — sections a
completion gate reads second — and **nowhere** in the section whose own title is "who confirmed". This
is round 3's `m1`, round 4's `B5` second half and round 4's gatekeeper `M6`, unapplied for a fourth
round, and it is the only place `SKILL.md:298`'s check has to look.

The pack-seal half of the same subsection is exemplary and fully verified (item 6). The confirmation
half is three rounds stale.

**Required fix.** Extend "Confirmed by" to name every round's blocking reviewers with the revision
each ran at and its verdict, state that all twelve responses are REVISE, and say that round 5's are not
yet claimed.

### B6 — `## Work performed` omits the round's own headline artifact, plus the `DR-*` and the `CR-*` this stage created

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:178-196`; against `:314-316`, `:337`, `:736-745`
  and `git diff --stat 54d8d325 3f815725`
- **Contract**: `qfai-atdd/SKILL.md:342` (`## Work performed (what changed, where)`); Evidence
  (MANDATORY); round 4's `B3`, whose required fix was to add the round's new tests to this list
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) /
  `defect:correctness`

`git grep -n stageEvidenceCounts` over the record returns `:737`, `:743`, `:852` — the P7 paragraph and
the pack-seal paragraph. `## Work performed` lists nine items and **not** the file this round exists to
add. The same list omits two other artifacts this stage authored:
`.qfai/decisions/DR-0017-0010-*.md` (mentioned only at `:314-316`) and
`.qfai/decisions/CR-20260820-0012-*.md` (mentioned only at `:337`), while
`.qfai/decisions/CR-20260820-0011-*.md` **is** listed at `:194`.

This is exactly round 4's `B3` — "the round's headline artifact appears nowhere in either governance
record" — recurring in the list that finding was applied to. `SKILL.md:342` makes the section "what
changed, where"; three of this stage's artifacts changed and are not there.

**Required fix.** Add `packages/qfai/tests/assets/stageEvidenceCounts.test.ts` with its test count
(**4** by `it(` blocks; note that the file's own `countCases` reports **6** for it — see M1),
`.qfai/decisions/DR-0017-0010-*.md` and `.qfai/decisions/CR-20260820-0012-*.md`. Consider pinning the
matrix test's and the new test's own counts, which the new test does not.

### B7 — `## Final status` cites three families of oracle rounds that exist nowhere in the repository, and one family's ids denote round-4 mutations that reddened NOTHING

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:812-814`, `:660`, `:249`, `:258`; against
  `.qfai/review/review-20260821020000000/R03_qa-gatekeeper.md:184-194`, `:743-746` and
  `R02_completion-reviewer.md:446-453`
- **Contract**: `qfai-atdd/SKILL.md` Evidence (MANDATORY) — verifiable by a party that did not author
  it; `:361` (`## Execution logs`); round 3's `B7`, which established that a cited round range must be
  recoverable
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) /
  `defect:correctness`

`:812-814` lists this stage's achievements as "sixteen falsification rounds on the matrix pinning test
(`M1`-`M7`, `X1`-`X3`, `X6`-`X8`, `Y1`-`Y3`), **three on the ledger ratchet (`W1`-`W3`), three on the
loop guard (`L1`-`L3`) and four more on the matrix record's own prose (`Z1`-`Z4`)**". The sixteen are
recorded at `:595-621` and I take them as recorded. The other ten are not.

```text
grep for W1 W2 W3 across both evidence artifacts
  -> one hit only: atdd:660, "W1 and W3 redden, W2 stays green" (in ## Gaps, not ## Execution logs);
     no definition of any of the three
grep for L1 L2 L3
  -> atdd:813 (the claim) and atdd:249, :258 - where L1 / L3 are the TEST LAYER codes, a different
     meaning for the same ids in the same document; no definition of the loop rounds anywhere
grep for Z1 Z2 Z3 Z4
  -> atdd:814 (the claim) only; no definition anywhere
```

The loop-guard substance **does** exist (`checkAtddAnnotationLedger.test.ts:206-270`, verified item 15)
and the matrix test did gain prose pinning, so I do not doubt that rounds were run. What is wrong is
that `## Final status` — the one section a completion gate reads first, and the one section excluded
from every audit subject so that it can be trusted — counts ten rounds no third party can check. That
is round 3's `B7` in the same file, at a larger scale.

**And `Z1`-`Z4` are worse than uncited.** In the pack this section is sealing, `Z1`-`Z4` are round 4's
gatekeeper's four mutations at `R03:184-194`, every one recorded `REDDENS NOTHING`, and `Z1`-`Z2` are
my own two at `R02:446-453`, also `REDDENS NOTHING`. Those ids, as they exist in the reviewed material,
denote the **failure** of the matrix test to see its own record. `## Final status` counts them as four
falsification rounds achieved. `W2` is disclosed at `:660` as staying green — correctly, as the swap
blind spot — and is nonetheless counted in "three on the ledger ratchet".

**Required fix.** Add `## Execution logs` subsections defining `W1`-`W3`, `L1`-`L3` and `Z1`-`Z4` with
their mutations and results, in the shape of `:595-603`, and **renumber the prose rounds** so they do
not collide with round 4's `Z1`-`Z4`; or drop the three families from `:812-814` and cite the
reviewers' rounds by report and line. Rename `L1`-`L3` so they do not collide with the layer codes at
`:249` and `:258`.

---

## MAJOR

### M1 — what `stageEvidenceCounts.test.ts` leaves typed, and how to satisfy it while the record misstates the tree

- **Artifacts**: `packages/qfai/tests/assets/stageEvidenceCounts.test.ts:25-33`, `:45-66`, `:99-109`,
  `:116-118`, `:129-130`
- **Contract**: `qfai-atdd/SKILL.md` Evidence (MANDATORY); the test's own stated purpose at `:10-12`
  ("derive the number from the artifact, so the record cannot disagree with the repository without
  something failing")
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) /
  `defect:code-quality`

The idea is right and three of its four tests are sound. It **found a real defect on its first run**
(the missing fourth pack seal — confirmed: `git diff 0cfa67c9 3f815725` adds that seal line in the same
commit as the test), and it forced the record's prose from "nine tests across eight" to "9 tests
across 8" so a number could be read at all. Four gaps.

**1. `countCases` counts comment and string occurrences, and its own docstring proves it.** The regex
at `:32` matches any `it(` or `test(` preceded by a non-word, non-dot character. Measured with the
test's own regex (`tmp/r5/count.mjs`):

```text
checkAtddAnnotationLedger.test.ts   countCases = 22   (22 real)   ok
buildCommand.test.ts               countCases =  9   ( 9 real)   ok
spec0017LayeredCiScaffoldE2E...    countCases =  9   ( 9 real)   ok
coverageDepthMatrix.test.ts        countCases =  4   ( 4 real)   ok
stageEvidenceCounts.test.ts        countCases =  6   ( 4 real)   <- line 26, the docstring
                                                                    "Count `it(` / `test(` callsites"
```

The four covered files are clean **today**. The exploit is one comment away: add a line mentioning
`it(` to any of them and the test demands the record state a number the file does not hold — a test
that forces its own record to be wrong. It also means the new file cannot be added to `CLAIMS` (B6)
without either fixing `countCases` or writing 6 where there are 4. Strip line comments and string
literals first, or match at line start with optional indentation.

**2. Test 3 compares a *backed* count against a *declared* count and never runs the guard.** `:103`
counts spec-0017 annotation tokens in the ledger; `:104` extracts the record's "N claim(s) backed by a
test annotation"; `:106-108` asserts they are equal with the message "the recorded guard output must
match the ledger it read". Those are two different quantities that happen to coincide at 8 because all
eight spec-0017 claims are currently backed. Append one unbacked spec-0017 ledger line — the
`CR-20260820-0011` defect class, and the `M7` mutation `:602` says reddens — and the guard's true output
stays `8 claim(s) backed` while this test reddens, reporting a correct record as wrong. The check that
would actually close the gap is to **run** `check-atdd-annotation-ledger.mjs --spec 0017` and compare
its stdout.

**3. The pack filter has a hard-coded date window.** `:117` filters pack names on a regex whose date
component admits only `20260820` and `20260821`. A pack opened on 2026-08-22 does not match, so from
tomorrow the test silently stops requiring new packs to be named — the exact "goes vacuous without
being noticed" shape `:592` names as the reason the matrix test needed pinning. Derive the boundary from
the first pack this stage opened, not from the calendar.

**4. Seals are counted, not recomputed** (`:129-130` asserts one recorded seal per named pack). That is
the right scope — `SKILL.md:298` assigns the recomputation to completion against the **recorded**
values, and `atdd:884-886` argues correctly why a tree-read expectation would launder itself — but the
record at `:743-744` says "Everything derivable about the artifacts… is now checked by" this test, and
the seal values are derivable and are not checked. Say so.

**What it leaves typed, of the eight numbers rounds 3 and 4 found wrong:** the `X1`-`X8` range, "six
ways", the `E9` / `E10` descriptions, "With `E6`-`E8` that is six rounds", the round-2 `R01` finding
count, "Three blocking reviewers", the matrix test's own 4 and this file's own 4 — **all still
unpinned, and five of them still wrong** (M4, m1, m2). The test covers 4 of about 14 derivable figures
in the record.

### M2 — `## The full profile` calls two unscoped errors "the scoped" ones, and the record never states `QFAI-ATDD-112`'s repo-wide 15

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:795-796`, `:638-640`, `:641-648`; against
  `.github/workflows/ci.yml` (three dogfooding steps, `--fail-on error --root .`, no `--spec`) and
  `.qfai/decisions/CR-20260820-0012-*.md:155-159`
- **Contract**: `qfai-atdd/SKILL.md:294` and `:305`; round 4's P1d `R04` `M1` required the strand "in
  both artifacts"
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Success Criteria (repository quality
  gates) / `defect:correctness`

`:795-796` reads: "`validate --profile full` reports **`error=4`** … and `build` runs that profile.
**Two are the scoped `QFAI-ATDD-111` / `-112`**". The `full` profile is run **unscoped**. Measured:

```text
QFAI-ATDD-111, unscoped:  SPEC-0003 8  SPEC-0006 1  SPEC-0008 1  SPEC-0015 1  SPEC-0017 1  = 12
QFAI-ATDD-112, unscoped:  SPEC-0003 1  SPEC-0008 4  SPEC-0015 2  SPEC-0017 8               = 15
```

So `build` needs **fifteen** TCs annotated, not the eight `## Gaps` item 3 states, and eleven of the
twelve US and seven of the fifteen TCs belong to four other specs — which item 4 says explicitly is not
this stage's work. Item 4 discloses the sibling picture for `-111` ("11 items repo-wide, plus
`US-0017-0007` makes 12", exact) and says nothing about `-112`'s seven. P1d's round-4 `M1` called this
"the dominant strand"; it landed in `CR-20260820-0012:155-159`, verbatim correct, and not here.

**Required fix.** Correct `:795-796` to say the two ATDD errors under `full` are the **unscoped** ones
and give both counts, and add `-112`'s repo-wide 15 with its per-spec split to `## Gaps` item 3 or 4,
cross-referencing the CR.

### M3 — the P7 block invokes a project that does not exist, and its own arithmetic does not close

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:725-726`, `:735-738`; against
  `packages/qfai/vitest.workspace.ts:17-72`
- **Contract**: `qfai-atdd/SKILL.md` Stage Gate **P7**; Evidence (MANDATORY)
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Stage Gate P7 / `defect:correctness`

`vitest.workspace.ts` declares seven projects — `core`, `unit`, `validators`, `integration`, `e2e`,
`cli`, `scripts` — and `tests/assets/**` is an `include` of the **`e2e`** project (`:55`). There is no
`assets` project. Consequences:

- `:725-726`, the three-project invocation with `--project assets` in it: the number 1186 is exact (I
  reproduced it) but `--project assets` selects nothing and is silently ignored, so the caption names
  three projects for a two-project measurement.
- `:737`, "four tests in the **`assets` project**, which the `test:e2e` invocation also runs": the four
  tests are in the `e2e` project, which is why `test:e2e` runs them. The stated reason is wrong even
  though the conclusion (1418 -> 1422) is arithmetically right.
- `:735-737`, "its two corpus tests left the `e2e` project and **nine** joined `unit`: 1420 -> 1418,
  **1174 -> 1186**": +12, not +9. The other three are the `ELOOP` tests that took
  `checkAtddAnnotationLedger.test.ts` from 19 to 22 in the `integration` project — a real, attributable
  move that the sentence absorbs into an unexplained gap of three.

**Required fix.** Name the projects that exist, attribute all twelve of the `integration`+`unit` move,
and record the revision each P7 figure was measured at (round 3's `B4`, third clause, still open).

### M4 — round 4's `M4` bookkeeping is entirely unapplied, in the section repaired for that defect two rounds ago

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:590`, `:609`, `:581-582`, `:585-586`, `:577`;
  against `.qfai/review/review-20260820220000000/R02_completion-reviewer.md:300-301` and
  `R03_qa-gatekeeper.md:83-84`
- **Contract**: `qfai-atdd/SKILL.md` Evidence (MANDATORY) — verifiable by a party that did not author it
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) /
  `defect:correctness`

Four items, none touched:

1. `:590` heading is "M1-M7, **X1-X8**, Y1-Y3"; `:611-621` lists `X1, X2, X3, X6, X7, X8` — **six**.
   `X4` and `X5` are recoverable in round 2's own `R02_completion-reviewer.md:300-301` and are still
   uncited. `grep` for `X4` / `X5` over both evidence artifacts: zero hits.
2. `:609` — "Rounds 2 and 3 then broke the test itself, **six ways**" — is followed by **nine** rounds,
   and `## Final status:812-813` counts the same list as nine.
3. `:581-582` gives `E9` = "the fail-open default changes without the record" and `E10` = "the
   fail-open path stops warning", credited at `:585-586` to round 2's `qa-gatekeeper`. That report,
   `R03_qa-gatekeeper.md:83-84`, gives `E9` = "the fallback falls open SILENTLY (warning annotation
   cut)" and `E10` = "the fallback is indistinguishable from a pin". Following `E9` to its cited source
   finds the other mutation.
4. `:585-586` — "With `E6`-`E8` that is six rounds" — names `E9` and `E10` as the additions, so the
   arithmetic is five; it closes only if `E11` is counted, and `E11` is the one round the sentence never
   attributes to anyone. `:577`'s heading, "the three rounds round 3 could not find", also misstates
   round 3's finding, which was that they were not recorded.

One thing worth crediting: `E11` is no longer unverifiable — round 4's gatekeeper reproduced all six
`E6`-`E11` independently (`R03:376-397`) with the Oracle Strength Check applied per round. The record
still cites round 3's `implementation-reviewer` instead and leaves `:578-580`'s "nothing in the
repository supports the claim" standing.

### M5 — the Delta Rejected Guard section still covers rounds 1-2's artifacts only, two rounds after that was raised

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:31-50`
- **Contract**: `constitution/shared-skill-operating-baseline.md#delta-rejected-guard-mandatory`;
  `qfai-atdd/SKILL.md` Delta Rejected Guard (MANDATORY output)
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Delta Rejected Guard

`:46-50` reasons about `check-atdd-annotation-ledger.mjs` and about not writing `06_Test-Cases.md`. It
says nothing about `buildCommand.ts` / `buildCommand.test.ts` (which **do** parse both workflow trees),
`stageEvidenceCounts.test.ts` (which parses the annotation ledger a second time, alongside the guard),
or `CR-20260820-0012`'s option 5 (whose name collides with two rejected candidates). Round 4's `m3`
raised this for round 4's artifacts; it is now two rounds of artifacts deep, and the guard is a
mandatory stage output.

**I checked all four myself and the conclusion holds** (verified item 13) — so this is a completeness
defect in a mandatory output, not a substantive collision. **Required fix:** re-run the section against
the current artifact set and record the four sentences, including the one round 4's `M5` asked for in
`CR-20260820-0012` distinguishing option 5 from `09_delta.md:145` and `:153`.

---

## MINOR

### m1 — "Three blocking reviewers" contradicts the record's own Work Orders table and the manifest

`:688` opens "**Three blocking reviewers** on `56daee8d`". `agent-routing.yml` gives
`qfai-atdd`/`review` `blocking_agents: [qa-gatekeeper, completion-reviewer]` with
`implementation-reviewer` **conditional**, and the record's own table at `:436` states this correctly.
Routing a third reviewer was right; the label is wrong. Round 3's `M4`, round 4's `m1`, unapplied for a
third round. **Severity: advisory** | **Traces to:** `agent-routing.yml` `qfai-atdd` phases.

### m2 — the round-2 table still understates `R01` by four findings

`:695` records `implementation-reviewer` at "4 blocking, 6 medium, **5 low**". Counted at
`review-20260820220000000/R01_implementation-reviewer.md`: `B1`-`B4` (`:60`-`:159`), `M1`-`M6`
(`:198`-`:323`) and **`m1`-`m9`** (`:350`-`:393`) = **19**, not 15. `R02` (4 / 4 / 5) and `R03` (3
blocking, 6 advisory) are both exact. Round 3's `m2`, round 4's `m2`, unapplied for a third round.
**Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY).

### m3 — `DR-0017-0010` cannot count its own corrections

`DR:144` labels the current reading "**Third statement**"; `DR:151` says the record "has now been wrong
about clause 1 **three times**, in three different directions, across three P1d passes". If three prior
statements were wrong the present one is the fourth. `DR:126` ("The second said clause 1 … is
satisfied") and `DR:137` ("The second revision called clause 1 'degenerate'") also both say "the second"
for two different versions. The paragraph whose subject is repeated miscounting miscounts. **Severity:
advisory** | **Traces to:** `qfai-atdd/SKILL.md` Stage Gate P1d.

### m4 — round 4's `B4` is half-applied on `mvn package`

`msbuild MySolution.sln` is in the corpus with a comment forbidding its removal (`:87-90`) — the right
fix. `mvn package` is in no corpus. It is no longer a *stated* limit (the v3 paragraph carrying that
claim is gone) and `buildCommand.ts:70` now lists `mvn` as a build runner, so the substance is handled;
only the pin is missing. **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Evidence
(MANDATORY).

### m5 — this round's pack is the source of the two `QFAI-REVIEW-*` errors, and of B1's failing assertion

`.qfai/review/review-20260821040000000/` at `3f815725` held only `review_request.md`, which raises
`QFAI-REVIEW-004` and `-005` at error severity under `full`, and which is the fifth directory
`stageEvidenceCounts.test.ts` counts. Both are **sequencing notes on my own round**, not gaps: the
practice is right and is what fixed round 1's moving-tree problem. B1 is about the test being written as
though the practice were not happening; M2 is about the record's characterisation of the errors. Neither
is about this pack. **Severity: advisory** | **Traces to:** `defect:code-quality`.

---

## Rulings on the questions put to me

### Question 2 — break `stageEvidenceCounts.test.ts`

**Broken three ways, and it is red at HEAD without any help from me.** See B1 and M1. The number it
should catch and does not: its own file's count, which its own `countCases` reports as **6** for a
4-test file because the function counts the `it(` and `test(` in its own docstring. The way to satisfy
it while the record misstates the tree: test 3 compares the ledger's **declared** spec-0017 claim count
against the record's transcription of a **backed** count and never executes the guard, so the two
quantities can drift apart in the direction that leaves the test green. And it goes vacuous by calendar
on 2026-08-22, because its pack filter's date component admits only two days.

### Question 4 — `DR-0017-0010`'s clause 1, third statement

**It is right.** Not a fourth wrong reading.

`BR-0017-0053` (`04_Business-Rules.md:102`) governs "Each parallelism tuning **change**";
`TC-0017-0069`'s expected result (`06_Test-Cases.md:134`) says "A tuning **change** touches one
project"; `EX-0017-0053`'s subject column is "A parallelism tuning **pull request** and its recorded
aggregate-verdict runs". The assertable object is a change, and no tuning change exists on this branch —
this PR lands the declared starting values. So clause 1 has no instance to be true of: **unsatisfied**
is the accurate word, and branch 2's precondition ("an obligation already satisfied by state that
exists") genuinely fails, for a reason that is true rather than for the runner-expressibility reason P1d
refuted. "Falsifiable in principle once a change exists" also holds, and P1d's own round-4 `B2` supplies
the mechanism: `CR-20260820-0003:83-89` tabulates `maxConcurrency` as project-scoped,
`vitest.knobs.ts:104` puts it in `projectKnobs`, and `vitest.workspace.ts:17-72` spreads `projectKnobs`
into all seven projects, so a differential `maxConcurrency` on one project is a one-line,
runner-honoured, per-project tuning change that a clause-1 test could be reddened against.

Two things about it are still wrong and they are **B4**, not this ruling: the DR states the retracted
"degenerate" reading twenty lines later at `:164-165` with a "(see above)" pointing at the correction,
and `atdd:770-771` publishes "degenerate rather than satisfied" as the DR's current position.

### Question 5 — re-derive every number

Of the figure groups the request names, **eleven re-derive exactly**: `--profile full` at `error=4`; the
unscoped `QFAI-ATDD-112` breakdown `1/4/2/8 = 15` and `-111`'s 12; all four pack seals plus the
superseded and the two-space variants; the ledger's 82/71/11, 74/6/2 and Integration 63/6/2; the
matrix's 3/1/5 and its 38-cell A30/B7/C1 partition; `CR-20260820-0011`'s 208/127/81; the six
rejected-alternative bullets at their six line numbers; 1186/19; `ci:lint` exit 0 with eleven members;
the four per-file test counts 22/9/9-across-8/4 and the guard's 8 backed; and the three corpus sizes
20/15/18.

**One does not, and eight further figures are wrong or unrecoverable:**

| figure | recorded | measured |
| --- | --- | --- |
| the e2e project suite | "1422 passed / 16 skipped, **exit 0**" (`:723`) | **1 failed** / 1421 passed / 16 skipped, **EXIT 1** (B1) |
| the P7 invocation | three projects, one of them `assets` (`:725`) | no `assets` project exists; 1186 is integration+unit (M3) |
| the new test's home | "four tests in the **`assets` project**" (`:737`) | the `e2e` project, per `vitest.workspace.ts:55` (M3) |
| the integration+unit move | "**nine** joined `unit`: 1174 -> 1186" (`:736-737`) | +12; the other three are the `ELOOP` tests, 19 -> 22 (M3) |
| the `full` profile's ATDD errors | "the **scoped** `QFAI-ATDD-111` / `-112`" (`:796`) | unscoped: 12 US and 15 TCs across five specs (M2) |
| the X-round range | "`X1-X8`" (`:590`) | six listed; `X4`, `X5` uncited (M4) |
| ways the test was broken | "**six** ways" (`:609`) | nine listed (M4) |
| `E9` / `E10` content | `:581-582` | transposed vs `R03_qa-gatekeeper.md:83-84` (M4) |
| round-2 `R01` findings | "4 blocking, 6 medium, **5 low**" (`:695`) | 4 / 6 / **9** = 19 (m2) |
| `W1`-`W3`, `L1`-`L3`, `Z1`-`Z4` | ten rounds claimed at `:813-814` | defined nowhere; `Z1`-`Z4` in the pack reddened NOTHING (B7) |

Five of these were introduced or left standing **inside the repair of a finding about that exact
class**: the suite total and the `assets`-project attribution landed with the test built to stop numbers
drifting; the `X1-X8` range and "six ways" are in the block rewritten to answer round 3's `B7`; and the
two clause-1 statements are in the artifacts rewritten to answer P1d's `B2`.

### Are this stage's disclosed gaps complete?

**No.** The nine items the request lists are each genuinely recorded and accurate as far as they go —
`US-0017-0007` uncovered by choice (`:636-637`), the scoped gate at `error=2` (`:236-239`), `full` at
`error=4` (`:795`), the five inert lanes (`:632-635`), the 127 unbacked claims (`:649-660`), the E2E
surface unable to run a workflow (`:661-664`), the two opaque build commands (`:565-569`), Stage Minimum
Roles unused for P2-P4 (`:422-448`), round 3's stage gatekeeper (`:786-791`) — and I could not fault any
of them. Two rows parked with neither transition authorised is disclosed in `## Ledger rows advanced`
and `## Final status` and **contradicted** in `## Gaps` item 8 (B3).

Undisclosed and material:

1. **The suite is red and the record says it is green** (B1) — and the mechanism that makes it red is
   the stage's own review-pack practice, which the record analyses for `validate` and not for the suite.
2. **`build` needs fifteen TCs, not eight** (M2), across four specs the record's own Gaps item 4 puts
   outside this stage's work.
3. **`DR-0017-0010` still carries the retracted clause-1 reading, and the record reports it as current**
   (B4). A `DR-ID` cell is a permanent pointer and `exception` clears only by `exception -> todo`.
4. **Ten of the oracle rounds `## Final status` counts cannot be checked by anyone** (B7), and four of
   the ten are ids that mean the opposite in the pack being sealed.
5. **The round's own new test, the branch-3 DR and `CR-20260820-0012` are not in `## Work performed`**
   (B6).
6. **`stageEvidenceCounts.test.ts`'s own limits** (M1) — its `countCases` counts comments, its ledger
   check compares two different quantities, its pack filter expires tomorrow, and it checks four of about
   fourteen derivable figures — none of which the record states while calling it the thing that makes the
   numbers derived rather than typed (`:743-744`).

---

## Required fixes (blocking only)

1. **B1** — scope `stageEvidenceCounts.test.ts:116-118` to exclude the pack whose reviewers have not
   landed; re-measure both P7 totals after the last artifact of the round changes; record the revision
   each was measured at; and state the suite's real result until it exits 0.
2. **B2** — rewrite `:353-360` for the `blocked` disposition using `DR:107` and `DR:144-149`; delete one
   of the duplicate paragraphs at `:274-277` / `:292-294`; correct `:285` to four rounds; and verify
   against `git diff` before claiming any statement is gone.
3. **B3** — `:672-673` to the not-yet form, naming the ledger cells, matching `:825` and `:829`.
4. **B4** — `DR:164-165` to "unsatisfied" and resolve its reachability contradiction; `atdd:770-771` to
   the DR's current statement; add a **Third pass** paragraph to `### P1d's verdicts`.
5. **B5** — extend `## Final status` "Confirmed by" to every round's blocking reviewers, with the
   revision and verdict of each, and state that round 5's are not yet claimed.
6. **B6** — add `stageEvidenceCounts.test.ts`, `DR-0017-0010-*.md` and `CR-20260820-0012-*.md` to
   `## Work performed`.
7. **B7** — define `W1`-`W3`, `L1`-`L3` and `Z1`-`Z4` in `## Execution logs`, renumber the prose rounds
   away from round 4's `Z1`-`Z4` and the `L*` layer codes, or drop them from `:812-814` and cite the
   reviewers' rounds by report and line.

## Advisory / Change Request proposals

- **Harden `countCases`** (M1): strip comments and string literals, or anchor at line start. Then add
  the matrix test's 4 and this file's own 4 to `CLAIMS`.
- **Make test 3 run the guard** (M1) instead of comparing a declared count to a backed one.
- **Derive the pack window** (M1) from the first pack this stage opened rather than from a date regex.
- **Re-run the Delta Rejected Guard** against the current artifact set (M5), and add the sentence
  distinguishing option 5 from `09_delta.md:145` and `:153` (round 4's `M5`, still open).
- **A pack in flight now breaks two gates, not one** (m5, B1). `QFAI-REVIEW-004` / `-005` and this
  round's suite failure share one cause: a pack directory that must exist before its contents can. A
  `CR-*` against whichever skill owns `review-artifact-layout.md` is the place for the validate half —
  this is a product obligation upstream never asked for, so per
  `drift-protocol.md#reviewer-originated-obligations` it **must not gate this rework**. B1 asks only
  that this spec's own test stop asserting it, which is inside the DoD.
- **Fix the oracle-round bookkeeping** (M4): cite `X4` / `X5` to
  `review-20260820220000000/R02_completion-reviewer.md:300-301`, make "six ways" count its list, correct
  `E9` / `E10` against `R03_qa-gatekeeper.md:83-84`, and cite round 4's independent `E6`-`E11`
  reproduction instead of leaving "nothing in the repository supports the claim" standing.
- **Pin `mvn package`** (m4) now that `mvn` is a recognised runner.

## Open risks / residuals

- **The e2e project is red at `3f815725`** and `SKILL.md:313` bars declaring completion while any gate
  is FAIL. The failing assertion is the round's own instrument, and it will fail again next round unless
  it is scoped.
- **`build` is red on four errors**, of which the record accounts for two correctly and mislabels the
  other two as scoped; the real repo-wide obligation is 12 US and 15 TCs across five specs, four of them
  other specs' work.
- **`TDD-0069` and `TDD-0070` are both `todo`** with `DR-ID: -` and `Blocked-By: -`. Nothing has moved
  and neither is closeable by this stage. A fourth P1d re-route is owed, and `DR-0017-0010:10-11` says
  so; on B2 and B4 the handover entry is still malformed, so step 3b would leave `TDD-0069` at `todo`
  either way.
- **Ten oracle rounds rest on gitignored harnesses** (B7). `E11` was the single instance two rounds ago;
  it is now three whole families, and the pattern is four stages deep.
- **The authorship-separation breach stands** and is unrepairable retroactively. Five rounds of
  independent reviewers repair the gate, not the history.
- **`CR-20260814-0001` is approved and unapplied**, so `QFAI-ATDD-111` remains satisfiable by editing a
  markdown list; the guard closes that direction for `spec-0017` only and is not in `ci:lint`.
- **Concurrency.** I ran alongside whichever other reviewers this round routes; an
  `R04_qa-gatekeeper-p1d.md` appeared in this pack during my run. Own shadow root (`tmp/r5/shadow`) and
  own scratch (`tmp/r5/`); the tracked `.qfai/report/validate.log` was never written by me and any
  run-log pointer in the working tree may reflect another run.

## Evidence checked

- `.qfai/review/review-20260821040000000/review_request.md`;
  `.qfai/review/review-20260821020000000/` all five files (R02, R03, R04, request, `summary.json`);
  `review-20260820220000000/R01_implementation-reviewer.md`, `R03_qa-gatekeeper.md`; the four earlier
  packs' file listings and blob hashes
- `.qfai/evidence/atdd-spec-0017.md` (whole); `.qfai/evidence/coverage-depth-spec-0017.md` (whole)
- `.qfai/specs/spec-0017/tdd/test-list.md` (parsed mechanically, 82 rows of 9 cells);
  `07_Decisions.md:125-145` and its six rejected alternatives; `09_delta.md` section `Rejected`
- `.qfai/decisions/DR-0017-0010-*.md` (whole); `CR-20260820-0012-*.md`; `CR-20260820-0011-*.md`
- `.qfai/assistant/skills/qfai-atdd/SKILL.md:280-330` and `:340-370`;
  `.qfai/assistant/constitution/shared-skill-delegation-baseline.md:395-445`
- `packages/qfai/tests/assets/stageEvidenceCounts.test.ts` (whole);
  `packages/qfai/tests/unit/buildCommand.test.ts` (the three corpora and the real-tree pin);
  `packages/qfai/tests/integration/scripts/checkAtddAnnotationLedger.test.ts:200-424`;
  `packages/qfai/tests/helpers/buildCommand.ts`; `scripts/check-atdd-annotation-ledger.mjs:106-190`;
  `packages/qfai/vitest.workspace.ts`; `package.json` (`ci:lint`)
- **Commands run.** `git rev-parse --short HEAD` and `git status --porcelain` (start and finish);
  `git ls-files -s` (83 tracked symlinks, tallied by first path component: `.claude` 34, `.github` 30,
  `.codex` 11, `.agents` 8); `git archive HEAD` shadow root with native symlink re-materialisation (83
  of 83 created and verified); shadow-root `validate` at `--profile atdd --spec 0017` (error=2) and
  `--profile full` (error=4), with the full `-111` / `-112` membership extracted per spec; `pnpm ci:lint`
  (exit 0, eleven members enumerated from `package.json`); `pnpm -C packages/qfai test:e2e` (**exit 1**,
  1 failed / 1421 passed / 16 skipped); the integration/assets/unit invocation (1186 / 19, exit 0); the
  four per-file suites (9, 4, 22, 9) and `stageEvidenceCounts.test.ts` alone (1 failed / 3 passed);
  `node scripts/check-atdd-annotation-ledger.mjs` with and without `--spec 0017` (127 unbacked / exit 1;
  8 backed / exit 0); `git hash-object` over five packs in two seal serializations plus the superseded
  manifest; mechanical re-counts of the ledger cross-tab, the matrix tally and partition, the
  208 / 127 / 81 figures, the three corpora and the `it(` / `test(` callsites under the test's own regex;
  `git diff -U0 54d8d325 0cfa67c9` hunk headers plus an md5 byte-comparison of the two paragraphs at
  `54d8d325:333-340` and `HEAD:353-360`; and the audit-hash procedure over both readings of the excluded
  final section (identical, by construction).
- **Not re-run:** the resolver mutations `E6`-`E11` (round 4's gatekeeper reproduced all six
  independently; not duplicated); the matrix falsification rounds `M1`-`M7` / `X*` / `Y*` (same); the v5
  classifier's boundaries beyond the pinned real-tree set. No finding above rests on any of them.

## Sign-off

- [x] Review verdict is explicit: **REVISE**
- [x] Findings cite concrete artifacts, line numbers and reproducible commands
- [x] Every finding declares `Severity:` and `Traces to:`; no blocking finding traces to `none`
- [x] Required gates and residual risks are recorded
- [x] No mutation persisted: HEAD `3f815725` at start and finish, `git status --porcelain` empty at
      both, `.qfai/report/validate.log` still `2b572934ce71305b4fcfc1ac40c34c164f83cf8d` with mtime
      unchanged, and no oracle round was planted — every finding above is derivable read-only
