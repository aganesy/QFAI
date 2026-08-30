# R02 — completion-reviewer, round 4

**Result: REVISE**

- Reviewer: `completion-reviewer` (independent; authored or edited nothing under review)
- Stage: `/qfai-atdd` (spec-0017), round 4
- **Reviewed revision: `54d8d325`.** `git status --porcelain` was **empty** at start and empty at
  finish; HEAD did not move (`54d8d325` at both ends).
- **Audited evidence hash (stage review):
  `sha256:179727296f577a1baccf241c0745f0b2fa8029a199db8dc82f1cab25d7e6461f`** — four steps of
  `constitution/shared-skill-delegation-baseline.md:395-441`. Subject:
  `.qfai/evidence/atdd-spec-0017.md` minus `## Final status` (normalized
  `fa8bdb242c49488294f9aafdf9f5d0e5c93a71f7610ad614b0c91e714b570cf9`) plus
  `.qfai/evidence/coverage-depth-spec-0017.md` whole
  (`99548c90a917befdb834b5c488e12276395668bfd41f8c3f17da6926de8a16f7`), serialized as
  `path + NUL + sha256` sorted by path, hashed. **Round 3's `B6` ambiguity is gone by
  construction**: `## Final status` is at `:692` and **no `##` heading follows it**, so truncating and
  excising are byte-identical operations. One tree, one hash.
- Authored/edited under review: **none.**
- Mutations: **two oracle mutations to `.qfai/evidence/coverage-depth-spec-0017.md`, each planted
  alone and reverted in the same step with a sha256 comparison** (`Z1`, `Z2` under M1). Baseline
  `99548c90…8a16f7`, final `99548c90…8a16f7` after each, byte-identical; `git status --porcelain`
  empty after each. `validate` ran four times against a `git archive HEAD` shadow root with all **83**
  tracked symlinks re-materialised natively from the index (83 declared, 83 created, 83 verified as
  links), so no `QFAI-LINK-001` fired and the tracked `.qfai/report/validate.log` was never written
  (mtime unchanged at 22:33, before my first run at 22:42). Scratch under `tmp/r04-completion/` only.
  No `git checkout` / `stash` / `reset`, no commit, no push.

## Verdict summary

**Six blocking, five major, five minor.**

Round 3's `B3`, `B5` and `B6` are **fully applied and I could not fault them**: the six rejected
alternatives are exact, all three pack seals reproduce bit-for-bit against the recorded values, and
the `## Final status` restructuring is correct and structurally closes the two-readings problem. `M2`
and `M3` are applied well. The `realpath` loop guard is **reachable and correct** — I built a real
junction cycle and the walk terminated in 68 ms — and its corrected 83-symlink comment is exactly
right. The v4 classifier is a genuine improvement: 19 of the 21 cases round 3 named now classify
correctly.

What did not survive is, again, mostly the same two places.

**`## Ledger rows advanced` is false for the fourth consecutive round** (B1) — round 3's `B1` was
applied to the index table and to nothing else, so `:256` still says two rows are on branch 3 and
`### TDD-0069` still says "Branch 3 it is" and still routes the row through the `exception` gate.
`## Final status` and `## Gaps` now contradict each other about `TDD-0070` (B2). And **the round's
headline artifact — the v4 predicate and its two committed corpora — appears nowhere in either
governance record** (B3), which still publishes v3's refuted "0 misclassified" as current, in the
exact file round 3's `B2` named by line.

The prediction in the request held. **Five numbers were restated rather than re-derived** (M3, M4)
and **the matrix-test repair created a third blind spot in the same move that closed the second**
(M1): the fix for `Y2` moved the class semantics out of the record and into the test, and the
record's own copy of them is now unpinned — I deleted the entire class-A justification, and swapped
the class A/B letters in the prose, and all four tests stayed green both times.

## What I re-derived and could not fault

Every number below was measured from the artifact at `54d8d325`, not read from a prior report.

1. **The ledger, parsed mechanically** (82 rows of 9 cells, `TDD-0001`-`TDD-0082`, no gaps, no
   duplicates). `Layer`: **71 `Integration` / 11 `Unit`**. `Status`: **74 `refactor` / 6 `blocked` /
   2 `todo`**. Cross-tab `Integration`: **63 / 6 / 2**. `atdd:21-22`, `:238`, `:249` all exact;
   `63+6+2 = 71` closes. The 6 `blocked` are `TDD-0016/0030/0032/0033/0034/0035` and exactly **four**
   carry `Blocked-By: CR-20260820-0007` (`:572-573`, exact). Column list at `:615-617` verbatim
   correct against `test-list.md:37`. `TDD-0069` / `TDD-0070` at `test-list.md:107-108` are both
   `todo`, `DR-ID: -`, `Blocked-By: -` — `:272-273` exact.
2. **The matrix, parsed mechanically.** 9 rows x 7 depth columns = 63 cells: **12 OK / 13 WARN /
   38 FAIL**. `Status` **3 / 1 / 5** — `coverage-depth:57` and `atdd:381` exact. 38 depth failures
   plus 5 in `Status` — `coverage-depth:114` exact. The partition is **complete, disjoint, holds no
   non-failing member and names no non-depth column**; sizes **A 30 / B 7 / C 1 = 38** —
   `coverage-depth:139` exact. Class B is exactly the four rows whose `Status` is not a failure, so
   round 3's `m4` is closed by the new B property.
3. **The six rejected alternatives (round 3's `B3`), exact.** `07_Decisions.md` carries **nine** `DR-*`
   and exactly **six** `Decision, rejected alternative` bullets, at `:133`, `:137` (`DR-0017-0004`),
   `:203`, `:206` (`DR-0017-0006`), `:242`, `:249` (`DR-0017-0007`) — three DRs, precisely as
   `atdd:33-35` now states, and the characterisation at `:46-50` (validator placement, ledger timing,
   the own tree's validate copy) maps one-to-one onto those three. `09_delta.md` section `Rejected`
   carries exactly **three** `- Candidate:` bullets and each is correctly characterised at `:38-45`.
4. **All three pack seals and both variants reproduce exactly.** Manifest form
   `<git hash-object><single space><path><LF>`, `LC_ALL=C` order, sha256 over the byte stream:
   round 1 `5c8cd42571c8baf5f2240515ee2fbd173892cecd09d53ace080900d5c74317e3` (`:731`); round 2
   `305ffd6555799fd322db60c7afdddf1f920feb41006c2b9f1e66ac5c5983e77a` (`:735`); round 3
   `257e793b5c764a81532a01a0a422b28f2edbb986f41b0042e75a6b596d01bfd0` (`:738`); the superseded
   `d8ac0a777dd38514574c63813e51b2e3d0140319d0c171c4190a0a94358967c9` (`:732`) over the same three
   reports **as they stand today**, which proves them untouched between the seals; and the two-space
   form gives exactly the `fa8d6e836cabd14a6cdbc12dd8b9dd538bbe971a40cd4bf27b252160d17e2526` at
   `:745`. Round 1's printed manifest at `:762-765` is byte-identical to what I hashed. **Round 3's
   `B5` is closed**: both round 2's and round 3's packs now carry `summary.json`, and the `full`
   profile no longer flags either.
5. **`CR-20260820-0011`'s figures, re-derived independently.** **208** unique ledger claims, **127**
   unbacked, **81** backed; the per-spec table at `CR:47-50` matches **line for line**
   (`0001 9` through `0016 7`, `0017 0`), sums to 127 across **16** non-zero specs, and `spec-0012`
   is 28. The ratchet at `checkAtddAnnotationLedger.test.ts:340-352` is `checked >= 208` (floor),
   `unbacked <= 127`, and no `spec-0017` entry unbacked. The floor rationale is right and the
   delete-and-add swap blind spot is stated rather than papered over.
6. **The scoped gate.** Shadow run: `info=2 warning=0 error=2`, `QFAI-ATDD-111` on exactly
   `US-0017-0007`, `QFAI-ATDD-112` on exactly the 6 `blocked` plus 2 `todo` rows. No
   `QFAI-LINK-001`. `atdd:214`, `:661`, `:705` exact. Repo-wide `--profile tdd`: `SPEC-0003 8`,
   `SPEC-0006 1`, `SPEC-0008 1`, `SPEC-0015 1`, `SPEC-0017 1` = 12, siblings 11 — `atdd:574-577`
   exact.
7. **P7, at the revision under review.** `pnpm ci:lint` **exit 0**, and `package.json:19` splits on
   `&&` into exactly **eleven** members. `vitest run --project e2e` gives **1420 passed / 16
   skipped**, exit 0 (`:656` exact). `vitest run --project integration --project assets --project
   unit` gives **1174 passed / 19 skipped**, 170 files, exit 0 (`:657-658` exact).
   `check-atdd-annotation-ledger.mjs --spec 0017` gives `8 claim(s) backed`, exit 0 (`:659-660`
   exact). `checkAtddAnnotationLedger.test.ts` holds **19** `it` blocks and runs 19 — `:110`, `:187`,
   `:208` now correct, round 3's `B4` applied on that count.
8. **The `realpath` loop guard is reachable and it is right.** I created a real directory-junction
   cycle (`loop/a/b` pointing at `loop/a`) in scratch and called `collectTestSources` on it: **1 file
   found, 68 ms, terminated**. The `ELOOP` skip loses nothing a walk could have measured, because a
   path the OS will not resolve has no readable contents; on Linux the `realpath` `ELOOP` to lexical
   fallback is then caught by the `readdir` `ELOOP` `continue` at `:135`, so that arm terminates too.
   And the corrected comment at `check-atdd-annotation-ledger.mjs:113-115` is **exactly true**: all
   **83** tracked symlinks are under dot-directories (`.claude` 34, `.github` 30, `.codex` 11,
   `.agents` 8) and **zero** are under either scanned tree.
9. **`## Final status` placement (round 3's `B6`) is correct.** `SKILL.md:345-365` ends its mandated
   list at `## Final status`; the record ends there, with `### Review packs and their seals` as a
   subsection inside it and the `Review pack:` / `Review pack seal:` fields at `:730-738`. Because
   nothing follows, the audit subject has one reading again.
10. **The Work Orders deviation table is exact, field by field**, against `agent-routing.yml:141-206`:
    `coverage` (mandatory `test-design-analyst`, `qa-strategist`; blocking `test-design-analyst`);
    `red` (mandatory `delivery-planner`, `acceptance-test-engineer`; conditional `qa-gatekeeper`;
    blocking `delivery-planner`, `qa-gatekeeper`); `implementation` (mandatory
    `acceptance-test-engineer`, blocking none); `evidence` (mandatory none; conditional
    `devops-ci-engineer`, `qa-gatekeeper`; blocking `qa-gatekeeper`); `review` (mandatory
    `completion-reviewer`, `qa-gatekeeper`; conditional `implementation-reviewer`; blocking both).
    `atdd:400-409` holds. (One label elsewhere still contradicts it: m1.)
11. **The Delta Rejected Guard's substance holds for the artifacts it covers.** No rejected option is
    reintroduced: `06_Test-Cases.md` was not written, no SPLIT was proposed, and
    `check-atdd-annotation-ledger.mjs` reads an annotation ledger and test sources — no spec artifact
    and no workflow YAML — so it collides with neither of `DR-0017-0004`'s rejections. The new corpus
    test **does** parse own-tree workflow YAML, but `tests/scripts/ownWorkflowTopology.test.ts:79`
    and `:115` already did, and `DR-0017-0004`'s rejection is scoped to the hygiene and
    required-context *checker*, not to tests. No collision. (The guard section was not re-run against
    round 4's artifacts: m3.)
12. **`CR-20260820-0012` is a legitimate Drift Protocol instrument and option 5 does not dissolve an
    obligation.** See the rulings below. Round 3's `M2` is fully applied: `CR:60-71` now states
    `BR-0017-0053`'s recorded rationale as attributability, names `ci-pass` as this spec's referent
    for "aggregate verdict", and `CR:73-76` states plainly that option 1 excludes the one failing
    input. `Status: open`, `Approved by: -`, `Approved option: -` — no self-approval.
13. **v4 is a real improvement, measured on round 3's own cases.** Against the 21 command strings
    round 3's `R01` `B2` names by label, v4 gets **19 right**. All 6 of round 3's false positives
    (`rm -rf build dist`, `mkdir -p build`, `cd build`, `ls -la build`, `if [ -d build ]; then`, and
    the two `echo` lines) are now rejected, and 5 of its 6 misses (`npm run build-storybook`,
    `yarn build-storybook --quiet`, `npm run build-lib`, `nx run-many --target=build --all`,
    `cmake --build .`) are caught. The 451-line real-tree scan reproduces exactly (see B4).

---

## BLOCKING

### B1 — `## Ledger rows advanced` is false for the fourth consecutive round, and round 3's `B1` was applied to one of the four places it named

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:256`, `:335-337`, `:339-340`, `:342`, `:346-348`;
  against `:262`, `:272-274` and
  `.qfai/decisions/DR-0017-0010-*.md:86-89`, `:138-142`, `:169-172`
- **Contract**: `qfai-atdd/references/red-provenance.md#evidence-shape` (the index is one row per
  `TDD-*`, holding the branch and an anchor); `qfai-implement/SKILL.md:116` (step 3b verifies the
  row's entry in `.qfai/evidence/atdd-<spec-id>.md`);
  `qfai-implement/references/execution-ledger.md#blocked-rows` (`blocked` is **not** `exception`)
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Stage Gate P1b/P1d plus
  `red-provenance.md#evidence-shape` / `defect:correctness`

Round 3's `B1` required four edits: the index table, `:254`, `:296-298`, and `:322-332`. **The index
table was fixed and it is now right** (`:262` gives `TDD-0069` `none — blocked, not a branch` /
`CR-20260820-0012`, exactly what `DR-0017-0010:169-172` decided), and `:272-274` correctly records
that neither cell has been written. The other three were not.

**1. The section's opening sentence still says two rows are on branch 3.** `:256`:

> **None advanced. Two rows are routed to branch 3 and parked; the rest were not this stage's to
> route.**

Six lines later the table gives one row branch 3 and the other none, and nine lines later `:265` says
in bold "**`blocked` is not a branch, and this table said it was for two rounds.**" The heading
sentence of the section is the sentence that contradicts the correction underneath it. Round 3's
required fix was, verbatim, "Change `:254` to say one row is on branch 3 and one is proposed for
`blocked`."

**2. `### TDD-0069` still routes the row through branch 3 and the `exception` gate.** This is the
subsection `/qfai-implement` step 3b actually reads, and it is unchanged:

- `:342` — "**Branch 3 it is**, recorded in `DR-0017-0010`." `DR-0017-0010:169-171` says the opposite
  in as many words: "**`TDD-0069`** does not. ... It transitions `todo -> blocked` with
  `Blocked-By: CR-20260820-0012`."
- `:346-348` — "The row stays `todo` in the ledger until `/qfai-implement` writes `todo -> exception`,
  which it may do **only** with the `qa-gatekeeper` PASS that P1d takes on the `DR-*`". Neither half
  applies to a `blocked` row: the transition is `todo -> blocked`, it needs a `Blocked-By` reference,
  and no reviewer PASS exists or is required for it. The record's own `:276-281` states this
  asymmetry correctly one page earlier.

**3. The two reasons `DR-0017-0010` retracted are still here** — round 3's `M5`, now compounded
because the entry contradicts the DR it points at:

- `:335-337` — "it could not be made green on this branch at all, **because the workflow changes are
  unmerged**". `DR:86-89`: "the workflow changes that produce an aggregate verdict are unmerged
  **was false** as `TDD-0069`'s reason. `ci-pass` exists at `.github/workflows/ci.yml:469` and has
  run twelve times on this branch". The DR's own branch-1 account (`DR:107`) is "the data it reads
  cannot exist here" — a different reason.
- `:339-340` — "Nothing satisfies this one — **there is no run history to mutate**". `DR:138-142`:
  "Clause 1 is therefore **degenerate rather than satisfied** ... The correct statement is narrower
  than both: there is no satisfied state to falsify for clause 2 because the history does not exist,
  and none for clause 1 because per-project tuning is not observable."

**Why blocking.** `qfai-implement/SKILL.md:116` sends step 3b to this subsection, not to the index
table and not to the DR. A step-3b reader at `54d8d325` finds an entry that names branch 3, names the
`exception` transition, cites a P1d PASS as its precondition, and gives two reasons the governing DR
records as false — for a row whose decided disposition is `blocked`. Nothing in `:333-352` tells that
reader what to do with a `todo` row carrying no `Blocked-By`.

**Required fix.** Apply round 3's `B1` to the three places it named and this round leaves open:
`:256` becomes one row on branch 3, one proposed for `blocked`; rewrite `:333-352` for the `blocked`
disposition, replacing the branch-1 and branch-2 paragraphs with `DR:86-89` and `DR:138-142` and the
`exception`-gate paragraph with what step 3b does with a `todo` row whose `Blocked-By` cell is still
`-`; drop or requalify "Branch 3 it is".

### B2 — `## Final status` and `## Gaps` now contradict each other about `TDD-0070`, and `## Final status` still asserts a ledger status the ledger does not carry

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:605`, `:711-713`; against `:707-710`, `:272-274`
  and `.qfai/specs/spec-0017/tdd/test-list.md:107-108`
- **Contract**: `qfai-atdd/SKILL.md:298` (completion checks that `## Final status` says what that pack
  says); `qfai-implement/SKILL.md:116`; `execution-ledger.md:185-187`
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Stage Gate P1d / `defect:correctness`

Round 3's `B2` was applied to one of its two rows and inverted the defect onto the other.

`:707-710` is now **correct and exemplary**: "`TDD-0070` is **not yet** parked at `exception`: the
transition needs the P1d `qa-gatekeeper` PASS ... and P1d has returned `REVISE` twice."

But `:605`, in `## Gaps / Open risks` item 8, says: "`TDD-0070` **is** `exception` against
`DR-0017-0010`". One record, two sections, opposite claims about the same cell — and the cell is
`todo` with `DR-ID: -` at `test-list.md:108`.

And the `TDD-0069` half of `B2` was not applied. `:711` reads "`TDD-0069` **is** `blocked` on
`CR-20260820-0012`", parallel in form to the `TDD-0070` bullet above it but without the "not yet".
`:606` says the same. `B2`'s required fix was: "`TDD-0069` is **proposed** for `todo -> blocked` ...
**both rows are at `todo` in the ledger** and `/qfai-implement` writes both." The "both rows are at
todo" statement — the one fact a reader of `## Final status` most needs — appears nowhere in the
section. `:272-274` has it, three hundred lines earlier, in the section a completion gate reads
second.

**Required fix.** `:711` to the proposed form; `:605-606` to the same not-yet form as `:707`; and add
one clause to `## Final status` stating that **both rows are `todo` with `DR-ID: -` and
`Blocked-By: -` in the ledger, and `/qfai-implement` writes both**.

### B3 — the v4 predicate and its two corpora are absent from both governance records, which still publish v3's refuted "0 misclassified" as current

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:498-501`, `:180-181`, `:196-198`, `:468-502`;
  against `packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts:519-586`
- **Contract**: `qfai-atdd/SKILL.md` Evidence (MANDATORY) — evidence verifiable by a party that did
  not author it; `SKILL.md:345-365` (`## Work performed`, `## Commands executed + key outputs`,
  `## Execution logs`); round 3 `R01` `B2`, whose required fix names this file by line
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) /
  `defect:correctness`

`git grep` over both records for `classifyBuild`, `corpus`, `corpora`, `v4` and `30 named` returns
**zero hits**. The round's headline repair — a fourth predicate version, a `classifyBuild` describe
with two committed corpora, and two new tests — is recorded in neither governance artifact.

What the record does say about the predicate, at `:498-501`, is v3:

> `v3` anchors on `build` as a standalone shell **word** ... Measured in **both** directions this
> time: **21 forms caught, 14 non-builds rejected, 0 misclassified.** `mvn package` remains invisible
> and is named as a known limit rather than counted as a pass.

Round 3's `R01` `B2` measured that claim and found **9 missed builds and 10 false positives**,
including this repository's own `pnpm ci:build-verify`. Its required fix was explicit: replace "0
misclassified" in the comment **and in `atdd-spec-0017.md:479-481`**. The comment was replaced (the
test file's own v1/v2/v3 history at `:529-541` records the 9-and-10 honestly). **The evidence file was
not.** At `54d8d325` the governance record's live, present-tense statement about the predicate
`US-0017-0004` rests on is a figure the repository itself records as refuted.

Three further consequences, all in sections `SKILL.md:345-365` mandates:

- `## Work performed` `:180-181` still describes the file as "**eight annotated describes**, one per
  covered user story, plus a block comment where `US-0017-0007`'s was". It now has **nine** describes;
  the ninth is the corpus one, and neither it nor the two corpora appear in the list of what changed.
- `## Commands executed + key outputs` `:196-198` records that file at "**Tests 9 passed (9)**". At
  `54d8d325` it runs **11 tests** (11 `it` blocks; the suite log reports
  `spec0017LayeredCiScaffoldE2E.test.ts (11 tests)`). A new stale number, introduced by this round's
  own repair, in the block whose job is recording measured outputs.
- `## Execution logs` has `E4b` (round 2, ten forms) and nothing for v4. The 43 corpus cases and the
  451-line scan — this round's strongest evidence — are recorded only as a code comment.

**Required fix.** Replace `:498-501` with v4 and round 3's measured counts; add an `## Execution logs`
subsection for the two corpora with their sizes and results; add the corpus describe and the two
tests to `## Work performed`; and restate `:196-198` as **11**.

### B4 — the "every case round 3 named" corpus omits the one case round 3 named that v4 still fails, and its stated size matches nothing

- **Artifacts**: `packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts:549`, `:577-586`,
  `:589-635`, `:697-698`; against
  `.qfai/review/review-20260821000000000/R01_implementation-reviewer.md:145`, `:39`, `:60`
- **Contract**: `qfai-atdd/SKILL.md` Evidence (MANDATORY); the test file's own stated standard at
  `:579-586` ("the countermeasure is not a bigger corpus of my own invention ... the cases ROUND 3
  named — a corpus chosen adversarially, by the party looking for misses")
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) /
  `defect:correctness`

The 451-line scan is **exact** — I reproduced it by extracting `classifyBuild` verbatim into a scratch
module and re-running the same walk: **451 command lines** (313 own tree, 138 shipped), **exactly 2
flagged** (`ci.yml test: pnpm -C packages/qfai build`, `ci.yml build: pnpm ci:build-verify`), **0
outside `ci.yml`**. That half of the claim holds.

The named corpus does not. `it("classifies every case round 3 named, in both directions")` holds
**25 + 18 = 43** strings. Round 3's `R01` `B2` names 21 by label, of which v4 misclassifies exactly
**one** — and that one is not in the corpus:

```text
MISSED   msbuild MySolution.sln     <- R01:145 names it as a missed build; v4 still misses it;
                                       absent from BUILDS and from NOT_BUILDS
MISSED   mvn package                <- named as a known limit at atdd:501; also absent from both lists
```

`msbuild` is in neither `BUILD_RUNNERS` nor `BUNDLERS`, and `MySolution.sln` is not a build-script
path, so `classifyBuild` returns `false`. A corpus that claims to hold "every case round 3 named" and
omits precisely the case that still fails is **selected by outcome** — which is the defect round 3's
`B2` was about ("three times the corpus was one this stage chose, so it flattered the predicate every
time"), recurring inside its repair. The fourth version is the third to be reported as clean, and it
is clean partly because the failing case was dropped.

**And the stated size matches nothing.** `:549` says "round 3's own **30** named cases classify with
0 misclassified". The corpus holds 43; round 3 measured 58 (`R01:39`, `:60`); round 3's report names
21 recoverably (the rest were in `tmp/rev3/pred.mjs`, gitignored). **30 is none of those.**

**Required fix.** Add `msbuild MySolution.sln` and `mvn package` to the corpus with their true
labels, and either fix the predicate or state both as named limits the way `atdd:501` states `mvn`.
Replace "30" with the corpus's real size and say which entries are round 3's and which are this
stage's earlier `E4b` list — the test's own title claims all 43 are round 3's, and most are not.

### B5 — round 3's gate is unaccounted for: no verdict record, and the mandatory blocking `qa-gatekeeper` that did not run is undisclosed

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:619-631` (round 2's table, with no round-3
  equivalent), `:716-719`; `.qfai/review/review-20260821000000000/` (R01, R02, R04 — **no `R03`**);
  `.qfai/assistant/manifest/agent-routing.yml:201-206`
- **Contract**: `agent-routing.yml` `qfai-atdd` / `review`: `mandatory_agents:
  [completion-reviewer, qa-gatekeeper]`, `blocking_agents: [qa-gatekeeper, completion-reviewer]`;
  `qfai-atdd/SKILL.md:298` ("check that `## Final status` says what that pack says"); Success Criteria
  "Completion is approved by a reviewer who did not implement tests"
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Success Criteria plus
  `agent-routing.yml` `qfai-atdd`/`review` / `defect:correctness`

`grep -in "round 3"` over both records returns eleven hits, every one an inline attribution ("round 3
caught it", "round 3's `implementation-reviewer`"). There is **no round-3 section, no verdict table,
and no finding count**. Round 2 has all three at `:619-631`.

Two obligations fall through that gap.

**1. A mandatory, blocking agent did not run and the record does not say so.** Round 3's pack holds
`R01_implementation-reviewer.md`, `R02_completion-reviewer.md` and `R04_qa-gatekeeper-p1d.md` — and no
`R03`. `agent-routing.yml:201-206` makes `qa-gatekeeper` **mandatory and blocking** for
`qfai-atdd`'s `review` phase; `R04` is the P1d re-route on the `DR-*`, a different gate on a different
subject. So round 3 ran with one of two blocking review-phase agents absent. This round's
`review_request.md:16-18` discloses it plainly ("its general `qa-gatekeeper` slot was spent on the
P1d re-route, so the stage-level gate did not run at all"). **The governance record does not** — and
the request is not the record: it is a pack file, inside the audit subject, and it is not what a
completion gate reads.

**2. `## Final status` "who confirmed" has not moved in three rounds.** `:716-719` still reads
"Confirmed by: **round 1's** two independent blocking reviewers, both **REVISE**, on `8fb48002`",
naming only `R02` and `R03` of `review-20260820200000000`. Round 2's four responses appear in a
narrative table; round 3's three appear nowhere. The section's own title is "who confirmed", and
`SKILL.md:298` requires a completion check that it "says what that pack says" — a check that currently
passes against a three-round-old state. This is round 3's `m1`, unapplied for a third round, and it is
now load-bearing because it is the only place the gate's own composition is recorded.

**Required fix.** Add a round-3 verdict table in the shape of `:626-630` (`R01` REVISE — 4 blocking /
6 major / 9 minor; `R02` REVISE — 7 blocking / 5 major / 4 minor; `R04` REVISE — 3 blocking), state
that no general `qa-gatekeeper` ran in round 3 and why, add it to `## Gaps / Open risks`, and extend
"Confirmed by" to name every round's blocking reviewers with their revisions.

### B6 — `## Gaps / Open risks` omits that the required status context is red on this stage's own review packs, in the profile the `build` job runs

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:563-617` (no such entry), `:725` (past tense);
  `.github/workflows/ci.yml:426-427`; `.qfai/decisions/CR-20260820-0012-*.md:18-25`
- **Contract**: `qfai-atdd/SKILL.md` Success Criteria "Repository quality gates ... pass with
  evidence" plus Not-done "Validation evidence is missing or failing"; `qfai-atdd/SKILL.md` Evidence
  (MANDATORY)
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Success Criteria (repository quality
  gates) / `defect:correctness`

Measured against the shadow root at `54d8d325`:

```text
validate --profile tdd   --fail-on error  ->  info=5 warning=376 error=2   (QFAI-ATDD-111, -112)
validate --profile sdd   --fail-on error  ->  info=4 warning=26  error=0
validate --profile full  --fail-on error  ->  info=4 warning=404 error=4
```

The two extra `full`-profile errors are:

```text
[error] QFAI-REVIEW-004  review pack lacks summary.json   (.qfai/review/review-20260821020000000)
[error] QFAI-REVIEW-005  review pack has no Rxx_*.md      (.qfai/review/review-20260821020000000)
```

`.github/workflows/ci.yml:426-427` runs `validate --profile full --fail-on error` inside the **same
`build` job** as the `tdd` step at `:385-386`. So the required status context is red on **four**
errors, two of which this stage creates at the start of every round by committing the request before
the reviewers launch.

The record's only mention is `:725`, in the past tense and framed as fixed: "Round 2's and round 3's
were **missing their `summary.json`** until round 3 found it ... masked only because the `tdd` step
fails first". Rounds 2 and 3 **are** fixed — I verified both. What is not disclosed is that the
practice **regenerates** the pair every round, so at every revision a reviewer or a completion gate
examines, `build` carries two errors beyond the two the record accounts for. Round 3 flagged the
mechanism (`m3`) and named it "the residual most likely to be missed"; one round later it is neither
in `## Gaps / Open risks` nor in the build-green chain that `CR-20260820-0012:19-21` writes as
"`build green` requires ... `error=0`", which at `54d8d325` needs the review-pack errors clear too.

This is not a request for new product work — round 3 routed that correctly as a `CR-*` proposal. It is
a **disclosure** obligation: the stage's own Not-done list includes failing validation evidence, and
the record accounts for two of the four errors that make it fail.

**Required fix.** Add one `## Gaps / Open risks` entry giving the `full`-profile count at the revision
under review, naming the two `QFAI-REVIEW-*` rules and the in-flight-pack mechanism that produces
them, and stating that they are additional to `QFAI-ATDD-111` and `-112`. Add the same clause to
`CR-20260820-0012`'s cycle diagram, or scope that diagram to the `tdd` step by name (round 3's `M1`,
still open for this half).

---

## MAJOR

### M1 — the matrix test's `Y2` repair moved the class semantics into the test and left the record's copy unpinned. Two mutations, both green.

- **Artifacts**: `packages/qfai/tests/assets/coverageDepthMatrix.test.ts:194-219`;
  `.qfai/evidence/coverage-depth-spec-0017.md:141-165`; `.qfai/evidence/atdd-spec-0017.md:146-150`,
  `:559-561`
- **Contract**: `references/test-case-depth-checklist.md:114-119` (a justification must name the
  cell); `qfai-atdd/SKILL.md` Not-done: "Coverage Depth Matrix ... contains unjustified cells"
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Mandatory Outputs 2 / Not-done criteria

Round 3's `M3` asked for class **assignment** to be pinned. It was, and the properties at `:199-201`
are well chosen — I confirmed no relabelling of the partition table survives them (A requires the
row's `Status` to be a failure, B requires it not to be plus one of two columns, C requires
`US-0017-0001` crossed with `Boundary values`, and the three sets are mutually exclusive under those).
`Y1`, `Y2`, `Y3` genuinely redden.

But the properties are now **hardcoded in the test**, and the file's own statement of them is read by
nothing. Two rounds, each planted alone into `.qfai/evidence/coverage-depth-spec-0017.md` and
reverted in the same step with a sha256 comparison (baseline and final both
`99548c90a917befdb834b5c488e12276395668bfd41f8c3f17da6926de8a16f7`, `git status` empty after each):

```text
Z1  the ENTIRE class-A justification paragraph deleted (lines 141-145)
      grep -c "Class A" -> 0;  table, partition, sizes, assignment all untouched
                                                     *** 4 passed - REDDENS NOTHING ***

Z2  the class letters PERMUTED in the justification PROSE only (:141 A->B, :147 B->A)
      partition table untouched, membership identical, sizes still A 30 / B 7 / C 1
                                                     *** 4 passed - REDDENS NOTHING ***
```

`Z1` is the sharper one: **30 of the 38 failing cells lose their stated reason entirely** and all four
tests pass. The test verifies that every cell is *assigned to a letter*; nothing verifies that the
letter *means anything*. `SKILL.md`'s Not-done criterion is "contains unjustified cells", and after
`Z1` 30 cells are unjustified while the pinning test the record cites as the guarantee is green.

`Z2` is the meaning-reversing form the request asked for: after it the record says 30 cells fail
because "the E2E surface reads files and cannot run a workflow" and 7 because "the shipped surface
does not exist" — exactly inverted, self-contradictory against `coverage-depth:157-159`, and
invisible. It is `Y2` in mirror image: `Y2` permuted the letters in the table and was fixed by
teaching the test the semantics; `Z2` permutes them in the prose, which the fix left behind.

What is overstated as a result: `atdd:146-150`, "every ... cell partitioned into a named reason class,
and **the whole thing pinned** by `packages/qfai/tests/assets/coverageDepthMatrix.test.ts`", and
`:559-561`, "each class has a defining property every member must satisfy" — true of the test's
private copy, not of the record's. `coverage-depth:122-124` is the one honest statement of scope
("checks it against the table's own cells for completeness, disjointness and no non-failing member")
and should be the model.

**The record is correct today** — I verified every class paragraph against its members — so this is
not blocking. Cheap closure, three lines: require a `**Class <L> — ` paragraph to exist for every
letter the partition uses, and assert a distinguishing phrase per letter so `Z2` cannot swap them.
Then record the rounds, per the record's own countermeasure at `:601-603`.

### M2 — the "exactly two real builds" premise is false: `release.yml` runs the build and the scan cannot see it

- **Artifacts**: `packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts:583-586`, `:692-698`;
  `.github/workflows/release.yml` (`pnpm ci:gate`); `package.json:18`;
  `scripts/check-build-warnings.mjs:4`
- **Contract**: `qfai-atdd/SKILL.md` Evidence (MANDATORY); `atdd:601-603` (this stage's own recorded
  countermeasure: a claim over a file's contents is rewritten to run the thing whenever running it is
  possible)
- **Severity: advisory** | **Traces to:** `defect:correctness`

The comment claims the real-tree corpus is one "where the answer is checkable against what those
workflows actually do rather than against what I think a build looks like" (`:585-586`), and the
assertion message says "the own tree's build count: one producer plus its verification, both in
`ci.yml`" (`:696-697`).

Measured: `release.yml` runs `pnpm ci:gate`. `package.json:18` expands `ci:gate` to a chain including
`node ./scripts/check-build-warnings.mjs`, and `scripts/check-build-warnings.mjs:4` spawns
`pnpm -C packages/qfai build`. **That command line runs the build and is not flagged.** So the own tree
runs a build from **three** workflow command lines, and the scan sees two.

The two it sees, it sees for the wrong reason. `pnpm ci:build-verify` is flagged because
`namesABuild` splits the alias on the colon and finds the token `build` — the alias's *name*.
`pnpm ci:gate` runs the same build and is invisible because its alias is not called build. The v4
verb-allowlist-plus-first-target therefore still bottoms out in a string match on a script alias, which
is the class of error v1 through v3 were faulted for, one indirection up. "Exactly two" is a true
statement about command **strings** and a false one about what the workflows **do** — and the record's
own countermeasure names the fix: resolve the alias against `package.json` scripts and follow it, which
is feasible here and makes `ci:gate` visible.

Not blocking because the `US-0017-0004` assertion scans only the shipped orchestrator, where every
step is an `echo` and the row already scores `Oracle strength` at warning level for exactly that
reason. What is wrong is the warrant offered for the predicate, and B3 means that warrant is not in the
record at all.

### M3 — the P7 block still names no revision, and a fresh stale number landed inside this round's repair

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:649-663`, `:196-198`
- **Contract**: `qfai-atdd/SKILL.md` Stage Gate **P7**; Evidence (MANDATORY)
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Stage Gate P7 / `defect:correctness`

The four P7 figures at `:655-661` are **all correct at `54d8d325`** — I reproduced every one. Round
3's `B4` is applied on the numbers.

Its third clause is not. `B4` required naming the revision each P7 figure was measured at, "since a
bare number in this block has now been wrong twice for the same reason". `:652` says instead "from the
tree as it stands with every round-3 repair applied" — a description, not a revision, and one that
cannot be checked. The staleness `B4` was about came from exactly this: a block written at `16f611c7`
describing a tree that `21ea1ddc` then changed. The same exposure remains.

And it already produced a new instance one section up: `:196-198` records the single-file e2e run at
"Tests 9 passed (9)" for a file that runs **11** at this revision. Two tests were added to it this
round and the recorded output was not re-derived — in `## Commands executed + key outputs`, whose sole
job is recording measured outputs. (Counted in B3; noted here because it is the P7 failure mode
recurring rather than a new one.) The P7 block also omits three of the members it certifies: the
guard's 19, the matrix's 4, and this file's 11.

### M4 — the oracle-round ranges do not add up, in the section repaired for exactly that defect one round ago

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:504`, `:513-515`, `:518-519`, `:523`, `:542`,
  `:545-554`; `.qfai/evidence/coverage-depth-spec-0017.md:293`; against
  `.qfai/review/review-20260820220000000/R02_completion-reviewer.md:300-301` and
  `R03_qa-gatekeeper.md:83-84`
- **Contract**: `qfai-atdd/SKILL.md` Evidence (MANDATORY) — verifiable by a party that did not author
  it
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) /
  `defect:correctness`

Round 3's `B7` was that `E6`-`E11` cited a range whose upper bound was unrecoverable. Four more
instances of that shape now sit in the same section.

**1. `X4` and `X5` do not exist in a range that claims eight.** The heading `:523` reads "M1-M7,
X1-X8, Y1-Y3" and the block at `:545-554` lists `X1, X2, X3, X6, X7, X8` — **six**. `X4` and `X5` are
real and recoverable, in round 2's own `R02_completion-reviewer.md:300-301` (`X4` was the declared
depth-cell count moved from 38 to 39, REDDENS; `X5` was the prose-sentence control), and `X5` is what
the unlabelled control line at `:554` is. Neither is cited. A reviewer asked to check `X1`-`X8`, as
`B7` established, cannot.

**2. Six ways against nine listed rounds.** `:542` — "Rounds 2 and 3 then broke the test itself,
**six ways**, and each is now a round of its own" — is followed by nine rounds.

**3. The `E9` and `E10` descriptions are transposed relative to the author the record credits.**
`:518` says `E9` and `E10` were round 2's `qa-gatekeeper`'s own additions. That report,
`R03_qa-gatekeeper.md:83-84`, assigns `E9` to the fallback falling open silently with the warning
annotation cut, and `E10` to the fallback being indistinguishable from a pin. The record at `:513-514`
assigns `E9` to "the fail-open default changes without the record" and `E10` to "the fail-open path
stops warning" — the two swapped. Following `E9` to the cited source finds the other mutation.

**4. `:519` says "With `E6`-`E8` that is six rounds"** — `E6`, `E7`, `E8` plus `E9`, `E10` is five. The
sentence works only if `E11` is counted, and `E11` is the one round the sentence never attributes to
anyone. `:504`'s heading, "the three rounds round 3 could not find", also misstates the finding: round
3 *found* `E9` and `E10` in `R03`; the one it could not find was `E11`.

**5. `E11` remains unverifiable, which the record discloses honestly and then counts anyway.**
`:508-510`: "the harness lives in `tmp/`, which is gitignored, so nothing in the repository supports
the claim." `coverage-depth:293` nevertheless states "six rounds redden (`E6`-`E11`)" as the oracle
evidence for the one cell that **rose** to a pass this stage. A third of that evidence rests on an
assertion no party but the author can check. Confirmed: `git grep E11` returns only the record's own
sentences and round-3 reports. Separately, round 3's `R01:294` and `:514-517` use `E6`-`E11` to label
the test's **six assertions**, a third meaning for the same ids in the record's own citation chain.

**Required fix (advisory).** Cite `X4` and `X5` to `R02_completion-reviewer.md:300-301` or renumber the
block so its range matches its members; make `:542` count what it lists; correct the `E9` and `E10`
descriptions to the wording in `R03_qa-gatekeeper.md:83-84`; and either commit an `E11` fixture the
suite runs or drop `E11` from the count and state the range as `E6`-`E10` with `E11` as an unrecorded
observation.

### M5 — `CR-20260820-0012` option 5 is legitimate, but its consequences for the gate chain are not stated

- **Artifacts**: `.qfai/decisions/CR-20260820-0012-*.md:109-136`;
  `.qfai/specs/spec-0017/09_delta.md` section `Rejected`; `references/red-provenance.md`
- **Contract**: `constitution/drift-protocol.md#core-rule` and `#when-drift-is-detected`;
  `constitution/shared-skill-operating-baseline.md#delta-rejected-guard-mandatory`
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Delta Rejected Guard

The ruling is in the questions section below: **option 5 is a legitimate Drift Protocol change and it
does not dissolve the obligation.** Three things it should say and does not:

- **It creates a new P1d obligation it does not name.** `CR:118-121` establishes that clause 1's row
  would be "unfalsifiable rather than blocked". An unfalsifiable row still needs a branch, and the only
  branch left is 3 — so the split converts one `blocked` row into one `blocked` row **plus one
  `exception` row needing its own `DR-*` and its own `qa-gatekeeper` PASS**. The split's cost includes
  a gate the CR presents it as simplifying.
- **It does not check itself against the delta's rejected candidates.** Two of the three use the word
  split ("splitting the test-case set across two markdown tables", "recording the size breach as a
  SPLIT candidate"). I checked: **neither matches** — option 5 splits one *example*, not the test-case
  table and not the spec. But the Delta Rejected Guard is a mandatory stage output, and a proposal
  whose name collides with two rejected candidates should carry the one sentence that distinguishes it.
- **It does not name who writes the downstream rows.** A split `EX-0017-0053` needs a new `TC` in
  `06_Test-Cases.md` and a new `tdd/test-list.md` row, both outside this stage's authority. The CR says
  each half gets its own row without saying whose run creates it.

---

## MINOR

### m1 — "Three blocking reviewers" contradicts the record's own Work Orders table and the manifest

`:621` opens "**Three blocking reviewers** on `56daee8d`". `agent-routing.yml:201-206` gives
`qfai-atdd`/`review` `blocking_agents: [qa-gatekeeper, completion-reviewer]` with
`implementation-reviewer` **conditional**; the record's own table at `:406` states this correctly
(conditional `implementation-reviewer`, blocking "both"). Round 3's `M4`, unapplied. Routing a third
reviewer was right; the label is wrong, and it now sits nine lines from B5's missing round-3
accounting. **Severity: advisory** | **Traces to:** `agent-routing.yml` `qfai-atdd` phases.

### m2 — the round-2 table still understates `R01` by four findings

`:628` records `implementation-reviewer` at "4 blocking, 6 medium, **5 low**". Counted at
`review-20260820220000000/R01_implementation-reviewer.md`: `B1`-`B4`, `M1`-`M6`, and **`m1`-`m9`** =
19 findings, not 15. `R02` (4 blocking, 4 major, 5 minor) and `R03` (3 blocking, 6 advisory) are both
exact. Round 3's `m2`, unapplied. **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md`
Evidence (MANDATORY).

### m3 — the Delta Rejected Guard section was not re-run against this round's artifacts

`atdd:31-50` reasons about `check-atdd-annotation-ledger.mjs` and about not writing
`06_Test-Cases.md`. It says nothing about the two new tests or `CR-20260820-0012`'s options, both
authored after it was written. I checked both and found no collision (verified item 11, M5), so the
conclusion still holds — but the guard is a MANDATORY output and its confirmation currently covers
round 1's and round 2's work only. **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Delta
Rejected Guard.

### m4 — "each sealed when its last reviewer response landed" is false for two of the three packs, and the next sentence says so

`:723-724`: "Three packs, one per round, **each sealed when its last reviewer response landed and
before this record's verdict was written.** Round 2's and round 3's were **missing their
`summary.json`** until round 3 found it". Both cannot be true: round 2's pack was completed and sealed
in this round, long after round 2's verdict was written and round 3 had run — which is what round 3's
`B5` established. The seals themselves are sound and the supersession reasoning at `:749-753` is the
record's best passage; it is the opening clause that overstates. **Severity: advisory** | **Traces
to:** `qfai-atdd/SKILL.md:298` Success Criteria (review pack seal).

### m5 — this round's pack is the source of the two `QFAI-REVIEW-*` errors I report in B6

`54d8d325` created `.qfai/review/review-20260821020000000/` holding only `review_request.md`, which
raises `QFAI-REVIEW-004` **and** `-005` at error severity under the `full` profile. The practice is
right — it is what fixed round 1's moving-tree problem — and this instance is a **sequencing note on my
own round**, not a gap. B6 is about the record's silence on the mechanism, not about this pack.
**Severity: advisory** | **Traces to:** `defect:code-quality`.

---

## Rulings on the questions put to me

### Question 2 — break the matrix test again

**Done, twice.** See M1. `Z1` deletes the class-A justification (30 of 38 cells) and `Z2` inverts the
class-A and class-B meanings, and both preserve the table, the partition, the sizes and every
assignment property while all four tests stay green. The `Y2` repair is the cause: it taught the test
the class semantics, which made the record's own statement of them redundant to the test and therefore
unguarded.

### Question 3 — the loop guard

**Reachable, terminating, and right.** See verified item 8: a real junction cycle terminates in 68 ms
with the one test file found once, and the corrected 83-symlink comment is exactly true (all 83 under
dot-directories, zero under either scanned tree). The `ELOOP` skip loses no measurable tree, because a
path the OS will not resolve has no readable contents; the arm where `realpath` throws is caught one
step later by `readdir`'s own `ELOOP` continue. One residual worth a line of comment, not a finding:
`isLoop` also matches `ENAMETOOLONG`, so on Windows a legitimately deep subtree could be skipped
silently — the direction is safe (it can only raise `unbacked`, never lower it), but it is a silent
skip in a guard whose whole point is not silently skipping.

### Question 4 — `CR-20260820-0012` option 5

**Legitimate, and it does not dissolve the obligation. It helps less than it appears to, and the CR
says so.**

Four reasons it is legitimate:

1. **It changes packaging, not obligation.** Both clauses of `EX-0017-0053` survive the split; neither
   is weakened, waived or reinterpreted. That distinguishes it sharply from option 1, which the CR now
   correctly labels an amendment that narrows a signal (round 3's `M2`, applied).
2. **It routes through the Drift Protocol rather than around it.** `CR:125` and `:129-130` name the
   `05_Examples.md` edit as upstream and require the `#when-drift-is-detected` path; `Status: open`,
   `Approved by: -`, `Approved option: -`. No self-approval, and the CR is not the vehicle for the
   edit.
3. **It does not reintroduce a rejected option.** The delta rejects splitting the *test-case table*
   and recording a *spec SPLIT* candidate. Splitting one example is neither. (The CR should say this:
   m3, M5.)
4. **It was named by the reviewers, not by the stage.** `DR-0017-0010:152-158` records that both
   round-3 gates named it as the missing treatment; the CR added it as option 5 and recommends it. An
   option that dissolves an obligation would not be the one the gates asked for.

**Does the split help, given clause 1 is degenerate?** Partly, and the CR is honest about the limit
(`CR:118-123`: "It does **not** close `TDD-0069` on its own ... clause 1's row would be unfalsifiable
rather than blocked"). What it buys is real — a reachable half stops being parked behind an unreachable
one, and two distinct failures stop being conflated under one status. What it costs is unstated: a
second row, a second `DR-*`, and a second P1d gate (M5). Net, it is the right first move and the CR's
recommendation ordering (option 5 first, then option 1 for what remains) is sound.

### Question 5 — re-derive every number again

Of the fourteen figure groups the request names, **twelve re-derive exactly**: the guard's 19 tests;
1420 and 1174; the six rejected-alternative bullets across three DRs; the classifier's 451 lines and
exactly two flagged; all three pack seals plus the superseded and two-space variants; the ledger's
82/71/11, 74/6/2 and Integration 63/6/2; the matrix's 3/1/5 status totals and its 38-cell partition at
A 30 / B 7 / C 1; and `CR-20260820-0011`'s 208/127/81 with its per-spec table line for line.

**Two do not, and five further figures are wrong or unre-derivable:**

| figure | recorded | measured |
| --- | --- | --- |
| the corpus's own size | "round 3's own **30** named cases" (`test:549`) | 43 committed; 58 in round 3; 21 recoverable (B4) |
| the predicate's accuracy | "21 caught, 14 rejected, **0 misclassified**" (`atdd:498-501`) | v3 refuted at 9 missed / 10 false positives; v4 undocumented (B3) |
| the spec-0017 E2E file | "Tests **9** passed (9)" (`atdd:196-198`) | **11** (B3, M3) |
| the X-round range | "`X1-X8`" (`atdd:523`) | six listed; `X4`, `X5` absent (M4) |
| ways the test was broken | "**six** ways" (`atdd:542`) | nine listed (M4) |
| `E9` / `E10` content | `atdd:513-514` | transposed vs `R03_qa-gatekeeper.md:83-84` (M4) |
| round-2 `R01` findings | "4 blocking, 6 medium, **5 low**" (`atdd:628`) | 4 / 6 / **9** (m2) |

Three of those seven were introduced or left standing **inside the repair of a finding about that
exact class**: the corpus size and the "9 tests" landed with the v4 work that answers round 3's `B2`;
the `X1-X8` range landed in the block rewritten to answer round 3's `B7` about the `E6`-`E11` range.
The request's instruction to assume it had happened again was correct.

### Are this stage's disclosed gaps complete?

**No.** The eight items the request lists are each genuinely recorded and accurate — except the last:
**round 3's missing general `qa-gatekeeper` is not disclosed anywhere in either record** (B5). Also
undisclosed: the `full`-profile `error=4` and the two `QFAI-REVIEW-*` errors the in-flight-pack
practice regenerates each round (B6); the v4 predicate, its two corpora and the two new tests (B3);
and the matrix test's blindness to the class justifications (M1). The `US-0017-0007` withdrawal, the
scoped gate at `error=2`, the five inert lanes, the 127 unbacked claims, the un-runnable E2E surface
and the P2-P4 work-order deviation are all recorded correctly and I could not fault any of them.

---

## Required fixes (blocking only)

1. **B1** — apply round 3's `B1` to `:256` and to `### TDD-0069` (`:333-352`): one row on branch 3,
   the `blocked` disposition written out, the two reasons the DR retracted replaced by `DR:86-89` and
   `DR:138-142`, and what step 3b does with a `todo` row whose `Blocked-By` is `-`.
2. **B2** — `:711` and `:605-606` to the not-yet form, and add "both rows are at `todo` with
   `DR-ID: -` and `Blocked-By: -`" to `## Final status`.
3. **B3** — replace `atdd:498-501` with v4 and round 3's measured 9 and 10; record the two corpora in
   `## Execution logs`; add the corpus describe and the two tests to `## Work performed`; restate
   `:196-198` as 11.
4. **B4** — put `msbuild MySolution.sln` and `mvn package` in the corpus with their true labels and
   either fix or disclose them; replace "30" with the corpus's real size and separate round 3's cases
   from this stage's.
5. **B5** — add a round-3 verdict table, disclose that no general `qa-gatekeeper` ran in round 3 and
   why, and extend the "Confirmed by" list in `## Final status` to every round.
6. **B6** — disclose the `full`-profile error count at the revision under review, the two
   `QFAI-REVIEW-*` rules and the mechanism that regenerates them, in `## Gaps / Open risks` and in
   `CR-20260820-0012`'s cycle.

## Advisory / Change Request proposals

- **Pin the class justifications** (M1): require a class paragraph per letter used and one
  distinguishing phrase each. Belongs to this spec's own test; three lines.
- **Resolve script aliases in the build predicate** (M2): follow a `pnpm` script name through
  `package.json` so `pnpm ci:gate` is visible, or restate the claim as "command strings that name a
  build" and record `ci:gate` as a named miss beside `mvn package`.
- **Fix the oracle-round bookkeeping** (M4): cite `X4` and `X5`, make "six ways" count its list,
  correct the `E9` and `E10` descriptions against `R03:83-84`, and either commit an `E11` fixture or
  drop it from the count.
- **State option 5's downstream cost** (M5): the second row, the second `DR-*`, the second P1d gate,
  and one sentence distinguishing it from the two rejected split candidates.
- **A pack in flight raises two errors every round** (m5, B6). The practice is right and its
  interaction with `QFAI-REVIEW-004` and `-005` is not designed for. A `CR-*` against whichever skill
  owns `review-artifact-layout.md` is the place — this is a product obligation upstream never asked
  for, so per `drift-protocol.md#reviewer-originated-obligations` it **must not gate this rework**. B6
  asks only for disclosure, which is inside the DoD.
- **Reconcile the guard's annotation grammar with the scanner's** — round 2's `m4`, still open, still
  belonging with `CR-20260820-0011`.

## Open risks / residuals

- **`build` is red on four errors at `54d8d325`**, two of them created by this stage's own review-pack
  practice, and the record accounts for two. B6, and the residual most likely to be missed for the
  second round running.
- **`TDD-0069` and `TDD-0070` are both `todo`** with `DR-ID: -` and `Blocked-By: -`. No transition has
  been written and neither is closeable by this stage. A third P1d re-route is owed on the
  twice-revised `DR-0017-0010`, and the DR says so at `:10-11`.
- **The class-assignment half of the matrix's justification can rot silently** (M1). Correct today; 30
  of 38 cells' reasons are unguarded.
- **`E11` and the v3-corpus figures rest on gitignored harnesses.** Self-disclosed for `E11`, not
  disclosed for the corpora, and the pattern is now three stages deep.
- **The authorship-separation breach stands** and is unrepairable retroactively. Four rounds of
  independent reviewers repair the gate, not the history.
- **`CR-20260814-0001` is approved and unapplied**, so `QFAI-ATDD-111` remains satisfiable by editing a
  markdown list; the guard closes that direction for `spec-0017` only and is not in `ci:lint`.
- **Concurrency.** I ran alongside whichever other reviewers this round routes. Own shadow root
  (`tmp/r04-completion/shadow`) and own scratch directory; the tracked `.qfai/report/validate.log` was
  never written by me and any run-log pointer in the working tree may reflect another run.

## Evidence checked

- `.qfai/review/review-20260821020000000/review_request.md`;
  `.qfai/review/review-20260821000000000/` all five files;
  `.qfai/review/review-20260820220000000/` all six files; `review-20260820200000000/` all four
- `.qfai/evidence/atdd-spec-0017.md` (whole); `.qfai/evidence/coverage-depth-spec-0017.md` (whole)
- `.qfai/specs/spec-0017/tdd/test-list.md` (parsed mechanically, 82 rows of 9 cells);
  `07_Decisions.md` (nine DRs, six rejected alternatives, all six read); `09_delta.md` rejected
  candidates (three)
- `.qfai/decisions/DR-0017-0010-*.md` (whole); `CR-20260820-0012-*.md` (whole);
  `CR-20260820-0011-*.md`
- `.qfai/assistant/skills/qfai-atdd/SKILL.md:285-300` and `:340-370`;
  `.qfai/assistant/manifest/agent-routing.yml:130-210`;
  `.qfai/assistant/constitution/shared-skill-delegation-baseline.md:395-445`
- `packages/qfai/tests/assets/coverageDepthMatrix.test.ts` (whole);
  `packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts` (whole);
  `packages/qfai/tests/integration/scripts/checkAtddAnnotationLedger.test.ts:290-360`;
  `scripts/check-atdd-annotation-ledger.mjs` (whole); `scripts/check-build-warnings.mjs`;
  `scripts/verify-pack.mjs`; `packages/qfai/tests/scripts/ownWorkflowTopology.test.ts:1-120`;
  `.github/workflows/ci.yml:355-440`; `.github/workflows/release.yml`; `package.json:15-30`
- **Commands run.** `git rev-parse --short HEAD` and `git status --porcelain` (start, after every
  mutation, finish); `git ls-files -s` (83 tracked symlinks, tallied by first path component);
  `git archive HEAD` shadow root with native symlink re-materialisation (83 of 83 created, 83 of 83
  verified as links); shadow-root `validate` at the atdd profile scoped to spec 0017 (error=2), the
  tdd profile (error=2), the sdd profile (error=0) and the full profile (error=4); `pnpm ci:lint`
  (exit 0, eleven members); the e2e project suite (1420 passed / 16 skipped); the integration, assets
  and unit projects together (1174 passed / 19 skipped); the matrix and guard test files (4 and 19);
  `node scripts/check-atdd-annotation-ledger.mjs` with and without the spec scope (8 backed, 127
  unbacked tallied per spec); `git hash-object` over three packs in three seal serializations;
  independent mechanical re-counts of the ledger cross-tab, the matrix tally and partition, and the
  208 / 127 / 81 figures; `classifyBuild` extracted verbatim into a scratch module and re-run over
  both workflow trees (451 lines, 2 flagged, 0 outside `ci.yml`) and over round 3's 21 named cases (2
  misclassified); `collectTestSources` against a real directory-junction cycle (terminated, 68 ms);
  two matrix oracle rounds `Z1` and `Z2` with byte-verified reverts; and the audit-hash procedure over
  both readings of the excluded final section (identical, by construction).
- **Not re-run:** the resolver mutations `E6` through `E11` (`qa-gatekeeper`'s domain, not
  duplicated); the deep behavioural mutants of `US-0017-0003` (`implementation-reviewer`'s). No
  finding above rests on either.

## Sign-off

- [x] Review verdict is explicit: **REVISE**
- [x] Findings cite concrete artifacts, line numbers and reproducible commands
- [x] Every finding declares `Severity:` and `Traces to:`; no blocking finding traces to `none`
- [x] Required gates and residual risks are recorded
- [x] No mutation persisted: HEAD `54d8d325` unchanged, `git status --porcelain` empty at start and
      finish, and `.qfai/evidence/coverage-depth-spec-0017.md` sha256
      `99548c90a917befdb834b5c488e12276395668bfd41f8c3f17da6926de8a16f7` before and after both oracle
      rounds
