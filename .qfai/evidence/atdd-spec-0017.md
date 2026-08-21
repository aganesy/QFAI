# ATDD Evidence: spec-0017

## Objective

Cover `spec-0017`'s nine `US-0017-*` from `<testsDir>/e2e/**`, which is where `QFAI-ATDD-111` answers
`US-*` obligations. Before this stage the spec had **zero** E2E coverage and the gate reported all
nine — one of the two `error=2` findings that had stood through six review rounds of
`/qfai-implement`, and, as PR #794 showed, one of the reasons the required status context cannot go
green.

**All nine are covered**, and the ninth took twelve rounds. `US-0017-0007`'s claim was withdrawn in
round 1 rather than propped up, because its only assertion was that a file exists; it is restored now,
carried by a test that observes the runner's pool rather than reading its configuration back. The
obstacle recorded for ten rounds — "no knob file ships" — was never the obstacle: the story's subject
is this repository's own suite, and every other e2e file here asserts over an adopter's tree.
See § "Round 1, and the five things it changed" and § "The gate moved".

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

`09_delta.md § Rejected` carries three candidates and `07_Decisions.md` carries six rejected
alternatives across three `DR`s — `:133`, `:137`, `:203`, `:206`, `:242`, `:249`. (The first version
said nine, which was the file's `DR` count transposed onto its rejected-alternative count; round 3
caught it.) **No rejected option is reintroduced by this stage**, and one of them is the reason for this
stage's largest correction:

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

**Re-run against every artifact added since**, because for five rounds this section reasoned only about
the round-1 and round-2 set and each round faulted it for that. The four record-deriving guards and the
classifier they share are checked one at a time against all nine rejected options:

| artifact                        | nearest rejected option                                  | verdict          |
| ------------------------------- | -------------------------------------------------------- | ---------------- |
| `tests/helpers/buildCommand.ts` | "a second parser over the same surface" (`:133`)          | not that surface |
| `tests/unit/buildCommand.test.ts` | "a row that cannot fail looks like coverage" (delta)    | measured, not assumed |
| `tests/assets/coverageDepthMatrix.test.ts` | same                                          | measured |
| `tests/assets/stageEvidenceCounts.test.ts` | same                                          | measured |
| `tests/assets/retractedClaims.test.ts` | same                                              | measured |
| `CR-20260820-0012` option 5     | options 1-4, rejected in that CR                          | none reintroduced |

The two that need their reasoning stated rather than asserted:

- **`buildCommand.ts` is not the rejected second parser.** That option rejected a second reader of a
  **spec artifact** — the surface `qfai validate` already parses. This reads GitHub workflow YAML and
  `package.json` `scripts`, which no validator parses and which no spec artifact contains. The same
  argument the script was cleared on, applied to a different file.
- **"a row that cannot fail looks like coverage" is the option these four guards are most at risk of
  reintroducing**, and this stage has reintroduced it three times: `retractedClaims.test.ts` went green
  for the wrong reason in two successive versions; the member-pinning test in `buildCommand.test.ts`
  generated its probes from the sets it pinned, so 0 of 17 mutations reddened it; and the story
  `US-0017-0004` rests on let **18 of 20** planted builds through. Each was caught by **mutating and
  re-running** rather than by reading.

  **Two properties, and they need different instruments — this bullet cited the wrong one for a round.**
  The mutation families under § "Execution logs" (`M*`/`X*`/`Y*`/`Q*` for the matrix, `C*` for the
  derived counts, `W*` for the retracted claims, and the in-suite sweep over every grammar member)
  establish that **deleting a rule reddens the corpus**. That is a property of the *guards*. It says
  nothing about whether the *story's* assertion can fail when a shipped lane contains a build, which is
  what this rejected option is actually about — and the previous version of this bullet discharged the
  option by citing the sweep, which is the naming-the-wrong-instrument defect two other findings in this
  same round are about.

  The instrument for the story-level property is planting a real build in the shipped lane and running
  the story's own loop. Round 8 did it (10 of 11 unnoticed), round 9 did it twice (18 of 20 and 34 of
  40), and round 10 did it twice more (18 of 20 and 44 of 50) — five plantings, in each of which the
  majority shipped unnoticed.

  **So the discharge is scoped, and the scope is the point.** Over the forms four reviewers planted —
  enumerated at § "Execution logs", not counted here, because round 11 found "ninety-one" matching
  nothing in the tree or in this record's own narrative — the option is not reintroduced: they are pinned
  in
  `tests/unit/buildCommand.test.ts` and refused by `tests/unit/shippedLaneCommands.test.ts`. Over a
  build the grammar does not declare, the predicate was vacuous, and it stayed vacuous through ten
  versions — round 10's verdict was that it did not need a weakness, only a tool nobody had named. The
  previous version of this bullet said "the option is not reintroduced *now*, in both senses" without
  that qualifier, which read as a general claim and was false as one.

  What answers the general claim is not a better spelling list. `shippedLaneCommands.ts` inverts the
  question — what may a lane INVOKE — so the assertion needs no corpus and fails closed, and the
  delta's Temptation ("a row that cannot fail looks like coverage") stops describing this row. The
  classifier keeps the own-tree job, where a miss is tolerable. Note also who measured: four of the five
  plantings were reviewers', not this stage's, and the story's discriminating power was only ever
  established from outside.
- **`CR-20260820-0012`'s own rejected options are not reintroduced.** Option 1 (narrow the signal to
  the affected lanes), option 2 (exempt a spec's in-flight TCs from the fatal gate), option 3 (waive
  the row) and option 4 (merge first, then satisfy it) all stay rejected: `TDD-0069` is `blocked` with
  a `Blocked-By`, no gate was narrowed, no waiver was requested, and nothing was merged. Option 2's
  second stated reason was withdrawn during that CR's own review and the option remains rejected on
  its first.

**No RE-OPEN is required.**

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
found both halves. The script now exists as `scripts/check-atdd-annotation-ledger.mjs` with 23 tests
in `packages/qfai/tests/integration/scripts/checkAtddAnnotationLedger.test.ts`, and it reports what
this stage claims: `9 claim(s) backed by a test annotation (spec-0017)`, exit 0.

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
`npx tsup` reddened nothing** — the idiomatic form was invisible. This paragraph then said the scan was
`"rebuilt around the verb"` and re-observed at `"10 of 10 forms redden"`. **Both are withdrawn.** What
replaced the regex was a wider but still closed package-manager list, so `make build`,
`turbo run build`, `cargo build` and six more remained invisible — § "Corrections" and
`coverage-depth-spec-0017.md` § "the oracle" record the same withdrawal — and the ten forms were the ten
just enumerated, a corpus this stage chose. The predicate that does generalise arrived seven versions
later (§ "Execution logs", `E4b`, and `tests/helpers/buildCommand.ts`).

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

- **new** `packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts` — 10 tests across 8
  annotated describes, one describe per covered user story, plus a block comment where
  `US-0017-0007`'s was, recording why the claim was withdrawn rather than leaving its absence to be
  inferred
- **appended, then partly reverted** `tests/e2e/qfai-traceability.md` — nine
  `QFAI:SPEC-0017:US-0017-NNNN` lines, of which `US-0017-0007`'s was removed in round 1
- **new** `.qfai/evidence/coverage-depth-spec-0017.md` — the Coverage Depth Matrix, committed
- **new** `scripts/check-atdd-annotation-ledger.mjs` — the guard this record had claimed existed
- **new** `packages/qfai/tests/integration/scripts/checkAtddAnnotationLedger.test.ts` — 23 tests
- **new** `packages/qfai/tests/helpers/shippedLaneCommands.ts` — the shipped-lane allowlist, and the
  answer to a question ten versions of the classifier could not settle. It asks what a lane **invokes**
  rather than whether a command **is a build**, which needs no corpus of build spellings and fails
  closed
- **new** `packages/qfai/tests/unit/shippedLaneCommands.test.ts` — 9 tests. The falsification: every
  form rounds 8, 9, 10 and 11 planted, all refused, and the shipped tree's own shapes accepted. Round 11
  added three, and what they cover is the class the first five could not: the corpus was 62 BARE commands,
  so wrapping any of them in one shell construct escaped 61 of 62. It is now checked wrapped as well as
  bare, by root cause as well as by spelling
- **new** `packages/qfai/tests/helpers/buildCommand.ts` — the build classifier, extracted from the
  E2E so its corpora can be tested on their own
- **new** `packages/qfai/tests/unit/buildCommand.test.ts` — 26 tests over the corpora enumerated
  at § "Execution logs" (`E4b`), none of them chosen. The count is **derived** —
  `tests/assets/stageEvidenceCounts.test.ts` counts the file's callsites and reddens when this number
  and the file disagree, which is how the 25th arrived: the number was 24 until family 4 was declared,
  and the guard failed the same commit — twice, since the 26th followed for the two call sites the member
sweep cannot reach. That guard exists because the previous version of this line said
  "No count of them is stated anywhere in this record" **while stating one two words earlier** — a
  sentence about how the record is written, contradicted by the record. Rounds 9 and 10 each found the
  number wrong in a different place — ten here, nine there, eleven items in the list, and the two
  evidence files enumerating different sets — and at the time nothing derived it, which is the property
  those two rounds established as the predictor
  by this stage. Round 8's two findings are the last four: one hardcoded case per grammar member, a check
  that the case list and the grammar name the same members, a sweep that deletes each member in turn and
  requires a case to notice, and the eleven real builds it planted in a shipped lane — ten of which the
  story did not see
- **new** `packages/qfai/tests/assets/coverageDepthMatrix.test.ts` — 5 tests deriving the Coverage
  Depth Matrix's totals, partition, class assignment, per-class justification and row width from the
  table itself
- **new** `packages/qfai/tests/assets/stageEvidenceCounts.test.ts` — 10 tests deriving this record's own
  counts from the artifacts they describe, after every review round found at least one that the tree
  did not hold. The eighth derives `## Final status`'s own round and response counts, which were correct
  and underived through five findings of exactly that shape
- **new** `packages/qfai/tests/assets/retractedClaims.test.ts` — 11 tests requiring a claim a review
  round refuted to appear only inside quotation marks, because "it is gone now" was itself the false
  statement round 5 found. The eleventh asserts the coordinate model the previous version's docstring
  only described, and it took two attempts: the first checked span arithmetic, and three mutations
  reintroducing the old model left it green — the drift is one or two characters, which is exactly why
  round 10 called the defect latent
- **new** `.qfai/decisions/DR-0017-0010-*.md` — the branch-3 anomaly record for `TDD-0070`
- **new** `.qfai/decisions/CR-20260820-0012-*.md` — the self-referential gate `TDD-0069` waits on
- **new** `.qfai/decisions/CR-20260820-0011-*.md` — the 127 unbacked ledger claims

`tdd/test-list.md` was not written. `/qfai-implement` owns its cells.

## Commands executed + key outputs

```text
pnpm -C packages/qfai exec vitest run --project e2e tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts
  -> Tests 10 passed (10), exit 0
pnpm -C packages/qfai exec vitest run --project unit tests/unit/shippedLaneCommands.test.ts
  -> Tests 9 passed (9), exit 0
     (9 before US-0017-0007 was withdrawn, 8 after, 9 again once US-0017-0003
      gained the positive-half assertion round 1 showed was available; briefly 11
      while the classifier corpus lived here, before round 4 moved it to
      tests/unit/buildCommand.test.ts where it belongs)

node scripts/check-atdd-annotation-ledger.mjs --spec 0017
  -> check-atdd-annotation-ledger: 9 claim(s) backed by a test annotation (spec-0017), exit 0

node scripts/check-atdd-annotation-ledger.mjs        (repo-wide)
  -> exit 1; 127 of 208 claims unbacked; see CR-20260820-0011

pnpm -C packages/qfai exec vitest run tests/integration/scripts/checkAtddAnnotationLedger.test.ts
  -> Tests 23 passed (23), exit 0
pnpm -C packages/qfai exec vitest run tests/assets/coverageDepthMatrix.test.ts
  -> Tests 5 passed (5), exit 0
pnpm -C packages/qfai exec vitest run tests/assets/stageEvidenceCounts.test.ts
  -> Tests 10 passed (10), exit 0
pnpm -C packages/qfai exec vitest run tests/assets/retractedClaims.test.ts
  -> Tests 11 passed (11), exit 0
pnpm -C packages/qfai exec vitest run --project unit tests/unit/buildCommand.test.ts
  -> Tests 26 passed (26), exit 0

node packages/qfai/dist/cli/index.mjs validate --profile atdd --fail-on error --spec 0017
  before this stage:  info=2 warning=0 error=2   QFAI-ATDD-111 (9 US), QFAI-ATDD-112 (8 TC)
  after round 1:      info=2 warning=0 error=2   QFAI-ATDD-111 (1 US: US-0017-0007), -112 (8 TC)
  artifact:           .qfai/report/validate.spec-0017.json      (tracked; re-run at round 9)
  per-run directory:  regenerated by the command above; not tracked, because its name is a
                      timestamp the next run will not reproduce
```

**`.qfai/report/specs-coverage/spec-0017.md` does not exist**, and round 9 named it as one of the
inputs it could not read. That directory holds `spec-0001.md` through `spec-0007.md` on disk, last
written 2026-08-20, and only `spec-0012.md` is tracked; spec-0017's is produced by a `--profile full`
run and was never committed. The citation is dropped rather than the file committed, for the same reason
as the run directory: it is regenerable output, and the reviewer obtained it by running the profile,
which is the reproducible path. Coverage there was clean when they did — every `AC` with 2-3 `TC`, every
`BR` with an `EX`, every `EX` with a `TC`, no `QFAI-COV-201/202/203`.

**`US-0017-0004` is asserted the other way round now, and that is the largest change this stage has
made.** For ten rounds the story rested on a predicate over build spellings. Round 10 measured the
ceiling of that approach: one reviewer planted 20 real builds into the shipped lane and 18 shipped
unnoticed; the other planted 50 and 44 did, with the verdict that settles it —

"I did not have to find a weakness in v12: I only named build tools it does not name, and gave the ones
it does name their real arguments."

Sixteen side-by-side pairs made the point at a finer grain: sixteen times the corpus held the grammar
member and missed the command, and in every pair the corpus's spelling was the one with no trailing
argument, no alias, no wrapper spelling and no Windows separator. **That is not a corpus chosen to break
the predicate; it is a corpus chosen to name the grammar.**

A denylist over spellings also fails in the wrong direction. Every spelling nobody thought of is a
pass, and for a claim whose whole content is "there is nothing here", a miss is the vacuity direction —
which § "Gaps / Open risks" item 7.7 had already written down about this very assertion.

So `tests/helpers/shippedLaneCommands.ts` answers a decidable question instead: **what does the lane
invoke?** The set the shipped tree invokes is **pinned in the test, not counted here** — three sites
carried three different numerals for it (ten, fifteen, and the two lists' own sizes), which is the
recurring class again. A program that cannot reach a build whatever its arguments
and are allowed by name; six could, and are allowed only as exact invocations, so `npx qfai` ships and
`npx tsup` does not though they are the same program. It needs no corpus, cannot be evaded by a spelling
nobody has written, and fails **closed** — an innocent new program breaks the test, which is the right
cost for a shipped surface. Measured: **55 of 55 planted builds refused, 6 of 6 shipped shapes
accepted**, where the classifier caught 6 of 50.

Those two numerals were 55 and 6 for a round, against a corpus of 62 and 8 — and both were written as
measurements. **No numeral for either list is stated here now**: both grow every round, for the same
reason the classifier's corpora do, and `tests/unit/shippedLaneCommands.test.ts` holds the lists and
asserts the property. Round 11 confirmed nothing derived the pair by rewriting it to "3 of 3 … 1 of 1"
and finding the whole suite green.

It also closes the channel round 10 found invisible to **both** instruments: a build arriving as
`uses: gradle/actions/setup-gradle` with `arguments: build`, which no `run:` scan can see. The actions a
shipped lane may use and the input keys they may be given are enumerated, so `arguments` and `args` are
refused by not appearing.

**Both `US-0017-0004` assertions now read every shipped workflow, not the orchestrator alone.** Round 10
planted a real build in `qfai-validate.yml` and measured this row missing it — caught only by the
own-tree scan in `tests/unit/buildCommand.test.ts`, a test annotated for something else. The gap was
covered and the annotation's scope was narrower than the story it carries, which a reader could not have
known. `shippedJobs()` derives the set from the shipped workflow directory rather than listing it, so a
third workflow is in scope the moment it ships. Falsified: a plain `pnpm build` and an `npx tsup` planted
in the second workflow each redden the row.

**Round 10's seven advisories are applied, and four of them were the same defect in different
files — a number derived once and then described as derived.**

- **A1.** The retracted-claims guard's own docstring said "two entries left this list in round 8" and
  named a reason; all three current entries measure at zero occurrences, so the note described a state
  two rounds gone. A stale prose claim inside the instrument built to stop stale prose claims, and
  structurally invisible to it, because `GOVERNANCE` holds records and not the guards that read them.
  The comment now states the membership RULE — "absent from every governance file", which the assertion
  re-measures on every run — instead of the history, so there is nothing left to go stale.
- **A2.** Three figures were derived in `coverage-depth-spec-0017.md` and retyped here, where nothing
  read them: the `Status` totals, the `❌` partition ("5 rows and 38 depth cells") and the sentence
  naming the predicate's version. All three measured correct and all three were free to drift; the
  version pair agreed at v12 by luck. `coverageDepthMatrix.test.ts` now seeks each statement in **both**
  records and requires every occurrence to equal the measured value. Falsified five ways: each figure
  drifting, the version going stale, and the version sentence being deleted — all five redden.
- **A3.** `## Final status` certifies with "**ten** rounds, **29** reviewer responses, **28 REVISE and
  one PASS**". Correct when checked, derived by nothing, and with a correctness lifetime of exactly one
  round — rounds 4, 5, 6, 7 and 10 each found this sentence a round behind, five findings of one shape.
  Two of the three are now derived from the packs on disk. The verdict split is not derivable (two of
  twenty-nine reports state a verdict in a parseable form), so what is pinned is the arithmetic: the
  split must SUM to the derived response count, which is exactly how all five findings failed. Falsified
  six ways, all reddening, including the sentence being unbolded or deleted.
- **A4.** The scope fix above.
- **A5.** Recorded as accepted, not fixed. `VERSION` is exported and pinned against the record, which
  closed round 7's literal-pin defect and round 9's discussed-a-future-version defect — and it is a
  narrowing rather than a derivation: nothing in the grammar contributes to the constant, so a grammar
  change with a forgotten bump leaves both sides agreeing on the old number. The honest statement is
  that the version moved from two hand-maintained places to one.
- **A6.** Out of this stage's reach and carried by prose, as disclosed: `tdd/test-list.md`'s `Evidence`
  text is `/qfai-implement`'s cell to write.
- **A7.** `CLAIMS`, `OWED` and `COUNTED` in `stageEvidenceCounts.test.ts` were three literals naming the
  same six files with nothing tying them together, so a file could have its count checked while its
  `.each` / `.for` precondition went unchecked — and that precondition is the only reason counting
  callsites is valid. One `TRACKED` list now feeds all three, with an assertion that the claimed set and
  the tracked set are equal.

**The gate moved for the first time in eleven rounds: `error=2` to `error=1`.** Eleven rounds reviewed
the instruments and none of them went back to the two open obligations, which is worth naming as its own
failure mode — a review loop can converge on the quality of what exists while what is missing stays
missing, because every round's agenda is the previous round's findings.

**`US-0017-0007` is covered, and the reason it was uncovered was a category error.** Its E2E annotation
was removed in round 1 because its only assertion — that `qfai.config.yaml` exists after init — was
vacuous and duplicated `initE2E.test.ts`. What nobody then asked is why an E2E test for this story was
looking at an adopter's tree at all. The story reads "as a maintainer tuning a 415-file suite", and its
three slice surfaces are this repository's own vitest projects, CI matrix and scripts. Every other
`tests/e2e/**` file here runs `qfai init` into a temporary directory, so the habit of the suite pointed at
a tree the story is not about, and "no knob file ships" was recorded as the obstacle. It was never the
obstacle.

The new test, `tests/e2e/spec0017RunnerParallelismE2E.test.ts`, also answers a defect the eight existing
tests share: every one of them asserts that a knob is **declared** at the site the runner reads it, and
`vitest.knobs.ts` contains the proof that a declaration can be declared and do nothing — its own docstring
records a project-level worker declaration that "type-checked, it ran, it emitted no warning — and it did
nothing", at a 0.93 wall-clock ratio. So the story had eight tests and no assertion that the axis has an
effect. This one observes the pool: four fixture files record their live intervals, run twice through the
real `rootKnobs`, and the peak number of simultaneously live files is 1 at one worker and greater than 1
at four. No wall-clock ratio and no threshold, because a threshold needs a machine and this suite runs on
`ubuntu-latest` too.

Falsified four ways, all reddening: declaring the axis at a scope the runner ignores, replacing the
override with a fixed literal, switching off file parallelism, and renaming the override variable. **The
fourth found a self-referential oracle in the first version of the test** — it read `WORKERS_ENV` from the
module it was testing, so a rename carried the test along with it and every assertion stayed green. The
name is a contract with the caller, so it is now pinned as a literal, which is the one value in that file
that must not be derived from its subject.

**`TC-0017-0030` is covered**, in `tests/integration/spec0017OwnWorkflowScope.test.ts`. `QFAI-ATDD-112`
reports **seven** rather than eight, and every one of the seven is a parked row: `TC-0017-0016` on
`CR-20260818-0007`, `TC-0017-0032`..`TC-0017-0035` on `CR-20260820-0007` — whose acceptance criteria need
numbers written into `07_Decisions.md` that `/qfai-implement` may not patch — and `TC-0017-0069` /
`TC-0017-0070` on `CR-20260820-0012` and `DR-0017-0010`. For the first time the uncovered set and the
recorded-blocked set are the same set.

### A test that timed out, fixed structurally rather than by raising its budget

`TC-0003-0039` timed out at 18.7s against a 15s limit while four projects ran together, and it belongs to
`spec-0003` rather than to this spec — found because this stage's own runs surfaced it. It is recorded here
because the diagnosis is the standing instruction applied to a concrete case: **the parallelism was not the
cause, and raising the timeout would have moved the number instead of the cost.**

Measured in isolation, with the machine otherwise idle, the file spent **14.36s** in tests and this one
test spent 15.3s of a 15s budget. A test that costs its entire budget unloaded exceeds it under any load
at all, so the timeout was a structural mismatch that ten workers merely revealed.

Two structural facts caused it, and both are fixed:

- **`spawnSync` blocks the worker.** A fork waiting on `git` cannot yield its slot, so nine sequential
  spawns cost the sum of nine spawns and the pool gains nothing from having other work available. The two
  spawn sites are promisified `execFile` now.
- **Three independent fixtures were serialised for no reason.** A shallow clone, an orphan repo and an
  unrecognised-path repo share no state — each has its own temporary directory — so they are built
  concurrently, which is what makes the async conversion pay.

Measured after: **9.39s**, down from 14.36s, with all ten tests passing.

The conversion also demonstrated why a behaviour-preserving refactor is a claim rather than a fact. Making
`git()` async left **six call sites without `await`**, `tsc -b` accepted every one of them, and the
failure surfaced as a *different* test asserting the absence of a warning it now received. The type checker
could not see it and the lint rule for floating promises did not fire on the shape used; what caught it was
the suite.

### `TC-0017-0016`: a coverage claim made and withdrawn in the same session

This is recorded at length because the mistake is more useful than the fix, and because it is the
gate-laundering shape this record has been circling for eleven rounds — committed, this time, by the stage
rather than found in it.

I measured the permission departures against the case's "exactly two", found three, **reported the
disagreement as a new cross-artifact obligation**, wrote a test asserting the measured set, registered the
annotation, and watched `QFAI-ATDD-112` stop reporting the row. The gate went from `error=2` to `error=1`
and I recorded that as progress.

Then I read `.qfai/decisions/`. `CR-20260818-0007` was raised on 2026-08-18 by `/qfai-implement`,
`Class: intent`, `Status: open`, `Blocked set: spec-0017 TDD-0016 (TC-0017-0016)`, and it carries the same
three-row table I had just re-derived — together with the reason it was raised instead of written:

> `TC-0017-0016` is a `boundary` row, and `06_Test-Cases.md` says a boundary row exists to "fix where the
> rule stops". This one is ambiguous at precisely that point, so writing it now would encode my reading of
> an undefined term as a hard assertion.

Three things were wrong with what I did, in increasing order of seriousness:

1. **I re-derived a filed measurement and reported it as new.** The CR's table and mine are the same table.
2. **I read the row's absence as an oversight.** It was a signal. Eleven rounds of "nobody went back to the
   uncovered set" was the wrong lesson to draw from a row that had a documented reason to be uncovered.
3. **I discharged a gate finding by adopting a recommendation.** The CR recommends Option A — the
   minimal-scope default is the literal `contents: read`, three exceptions enumerated, the oracle a set
   equality against them — which is exactly what my test asserts. But `Approved by:` and
   `Approved option:` are both `-`. **A recommendation is not an approval, and the finding was the only
   remaining signal that the choice is the user's.** Removing it would have left an intent question
   resolved by a stage with no authority to resolve it, in a way no later reader would notice, because the
   gate would be quiet.

The claim is withdrawn: the annotation and the ledger registration are gone, and `QFAI-ATDD-112` reports
the row again. **The test stays**, unannotated, because it protects what all three options share — the set
of departures is closed and every member deliberate — and it is written against Option A's oracle, so
approving A turns it into coverage by restoring one line. Approving B or C means rewriting the expected
set, and the comment on the `describe` says which.

The general rule, which is now the first thing to do when a `TC` looks uncoverable or merely uncovered:
**grep `.qfai/decisions/` for a CR naming it in its `Blocked set` before writing anything.** An uncovered
row with an open intent CR behind it is doing its job.

### The disagreement itself, which stands whatever is approved

The case reads "the set of non-minimal permission blocks is exactly the verdict's empty map and the
publishing job's token write" — two. Measured, three job-level blocks depart from the workflow-level
`contents: read`:

```text
ci.yml       ci-pass          {}                                   named by the case
release.yml  github-release   {"contents":"write"}                 NOT named by the case
release.yml  publish          {"contents":"read","id-token":"write"} named by the case
```

`github-release` needs `contents: write` to create a release, so the third departure is necessary rather
than an over-grant. Two readings are available — the case is stale, or "non-minimal" means "broader than
the job needs" and `contents: write` is minimal for that job — and the case's text does not distinguish
them. **The test asserts the measured set of three and does not pretend the count is two.** Bending an
assertion to fit a sentence the tree contradicts is how `US-0017-0004` spent ten rounds asserting
something it could not check. Correcting `06_Test-Cases.md` belongs to whoever owns it; the property the
case exists to protect — that the set of departures is closed and every member deliberate — holds under
either reading and is what the test pins.

**Round 11 broke the instrument this stage had put the story on, and that is the round's other result.**

Three reviewers planted independently and the numbers agreed: fifteen of eighteen probes, and six planted
into the shipped orchestrator with all ten annotated rows green and 123 tests across every other
workflow-reading file also green. The direction is what matters. This was not a build spelling nobody
enumerated — probe 01 is `pnpm build`, the first entry the corpus refuses, and **one `if` around it was
enough**. Wrapping the corpus's own 62 entries in any one of seven ordinary shell constructs took it from
0 missed to 61 missed.

The corpus could not have found this, and the reason is the sharpest thing in eleven rounds. All 62
entries were bare commands, so "0 escaped" carried no information about wrapping — and the accept
direction was worse than uninformative: its must-accept case produced no refusals **because of** the
hole, since `[` and `then` were keyword heads whose tails were discarded. The test certifying the
instrument was derived from the instrument's blind spot, so any honest repair had to redden it.

Five parser holes were measured, each with a separate cause. **Fixing five would have left the sixth**,
and the structural defect was one level up: `invocationOf` returned `undefined` for both "this construct
invokes nothing" and "I cannot tell what this invokes", and `refusals()` read the second as consent. That
is now split — `NOTHING` is provable, `UNREADABLE` is a refusal — so a construct nobody has thought of
costs a spurious refusal in review rather than a shipped build. The five named fixes only reduce false
refusals now.

**What this establishes about the round-10 repair is worth stating plainly: inverting the QUESTION is not
inverting the ANSWER.** The allowlist asked the decidable question and still conceded whatever its parser
could not read. Inversion helps only when the failure of the scan is itself a refusal.

### Round 11 items accepted rather than fixed

- **`R01 m7`** — one non-reproducible observation, and it is recorded because the alternative explanation
  would be a real defect. In one harness run the two `US-0017-0004` assertions failed against a
  build-free planted workflow; three identical re-runs and a targeted run did not reproduce it. The
  reviewer's own reading is that its harness sequencing carried a previous step's workflow forward. The
  alternative is order-dependence in the memoized `project()` fixture, shared across the file's ten tests.
  **Not reproduced here either**, and left open rather than dismissed: a `US-0017-0004` verdict that
  depends on which other tests ran would be a finding, and this note is the only trace of it.
- **`R02 m3`** — the two records give different first-version sizes for the same partition. Raised at low
  confidence, on the ground that the two sentences may describe different moments, and it could not be
  distinguished from history. Left as written rather than harmonised on a guess, which would replace a
  possible inconsistency with a certain fabrication.
- **`R03 A4`** — one coordinate-model mutation stays green: appending a separator after a line that
  flattened to nothing. That is a **uniform translation** of the coordinate system, not a displacement —
  the separator is written after the line's span is recorded and before the next line's start is read, so
  text and offsets move together. Argued structurally rather than from the suite's silence, which is the
  inference round 10 refuted.
- **`R03 A5`** — an orchestration defect on this stage's side, not the subject's. Two reviewers were told
  to plant into the same shipped asset tree concurrently, and the gatekeeper caught a `qfai-extra.yml` it
  had not created. Committing the request before launch — round 1's fix — does nothing about reviewers
  mutating the subject *concurrently*, which their read-only rule explicitly permits. The consequence is
  worse than noise: a reviewer whose plant collides can attribute a catch to the wrong instrument. Future
  rounds isolate each plant-based role, or run them serially.

**Round 11's `M5` is applied, and it is the one refactor in this spec with a measured consequence.**
`command()` was 211 lines, and the reviewer's argument for splitting it was not tidiness: `bareIsBuild` is
decided at the end of that function while hugo's grammar is declared 650 lines earlier, so a comment
claiming the first "decides before any flag can matter" could be written, reviewed and believed by readers
who could not see both ends. `resolveHead`, `openingVerdict` and `readFlag` are extracted, and `command()`
is 127 lines. `readFlag`'s docstring now states the relationship the comment got wrong, beside the field
that carries it.

The first extraction attempt is worth recording because it failed in the way this spec keeps failing. It
translated the branch mechanically — `continue` to `return`, an assignment to a returned field — and
silently collapsed three distinct effects: a `values` flag stopped consuming its argument, and an inline
`flag=value` was given a consume count when its value sits inside the same token. **143 member cases moved
and the frozen `B4` probe fell from 32/32 to 22/32**, which is exactly what those cases exist for. A
refactor that preserves behaviour is a claim, and this one was checked rather than asserted.

**Round 10's `R02` majors and minors are applied, and two of them changed the grammar's shape rather
than its contents.**

- **`M1`** — three corpus entries asserted `build` for a command the tool does not have. `cmake build`
  CONFIGURES `./build`, so the corpus asserted the inverse of the truth, and cmake now declares `build`
  as a stop. That needed one ordering change — a declared stop beats the generic verb rule, which is the
  whole point of declaring one — and the correction then made all seven of cmake's flag members go inert
  at once, because every one of them was pinned by `<flag> build clean` expecting `none`, which works
  only if the generic rule would otherwise fire. They are re-pinned on what a flag does: the values
  swallow a token that NAMES a command, the dirs move the manifest the nested command resolves against.
- **`M2`** — the Delta discharge is scoped to the ninety-one planted forms, above.
- **`M3`** — `W10`-`W13` are on the record.
- **`M4`** — `## Final status`'s round and response counts are derived (round 10 `A3`); the corpora
  numeral is deleted rather than corrected a third time; the member numeral was already gone.
- **`M5`** — the retracted-claims guard's coordinate model is asserted rather than described, and it took
  two attempts. The first version checked span ARITHMETIC — no overlap, nothing past the end, exempt
  spans inside one paragraph — and three mutations reintroducing the old model left it green, because the
  drift is one to eight characters and too small to break an inequality. That is the same defect one
  level up, and it is why round 10 could call the original latent. The second version asserts identity
  against the source: every exempt span must BE a line of the file, and the paragraph spans must tile the
  text. Tiling is what pins the span's END without circularity — the identity check alone compares a
  slice whose end came from a flattening against that same flattening, and a model computing the end
  that way satisfied it by construction. Measured: it did.
- **`M6`** — `mvnw` is declared, with the launcher-alias rule generalised.
- **`M7`** — the recurring-class list gains four entries and, more usefully, the limit of its own
  countermeasure: an oracle round is a measurement against a corpus, and no corpus can establish an
  absence. Where the claim is "there is nothing here", the instrument has to be inverted rather than
  tested harder.
- **`m1`** — the seal-timing table's row 9 names `a163b52a` rather than "(this commit)", which resolved
  to nothing a later reader could check. Round 9 made that objection about row 8; row 8 was corrected and
  row 9 was written the same way in the same commit.
- **`m2`** — closed with `A2`: the version pin reads both records.
- **`m3`** — three laundering routes through a fence's DELIMITER LINE, and they do not get the same
  answer. A fence delimiter flattens away completely, so a marker line's flattened text is its INFO
  STRING and nothing else — and markdown renders an info string not at all. Exempting the whole marker
  line therefore hid a claim no reader of the document could see while a reader of the raw file sees it
  asserted. That is closed, together with a tail on the closing delimiter. A blockquote stays exempt **by
  decision**, because markdown renders it as a quotation, which is what this guard's contract asks for;
  it is pinned so the decision cannot quietly change. Re-measured: four of the five routes caught, the
  fifth open on purpose.
- **`m4`** — one command, three spellings, two verdicts: `make --dry-run build` was `none` while
  `make -n build` and `make --just-print build` were builds. A tool may now declare its own never-flags,
  per-tool rather than globally, because `-n` means something else elsewhere.
- **`m5`** — the closed-world limit is now stated in the matrix's oracle-strength justification, which is
  where the completion gate reads it and where round 9 asked for it. The twenty-six forms it planted are
  also declared, and the declaration produced the round's most useful deletion: every `builds: ["build"]`
  entry is **dead**, because a declared tool already reads a bare `build` through the generic verb rule.
  Fifteen of the first sixty-two generated cases were rejected on measurement for that reason, and the
  declarations are gone rather than pinned. Also gone: hugo's `values`, which cannot change a verdict
  because its own `bareIsBuild` decides first, and `@vercel/ncc`, which the unknown-binary rule already
  reads. **These deletions rest on structural arguments, not on a sweep's silence** — which is the
  distinction round 10's `B3` established and the reason the eight earlier deletions were unsound.
- **`m6`** — round 7's superseded seal now says why it CANNOT recompute, which is the half of round 9's
  `m4` that was missing. Round 1's re-seal added a file and changed none, so its earlier value still
  recomputes and the recomputation is the evidence. Round 7's changed its `summary.json`, so no
  recomputation can distinguish that correction from a rewrite, and what stands in its place is stated as
  weaker.
- **`m7`** — a sequencing note on the round-10 pack itself, discharged at the sealing step by force-adding
  every file and re-running `git status --porcelain --ignored` on the directory.
- **`m8`** — already closed: `make`'s `builds` holds `dist` and `release`.

**Round 10's `R01` minors are applied, and three of them were larger than they looked.** A boolean tool
field decided verdicts unswept — `grammarMembers()` named `bareIsBuild` literally, so `alwaysBuilds` was
invisible to the sweep from the moment it was added; `TOOL_BOOLEANS` declares the class instead. A
sub-member deletion replaced one alias only, so `gmake` kept the `-C` that `make` had lost: the grammar
under test was de-aliased exactly while the sweep measured it. And the canonical owner of a shared object
could rotate mid-sweep, because restoring a deleted tool key moves it to the end of the key order —
frozen in an `OWNER` map captured from the pristine grammar, it cannot. The rest: `deleteMember` throws on
a path naming no member rather than reporting it `undetected`; scoped package names survive both lookup
sites, with `@swc/cli` declared; `namesACommand` reads one token rather than testing its regex on the raw
one and its sets on the basename; the inline `flag=value` branch consults `buildFlags`; the odd-parity
guard reads both flattenings; a repeated `--spec` is a usage error; and the two live call sites no probe
distinguished are pinned rather than deleted, each by a command measured to change when the line is
removed.

The classifier keeps its other job — finding builds in the OWN tree, where a miss is tolerable and the
three-verdict labelling is the point — and stops being load-bearing for the story it could not secure.

**Neither cited path was in the repository until round 8**, which round 8 measured with
`git ls-files .qfai/report` — five paths, and `validate.spec-0017.json` not among them. So a later reader
could not check the gate evidence this record cites. The JSON is force-added now (`.gitignore` covers
`.qfai/report/*`, so every path there is opt-in). The 445 KB per-run directory is **not** added and is
marked regenerable instead: the command above rewrites it, and a run directory is named for its
timestamp, so committing one fixes a name that the next run will not reproduce anyway.

**And what was force-added at round 8 was round 4's run.** Round 9 measured
`traceability.testFiles.matchedFileCount` at **465** in the committed artifact against **467** at HEAD,
and traced 465 to `0cfa67c9` — so the file cited as this stage's gate evidence was four rounds old, and a
reader checking it was reading round 4's tree. The verdict was never affected: `error=2` with the same
two findings reproduces at HEAD, which is what round 9 verified independently. But an artifact exists to
be checked, and this one could not be.

Re-run and re-added at round 9, and **again at round 11** — where the finding was not the staleness but
the sentence that used to end this paragraph. It read "`matchedFileCount` is 467", a figure that moves
every time this stage adds a test file, which it does every round; it was 468 at HEAD. **No figure is
stated now.** The checkable statement is the rule: the artifact is committed, and it must be deep-equal
to a fresh `--profile atdd --fail-on error --spec 0017` run. That holds at any revision and needs no
number, which is the third time this one sentence has taught the same lesson.

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

**None advanced. One row is routed to branch 3, one is `blocked`, and P1d has now authorised both
writes; the rest were not this stage's to route.** The previous version of this section said all 71 `Integration` rows were at `refactor` and
that zero was therefore trivially correct. That was false, and it is corrected here.

| `TDD-*`    | `Layer`     | obligation     | branch                         | `DR-ID`        | `Blocked-By`       | anchor       |
| ---------- | ----------- | -------------- | ------------------------------ | -------------- | ------------------ | ------------ |
| `TDD-0069` | Integration | `TC-0017-0069` | none — `blocked`, not a branch | `-`            | `CR-20260820-0012` | § `TDD-0069` |
| `TDD-0070` | Integration | `TC-0017-0070` | 3 — `exception`                | `DR-0017-0010` | `-`                | § `TDD-0070` |

**Neither ledger cell has been written, and this table is the handover, not the ledger.**
`tdd/test-list.md:107-108` has both rows `todo` with `DR-ID: -` and `Blocked-By: -`; those cells are
`/qfai-implement`'s to write. What is recorded here is what it should write, and what P1d has
authorised.

Rounds 5, 6 and 7 each required a duplicate of this paragraph deleted and it survived all three,
because the two copies had drifted apart in wording — so every attempt looked for an exact match and
found none. It was two paragraphs saying the same thing four hundred words apart, not one paragraph
twice. Merged here.

The previous version of this table put `CR-20260820-0012` in the **`DR-ID`** column, which
`execution-ledger.md` forbids by name: "`DR-ID` is **not** widened to carry it: that column is what
distinguishes a parked `exception` from a row that never started, and overloading it would merge the
two states the `blocked` status exists to separate." P1d's third pass caught it. A `Blocked-By` column
is the right home and is now here.

**`blocked` is not a branch, and this table said it was for two rounds.** Rounds 1 through 7 each found
a false statement in this section — the one section whose job is discharging the handover obligation —
and the third was this: the table gave both rows `3 — exception` while the prose three paragraphs down
said `TDD-0069` had been re-classified to `blocked`. A row that is `blocked` takes no RED-provenance
branch at all; it is skipped by Phase Red's selection and carries a `Blocked-By` value instead. The
`DR-ID` column now holds what each row's status actually points at.

### What the writer must change in the same edit

P1d released `todo -> blocked` for `TDD-0069`, and both it and round 6's `completion-reviewer` raised
the same condition on that release: **the row's `Evidence` cell contradicts the status it is about to
get.** `.qfai/specs/spec-0017/tdd/test-list.md:107` currently reads, in part:

"NOT BLOCKED by a CR - waiting on data that does not exist yet … the workflow changes are unmerged and
CI has not run them … becomes implementable once the pull request has three green ci-pass runs to
cite"

Three things in that cell are refuted:

1. **"NOT BLOCKED by a CR"** is the negation of the `Blocked-By: CR-20260820-0012` the row is being
   given;
2. **"the workflow changes are unmerged"** is not the obstacle — `ci-pass` exists at
   `.github/workflows/ci.yml:469` and has run; the obstacle is the self-referential gate;
3. **"becomes implementable once the pull request has three green ci-pass runs to cite"** is the exit
   P1d's first pass showed is **unreachable**, because the run it waits for is gated on the annotation
   that row would justify.

`/qfai-implement` owns that cell under the Drift Protocol carve-out, so this stage may not edit it, and
`packages/qfai/tests/assets/retractedClaims.test.ts` deliberately excludes `tdd/test-list.md` for the
same reason — a guard that reddens on a file this stage must not touch is a guard that cannot be
satisfied. It is an instruction here instead: **replace that `Evidence` text in the same edit that
writes `Blocked-By`**, or the ledger will carry a refuted reason next to a correct status.

**One asymmetry this stage owes plainly**: `exception` needs a P1d `qa-gatekeeper` PASS and `blocked`
does not. So re-classifying `TDD-0069` moved it out of the gate its twin still has to pass. That is the
correct status on the merits — `execution-ledger.md` scopes `blocked` to "an upstream defect, an
unresolved Change Request, or an unfinished row in another spec", and `blocked` is *more* conservative
than `exception`, which satisfies spec completion while `blocked` prohibits it — but the gate asymmetry
is a consequence worth naming rather than leaving for a reader to notice.

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
`references/red-provenance.md` fixes.

### P1d's verdict on the branch-3 DR

**REVISE**, on `16f611c7`. The evidence shape was satisfied — row identity, obligation, `DR-ID` and
artifact all present and exact, verified against `tdd/test-list.md:107-108`, `05_Examples.md` and
`06_Test-Cases.md`, and the placement and ID scheme correct with no collision past `DR-0017-0009`. The
REVISE was about the **content of the anomaly account**, and it split the two rows:

- **`TDD-0070` sustained.** Post-merge default-branch history cannot exist pre-merge; that is branch
  3's own named example. `blocked` was checked as an alternative and rejected on
  `execution-ledger.md`'s three grounds, none of which is "waiting on run history".
- **`TDD-0069` not sustained.** Three defects: the stated obstacle was wrong ("a repo-wide
  `QFAI-ATDD-111` unrelated to this row" — both errors are scoped to `spec-0017`, and
  `QFAI-ATDD-111`'s subject `US-0017-0007` is the parent of `AC-0017-0029`, which is *these rows'*
  AC); the exit condition offered was **unreachable**, because the gate is self-referential; and
  `EX-0017-0053` was quoted at half its length, dropping "exactly one runner project is tuned, largest
  first" — the clause that *is* checkable today, and whose omission means branch 2 had not really been
  examined.

All three were verified independently before being applied. The DR is revised, `TDD-0069` is
re-classified to `blocked`, and the cycle is filed as `CR-20260820-0012`. P1d ruled on that revision at
its sixth pass and **passed** it, keeping `TDD-0069 -> blocked` released and authorising
`TDD-0070 -> exception`; see § "P1d's verdict: PASS, at the sixth pass". An earlier version of this
paragraph said `"a re-route of P1d is owed on the revision"`, which was true when written and outlived
the gate by one pass.

63 `Integration` `refactor` rows are past `todo` and outside step 3b's reach — it routes a row this stage would
advance **from** `todo`. 6 `blocked` rows carry a `Blocked-By` value and are skipped by Phase Red's
selection. That leaves exactly the two below, and `references/red-provenance.md#a-spec-with-no-atdd-owned-rows`
does **not** cover them: it is scoped to a spec with zero `E2E`/`API` rows, and says nothing about
`Integration` rows at `todo`.

### TDD-0069

- `Layer`: `Integration`
- `Test file`: `packages/qfai/tests/assets/actionPinBumpOwner.test.ts`
- `Selector`: `TC-0017-0069 (TDD-0069): one tuning change per pull request, behind three green runs`
- Obligation: `TC-0017-0069`, via `EX-0017-0053`

**Branch 1 (observed RED) is unavailable, and not for want of trying.** `EX-0017-0053` requires
"exactly one runner project is tuned, largest first" **and** three consecutive green aggregate-verdict
runs with their run identifiers quoted. A test asserting that would fail today — but the failure would
be "no such runs exist", and it could not be made green on this branch at all. Writing it would put a
permanently red test in the suite, which is not a RED observation; it is a broken build.

**The reason it cannot go green is the self-referential gate, not unmerged work.** This paragraph read
"because the workflow changes are unmerged" through three rounds of that sentence being retracted
elsewhere in this file, and P1d's third and fourth passes both found it still here. `ci-pass` exists at
`.github/workflows/ci.yml:469` and has run many times on this branch — the count was stated as twelve
and measured at 23 by P1d two rounds later, and it moves with every push, so it is dropped rather than
tracked. What blocks a green run is
`CR-20260820-0012` — the row's own unannotated `TC` is one of the errors keeping `build` red.
`EX-0017-0053` is pre-merge by construction, being about a pull request and its runs.

**Branch 2 (falsifiability) is unavailable, for a narrower reason than this record used to give.** The
procedure requires an obligation already satisfied by state that exists. The sentence here said
"nothing satisfies this one — there is no run history to mutate", which is true of clause 2 and wrong
about clause 1: `DR-0017-0010` now records clause 1 as **unsatisfied** — no tuning change has been
made, so nothing exists for "exactly one runner project is tuned, largest first" to be true of — which
is not the same as unfalsifiable. That distinction took three P1d passes and two wrong readings to
arrive at, and the DR keeps all of them.

**`TDD-0070` is branch 3**, recorded in `DR-0017-0010`. **`TDD-0069` is not** — it is `blocked` on
`CR-20260820-0012`, and `blocked` takes no RED-provenance branch at all. Both rows' identity and
obligation references were recorded **before** any gate routed, in `58c29d9f`, as the branch-3
evidence shape requires.

**Rounds 1, 2, 3, 4 and 5 each found this subsection stating something the record elsewhere had
already retracted, and round 5's finding was the repair claim itself.** Round 4's pass touched the
index table and not the prose below it; round 5's version then claimed four statements "are gone now"
while two of them stood **byte-for-byte** nine and thirteen lines above that sentence — both P1d's
fourth pass and the `completion-reviewer` proved it with `git diff`, which showed one as an unchanged
context line and the other absent from the diff entirely.

So the correction has been applied at the source this time, in the `### TDD-0069` prose itself, and
what follows is a list of where each retracted statement was rewritten rather than an assertion that
they are gone:

| retracted statement                                      | rewritten at                        |
| -------------------------------------------------------- | ----------------------------------- |
| "because the workflow changes are unmerged"              | § `TDD-0069`, branch 1 paragraph    |
| "there is no run history to mutate" (for clause 1)       | § `TDD-0069`, branch 2 paragraph    |
| "branch 3 it is" for both rows                           | this section's opening              |
| the `exception` P1d PASS as the blocker for both         | § "P1d's verdict: PASS, at the sixth pass" |

Each is now stated where a reader meets it, and the first two quote the old sentence as a quotation
rather than asserting it. Row 4's target was `"Neither transition is authorised"` for two rounds — a
phrase occurring **nowhere in this file except that cell**, and refuted in any case once P1d passed. A
correction table that sends a reader to a phrase that does not exist is the retracted-claim defect in
its own repair mechanism. It now names the section that holds the current answer.

### P1d's verdict: PASS, at the sixth pass

**`qa-gatekeeper` (P1d), pass 6, revision `9a37421c`: PASS.** Recorded here because
`qfai-implement/SKILL.md` step 3b writes `exception` **only when the entry carries the PASS** — it is
not self-executing, and this is the entry.

- **`TDD-0070` -> `exception`, `DR-ID: DR-0017-0010`**: authorised. Six passes, five refusals. Every
  one sustained the row's own account — branch 1 unavailable on the GREEN side, branch 2 with no
  satisfied state to falsify — and every refusal was about the record around it.
- **`TDD-0069` -> `blocked`, `Blocked-By: CR-20260820-0012`**: released at pass 4 and still released;
  the condition attached to that release is **discharged**, per pass 6.

The PASS covers **the observation and nothing else.** It does not clear completion: `US-0017-0007` is
uncovered, the scoped gate is `error=2`, the unscoped profiles `build` runs need 12 `US` and 15 `TC`
across five specs, six rows are `blocked`, and an `exception` still needs a user-approved
`TDDLIST-001` waiver or the spec stays open.

**And the writer owes the `Evidence` cell in the same edit** — see the subsection above. Step 3b's own
malformed-entry rule is what makes that a condition rather than a courtesy.

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

Branch 3, `DR-0017-0010`. **P1d PASSED this row at its sixth pass** (`9a37421c`), so
`/qfai-implement` may write `todo -> exception` with this `DR-ID`; see § "P1d's verdict" below for the
two conditions attached to that write, both discharged. Every one of the six passes sustained this row's
own account — post-merge history cannot exist pre-merge, which is branch 3's own named example — and
every refusal was about the record around it.

An earlier version of this paragraph asserted that the transition was "still owed" a PASS, seventeen
lines from where the PASS is recorded, and P1d wrote that failure mode down in advance: the entry step
3b reads is this one, so a stale sentence here is the one that matters most.

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
That is another instance of the recurring class enumerated at § "Gaps / Open risks" item 7 — a claim
asserted over how code is *written* rather than what it does — and this one was written while applying a
review finding about exactly that class of error. **No count is stated here on purpose.** Three sites in
these two files carried three different counts of this pattern (four, five and four) with nothing
deriving any of them; the occurrences are enumerated in one place now, and the number is however long
that list is.

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

`v3` anchored on `build` as a standalone shell **word**. Reported here as "21 forms caught, 14
non-builds rejected, 0 misclassified" — and that claim is **withdrawn**. Round 4 measured v3 and v4
against corpora it chose and found each version wrong in the direction the previous fix had not
looked:

```text
v3   9 missed builds, 10 false positives   (it caught `rm -rf build dist` and a JS comment)
v4   fixed those, then regressed on 20 of 23 forms v3 caught, because returning on the first
     target makes everything after `&&` invisible — including `npm ci && npm run build`
```

**And v4's worst property was not a miss.** It reported `pnpm ci:build-verify` as a build, and that
command's body is `node ./scripts/check-build-warnings.mjs && …` — so what the predicate measured was
**npm-script naming**. `pnpm ci:pack-verify` would be identical behaviour and `false`. That is the
"asserted over how something is written rather than over what it does" defect, here inside the
instrument built to detect a build — one entry in the list at § "Gaps / Open risks" item 7.

`v12` lives in `packages/qfai/tests/helpers/buildCommand.ts` with its corpora in
`packages/qfai/tests/unit/buildCommand.test.ts`. Since v5 it changes three things: shell segments before
verbs (`&&`, `;`, `|`, `cd`, `time`, `sudo`, `env`); **script bodies before names**, resolved in the
manifest the command's directory selects — a single merged script map cannot work here, because this
repository's root `build` is `pnpm -C packages/qfai build` and the package's is `tsup`; and three
verdicts instead of two, so a name-shaped guess returns `heuristic` rather than passing itself off as
an analysis.

**No count of the corpora is stated, and the enumeration is the statement.** It said "ten corpora" in
one place and "nine" in another, in the same file, against a list holding eleven items — round 10 found
both — and the enumeration then gained round 10's two plantings, which would have made every stated
numeral wrong again. A numeral over a list that grows once a round is a thing to be wrong about; the
list is checkable at any revision and the numeral is not, so the numeral is gone rather than corrected
for the third time.

Measured against — round 4's 20 regressions, v4's 15 kept forms, round 6's 46-case corpus (20 missed
builds, 2 false positives), round 7's 59 probes (15 defects), round 8's 66 (25 disagreements, of which 6
missed builds and 4 invented ones), round 8's 11 planted builds and 6 wrapper forms, round 9's 60 planted
builds across two reviewers (18 of 20 and 34 of 40 unnoticed), its five spelling pairs, round 10's 70
planted builds across two reviewers (18 of 20 and 44 of 50 unnoticed), its sixteen side-by-side
member-versus-command pairs, the non-builds accumulated across every round, one case per grammar member,
and every `run:` line in both workflow trees:

```text
the own tree's builds, as `tests/unit/buildCommand.test.ts` pins them
  build      ci.yml       pnpm -C packages/qfai build                    direct
  build      ci.yml       pnpm check-types                               tsc -b emits into dist
  build      release.yml  pnpm -C packages/qfai pack --pack-destination  via prepack -> build -> tsup
  build      release.yml  pnpm ci:gate                                   runs check-types
  heuristic  ci.yml       pnpm ci:build-verify                           spawn inside a .mjs
```

This block said **FOUR** for three rounds and the pinned set is five: `check-types` runs `tsc -b`, which
emits into `dist`, so the type-check lane builds — and `ci:gate` runs it. Round 10 found the block still
describing the pre-v12 state against the assertion in the same repository that contradicts it. The set is
pinned in the test; the count is not restated here, for the reason § "Work performed" gives.

The last two are **opaque to any command-line scan**. Three helpers reach the build this way —
`scripts/check-build-warnings.mjs`, `scripts/verify-pack.mjs` and `scripts/check-publish-dry-run.mjs`,
each arriving at `prepack -> npm run build -> tsup` — and reading `package.json` cannot follow a
`spawnSync` inside any of them. An earlier version of this paragraph named only the first, which is also
the only one whose **filename** says `build`; that is why commands reaching it land on `heuristic` and
the other two would land on `none` if nothing else in their line said build. Luck, not detection. Stated as a limit, and
pinned as a set in the unit test so a build in a new place fails rather than being absorbed by a
count.

### E9-E11 — the three rounds round 3 could not find

Round 3's `completion-reviewer` reported "`E11` was never run", on the ground that `git grep E11`
returns only the sentence claiming it. **It was run** — the output is below — and the finding is still
right about what matters: the harness lives in `tmp/`, which is gitignored, so nothing in the
repository supports the claim. Recording the outputs is the repair; committing the harness is not,
because a one-off mutation script that edits tracked assets does not belong in a shipped test tree.

```text
E9   the fail-open default changes without the record          REDDENS
E10  the fail-open path stops warning                          REDDENS
E11  .nvmrc loses precedence over .node-version                REDDENS
```

`E9` and `E10` were round 2's `qa-gatekeeper`'s own additions, which this record had also left
uncited. With `E6`-`E8` that is six rounds, and round 3's `implementation-reviewer` independently ran
**eight** behavioural mutants against this row and reports all eight reddening with a comment control
green.

### M1-M7, X1-X6, Y1-Y3 — falsifying the matrix pinning test

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

Rounds 2 and 3 then broke the test itself, six ways, and each is now a round of its own:

```text
X1  a class member is dropped from the partition table        REDDENS
X2  a class claims a cell the table scores ⚠️, not ❌          REDDENS
X3  a class enumeration is cut but the sizes line is left     REDDENS
X4  two members swap classes, so both sums survive            REDDENS
X5  a cell is claimed by two classes at once                  REDDENS
X6  a table cell is emptied (was silently read as ⚠️)         REDDENS
Y1  every stated size inflated tenfold                        REDDENS
Y2  the B and C labels are permuted, membership preserved     REDDENS
Y3  one stated size drifts while the total stays              REDDENS
(control) a sentence added to the prose                       reddens nothing
```

`X4`, `X5` and `X6` were numbered 6, 7 and 8 for three rounds, above a second family that ALSO used
those three ids for three different mutations — so `X6` meant both "two members swap classes" and "a
ninth all-failing depth column", and the tally below counted twenty where seventeen are distinct. The
gap they left at 4 and 5 was the visible symptom and it was reported as a heading error for two rounds.
Contiguous now, and the second family is renamed `Q*`.

`Y1` is the one that stings: the size check used `toContain` on a **number**, so `"A 30"` matched
`"A 300"` and `A 300, B 70, C 10 — 380 cells` passed all four tests. `Y2` permuted two class labels
while preserving membership and sizes — which showed that the letter carrying each cell's justification
was unpinned, the only thing the classes exist for. Both are now equality checks, and each class has a
defining property every member must satisfy.

### R1-R3 — the ledger ratchet

The repo-wide ledger assertion has been wrong three times, once in each direction, so each direction is
a round:

```text
R1  60 more unbacked ledger claims appended (a regression)     REDDENS
R2  27 of the 127 backfilled with real annotations (the fix)   stays GREEN, correct
R3  ONE more unbacked claim                                    REDDENS
```

`R2` is the one that matters. The first bound (`> 100`) **failed** on it — the remediation
`CR-20260820-0011` option 1 prescribes — while being blind to `R1`. The second (`checked >= 208`)
reddened on the first ledger line *removed*, which is the same option's other branch. The claim count
is not asserted at all now; only `unbacked` has a direction pinned.

### G1-G3 — the loop guard

```text
G1  the `stat` site loses its ELOOP guard                      REDDENS
G2  the realpath dedupe reverts to lexical `path.resolve`      REDDENS
G3  symlinked directories stop being followed                  REDDENS
```

`G3` reddened **nothing** the first time it was run, and that is how round 4's vacuity finding was
confirmed from this side: the symlink test passed the link as the walk's *root*, and `readdir` follows a
root whatever kind of node it is, so `entry.isSymbolicLink()` — the branch under test — was never
reached. The test now places the link inside the scanned directory.

### Q1-Q7 — the matrix record's prose

Round 5 broke the matrix pinning test twice more, both times without touching the table:

```text
Q1  a ninth all-failing depth column is added                  REDDENS
Q2  the refuted accuracy figure is restored                     REDDENS
Q3  the version named in the record drifts back                 REDDENS
Q4  the naming-defect reason is deleted                         REDDENS
Q5  a matrix row loses one pipe, so a cell slides left          REDDENS
Q6  the describing sentence lags the helper by one version      REDDENS
Q7  the new version appears in the history list only            REDDENS
```

`Q5` is round 6's: deleting a single pipe from one row slid `Oracle strength` into `Status`, the missing
trailing cell was backfilled by a default, **every derived number stayed the same** and all five tests
passed. A row of the wrong width is a parse failure now, not a row with a default in it.

`Q6` and `Q7` are one defect in two placements, and `Q7` is why the version pin had to be **anchored**
rather than merely derived. Deriving it from the helper's docstring closed round 7's failure — a literal
`v6` pinning the record at v6 while the helper had moved on — but the assertion was still `toContain`
over the whole record, and this record gains a **history line per version** by convention. So `v11`
would appear in the history the moment v11 existed, satisfying the pin while the sentence that describes
the predicate still said v10. The pin now reads the version out of the sentence naming
`packages/qfai/tests/helpers/buildCommand.ts` and compares it to the helper's own maximum. Both
placements were measured before the change and both redden after it.

`Q1` and `Q2` reddened nothing before this round: `parseMatrix` dropped any column past its header
list, so nine unjustified cells were invisible; and the paragraph written to discharge round 4's
blocking finding could be reverted to the refuted "0 misclassified" text in silence. The header is
compared to the column list now.

**`Q2` has since moved instruments, and this section said otherwise for two rounds.** The absence of the
refuted accuracy figure is no longer pinned by `coverageDepthMatrix.test.ts`: that assertion was removed
deliberately and the check handed to `retractedClaims.test.ts`, where entry 6 of `RETRACTED` holds it
across all five governance files rather than one — a strictly wider check, and the right home for it,
since "this figure must not reappear" is the retracted-claims rule and not a property of the matrix's
table. `Q2` still reddens; what changed is which file goes red. Recording the outcome and not the
hand-off is the same defect as naming the wrong instrument at § "P7 quality gates" (`M7` below): a
completion gate reads this file, not the design conversation.

`Q3` is why the version pin is derived from the helper's docstring rather than written here as a
literal. A literal `v6` held the record stale at v6 while the helper was at v8, and the mutation that
should have caught it was the mutation of writing the literal.

### C1-C5 — the derived-count test

```text
C1  a stated test count drifts from the file                    REDDENS
C2  a test is added and the record does not follow              REDDENS
C3  the annotated-describe count drifts                         REDDENS
C4  the recorded guard output parts from the ledger              REDDENS
C5  a pack's seal line is deleted                                REDDENS
```

That test found a real defect on its first run — round 4's seal edit had aborted on a later needle and
written nothing, so the record still said "Three packs" against four directories in a section this
record had reported as fixed. It was also **itself** the worst defect of round 5: its first version
required a seal for every pack on disk, which no honest edit can satisfy while a pack is under review,
and it made a required CI leg red at the commit that added it.

### W1-W13 — the retracted-claims guard, and a false cause this stage published

`packages/qfai/tests/assets/retractedClaims.test.ts` had no family here for three rounds, which is
part of why the next paragraph went unrecorded: its only account lived in a test docstring and a review
request, and a completion gate reads neither.

```text
W1  a retracted claim reinstated as a plain assertion           REDDENS
W2  the same claim laundered by a zero-width space BETWEEN words REDDENS
W3  the same claim laundered by a zero-width space INSIDE a word REDDENS
W4  an entry's needle lengthened past the text it catches        REDDENS
W5  the claim wrapped in _italics_ rather than quotation marks   REDDENS
W6  the claim split across a hand-wrapped line break            REDDENS
W7  a RETIRED claim reintroduced into the records                REDDENS
W8  a RETIRED declaration deleted while its claim stays absent   REDDENS
W9  an entry added this round reworded so it matches nothing     REDDENS
W10 a claim laundered by opening a fence around it (round 9)     REDDENS
W11 the same launder against the line-scoped exemption rule      REDDENS
W12 a stray quotation mark on a fenced line, shifting every span REDDENS
W13 a zero-width character in a fence marker, exempt in one
    flattening and counted in the other                          REDDENS
```

Control green. `W2` and `W3` are one mutation in two placements and they need **two** flattenings:
deleting a zero-width character welds two words together, substituting a space splits one word in two,
and each repair blinds the guard to the other placement. Round 7 laundered a claim the first way and
round 8 the second, each against the version repaired for the other.

`W10`-`W13` are the fifth rebuild of this guard, and they are recorded here because for one round they
were not: round 9 found the launder, the repair was written and verified, and the oracle round existed
only in a review report and a test docstring — which is the sentence this section opens with, about this
same file, reproduced by the commit that was closing it.

`W10` is round 9's launder: a claim is exempt when it sits inside a fence, so **opening a fence around
it** made it exempt without moving it. `W11` is the same launder against the repair — exemption scoped
to the line rather than inherited by the document — and it still reddens. `W12` and `W13` are round
10's, and both are about the two guards disagreeing on where an exempt span is rather than about the
claim: a stray quotation mark on a fenced line shifted every quoted span after it while the paragraph
still read as balanced, and a zero-width character in a fence marker made a mark exempt in one
flattening and counted
in the other. Both now read the same mark set, and the odd-parity report runs over both flattenings.

`W4`, `W8` and `W9` are the class round 8 added, and the class the guard was missing entirely. An
entry whose needle is longer than the text it means to catch enforces nothing and reports nothing: the
suite stays green while the claim stands. Round 8 measured two of thirteen entries in that state —
`"P1d has returned REVISE three times"` added while its sites read `"sustained across three passes"`
and `"sustained four times running"`, and `"defeated by the formatter"` added against text reading
`"defeated by **running** the formatter"`. Both were added by the round that was closing this exact
defect somewhere else.

**The false cause.** This stage recorded, and repeated for two rounds, that the guard's earlier failure
was `"defeated by running the formatter ci:lint enforces"`. That is withdrawn. Two configuration facts
refute it:

| fact                                                                    | source                |
| ----------------------------------------------------------------------- | --------------------- |
| `.qfai/evidence/**` and `.qfai/review/**` are excluded from Prettier     | `.prettierignore`     |
| markdown is formatted with `proseWrap: "preserve"`, so nothing reflows   | `.prettierrc.json`    |

No formatter touches these files, and none would rewrap them if it did. **The line breaks are
hand-wrapped by this stage** — the same stage that then attributed them to a tool. The failure was real
and the mechanism was right; the cause was adopted from round 6's report and never checked against the
two files above. It is the same error as `E4b`'s withdrawn "rebuilt around the verb": a claim about how
something is written, believed without reading it.

## Gaps / Open risks

1. **Five of nine stories are unsatisfied in the shipped tree, and the five shipped layer lanes are
   `echo` placeholders.** Detailed per cell in the matrix. This is the stage's main finding: the "and
   ship it to adopters" half of `spec-0017` is **less than half done**, and none of it was visible
   until `qfai init` was run and the step bodies — not the job names — were read.
2. **`US-0017-0007` is uncovered by choice.** The knobs do not ship, so no honest assertion exists.
   It becomes coverable when they do.
3. **`QFAI-ATDD-112` reports 8 spec-0017 TCs, and 15 repo-wide** — the 6 `blocked` and 2 `todo` rows
   here, plus every other spec's: `spec-0003` (1), `spec-0008` (4), `spec-0015` (2), `spec-0017` (8).
   The scoped gate this stage runs sees the 8; `build` runs the profile **unscoped** and sees all 15,
   so eight is the number this stage can act on and fifteen is the number a gate reports. Four of the
   six `blocked` rows are `blocked` on `CR-20260820-0007`.

   Of the two `todo` rows, **only `TDD-0070` is on branch 3** (`DR-0017-0010`, PASS at P1d pass 6).
   `TDD-0069` is `blocked` on `CR-20260820-0012` and takes **no** RED-provenance branch at all: a
   `blocked` row has not started, which is the distinction § "Ledger rows advanced" turns on and the
   reason the `DR-ID` column was not widened to carry a `Blocked-By` value. An earlier version of this
   item said both rows were parked on branch 3 — the same false statement § "Ledger rows advanced"
   reports as corrected after standing two rounds, surviving here in different words.
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
   ratchet was then falsified in the same three directions: `R1` and `R3` redden, `R2` stays green
   (§ "Execution logs"). This read `W1`/`W2`/`W3` for two rounds, naming a family that did not exist —
   and `W*` now names the retracted-claims family, so the stale reference would have resolved to the
   wrong instrument rather than to nothing.
6. **The E2E surface cannot exercise a real workflow run.** It reads what `init` ships. Whether a
   documentation-only change actually produces a narrow lane set is now observable — PR #794's runs
   show it — and nothing consumes that observation. That is class B of the matrix's `❌` cells — whose
   membership the matrix enumerates and its guard partitions, so no count of them is stated here —
   and no ledger row proposes a surface that would consume it.
7. **One class of defect accounts for most of this spec's findings, and it recurred inside the repair
   of a finding about it.** Every occurrence is a claim asserted over **how something is written**
   rather than over **what it does**. This is the canonical list — three other sites used to carry
   three different counts of it, so they point here now and the count is the list's length:

   1. `E4` — a package-manager regex that measured npm-script *naming*; `pnpm run build` and six more
      idiomatic forms reddened nothing.
   2. `v4` — `pnpm ci:build-verify` reported as a build **by the script's name**, when its body reaches
      no build at all.
   3. `E6`/`E7`'s first form — the version-resolver assertion matched other text in the same step body,
      so breaking the real mechanism left it green. Written minutes after applying `E4`'s widening.
   4. `"defeated by running the formatter"` — a claim about how these evidence files are wrapped,
      adopted from a review report without reading `.prettierignore` or `.prettierrc.json`. They are
      hand-wrapped.
   5. The member-pinning test — it generated its probes **from the sets it pinned**, so the claim "every
      member is pinned" was a claim about the test's shape. 0 of 17 mutations reddened it.
   6. The version pin — derived from the helper's docstring, then satisfied by this record's own
      version-**history** list while the sentence describing the predicate lagged.
   7. The classifier's own miss direction — the docstring argued that missing a build was "the safe
      direction here". For an assertion that a tree contains none, a miss is the **vacuity** direction:
      round 8 planted eleven real builds in a shipped lane and ten shipped unnoticed.
   8. The eight deletion warrants — "each was a list whose deletion changed no command's verdict" is a
      claim over the commands **this stage enumerated**, not over the commands that exist. Twenty
      distinguish `MANAGER_BOOLEAN` alone, and nine of ten planted builds shipped through the hole its
      deletion opened. This is item 5 one layer further out: round 8 found probes generated from the
      sets, round 9 found the corpus written from the member list, and this is a **deletion** justified
      by that corpus's silence. The general form is that a sweep's report is identical whether a member
      is dead or whether the corpus merely lacks its shape.
   9. The retracted-claims guard's coordinate model — "a paragraph's flattened text is its lines'
      flattened texts joined by single spaces, and a line's span is derivable by accumulating lengths".
      False for 50 of 456 real paragraphs, written into the repair for a finding about this very class,
      and latent only because the drift is one to eight characters.
   10. "this is the enumeration both evidence files count from" — a claim about how the two files are
       written, false of both (they enumerated different sets), written to close a finding about
       counting. The numeral is now gone and the enumeration lives in one file.
   11. The round-4 findings slot — the `id families` cell was rewritten to agree with the recorded count
       rather than the count being derived from the stated rule. Weaker than the others, and recorded
       because it is the same substitution: a claim about how the row is written standing in for the
       measurement. Offered as a candidate by round 10 and accepted as one.
   12. **The allowlist's "fails closed" justification.** The whole argument for replacing the classifier
       was that a denylist over build spellings fails open while an allowlist fails closed. The
       allowlist did not fail closed: `invocationOf` returned `undefined` for both "invokes nothing" and
       "cannot be read", and `refusals()` read the second as consent — so every construct the scanner
       did not understand was permission to run anything. Round 11 ran fifteen of eighteen real builds
       past it, and probe 01 was `pnpm build`, the first entry its own corpus refuses, with one `if`
       around it. This is the sharpest instance in the list because the claim was not incidental: it was
       the *reason for the design*, it was written in three files, and it was never measured. Round 10
       accepted it on the strength of a corpus that could not test it (entry 13).
   13. **That corpus.** All 62 `PLANTED` entries were bare commands, so "0 escaped" carried no
       information about wrapping — and the accept direction was worse than uninformative. Its
       must-accept case produced no refusals *because of* the hole, so the test certifying the
       instrument was derived from the instrument's blind spot and any real repair had to redden it.
       That is entry 5 (probes generated from the sets they pin) at the level of a whole instrument
       rather than a member.
   14. **hugo's deleted `values`.** "Its own `bareIsBuild` decides before any flag can matter" — false;
       `bareIsBuild` is evaluated after the token loop and gated on no target having been seen, so a
       flag whose argument is not consumed suppresses it. Written one commit after this list was
       extended, in the commit that extended it, and it made a real build read as nothing.

   The working countermeasure is not vigilance: it is that every new claim gets an oracle round before
   it is reported, and that a claim over a file's contents is rewritten to **run** the thing whenever
   running it is possible — as `tests/integration/shippedWorkflow*.test.ts` already does. Items 5, 6,
   7, 8 and 9 were each caught that way, by someone mutating the instrument rather than reading it.

   **And the countermeasure is not sufficient, which items 8 and 12 prove in sequence.** An oracle round
   is a measurement against a corpus, and a corpus cannot establish an absence. Round 10's answer was to
   invert the instrument — enumerate what is permitted and refuse the rest — and round 11 showed that
   inverting the QUESTION is not the same as inverting the ANSWER. The allowlist asked the right
   question and still fell through, because its parser conceded whatever it could not read. Inversion
   only helps if the failure of the scan is itself a refusal.

   Two further limits are worth stating, because each cost a round:

   - **An oracle round on a pin whose needle is a closed enumeration proves nothing outside that
     enumeration.** The pack-count pin passed every round it existed and went inert at exactly eleven
     packs, when the numeral left the alternation its pattern listed. Matching nothing was a pass.
   - **A corpus whose entries share a shape can only report on that shape.** Sixty-two bare commands
     say nothing about a wrapped one, and the accept direction can end up defending the refuse
     direction's vacuity rather than checking it.
8. **`TDD-0069` and `TDD-0070` are parked, and they are parked for two different reasons.**
   **Both are still `todo` in the ledger**, and what follows is the status each is owed rather than
   one it has — round 4 and round 5 each found this item asserting the statuses while `## Final
   status` said neither had been written. `TDD-0070` is owed `exception` against `DR-0017-0010`, whose
   account P1d sustained through all six passes and passed at the sixth: post-merge history cannot
   exist pre-merge.
   `TDD-0069` is owed `blocked` on `CR-20260820-0012`, and P1d's fourth pass **released** that write
   on the merits — the only ground it had blocked on, a `DR-ID` column carrying a `CR-*` id, is fixed.
   P1d found the exit condition
   `DR-0017-0010` first offered to be **unreachable**, because a green `ci-pass` requires `build`
   green, which requires `error=0`, which requires `QFAI-ATDD-112` clear, which requires
   `TC-0017-0069` annotated — which requires the green runs. The row waits for itself. That is an
   unresolved Change Request of this spec, so `blocked` is the correct status and `exception` was not.

   The earlier claim here — that both rows "need a `DR-*` this stage may not author", the same
   authorship gap as `CR-20260820-0007` — was **retracted twice over**: the DR was authorable at
   `.qfai/decisions/`, and `TDD-0069`/`TDD-0070` are not in that CR's blocked set. (The ledger's
   columns
   are `TDD-ID` / `TC-Refs` / `Layer` / `Test file` / `Selector` / `Status` / `DR-ID` / `Blocked-By` /
   `Evidence`; the first version of this line said `Notes`, a column that does not exist.)

## Round 2, and the P7 evidence for it

Three reviewers ran on `56daee8d` — **two of them blocking**, per `agent-routing.yml`, whose atdd
review phase lists `blocking_agents: qa-gatekeeper, completion-reviewer` with `implementation-reviewer`
**conditional** on helper or runtime code having changed. It had, so it was routed, and its findings were
applied; that does not make it a blocking gate, and calling it one overstated the gate this stage
cleared. Five rounds asked for this. The request was **committed before they launched** — round 1's
`qa-gatekeeper` had detected five files moving while three reviewers ran, which was this orchestrator's
fault and is fixed structurally rather than by intention. All three confirmed HEAD did not move and
`git status --porcelain` was empty at their start.

| reviewer                   | verdict  | findings                        | report                             |
| -------------------------- | -------- | ------------------------------- | ---------------------------------- |
| `implementation-reviewer`  | REVISE   | 4 blocking, 6 medium, 9 low     | `R01_implementation-reviewer.md`   |
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

### P7 quality gates

**Re-run after the last artifact changed, twice, because this block was wrong about its own
currency both times.** Round 3 found the first version written at `16f611c7` before `21ea1ddc` landed
+489/-76 across four files, so it certified three artifacts that postdated it — established by
`git log -S`. Round 4 found the replacement stale in the same way. **These numbers are measured at the working tree of this commit**, which carries every repair through
round 11: the e2e figure is 1440 and the integration+unit figure 1212.

e2e callsites at this tree: 879

**That line is the repair, and it is the sixth attempt at this defect.** Rounds 4, 5, 6, 7, 10 and 11
each found these totals a round behind, and each repair re-typed the number. Neither total can be derived
by a test — deriving them would mean running the suite from inside it — but the thing that INVALIDATES
them can be: a commit that changes an `it` / `test` callsite under the e2e project's two include globs.
`stageEvidenceCounts.test.ts` measures that count and requires the line above to equal it, so a commit
that moves a callsite reddens until the line is corrected, and the totals beside it are known-invalid
rather than presumed-valid in the window between.

It reads "at this tree" rather than naming a revision on purpose. A row cannot name the commit it is
written in — round 10's `m1` — so pointing the guard at the sequence's last row would either make the row
false or make the guard red at the commit that corrects it.

**No sentence here claims how many commits follow the last row of the sequence.** Five rounds running,
that sentence was wrong — "the two commits after it" against five, and before that "records only" against
a commit that changed five test files. It is the same defect as every other count nothing derives, and it
kept recurring because it is the one figure in this block that goes stale on every push rather than on
every test change. The rule replaces it, and the rule is checkable at any revision:

> any commit that changes an `it` / `test` callsite under the e2e project's two include globs owes a row
> in the sequence below; any commit that does not leaves the e2e total valid.

The integration+unit figure has no such sequence, and that asymmetry is why it went stale first: round 9
found it recorded at 1196 against a measured 1197, moved by round 8's own repair commit. It is derivable
the same way and is still not derived. Three rounds asked for the revision beside the totals and got a round name
instead; a round name cannot be checked, which is the whole reason those rounds asked.

```text
pnpm ci:lint                                    exit 0, all eleven members
pnpm check-types                                exit 0
pnpm -C packages/qfai test:e2e                  1440 passed / 16 skipped, exit 0
vitest --project integration --project unit     1212 passed / 19 skipped, exit 0
node scripts/check-atdd-annotation-ledger.mjs --spec 0017
                                                9 claim(s) backed, exit 0
pnpm verify:pack                                exit 0
  (named because round 9 found it absent from this block while `release.yml` runs it, and because it
   is one of the three helpers that reach a build through `spawnSync` and so cannot be scanned)
node ... validate --profile atdd --spec 0017     info=2 warning=0 error=2
  artifact  .qfai/report/validate.spec-0017.json
node ... validate --profile full                 error=4  (see § "The full profile")
```

**`--project assets` does not exist**, and an earlier version of this block named it. The workspace
declares **seven** projects — `core`, `unit`, `validators`, `integration`, `e2e`, `cli`, `scripts`
(`packages/qfai/vitest.workspace.ts`) — and `tests/assets/**` runs under **`e2e`**, which `ci.yml`
executes as a required matrix leg. An earlier version of this sentence listed six and then named `e2e`
in the next clause, which is the count that made the seventh look like something else. That mattered for more than a label: the
first version of `stageEvidenceCounts.test.ts` was red, and because it lives in `tests/assets/**` it
made `test (e2e)` red in CI from a clean checkout — with `ci-pass` then failing on two jobs instead of
one. Round 5's `qa-gatekeeper` measured it while this block certified `exit 0`, which is the same
defect class this record keeps finding, now about the suite's own colour.

The totals moved several times, and round 6 found the derivation wrong twice even though the endpoints
were right — including one claim its own arithmetic refuted. Re-derived from `git show` at each
revision rather than from memory:

```text
per commit, e2e project (tests/e2e/** + tests/assets/**, the project's two include globs):

  3f815725  1422        callsites 858
  c40b2358  1425  (+3)            861  (+3)
  cb91e089  1428  (+3)            864  (+3)
  ac4700d1  1431  (+3)            867  (+3)
  9882a1d4  1432  (+1)            868  (+1)   round 7's apply commit
  dbe00247  1432  (+0)            868  (+0)   docs only
  eb5d59af  1433  (+1)            869  (+1)   round 8's apply commit
  96c89ae3  1433  (+0)            869  (+0)   records only
  b016623b  1433  (+0)            869  (+0)   records only
  aab29486  1433  (+0)            869  (+0)   records, and round 8's pack committed
  f544daad  1433  (+0)            869  (+0)   v11 — its new test is in `unit`, not `e2e`
  05a97202  1433  (+0)            869  (+0)   round 9's request
  30a0ae5a  1434  (+1)            870  (+1)   v12, and the retracted-claims guard's eighth test
  d4ea336c  1434  (+0)            870  (+0)   spellings; its new test is in `unit`
  70c50a9c  1434  (+0)            870  (+0)   records only
  3a466b27  1434  (+0)            870  (+0)   records, and the version constant
  a163b52a  1434  (+0)            870  (+0)   round 9's pack, and the extracted parser
  a66be5c6  1434  (+0)            870  (+0)   round 10's request
  febbd881  1434  (+0)            870  (+0)   the manager regression; its tests are in `unit`
  81326cc0  1435  (+1)            871  (+1)   the shipped-lane allowlist assertion
  88760814  1435  (+0)            871  (+0)   the declaration check, in `unit`
  7af579c3  1437  (+2)            873  (+2)   the guard's two new coordinate tests
```

**The integration+unit total has no sequence like this, and it went stale first.** `f544daad` added the
twentieth test in `buildCommand.test.ts`, which lives in the `unit` project, so that total moved 1196 to
1197 while the e2e one did not move at all — and the block above certified the old figure for one
commit. Caught by re-measuring both totals rather than by a reviewer, which is the first time on this
spec that this class of defect was found here rather than reported to us. The e2e sequence exists because
five rounds faulted that number; the other total is derivable the same way and is not yet derived.

**Method, because three derivations of this sequence were wrong with correct endpoints.** The right
column is `it` / `test` callsites in the project's files at each revision, counted from `git show` —
which is checkable at any later date, unlike a suite total, and is why it is printed. The left column is
the total those deltas imply from the measured 1422. The two are tied at both ends: the run above
measures **1433** at `eb5d59af`, and 1422 + (869 - 858) = 1433. Callsites are not tests — `.each` makes
one callsite many — so the columns only move together while the tests added are plain ones, and every
step here is.

**The invariant, stated so it does not need restating each round:** any later commit that changes an
`it` / `test` callsite under the project's two globs owes a row here, and any that does not leaves the
total valid. That is checkable with one `git show` per commit and it is why the right column exists.
A record naming HEAD is stale at the next commit; a record naming a revision plus a rule is not.

The sequence stopped at `ac4700d1 1431` for one round while the block beside it certified **1432**, so
it asserted a total its own derivation could not reach. The missing `+1` is `9882a1d4`, round 7's own
apply commit: a step that was invisible because it was the step being taken.

Round 7 measured that sequence and it is the one to trust. Two derivations before it were wrong with
correct endpoints — the first credited round 5 with six tests where `git show` says **four**, and
claimed three loop-guard tests were added at a revision whose diff for that file is **empty**, which
`1186 + 2 = 1188` already refuted; the second started round 6's row at round **5**'s revision and
absorbed round 5's repair step into it, making a `+3` delta read as `+9`. The endpoints were right both
times, which is exactly why neither was caught by looking at the totals.

`retractedClaims.test.ts` held **3** tests at `cb91e089` and 5 at `ac4700d1`, not the 5 the second
version credited to the earlier revision. Re-derived with `git show` at each commit rather than
reconstructed.

**Those two totals are the numbers this record cannot derive**, which is why they name the revision
they were measured at and why the sequence above reaches it. Round 7 required the paragraph that used
to sit here deleted; the round that answered it **duplicated** the paragraph instead, welding the
sentence marked for deletion onto the end of the copy — an insertion where a deletion was required, in
the block being rewritten to answer a finding about this block. It is gone now, and that was verified
with `git diff` rather than by rereading the file. What is derivable about the artifacts is checked rather than typed, and by **four** guards, not one —
naming a single instrument for all of it was itself a wrong attribution, of the same class as the two
this section reports:

| derived                                                | instrument                        |
| ------------------------------------------------------ | --------------------------------- |
| per-file test counts, annotated describes, recorded vitest outputs, the named packs and their seals | `stageEvidenceCounts.test.ts` |
| the pack-count **numeral** in prose ("Eight packs")     | `retractedClaims.test.ts`         |
| the classifier version this record names                | `coverageDepthMatrix.test.ts`     |
| the matrix's totals, partition, class prose, row width  | `coverageDepthMatrix.test.ts`     |
| every grammar member of the classifier                  | `unit/buildCommand.test.ts`       |

Five rounds each found a number here that the tree did not hold; correcting them one at a time did not
work, and on its first run the derived-count guard found a pack seal missing from a section this record
had already reported as fixed.

### P1d's verdicts

P1d has run **six times** on `DR-0017-0010`: five `REVISE` and, at pass 6, **PASS**. Every pass sustained
`TDD-0070`'s own account; what failed each time was the record around it. Pass 4 **released**
`todo -> blocked` for `TDD-0069` — the first write any gate has authorised — and pass 5 reported the
remaining blocking set as two sentences describing the review itself, with **nothing left saying the
reasoning is wrong**.

**First pass** (`16f611c7`): the evidence shape was satisfied, `TDD-0070`'s account sustained, and
`TDD-0069`'s not — the stated obstacle was wrong, `EX-0017-0053` was quoted at half its length, and the
exit condition offered was **unreachable** because the gate is self-referential. Applied: the row was
re-classified `blocked`, the cycle filed as `CR-20260820-0012`, the example quoted in full.

**Second pass** (`1473897a`): the `blocked` re-classification was **sustained** — on the ground that a
stage laundering a verdict would have kept `exception`, which satisfies completion, rather than taking
`blocked`, which prohibits it. What failed was three things: this handover table still said `exception`
for `TDD-0069`; the corrected clause-1 finding was **contradicted by the repository** (see below); and
the cycle is over-determined in a way `CR-20260820-0012` did not record.

**Third pass** (`54d8d325`): the `DR-ID` column was carrying a `CR-*` id, which `execution-ledger.md`
forbids by name; the clause-1 statement had over-corrected to "degenerate", which the repository's own
`CR-20260820-0003` site table refutes; and the account reasoned from the **scoped** gate while `build`
runs unscoped profiles, where `QFAI-ATDD-112` is 15 TCs rather than 8.

**Fourth pass** (`3f815725`): **released `todo -> blocked` for `TDD-0069`.** The one ground it had
blocked on was fixed, and the release was granted on the merits — a stage laundering a verdict would
have kept the completion-satisfying status. Three items remained, all textual: a refuted claim still
asserted in the DR's split paragraph, an arithmetic that counted the correct statement as an error, and
two retracted sentences still standing in `### TDD-0069`.

**Fifth pass** (`cb91e089`): two blocking items, and for the first time **nothing saying the reasoning
is wrong** — the DR is a record it sustains whole. What remained was a refuted claim asserted in
`CR-20260820-0012` (the DR's twin paragraph had been fixed and the CR's had not) and one sentence in
this file. It also found the new retracted-claims guard green **because of an omission**, which is why
that guard now searches every governance file for every claim.

**Sixth pass** (`9a37421c`): **PASS.** Two blocking items from pass 5 fixed, and fixed in both files
at once — the pattern P1d had named three rounds running, where the half named second went unrepaired,
did not recur. It verified the fix by replaying the guard's own predicate over copies rather than on
inspection, and reported that its first two mutations against the DR were **no-ops** until it found the
real quoted span, so a reviewer stopping at the first attempt would have wrongly called the DR
unguarded. Two conditions were attached to the edit that records the PASS: the round-count sites, and
the DR's own `Status` field. Both discharged. It also noted one retraction of its own still missing from
the retracted-claims list, which round 8 added.

**The clause-1 correction was itself wrong, and this is the fifth vacuous claim on this spec.** Round
1's finding was that `EX-0017-0053` had been half-quoted, dropping "exactly one runner project is
tuned, largest first". The repair said that clause *is* satisfied by pre-existing state and *is*
falsifiable by tuning a second project in `vitest.knobs.ts`. **That mutation does nothing**:
`maxWorkers` lives in `rootKnobs`, the file's own docstring records that a per-project worker
declaration "type-checked, it ran, it emitted no warning — and it did nothing" at a ratio of 0.93, and
open `CR-20260820-0003` adds that the runner drops unknown project options silently. An equivalent
mutant, written while applying a finding about that clause. `DR-0017-0010` now records clause 1 as
**unsatisfied** — not, as an earlier version of this line said, "degenerate rather than satisfied",
which P1d refuted by showing `maxConcurrency` is project-scoped.

### Findings per round

**The rule below reproduces 25 of the 27 numeral-bearing rows**, and the two it does not are named.
The rule: distinct finding identifiers appearing as a heading at level two to four, optionally
backtick-wrapped, counted from the packs on disk.

It said "Every count below is derived" for three rounds. Round 11 implemented the stated rule and ran it
over all 27 rows: two disagree. Round 4's stage report gives 8 against a recorded 6, because two of its
eight heading identifiers (`E6`, `X1`) are oracle-round ids rather than findings; round 7's P1d gives 0,
because it enumerates its ids inline and carries none as headings. **Both exceptions are properties of
those reports, not of the rule** — which is the opposite of what the next paragraph used to claim. `id families` carries the derivation so the number can be checked
without recounting, and `summary` carries what that pack's own `summary.json` records where the two
differ.

| round | reviewer                  | verdict | findings | id families            | summary |
| ----- | ------------------------- | ------- | -------: | ---------------------- | ------: |
| 1     | `completion-reviewer`     | REVISE  |       13 | B1-B5, M1-M4, m1-m4    |      13 |
| 1     | `qa-gatekeeper` (stage)   | REVISE  |        — | enumerated inline      |       5 |
| 2     | `implementation-reviewer` | REVISE  |       10 | B1-B4, M1-M6           |      10 |
| 2     | `completion-reviewer`     | REVISE  |       13 | B1-B4, M1-M4, m1-m5    |      13 |
| 2     | `qa-gatekeeper` (stage)   | REVISE  |        — | enumerated inline      |       9 |
| 2     | `qa-gatekeeper` (P1d 1)   | REVISE  |        6 | B1-B3, N1-N3           |       6 |
| 3     | `implementation-reviewer` | REVISE  |       10 | B1-B4, M1-M6           |      10 |
| 3     | `completion-reviewer`     | REVISE  |       16 | B1-B7, M1-M5, m1-m4    |      16 |
| 3     | `qa-gatekeeper` (P1d 2)   | REVISE  |        3 | B1-B3                  |       3 |
| 3     | `qa-gatekeeper` (stage)   | **did not run** |  — | —                      |       — |
| 4     | `implementation-reviewer` | not routed — the code was read by round 4's gatekeeper | — | — | — |
| 4     | `completion-reviewer`     | REVISE  |       16 | B1-B6, M1-M5, m1-m5    |      16 |
| 4     | `qa-gatekeeper` (stage)   | REVISE  |        6 | B1, B2, M4, M4b, B6, B6b |    12 |
| 4     | `qa-gatekeeper` (P1d 3)   | REVISE  |        5 | B1-B2, M1-M3           |       8 |
| 5     | `completion-reviewer`     | REVISE  |       17 | B1-B7, M1-M5, m1-m5    |      17 |
| 5     | `qa-gatekeeper` (stage)   | REVISE  |       12 | B1-B10, M1, M3         |      17 |
| 5     | `qa-gatekeeper` (P1d 4)   | REVISE  |        3 | B1-B3                  |       3 |
| 6     | `completion-reviewer`     | REVISE  |       17 | B1-B6, M1-M5, m1-m6    |      18 |
| 6     | `qa-gatekeeper` (stage)   | REVISE  |       10 | B1-B10                 |      20 |
| 6     | `qa-gatekeeper` (P1d 5)   | REVISE  |        2 | B1-B2                  |       3 |
| 7     | `completion-reviewer`     | REVISE  |       21 | B1-B6, M1-M7, m1-m8    |      21 |
| 7     | `qa-gatekeeper` (stage)   | REVISE  |       18 | B1-B11, A1-A7          |      18 |
| 7     | `qa-gatekeeper` (P1d 6)   | **PASS** |       8 | M1, A1-A7 (inline)     |       8 |
| 8     | `completion-reviewer`     | REVISE  |       29 | B1-B6, M1-M7, m1-m16   |      29 |
| 8     | `qa-gatekeeper` (stage)   | REVISE  |       22 | B1-B11, A1-A11         |      22 |
| 9     | `implementation-reviewer` | REVISE  |       25 | B1-B4, M1-M9, m1-m12   |      25 |
| 9     | `completion-reviewer`     | REVISE  |       22 | B1-B6, M1-M6, m1-m10   |      22 |
| 9     | `qa-gatekeeper` (stage)   | REVISE  |       17 | B1-B8, A1-A9           |      17 |
| 10    | `implementation-reviewer` | REVISE  |       26 | B1-B6, M1-M9, m1-m11   |      26 |
| 10    | `completion-reviewer`     | REVISE  |       20 | B1-B5, M1-M7, m1-m8    |      20 |
| 10    | `qa-gatekeeper` (stage)   | REVISE  |       16 | B1-B9, A1-A7           |      16 |
| 11    | `implementation-reviewer` | REVISE  |       16 | B1-B4, M1-M5, m1-m7    |      16 |
| 11    | `completion-reviewer`     | REVISE  |       17 | B1-B6, M1-M7, m1-m4    |      17 |
| 11    | `qa-gatekeeper` (stage)   | REVISE  |       15 | B1-B8, A1-A7           |      15 |

**Where the two columns disagree, the derived one is the one to trust, and the reason is a rule that
does not fit every report.** The declared rule counts distinct finding identifiers "or the count of
heading-level-3 sections where a report uses no identifiers", and round 9 showed that neither branch
describes what these reports do. Round 1's `R03` has **zero** level-3 headings and five `## Finding N`
headings, and its recorded 5 is exactly derivable from those — so it is enumerated as headings, at level
two, with a word prefix. Round 2's `R03` has four level-3 sections against a recorded 9. The honest
statement is that identifier headings appear at level two or three, sometimes with a word prefix and
sometimes backtick-wrapped, and that where a report enumerates advisories inline the recorded value was
produced by hand.

This paragraph used to end "the rule as written fits the `completion-reviewer` reports and no others",
and round 11 measured that false by fifteen reports: the rule reproduces all four
`implementation-reviewer` rows, all six stage `qa-gatekeeper` rows from round 5 on, and five of the six
P1d rows. A permissive reading — the identifier anywhere in the heading — reproduces only 8 of 27, so it
is not the reading either. The sentence was a claim about how the reports are written, asserted over
fifteen reports it had not been run against, in the paragraph whose whole subject is that counts must be
derived rather than described. Round 7's P1d slot is the one corrected: it recorded **3**
where its own report enumerates `M1` and `A1`-`A7` — eight — which round 7 had already reported for the
round-6 pack and round 8 found again in the pack sealed at HEAD, so the seal event carried the defect
forward instead of catching it. That pack is re-sealed, with the old value kept as `superseded:`. The
other five disagreements are left as written and recorded here rather than edited, because re-sealing
five packs to move a bookkeeping figure rewrites more history than it repairs; the rule they follow is
stated instead, which is the alternative round 8 offered.

Rounds 9 and 10 were absent from this table while the paragraph above it said the counts are "derived
from the packs on disk" — round 10 found it, and the omission is the same class as every other count in
this record that nothing computes: the derivation was performed once, by hand, and then described as a
property. Both rounds' slots agree with their `summary.json` because both were written from the same
mechanical count.

Round 8's pack is now closed: both reports had landed, so its `summary.json` was written from the same
derivation as the table above and the pack sealed. It is the first pack whose recorded counts and derived
counts agree by construction rather than by luck.

**Round 3's stage-level `qa-gatekeeper` did not run**, and that is a deviation rather than a choice
about scope: `agent-routing.yml` has it **mandatory and blocking** for the review phase. Its slot went
to the P1d re-route, which is a different, narrower gate on a single artifact. Round 4 closed the gap
and its report is the one that found v4's name-matching. Recorded here because round 4's
`completion-reviewer` found it undisclosed — it was in the commit message and the round-4 request, and
not in this record.

### The full profile

`validate --profile full` reports **`error=4`** at this stage's HEAD, and `build` runs that profile.
Two are `QFAI-ATDD-111` / `-112` **unscoped** — 12 US across five specs and 15 TCs across four, of which this spec owns 1 and 8; `build` needs all fifteen; the other two are `QFAI-REVIEW-004` / `-005` against
**this stage's own in-flight review pack** — a pack cannot satisfy the layout contract until its last
reviewer has landed and it has been sealed. Round 4's gatekeeper found this undisclosed, and it is the
same class of gap as the two packs that were missing `summary.json`: masked in CI only because the
`tdd` step fails first on `error=2`.

P1d's gate is **closed** — it passed at pass 6 and round 8 did not re-route it, because re-deciding a
decided gate is not a review. A ninth stage round is owed. This stage does not claim its own repairs
reviewed.

## Final status (PASS/FAIL) + who confirmed

**FAIL — incomplete by this skill's own Definition of Done.**

What was achieved: eight of `spec-0017`'s nine `US-*` are covered from `tests/e2e/**` with real
assertions — one of them rewritten to execute the shipped step rather than read it — across five
oracle rounds against the shipped tree, six behavioural rounds on the version resolver (`E6`-`E11`),
sixteen falsification rounds on the matrix pinning test (`M1`-`M7`, `X1`-`X6`, `Y1`-`Y3`), three on
the ledger ratchet (`R1`-`R3`), three on the loop guard (`G1`-`G3`), seven on the matrix record's own
prose (`Q1`-`Q7`), thirteen on the retracted-claims guard (`W1`-`W13`), five on the derived-count test
(`C1`-`C5`) and an in-suite sweep over every grammar member of the classifier — all defined under
§ "Execution logs", which round 5 found they were not, and renamed off `L*`/`Z*` because `L1`/`L3`
collided with the layer codes and `Z1`-`Z4` had been used in a review pack for mutations recorded as
reddening **nothing**. This sentence named `X7`, `X8` and `X9` for three rounds, which exist nowhere
since the second family was renamed `Q*`, counted that family as four where it holds seven, and omitted
the `W` family and the sweep entirely — a tally of the measurements, wrong about the measurements, in
the section that certifies them; the shipped-tree gap is measured at step-body level; the ordering claim this
stage had asserted is now enforced by a script that exists and is tested; and a repo-wide defect
affecting 16 other specs was found and filed.

What is not satisfied:

- **`US-0017-0007` is uncovered**, so `QFAI-ATDD-111` reports it and the scoped gate is `error=2`;
- the stage's own gate `validate --profile atdd --fail-on error --spec 0017` exits 1;
- **both rows are still `todo` in the ledger.** `tdd/test-list.md:107-108`, `DR-ID: -`,
  `Blocked-By: -`. Nothing has moved, and the two statuses below are what the handover asks
  `/qfai-implement` to write rather than what it has written;
- `TDD-0070` is **not yet** `exception`, and what it now waits on is the **ledger write**, not the
  gate. The P1d `qa-gatekeeper` PASS on `DR-0017-0010` was granted at pass 6; P1d returned `REVISE` five
  times before it, each time sustaining the row's own account and failing the record around it. An
  earlier version of this line named the gate as the outstanding item and then said in its next clause
  that the gate had passed. Round 3 caught an earlier version of this line asserting the row "is parked at
  `exception`"; round 4 caught the same assertion surviving elsewhere in the file. Both are gone;
- `TDD-0069` is **not yet** `blocked` either, though `blocked` needs no P1d PASS. Step 3b leaves a row
  at `todo` while its handover entry is malformed, and P1d's third pass found this one
  self-contradictory. The status is right on the merits — `CR-20260820-0012` is an unresolved Change
  Request, and P1d sustained the classification on the ground that a stage laundering a verdict would
  have kept `exception`, which satisfies completion, rather than taking `blocked`, which prohibits it;
- Stage Minimum Roles were not used for P2-P4 — the reviewer gate ran, the work orders did not.

Confirmed by: **one gate has passed, and it is the narrow one.** Counted from the packs on disk:
**twelve** rounds, **32** reviewer responses, **31 REVISE and one PASS** — the PASS being P1d's sixth
pass on `DR-0017-0010`. No stage-level gate has passed. Every earlier version of this line was a round
behind, which rounds 4, 5, 6 and 7 each said; the numbers here are derived from
`.qfai/review/review-2026082*/R0*.md` **from `review-20260820200000000` onwards** rather than
remembered. The boundary is load-bearing and the recipe omitted it for two rounds: that glob also matches
`review-20260820140000000` and `review-20260820180000000`, which are `/qfai-implement` packs of three
responses each, so a reader following the stated recipe gets **27**. `stageEvidenceCounts.test.ts` has the
boundary as an explicit `FIRST_PACK` constant; the prose did not, so the number was right and
unreproducible.

**These three numbers are now derived, and round 11 is the first round to test that.** Creating this
round's pack directory moved the round count from ten to eleven and the guard failed the same commit,
before any reviewer had read anything — which is what five earlier rounds' findings were about, each of
them a version of this sentence written one round behind. The response count and the verdict split will
move again when the reports land, and the guard will fail again then. Two of the three are computed from
`.qfai/review/review-2026082*/R0*.md` from `FIRST_PACK` onwards; the third is pinned by having to sum to
the second, because a verdict is not written in any parseable form by more than two of twenty-nine
reports and inventing a marker now would pin only the reports written after it.

| round | reviewers                                                             | revision   | verdict          |
| ----- | --------------------------------------------------------------------- | ---------- | ---------------- |
| 1     | `completion-reviewer`, `qa-gatekeeper`                                | `8fb48002` | REVISE           |
| 2     | `implementation-reviewer`, `completion-reviewer`, `qa-gatekeeper`, P1d | `56daee8d` | REVISE           |
| 3     | `implementation-reviewer`, `completion-reviewer`, P1d — **no stage `qa-gatekeeper`** | `1473897a` | REVISE |
| 4     | `completion-reviewer`, `qa-gatekeeper`, P1d                           | `54d8d325` | REVISE           |
| 5     | `completion-reviewer`, `qa-gatekeeper`, P1d                           | `3f815725` | REVISE           |
| 6     | `completion-reviewer`, `qa-gatekeeper`, P1d                           | `cb91e089` | REVISE           |
| 7     | `completion-reviewer`, `qa-gatekeeper`, P1d                           | `9a37421c` | REVISE, **P1d PASS** |
| 8     | `completion-reviewer`, `qa-gatekeeper` — stage gates only             | `dbe00247` | REVISE           |
| 9     | `implementation-reviewer`, `completion-reviewer`, `qa-gatekeeper`     | `05a97202` | REVISE           |
| 10    | `implementation-reviewer`, `completion-reviewer`, `qa-gatekeeper`     | `a66be5c6` | REVISE           |

Round 9 routed the `implementation-reviewer` as well, because the helper and the four guards changed
substantially; `agent-routing.yml` has it **conditional** rather than blocking, and its report says so.
Its 25 findings are applied all the same.

**All three of round 9's reports were untracked when the round closed**, exactly as round 8's two were.
`.gitignore:61` ignores `.qfai/review/*`, so a pack reaches the repository only by `git add -f` — and
the countermeasure round 8 recorded, `git status --porcelain --ignored` on the pack directory before
sealing, is what caught it this time.

P1d's trajectory is the one that terminated: passes 1-3 found the reasoning wrong, pass 4 **released**
`todo -> blocked` for `TDD-0069`, pass 5 found nothing wrong with the reasoning and held on two
sentences about the review, and pass 6 passed. The stage-level set has not shrunk the same way — round
6 gave 10 blocking and round 7 gave 11, and round 7 observed that two of its own findings were ones a
prior round had located precisely and that were not applied. That is a fair description of what
happened, and the countermeasure taken this round is to apply a located finding by **grep after the
edit** rather than by editing the sites I happen to find.

Round 1's pack, for continuity:

- `completion-reviewer` — `.qfai/review/review-20260820200000000/R02_completion-reviewer.md`
- `qa-gatekeeper` — `.qfai/review/review-20260820200000000/R03_qa-gatekeeper.md`

### Review packs and their seals

**Twelve** packs, one per round. The seal is *supposed* to be fixed at the moment the last reviewer
response lands, and § "When each pack was actually sealed" below measures four of seven closed packs
missing it by one to three commits. This sentence asserted the practice for two rounds while its own
table refuted it and before this
record's verdict was written. The count is derived —
`packages/qfai/tests/assets/stageEvidenceCounts.test.ts` compares the packs named here against the
directories on disk — but the **word** was not, and it said "Three" in round 4 and "Four" from then
until round 7 caught it. It is now measured with the rest. Rounds 2 and 3 were **missing their `summary.json`** until round 3 found
it; round 4's was missing until round 4's gatekeeper found the same thing again, this time as two live
`--profile full` errors. Each was written, then sealed — the same sequence round 1's pack went through,
which this record had documented while leaving the next pack in the state it described, twice.

The count itself was wrong until now: this section said "Three packs" against four directories, which
round 4's `completion-reviewer` caught. It is now derived —
`packages/qfai/tests/assets/stageEvidenceCounts.test.ts` compares the packs this section names against
the directories on disk, and it caught the fourth seal missing on its first run, because the edit that
was supposed to add it aborted on a later needle and wrote nothing.

```text
Review pack:       .qfai/review/review-20260820200000000/            (round 1)
Review pack seal:  5c8cd42571c8baf5f2240515ee2fbd173892cecd09d53ace080900d5c74317e3
  superseded:      d8ac0a777dd38514574c63813e51b2e3d0140319d0c171c4190a0a94358967c9

Review pack:       .qfai/review/review-20260820220000000/            (round 2, + P1d pass 1)
Review pack seal:  305ffd6555799fd322db60c7afdddf1f920feb41006c2b9f1e66ac5c5983e77a

Review pack:       .qfai/review/review-20260821000000000/            (round 3, + P1d pass 2)
Review pack seal:  257e793b5c764a81532a01a0a422b28f2edbb986f41b0042e75a6b596d01bfd0

Review pack:       .qfai/review/review-20260821020000000/            (round 4, + P1d pass 3)
Review pack seal:  aaa2d2a6e16b2027169ec58e9419b6269af037ed4d6d632df17fdad604db35ff

Review pack:       .qfai/review/review-20260821040000000/            (round 5, + P1d pass 4)
Review pack seal:  5798d55711e1ff78dd8ae49e8e34c788de3a34f0744ef5fe4226517764263b62

Review pack:       .qfai/review/review-20260821060000000/            (round 6, + P1d pass 5)
Review pack seal:  d99dff9cf0a94bbcb18ca20df5b44d426b19f79f45699308b11ca6f726a96752

Review pack:       .qfai/review/review-20260821080000000/            (round 7, + P1d pass 6 — PASS)
Review pack seal:  022c3addd80a7d9a206f40dc9cfd913ecb555fa7d9458fe2895cffed17ea55b2
  superseded:      3d56fd2edd484c0ffb8cd2b91fe2de93b1e1d65fd93d6a4c6d5a94fe740e2a92   (its P1d finding count was 3 where the rule gives 8)

Review pack:       .qfai/review/review-20260821100000000/            (round 8 — stage gates only)
Review pack seal:  d2ef7d5c271225d32d1bc37cffed9cddbd49edb752ebb8fd73fa6de0e7e490de

Review pack:       .qfai/review/review-20260821120000000/            (round 9 — stage gates only)
Review pack seal:  0966ca41de6077e8fada920a5446a6cc73aca52a4bd9d40dd8983aa4c3899136

Review pack:       .qfai/review/review-20260821140000000/            (round 10 — stage gates only)
Review pack seal:  ec61ff8e51639781a5426ae68d5a29591c31bfa010d1c3bcbaaa95a48a6f8624
Review pack:       .qfai/review/review-20260821160000000/            (round 11 — stage gates only)
Review pack seal:  85c0d27221c6d887035a6e9bef3ff17eec6c6ade37e9442996ba6dfea2b4f043
Review pack:       .qfai/review/review-20260821180000000/            (round 12 — stage gates only)
Review pack seal:  IN FLIGHT — sealed when its last reviewer response lands
```

Round 8 routes no P1d pass. That gate closed at round 7 and re-routing a closed gate would be asking a
reviewer to re-decide something already decided; what round 8 reviews is the stage, which has never
passed.

**Round 8's two reviewer reports were not in version control at all** until this commit, and that is
worth recording plainly because nothing was watching for it. `.gitignore:61` ignores `.qfai/review/*`,
so every pack's contents reach the repository only by `git add -f`; rounds 1 through 7 were force-added
and round 8's were not, so for the length of the round the evidence cited findings from two files that
existed in one working tree and nowhere else. The seal cannot catch this — it hashes what is on disk, and
what is on disk was right. `git status --porcelain` cannot either: an ignored file is not untracked
output, it is invisible. What would have caught it is `git status --porcelain --ignored` on the pack
directory, which is now part of sealing a pack.

**When each pack was actually sealed, traced with `git log --diff-filter=A` rather than described.**
`SKILL.md` fixes the seal at the moment the last reviewer response lands. The table is the claim; the
sentence that used to summarise it said "four of the seven closed packs" and went stale as packs closed,
which is the third count in this record to fail that way. Read the rows:

```text
round  last report at   summary.json at   gap
  1    58c29d9f         58c29d9f          same commit
  2    a241b90e         2d3426aa          3 commits
  3    2d3426aa         2d3426aa          same commit
  4    0cfa67c9         0cfa67c9          same commit
  5    c40b2358         cb91e089          1 commit
  6    ac4700d1         9a37421c          1 commit
  7    9882a1d4         dbe00247          1 commit
  8    aab29486         aab29486          same commit
  9    a163b52a         a163b52a          same commit
 10    225a242e         225a242e          same commit
 11    2ee4874b         2ee4874b          same commit
```

Row 9 said `(this commit)` for a round. Round 9's own `m3` made exactly that objection about row 8 and
required `aab29486` written in; row 8 was corrected and row 9 was written in the same defective form in
the same commit. `(this commit)` names nothing a later reader can resolve — the commit it referred to is
not HEAD any more, and was not HEAD by the time the next reviewer read it. **A row whose value is
"wherever you are standing" cannot be checked**, which is the property this table exists to provide.

This section told the rounds-3-and-4 version of that story — "written first, then sealed" — for two
rounds after it had stopped being true of the majority. Nothing was laundered in any of the gaps: round
8 verified that independently, and the seals recompute over the current bytes. It is an **auditability**
gap rather than an integrity one, and the honest statement is the table, not a practice claim.

Round 5's pack was **missing its `summary.json`** when its reviewers landed, for the third time in
five packs. Written first, then sealed — the order matters, because sealing an incomplete pack and
sealing it again is exactly the sequence the recorded-versus-recomputed rule exists to make visible,
and round 1's pack has both values recorded for that reason. `packages/qfai/tests/assets/stageEvidenceCounts.test.ts`
now recomputes every **closed** pack's seal from its files rather than counting how many seals appear,
which round 5 found the previous version doing.

**The newest pack carries no seal, and that is the contract rather than an omission.** `SKILL.md` fixes
the seal at "when the last reviewer response lands", while the practice that stopped the tree moving
under round 1's reviewers commits the request **before** they launch. So a pack under review exists and
cannot yet be sealed. The first version of
`packages/qfai/tests/assets/stageEvidenceCounts.test.ts` required a seal for every pack on disk and
therefore **made the suite red at the commit that added it** — in `tests/assets/**`, which runs in the
`e2e` project and is a required CI leg. Round 5's gatekeeper measured it: `test:e2e` exit 1, and
`ci-pass` failing on two jobs rather than one. The rule is now two rules: every **closed** pack must
carry a seal that recomputes, and the **in-flight** one must be named without one.

Serialization, stated because it is load-bearing: each manifest line is
`<git hash-object><single space><path><LF>`, paths relative to the pack root in `LC_ALL=C` order, with
**every file's line endings normalised to LF first**, and the seal is a sha256 over that byte stream.

**The normalisation is the whole of it, and this record got it backwards once.** `.gitattributes`
carries `* text=auto eol=lf`, so a file written with CRLF is stored LF-only and every checkout sees LF
— while `git status` stays clean, because the filter runs on the way in. Exactly one file
across these packs is in that state: round 7's `qa-gatekeeper` report, 423 CRLF in this working tree and
0 in its blob. The first six packs were LF-only throughout, which is why every round of agreement
between a filtered hash and a raw-byte hash was luck.

Round 8 recorded the **raw-byte** value on the reasoning that an unfiltered hash is the honest one. It
is not: `stageEvidenceCounts.test.ts` reads working-tree bytes, CI runs `ubuntu-latest`, and
`tests/assets/**` is in the `e2e` project — a required matrix leg — so that value made the test pass
here and fail from a clean checkout. Round 8's `completion-reviewer` measured both. The recorded value
is the LF-normalised one, which is what the committed blob hashes to and what every checkout will
recompute. The first version of this record printed the manifest with
**two** spaces while the recorded seal used one — a reader recomputing from the printed block would have
got `fa8d6e836cabd14a6cdbc12dd8b9dd538bbe971a40cd4bf27b252160d17e2526` and read a legitimate pack as
tampered. Round 2 found that; round 3 confirmed both the corrected value and the two-space value
reproduce exactly as stated.

**Why round 1's superseded seal is recorded rather than dropped.** The re-seal added `summary.json`, and
"the pack gained a required artifact" is equally compatible with the reports having changed too — so the
*reasoning* would launder an illegitimate re-seal. What discharges it is that the first seal still
reproduces over the three reports **as they stand now**, which both round-2 and round-3 gates
recomputed independently. Recording the superseded value is what makes that check possible.

**That discharge covers round 1 and not round 7, and the difference is what makes it a discharge rather
than a formula.** Round 1's re-seal added a file and changed none, so the earlier value still recomputes
over the earlier set and the recomputation is the evidence. Round 7's re-seal **changed** its
`summary.json` — the findings count was corrected from 3 to 8 — so its superseded value recomputes over
nothing that exists, and no recomputation can distinguish that legitimate correction from a rewrite.
What stands in its place is weaker and is stated as weaker: the edit it preceded is named in the row, the
corrected count is derivable from the report's own headings, and the reports themselves are unchanged
between the two seals. Round 9 asked for both halves of this and only the first was written.

At completion, each seal is recompared against **these recorded values**, not against a value re-read
from the working tree: `## Final status` is outside every audit subject, so a tree-read expectation could
be rewritten in the same pass that edited a pack and every recomputation would still agree.

Round 1's manifest, in the hashed form:

```text
a65a209bbfd37911c5b4ef2424adf605057d9029 R02_completion-reviewer.md
110eb05456bf0d1f1570e7c4518a1001ac9a2bd4 R03_qa-gatekeeper.md
ba2f2c08e56c777846ca904c072db8e2a4922dec review_request.md
39c7e5072cfa7b0d0409c454548ce6948f9fe94c summary.json
```
