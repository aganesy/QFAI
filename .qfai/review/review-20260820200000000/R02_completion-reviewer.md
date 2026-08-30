# R02 — completion-reviewer

**Result: REVISE**

- Reviewer: `completion-reviewer` (independent; did not author or edit any artifact under review)
- Stage: `/qfai-atdd` (spec-0017), round 1
- **Reviewed revision: `8fb48002`.** `git status --porcelain` was empty at start and HEAD did **not**
  move: `8fb48002` at start, `8fb48002` at finish.
- **Audited evidence hash (stage review): `sha256:1523c58639f47799a976870a8cb68a7da86f73f0ce0c6a561aefa011cbfc3a17`**
  — computed by the four steps in
  `constitution/shared-skill-delegation-baseline.md#reviewer-response-template`, **Stage review**
  subject: `.qfai/evidence/atdd-spec-0017.md` whole minus `## Final status`
  (`51bbfb768293c845a29d1081d4be46e3e016ad6f318b7170b8f0bc4f9827fde8`) plus
  `.qfai/evidence/coverage-depth-spec-0017.md` whole
  (`09a7ce81d01caf322337865813ce4fd5dbc77f1111c937c4b804a688703a3a45`), normalized, serialized as
  `path + NUL + sha256` sorted by path, hashed.
- Authored/edited under review: **none.**
- Mutations applied: **none.** Scratch under `tmp/r02-completion/` only. `validate` was run against a
  `git archive HEAD` shadow root (`tmp/r02-completion/shadow`), never against the working tree, so the
  tracked `.qfai/report/validate.log` was not touched. This file's path is matched by
  `.gitignore:61`, so writing it changes no gate result. No `git checkout` / `stash` / `reset`.

## Verdict summary

**Five blocking findings, four major, four minor.** The stage evidence already records
`Final status: FAIL`, and I agree with that self-assessment — but not with its reasons. The evidence
names three not-done conditions (reviewer gate, `QFAI-ATDD-112`, Stage Minimum Roles). I found two
more that the record does not name and that its own text actively denies.

**The one I most want read first: `## Ledger rows advanced` rests on a false measurement.** The
claim "All 71 `Integration` rows are already at `refactor`, so none is `todo`" is wrong. Two
`Layer = Integration` rows are at `todo`, unblocked, and they are exactly the rows Phase Red step 3b
governs. So the answer to the round's question #4 is split: the *legal* reading is right and the
*factual premise* is wrong. Zero is not the correct count. Two is.

**On question #1 — the finding you most expected to be wrong about — you are mostly right and I am
not asking you to pin the absences.** The principle is sound and I would reject a rework that
inverted it. It fails on exactly one row (`US-0017-0007`), where your own matrix says the assertion
"would hold for a project with no knobs in it at all", and where the assertion turns out to be a
verbatim duplicate of one `initE2E.test.ts` already makes. That row is an annotation over a gap. The
other four are not.

---

## BLOCKING

### B1 — `## Ledger rows advanced` states a falsehood, and two `todo` rows are unhandled

- **Artifact**: `.qfai/evidence/atdd-spec-0017.md:113-119`
- **Contract**: `qfai-atdd/SKILL.md` Stage Gates **P1b** ("A branch is chosen for every row") and
  **P1d** ("Branch 3 rows are judged here, then handed over"); Read Set Contract line 74 ("A run that
  does not enumerate its `Layer = E2E` / `Layer = API` / `Layer = Integration` rows produces no
  `## Ledger rows advanced` entry for them, and `/qfai-implement` Phase Red step 3b then stops on a
  missing handoff")
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Stage Gates P1b / P1d + Read Set Contract

The evidence says:

> All 71 are already at `refactor`, so none is `todo` and none is selectable here — the handover step
> 3b describes applies to a row this stage would advance from `todo`, and there is no such row.

**How I established it.** Parsed `.qfai/specs/spec-0017/tdd/test-list.md` mechanically (83
well-formed rows + 1 header artifact). `Layer` x `Status`:

```text
Integration x refactor  63
Integration x blocked    6
Integration x todo       2   <-- TDD-0069, TDD-0070
Unit        x refactor   11
```

The two rows, at `test-list.md:107-108`:

```text
TDD-0069 | TC-0017-0069 | Integration | packages/qfai/tests/assets/actionPinBumpOwner.test.ts | todo | Blocked-By: -
TDD-0070 | TC-0017-0070 | Integration | packages/qfai/tests/assets/actionPinBumpOwner.test.ts | todo | Blocked-By: -
```

Both carry `Blocked-By: -`. Their `Evidence` cells say "NOT BLOCKED by a CR - waiting on data that
does not exist yet."

**The same evidence file already knows this.** Line 15-16 records "74 `refactor`, 6 `blocked`,
2 `todo`". Line 105-107 and line 161 both name "the 6 `blocked` and 2 `todo` rows". `QFAI-ATDD-112`
can only report L3 / no-`Level` TCs, so those 2 `todo` rows are necessarily `Integration`. The file
contradicts itself, and the load-bearing half is the false one.

**Your reading of step 3b is correct — that is not the defect.** I read
`.qfai/assistant/skills/qfai-implement/SKILL.md:116`. It scopes itself to `todo` throughout ("A
`todo` `E2E` / `API` / `Integration` row consumes the provenance…", "For a `todo` row, verify its
entry… **first**") and explicitly excludes `review-fix`. A `refactor` row is neither. So step 3b does
**not** reach rows past `todo`, and manufacturing provenance for the 63 `refactor` rows would indeed
be worse than the gap. I am not asking for that and I would REVISE a rework that did it.

**What this stage owes the two rows.** They are the textbook branch-3 case —
`references/red-provenance.md:236-240`, an obligation "genuinely unobservable", here because
`EX-0017-0053` needs three consecutive green aggregate-verdict runs and `EX-0017-0054` needs twenty
post-merge default-branch runs, neither of which exists. That is not "nothing to hand over"; it is a
branch with a defined handover. Per **P1d** and `red-provenance.md:399-411`
(`#which-stage-hands-a-row-over`, `exception` row: "P1d, once the `DR-*` is written"), the stage owes
each of them:

1. a `DR-*` naming why **both** branch 1 and branch 2 are unavailable;
2. a routed `qa-gatekeeper` PASS **on that `DR-*`**, recorded in the entry — P1d exists precisely
   because `/qfai-implement`'s exception path "writes `todo -> exception` and stops", so without it
   "a correct branch-3 row reached a terminal status judged by nobody";
3. a `## Ledger rows advanced` entry in the `exception` evidence shape
   (`red-provenance.md:254`: row identity, the obligation reference the `Layer` selects, the
   `DR-ID`, recorded **before** the gate is routed);
4. the disposition `red-provenance.md:370-388` requires — either a user-approved `TDDLIST-001`
   waiver **asked for, never decided here**, or the row recorded as parked with the spec staying
   open.

**Consequence if left.** Step 3b, on an absent entry, "leaves the row at `todo` and stops with a
handoff note." `TDD-0069` and `TDD-0070` are therefore structurally unable to progress until this
stage produces their entries. The gap is not cosmetic; it is a deadlock.

### B2 — the Coverage Depth Matrix's declared totals are wrong, in the flattering direction

- **Artifacts**: `.qfai/evidence/coverage-depth-spec-0017.md:32`; the same figure copied to
  `.qfai/evidence/atdd-spec-0017.md:127`
- **Contract**: `qfai-atdd/SKILL.md` Evidence (MANDATORY) — the Coverage Depth Matrix entry requires
  a link to `.qfai/evidence/coverage-depth-<spec-id>.md` and the tri-state totals
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY) / `defect:correctness`

Declared at `:32`: **3 covered / 2 partial / 4 missing** by `Status`. Actual, counted mechanically
from the `Status` column of `coverage-depth-spec-0017.md:22-30`:

```text
US-0017-0001 partial   US-0017-0004 missing   US-0017-0007 missing
US-0017-0002 covered   US-0017-0005 missing   US-0017-0008 missing
US-0017-0003 partial   US-0017-0006 missing   US-0017-0009 covered
       ->  covered 2 / partial 2 / missing 5
```

Both errors move the same way: one fewer missing, one more covered. The file's own justification
section is internally consistent with the *true* count — it carries **five** per-row justification
headings (0004, 0005, 0006, 0007, 0008) — so the totals line is the wrong artifact, not the
justifications. This is a committed governance record whose summary line is what a later reader
trusts without recounting. The same wrong figure is restated at `atdd-spec-0017.md:127`.

### B3 — the matrix contains unjustified missing-cells, which is a Not-done criterion verbatim

- **Artifact**: `.qfai/evidence/coverage-depth-spec-0017.md:20-30` vs `:34-98`
- **Contract**: `qfai-atdd/SKILL.md` Not-done criteria — "Coverage Depth Matrix is missing or
  contains unjustified **cells**"; `references/test-case-depth-checklist.md:114-119` — "**REVISE**:
  Any **cell** is missing without an explicit justification… A justification counts only where it
  survives. It goes under the matrix… **naming the cell**, why the obligation is not coverable at
  this layer, and the `DR-*` or `CR-*` that carries the decision when one exists"
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Not-done criteria + `test-case-depth-checklist.md` Evaluation criteria

The gate is **per cell**, not per row, and each justification must **name the cell**. Counted
mechanically: the matrix has **37 missing-cells** across the seven depth columns (12 covered, 14
partial, 37 missing over 63 cells). It supplies five row-level narratives (one per missing-Status
row) plus a two-bullet note on the two partial rows.

**Six missing-cells have no justification text anywhere in the file** — they sit on rows whose
`Status` is not missing, so they appear in neither section:

| Row          | Unjustified missing-cells            |
| ------------ | ------------------------------------ |
| US-0017-0001 | `Boundary values`                    |
| US-0017-0002 | `State transitions`                  |
| US-0017-0003 | `State transitions`, `Combinatorial` |
| US-0017-0009 | `State transitions`, `Combinatorial` |

The partial-row note at `:91-98` covers US-0017-0001's `State transitions` and `Combinatorial` and
nothing else; US-0017-0003's bullet discusses the "file-derived" half and its `Oracle strength`, not
either of its missing cells.

The remaining 31 sit inside the five missing-Status rows, whose narratives are row-level.
`US-0017-0007` has seven missing cells and names one (`Oracle strength`, at `:76-78`). Your own
commit message says "a justification per **row**" — which is the granularity actually delivered and
one level coarser than the contract asks for.

**This is the cheapest of the five blockers to close** and I would accept a compact per-cell table
(cell -> reason, with `DR-*`/`CR-*` where one exists) rather than prose per cell.

### B4 — US-0017-0007's describe is an annotation over a gap: its assertion is already in the suite

- **Artifacts**: `packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts:264-278`;
  `packages/qfai/tests/e2e/initE2E.test.ts:59-63`;
  `.qfai/evidence/coverage-depth-spec-0017.md:76-78`
- **Contract**: `qfai-atdd/SKILL.md` Success Criteria — "All required `US` are covered by E2E tests";
  `references/test-case-depth-checklist.md:110-113` (Oracle strength is not waivable by category
  coverage) and `:80-87` (anti-vacuity list)
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Success Criteria / Not-done criteria ("Any required `US` ... remains uncovered")

This is my answer to the round's question 1, and it is narrow: **four of your five invariant rows
earn their annotation and one does not.**

US-0017-0007's sole assertion is that the initialised project contains `qfai.config.yaml`.
`packages/qfai/tests/e2e/initE2E.test.ts:59-63` already asserts exactly that, and has for longer —
its `it` is titled "creates qfai.config.yaml in the project root" and it calls `pathExists` on the
same path in the same `runInit` output.

So the describe adds **zero new discriminating power to the suite**. Any mutation that would redden
it already reddens `initE2E`. Your matrix concedes the substance at `:76-78` — "that assertion would
hold for a project with no knobs in it at all. It is a precondition, not evidence of the story" —
and scores its `Oracle strength` as missing, i.e. no evidence any case can fail. A row with every
cell missing including `Oracle strength`, whose only assertion duplicates another file's, is an
annotation carrying no observation.

**What I am *not* asking for.** Do not pin the absence of a knob file. "A test that punishes its own
fix" is a correct principle and it is the right call on US-0017-0004, -0006 and -0008, where the
invariant (no lane rebuilds; the `pull_request` trigger; validate work reachable) is a genuine
precondition of the story that survives the fix and is asserted nowhere else. Acceptable closures for
-0007: assert something about the shipped config the story actually needs — that the runner
configuration an adopter receives is the one the runner resolves, or that the layer-to-lane names in
`test-layers-ci-lanes.md` match the shipped lane job ids, which is a real cross-surface invariant
this spec owns — **or** keep the annotation and record in the matrix that this row's E2E contribution
is `none`, naming the duplicate. What is not acceptable is the current state, where the matrix
describes the row as a precondition and the ledger counts it as coverage.

### B5 — the stage's own gate exits 1 on this spec's own rule; that is a not-done condition, not a correct finding

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:105-107` and `:161-162`
- **Contract**: `qfai-atdd/SKILL.md` Success Criteria — "Validation passes for this spec"; Not-done
  criteria — "Any required `US` / `TC` / `CON-API` remains uncovered"
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Success Criteria + Not-done criteria

**Reproduced.** `validate --profile atdd --fail-on error --spec 0017` against my shadow root reports
`QFAI-ATDD-112` naming exactly eight TCs — `TC-0017-0016`, `-0030`, `-0032`, `-0033`, `-0034`,
`-0035`, `-0069`, `-0070` — and **no** `QFAI-ATDD-111`. So the measured effect you claim is real:
this spec's US obligation is discharged at the gate, and the `-112` set is exactly the 6 `blocked`
plus 2 `todo` rows. (My shadow root additionally reports `QFAI-LINK-001`; that is a
`git archive` / `tar` symlink-flattening artifact of my method, not a repository finding, and I
discount it.)

**But the ruling you asked for goes against you.** The evidence calls this "correct" twice — at
`:107` ("which is correct") and at `:161` ("Correct, and it clears when those rows are implemented").
That conflates *the validator is reporting accurately*, which is true, with *this is an acceptable
end state*, which is not. `QFAI-ATDD-112` here is **this spec's own** spec-owned rule, in scope. The
cross-spec carve-out in CRITICAL CONSTRAINTS covers a *sibling's* obligation; there is no carve-out
for the requested spec's own. And `Layer = Integration` tests are authored **here** (SKILL.md
"Execution Ledger"; Stage Gate **P4**), so all eight are this stage's authoring obligation:

- six are `blocked` on `CR-20260818-0007` / `CR-20260820-0001` / `CR-20260820-0007` — four on the
  last, as you state, which I verified row by row. Deferring these is correct: the Gate Failure
  Autorepair Protocol forbids repairing upstream. But "correctly deferred" means **the stage stays
  open**, not that the gate result is acceptable;
- **two are `TDD-0069` and `TDD-0070` — the same rows as B1**, `todo` and blocked by nothing. The
  evidence's "have no test because they are not implemented" is true and incomplete: they are
  unblocked, selectable, and this stage's to branch.

So the gate failure is accurately *reported* and is a not-done condition the stage has not closed.
Six eighths of it is legitimately parked upstream; two eighths is unfinished P1b/P1d work.

---

## MAJOR

### M1 — five inert placeholder lanes ship, and neither governance record mentions it

- **Artifact**: `packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml:149-213`
- **Contract**: `qfai-atdd/SKILL.md` CRITICAL CONSTRAINTS — the matrix is "a governance record";
  Mandatory Outputs 2; `references/test-case-depth-checklist.md:96-101`
- **Severity: blocking** | **Traces to:** `qfai-atdd/SKILL.md` Mandatory Outputs 2 (Coverage Depth Matrix completeness) / `defect:correctness`

All five layer jobs that the matrix and the E2E test count are placeholders. Each lane's only step is
an `echo`, e.g. the `unit` job at `:149-161`:

```text
      - name: unit lane placeholder
        run: echo "unit lane placeholder - opted in, but the test-lane body ships in a later revision of this file"
```

Ten occurrences of `placeholder` in the shipped orchestrator, and its own header states: "Every lane
is declared but inert until you opt in, so **this file executes no test in your repository today**."

`grep -ni "placeholder|inert|opt in|opt-in"` over `.qfai/evidence/atdd-spec-0017.md`,
`.qfai/evidence/coverage-depth-spec-0017.md` and the E2E test file returns **nothing**. The single
largest fact about what an adopter receives is absent from the record whose stated headline is "the
'and ship it to adopters' half of this spec is roughly half done."

It changes three of the matrix's scores:

- **US-0017-0005** — the justification at `:50-57` frames the gap as jobs-versus-matrix-legs and
  hands the open question to `spec-0003`. True, and beside the point: the story's goal is "a failure
  names its layer", and an `echo` cannot fail in a way that names anything. The shape divergence is
  the smaller half of this gap. The E2E assertion `lanes.length >= 5` is satisfied by five inert
  jobs;
- **US-0017-0001** — listed `SHIPPED`. The detection job and the `toJSON(needs)` verdict do ship and
  are correctly asserted, with real oracles. But the story's goal is a cost reduction ("a handful of
  executed job instances instead of the full fourteen"), and on the shipped tree every lane costs
  nothing because every lane does nothing. `SHIPPED` over-reads it: the *mechanism* ships, and the
  selection it governs governs nothing;
- **US-0017-0004** — see M2.

I am not disputing the four/five split as a summary (see "Confirmed correct"). I am saying the record
must state that the five lanes are inert, because every reader of it will otherwise conclude that
five real test lanes ship.

### M2 — US-0017-0004 scores a covered Oracle strength over six missing category cells, on a collection empty by construction

- **Artifacts**: `.qfai/evidence/coverage-depth-spec-0017.md:25` and `:36-45`;
  `packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts:192-211`
- **Contract**: `references/test-case-depth-checklist.md:82` — "No loop asserts over a collection
  that is empty by construction"; `:110-113`
- **Severity: advisory** | **Traces to:** `test-case-depth-checklist.md` anti-vacuity checklist

The row scores all six category cells missing and `Oracle strength` covered. The checklist bars the
converse explicitly (six covered with a missing oracle is a REVISE); this direction is the same
incoherence, because an oracle is evidence that *a case* can fail and this row has no case.

Mechanically: the assertion iterates `job.steps[].run` looking for a build command, and every step in
every lane is an `echo` placeholder — so the collection it filters is empty by construction, which is
item 3 of the anti-vacuity list. `E4` ("a lane gains its own bundler build") does violate the
property the assertion states, so `E4` is a sound oracle **for the assertion**; it is not an oracle
for the story. Score the cell against what the row observes: partial with the placeholder fact named,
or covered with the scope of the claim stated as "the assertion, not the obligation". Deep oracle
audit is `qa-gatekeeper`'s domain and I did not duplicate it; I raise only what the matrix asserts.

### M3 — the matrix's scoring surface does not match the stories' surface

- **Artifacts**: `.qfai/evidence/atdd-spec-0017.md:25-30` (Decision 1);
  `.qfai/evidence/coverage-depth-spec-0017.md:9-17` and `:99-104`;
  `.qfai/specs/spec-0017/02_User-stories.md`
- **Contract**: `qfai-atdd/SKILL.md` Success Criteria — "All required `US` are covered by E2E tests"
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Success Criteria / Mandatory Outputs 2

Decision 1 asserts "A user story is about the adopter." Read against this spec's US catalogue, that
premise does not hold. Four of the nine are explicitly own-tree obligations:

- **US-0017-0002** — title: "**Own-CI** supply-chain hardening…"; goal: "every own-CI job…"
- **US-0017-0003** — "the setup preamble to exist exactly once **in the repository** and every own-CI
  job to consume that one definition". Its **Non-goals** rule out "shipping this mechanism to
  adopters (a composite action under the shipped `.github/` is a hard pack failure, DTC-1)"
- **US-0017-0005** — "separated into their own **own-CI** jobs and matrix legs"
- **US-0017-0008** — "**the repository's own** duplicate of the shipped validate workflow deleted"

The matrix then declares at `:101` that no cell is scored from this repository's own workflows — i.e.
no cell is scored from the surface four of the nine stories name. That biases in both directions at
once: it understates coverage for the own-tree stories (`tests/scripts/ownWorkflowTopology.test.ts`
and `workflowHygiene.test.ts` do assert them, and are named in the E2E file's header but scored
nowhere), and it credits shipped-tree observables to own-tree obligations.

**The sharpest instance is US-0017-0003, scored covered on both `Normal path` and `Error path`.** What
the E2E test asserts is the absence of a `node-version:` literal in the shipped set. The story's
obligation is single-definition setup with a file-derived version in the **own** tree — which the
story's own Non-goals say must not be shipped unconditionally. Two covered cells for a surface the
story excludes.

And the stated reason for its partial `Status` is inaccurate. `:96-98` says: "'File-derived' — the
positive half — is not established: nothing here proves the version comes from a file rather than
from a default." But the shipped tree **does** derive it:
`packages/qfai/assets/init/root/.github/workflows/qfai-validate.yml:118-149` reads `.nvmrc`, then
`.node-version`, then falls open to Node 20 with a warning annotation, and feeds
`node-version: ${{ steps.node-version.outputs.version }}` into `setup-node`. So the positive half is
assertable from the very surface this matrix scores against, and simply was not asserted. That is a
cheap gap, not an inherent limit — and it is the one place where an invariant was used where the
substance was available.

Acceptable closure: state the reframe as an explicit, named deviation with the own-tree assertions
cross-referenced per story, rather than as a premise about what user stories are; and correct the
US-0017-0003 reason.

### M4 — the ordering claim is not checkable from git history, and the gate that enforced it is not in the repository

- **Artifacts**: commit `1e806e50`; `.qfai/evidence/atdd-spec-0017.md:52-57`
- **Contract**: `qfai-atdd/SKILL.md` Evidence (MANDATORY); `constitution/drift-protocol.md` —
  evidence must be verifiable by a party that did not author it
- **Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY)

Question 2/3 has two parts.

**Part one passes.** No annotation names a `US` no describe covers. All nine ledger lines
(`tests/e2e/qfai-traceability.md:214-222`) have a matching annotated describe in the E2E file, one
each, and the nine describes carry exactly those nine `US-0017-*` tokens and no others. The file runs
green: `vitest run --project e2e tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts` -> `Tests 9 passed
(9)`, reproduced. No `TC-*` annotation was added to `tests/e2e/**`, so no forbidden reference.

**Part two does not.** `git log --diff-filter=A` on
`packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts` returns `1e806e50` — the same and only
commit that appended the nine ledger lines. The history records one atomic change, so it cannot
witness which of the two came first. And the "script that appended them [and] refuses unless every
declared `US` is covered by a `describe`" is not in `1e806e50` and I could not find it anywhere in
the tree. The refusal was real at most once, at authoring time, and is **not durable**: nothing in the
repository now prevents the ledger from outliving the tests.

That matters more here than it would elsewhere, because of how `QFAI-ATDD-111` actually resolves.
`qfai.config.yaml` sets `testsDir: tests`;
`packages/qfai/src/core/atddTraceability.ts:1184-1198` (`buildAtddTestGlobs`) builds the scan globs as
`tests/{e2e,api,integration}/**` **relative to the repository root**; and the root `tests/e2e/`
contains exactly one file, `qfai-traceability.md`. `packages/qfai/tests/e2e/**` is **not scanned at
all** — its nine annotations are invisible to the validator. So the nine ledger lines are the entire
mechanical cause of `QFAI-ATDD-111` clearing, and the E2E file is joined to them by nothing but this
run's discipline.

Your Decision 4 discloses the first half of this honestly and I credit it. The sentence that
overreaches is "so the ledger cannot outrun the tests" — present tense, describing a property the
tree does not have. Either commit the script (a `ci:lint` member asserting ledger-line to describe
parity would make the claim true and durable), or restate it in the past tense as a one-time
authoring discipline with the residual risk recorded.

---

## MINOR

### m1 — the red-provenance citation does not cover this case

`.qfai/evidence/atdd-spec-0017.md:115` cites `references/red-provenance.md#a-spec-with-no-atdd-owned-rows`
as covering the zero count. That section (`red-provenance.md:315-336`) is about a spec whose ledger
has **zero** rows because `/qfai-sdd` Phase 2b seeds none — "A first run therefore finds **zero**
`Layer = E2E` / `Layer = API` rows". It does not mention `Integration` and does not contemplate rows
that exist but sit past `todo`. spec-0017 has 71 ATDD-owned rows. The conclusion drawn about the
`refactor` rows is right (see B1); the authority cited does not support it.
**Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Evidence (MANDATORY).

### m2 — the Delta Rejected Guard leaves no trace; I discharged it myself

`.qfai/evidence/atdd-spec-0017.md:11-22` (`## Inputs reviewed`) lists neither
`.qfai/specs/spec-0017/09_delta.md` nor `07_Decisions.md` (P5). No `## DONE Declaration` and no "no
rejected options were reintroduced" confirmation appears anywhere, both of which
`qfai-atdd/SKILL.md` requires ("Delta Rejected Guard (Mandatory)", "DONE Declaration (Mandatory
Output)"). A missing DONE Declaration is consistent with a self-declared FAIL; the guard is an
input-side check and is not.

**I performed the check independently and it passes.** `09_delta.md:143-170` lists three rejected
candidates: splitting the TC table across two markdown tables; recording the size breach as a SPLIT
candidate; and "writing test cases for the two partly observable obligations as if a gate existed — a
machine check over an action-bump configuration, and a build-reuse assertion against a baseline
number". **None is reintroduced.** The US-0017-0002 describe asserts SHA pins and
`persist-credentials`, not a bump-owner configuration check; the US-0017-0004 describe asserts
no-lane-rebuilds, not a baseline comparison. No RE-OPEN is needed and none is missing.

Worth flagging for the rework: that third entry's **Temptation** line reads "a row that cannot fail
looks like coverage, and an empty cell looks like a gap worth filling with anything." That is not a
guard breach — the rejected candidates are specific and neither was taken — but it is a precise
description of B4, written into this spec's own delta before this stage ran.
**Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` Delta Rejected Guard (Mandatory).

### m3 — the disclosed Work Orders deviation is itself incomplete

`.qfai/evidence/atdd-spec-0017.md:131-139` names `test-design-analyst`, `acceptance-test-engineer`
and `devops-ci-engineer`. Against `.qfai/assistant/manifest/agent-routing.yml:139-206`, the mandatory
set across the five `qfai-atdd` phases is: `{test-design-analyst, qa-strategist}` (coverage, with
`test-design-analyst` blocking), `{delivery-planner, acceptance-test-engineer}` (red, with
`delivery-planner` blocking), `{acceptance-test-engineer}` (implementation), `{}` (evidence, with
`devops-ci-engineer` **conditional**), and `{completion-reviewer, qa-gatekeeper}` (review, both
blocking). So the disclosure omits `qa-strategist` and `delivery-planner` — both mandatory, one of
them blocking — and promotes `devops-ci-engineer` to mandatory when the manifest has it conditional.
The whole value of a volunteered deviation is its completeness.
**Severity: advisory** | **Traces to:** `agent-routing.yml` `qfai-atdd` phases.

### m4 — the Validate Hard Gate evidence names no artifact

`.qfai/evidence/atdd-spec-0017.md:73-88` quotes before/after counts but cites neither the per-run
`<report>/run-*/` directory nor `.qfai/report/validate.spec-0017.json`, which
`qfai-atdd/SKILL.md` CRITICAL CONSTRAINTS names as the two admissible citations ("do not cite
`validate.log` from a run you shared with another stage"). `validate.spec-0017.json` does exist on
disk and is untracked. Name the path.
**Severity: advisory** | **Traces to:** `qfai-atdd/SKILL.md` CRITICAL CONSTRAINTS (Validate Hard Gate evidence).

---

## Sequencing note (not a finding)

`.qfai/evidence/atdd-spec-0017.md:190-191` reads:

```text
`Review pack:` none opened for this stage.
`Review pack seal:` not applicable — no pack exists to seal.
```

A pack now exists — `.qfai/review/review-20260820200000000/`, opened by `8fb48002`, after the evidence
was authored in `1e806e50`. Per my stop conditions an unfinalized completion record is a sequencing
note, not a gap: the seal is owed at completion, after this verdict and R03's land, and
`## Final status` is outside my audit subject by design. Recorded here only so the rework does not
miss that those two lines are now false statements, and that the seal must be **recorded** and then
**recomputed** as two separate moments (`qfai-atdd/SKILL.md` Success Criteria, final bullet).

## Confirmed correct — what I tried and could not break

1. **Question 5, the shipped-tree measurement: all six sub-claims verified, and the split is right as
   a split.** `grep -c upload-artifact` over both shipped workflows returns `0` and `0`. No `run:`
   step matching a build command in either file. Five separate layer jobs (`unit`, `component`,
   `integration`, `api`, `e2e`) and **no `strategy:` or `matrix:` block anywhere** in `qfai-tests.yml`
   — so "five separate JOBS, not matrix legs" is exact. Zero occurrences of `check-workflow-hygiene`
   under `assets/init/root/.github/workflows/`. No knob file in the asset tree: `vitest.knobs.ts`
   exists only at `packages/qfai/vitest.knobs.ts`. `qfai-validate.yml` is still in the shipped
   directory. The four/five satisfied split is defensible as a summary; M1 and M3 are about what the
   record omits and how the cells are scored, not about the split.
2. **Question 4's legal reading.** Step 3b does not reach rows past `todo`. Confirmed directly from
   `qfai-implement/SKILL.md:116`. Manufacturing provenance for the 63 `refactor` rows would be worse
   than the gap, and that gap is correctly located in
   `.qfai/evidence/implement-spec-0017.md#the-merge-moved-the-contract-past-this-record`, which I read
   and which states it accurately. B1 is about the two rows that reading missed, not about the
   reading.
3. **Question 1's design principle.** Sound, and correctly applied on US-0017-0004, -0006 and -0008. I
   would REVISE a rework that pinned the absences.
4. **Annotation/describe parity and a green suite.** See M4 part one. 9/9 pass, reproduced.
5. **No forbidden references** introduced; `US-*` annotations only in `tests/e2e/**`.
6. **QFAI-ATDD-111 really did clear for this spec**, and the cross-spec residue at
   `.qfai/evidence/atdd-spec-0017.md:163-167` (spec-0003 / 0006 / 0008 / 0015) is handled exactly as
   CRITICAL CONSTRAINTS prescribes: recorded as a cross-spec obligation, not waived, not profiled
   away, not claimed as a pass.
7. **No rejected option reintroduced.** See m2.
8. **The reviewer routing is correct and complete.** `agent-routing.yml:203-206` makes
   `completion-reviewer` and `qa-gatekeeper` mandatory and blocking, with `implementation-reviewer`
   conditional. `1e806e50` touched only the E2E test, the annotation ledger, two evidence files and
   `validate.log` — no helper or runtime support code — so `implementation-reviewer` is legitimately
   not routed. Two blocking reviewers for two blocking slots.
9. **HEAD did not move.** `8fb48002` at start and at finish; `git status --porcelain` empty at start.
10. **The self-declared FAIL is the right verdict for the stage**, and volunteering the Stage Minimum
    Roles deviation rather than glossing it is the correct treatment. The gate deviation is what this
    round repairs; the authorship separation (the orchestrator must not draft the primary artifact)
    is not retroactively repairable and stays a permanent residual on this stage's record.

## Required fixes (blocking only)

1. **B1** — correct `## Ledger rows advanced`. Enumerate `TDD-0069` and `TDD-0070` as `todo`
   `Integration` rows; choose their branch at **P1b** (branch 3, on the evidence I read); write a
   `DR-*` per row naming why branches 1 and 2 are both unavailable; route `qa-gatekeeper` on the
   `DR-*` per **P1d** and record its PASS in the entry; write each entry in the `exception` shape
   (`red-provenance.md:254`) **before** the gate is routed; and state the disposition
   `red-provenance.md:370-388` requires — a waiver **asked of the user, never decided here**, or the
   row parked with the spec staying open. Delete the "All 71 are already at `refactor`" sentence: it
   is false.
2. **B2** — correct the totals to covered 2 / partial 2 / missing 5, in
   `coverage-depth-spec-0017.md:32` and in `atdd-spec-0017.md:127`.
3. **B3** — justify every missing **cell**, naming the cell, per
   `test-case-depth-checklist.md:114-119`. The six wholly unjustified ones are tabulated in B3; the 31
   inside the missing-Status rows need cell-level attribution, for which a compact cell-to-reason
   table is sufficient.
4. **B4** — resolve US-0017-0007: give it an assertion the story owns and no other test already makes,
   **or** keep the annotation and record its E2E contribution as `none` with `initE2E.test.ts:59-63`
   named as the duplicate. Do not pin the absence of a knob file.
5. **B5** — stop calling the `QFAI-ATDD-112` failure "correct" at `:107` and `:161`. Restate it as a
   not-done condition: six TCs correctly parked on named CRs (upstream, not repairable here), two
   (`TC-0017-0069`, `TC-0017-0070`) unfinished work of this stage per B1.
6. **M1** — record in both governance records that all five shipped layer lanes are `echo`
   placeholders and that the shipped orchestrator executes no test, and re-score US-0017-0005,
   US-0017-0001 and US-0017-0004 against that fact.

## Advisory / Change Request proposals

- **A durable ledger-parity gate.** M4 establishes that the root
  `tests/{e2e,integration}/qfai-traceability.md` files are the only surfaces `QFAI-ATDD-111` and
  `QFAI-ATDD-112` read, while the tests themselves live under `packages/qfai/tests/**` and are never
  scanned. Every spec in this repository is exposed to the same drift, not just spec-0017: deleting a
  test leaves the gate green. This is a product obligation upstream never asked for, so I raise it as
  an advisory per `constitution/drift-protocol.md#reviewer-originated-obligations` and **not** as a
  blocking finding. Propose a `CR-*` for a `ci:lint` member asserting annotation-ledger to
  annotated-test parity, owned by whichever spec owns the traceability validator. It is out of scope
  for this stage's rework and must not gate it.
- **The positive half of US-0017-0003 is cheap to assert now.** `qfai-validate.yml:118-149` ships the
  `.nvmrc` and `.node-version` derivation. Asserting it would convert an invariant row into a
  substance row at near-zero cost. Advisory, not required; it belongs to whichever `/qfai-atdd` run
  follows the matrix correction.

## Open risks / residuals

- The **authorship separation** breach is permanent on this stage's record. This round repairs the
  gate only. Any future reader of `atdd-spec-0017.md` should treat its `## Work Orders Summary` as
  binding.
- **TDD-0069 and TDD-0070 are deadlocked** until B1 is closed: step 3b stops on an absent entry, and
  nothing else in the flow can create one.
- **QFAI-ATDD-112 cannot reach zero for this spec** while four rows are blocked on
  `CR-20260820-0007`, two on other CRs, and two are waiting on CI history that does not exist. The
  spec cannot close on this branch; the honest end state is "open, with six obligations parked
  upstream and two on a branch-3 disposition".
- **Concurrency.** R03 (`qa-gatekeeper`) ran against the same tree while I did. I used my own shadow
  root and my own scratch directory and touched neither of theirs. Any `validate.log` or run-log
  pointer in the working tree may reflect either run and should not be cited by either of us.

## Evidence checked

- `.claude/skills/qfai-atdd/SKILL.md` (whole); `references/red-provenance.md`;
  `references/test-case-depth-checklist.md`
- `.qfai/assistant/constitution/shared-skill-operating-baseline.md` (Delta Rejected Guard, Gate
  Failure Autorepair Protocol); `shared-skill-delegation-baseline.md` (reviewer response template and
  the four-step audit-hash procedure); `drift-protocol.md`
- `.qfai/assistant/manifest/agent-routing.yml:139-206`
- `.qfai/assistant/skills/qfai-implement/SKILL.md:113-117` (Phase Red steps 3a, 3b, 3c)
- `.qfai/specs/spec-0017/02_User-stories.md` (all nine); `09_delta.md:140-176`;
  `tdd/test-list.md` (parsed mechanically, 83 rows)
- `.qfai/evidence/atdd-spec-0017.md`; `.qfai/evidence/coverage-depth-spec-0017.md`;
  `.qfai/evidence/implement-spec-0017.md#the-merge-moved-the-contract-past-this-record`
- `packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts` (whole);
  `packages/qfai/tests/e2e/initE2E.test.ts:59-63`
- `packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml` and `qfai-validate.yml`
- `packages/qfai/src/core/atddTraceability.ts:190-310` and `:1136-1206`;
  `src/core/validators/atddCodeTraceability.ts:1-200`; `qfai.config.yaml`
- `tests/e2e/qfai-traceability.md` (222 lines); `tests/integration/qfai-traceability.md`
- Commands run: `git rev-parse --short HEAD` and `git status --porcelain` (start and finish);
  `git log --diff-filter=A` on the E2E file and the annotation ledger;
  `git show --stat 1e806e50 8fb48002`;
  `vitest run --project e2e tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts` (9 passed);
  `validate --profile atdd --fail-on error --spec 0017 --root tmp/r02-completion/shadow`
- **Not re-run:** `pnpm ci:lint` and the repo-wide `--profile tdd` run, both claimed at
  `atdd-spec-0017.md:83-87`. Runtime re-verification of those is the `qa-gatekeeper` domain and I did
  not duplicate it. No finding above rests on either.
