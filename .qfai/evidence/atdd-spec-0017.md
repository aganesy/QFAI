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
- `.qfai/specs/spec-0017/tdd/test-list.md` — read, never written. 83 rows: 72 `Integration`,
  11 `Unit`; **74 `refactor`, 6 `blocked`, 3 `todo`**. The three `todo` rows are `Integration` and are
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

- _"writing test cases for the two partly observable obligations as if a gate existed … a row that
  cannot fail looks like coverage"_ — this is exactly what `US-0017-0007` had become. Its one
  assertion could not fail for any project `qfai init` produces. Withdrawing the claim follows the
  delta's `DO NOT` rather than working around it.
- _"splitting the test-case set across two markdown tables"_ — not touched; this stage did not write
  `06_Test-Cases.md` at all.
- _"recording the size breach as a SPLIT candidate"_ — not proposed.
- `07_Decisions.md`'s rejected alternatives concern validator placement, ledger timing and the own
  tree's validate copy. This stage added a **script** under `scripts/`, which is the accepted shape
  (`DR` rejected "a validator rule under `src/core/validators/**`" and "a second parser over the
  same surface"); `check-atdd-annotation-ledger.mjs` introduces no second parser of any spec
  artifact — it reads an annotation ledger and test sources, neither of which any validator parses.

**Re-run against every artifact added since**, because for five rounds this section reasoned only about
the round-1 and round-2 set and each round faulted it for that — and then round 12 found the two artifacts
of round 12 absent from it, one round after that sentence was written. Making the promise is not keeping it,
and for two rounds the check that would keep it did not exist: nothing tied this table's rows to the
files this stage added, so the promise was renewed each round and the table stayed short. **Round 15's
`completion-reviewer` found the two artifacts the spec's central claim rests on missing from it** — the
allowlist and its corpus — and pointed out that the tie is one assertion, because
`stageEvidenceCounts.test.ts` already holds the list. It now requires every tracked file to appear in this
table's first column. The gap was disclosed rather than papered over for two rounds, which was the right
behaviour and not a substitute for closing it.

The four record-deriving guards, the classifier they share, and the two artifacts that carry the boundary
are checked one at a time against all nine rejected options:

| artifact                                                      | nearest rejected option                                        | verdict                                                                                                                                               |
| ------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/helpers/buildCommand.ts`                               | "a second parser over the same surface" (`:133`)               | not that surface                                                                                                                                      |
| `tests/helpers/shippedLaneCommands.ts`                        | "a second parser over the same surface" (`:133`)               | not that surface: it reads workflow YAML and shell, which no validator parses                                                                         |
| `tests/unit/shippedLaneCommands.test.ts`                      | "a row that cannot fail looks like coverage" (delta)           | measured: the pre-repair helper lets every corpus entry through                                                                                       |
| `tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts`              | "a row that cannot fail looks like coverage" (delta)           | measured: every rule in it has been reddened by a plant in the shipped tree                                                                           |
| `tests/integration/scripts/checkAtddAnnotationLedger.test.ts` | same                                                           | measured                                                                                                                                              |
| `tests/unit/buildCommand.test.ts`                             | "a row that cannot fail looks like coverage" (delta)           | measured, not assumed                                                                                                                                 |
| `tests/assets/coverageDepthMatrix.test.ts`                    | same                                                           | measured                                                                                                                                              |
| `tests/assets/stageEvidenceCounts.test.ts`                    | same                                                           | measured                                                                                                                                              |
| `tests/assets/retractedClaims.test.ts`                        | same                                                           | measured                                                                                                                                              |
| `tests/helpers/recordProse.ts`                                | "a second parser over the same surface" (`:133`)               | not a parser at all: one line predicate, extracted because two of this stage's own guards answered "is a blockquoted line an assertion" opposite ways |
| `tests/e2e/spec0017RunnerParallelismE2E.test.ts`              | "a row that cannot fail looks like coverage" (delta)           | measured, and the fixture rebuilt when round 12 showed it could not express the inert state                                                           |
| `tests/integration/spec0017OwnWorkflowScope.test.ts`          | "annotate a row the pack has not settled" (`CR-20260818-0007`) | **not annotated**, deliberately — see § "TC-0017-0016"                                                                                                |
| `packages/qfai/tsconfig.tests.json`                           | "a second gate over the same surface"                          | not a second gate: nothing was checking this surface at all                                                                                           |
| `CR-20260820-0012` option 5                                   | options 1-4, rejected in that CR                               | none reintroduced                                                                                                                                     |

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
  establish that **deleting a rule reddens the corpus**. That is a property of the _guards_. It says
  nothing about whether the _story's_ assertion can fail when a shipped lane contains a build, which is
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
  previous version of this bullet said "the option is not reintroduced _now_, in both senses" without
  that qualifier, which read as a general claim and was false as one.

  What answers the general claim is not a better spelling list. `shippedLaneCommands.ts` inverts the
  question — what may a lane INVOKE — so the assertion needs no corpus and fails closed, and the
  delta's Temptation ("a row that cannot fail looks like coverage") stops describing this row. The
  classifier keeps the own-tree job, where a miss is tolerable. Note also who measured: four of the five
  plantings were reviewers', not this stage's, and the story's discriminating power was only ever
  established from outside.

- **`CR-20260820-0012`'s own rejected options are not reintroduced.** Option 1 (narrow the signal to
  the affected lanes), option 2 (exempt a spec's in-flight TCs from the fatal gate), option 3 (waive
  the row) and option 4 (merge first, then satisfy it) all stay rejected: no gate was narrowed, no
  waiver was requested, and nothing was merged. **This sentence also said "`TDD-0069` is `blocked` with
  a `Blocked-By`" until round 18, and that has never been true** — the ledger has the row `todo` with
  `Blocked-By: -`, and `git log -S` finds no revision where it was otherwise. It was the wrong evidence
  for option 3 as well as false: what rejects a waiver is that none was requested. The gate found it in
  the one section of this record that is a mandatory confirmation, and it matters to that gate's own
  work, because Phase Red reads the `Blocked-By` cell to decide whether a row is skippable.

  **Option 2 has lost every stated ground it had, and this stage cannot supply another.** Its second
  reason was withdrawn during that CR's own review. Its first — that `QFAI-ATDD-111` has no ledger rows
  to exempt — was withdrawn by round 15's correction, because `US-0017-0007` is covered and the rule no
  longer fires for this spec. Round 16 offered a third, the unscoped strand, and round 17 refuted that
  too by measuring it: all fifteen TCs `QFAI-ATDD-112` names unscoped are `todo` or `blocked`, so an
  exemption for a spec's in-flight rows clears the rule outright rather than leaving other specs behind.

  **So the honest state is that option 2's rejection is unsupported, not that option 2 is right.** The
  option is `/qfai-implement`'s to decide and the CR is its record; this stage may not re-open it, and it
  may not leave a `No RE-OPEN is required` standing on three grounds that are gone. It is handed over as
  an open item: whoever owns `CR-20260820-0012` owes either a ground that survives or a re-opening.

  Two of the three withdrawals were this stage's own corrections, each correct in itself and each
  removing the support for a sentence elsewhere. That is the cost of correcting a record in place, and
  the reason a correction has to be followed to whatever cites it.

**No RE-OPEN is required for eight of the nine rejected options.** Option 2 of `CR-20260820-0012`
is the exception and is handed to that CR's owner above: its rejection has lost every stated ground,
which is not the same as the option being right and is not this stage's to decide. The bare sentence
stood here for a round after the bullet above it said it may not — round 18 found the two in the
same section contradicting each other.

## Decisions made (with rationale)

**1. The E2E surface for this spec is `qfai init`, not this repository's workflows.** `spec-0017` has
two halves, and the own half is already asserted directly against `.github/workflows/**` by
`tests/scripts/ownWorkflowTopology.test.ts` and `tests/scripts/workflowHygiene.test.ts`. So the one
end-to-end surface is: initialise an empty project and read what arrives.

The first version justified that with a premise — "a user story is about the adopter" — and round 1's
`completion-reviewer` read it against this spec's US catalogue, where it does not hold: `US-0017-0002`
says "**own-CI** supply-chain hardening", `-0003` "exactly once **in the repository**" with Non-goals
that _rule out_ shipping the mechanism, `-0005` "their own **own-CI** jobs and matrix legs", and
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
rounds 4-6 found, which all asserted over how code is _written_ rather than what it _does_.

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
found both halves. The script now exists as `scripts/check-atdd-annotation-ledger.mjs` with 63 tests
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
behaviourally, and the row rose to `✅`. Round 1 also recorded that five of the nine stories name the
own tree explicitly, so "a user story is about the adopter" is stated as a named deviation with the
own-tree assertions cross-referenced per story, rather than as a premise.

That experiment also produced a repo-wide finding this stage did not go looking for: **127 of the 208
claims in `tests/e2e/qfai-traceability.md` are backed by no annotation in any E2E test file** (126
across every test directory in the repository). `spec-0017` is the only spec at zero. `spec-0012`
alone has 28. Filed as `CR-20260820-0011`; not this spec's work, recorded as a cross-spec obligation.

## Work performed (what changed, where)

- **new** `packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts` — 13 tests across 8
  annotated describes, one describe per covered user story, plus a block comment where
  `US-0017-0007`'s was, recording why the claim was withdrawn rather than leaving its absence to be
  inferred
- **appended, then partly reverted** `tests/e2e/qfai-traceability.md` — nine
  `QFAI:SPEC-0017:US-0017-NNNN` lines, of which `US-0017-0007`'s was removed in round 1
- **new** `.qfai/evidence/coverage-depth-spec-0017.md` — the Coverage Depth Matrix, committed
- **new** `scripts/check-atdd-annotation-ledger.mjs` — the guard this record had claimed existed
- **new** `packages/qfai/tests/integration/scripts/checkAtddAnnotationLedger.test.ts` — 63 tests
- **new** `packages/qfai/tests/helpers/shippedLaneCommands.ts` — the shipped-lane allowlist, and the
  answer to a question ten versions of the classifier could not settle. It asks what a lane **invokes**
  rather than whether a command **is a build**, which needs no corpus of build spellings and fails
  closed
- **new** `packages/qfai/tests/unit/shippedLaneCommands.test.ts` — 14 tests. The falsification: every
  form rounds 8, 9, 10 and 11 planted, all refused, and the shipped tree's own shapes accepted. Round 11
  added three, and what they cover is the class the first five could not: the corpus was 62 BARE commands,
  so wrapping any of them in one shell construct escaped 61 of 62. It is now checked wrapped as well as
  bare, by root cause as well as by spelling
- **new** `packages/qfai/tests/helpers/buildCommand.ts` — the build classifier, extracted from the
  E2E so its corpora can be tested on their own
- **new** `packages/qfai/tests/unit/buildCommand.test.ts` — 27 tests over the corpora enumerated
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
- **new** `packages/qfai/tests/assets/coverageDepthMatrix.test.ts` — 6 tests deriving the Coverage
  Depth Matrix's totals, partition, class assignment, per-class justification and row width from the
  table itself
- **new** `packages/qfai/tests/assets/stageEvidenceCounts.test.ts` — 13 tests deriving this record's own
  counts from the artifacts they describe, after every review round found at least one that the tree
  did not hold. The eighth derives `## Final status`'s own round and response counts, which were correct
  and underived through five findings of exactly that shape
- **new** `packages/qfai/tests/e2e/spec0017RunnerParallelismE2E.test.ts` — 2 tests, and the first
  assertion this story has ever had over an EFFECT rather than a declaration. It spawns a fixture suite
  twice through the real `rootKnobs` and observes the pool: peak simultaneously-live files is 1 at one
  worker and greater than 1 at four. Its fixture mirrors the root/project split, because the flat version
  could not be put into the one inert state `vitest.knobs.ts` records
- **new** `packages/qfai/tests/integration/spec0017OwnWorkflowScope.test.ts` — 2 tests over the own
  workflows, **neither annotated**: `CR-20260818-0007` and `CR-20260820-0001` are open and name both rows
  in their blocked sets, so annotating either would discharge a gate finding that is a pending decision's
  only remaining signal
- **new** `packages/qfai/tsconfig.tests.json` — type-checks the test files this stage authored, which
  nothing had been doing: `tsc -b` covers `src/**` only, so every "check-types clean" claim about a test
  file was empty. `pnpm check-types` runs it, and `eslint.config.js` re-enables the four promise rules over
  the same set
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
  -> Tests 13 passed (13), exit 0
     (9 before US-0017-0007 was withdrawn, 8 after, 9 again once US-0017-0003
      gained the positive-half assertion round 1 showed was available; briefly 11
      while the classifier corpus lived here, before round 4 moved it to
      tests/unit/buildCommand.test.ts where it belongs)
pnpm -C packages/qfai exec vitest run --project unit tests/unit/shippedLaneCommands.test.ts
  -> Tests 14 passed (14), exit 0
     (the 11th is the sweep's corpus: one assertion over every mechanism it
      confirmed executing, added with the repairs that close them. The 12th is
      the digest collision found by attacking the new gate rather than by a
      review round)

node scripts/check-atdd-annotation-ledger.mjs --spec 0017
  -> check-atdd-annotation-ledger: 9 claim(s) backed by a test annotation (spec-0017), exit 0

node scripts/check-atdd-annotation-ledger.mjs        (repo-wide)
  -> exit 1; 127 unbacked claims; see CR-20260820-0011 (the denominator is not stated: this stage's
     own US-0017-0007 annotation moved it, and it moves whenever any spec adds one)

pnpm -C packages/qfai exec vitest run tests/integration/scripts/checkAtddAnnotationLedger.test.ts
  -> Tests 63 passed (63), exit 0
pnpm -C packages/qfai exec vitest run tests/assets/coverageDepthMatrix.test.ts
  -> Tests 6 passed (6), exit 0
pnpm -C packages/qfai exec vitest run tests/assets/stageEvidenceCounts.test.ts
  -> Tests 13 passed (13), exit 0
pnpm -C packages/qfai exec vitest run tests/assets/retractedClaims.test.ts
  -> Tests 11 passed (11), exit 0
pnpm -C packages/qfai exec vitest run --project e2e tests/e2e/spec0017RunnerParallelismE2E.test.ts
  -> Tests 2 passed (2), exit 0
pnpm -C packages/qfai exec vitest run --project integration tests/integration/spec0017OwnWorkflowScope.test.ts
  -> Tests 2 passed (2), exit 0
pnpm -C packages/qfai exec vitest run --project unit tests/unit/buildCommand.test.ts
  -> Tests 27 passed (27), exit 0

node packages/qfai/dist/cli/index.mjs validate --profile atdd --fail-on error --spec 0017
  before this stage:  info=2 warning=0 error=2   QFAI-ATDD-111 (9 US), QFAI-ATDD-112 (8 TC)
  after round 1:      info=2 warning=0 error=2   QFAI-ATDD-111 (1 US: US-0017-0007), -112 (8 TC)
  at this revision:   info=2 warning=0 error=1   QFAI-ATDD-112 (8 TC); -111 clear
                      run-log .qfai/report/run-20260822024224027
  artifact:           .qfai/report/validate.spec-0017.json      (tracked, and the re-run above left it
                      byte-identical, which is the invariant this record states in place of a number)
  per-run directory:  regenerated by the command above; not tracked, because its name is a
                      timestamp the next run will not reproduce
  side effect:        the command REWRITES `.qfai/report/validate.log`, which is tracked — and so
                      does `vitest run`, which round 16 measured and this note did not cover, so a
                      reviewer who touches nothing but the suite still dirties it. Anyone who
                      runs it dirties the working tree, and on a round where the rule is that the
                      subject does not move, that is a trap for the reviewer rather than for the
                      stage — both of round 14's non-gate reviewers reported the dirty file and one
                      declined a measurement because of it. Restore it from `git show HEAD:<path>`
                      afterwards, not with `git checkout`, and cite the scoped JSON above rather than
                      the log: the pointer is shared by every run, scoped or not, and nothing
                      serializes it.
```

**`.qfai/report/specs-coverage/spec-0017.md` is untracked, not absent.** Round 9 named it as an input
it could not read, and this paragraph said the file "does not exist" and that the directory held
`spec-0001.md` through `spec-0007.md`. Round 14's gatekeeper measured the directory: **seventeen** files,
`spec-0001.md` through `spec-0017.md`, all written 2026-08-21, `spec-0017.md` among them at 4475 bytes.
Only `spec-0012.md` is tracked, which this paragraph had right.

The conclusion survives — the citation is dropped rather than the file committed, for the same reason as
the run directory: it is regenerable output produced by a `--profile full` run, and running the profile
is the reproducible path — but the reason given for it was a statement of fact about the tree that the
tree contradicts, told to a reviewer for whom that path is a named input. Recorded rather than quietly
corrected, because it is this record's own recurring class: a claim about the tree, written once and
never re-measured. Coverage there was clean when they did — every `AC` with 2-3 `TC`, every
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
recurring class again.

The design is a split. A program that cannot reach a build whatever its arguments is allowed **by name**; a
program that could is allowed only as an **exact invocation**, so `npx qfai` ships and `npx tsup` does not,
though they are the same program. It needs no corpus of build spellings, cannot be evaded by a spelling
nobody has written, and fails **closed** — an innocent new program breaks the test, which is the right cost
for a shipped surface.

**No numeral for either list is stated here**, and the sentence that used to state one is worth recording
rather than merely deleting. It read "Measured: 55 of 55 planted builds refused, 6 of 6 shipped shapes
accepted", against a corpus that held 62 and 8. Round 11 confirmed nothing derived the pair by rewriting it
to "3 of 3 … 1 of 1" and finding the whole suite green — and round 12 then found that my repair had ADDED
the retraction and left the refuted sentence three lines above it, with a dangling clause where the earlier
edit had cut. Both lists grow every round, for the same reason the classifier's corpora do;
`tests/unit/shippedLaneCommands.test.ts` holds them and asserts the property.

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
  structurally invisible to it, because `GOVERNANCE` HELD records and not the guards that read them
  — true when written, and false since round 15 widened it to this stage's own source files.
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
  Two of the three are now derived from the packs on disk. The verdict split is not derivable, so what is
  pinned is the arithmetic: the
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

**Round 12 found that nothing type-checks this stage's own tests, which makes several of this record's
verification claims vacuous.**

`packages/qfai/tsconfig.json` includes `src/**` only, so `tsc -b` has never read a test file — and
`eslint.config.js` disabled type-checked rules over `**/tests/**/*.ts`, which turns off
`no-floating-promises`. **Every "check-types clean" statement this stage made about a test file was
therefore empty**, and the async conversion's six missing `await`s are the measured consequence: they
passed `tsc -b`, `tsc --noEmit` and `eslint . --max-warnings 0`, and surfaced only because a DIFFERENT
test began asserting the absence of a warning it now received.

Falsified both directions, which is what distinguishes the two gates. Dropping an `await` whose result is
USED: `tsc` catches it (`Type 'Promise<string>' is not assignable to type 'string'`). Dropping one whose
result is DISCARDED — the shape five of the six actually had: **`tsc` misses it, because a dropped promise
is a valid statement, and only `no-floating-promises` catches it.**

`packages/qfai/tsconfig.tests.json` now type-checks the files this change authored, `pnpm check-types` runs
it, and the four promise rules are on for exactly that set. **The scope is stated rather than assumed**: the
whole tests tree reports **212** type errors across 415 files and **54** within spec-0017's own files,
concentrated in `tests/scripts/`. This stage has no mandate for that cleanup, so it is a measured number
someone can act on rather than a silent widening — and the class is closed where it was introduced.

**The allowlist leaked again, in four more ways, and one was in the shipped file already.**

Round 12 planted into the shipped `unit` lane and three of four shipped unnoticed through 2829 tests. All
four are now refused, and the sharpest is the one that needed no invention: a **one-line function
definition**. `commandsOf` splits on `;`, so `build_once() { pnpm -C packages/qfai build; }` arrives as one
command whose head is `build_once()`, `invocationOf` answered `NOTHING`, and the body went with it. I wrote
that branch one commit after fixing the identical defect for keyword heads and `case` arms — and
`qfai-tests.yml` already defines `emit() { echo "$1"; }` on one line, so the scanner had been reporting
nothing for the shipped file's own idiom all along.

The other three each needed a different kind of answer:

- **`echo x|npx tsup`** — the pipe split required a SPACE, because an unspaced pipe also appears in a
  `case` pattern alternation. Splitting unconditionally was my first fix and it broke what the space rule
  protected: sixteen false refusals in the shipped tree. Neither rule was about spacing. A `|` is an
  alternation when a `)` is reachable before any `;`, newline or `(` — decidable locally, and both
  earlier rules were answering the wrong question.
- **`node -e "…execSync('pnpm build')"`** — a payload is code, and no command scanner reads code. Not a
  denylist of suspicious substrings, which is the fail-open direction this instrument was rebuilt to
  escape: the two shipped payloads are enumerated by digest and every other is refused.
- **`shell: npx tsup {0}`** — a step's `shell:` is a command template and nothing read it. The same shape
  as the job-level `uses:` the previous round closed: a channel one level from where anyone had looked.

**Four more escape classes, each a different mechanism, and one of the repairs was wrong twice before it
was right.**

- **A one-line `case`.** `case $x in *) npx tsup ;; esac` — `case` answered `NOTHING` for the whole
  segment and discarded the arm. The multi-line form worked only because `commandsOf` splits on `;` and put
  the arm in its own segment. `case` and `select` now skip past their `in` and keep reading; `for` still
  terminates, because what follows its `in` is a word list.
- **A substitution removed from its word.** `commandsOf` entered `$( … )`, scanned it, and DELETED it from
  the surrounding word — so `node $(echo build.mjs)` left a bare `node`, which is allowed. **This repair
  went wrong first**: making any command containing a removed substitution unreadable refused a real
  shipped line, `if [ "$(git rev-parse --is-shallow-repository)" = "true" ]`. The distinction it was missing
  is the one the by-name list already encodes — a substitution among `[`'s arguments cannot reach a build
  because nothing among `[`'s arguments can, while a substitution deciding which `node` invocation runs is
  the invocation. Scoped to programs that are not name-allowed.
- **An assignment prefix whose value names a program.**
  `GIT_EXTERNAL_DIFF=./ext-diff.sh git diff --ext-diff HEAD` runs an arbitrary script and the prefix skip
  made it invisible. A value that is a path or a script file is refused; `IFS=`, `NODE_ENV=production` and
  `declared=…` are not.
- **`bareArgumentsOf` breaking at an opaque flag**, so `npm install -e foo left-pad` reported zero bare
  arguments and `TAKES_NO_PACKAGE` passed a command that installs a package. Fixing that exposed a second
  defect in the same pair: `bareArgumentsOf` counted from index 1, assuming token 0 is the program, so
  `NODE_ENV=production npm ci` yielded two arguments and was refused. **Two coordinate systems in one small
  pair of functions** — the classifier's `namesACommand` defect, in a second instrument — so the prefix walk
  is extracted and both callers share it by construction.

The pipe rule is worth recording separately, because both previous versions were answering the wrong
question. Requiring a SPACE let `echo x|npx tsup` read as an invocation of `echo`. Splitting
unconditionally broke what the space rule protected — `case` pattern alternations fragmented into glob
heads with no `)`, sixteen false refusals in the shipped tree. Neither rule was about spacing: a `|` is an
alternation exactly when a `)` is reachable before any `;`, newline or `(`.

### Round 12 findings that did not reproduce, with the measurement

- **`R03 B2` — "`QFAI-ATDD-111`'s closure rests on a test that is red at HEAD".** Not reproduced. The test
  passes at HEAD, twice measured, in 6.3s; the mechanism given (a bare `vitest/config` import unresolvable
  from `os.tmpdir()`) does not apply, because vitest resolves its own config imports through its own
  loader. The one failing e2e test at that revision was `stageEvidenceCounts`, reacting to this round's
  reports landing — the derived-count guard doing its job. A misattribution rather than a defect.
- **`R01 M1` — "a project-level `poolOptions.forks.singleFork: true` gives PEAK=1 at four workers while the
  new E2E stays GREEN".** Not reproduced: the mutation **reddens** the test. Both reviewers reported the
  subject moving under them, and this stage was editing the helper while `R01` measured, so an intermediate
  state is the likely explanation. Recorded rather than dismissed, because the finding it would have been
  is a real one and the next round can re-run it against a still tree.

**And that is a defect of this stage's orchestration, not of either reviewer.** Round 11's `A5` was two
reviewers colliding, and the response — partitioning the asset tree by role — addressed the wrong half. This
round the collision was between the stage and its own reviewers: `R01` reports ten files edited beneath it,
four of them the helper under review, and one intermediate state reddening three tests. The rule that
follows is the same one in a wider form: **while a review round is in flight, the stage does not edit the
subject.**

**And the Coverage Depth Matrix had been held away from the tree by its own guard.** I updated the guard
for `US-0017-0007`'s restoration and left the matrix saying the story was uncovered, with seven `❌` cells
justified by "no knob file ships" — the reason this record retracts as a category error. Worse, the guard
still required the section to say "withdrawn", so correcting the matrix reddened a required CI leg. The row
is rescored with a reason per remaining `❌`, the partition re-derived (A 23, B 9, C 2 — 34 cells), and the
guard now demands the restoration and the carrier's name instead. Round 12 gave the new cell a class of
its own, `D`; round 14 merged it back into `C`, because both classes had been stated as a property that
named its single member's coordinates — which nothing can violate except a different cell — and the two
paragraphs then contradicted each other about how many such cells the table held. One property, two
members, and a roster the guard checks against the table.

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

`QFAI-ATDD-112` reports **eight** TCs, and an earlier version of this paragraph said they were "exactly
the parked rows". **That over-claimed twice**, and round 12 measured it per row against the decision
records' `Blocked set:` fields and the ledger's own `Blocked-By` column:

```text
TC-0017-0016   CR-20260818-0007  in blocked set    ledger row: blocked, Blocked-By: CR-20260818-0007
TC-0017-0030   CR-20260820-0001  in blocked set    ledger row: blocked, Blocked-By: CR-20260820-0001
TC-0017-0032   CR-20260820-0007  in blocked set    ledger row: blocked, Blocked-By: CR-20260820-0007
TC-0017-0033   CR-20260820-0007  in blocked set    ledger row: blocked, Blocked-By: CR-20260820-0007
TC-0017-0034   CR-20260820-0007  in blocked set    ledger row: blocked, Blocked-By: CR-20260820-0007
TC-0017-0035   CR-20260820-0007  in blocked set    ledger row: blocked, Blocked-By: CR-20260820-0007
TC-0017-0069   CR-20260820-0012  in blocked set    ledger row: todo, Blocked-By: -
TC-0017-0070   NAMED IN NO BLOCKED SET             ledger row: todo, Blocked-By: -
```

Seven of the eight are named in an open CR's blocked set. **`TDD-0070` is named in none**: `DR-0017-0010`
is its anomaly record, authorising an `exception` transition that has not been written. And for the last
**two** the LEDGER — which is where a reader looks — records `-`, so the parking exists in the decision
records and not in the artifact that indexes it.

The honest form: **every uncovered TC has a recorded reason somewhere, and for two of the eight that
reason is not where the ledger says to look.**

**The four middle rows of that table said `refactor` for two rounds and they are `blocked`.** Round 14's
`completion-reviewer` measured them against `tdd/test-list.md` directly: `TDD-0032`-`-0035` carry
`blocked` with `Blocked-By: CR-20260820-0007`, and have carried it since `bc36f08c`, 285 commits before
this one — so they were already `blocked` when the table describing itself as "measured per row" was
written. **The record contradicted its own derived tally in the same file**: § "Inputs reviewed" states
74 `refactor` / 6 `blocked` / 2 `todo`, `stageEvidenceCounts.test.ts` derives that from the ledger and
passes, and the six `blocked` rows are exactly `TDD-0016`, `-0030`, `-0032`, `-0033`, `-0034`, `-0035`.
A derived number and a hand-written one disagreed, and the derived one was right — which is the argument
this record makes everywhere else, failing on its own table. Recurring-class entry 5 and entry 8, again:
a table described as measured that was not re-measured.

**The disagreement it was pointing at is real and belongs to five other rows.** `CR-20260820-0007`'s
blocked set is nine rows, and `TDD-0052`, `-0066`, `-0067`, `-0074` and `-0075` are all `refactor` with
`Blocked-By: -` while that CR holds them. **None of the five is among the eight** this section is about,
so the finding had been attributed to rows that were already fixed and the rows that still carry it went
unnamed. They are outside this stage's remit either way — those cells are `/qfai-implement`'s to write —
but the accurate statement is the one this stage owes, not the tidier one.

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
failure surfaced as a _different_ test asserting the absence of a warning it now received. The type checker
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

### A second timeout, measured and left to its owner

`TC-0006-0018` (`tests/integration/spec0006DoctorProbeOrder.test.ts`) timed out at **15133ms** against a
15s limit during a four-project run at ten workers. Measured in isolation it takes **8.52s**, so it has
about 6.5s of headroom — tight, but not the state `TC-0003-0039` was in, which spent its entire budget with
the machine idle.

**It is not the same defect and not the same fix.** `TC-0003-0039` was nine sequential `spawnSync` calls
over three independent fixtures, so making them async and concurrent took the file from 14.36s to 3.53s.
This one calls `runDoctor` in process and spends its time probing; there is no serialisation to remove, and
the cost is the work itself.

So it is recorded rather than repaired: it belongs to `spec-0006`, a fix would be a guess at another spec's
test, and the honest statement is the measurement — 8.52s of a 15s budget, one observed failure under
concurrent load, passing in isolation and in every other run this stage made. **What would be dishonest is
raising the timeout**, which is the move this record has already rejected once in exactly these terms.

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
  mutating the subject _concurrently_, which their read-only rule explicitly permits. The consequence is
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
two findings reproduced at HEAD **as round 9 measured it**, which is what round 9 verified
independently. (Past tense since round 14: at this HEAD the scoped gate is `error=1`, and a sentence
about a past measurement written in the present tense goes false without being edited.) But an artifact
exists to be checked, and this one could not be.

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

**The scoped gate is `error=1`, re-measured at this revision: `info=2 warning=0 error=1`,
`QFAI-ATDD-112` alone, eight TCs.** This stage's measured effect is `error=2 -> error=1`.

This paragraph said `error=2` for eleven rounds and was **stale from round 1** — it described the
withdrawal of `US-0017-0007`'s first, vacuous annotation and was never revisited when round 12 restored
the story behind a test that observes an effect. Two sections of this same record already said
`error=1`, so the file disagreed with itself in three places about its own headline number. Recorded
rather than quietly fixed, because the mechanism is worth naming: a number written as a conclusion goes
stale silently, while a number derived by a guard cannot. This one is now re-derived by running the
gate, and the run-log directory is cited below.

The intermediate figure that is **not** claimed is a different one: two `TC` clearances (`TDD-0016`,
`TDD-0030`) were withdrawn on discovering `CR-20260818-0007` and `CR-20260820-0001` hold them, so the
eight `QFAI-ATDD-112` items are eight and not six.

### The twenty-agent sweep, and where the boundary moved

Round 12 closed the last parser hole anyone had planted, and this record then said the shipped-lane scan
fails closed. **It did not.** A twenty-agent adversarial sweep — one mechanism per agent, each required
to demonstrate execution rather than argue it — returned **fourteen confirmed escapes and none refuted**.
Every one is a body the tree accepted unrefused and that runs code.

De-duplicated by mechanism rather than by spelling they are six classes on three levels, and the levels
are the finding:

| Level      | The class                                              | What the scan had no model of                                                                                                   |
| ---------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| lexer      | the quote state was wrong, so the split was wrong      | `isAlternation` re-parsed raw text with no quote or comment state, so a `)` inside a string closed a `case` arm it was never in |
| lexer      | a command's INPUT is a command                         | `node` reads its program from stdin, so a here-string, a pipe and a `<` file each run code that no argument carries             |
| invocation | a flag is part of an invocation                        | for an interpreter the flags ARE the program: `--run=`, `--import=`, `--require=`, `--test`, `-p`, `--eval=`, `npx --package=`  |
| invocation | an environment prefix decides what a name resolves to  | judged by a denylist-shaped sniff, so an unlisted prefix passed                                                                 |
| effect     | the lane WRITES the code a permitted install then runs | neither half is refusable alone — the write is by a by-name program, the install is enumerated — and the pair is a build        |
| effect     | `env:` is an execution channel with no `run:` body     | `NODE_OPTIONS=--require=./loader.cjs` was verified executing, and nothing read `env:` at step, job or workflow level            |

**The structural point is not that fourteen were missed.** It is why the misses keep arriving: the scan
decides what a lane runs by **reading the text of a command**, which is entry 17 of the list at § "Gaps /
Open risks" — a claim over how something is written standing in for what it does. Enumerating bash
grammar converges only at a complete bash parser, and every gap on the way there fails open. Enumerating
**our own shipped surface** converges immediately and fails closed, because a body nobody reviewed has no
entry whatever it is written in.

So the boundary moved, and the scanner stayed:

- **`ALLOWED_STEP_BODIES`** — the sha256 of each of the twelve `run:` bodies the tree ships, under
  `bodyDigest`. Asserted in both directions: a body with no digest is unreviewed, a digest with no
  body is an entry nobody deleted. This is an **identity** claim, not a behaviour claim; it cannot say why
  a body is acceptable, and it is silenced by pasting the new digest. That is the design — pasting one is
  visible in review, which is the moment the question is worth asking.
- **`refusals()` answers that question**, and it was repaired against all six classes rather than against
  the fourteen spellings: one code mask computed by the walk that already exists, a command's input read
  as part of the command, flags enumerated per invocation, environment prefixes enumerated, a write onto
  anything a package manager executes refused, and `node` allowed **only** as an enumerated `-e` payload —
  a bare `node` refused by the missing flag, because the absence of an argument is not the absence of a
  program.
- **`ALLOWED_STEP_ENV`** — two names, `QFAI_BASE_REF` and `QFAI_NEEDS_JSON`, read at all three levels
  through the same function that reads `uses:`, `with:`, `shell:` and the key enumerations below.
- **`ALLOWED_WORKFLOW_KEYS` / `ALLOWED_JOB_KEYS` / `ALLOWED_STEP_KEYS`** — 4, 8 and 8 keys, added by
  round 14 after a plant put `defaults.run.working-directory: ./ci-primer` in a shipped workflow and ran
  the digest-approved install inside a tree of its own choosing, executing that tree's lifecycle scripts
  with every assertion green. Four rounds had closed four execution channels one key at a time, each the
  sibling of the last; naming the fifth would have left `strategy`, `container`, `services`,
  `defaults.run.env` and whatever GitHub ships next. Enumerating the keys our own surface uses subsumes
  all of them, and it subsumed the `container` / `services` checks that were there by name.

Measured, at the revision that carries them:

```text
escape corpus                         42 mechanisms, 0 still open
false-refusal cost                    12 shipped bodies, 0 newly refused
existing corpora                      PLANTED 62, ROOT_CAUSES 18, WRAPPED 620 — 0 escaping, before and after
pinned program set                    16 programs, unchanged
tests/unit/shippedLaneCommands.test.ts  42 mechanisms pinned; the pre-repair helper lets all 42 through
```

The last line is the falsification, in both directions: swapping the previous helper under the new
assertion reddens it with all 42 listed, and swapping it back leaves the file green. A corpus that passes
against both versions of its subject would be measuring nothing, which is entry 5 of that list.

**The corpus size appears four times in this section, and every one of them is derived** by
`tests/assets/stageEvidenceCounts.test.ts` from the corpus itself — that sentence is where the guard reads
how many sites to expect, so adding a fifth statement without saying so reddens, and rewording one away
reddens too. It said "the three numerals in that block" until round 16, which was wrong twice over: there
are four, and one of them sits outside the block the sentence points at.

They were typed until round 14 and were four short, because the corpus gains entries every round a
reviewer proves a new escape — the same shape as the stale pair § "Findings per round" carried, and the
reason that one now carries no numerals at all. Where a numeral earns its place it is derived; where it
does not, it goes.

**And the first attack on the new gate came from attacking it rather than from a review round.** The
digest was `payloadDigest` — the whitespace-collapsing hash the `node -e` payloads already use — and
collapsing erases the difference between a space and a **newline**. A newline inside `$( … )` is the
difference between one command and two, and `qfai-tests.yml#detection` ships
`$(git rev-parse --is-shallow-repository)`: mutating that one space to a newline produced a body with two
commands and **the same digest**, verified. An identity gate with a collision is not an identity gate.
It became `bodyDigest`, which then normalized line endings and trailing whitespace — the second and third
answers this function gave, both of them wrong, and the section below records how each was found. Pinned
in `tests/unit/shippedLaneCommands.test.ts`, which now holds all four pairs against a local copy of the
rule that was dropped, because a test asserting that `payloadDigest` still collides would have had to be
deleted along with the collapse, taking the lesson with it.

**And `bodyDigest` had a SECOND collision, which two of round 14's three reviewers found
independently.** Its first version also stripped trailing whitespace per line, on an assumption the next
line of that same test stated outright: "trailing whitespace is not a behaviour". It is one. A trailing
space after a line continuation ends the continuation, so `echo a \` and `echo a \ ` are one command and
two — and they had one digest. Both sides pass `refusals()`, so the instrument could not have caught what
the boundary let through, which is the property that makes a collision in this gate worth more than an
escape past the scanner.

**And then a THIRD, which retired normalizing altogether.** Round 14 kept the `\r\n` fold on the ground
that it was unreachable — measured on BLOCK scalars, where the parser folds line breaks itself. A quoted
FLOW scalar hands the digest a live CR, and a CR before a newline ends a line continuation exactly as a
space does. Round 15 produced the pair: one digest, `refusals()` returning `[]` for one body and refusing
a bundler in the other.

**Neither digest normalizes anything now.** Three attempts to be helpful, three collisions, each erasing
a difference bash acts on — and the tolerance every one of them was bought for did not exist, because
YAML removes a block scalar's indentation before either function sees it. The bytes are the identity. It
costs a review when someone edits whitespace inside a shipped body, which is the direction this stage
would rather pay in.

This paragraph asserted the deleted rule for a round, in three sentences. It said the digest had "line
endings and trailing whitespace normalized", called the surviving fold "unreachable from the gate", and
described it as "exercised by a test" that had been rewritten out from under the sentence. Round 16 found
all three, and no needle in the retracted-claims guard reached any of them — the third round running that
a refuted claim stood in a wording nothing matched, which is why all three are needles now.

**`defaults.run.shell`** was the round's other repair and belongs to a different story: a `shell:` is a
command template, GitHub documents `defaults.run.shell` for applying one across steps, and the guard read
only `holder["shell"]`. Planted at job level and at workflow level, both shipped. That is the same channel
three rounds have now closed at three levels — step `uses:`, job `uses:`, step `shell:` — each time **one
level from where the last repair looked**, so every level now reads through one function rather than
gaining a fourth site. The first version of that repair restated the rules in a second copy at workflow
level, which is the two-copies-of-a-rule defect this record has found at four sizes; it reads through
`readUses` now.

**Round 13's reviewers did not run.** All three died on `ENOTFOUND` before writing a report. Their scratch
survived and the gatekeeper's measurement was reproduced from its own plant script, but no round-13
verdict exists, and the repairs above were landed on the sweep's evidence rather than on a reviewer's.
That is stated rather than papered over: this stage's rule is that the subject is not edited while a round
is in flight, and the round in question is dead rather than open.

## Test volume estimate

| Layer       | Raw count | Signal | Evidence                   | Notes                                                            |
| ----------- | --------: | -----: | -------------------------- | ---------------------------------------------------------------- |
| E2E         |         9 |      9 | `US-0017-0001` … `-0009`   | one describe each; `-0007` restored in round 12, in its own file |
| API         |         0 |      0 | no `CON-API-*` declared    | nothing owed                                                     |
| Integration |        71 |     63 | `Layer = Integration` rows | 63 `refactor`; 6 `blocked`, 2 `todo` — see the section below     |

The 11 `Unit` rows owe nothing here (`L1` has no mandated directory).

## Coverage obligations checklist

- `US-0017-0001` … `-0006`, `-0008`, `-0009` — **covered**, `tests/e2e/**`, verified by the E2E suite
  passing and by `check-atdd-annotation-ledger.mjs --spec 0017` confirming each ledger claim names a
  test that exists. **Not** verified by `validate`, which reads only the ledger (round 1, finding 5)
- `US-0017-0007` — **covered**, `tests/e2e/spec0017RunnerParallelismE2E.test.ts`, which observes an
  effect rather than a mention. `QFAI-ATDD-111` is clear for this spec. (This line read "**not
  covered**, deliberately" for eleven rounds and was stale from round 1's withdrawal — one of five
  sites round 14 found still asserting it after the headline paragraph had been corrected.)
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
unresolved Change Request, or an unfinished row in another spec", and `blocked` is _more_ conservative
than `exception`, which satisfies spec completion while `blocked` prohibits it — but the gate asymmetry
is a consequence worth naming rather than leaving for a reader to notice.

**The `DR-*` was authorable all along, and round 2 found that both ways.** The first version of this
section recorded the branch with the `DR-*` "pending", on the stated grounds that this stage could not
author it because `07_Decisions.md` is a read-only P5 input. That obstacle was **the wrong artifact**:
`qfai-implement/references/execution-ledger.md` § "Where the Decision Record is written" puts a
branch-3 DR at `.qfai/decisions/DR-<id>-<slug>.md` and says explicitly **not**
`07_Decisions.md` / `09_delta.md`, and `constitution/drift-protocol.md` whitelists _creating_ exactly
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
  `QFAI-ATDD-111`'s subject `US-0017-0007` is the parent of `AC-0017-0029`, which is _these rows'_
  AC); the exit condition offered was **unreachable**, because the gate is self-referential; and
  `EX-0017-0053` was quoted at half its length, dropping "exactly one runner project is tuned, largest
  first" — the clause that _is_ checkable today, and whose omission means branch 2 had not really been
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

| retracted statement                                | rewritten at                               |
| -------------------------------------------------- | ------------------------------------------ |
| "because the workflow changes are unmerged"        | § `TDD-0069`, branch 1 paragraph           |
| "there is no run history to mutate" (for clause 1) | § `TDD-0069`, branch 2 paragraph           |
| "branch 3 it is" for both rows                     | this section's opening                     |
| the `exception` P1d PASS as the blocker for both   | § "P1d's verdict: PASS, at the sixth pass" |

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

The PASS covers **the observation and nothing else.** It does not clear completion: the scoped gate is
`error=1`, the unscoped profiles `build` runs need 11 `US` and 15 `TC` across four specs, six rows are
`blocked`, and an `exception` still needs a user-approved `TDDLIST-001` waiver or the spec stays open.

(This sentence carried three refuted figures at once until round 14: `error=2`, `US-0017-0007`
uncovered, and "12 US and 15 TC across five specs" — the exact double-count Gaps item 4 retracts by
name, surviving
in a second site because the two copies were worded differently. That is the failure mode
§ "Ledger rows advanced" describes for a different paragraph: every search for the retracted wording
looked for an exact match and found none.)

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
open.** These two rows and the six `blocked` ones are why the completion status below is `FAIL`, and
none of them is closeable by this stage. `US-0017-0007` was named here too until round 14; it is
covered, and it was never one of the reasons this spec cannot close.

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0017.md` (committed). Totals by `Status`:
**✅ 3 / ⚠️ 2 / ❌ 4**, derived from the table by
`packages/qfai/tests/assets/coverageDepthMatrix.test.ts` so the two cannot part again.

Three numbers, in order, because the sequence matters: the file declared `✅ 3 / ⚠️ 2 / ❌ 4`, which
the table never held; round 1's `qa-gatekeeper` cross-tabulated it to `✅ 2 / ⚠️ 2 / ❌ 5`; and two
cells then moved on merit while the findings were applied — `US-0017-0003` rose to `✅` because the
assertion it was missing turned out to be available and was written, and `US-0017-0004`'s
`Oracle strength` fell to `⚠️` because an oracle for an assertion is not an oracle for a story when
the collection it filters is empty by construction. The `❌` count is at 4 rows and 34
depth cells.

## Work Orders Summary

**Not delegated, and that is a deviation from this skill's Stage Minimum Roles.** The first version
of this record named `test-design-analyst`, `acceptance-test-engineer` and `devops-ci-engineer`.
Round 1's `completion-reviewer` checked that against
`.qfai/assistant/manifest/agent-routing.yml:139-206` and the disclosure was itself incomplete — the
whole value of a volunteered deviation being its completeness. The mandatory set, per phase, is:

| phase            | mandatory                                      | conditional                           | blocking                            |
| ---------------- | ---------------------------------------------- | ------------------------------------- | ----------------------------------- |
| `coverage`       | `test-design-analyst`, `qa-strategist`         | —                                     | `test-design-analyst`               |
| `red`            | `delivery-planner`, `acceptance-test-engineer` | `qa-gatekeeper`                       | `delivery-planner`, `qa-gatekeeper` |
| `implementation` | `acceptance-test-engineer`                     | —                                     | —                                   |
| `evidence`       | —                                              | `devops-ci-engineer`, `qa-gatekeeper` | `qa-gatekeeper`                     |
| `review`         | `completion-reviewer`, `qa-gatekeeper`         | `implementation-reviewer`             | both                                |

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
asserted over how code is _written_ rather than what it does — and this one was written while applying a
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
reddened on the first ledger line _removed_, which is the same option's other branch. The claim count
is not asserted at all now; only `unbacked` has a direction pinned.

### G1-G3 — the loop guard

```text
G1  the `stat` site loses its ELOOP guard                      REDDENS
G2  the realpath dedupe reverts to lexical `path.resolve`      REDDENS
G3  symlinked directories stop being followed                  REDDENS
```

`G3` reddened **nothing** the first time it was run, and that is how round 4's vacuity finding was
confirmed from this side: the symlink test passed the link as the walk's _root_, and `readdir` follows a
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

| fact                                                                   | source             |
| ---------------------------------------------------------------------- | ------------------ |
| `.qfai/evidence/**` and `.qfai/review/**` are excluded from Prettier   | `.prettierignore`  |
| markdown is formatted with `proseWrap: "preserve"`, so nothing reflows | `.prettierrc.json` |

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
2. **`US-0017-0007` is covered, and the ten rounds it spent uncovered were a category error.** "The
   knobs do not ship, so no honest assertion exists" was this item for ten rounds; the story's subject is
   **this repository's own** vitest projects, CI matrix and scripts, which do not ship anywhere. It is
   carried by `tests/e2e/spec0017RunnerParallelismE2E.test.ts`, which runs a fixture suite twice through
   the real `rootKnobs` and observes peak concurrency of 1 at one worker and more than 1 at four — an
   effect, not a mention.
3. **`QFAI-ATDD-112` reports 8 spec-0017 TCs, and 15 repo-wide** — re-measured this round, deduping
   the finding's own id list: `spec-0003` (1), `spec-0008` (4), `spec-0015` (2), `spec-0017` (8). The
   scoped gate this stage runs sees the 8; `build` runs the profile **unscoped** and sees all 15, so eight
   is the number this stage can act on and fifteen is the number a gate reports.

   **The eight ARE the 6 `blocked` and 2 `todo` rows**, one for one, derived from the ledger's own
   74 / 6 / 2 tally. This item said the opposite for several rounds, on the ground that "four of the eight
   are `refactor` in the ledger while `CR-20260820-0007` holds them" — which round 14 measured false and
   corrected in the section next door, leaving this copy standing until round 17's gate found it. The four
   rows in question are `blocked` with a `Blocked-By`, and have been for 285 commits.

   What the retracted sentence was pointing at is real and belongs to five OTHER rows: `TDD-0052`,
   `-0066`, `-0067`, `-0074` and `-0075` are `refactor` while `CR-20260820-0007` holds them, and none of
   the five is among the eight.

   Of the two `todo` rows, **only `TDD-0070` is on branch 3** (`DR-0017-0010`, PASS at P1d pass 6).
   `TDD-0069` is `blocked` on `CR-20260820-0012` and takes **no** RED-provenance branch at all: a
   `blocked` row has not started, which is the distinction § "Ledger rows advanced" turns on and the
   reason the `DR-ID` column was not widened to carry a `Blocked-By` value. An earlier version of this
   item said both rows were parked on branch 3 — the same false statement § "Ledger rows advanced"
   reports as corrected after standing two rounds, surviving here in different words.

4. **The gate still exits 1 for other specs, and none of them is this one.** `--spec 0017` scopes the
   spec-owned rules, and `spec-0003` (8 US), `spec-0006` (1), `spec-0008` (1) and `spec-0015` (**1**) are
   `QFAI-ATDD-111`'s eleven items repo-wide — **all of them**. This spec contributes none, because
   `US-0017-0007` is covered.

   That sentence used to end "plus `US-0017-0007` makes 12", which was double-counting a row already
   inside the eleven and is why it had to contradict its own arithmetic to be written. Round 2 caught an
   earlier version writing `spec-0015 (2)` — self-detectable, since `8 + 1 + 1 + 2 = 12` against the 11
   stated in the same sentence — and round 12 caught the "plus one" surviving the correction. It was inherited from round 1's report without re-derivation — the same failure as
   the "all 71 rows" sentence, one layer down. Recorded as a cross-spec obligation per this
   skill's CRITICAL CONSTRAINTS: not this stage's work, closing it is each owning spec's next
   `/qfai-atdd` run, and the repo-wide run belongs to `/qfai-verify`.

5. **127 E2E ledger claims are backed by no test.** `CR-20260820-0011`. A cross-spec
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
   1. `E4` — a package-manager regex that measured npm-script _naming_; `pnpm run build` and six more
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
       the _reason for the design_, it was written in three files, and it was never measured. Round 10
       accepted it on the strength of a corpus that could not test it (entry 13).
   13. **That corpus.** All 62 `PLANTED` entries were bare commands, so "0 escaped" carried no
       information about wrapping — and the accept direction was worse than uninformative. Its
       must-accept case produced no refusals _because of_ the hole, so the test certifying the
       instrument was derived from the instrument's blind spot and any real repair had to redden it.
       That is entry 5 (probes generated from the sets they pin) at the level of a whole instrument
       rather than a member.
   14. **hugo's deleted `values`.** "Its own `bareIsBuild` decides before any flag can matter" — false;
       `bareIsBuild` is evaluated after the token loop and gated on no target having been seen, so a
       flag whose argument is not consumed suppresses it. Written one commit after this list was
       extended, in the commit that extended it, and it made a real build read as nothing.
   15. **The matrix guard's own replacement comment.** It said the assertion "demands the row not claim
       more than the test delivers" and that "a raised score with no test behind it" was prevented by the
       ledger check below it. Round 12 raised `Oracle strength` one grade with the partition kept
       consistent and all three guards stayed green: the ledger check requires an annotation, a carrier
       file and two function names, none of which constrains a score in any column. **This one is the
       purest instance in the list** — it is a claim about what a TEST does, written in that test, in the
       repair for a finding about claims of exactly that kind, and it took one mutation to refute.
   16. **And the first repair for entry 15 was itself vacuous.** It required a raised column to be NAMED
       in the row's justification section — and that section carries a bullet for all seven columns, so
       the filter was empty whatever the table said. A test that cannot fail for the one row it guards.
       The working version pins the PAIR: the score the section states and the score the table holds must
       agree, which reddens on a raise in either artifact without the other.

   17. **The scan itself, after entry 12 was repaired.** Round 11 found the allowlist conceding whatever
       its parser could not read, and round 12 repaired that parser until every planted form was refused.
       A twenty-agent sweep then ran **fourteen more** past it, none refuted. The class is the same one:
       `refusals()` decides what a lane runs by reading the TEXT of a command, and reading bash text is
       not running bash. Entries 12 and 17 differ in what they say about the cure — 12 says an allowlist
       that concedes on confusion is not an allowlist, and 17 says that repairing the concessions does
       not converge, because the set of readings a complete shell has is not finite from where a scanner
       stands. The countermeasure is to move what the gate READS: `ALLOWED_STEP_BODIES` asks which
       twelve strings a document contains rather than what they mean, which is decidable, and
       `refusals()` is kept as the instrument that says why a body is acceptable when someone has to
       update one.

       **The first version of this entry said the gate "stopped being a reading", and round 14 refuted
       it in the entry's own terms.** The gate reads the `run:` scalars and nothing else, in a document
       that executes through `uses:`, `with:`, `shell:`, `defaults.run.shell`, `env:`, `container:`,
       `services:`, `working-directory:`, `defaults.run.working-directory:` and `runs-on:` — one of
       which was demonstrated running adopter code with every assertion green. A claim about what an
       instrument IS, written into the entry whose class is claims of exactly that kind, which is why
       entry 15 is called the purest instance in this list. The channels are closed now by enumerating
       the KEYS each level may carry, which is the same inversion one document-level further out.

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
   - **A guard over a record can be vacuous for the very row it was written for.** Entries 15 and 16 are
     one finding and its failed repair: the second required a justification to NAME a column, in a
     section that names every column. Before writing a guard over prose, mutate the prose it guards —
     the direction that matters is the one where the record is wrong, and a check that cannot express
     that state is decoration however carefully it is worded.

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

9. **Two things the shipped-lane repairs do not close, stated rather than implied.**
   - **An allowed install runs the adopter's own code.** `npm ci`, `npm install --no-audit --no-fund`,
     `pnpm install --frozen-lockfile` and `yarn` are all enumerated, and every one of them executes
     whatever `preinstall` / `postinstall` / `prepare` an adopter's `package.json` declares. This item
     named `npm ci` alone until round 14; the shipped body's own fallback is the `npm install` form,
     which is the branch an adopter without a lockfile takes.

     The lane's own writes onto a manifest are refused, so it cannot supply that code **by writing a
     manifest** — and that is the whole of what the repair established. This item claimed the wider
     form, "the lane cannot supply that code itself", until round 14 refuted it with a channel that
     needs no write at all: `working-directory` lets the lane choose which tree the allowed install runs
     in, so the manifest that executes is selected rather than created. An adopter's existing manifest is
     not this scan's to read either way.

     So `US-0017-0004`'s claim is scoped: **the shipped TEXT invokes only these programs**, and not "the
     shipped lane executes no build in an adopter's tree". Every assertion in this record about that
     story means the first sentence. Naming it matters because the second sentence is the one a reader
     assumes.

   - **And the lane can still choose WHERE a reviewed install runs**, or could until round 15:
     `defaults.run.working-directory` pointed the digest-approved lockfile-aware install at a tree of the
     planter's choosing, whose lifecycle scripts then ran. It is closed by the key enumerations — that
     key is on none of the three lists — and it is recorded here because it is the counter-example that
     narrowed this item's claim in the first place, not because it is still open.
   - **`refusals()` is now an instrument rather than the boundary.** It remains the best available answer
     to "what does this body run", it is the thing to run before writing a digest down, and it is still
     the only check that reads an adopter-facing body at all. What it is not, after the sweep, is the
     thing standing between an unreviewed body and the shipped tree — `ALLOWED_STEP_BODIES` is.

10. **CLOSED. A `⚠️` cell could not be justified in this artifact whatever anyone wrote, and now it
    can.** Round 19's `qa-gatekeeper` filed the symptom as a residual under a check it explicitly
    passed; round 20's `completion-reviewer` found the cause and refuted three things this item said
    in its first form. Both the contract and the fifteen cells are now written.

    **The cause was a contract gap, not missing prose.** `§ "Every ❌ cell, named"` and
    `coverageDepthMatrix.test.ts` both keyed on `❌`, so a `⚠️` cell was outside the enumeration by
    construction, and `US-0017-0002` and `US-0017-0009` had no justification section at all — the
    artifact writes one only for a row whose `Status` is `❌`. Writing prose would not have closed
    that; changing what the enumeration covers did.

    **What was added.** `§ "Every ⚠️ cell, named"` carries a partition of all fifteen depth cells into
    four classes with a line each, and the guard enforces the same three properties the `❌` partition
    has — disjoint, complete, naming nothing scored otherwise — plus a stated size per class and a
    line per member. `parsePartition` now reads one section rather than the document, because two
    row-shaped tables in one file would otherwise merge and the merge would read as a completeness
    pass. Falsified five ways, each restored from a copy: a dropped member, a member that is not
    `⚠️`, a cell claimed twice, a stated size that no longer matches, and a member with no line.

    **The classes, and what they are for.** They are deliberately not `❌`'s A/B/C: those say why a
    behaviour cannot be exercised, and every one of these is a statement about a behaviour that partly
    is. `W1` (2 cells) — the surface IS exercised, by a row that is not this one. `W2` (8) — part of
    the domain is exercised and a named part is not. `W3` (4) — the oracle is weaker than the claim.
    `W4` (1) — one half of the story is reachable and the other is not.

    **`W1` is the class worth arguing about, and the argument is in the artifact's own words.** This
    matrix scores _the surface each story is actually about_ — its opening section says so — not the
    annotation that happens to carry a test. So `US-0017-0001`'s error paths and value classes count
    as exercised even though `spec-0003`'s rows assert them, and the `⚠️` records the two facts a
    reader needs: this spec's row does not carry it, and one branch (`qfai-tests.yml:98-100`, the
    `name-only diff failed` arm) is reached by nothing in the repository at all. A derivation that
    recommended re-scoring those cells to `❌` was set aside on exactly that ground: it read the matrix
    as scoring per annotation, and the matrix says it scores per surface.

    **What the first version of this item got wrong**, kept because the shape matters more than the
    numbers. It said sixteen while its own enumeration listed fifteen — a numeral contradicting the
    list beside it, in the paragraph arguing against writing things quickly. It said all of them
    "carry no reason anywhere", which seven counter-examples refute. And it cited lesson 5 as warning
    against "tidy summaries", which lesson 5 does not say: lesson 5 is that a deferral needs the
    evidence any other claim needs, and applied properly it was the standard that paragraph failed.

    **The residual, stated rather than absorbed.** Two of the fifteen name work nothing here can do:
    `US-0017-0006`'s oracle cannot reach the adopter half because no hygiene lane ships
    (`grep -rn check-workflow-hygiene packages/qfai/assets/` returns nothing), and the `fail_open` arm
    above needs a fixture in which `git diff` itself exits non-zero. Both are named in their lines.

11. **Three claims this record retracted are standing, live and unquoted, in the execution ledger — a
    file this skill reads and does not write.** Round 20's `qa-gatekeeper` re-grepped all 33 needles
    over every tracked file and found them; `GOVERNANCE` does not list
    `.qfai/specs/spec-0017/tdd/test-list.md`, so nothing in this stage's instruments can see them. This
    stage re-derived the finding independently with the guard's own needle set and flattening, over
    2388 tracked files.

    ```text
    tdd/test-list.md:107  "becomes implementable once the pull request has three green"
                          retracted: that exit is unreachable — the run it waits for is gated on the
                          annotation it would justify (P1d pass 1)
    tdd/test-list.md:107  "NOT BLOCKED by a CR"
    tdd/test-list.md:108  "NOT BLOCKED by a CR"
                          retracted: the negation of the `Blocked-By: CR-20260820-0012` the row is
                          being given (P1d round 7, `A1`)
    ```

    **It is recorded rather than repaired, and the reason is ownership rather than difficulty.**
    `qfai-implement/references/execution-ledger.md` gives that file one writer, and this skill's own
    Read Set Contract says it is "read, never written". Adding it to `GOVERNANCE` would turn a required
    `e2e` leg red against text this stage may not edit — which is the "a guard that reddens on the
    honest edit" hazard the record has tracked since round 10, in its purest form: there would be no
    honest edit available at all.

    So it goes to the ledger's owner with the lines quoted. What this stage can say is that the claims
    are refuted and by what, which is above.

    **The related limit, measured.** Two of the 33 needles cannot be widened as they stand, and this
    paragraph deliberately does not write either of them out — round 20 found that doing so is itself
    the offence, which is the neatest demonstration available that the guard works:
    - the **pack-count** needle matches a sentence in `_policies/08_Decisions.md`,
      `_policies/10_delta.md` and `spec-0017/09_delta.md` about one design being fragmented across
      three SPEC packs, which is a different noun from a review pack;
    - the **seal-filter** needle matches an unrelated rejected option in `_policies/08_Decisions.md`
      about shipping a list-only view.

    All three of those files are upstream SSOT this skill may not patch either. A needle that cannot be
    widened without accusing a file you cannot fix is a needle at the edge of its scope, and that is
    where these two are.

## Round 2, and the P7 evidence for it

Three reviewers ran on `56daee8d` — **two of them blocking**, per `agent-routing.yml`, whose atdd
review phase lists `blocking_agents: qa-gatekeeper, completion-reviewer` with `implementation-reviewer`
**conditional** on helper or runtime code having changed. It had, so it was routed, and its findings were
applied; that does not make it a blocking gate, and calling it one overstated the gate this stage
cleared. Five rounds asked for this. The request was **committed before they launched** — round 1's
`qa-gatekeeper` had detected five files moving while three reviewers ran, which was this orchestrator's
fault and is fixed structurally rather than by intention. All three confirmed HEAD did not move and
`git status --porcelain` was empty at their start.

| reviewer                  | verdict | findings                     | report                           |
| ------------------------- | ------- | ---------------------------- | -------------------------------- |
| `implementation-reviewer` | REVISE  | 4 blocking, 6 medium, 9 low  | `R01_implementation-reviewer.md` |
| `completion-reviewer`     | REVISE  | 4 blocking, 4 major, 5 minor | `R02_completion-reviewer.md`     |
| `qa-gatekeeper`           | REVISE  | 3 blocking, 6 advisory       | `R03_qa-gatekeeper.md`           |

**What they could not break, having tried:** the `US-0017-0003` behavioural assertion (`qa-gatekeeper`
added two rounds this stage had not measured, and reports the failure messages name the row's own
selector and predicate); the Coverage Depth Matrix pinning test's arithmetic; the **127**, reproduced
by an independent implementation with a more permissive regex over every tracked file, per-spec table
matching line for line; the scoped gate at `error=2` with the right content, its
`validate.spec-0017.json` byte-identical in a shadow root; the `US-0017-0007` withdrawal; and the
Delta Rejected Guard.

**One thing they vindicated rather than merely accepted.** `qa-gatekeeper` reports that the tracked
`.qfai/report/validate.log` was rewritten _during its review_ by another process — unscoped,
`warnings: 376`, five specs — provably not its own, since both of its runs wrote into its shadow root.
That is the exact hazard this record cites when it declines to use `validate.log` as Hard Gate
evidence. Had the citation been `validate.log`, this section would now be quoting another stage's
numbers.

### P7 quality gates

**Re-run after the last artifact changed, twice, because this block was wrong about its own
currency both times.** Round 3 found the first version written at `16f611c7` before `21ea1ddc` landed
+489/-76 across four files, so it certified three artifacts that postdated it — established by
`git log -S`. Round 4 found the replacement stale in the same way. **These numbers are measured at the working tree of this commit**, which carries every repair through
round 20: the e2e figure is 1479 and the integration+unit figure 1240.

**And the integration+unit figure moved — but not for the reason this paragraph gave for a round, and
the figure it replaced had been wrong since round 15.** A concurrent session pushed `b0f9d443` onto this
branch, and the first version of this paragraph attributed the whole move to it: _"the integration+unit
figure moved without this stage touching it."_ Round 19's `completion-reviewer` measured the window
commit by commit and the attribution is false. Re-derived here with the guard's own `CALLSITE` rule,
extracted from its bytes and run over `tests/{integration,unit}/**/*.test.ts` at each revision:

```text
683f16ab  1120   round 15
20121003  1120   round 18's record commit — the record stated 1220 passed
b0f9d443  1122   +checkPublishDryRun 6->7, +shippedWorkflowOwnership 25->26   (the other session)
7b7a50ea  1123   +tests/unit/shippedLaneCommands.test.ts 12->13                (THIS STAGE)
7fbac2d3  1123   the record stated 1222 passed
```

`7b7a50ea` is "test(atdd): tie the mask to the verdict" — **the differential test this round exists to
review**, in the `unit` project, which is inside this very total. The window's delta is `+3`, not `+2`,
and one of the three is this stage's own. The sentence that says the figure moved without this stage
touching it was written one commit after this stage moved it.

**And the arithmetic exposes the predecessor.** Total minus callsites is constant per project — for
integration+unit, 99 against passed and 118 against passed-plus-skipped; for e2e, 564 and 580. It holds
at round 12's `1216` / `1117`, at today's e2e `1479` / `915`, and at
today's `1239` / `1140`. At `20121003` the callsite count was 1120, so the true figure was **1219** and
the record said **1220**: one high for the whole of rounds 15 to 18, in the block whose first sentence is
"re-run after the last artifact changed". The re-measurement that replaced it did not detect that,
because it measured the endpoint and narrated the cause.

That is this record's most-repeated error in a new place: **a correction that measures where it landed
and then explains the move without checking the commits in between**, in the section that says it
re-derives "from `git show` at each revision rather than from memory". The moral the paragraph drew is
still right — a total nothing derives goes stale when anyone commits — and this stage was one of the
people who committed.

Round 14's `completion-reviewer` found this block certifying `test:e2e … exit 0` while three of the
stage's own guards were red in that project, at a revision that had opened a review pack and changed
nothing else. The block is re-run rather than carried forward, which is what its own first sentence has
demanded through six rounds.

**And it moved again, for the same structural reason and from outside this stage.** A session
closing `QFAI-ATDD-111` and the non-`spec-0017` half of `QFAI-ATDD-112` added four e2e files and
one integration file — coverage for eleven user stories and seven test cases across four other
specs — which took the e2e callsite count from 883 to 912. Nothing about `spec-0017` changed; the
guard reddened because the count it measures is a property of the **tree**, not of this spec, and
that is the second time a foreign commit has demonstrated the point this section makes. Both suite
totals above are therefore known-invalid for the current tree rather than assumed current, which is
exactly what the mechanism below says the line's movement means.

**And it moved again — this time in a MERGE, with both parent TIPS individually correct.** Both parents
of `2a6da1ca9` measure 932 and record 932, so neither branch could have found this by re-measuring its
own tree at the point it was merged. They are short of the merge in different ways:

| revision                | measured | recorded | how it differs from the merge                                      |
| ----------------------- | -------- | -------- | ------------------------------------------------------------------ |
| `60b707fa0` (parent A)  | 932      | 932      | lacks `tests/assets/autoModeApprovalDegrade.test.ts` (5 callsites) |
| `26a67fbe1` (parent B)  | 932      | 932      | has that file; is one callsite behind on five others (below)       |
| `2a6da1ca9` (the merge) | **937**  | 932      | takes A's five single-callsite additions AND B's whole new file    |

The five B is behind on: `atddRedProvenance` 212→213, `coverageDepthMatrixHome` 9→10,
`evidenceCellContainer` 9→10, `evidenceGitignoreClaim` 4→5, `implementCheckpointVerification` 8→9. The
record is byte-identical in both parents, so the merge carried it through unchanged and nothing
re-measured after the integration. `test (e2e)`, `node-floor` and `ci-pass` have been red on `main` ever
since: one stale integer, three required jobs, every open pull request red for a reason none of them
contains. `git diff 2a6da1ca9 64dfea7ec` under either glob is empty, so the merge is where the whole
delta enters.

**The claim is about the tips, not about either history.** B's own history does contain a wrong commit:
at `9ac4c967e0` the same walk measures 920 against a recorded 915, and `fe05265e80` repairs it to 920.
That is the ordinary branch-local instance of this defect, and B fixed it branch-locally, which is the
point — a branch that had already caught and repaired its own staleness still merged into an
inconsistent tree. The two failure modes are independent.

**The obligation therefore belongs to the merge, not to the branch.** The rule below says a commit that
changes a callsite under the two globs owes a re-measurement, and at their tips both branches had
honoured it. What neither can honour is a count that is a property of the UNION of two histories:
`measure(A ∪ B)` is not recoverable from `measure(A)` and `measure(B)`, so the merge commit is the only
revision at which this number can be made true. A branch-local discipline — including "re-measure last"
— cannot reach it, and B's `fe05265e80` is the proof that practising it well is not enough. This is the
strongest argument in this record for deriving the count rather than committing it: a literal that only
a merge can invalidate has no author to hold responsible for it.

Re-measured for this commit by a separate walk of the two include roots — not by calling into
`stageEvidenceCounts.test.ts`, because a probe derived from its subject cannot contradict it — and both
readings agree: **937** (`tests/assets` 767, `tests/e2e` 170).

e2e callsites at this tree: 1293

**That line is the repair, and it is the seventh attempt at this defect.** Rounds 4, 5, 6, 7, 10 and 11
each found these totals a round behind, and each repair re-typed the number. The seventh INSTANCE is
the merge above — which is why no round produced it — and the seventh REPAIR is this commit. The two
are not the same event: the merge is what carried 932 into a 937 tree, and re-recording 937 is what
corrects it. Neither total can be derived by a test — deriving them would mean running the suite from
inside it — but the thing that INVALIDATES them can be: a commit that changes an `it` / `test`
callsite under the e2e project's two include globs.
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

**Every line below was re-run for round 19, and that sentence has to be earned each time.** Round 19's
gate found `7fbac2d3` advancing this block's currency claim from "round 14" to "round 18" after
re-measuring **one line of seven** — while the other session's commit had changed the producer of three
others (`check-atdd-annotation-ledger.mjs`, `check-workflow-hygiene.mjs`, `check-publish-dry-run.mjs`,
all of which `ci:lint` and this block run). The commit that noticed a concurrent session had invalidated
one figure re-dated the whole block instead of re-running it. That is the block's own recorded failure
mode, for the third time.

```text
pnpm ci:lint                                    exit 0, all eleven members
pnpm check-types                                exit 0
pnpm -C packages/qfai test:e2e                  1479 passed / 16 skipped, exit 0
vitest --project integration --project unit     1240 passed / 19 skipped, exit 0
node scripts/check-atdd-annotation-ledger.mjs --spec 0017
                                                9 claim(s) backed, exit 0
pnpm verify:pack                                exit 0 (ok=16 info=2 warning=1 error=0)
  (named because round 9 found it absent from this block while `release.yml` runs it, and because it
   is one of the three helpers that reach a build through `spawnSync` and so cannot be scanned)
node ... validate --profile atdd --spec 0017     info=2 warning=0 error=1
  artifact  .qfai/report/validate.spec-0017.json
node ... validate --profile full                 info=4 warning=403 error=48 on THIS working copy with
                                                round 20's pack open and its reports landed, of which
                                                44 are QFAI-REVIEW-007 against untracked local packs.
                                                The absolute is not a property of any revision; the
                                                deltas are. See § "The full profile", which states the
                                                same number for the same state
```

**`QFAI-ATDD-111` left that decomposition during this round, and not because of anything here.** It was
one of the five rows summing to the sealed figure — "11 US across four specs, of which this spec owns
NONE" — and the other session's coverage commit closed it, taking the unscoped profile from 49 to 48 at
the same pack state. The row below is kept with that noted rather than deleted, because the point of the
decomposition is which rules produce the number, and this is a worked example of the answer changing
without the subject moving.

**`.qfai/report/validate.log` is not cited here and was not committed with this round.** It is tracked,
it is shared by every run on this machine scoped or not, and round 19's gate found it rewritten mid-review
by a sibling reviewer's unscoped run — `errors: 49, warnings: 403` — at a revision whose scoped gate is
`error=1`. That has now happened in two of the two rounds where anyone looked, so it is the normal case
rather than a hazard. Every `--profile full` measurement this round restored `.qfai/report/` from a copy
taken first, and `git status --porcelain .qfai/report/` was verified empty afterwards.

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

**The per-commit sequence that used to sit here is deleted, and its deletion is the finding.** It listed
each commit with the e2e total and the callsite count after it, so that a reader could re-derive the total.
It never worked: its own stated invariant — any commit that changes an `it` / `test` callsite under the two
globs owes a row — was violated in six separate rounds, and by round 12 eight commits had touched those
globs with no rows added, leaving the last row at 873 callsites against 879 measured and the totals derived
from it three short.

Nothing checked it, either. `stageEvidenceCounts.test.ts` guards the standalone
`e2e callsites at this tree:` line instead, which is the one runtime-proof number that has verified every
time it was measured. A hand-maintained history that nothing verifies is not a weaker guard than that line —
it is a liability, because it looks like evidence and has been wrong more often than right.

What the table was FOR is kept as a rule, below, which is re-derivable at any revision by anyone.

**The integration+unit total has no sequence like this, and it went stale first.** `f544daad` added the
twentieth test in `buildCommand.test.ts`, which lives in the `unit` project, so that total moved 1196 to
1197 while the e2e one did not move at all — and the block above certified the old figure for one
commit. Caught by re-measuring both totals rather than by a reviewer, which is the first time on this
spec that this class of defect was found here rather than reported to us. The e2e sequence exists because
five rounds faulted that number; the other total is derivable the same way and is not yet derived.

**The invariant the sequence existed to carry, stated so it does not need restating each round:** any
commit that changes an `it` / `test` callsite under the project's two globs owes a re-measurement of the
totals, and any that does not leaves them valid. That is checkable with one `git show` per commit, it is
what `stageEvidenceCounts.test.ts` enforces by comparing the recorded callsite count with the measured
one, and it needs no table. A record naming HEAD is stale at the next commit; a record naming a rule is
not.

**Four sentences describing that table outlived it by four rounds**, which round 16 found: they named
its "right column" and its "left column", reported where "the sequence stopped", and said the totals
"name the revision they were measured at and why the sequence above reaches it" — a claim about this
record's own structure, inside the block whose subject is claims of that kind, pointing at a table
deleted at `f829b95e`. What the sequence taught is kept above; the descriptions of its shape are gone
with it. Three of its derivations had been wrong with correct endpoints, which is the reason the
invariant is stated as a rule rather than as a table someone re-derives each round.

**Those two totals are the numbers this record cannot derive**, which is why they name the revision they
were measured at. Round 7 required the paragraph that used
to sit here deleted; the round that answered it **duplicated** the paragraph instead, welding the
sentence marked for deletion onto the end of the copy — an insertion where a deletion was required, in
the block being rewritten to answer a finding about this block. It is gone now, and that was verified
with `git diff` rather than by rereading the file. What is derivable about the artifacts is checked rather than typed, and by **four** guards, not one —
naming a single instrument for all of it was itself a wrong attribution, of the same class as the two
this section reports:

| derived                                                                                             | instrument                    |
| --------------------------------------------------------------------------------------------------- | ----------------------------- |
| per-file test counts, annotated describes, recorded vitest outputs, the named packs and their seals | `stageEvidenceCounts.test.ts` |
| the pack-count **numeral** in prose ("Eight packs")                                                 | `retractedClaims.test.ts`     |
| the classifier version this record names                                                            | `coverageDepthMatrix.test.ts` |
| the matrix's totals, partition, class prose, row width                                              | `coverageDepthMatrix.test.ts` |
| every grammar member of the classifier                                                              | `unit/buildCommand.test.ts`   |

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
tuned, largest first". The repair said that clause _is_ satisfied by pre-existing state and _is_
falsifiable by tuning a second project in `vitest.knobs.ts`. **That mutation does nothing**:
`maxWorkers` lives in `rootKnobs`, the file's own docstring records that a per-project worker
declaration "type-checked, it ran, it emitted no warning — and it did nothing" at a ratio of 0.93, and
open `CR-20260820-0003` adds that the runner drops unknown project options silently. An equivalent
mutant, written while applying a finding about that clause. `DR-0017-0010` now records clause 1 as
**unsatisfied** — not, as an earlier version of this line said, "degenerate rather than satisfied",
which P1d refuted by showing `maxConcurrency` is project-scoped.

### Findings per round

**Every row below is produced by the rule, and the two exceptions are named rather than counted.**
The rule: distinct finding identifiers appearing as a heading at level two to four, optionally
backtick-wrapped, counted from the packs on disk.

This line opened "the rule reproduces 25 of the 27 numeral-bearing rows" until round 14, and by then the
table held 37. A pair of numerals over a table that gains a row per reviewer per round cannot survive a
round, and unlike the other stale counts in this record a reader could not repair this one by recounting,
because it is a claim about a RULE's coverage rather than about the table. So it carries no numerals: the
rows are countable and the exceptions are named, which is the form § "Gaps / Open risks" item 7 arrived at
for the same reason.

It said "Every count below is derived" for three rounds. Round 11 implemented the stated rule and ran it
over the table as it then stood: two disagree. Round 4's stage report gives 8 against a recorded 6, because two of its
eight heading identifiers (`E6`, `X1`) are oracle-round ids rather than findings; round 7's P1d gives 0,
because it enumerates its ids inline and carries none as headings. **Both exceptions are properties of
those reports, not of the rule** — which is the opposite of what the next paragraph used to claim. `id families` carries the derivation so the number can be checked
without recounting, and `summary` carries what that pack's own `summary.json` records where the two
differ.

| round | reviewer                  | verdict                                                | findings | id families                 | summary |
| ----- | ------------------------- | ------------------------------------------------------ | -------: | --------------------------- | ------: |
| 1     | `completion-reviewer`     | REVISE                                                 |       13 | B1-B5, M1-M4, m1-m4         |      13 |
| 1     | `qa-gatekeeper` (stage)   | REVISE                                                 |        — | enumerated inline           |       5 |
| 2     | `implementation-reviewer` | REVISE                                                 |       10 | B1-B4, M1-M6                |      10 |
| 2     | `completion-reviewer`     | REVISE                                                 |       13 | B1-B4, M1-M4, m1-m5         |      13 |
| 2     | `qa-gatekeeper` (stage)   | REVISE                                                 |        — | enumerated inline           |       9 |
| 2     | `qa-gatekeeper` (P1d 1)   | REVISE                                                 |        6 | B1-B3, N1-N3                |       6 |
| 3     | `implementation-reviewer` | REVISE                                                 |       10 | B1-B4, M1-M6                |      10 |
| 3     | `completion-reviewer`     | REVISE                                                 |       16 | B1-B7, M1-M5, m1-m4         |      16 |
| 3     | `qa-gatekeeper` (P1d 2)   | REVISE                                                 |        3 | B1-B3                       |       3 |
| 3     | `qa-gatekeeper` (stage)   | **did not run**                                        |        — | —                           |       — |
| 4     | `implementation-reviewer` | not routed — the code was read by round 4's gatekeeper |        — | —                           |       — |
| 4     | `completion-reviewer`     | REVISE                                                 |       16 | B1-B6, M1-M5, m1-m5         |      16 |
| 4     | `qa-gatekeeper` (stage)   | REVISE                                                 |        6 | B1, B2, M4, M4b, B6, B6b    |      12 |
| 4     | `qa-gatekeeper` (P1d 3)   | REVISE                                                 |        5 | B1-B2, M1-M3                |       8 |
| 5     | `completion-reviewer`     | REVISE                                                 |       17 | B1-B7, M1-M5, m1-m5         |      17 |
| 5     | `qa-gatekeeper` (stage)   | REVISE                                                 |       12 | B1-B10, M1, M3              |      17 |
| 5     | `qa-gatekeeper` (P1d 4)   | REVISE                                                 |        3 | B1-B3                       |       3 |
| 6     | `completion-reviewer`     | REVISE                                                 |       17 | B1-B6, M1-M5, m1-m6         |      18 |
| 6     | `qa-gatekeeper` (stage)   | REVISE                                                 |       10 | B1-B10                      |      20 |
| 6     | `qa-gatekeeper` (P1d 5)   | REVISE                                                 |        2 | B1-B2                       |       3 |
| 7     | `completion-reviewer`     | REVISE                                                 |       21 | B1-B6, M1-M7, m1-m8         |      21 |
| 7     | `qa-gatekeeper` (stage)   | REVISE                                                 |       18 | B1-B11, A1-A7               |      18 |
| 7     | `qa-gatekeeper` (P1d 6)   | **PASS**                                               |        8 | M1, A1-A7 (inline)          |       8 |
| 8     | `completion-reviewer`     | REVISE                                                 |       29 | B1-B6, M1-M7, m1-m16        |      29 |
| 8     | `qa-gatekeeper` (stage)   | REVISE                                                 |       22 | B1-B11, A1-A11              |      22 |
| 9     | `implementation-reviewer` | REVISE                                                 |       25 | B1-B4, M1-M9, m1-m12        |      25 |
| 9     | `completion-reviewer`     | REVISE                                                 |       22 | B1-B6, M1-M6, m1-m10        |      22 |
| 9     | `qa-gatekeeper` (stage)   | REVISE                                                 |       17 | B1-B8, A1-A9                |      17 |
| 10    | `implementation-reviewer` | REVISE                                                 |       26 | B1-B6, M1-M9, m1-m11        |      26 |
| 10    | `completion-reviewer`     | REVISE                                                 |       20 | B1-B5, M1-M7, m1-m8         |      20 |
| 10    | `qa-gatekeeper` (stage)   | REVISE                                                 |       16 | B1-B9, A1-A7                |      16 |
| 11    | `implementation-reviewer` | REVISE                                                 |       16 | B1-B4, M1-M5, m1-m7         |      16 |
| 11    | `completion-reviewer`     | REVISE                                                 |       17 | B1-B6, M1-M7, m1-m4         |      17 |
| 11    | `qa-gatekeeper` (stage)   | REVISE                                                 |       15 | B1-B8, A1-A7                |      15 |
| 12    | `implementation-reviewer` | REVISE                                                 |       16 | B1-B2, M1-M6, m1-m7, A1     |      16 |
| 12    | `completion-reviewer`     | REVISE                                                 |       26 | B1-B6, M1-M9, m1-m8, A1-A3  |      26 |
| 12    | `qa-gatekeeper` (stage)   | REVISE                                                 |       14 | B1-B6, A1-A8                |      14 |
| 13    | — none ran                | —                                                      |        0 | reviewers died on ENOTFOUND |       — |
| 14    | `implementation-reviewer` | REVISE                                                 |       10 | B1-B5, m1-m3, A1-A2         |      10 |
| 14    | `completion-reviewer`     | REVISE                                                 |       14 | B1-B3, M1-M4, m1-m4, A1-A3  |      14 |
| 14    | `qa-gatekeeper` (stage)   | REVISE                                                 |       14 | B1-B4, M1-M4, m1-m3, A1-A3  |      14 |
| 15    | `implementation-reviewer` | REVISE                                                 |       15 | B1-B4, M1-M2, m1-m6, A1-A3  |      15 |
| 15    | `completion-reviewer`     | REVISE                                                 |       14 | B1-B5, M1-M3, m1-m4, A1-A2  |      14 |
| 15    | `qa-gatekeeper` (stage)   | REVISE                                                 |       10 | B1-B2, M1-M4, m1-m3, A1     |      10 |
| 16    | `implementation-reviewer` | REVISE                                                 |        8 | B1-B4, M1, m1, A1-A2        |       8 |
| 16    | `completion-reviewer`     | REVISE                                                 |       13 | B1-B5, M1-M5, m1-m2, A1     |      13 |
| 16    | `qa-gatekeeper` (stage)   | REVISE                                                 |        9 | B1-B2, M1-M2, m1-m3, A1-A2  |       9 |
| 17    | `implementation-reviewer` | REVISE                                                 |       10 | B1-B4, M1-M3, m1-m2, A1     |      10 |
| 17    | `completion-reviewer`     | REVISE                                                 |       11 | B1-B5, M1-M4, m1, A1        |      11 |
| 17    | `qa-gatekeeper` (stage)   | REVISE                                                 |        6 | B1, M1-M2, m1-m2, A1        |       6 |
| 18    | `implementation-reviewer` | REVISE                                                 |       11 | B1-B5, M1, m1-m4, A1        |      11 |
| 18    | `completion-reviewer`     | REVISE                                                 |       12 | B1-B5, M1-M3, m1-m3, A1     |      12 |
| 18    | `qa-gatekeeper` (stage)   | REVISE                                                 |       11 | B1-B2, M1-M4, m1-m3, A1-A2  |      11 |
| 19    | `implementation-reviewer` | REVISE                                                 |        8 | B1, M1-M3, m1-m3, A1        |       8 |
| 19    | `completion-reviewer`     | REVISE                                                 |       13 | B1-B6, M1-M2, m1-m3, A1-A2  |      13 |
| 19    | `qa-gatekeeper` (stage)   | REVISE                                                 |       10 | B1-B3, M1-M3, m1-m3, A1     |      10 |
| 20    | `implementation-reviewer` | REVISE                                                 |        8 | B1, M1-M4, m1-m2, A1        |       8 |
| 20    | `completion-reviewer`     | REVISE                                                 |       16 | B1-B6, M1-M4, m1-m4, A1-A2  |      16 |
| 20    | `qa-gatekeeper` (stage)   | REVISE                                                 |       15 | B1-B2, M1-M4, m1-m3, A1-A6  |      15 |

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

### Round 15, against round 14's repairs

Round 12 established that five of its own findings had been introduced by the two or three commits before
it, so round 15 was pointed at round 14's repair work rather than at the tree in general. It returned
**eleven blocking findings across three reviewers**, and three of the eleven were defects in round 14's
repairs themselves.

**Two execution channels shipped through the entire 5462-test suite**, and both used only keys already on
round 14's three key lists — so the inversion those lists represent was never asked a question:

- a `uses:`-only `pnpm/action-setup` step in a placeholder lane. A step with no `run:` is invisible to
  `refusals()`, to the program pin, to `bodyDigest` and to the body multiset, because every one of them
  reads bodies. `ALLOWED_ACTIONS` allowed it by NAME, and a name is allowed in every job. Action steps are
  pinned to the job they were reviewed for now, exactly as bodies are;
- a second `actions/setup-node` carrying `node-version: lts/*`. The literal check needs a leading digit,
  and the resolver-chain row skipped any `setup-node` that does not reference a step output — so the row
  asserted the real resolver while a later step overrode it. **Finding one step that resolves correctly is
  not the same as there being no other**, which is the shape of every "the tree contains none" claim here.

**The third `bodyDigest` collision retired the practice of normalizing at all.** Round 14 recorded the
`\r\n` fold as unreachable, on a measurement of block scalars — where the parser folds line breaks
itself. A quoted FLOW scalar hands the digest a live CR, and a CR before a newline ends a line
continuation exactly as a space does. Three attempts to be helpful, three collisions, each erasing a
difference bash acts on. `payloadDigest` had the same defect with a sharper edge: a `//` comment is
terminated by a newline, so collapsing moved the statement after the last comment line inside the comment —
demonstrated against a **currently enumerated** payload whose digest did not move, which means the scan was
clearing a payload nobody had reviewed.

**`<>` opens a file for reading and writing**, and the direction was read off the operator's first
character, so `printf '{…preinstall…}' 1<>package.json` plus an enumerated install returned `[]` and ran
the hook. **The digest multiset was blind to location**: swapping two reviewed bodies moved the
lockfile-aware install into a job that runs on every pull request with every gate green.

Six more findings were one shape: a token-shaped test disagreeing with the character walk that knows what
a redirection is. `npm ci 2>&1` refused itself, `2>&1 npm ci` resolved to a program called `2>&1`, `>|`
was split at the pipe into a refusal naming the empty string, `${GITHUB_OUTPUT}` was refused while
`$GITHUB_OUTPUT` was allowed, `select`'s word list was read as a command, and a here-document's data was
read as commands. `invocationOf`, `bareArgumentsOf` and the refusal walk all read a command with its
redirections removed by that one walk now.

**And three of round 14's own repairs could not fail**, which is the finding worth carrying forward:

- the derived corpus count matched three fixed phrasings, so rewording the sentences and setting them all
  to 31 was green — and a fourth site the record calls derived was reached by none of the three;
- merged class C was `not A and not B`, a predicate that accepts whatever the other two reject, so a
  plainly untested cell filed under it with the reason "no one has looked" passed;
- the retracted-claims guard read `.qfai/**`, and three claims round 12 refuted were standing in a test
  file's comments — surviving round 14's correction of five sites because nothing looked outside that
  directory.

Each is the same defect the guard it lives in was written to catch, one level out: a check that cannot
fail from outside the phrasing, the coordinates or the directory it was written against. The repairs are a
floor, a roster and a wider file list, and each was falsified in the direction that matters before it was
kept.

### Round 17, and the second time this stage edited the subject mid-round

**The stage broke its own rule again.** Round 12 established that a finding measured against a
half-applied tree is indistinguishable from a false one, and this record wrote that up as a defect in how
the stage runs rounds. It happened a second time here: while `completion-reviewer` was still measuring,
two files carried an uncommitted change of mine for part of the round. I disclosed it unprompted, reverted
to HEAD, and asked the reviewer to re-take anything affected and to report it rather than soften it. It
re-took every affected measurement at the clean tree and all results were identical, which is luck rather
than diligence — the point of the rule is that the reviewer should not have to.

The round's own findings, against work the stage did in round 16 and against two things it did unprompted:

**Two walks disagreed about what a quote is, three ways**, and each ran a build with the scan clean. ANSI-C
quoting (`$'a\''` is two characters, and the escaped quote does not close the string) was modelled by
neither. `codeMask` had no model of `$( … )`, so `"$(echo ")")"` put a `)` on a code position and a real
pipe stopped splitting — one quotation mark decided the verdict, and `commandsOf` had entered substitutions
all along. And `<<\EOF` is bash's third spelling of a quoted delimiter, which the walk did not unquote, so
the closer never matched — whereupon the rule answered a missing closer by treating the whole rest of the
body as data. **Fail-open, in the one place this file exists to be fail-closed.**

**The scope gap both reviewers predicted was real and the gate demonstrated it.** Every pin read
`.github/workflows/**`; `qfai init` writes more. A planted `package.json` with a `preinstall` and an
`.npmrc` reached the adopter root, the digest-approved install ran them, and the whole suite stayed green.
The one thing that caught a first variant was eslint's `no-require-imports` — a rule about how the planted
file was written — and inlining the payload evaded it.

**And the shape pins read a parsed document, which is not an identity.** Eight YAML spellings of an empty
value collapse onto one `null`, a non-mapping step is invisible to `isRecord`, number spellings collapse:
two files that differ can serialize the same. The boundary is the bytes now, and the shapes say which part
moved.

**Four of round 16's guard repairs failed again, all in one shape** — the check reads a wider region than
the claim it makes. The corpus count searched the whole file for a numeral three words from the word; class
C's roster built its named-cell set from the whole matrix; the Delta tie read any pipe-line in the section;
and the depth-score pin read only the FIRST bullet, so a second one contradicting the table passed. This
sentence said "three" while the commit that wrote it enumerated four bullets beneath it — round 18 filed
the discrepancy, `19c33aa1` applied the rest of that round and left this, and round 19 found it standing.
That shape is now the stated failure mode of the family, and each repair is scoped to the region its claim
is about.

**Two doubled escapes were found this round by a method worth keeping**: extract the regex from the file's
own bytes and evaluate it, rather than reading it. `\*\*` is an escaped backslash and a quantifier, not two
asterisks; a `]` escape inside a character class closes the class. Both lines read correctly.

**And three of the round's findings were against this stage's own corrections.** The `revision_form` repair
was a fix and this record called it an unsettleable open question — the contract settles it in one sentence,
three directories away, which nobody had looked for. The `--profile full` figure was measured before the
repair that changed it. And option 2's rejection lost its third ground, after this stage supplied the third
to replace one its own correction had removed. Correcting a record in place costs following the correction
to whatever cites it, and twice now that cost was paid by the next round instead.

### Round 18, and what eighteen rounds have established

`implementation-reviewer` executed about 1600 cases with a fake bundler on `PATH` as the oracle. **Fifty
ran a real build while `refusals()` returned `[]`**, and they reduce to five independent causes:

- **`matchingParen` had no backslash model.** It is this file's THIRD quote walk and the one the other two
  depend on, so an escaped quote inside a substitution closed it early and the build after the separator
  landed inside a word. Two walks were repaired in round 17 and the third was not looked at.
- **`codeMask`'s comment rule was missing the guard `commandsOf`'s carries** — the exact repair round 17
  made in one of the two walks and not the other, one round later.
- **An unquoted here-document delimiter leaves its data subject to expansion.** The repair treated all
  data as inert and its own comment cited only the quoted case, which is the reading that was wrong.
- **The delimiter scan did not break on `<`, `>` or `(`**, so the scanner and bash named different
  delimiters — which also turned the shipped `$GITHUB_OUTPUT` idiom, one space removed, into a false
  refusal.
- **`lastCode` was nearly the question.** It answered "what is the last code character" where all three
  of its callers meant "what is the previous character, and is it code". The difference only shows when
  something masked sits between, and a quoted redirection target is exactly that: `echo x >
"$GITHUB_OUTPUT" | npx tsup` ran a build with the scan clean. It is deleted. **A helper that is nearly
  the question is worse than none, because it reads as though it were the question.**

**The init surface was beaten again, one commit after it was built.** `INIT_MUST_NOT_SHIP` called itself
a kind rule and was an extension list, so a `#!/bin/sh` hook with no extension and mode `0755` shipped
into an adopter tree with the whole suite green. A name is not a kind: the rule now asks the three
questions that decide whether something runs — a shebang, an executable bit, a name a tool knows.

**And the four record guards failed for the fourth consecutive round.** Round 18's four were three in
round 17's shape verbatim plus one in the shape round 17's own repair introduced: told that each guard
read a wider region than its claim, the corpus-count repair narrowed the NEEDLE instead and lost a
spelling the version before it caught.

**Round 19 broke all four again with 36 plants, and every one of its findings is a NEEDLE defect over a region that is now correct** — 17 plants green that should have reddened, 7 true records reported
wrong. An indented fence is still a fence and defeated the Delta tie both ways; the corpus needle was a
closed enumeration of four phrasings that missed five wrong sizes, including this record's own
spelled-out house style, while falsely accusing two true sentences; class C's roster passed round 18's
own swapped-reasons plant verbatim; and the depth-score pin admitted four more markers while reddening
a blockquoted quotation that its sibling guard pins as exempt by design. The repairs widen the needles
and enumerate the exceptions, which is the shape every other allowlist in this stage's work has.

**What nineteen rounds have established, stated once here rather than re-derived each round.** Round 19
read this list against what actually happened and found two of the five false as written and one
misdirecting the repairs it exists to inform — so each now carries the evidence for it and, where the
evidence cuts the other way, the counter-example.

1. **A boundary drawn at a reading is a boundary at the reader's limits.** Every escape in rounds 15 to
   19 was a place where what the scan read was narrower than what bash, YAML or the filesystem does.
   **The correction does not always move outward, and believing it does is itself a defect**: the earlier
   version of this line said each repair moved the boundary out, two paragraphs below a sentence
   recording the delimiter scan turning the shipped `$GITHUB_OUTPUT` idiom into a false refusal — a
   boundary that had to move IN. Round 19 found four more of those: two false accusations in the
   corpus-count needle and two true records reddened by the depth-score pin. A rule stated
   one-directionally produces the repair that breaks in the other direction.
2. **Two copies of a rule diverge, and the one nobody is looking at is the one that is wrong.** Three
   quote walks, two comment rules, two fence strippers, two roster directions: every one of these was
   found as a disagreement rather than as an error. **This is the lesson with the best evidence and the
   worst record of being applied.** The commit that first wrote it repaired a bare-dash anchor in
   `coverageDepthMatrix.test.ts` and left the identical anchor fifteen lines above it, and made a
   blockquoted line an assertion in that guard while `retractedClaims.test.ts` pins it as a quotation in
   the other. Both were round 19 findings. Writing a lesson down is not applying it, and the check that
   applies it is: after fixing a rule, grep for the rule.
3. **A guard's region and its needle are two claims, and a repair to one is not a repair to the other.**
   The earlier version of this line named the region alone — "four guards, four rounds, one cause" —
   and it was wrong on its own evidence: of round 18's four findings, two were region defects, one was a
   needle defect in a region that round explicitly called an improvement, and one was an anchor in a
   region nobody faulted. The consequence is on the page. The repair pass that followed fixed every
   region, and round 19's four guard findings are **all needle defects with correct regions**. Naming one
   of two causes as the cause is how a fifth attempt reproduces a fourth attempt's failures.
4. **Correcting a record in place costs following the correction to whatever cites it**, and the next
   round has paid that cost instead of the stage more than once — the `revision_form` repair, the
   `--profile full` figure, option 2's third ground, and round 19's finding that the integration+unit
   move was attributed to the wrong commit. The earlier version of this line said "twice", which was
   already wrong when written: a numeral nothing derives, inside the list written so that numerals stop
   being re-derived.
5. **"I cannot settle this" needs the evidence any other claim needs.** Recorded because this stage once
   called a question unsettleable while the contract that settles it sat three directories away,
   unlooked-for. The earlier version said "the one time", which is false and reads as condemning a
   practice this record also endorses: it records an open question rather than an answer in at least four
   places — `TC-0017-0016`, the disagreement that stands whatever is approved, the second timeout left to
   its owner, and option 2's live disposition — and each of those is a deferral WITH its evidence, which
   is the thing this lesson asks for rather than the thing it warns against.

### The differential corpus is executed, not asserted

Round 19's `implementation-reviewer` filed the asymmetry: a `live` row asserts two things — the mask says
code, and `refusals()` refuses — so a misfiling there costs at most a spurious refusal. An `inert` row
asserts one, that the mask says NOT code, and **nothing checked the premise that bash does not run it**.
A wrong `inert` row passes precisely when the mask is also wrong, which is the only case anyone cares
about: the round-19 escape body filed under `inert` — a plausible reading, since the quote is "inside a
here-document" — would have had the round's headline instrument certifying the escape.

So every row is now run. A fake `npx` on `PATH` appends its arguments to a marker file and exits 0; each
decoration goes through `bash -c` with the marker cleared first; the row is correct when the marker's
existence matches the list it is filed under.

```text
40 decorations executed under bash
   29 live    all 29 ran            marker: "npx tsup" (and "npx tsup )" for the round-19 escape)
   11 inert   none of the 11 ran    marker absent
```

**What it costs, measured, because round 20 asked.** Forty serial subprocesses: **4.1 s** alone and
**12.3 s** inside a full `--project e2e` run against this repository's ten workers. The review
measured 12 s against a 15 s budget and called it a risk; the budget is the describe's own
`{ timeout: 120000 }`, not the project default, so the margin is ten times the cost rather than a
quarter of it. Recorded because the next round should not have to re-derive which budget applies.

**Two rows were misfiled and the run is what found them**, which is the whole argument for doing it:

- `build_once() { %s; }` — bash defines a function body and does not enter it, so the row asserted an
  execution that never happened. It is `build_once() { %s; }; build_once` now, which keeps the construct
  the row exists for and makes the claim true.
- `if [ -f package.json ]; then %s; fi` — live only where that file exists, which is the context it
  models. The first harness ran from a directory without one and measured its own cwd. The harness
  writes a `package.json` into its lab, and `GITHUB_OUTPUT` points into the lab too, so nothing in the
  corpus writes outside it.

**And the harness is committed rather than deleted with the round.** Round 19's gate stated the residual
exactly: the differential test asserts that two instruments in one file AGREE, so a fault common to both
leaves it green, and the `inert` half — meant to anchor the mask to reality — anchored it to shapes the
stage asserted were inert. Nothing in the committed suite ran a shell. "The only oracle that has ever
found a defect in this file lives in reviewer scratch and is deleted at the end of each round."

It is now a test in `spec0017LayeredCiScaffoldE2E.test.ts`, under `US-0017-0004`, and the two corpora
moved into the helper so both instruments read the same objects — a second copy would have put them
back on separate evidence, which is what this file is a record of. It skips, loudly, where no POSIX
shell resolves; CI is `ubuntu-latest` and Git Bash answers here, so it runs in both places.

Falsified four ways, each restored from a copy taken first: an inert shape filed as live, a live shape
filed as inert, a comment filed as live, and reverting the `build_once` correction above. All four
redden, and each names which side of the claim bash disagrees with.

### The full profile

**`validate --profile full` has no single number, and that is the finding.** `build` runs the profile,
and three of its rules — `QFAI-REVIEW-004`, `-005`, `-007` — report against the review pack this stage
has open. So the count tracks the ROUND's state, not the revision's — and, on a working copy, the number
of untracked packs sitting beside it. Re-measured at round 19: **47 with the current round sealed, 49 at
a revision that has just opened a pack, 48 once reports land in it and before a `summary.json` does.**
Each of those is one lower than round 18 recorded, because `QFAI-ATDD-111` closed mid-round through
another session's work — which is the third distinct way this figure has moved without the subject
changing. Round 16 recorded 49 as a property of the tree; round 17's gate measured 50 at the committed
revision and reconstructed the sequence from the run-log timestamps.

A number that moves three ways without the subject changing is not a measurement of the subject, so what
is recorded here is the rule and the deltas — and **the absolute is not a property of any revision of
this repository, which round 19's gate found and this stage confirmed by measuring it.**

`git clone` + `pnpm build` + the recorded command gives **4**, not 48. The gate ran the profile on a
`git archive 7fbac2d3` shadow with all 83 symlinks re-materialised and got `error=4`; at `19b751ca`, with
the pack just opened, `error=6`. Both are the same five rules the table below lists, minus the
`QFAI-REVIEW-007` term entirely.

The gap is one rule and it is local. `.qfai/review/` is ignored and its packs are force-added, so the
directory holds far more than any revision contains. **These four numbers move while you read them**,
which is the point rather than an inconvenience: round 19 recorded 64 / 317 / 22 / 98, round 20's
reviewer measured 65 / 319 / 23 / 103 during its own run, and this stage measured **65 pack
directories and 322 files on disk against 23 directories and 103 files tracked** an hour later. Every
difference is a review pack landing on this machine. What is stable is the RATIO of the thing to its
tracked part, and the fact that the untracked remainder drives the figure below. `QFAI-REVIEW-007` fires once per pack whose
`summary.json` fails the minimum schema, and this stage attributed every finding of the current run to
the pack it names: **45 packs cited, 43 of them untracked** — measured twice, an hour apart, with the
same answer even as the totals above moved. Those 43 belong to other stages, on this
machine, and no revision of this repository contains them.

So the figure recorded through rounds 15 to 18 has the defect this record spent four rounds naming about
the two suite totals, one size larger. "Round 16 recorded 49 as a property of the tree" is quoted below
as an error; 48 was then recorded as a property of the ROUND, which is a smaller claim and still not the
true one. It is a property of **this working copy**, in a block whose own first sentence says the numbers
are measured at the working tree of this commit — which for this line is false in the way that matters,
because that commit checked out fresh does not produce it. The seal sealed the ±2 term and left the 92 %
term unsealed, and that term moves whenever anyone on this machine opens or closes a pack for **any**
spec.

What is a property of the subject, checkable at any revision, is the rule and its deltas:

> `+2` on opening a pack, `−1` once reports land in it, `−1` once a `summary.json` does.

Both committed revisions above satisfy it (4 sealed → 6 just-opened). On a working copy the same rule
holds on top of however many untracked packs it carries: **47 sealed / 49 just-opened / 48 with reports
and no summary**, re-measured at round 20 with 42 untracked packs present, and **48 is the state this
commit is in** — round 20's pack open, its three reports landed, no `summary.json` yet.

Round 20's `completion-reviewer` found this section saying 49 while `## Commands executed` said 48,
one working copy and two answers, because the commit that moved the figure here moved it in one place.
That is lesson 4 — a correction costs following it to whatever cites it — inside the round that
rewrote lesson 4. Both now read 48, and both name the state that produces it. Cite the deltas. An absolute cited without the untracked-pack count beside it, and the
date it was taken, is not a measurement of anything a reader can reproduce.
Re-measured at round 15, which found this figure certifying `error=4` — a number carried since round 4
and never re-run, in the block whose own first sentence says it is re-measured rather than carried.

**Round 15 then recorded 50, and round 16 found that wrong for a reason worth stating: the same commit
measured the number and removed one of the items that made it up.** I ran the profile, saw 45
`QFAI-REVIEW-007`, fixed the one of the forty-five this stage had written, and wrote the pre-fix figure
down as current — "error=50", at three sites, which round 17 corrected from the "five" this sentence
claimed. Measuring before repairing and recording after is a sequence that
produces a true measurement of a tree that no longer exists, and nothing in this record's derived-count
machinery reaches the unscoped profile.

The decomposition, on this working copy, with the round sealed — **47 now, 48 until round 19**, and
the row that left is the worked example of why the absolute is not the subject's property:

```text
QFAI-REVIEW-007   44   summary.json missing or misusing `revision_form`
QFAI-REVIEW-004    1   review pack layout
QFAI-REVIEW-005    1   review pack layout
QFAI-ATDD-111      0   CLOSED during round 19 by another session's coverage commit; it was 1
QFAI-ATDD-112      1   unscoped: 15 TCs across four specs, of which it owns 8
```

`QFAI-ATDD-111` and `-112` are one finding each, not one per item — which is why four was ever a
plausible total, and why the two numbers in the table above are the ones `build` actually needs cleared.

**`QFAI-REVIEW-007` is a rule this record had never named.** One of the original forty-five belonged to
this stage — round 14's `summary.json` carried `revision_form: "commit"`, a value the contract does not
admit — and it is corrected and the pack re-sealed, which is what took the count to forty-four. The other
forty-four are packs other stages wrote: a cross-spec obligation rather than this stage's work, recorded
with its number per this skill's CRITICAL CONSTRAINTS rather than waived.

**That correction was a fix, and the paragraph that called it a relabel was wrong.**
`references/review-artifact-layout.md` settles the field in one sentence: `revision_form: "content-hash"`
with `revision` given "as a git rev or `working-tree+<content hash>`". A short commit sha is the first of
those two forms, so the round-16 edit moved the pack from a value the schema rejects to the value the
contract prescribes.

This paragraph said the opposite for a round — that the repair had relabelled rather than corrected, and
that this stage could not settle which reading was right "because the contract is not this spec's". The
contract is three directories away and says so plainly. **"I cannot settle this" is a claim, and it needs
the same evidence as any other**: round 17's gate found the sentence by reading the file this stage had
declined to look for. Recorded rather than deleted, because the failure is not the wrong answer but the
decision to record an open question instead of spending five minutes closing it.

`QFAI-REVIEW-004` / `-005` are against **a review pack that is not yet sealed** — a pack cannot satisfy
the layout contract until its last reviewer has landed and it has been sealed. Round 17's gate found this
sentence attributing them to "this stage's own in-flight pack" while the pack they named was round 13's,
abandoned since `b62adfa1` because its three reviewers died before writing. **And round 18 found the
sentence that replaced it backwards**: round 13's pack was not sealed by that correction and still holds
only a request, so it is one of the packs in both of those errors rather than a cleared one. What moves
the count to 48 is the CURRENT round being sealed, not round 13. Round 4's gatekeeper found
this undisclosed, and it is the same class of gap as the two packs that were missing `summary.json`:
masked in CI only because the `tdd` step fails first on the scoped gate's error, which was `error=2` when
this was written and is `error=1` now.

P1d's gate is **closed** — it passed at pass 6 and round 8 did not re-route it, because re-deciding a
decided gate is not a review. **The round after the current one is owed**: this stage does not claim its
own repairs reviewed, and every round so far has found defects in the previous round's repairs. That
sentence read "a ninth stage round is owed" for six rounds, in the paragraph that says what completion is
still waiting for — an ordinal expires every round, and the rule does not, which is the form the callsite
line two sections up arrived at for the same reason.

## Final status (PASS/FAIL) + who confirmed

**FAIL — incomplete by this skill's own Definition of Done.**

What was achieved: all nine of `spec-0017`'s `US-*` are covered from `tests/e2e/**` with real
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

- the stage's own gate `validate --profile atdd --fail-on error --spec 0017` exits 1 — `error=1`,
  `QFAI-ATDD-112` on eight TCs. (This list opened with "`US-0017-0007` is uncovered … the scoped gate
  is `error=2`" until round 14, in the section that certifies.)

  **And two of the eight cannot be cleared before this pull request merges, by construction.**
  `TDD-0069` and `TDD-0070` rest on `EX-0017-0053`, which requires three consecutive green
  aggregate-verdict runs quoted by run identifier. `ci-pass` derives its verdict from `build`, `build`
  fails on `QFAI-ATDD-112`, and `QFAI-ATDD-112` names `TC-0017-0069` among its eight. The row waits on
  a run that is gated on the annotation the row would justify — `CR-20260820-0012`, whose recommended
  option 5 says in as many words that it "does not close `TDD-0069` on its own", and whose option 4 is
  **merge first, then satisfy it**. That option exists because the cycle has no pre-merge exit.

  So the four decisions below are not a choice about whether to unblock CI before merging. For six of
  the eight they are; for the last two the choice is option 4 or nothing, and a reviewer should know
  that before reading a red check as a defect.

  Checked four ways rather than assumed, and recorded so no later round re-derives them:
  - **a waiver cannot reach it.** `.qfai/waivers.yml` states the rule in its own header — "Waivers
    apply to `warning` and `info` findings only. A waiver aimed at an `error` is a configuration error
    and fails the run." `QFAI-ATDD-112` is an `error`, so the `TDDLIST-001` path this skill names for a
    parked row does not apply to the gate that row's absence produces;
  - **weakening the profile or `--fail-on` is forbidden by name** in this skill's CRITICAL CONSTRAINTS;
  - **covering the eight now is forbidden by the rows themselves.** Six are `blocked`, and
    `CR-20260818-0007`'s note says what implementing anyway would be: "choosing the rule's meaning
    rather than applying it";
  - **the rule's presence in the `tdd` profile is deliberate, not a leak.** `validate.ts:493-500`
    carries the reason in source: "`qfai-implement` names `--profile tdd` as its only completion gate,
    and it is the stage that creates test-routing obligations. Without this the profile was
    structurally incapable of observing QFAI-ATDD-111/112/113/121/122." `main` runs the identical step
    and passes it, so the condition is this branch's and the gate is not the thing to change.

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
**twenty** rounds, **53** reviewer responses, **52 REVISE and one PASS** — the PASS being P1d's sixth
pass on `DR-0017-0010`. No stage-level gate has passed. **The response count covers CLOSED rounds**:
round 15's three land in it when a further round opens. Counting the in-flight pack made this row red for
the whole duration of every round — a required CI leg failing because a reviewer wrote a report, which the
stage could not fix without editing the subject mid-round, the one thing the round's rules forbid. Round
15's `qa-gatekeeper` measured this tree green and then red four minutes later with nothing between but a
sibling's report landing. Every earlier version of this line was a round
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
the second, because a verdict is not written in one parseable form — measured over the 17 closed packs'
50 reports, 5 carry `**Verdict: X**`, 14 carry `Verdict: **X**` and 46 carry a line holding both — and
inventing a marker now would pin only the reports written after it. The figure that stood here, "two of
twenty-nine", was wrong in numerator and denominator; round 18 filed it and round 19 found it standing
in a second place after the first was corrected.

**The per-round table that used to sit here is deleted.** It carried the reviewers, the revision and
the verdict for rounds 1 to 12 and stopped there, three rounds behind the derived numeral three
paragraphs above it — a hand-maintained table beside a derived one, going stale on the schedule this
record has faulted itself for eleven times. § "Findings per round" holds the reviewers, the verdict and one
more column, and its rule is stated. **It does not hold the revision**, which round 16 pointed out and
the first version of this paragraph denied by claiming nothing was lost. What the revisions are for is
saying which tree a verdict was measured against, and each round's `summary.json` records that inside the
sealed pack — a better home than a copy of it, since the copy is what went three rounds stale. The second
place to update every round was the whole of what the table cost. That is the argument the per-commit e2e sequence was deleted on, and
the reason to make it again rather than add three rows.

The revisions the deleted table carried are the ones each round's `summary.json` records, which is where
a reader should look for them: they are in the packs, sealed, rather than in a copy of the packs.

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

**Twenty** packs, one per round — and round 13's holds a request and no reports, because its three
reviewers died on `ENOTFOUND` before writing. Zero is a legitimate response count for a round; it is not
a passed one. The seal is _supposed_ to be fixed at the moment the last reviewer
response lands, and § "When each pack was actually sealed" below measures the gap **per round**, without a
summary figure — because this sentence carried one ("four of seven closed packs") while the section it
points at had already retracted that exact wording for going stale as packs closed. One section asserting
what another declares withdrawn is worse than either alone: a reader who finds the assertion first has no
reason to keep reading. Both numerator and denominator move every round; the table is the claim.

**The pack count is derived, and its history is worth one telling rather than two.**
`packages/qfai/tests/assets/stageEvidenceCounts.test.ts` compares the packs this section names against the
directories on disk. Before that, the figure was wrong twice in different ways: the section said "Three
packs" against four directories, which round 4's `completion-reviewer` caught, and the numeral itself was
never derived — it read "Three" in round 4 and "Four" from then until round 7. The guard caught a missing
fourth seal on its first run, because the edit that was supposed to add it aborted on a later needle and
wrote nothing.

This paragraph existed twice, twelve lines apart, in a section whose subject is records that disagree with
themselves — and the two copies had drifted, attributing the original defect to different causes. Merged
here, with both facts kept.

Rounds 2 and 3 were **missing their `summary.json`** until round 3 found it; round 4's was missing until
round 4's gatekeeper found the same thing again, this time as two live `--profile full` errors. Each was
written, then sealed — the same sequence round 1's pack went through, which this record had documented while
leaving the next pack in the state it described, twice.

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
Review pack seal:  44d99dce97dbf4ae1a2e96b4b08eba2154edeff5536aab3035d77cdec9e390f6
Review pack:       .qfai/review/review-20260821200000000/            (round 13 — stage gates only)
Review pack seal:  7d6b2b328c5025545a4848e1068aab4c31a5a8660ecf80ee15b87a7894ff2f26
                   Closed with a request and no reports: all three of its reviewers died on ENOTFOUND
                   before writing. A pack with nothing in it is closed, not in flight.
                   RESEALED 2026-08-23, from 06638643339f. The pack gained the `summary.json`
                   CR-20260823-0002 option 1 requires, declaring `reviewers: []` — the round
                   produced nothing and now says so instead of looking unsealed. The seal moved
                   because the pack did; recorded here rather than silently recomputed, which is
                   the one thing a seal exists to make impossible.
Review pack:       .qfai/review/review-20260822030000000/            (round 14 — stage gates only)
Review pack seal:  2e22d875cb38120ee6f9ced8b0cd368107060027c64bdec79a61dbd7f4906e44
                   Re-sealed at round 15: its `summary.json` carried `revision_form: "commit"`,
                   which `QFAI-REVIEW-007` rejects. One of the forty-five that rule reports
                   unscoped, and the only one of the forty-five this stage wrote.
Review pack:       .qfai/review/review-20260822060000000/            (round 15 — stage gates only)
Review pack seal:  b96d2d5d521f4ec7dfcf03dabca22537cae4c1eb56ff8e46fe36841fd4185d28
Review pack:       .qfai/review/review-20260822090000000/            (round 16 — stage gates only)
Review pack seal:  b310c5eab9dde8fb57b4430940877610e58def51f34acd3cf9224689b4324f28
Review pack:       .qfai/review/review-20260822120000000/            (round 17 — stage gates only)
Review pack seal:  bcfe4dd3586a4e3d14d07b369ba44bdcab37a072ee901f7dfaa7f9fbaa5dce15
Review pack:       .qfai/review/review-20260822150000000/            (round 18 — stage gates only)
Review pack seal:  b62a5174cf942a19308c18c9bccfccd6cf460ffd3e1d2b6f9c7a97a099e47a29
Review pack:       .qfai/review/review-20260822180000000/            (round 19 — stage gates only)
Review pack seal:  084ba5ee9d2b676aa87d15534d4badb01a028c4bd81bd40efcdade51ddbdb810
Review pack:       .qfai/review/review-20260823000000000/            (round 20 — stage gates only)
Review pack seal:  f988c704c39608dc04e184d88c5af8bdb0cb71340426b7fa966c0f8b9c9e3243
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
 12    0bf5dc4e         0bf5dc4e          same commit
 13    none             none              pack holds a request and no reports
 14    f2711cdc         f2711cdc          same commit
 15    5d14962d         5d14962d          same commit
 16    7d67a719         7d67a719          same commit
 17    953a6afe         953a6afe          same commit
 18    20121003         20121003          same commit
 19    1fad70cb         6f64a9a1          4 commits
```

**Row 19 is the first row in nineteen with a real gap, and it is this stage's own.** The last
report was force-added at `1fad70cb` and the `summary.json` at `6f64a9a1`, four commits later —
the four being repairs this stage applied to round 19's findings between the reports landing and
the pack being sealed. `SKILL.md` fixes the seal at the moment the last response lands, and this
sealed it at the moment the repairs were done. Nothing was laundered: the seal recomputes over the
current bytes and the reports in it are byte-identical to what the reviewers wrote. What the gap
costs is the property the table exists to provide — a reader cannot tell, from the seal alone,
whether the pack was sealed before or after the stage started answering it.

**Round 20 has the same gap, and larger.** The first version of this paragraph said round 20 would
seal before applying anything; it did not, and the sentence was written while that was already
untrue. The cause is structural rather than an oversight: this stage force-adds a pack's files when
it next commits, and it next commits when it has applied something. Sealing at the moment the last
response lands would mean a commit that touches nothing else, which is the change to make and is
not made here. Recorded as the practice actually followed rather than as the practice claimed.

**Rows 13 to 18 were missing for six rounds while the section pointing here said it measures the gap
per round.** Round 19 found a twelve-row table presented as the eighteen-round claim; the rows above
are re-derived here by this section's own method rather than pasted from the finding. Nothing was
hidden by the omission — every missing row is `same commit`, and round 13's pack never received a
report — but the record could not know that without measuring, which is the whole argument this
section makes about the difference between a table and a practice claim. It is the third
hand-maintained table here to go stale, and the other two were deleted on exactly that ground.

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
_reasoning_ would launder an illegitimate re-seal. What discharges it is that the first seal still
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
