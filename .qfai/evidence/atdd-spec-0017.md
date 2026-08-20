# ATDD Evidence: spec-0017

## Objective

Cover `spec-0017`'s nine `US-0017-*` from `<testsDir>/e2e/**`, which is where `QFAI-ATDD-111` answers
`US-*` obligations. Before this stage the spec had **zero** E2E coverage and the gate reported all
nine — one of the two `error=2` findings that had stood through six review rounds of
`/qfai-implement`, and, as PR #794 showed, one of the reasons the required status context cannot go
green.

**Eight of the nine are covered. `US-0017-0007` is not**, and its claim was withdrawn in round 1
rather than propped up. See § "Round 1, and the five things it changed".

## Inputs reviewed (files/paths)

- `.qfai/specs/spec-0017/01_Spec.md`, `02_User-stories.md`, `03_Acceptance-Criteria.md`,
  `05_Examples.md`, `06_Test-Cases.md`
- `.qfai/specs/spec-0017/07_Decisions.md` — `DR-0017-*`, read for the rejected alternatives this
  stage must not reintroduce (P5)
- `.qfai/specs/spec-0017/09_delta.md` — including its `## Rejected` section (Delta Rejected Guard)
- `.qfai/specs/spec-0017/tdd/test-list.md` — read, never written. 82 rows: 71 `Integration`,
  11 `Unit`; **74 `refactor`, 6 `blocked`, 2 `todo`**. The two `todo` rows are `Integration` and are
  therefore this stage's to route — see § "Ledger rows advanced"
- `.qfai/assistant/catalog/test-layers.md` — the layer derivation and the directory each `Level`
  routes to
- `packages/qfai/assets/init/root/.github/workflows/**` — the shipped surface, measured before any
  test was written, and re-measured at step-body level in round 1
- `packages/qfai/tests/e2e/initE2E.test.ts` — the existing `runInit` E2E pattern, and (round 1) the
  test whose assertion `US-0017-0007` was duplicating

### Delta Rejected Guard — confirmation

`09_delta.md § Rejected` carries three candidates and `07_Decisions.md` carries nine rejected
alternatives. **No rejected option is reintroduced by this stage**, and one of them is the reason for
this stage's largest correction:

- *"writing test cases for the two partly observable obligations as if a gate existed … a row that
  cannot fail looks like coverage"* — this is exactly what `US-0017-0007` had become. Its one
  assertion could not fail for any project `qfai init` produces. Withdrawing the claim follows the
  delta's `DO NOT` rather than working around it.
- *"splitting the test-case set across two markdown tables"* — not touched; this stage did not write
  `06_Test-Cases.md` at all.
- *"recording the size breach as a SPLIT candidate"* — not proposed.
- `07_Decisions.md`'s rejected alternatives concern validator placement, ledger timing and the own
  tree's validate copy. This stage added a **script** under `scripts/`, which is the accepted shape
  (`DR` rejected "a validator rule under `src/core/validators/**`" and "a second parser over the
  same surface"); `check-atdd-annotation-ledger.mjs` introduces no second parser of any spec
  artifact — it reads an annotation ledger and test sources, neither of which any validator parses.

## Decisions made (with rationale)

**1. The E2E surface for this spec is `qfai init`, not this repository's workflows.** `spec-0017` has
two halves, and the own half is already asserted directly against `.github/workflows/**` by
`tests/scripts/ownWorkflowTopology.test.ts` and `tests/scripts/workflowHygiene.test.ts`. So the one
end-to-end surface is: initialise an empty project and read what arrives.

The first version justified that with a premise — "a user story is about the adopter" — and round 1's
`completion-reviewer` read it against this spec's US catalogue, where it does not hold: `US-0017-0002`
says "**own-CI** supply-chain hardening", `-0003` "exactly once **in the repository**" with Non-goals
that *rule out* shipping the mechanism, `-0005` "their own **own-CI** jobs and matrix legs", and
`-0008` "**the repository's own** duplicate". Four of the nine name the own tree explicitly, so
scoring every cell against the adopter's tree understates those four and credits shipped-tree
observables to own-tree obligations.

**Restated as a deviation, not a premise.** This stage scores the E2E surface, which is `qfai init`;
that is a limit of this stage, and the own-tree half of each of those four stories is asserted by the
`Integration` rows of `tdd/test-list.md` and scored there. The Coverage Depth Matrix carries the
cross-reference per story under § "The scoring surface, and where it does not match the stories".

**2. The shipped tree was measured before a line was written — and round 1 found the measurement was
not deep enough.** Four of the nine stories are satisfied there and five are not:

```text
US-0017-0001  detection job + verdict over toJSON(needs)      SHIPPED
US-0017-0002  SHA pins, persist-credentials: false            SHIPPED
US-0017-0003  no workflow-level Node version literal          SHIPPED
US-0017-0009  the layer-to-CI-lane map                        SHIPPED
US-0017-0004  build reuse + upload hygiene                    0 uploads, 0 builds — no surface
US-0017-0005  layer lanes without a new check name            5 separate JOBS, and all 5 are stubs
US-0017-0006  a hygiene lint lane pull requests run           not invoked by the shipped set
US-0017-0007  parallelism knobs from the workload             no knob file ships
US-0017-0008  the duplicate validate workflow retired         qfai-validate.yml still ships
```

The correction is on `US-0017-0005`: the five shipped layer lanes each contain exactly one step, and
that step is `echo "<layer> lane placeholder - opted in, but the test-lane body ships in a later
revision of this file"`. **No shipped lane runs a test.** The first measurement read job names and
structure and never read a step body — the same failure mode as the four vacuous claims implement
rounds 4-6 found, which all asserted over how code is *written* rather than what it *does*.

**3. The five unsatisfied stories are not asserted as absences.** A test pinning "no hygiene lane is
invoked" fails the day someone correctly adds one — a test that punishes its own fix. Each asserts
instead the invariant its story depends on and which survives the gap closing. The depth loss is
recorded as `❌` in the Coverage Depth Matrix with a justification per **cell**, which is what that
committed record is for.

**4. The annotation was appended AFTER the test existed — and round 1 found that claim uncheckable,
so it is checkable now.** `QFAI-ATDD-111` reads `tests/e2e/qfai-traceability.md` at the repository
root — an annotation ledger, not the test files. Appending nine lines to it would have cleared the
gate at any point in the last six rounds, and doing so before a test existed is precisely the false
certification `CR-20260814-0001` describes.

The first version of this record said the lines were appended "by a script that refuses unless every
declared `US` is covered by a `describe`". **That script was not in the repository.**
`git show --stat 1e806e50` lists five files and no script, and because the test and the ledger lines
landed in one atomic commit, history could not settle the ordering either. Round 1's `qa-gatekeeper`
found both halves. The script now exists as `scripts/check-atdd-annotation-ledger.mjs` with ten tests
in `packages/qfai/tests/integration/scripts/checkAtddAnnotationLedger.test.ts`, and it reports what
this stage claims: `8 claim(s) backed by a test annotation (spec-0017)`, exit 0.

**5. One `runInit`, shared across the describes, with an `afterAll` teardown.** Nine inits of a full
asset tree is nine times the same work; this spec's own integration slice was pushed past its timeout
by exactly that shape. The teardown was missing in the first draft and `eslint` caught the unused
`rm` import, which is how the leak was found.

## Round 1, and the five things it changed

Two blocking reviewers ran on `8fb48002` against `.qfai/review/review-20260820200000000/`:
`completion-reviewer` (R02) and `qa-gatekeeper` (R03). Both returned **REVISE**. Every number this
record reported reproduced exactly; both verdicts were about claims built on top of the numbers.

**1. A false statement of fact in the one section it mattered.** This record said "All 71
`Integration` rows are already at `refactor`, so none is `todo`." Cross-tabulated, the ledger holds
**63 `refactor`, 6 `blocked`, 2 `todo`** — and the same file said "74 refactor, 6 blocked, 2 todo"
four sections earlier. The contradictory sentence sat in `## Ledger rows advanced`, the section whose
whole job is discharging that question. Corrected below, with the two rows routed.

**2. `US-0017-0007`'s assertion had zero discriminating power.** Its sole `it` asserted that
`qfai.config.yaml` exists after init, and `tests/e2e/initE2E.test.ts:58-64` already asserts exactly
that. The matrix had itself conceded the assertion "would hold for a project with no knobs in it at
all" and scored `Oracle strength` `❌` — and the annotation was appended anyway. That is an
annotation over a gap. **The describe and the ledger line are both removed**; `QFAI-ATDD-111` reports
`US-0017-0007` again, deliberately.

**3. `E4`'s predicate was far narrower than the property it claimed.** It did violate its property,
so not the vacuous case — but `/\b(pnpm|npm|yarn)\s+(-\S+\s+\S+\s+)?build\b/` admits one flag-value
pair and nothing else. Measured one form at a time: `pnpm build`, `pnpm -C packages/qfai build` and
`yarn build` reddened; **`pnpm run build`, `npm run build`, `yarn run build`, `pnpm exec tsup` and
`npx tsup` reddened nothing** — the idiomatic form was invisible. Rebuilt around the verb and
re-observed: **10 of 10 forms redden**, control green (§ "Execution logs", `E4b`).

**4. The matrix disagreed with itself.** Declared `✅ 3 / ⚠️ 2 / ❌ 4`; the table held
`✅ 2 / ⚠️ 2 / ❌ 5` — nine rows counted into eight slots — and the file's own five justification
sections agreed with the table, not the total. Six `❌` **depth cells** were unjustified by name, all
on rows presented as successes, and the contract is per cell. Corrected, every `❌` cell partitioned
into a named reason class, and the whole thing pinned by
`packages/qfai/tests/assets/coverageDepthMatrix.test.ts` — four tests, all seven falsification
rounds reddening (§ "Execution logs", `M1`-`M7`).

**5. The gate cannot see the tests at all.** `testsDir: tests` is repo-root relative, so
`QFAI-ATDD-111` scans one markdown file. `qa-gatekeeper` ran the decisive experiment: removing the
nine ledger lines with the test file present gives `error=2`; **deleting the test file entirely with
the lines present gives `error=1`** — identical to today. So this record's line "verified by
`validate` no longer reporting `QFAI-ATDD-111`" verified the ledger, not the tests. That claim is
withdrawn; the verification is now `check-atdd-annotation-ledger.mjs --spec 0017` plus the E2E suite
result, and `validate` is cited only for what it actually measures.

**Two advisory findings that changed scores.** `US-0017-0004`'s `Oracle strength` was `✅` over six
`❌` category cells — and `references/test-case-depth-checklist.md:82` bars a loop asserting over a
collection empty by construction, which is what a build scan over five `echo` steps is. `E4` is a
sound oracle for the assertion and not for the story. Scored `⚠️`.

And `US-0017-0003`'s stated reason was **false**: the matrix said nothing proved the version came
from a file, while `qfai-validate.yml:117-149` probes `.nvmrc`, then `.node-version`, publishes what
it finds, and only falls open to Node 20 with a `::warning::`. The substance was reachable from the
surface this matrix scores and had simply not been asserted — a cheap gap, not a limit. Asserted now,
behaviourally, and the row rose to `✅`. Round 1 also recorded that four of the nine stories name the
own tree explicitly, so "a user story is about the adopter" is stated as a named deviation with the
own-tree assertions cross-referenced per story, rather than as a premise.

That experiment also produced a repo-wide finding this stage did not go looking for: **127 of the 208
claims in `tests/e2e/qfai-traceability.md` are backed by no annotation in any E2E test file** (126
across every test directory in the repository). `spec-0017` is the only spec at zero. `spec-0012`
alone has 28. Filed as `CR-20260820-0011`; not this spec's work, recorded as a cross-spec obligation.

## Work performed (what changed, where)

- **new** `packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts` — eight annotated describes,
  one per covered user story, plus a block comment where `US-0017-0007`'s was, recording why the
  claim was withdrawn rather than leaving its absence to be inferred
- **appended, then partly reverted** `tests/e2e/qfai-traceability.md` — nine
  `QFAI:SPEC-0017:US-0017-NNNN` lines, of which `US-0017-0007`'s was removed in round 1
- **new** `.qfai/evidence/coverage-depth-spec-0017.md` — the Coverage Depth Matrix, committed
- **new** `scripts/check-atdd-annotation-ledger.mjs` — the guard this record had claimed existed
- **new** `packages/qfai/tests/integration/scripts/checkAtddAnnotationLedger.test.ts` — 10 tests
- **new** `packages/qfai/tests/assets/coverageDepthMatrix.test.ts` — 4 tests pinning the matrix
- **new** `.qfai/decisions/CR-20260820-0011-*.md` — the 127 unbacked ledger claims

`tdd/test-list.md` was not written. `/qfai-implement` owns its cells.

## Commands executed + key outputs

```text
pnpm -C packages/qfai exec vitest run --project e2e tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts
  -> Tests 9 passed (9), exit 0
     (9 before US-0017-0007 was withdrawn, 8 after, 9 again once US-0017-0003
      gained the positive-half assertion round 1 showed was available)

node scripts/check-atdd-annotation-ledger.mjs --spec 0017
  -> check-atdd-annotation-ledger: 8 claim(s) backed by a test annotation (spec-0017), exit 0

node scripts/check-atdd-annotation-ledger.mjs        (repo-wide)
  -> exit 1; 127 of 208 claims unbacked; see CR-20260820-0011

pnpm -C packages/qfai exec vitest run tests/integration/scripts/checkAtddAnnotationLedger.test.ts
  -> Tests 10 passed (10), exit 0
pnpm -C packages/qfai exec vitest run tests/assets/coverageDepthMatrix.test.ts
  -> Tests 4 passed (4), exit 0

node packages/qfai/dist/cli/index.mjs validate --profile atdd --fail-on error --spec 0017
  before this stage:  info=2 warning=0 error=2   QFAI-ATDD-111 (9 US), QFAI-ATDD-112 (8 TC)
  after round 1:      info=2 warning=0 error=2   QFAI-ATDD-111 (1 US: US-0017-0007), -112 (8 TC)
  artifact:           .qfai/report/validate.spec-0017.json
  per-run directory:  .qfai/report/run-20260820194530635/
```

**Validate Hard Gate evidence** is those two paths, not `.qfai/report/validate.log`. This skill's
CRITICAL CONSTRAINTS name the per-run directory and this spec's `validate.spec-<id>.json` as the two
admissible citations, because `validate.log` and the run-log pointer are shared by every run, scoped
or not, and nothing serializes them — a concurrent stage can leave that pointer naming its run rather
than this one. The first version of this record quoted counts and cited neither path; round 1's
`completion-reviewer` raised it (`m4`).

**The scoped gate is back at `error=2`, and that is the honest number.** Withdrawing
`US-0017-0007`'s unearned annotation returns its `QFAI-ATDD-111` finding, so this stage's measured
effect on the gate is `error=2 -> error=2`, with the content changed from nine uncovered stories to
one. The intermediate `error=1` is not reported as this stage's result, because one of the nine
clearances was false.

## Test volume estimate

| Layer       | Raw count | Signal | Evidence                   | Notes                                                       |
| ----------- | --------: | -----: | -------------------------- | ----------------------------------------------------------- |
| E2E         |         9 |      8 | `US-0017-0001` … `-0009`   | one describe each except `-0007`, withdrawn in round 1       |
| API         |         0 |      0 | no `CON-API-*` declared    | nothing owed                                                 |
| Integration |        71 |     63 | `Layer = Integration` rows | 63 `refactor`; 6 `blocked`, 2 `todo` — see the section below  |

The 11 `Unit` rows owe nothing here (`L1` has no mandated directory).

## Coverage obligations checklist

- `US-0017-0001` … `-0006`, `-0008`, `-0009` — **covered**, `tests/e2e/**`, verified by the E2E suite
  passing and by `check-atdd-annotation-ledger.mjs --spec 0017` confirming each ledger claim names a
  test that exists. **Not** verified by `validate`, which reads only the ledger (round 1, finding 5)
- `US-0017-0007` — **not covered**, deliberately. Claim withdrawn; `QFAI-ATDD-111` reports it
- `CON-API-*` — none declared, nothing owed
- `TC-0017-*` at `L3` — 63 of 71 covered; the 8 uncovered are the 6 `blocked` and 2 `todo` rows,
  which have no test because they are not implemented. `QFAI-ATDD-112` names exactly those eight
- Forbidden references — none introduced: the new file carries `US-*` annotations only, and no
  `TC-*` annotation was added to `tests/e2e/**`

## Ledger rows advanced

**None advanced. Two rows are routed to branch 3 and parked; the rest were not this stage's to
route.** The previous version of this section said all 71 `Integration` rows were at `refactor` and
that zero was therefore trivially correct. That was false, and it is corrected here.

| `TDD-*`    | `Layer`     | obligation     | branch                          | `DR-ID`        | anchor       |
| ---------- | ----------- | -------------- | ------------------------------- | -------------- | ------------ |
| `TDD-0069` | Integration | `TC-0017-0069` | 3 — `exception`                 | `DR-0017-0010` | § `TDD-0069` |
| `TDD-0070` | Integration | `TC-0017-0070` | 3 — `exception`                 | `DR-0017-0010` | § `TDD-0070` |

**The `DR-*` was authorable all along, and round 2 found that both ways.** The first version of this
section recorded the branch with the `DR-*` "pending", on the stated grounds that this stage could not
author it because `07_Decisions.md` is a read-only P5 input. That obstacle was **the wrong artifact**:
`qfai-implement/references/execution-ledger.md` § "Where the Decision Record is written" puts a
branch-3 DR at `.qfai/decisions/DR-<id>-<slug>.md` and says explicitly **not**
`07_Decisions.md` / `09_delta.md`, and `constitution/drift-protocol.md` whitelists *creating* exactly
that file. `completion-reviewer` and `qa-gatekeeper` each found it independently, and each pointed out
that this stage had exercised the same authority in the same round when it wrote `CR-20260820-0011`.
`TDD-0069` / `TDD-0070` are also **not** in `CR-20260820-0007`'s blocked set, so that CR was not the
obstacle either. P1d was runnable and was not run.

`.qfai/decisions/DR-0017-0010-two-tuning-guard-rows-cannot-be-reddened-before-the-history-they-measure-exists.md`
now exists and carries the branch-1 and branch-2 attempts, the anomaly per row, and the audit subject
`references/red-provenance.md` fixes. P1d's `qa-gatekeeper` is routed on it; the verdict is recorded
under § "Reviewer verdicts on the branch-3 DR" below.

63 `refactor` rows are past `todo` and outside step 3b's reach — it routes a row this stage would
advance **from** `todo`. 6 `blocked` rows carry a `Blocked-By` value and are skipped by Phase Red's
selection. That leaves exactly the two below, and `references/red-provenance.md#a-spec-with-no-atdd-owned-rows`
does **not** cover them: it is scoped to a spec with zero `E2E`/`API` rows, and says nothing about
`Integration` rows at `todo`.

### TDD-0069

- `Layer`: `Integration`
- `Test file`: `packages/qfai/tests/assets/actionPinBumpOwner.test.ts`
- `Selector`: `TC-0017-0069 (TDD-0069): one tuning change per pull request, behind three green runs`
- Obligation: `TC-0017-0069`, via `EX-0017-0053`

**Branch 1 (observed RED) is unavailable, and not for want of trying.** `EX-0017-0053` requires three
consecutive green aggregate-verdict runs *with their run identifiers quoted*. A test asserting that
would fail today — but the failure would be "no such runs exist", and it could not be made green on
this branch at all, because the workflow changes are unmerged. Writing it would put a permanently red
test in the suite, which is not a RED observation; it is a broken build.

**Branch 2 (falsifiability) is unavailable**: the procedure requires an obligation already satisfied
by state that exists. Nothing satisfies this one — there is no run history to mutate.

**Branch 3 it is**, recorded in `DR-0017-0010`. The row identity and obligation reference were
recorded **before** any gate routed — in `58c29d9f`, HEAD's parent at the time — as the branch-3
evidence shape requires.

The row stays `todo` in the ledger until `/qfai-implement` writes `todo -> exception`, which it may do
**only** with the `qa-gatekeeper` PASS that P1d takes on the `DR-*`
(`qfai-implement/SKILL.md`: an entry malformed in any other way "leaves the row at `todo` and stops
with a handoff note"). The first version of this section claimed the entry alone meant the rows were
"no longer deadlocked"; round 2 corrected that on both reports — an entry naming a branch but carrying
no `DR-*` and no PASS is malformed, and step 3b treats malformed and absent identically. Nothing was
unblocked by writing it down.

### TDD-0070

- `Layer`: `Integration`
- `Test file`: `packages/qfai/tests/assets/actionPinBumpOwner.test.ts`
- `Selector`: `TC-0017-0070 (TDD-0070): a rerun-to-green rate above one in twenty reopens it`
- Obligation: `TC-0017-0070`, via `EX-0017-0054`

Same three branches, same outcome, and this one is stronger: `EX-0017-0054` measures a rerun-to-green
rate over **default-branch** verdict runs after a tuning change has merged — at minimum twenty runs
after a merge that has not happened. **The row is not satisfiable on the branch that introduces the
tuning, by construction.** No amount of work on this branch changes that; it needs post-merge
history.

Branch 3, `DR-*` pending, parked. Recorded here so the next agent reads a determination rather than
an absence.

### What branch 3 does not do

`references/red-provenance.md` is explicit that branch 3 does not close a spec: an `exception` needs a
user-approved `TDDLIST-001` waiver, or the row is parked and the spec stays open. **The spec stays
open.** These two rows, the six `blocked` ones and `US-0017-0007` are why the completion status below
is `FAIL`, and none of them is closeable by this stage.

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0017.md` (committed). Totals by `Status`:
**✅ 3 / ⚠️ 1 / ❌ 5**, derived from the table by
`packages/qfai/tests/assets/coverageDepthMatrix.test.ts` so the two cannot part again.

Three numbers, in order, because the sequence matters: the file declared `✅ 3 / ⚠️ 2 / ❌ 4`, which
the table never held; round 1's `qa-gatekeeper` cross-tabulated it to `✅ 2 / ⚠️ 2 / ❌ 5`; and two
cells then moved on merit while the findings were applied — `US-0017-0003` rose to `✅` because the
assertion it was missing turned out to be available and was written, and `US-0017-0004`'s
`Oracle strength` fell to `⚠️` because an oracle for an assertion is not an oracle for a story when
the collection it filters is empty by construction. The `❌` count is unchanged at 5 rows and 38
depth cells.

## Work Orders Summary

**Not delegated, and that is a deviation from this skill's Stage Minimum Roles.** The first version
of this record named `test-design-analyst`, `acceptance-test-engineer` and `devops-ci-engineer`.
Round 1's `completion-reviewer` checked that against
`.qfai/assistant/manifest/agent-routing.yml:139-206` and the disclosure was itself incomplete — the
whole value of a volunteered deviation being its completeness. The mandatory set, per phase, is:

| phase            | mandatory                                       | conditional                              | blocking                            |
| ---------------- | ----------------------------------------------- | ---------------------------------------- | ----------------------------------- |
| `coverage`       | `test-design-analyst`, `qa-strategist`          | —                                        | `test-design-analyst`               |
| `red`            | `delivery-planner`, `acceptance-test-engineer`  | `qa-gatekeeper`                           | `delivery-planner`, `qa-gatekeeper` |
| `implementation` | `acceptance-test-engineer`                      | —                                        | —                                   |
| `evidence`       | —                                               | `devops-ci-engineer`, `qa-gatekeeper`     | `qa-gatekeeper`                     |
| `review`         | `completion-reviewer`, `qa-gatekeeper`          | `implementation-reviewer`                 | both                                |

So the omissions were `qa-strategist` and `delivery-planner`, both mandatory and one of them
blocking, and `devops-ci-engineer` was promoted to mandatory when the manifest has it **conditional**.
None of the delegated roles was used: the authoring stage ran inline. (The first version called
them "the four P2-P4 roles", which mislabels the phases — `coverage` precedes P2 and `red` spans
P1b-P1d in this skill's own numbering.)

Recorded rather than glossed because it changes what the evidence is worth: the E2E file, the matrix
and this record were all authored by the party that also judged them. **The reviewer gate has since
been run** — round 1, two independent blocking reviewers, both `REVISE`, findings applied above — but
the P2-P4 work orders did not happen and cannot be reconstructed retroactively. That half of the
deviation stands.

## Execution logs

### Oracle rounds against the shipped tree

Each planted alone and reverted with a byte comparison:

| id           | mutation                                             | expected | result              |
| ------------ | ---------------------------------------------------- | -------- | ------------------- |
| `E1`         | a shipped action reference floats off its SHA        | RED      | **REDDENS**         |
| `E2`         | the mapping document loses its loader disclaimer     | RED      | **REDDENS**         |
| `E3`         | the verdict stops iterating the serialized needs map | RED      | **REDDENS**         |
| `E4`         | a lane gains its own bundler build                   | RED      | **REDDENS**         |
| `E5-control` | a comment added to the orchestrator                  | green    | **reddens nothing** |

`E5` is what makes the other four mean anything. Every source file restored byte-identical. `E4` was
superseded by `E4b` below after round 1 found its predicate far narrower than the property it
claimed.

### E6-E8 — the US-0017-0003 assertion round 1 showed was available

Three mutations in `qfai-validate.yml`'s Node-version resolver, planted alone and reverted with a byte
comparison. **Both listings are recorded, because the first one is the finding:**

```text
first repair, asserted over the step's TEXT
  E6  the resolver stops probing adopter version files          *** reddens NOTHING ***
  E7  the resolver stops publishing what it found               *** reddens NOTHING ***
  E8  setup-node takes a literal instead of the resolved output REDDENS
  (control) a comment added by the resolver                     reddens nothing, correct

rewritten to RUN the step under bash
  E6  the resolver stops probing adopter version files          REDDENS
  E7  the resolver stops publishing what it found               REDDENS
  E8  setup-node takes a literal instead of the resolved output REDDENS
  (control) a comment added by the resolver                     reddens nothing, correct
```

`.nvmrc` also occurs in the step's warning message and `version=` also occurs in its fallback
publish, so breaking the real mechanism left both text patterns matching other text in the same body.
That is the **fourth** vacuous claim on this spec, all four asserting over how code is *written*, and
this one was written while applying a review finding about exactly that class of error.

The rewrite follows the pattern `tests/integration/shippedWorkflow*.test.ts` established: locate the
resolver through the chain (`setup-node`'s `node-version` names a step output, which names the step),
extract that step's `run` body, execute it under bash with a stubbed `GITHUB_OUTPUT` — once in a
directory holding `.nvmrc` with `23.4.1`, once in an empty one — and read what it published. A
behaviour cannot be satisfied by a mention.

### E4b — round 2, after the predicate was found too narrow

Ten build forms, each planted alone into the shipped orchestrator's `integration` lane:

```text
pnpm build                                   REDDENS
pnpm -C packages/qfai build                  REDDENS
yarn build                                   REDDENS
pnpm run build                               REDDENS      <- reddened nothing before
npm run build                                REDDENS      <- reddened nothing before
yarn run build                               REDDENS      <- reddened nothing before
pnpm exec tsup                               REDDENS      <- reddened nothing before
npx tsup                                     REDDENS      <- reddened nothing before
pnpm -w --filter ./packages/qfai run build   REDDENS
tsc -p tsconfig.build.json                   REDDENS
(control) a comment naming build             reddens nothing, correct
```

10 of 10 — **on a form set this stage chose**, which round 2 pointed out is not the same as
establishing the property. Two findings against the widened predicate, and both were right:

- it was **not** "anchored on the verb" as the code comment and this record both claimed. It was a
  closed five-member package-manager list, so `make build`, `turbo run build`, `nx build qfai`,
  `cargo build`, `go build`, `bazel build`, `gradle build`, `dotnet build` and `./scripts/build.sh`
  were all invisible — 13 of 15 strings containing the literal verb `build` were not seen;
- nobody had measured the **false-positive** side, and it overshot: `npx tsc --noEmit` is a type
  check and was reported as a build (this repository's own `check-types` is `tsc -b`), and
  `--cache-location .cache/build`, `reports/build.xml`, `--output=build-artifacts` and `./build` all
  matched. So the day the shipped orchestrator wires a typecheck lane, `US-0017-0004` would fail
  saying that lane "runs its own build" — the test-that-punishes-its-own-fix shape again.

`v3` anchors on `build` as a standalone shell **word**, adds a build-script-path arm, drops bare
`tsc`, and strips trailing comments as well as whole-line ones. Measured in **both** directions this
time: **21 forms caught, 14 non-builds rejected, 0 misclassified.** `mvn package` remains invisible
and is named as a known limit rather than counted as a pass.

### M1-M7 — falsifying the matrix pinning test

The matrix test is a test over a governance record, which is exactly the shape that goes vacuous
without being noticed. Each mutation planted alone, reverted with a byte comparison:

```text
M1  the declared Status total drifts back to the wrong one   REDDENS
M2  a table row's Status is edited without its total         REDDENS
M3  the depth-cell count is overstated                       REDDENS
M4  a reason class is resized, breaking the partition        REDDENS
M5  a justification heading for a ❌ row is deleted           REDDENS
M6  the withdrawn story is scored as partly covered          REDDENS
M7  the withdrawn claim is re-added to the ledger            REDDENS
(control) a sentence added to the prose                      reddens nothing, correct
```

`M4` is the round that earned its keep: the first partition read `30 + 12 + 1 = 43` against 38 cells,
double-counting `State transitions` across two classes. The test caught it before this record did.

## Gaps / Open risks

1. **Five of nine stories are unsatisfied in the shipped tree, and the five shipped layer lanes are
   `echo` placeholders.** Detailed per cell in the matrix. This is the stage's main finding: the "and
   ship it to adopters" half of `spec-0017` is **less than half done**, and none of it was visible
   until `qfai init` was run and the step bodies — not the job names — were read.
2. **`US-0017-0007` is uncovered by choice.** The knobs do not ship, so no honest assertion exists.
   It becomes coverable when they do.
3. **`QFAI-ATDD-112` still reports 8 spec-0017 TCs** — the 6 `blocked` and 2 `todo` rows. Correct,
   and it clears when those rows are implemented. Four of the six are `blocked` on
   `CR-20260820-0007`; the two `todo` rows are parked on branch 3 above.
4. **The gate still exits 1 for other specs.** `--spec 0017` scopes the spec-owned rules, and
   `spec-0003` (8 US), `spec-0006` (1), `spec-0008` (1) and `spec-0015` (**1**) keep `QFAI-ATDD-111`
   at 11 items repo-wide, plus `US-0017-0007` makes 12. The first version wrote `spec-0015 (2)`,
   which round 2 caught and which was self-detectable: `8 + 1 + 1 + 2 = 12`, not the 11 stated in the
   same sentence. It was inherited from round 1's report without re-derivation — the same failure as
   the "all 71 rows" sentence, one layer down. Recorded as a cross-spec obligation per this
   skill's CRITICAL CONSTRAINTS: not this stage's work, closing it is each owning spec's next
   `/qfai-atdd` run, and the repo-wide run belongs to `/qfai-verify`.
5. **127 of 208 E2E ledger claims are backed by no test.** `CR-20260820-0011`. A cross-spec
   obligation across 16 specs; the guard that measures it now ships, and the number is held by a
   **ratchet** — `toBeLessThanOrEqual(127)` — which reddens on a new unbacked claim and stays green
   all the way down to zero.

   The first version asserted `unbacked.length > 100` and called it "pinned so the number cannot
   drift silently in either direction". Round 2 broke that from both sides: appending 60 more unbacked
   claims (127 -> 187) reddened **nothing**, while backfilling 27 of the 127 with real annotations —
   exactly what `CR-20260820-0011` Option 1 prescribes — made it **fail**. Blind to unlimited
   regression, firing on the 27th story fixed: a test that punishes its own fix, which is the shape
   this spec rejects in writing in two separate files. Both reviewers found it independently. The
   ratchet was then falsified in the same three directions: `W1` and `W3` redden, `W2` stays green.
6. **The E2E surface cannot exercise a real workflow run.** It reads what `init` ships. Whether a
   documentation-only change actually produces a narrow lane set is now observable — PR #794's runs
   show it — and nothing consumes that observation. That is class B of the matrix's `❌` cells, all
   seven of them, and no ledger row proposes a surface that would consume it.
7. **The vacuity pattern recurred inside the repair of a finding about vacuity.** `E6`/`E7`'s first
   form reddened nothing, and it was written minutes after applying `E4`'s widening. Four
   occurrences on this spec now, all four asserting over source text rather than behaviour. The
   working countermeasure is not vigilance: it is that every new claim gets an oracle round before it
   is reported, and that a claim over a file's contents is rewritten to run the thing whenever
   running it is possible — as `tests/integration/shippedWorkflow*.test.ts` already does.
8. **`TDD-0069` and `TDD-0070` need a `DR-*` this stage may not author.** Same authorship gap as
   `CR-20260820-0007`. Until it is resolved the two rows are parked, not blocked, and the
   distinction is recorded in the ledger's own `Evidence` cell as well as here. (The ledger's columns
   are `TDD-ID` / `TC-Refs` / `Layer` / `Test file` / `Selector` / `Status` / `DR-ID` / `Blocked-By` /
   `Evidence`; the first version of this line said `Notes`, a column that does not exist.)

## Final status (PASS/FAIL) + who confirmed

**FAIL — incomplete by this skill's own Definition of Done.**

What was achieved: eight of `spec-0017`'s nine `US-*` are covered from `tests/e2e/**` with real
assertions — one of them rewritten to execute the shipped step rather than read it — across five
oracle rounds, a ten-form round 2, a three-round behavioural round, and a seven-round falsification of
the matrix pinning test; the shipped-tree gap is measured at step-body level; the ordering claim this
stage had asserted is now enforced by a script that exists and is tested; and a repo-wide defect
affecting 16 other specs was found and filed.

What is not satisfied:

- **`US-0017-0007` is uncovered**, so `QFAI-ATDD-111` reports it and the scoped gate is `error=2`;
- the stage's own gate `validate --profile atdd --fail-on error --spec 0017` exits 1;
- `TDD-0069` / `TDD-0070` are parked on branch 3 with the `DR-*` pending, and branch 3 does not close
  a spec;
- Stage Minimum Roles were not used for P2-P4 — the reviewer gate ran, the work orders did not.

Confirmed by: round 1's two independent blocking reviewers, both **REVISE**, on `8fb48002`:

- `completion-reviewer` — `.qfai/review/review-20260820200000000/R02_completion-reviewer.md`
- `qa-gatekeeper` — `.qfai/review/review-20260820200000000/R03_qa-gatekeeper.md`

## Round 2, and the P7 evidence for it

Three blocking reviewers on `56daee8d`, with the request **committed before they launched** — round 1's
`qa-gatekeeper` had detected five files moving while three reviewers ran, which was this orchestrator's
fault and is fixed structurally rather than by intention. All three confirmed HEAD did not move and
`git status --porcelain` was empty at their start.

| reviewer                   | verdict  | findings                        | report                             |
| -------------------------- | -------- | ------------------------------- | ---------------------------------- |
| `implementation-reviewer`  | REVISE   | 4 blocking, 6 medium, 5 low     | `R01_implementation-reviewer.md`   |
| `completion-reviewer`      | REVISE   | 4 blocking, 4 major, 5 minor    | `R02_completion-reviewer.md`       |
| `qa-gatekeeper`            | REVISE   | 3 blocking, 6 advisory          | `R03_qa-gatekeeper.md`             |

**What they could not break, having tried:** the `US-0017-0003` behavioural assertion (`qa-gatekeeper`
added two rounds this stage had not measured, and reports the failure messages name the row's own
selector and predicate); the Coverage Depth Matrix pinning test's arithmetic; the **127**, reproduced
by an independent implementation with a more permissive regex over every tracked file, per-spec table
matching line for line; the scoped gate at `error=2` with the right content, its
`validate.spec-0017.json` byte-identical in a shadow root; the `US-0017-0007` withdrawal; and the
Delta Rejected Guard.

**One thing they vindicated rather than merely accepted.** `qa-gatekeeper` reports that the tracked
`.qfai/report/validate.log` was rewritten *during its review* by another process — unscoped,
`warnings: 376`, five specs — provably not its own, since both of its runs wrote into its shadow root.
That is the exact hazard this record cites when it declines to use `validate.log` as Hard Gate
evidence. Had the citation been `validate.log`, this section would now be quoting another stage's
numbers.

### P7 quality gates, round 2

```text
pnpm ci:lint                                    exit 0, all eleven members
pnpm -C packages/qfai test:e2e                  1418 passed / 16 skipped, exit 0
vitest --project integration --project assets --project unit
                                                1171 passed / 19 skipped, exit 0
node scripts/check-atdd-annotation-ledger.mjs --spec 0017
                                                8 claim(s) backed, exit 0
node ... validate --profile atdd --spec 0017     info=2 warning=0 error=2
  artifact  .qfai/report/validate.spec-0017.json
```

Round 3 is owed on these repairs. This stage does not claim its own repairs reviewed.

`Review pack:` `.qfai/review/review-20260820200000000/`
`Review pack seal:` `5c8cd42571c8baf5f2240515ee2fbd173892cecd09d53ace080900d5c74317e3`

The seal is a sha256 over the manifest of `git hash-object` values for every file in the pack, taken
in `LC_ALL=C` path order, after the last round 1 reviewer response landed and before this verdict was
written.

It was sealed twice, and only the second value is the recorded one. The first seal
(`d8ac0a77…58967c9`) covered three files; the pack was missing the `summary.json` that
`references/review-artifact-layout.md` requires — with `revision_form: "content-hash"` and
`revision`, both mandatory — so the pack was incomplete and completing it necessarily moved the hash.
Written, then re-sealed over four files.

**The reasoning alone would launder an illegitimate re-seal, so the reasoning is not what discharges
it.** "The pack gained a required artifact" is equally compatible with the reports having changed too.
What discharges it is a recomputation both round-2 reviewers performed independently: the **first**
seal, `d8ac0a777dd38514574c63813e51b2e3d0140319d0c171c4190a0a94358967c9`, still reproduces over the
three reports **as they stand now** — which proves those three files were untouched between the seals
and that the re-seal added only `summary.json`. Recording the superseded value is what makes that check
possible; had only `5c8cd425…` been recorded, the claim would have been unfalsifiable. Recomputing it at completion compares against **this recorded value**, not against a value
re-read from the working tree — `../qfai-implement/references/evidence-revision.md` states why: an
expected value read from the tree could be rewritten in the same pass that edited the pack, and every
recomputation would still agree.

Serialization, stated because it is load-bearing: each line is `<git hash-object> <space> <path>`
with a single space and an `LF` terminator, paths relative to the pack root in `LC_ALL=C` order, and
the sha256 is taken over that byte stream. The first version printed the manifest with **two** spaces
while the recorded seal was computed with one — anyone recomputing from the printed block would have
got `fa8d6e836cabd14a6cdbc12dd8b9dd538bbe971a40cd4bf27b252160d17e2526` and read a legitimate pack as
tampered. Round 2 found it. The block below is the hashed form, byte for byte:

```text
a65a209bbfd37911c5b4ef2424adf605057d9029 R02_completion-reviewer.md
110eb05456bf0d1f1570e7c4518a1001ac9a2bd4 R03_qa-gatekeeper.md
ba2f2c08e56c777846ca904c072db8e2a4922dec review_request.md
39c7e5072cfa7b0d0409c454548ce6948f9fe94c summary.json
```
