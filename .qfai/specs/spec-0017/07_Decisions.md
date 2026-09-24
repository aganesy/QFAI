# 07 Decisions

Decision Records for this spec. A `DR-*` cited from the `DR-ID` column of
`tdd/test-list.md` — which every `exception` row is required to carry — resolves against this
file, so an entry here is what makes that citation checkable.

## ID scheme

- **Spec-scoped**: `DR-0017-NNNN`. Every entry below binds only `spec-0017`.
- **Policy-level**: `DR-0275` (revoke the permanent-gap reservation) and `DR-0276` (`toolchain`
  as a fifth slice category, with the distributed-or-not boundary) are declared in
  `_policies/08_Decisions.md` and recorded in `_policies/10_delta.md` § `2026-08-05 — CHG-007`.
  They are cited from here and deliberately not restated: an ID declared twice has two owners.

## Decisions

### DR-0017-0001: the size signal is a signal, not a SPLIT trigger

- Status: accepted
- Context: this spec is created carrying 34 acceptance criteria, and the downstream test-case
  count will exceed fifty. `_policies/11_Slice-Policy.md` § `APPEND vs CREATE 判定アルゴリズム`
  carries a size test of `acCount <= 30 && tcCount <= 50`, and its step 4 routes a
  capability-holding spec that exceeds the threshold to **SPLIT**. Read carelessly, this spec
  looks like it was born over the line.
- Decision: record the breach as a **signal only**, and hold `spec-0017` as one collective spec
  owning exactly `CAP-0017`. A count-driven SPLIT of this spec is illegal and must not be
  proposed by a later triage. Three independent reasons, each sufficient on its own:
  1. **The threshold gates allocation, not existence.** The size test is a step in the
     append-versus-create algorithm that decides _where a newly arriving requirement goes_. It
     is not a size cap on a spec. `spec-0017` arrived through an approved `CREATE` row
     (`user@2026-08-05`), not through an `APPEND`, so the threshold never gated its creation and
     cannot retroactively condemn it.
  2. **The SPLIT trigger's precondition is false here.** The trigger is "one spec holds several
     capabilities and needs its responsibilities separated". `spec-0017` holds exactly one
     capability. There is nothing to separate.
  3. **A SPLIT has no legal end state.** `validateSpecSplitByCapability` derives its expected
     spec set **positionally** from the capability count, mapping each capability's list index
     to the spec directory at that ordinal position. Splitting `spec-0017` into two directories
     would produce eighteen spec directories against seventeen capabilities and raise
     `QFAI-SPLIT-104` at `error`, while the second directory would hold no capability at all.
     There is no arrangement of a split that validates.
- Decision, second half: a future requirement arriving on `CAP-0017` is routed to
  **`UPDATE:APPEND`** with the size restated in its triage rationale, never to SPLIT. This is
  the same shape `DR-0276` licenses when it registers `toolchain` as a **collective** category —
  deliberately collective in the way `spec-0015` is collective for the agent surface, rather
  than accidentally oversized.
- Consequences: this spec will keep growing with QFAI's own toolchain, and the size signal will
  keep firing at every triage. That cost is accepted in exchange for not fragmenting one
  cohesive design across directories that no capability can name. The structural fix is not
  ours: `OQ-0023` tracks making the 1:1 gate pair capabilities to specs by **number** rather
  than by list position, which is what would let the "leave a gap" default stop being a trap.
  Until then, a reviewer seeing the breach should read this entry, not the threshold.
- Related: AC-0017-0001 … AC-0017-0034 (the whole set is the measured input), `DR-0275`,
  `DR-0276`, `OQ-0023`, OC-71

### DR-0017-0002: partial observability is preserved rather than over-asserted

- Status: accepted
- Context: two requirements this spec owns are only partly observable, and the tempting
  correction in both cases is to invent an assertion the tree cannot support. The discussion
  pack marks both `partial` in its testability notes, and the acceptance criteria already
  reflect that. Recording why keeps a later author from "completing" them into a gate that
  either cannot exist or cannot fail.
- Decision, case one — **the action-pin bump owner (REQ-0003).** The pin _form_ is fully
  machine-checked: every reference resolves to a forty-hex SHA or the hygiene lane exits 1
  (BR-0017-0020). The _ownership_ half is not, and cannot be here: no automated bump
  configuration exists (OC-5) and creating one at the repository root requires explicit user
  approval (OC-3), so there is no file for a gate to read. The criterion is therefore written
  as an artifact-existence obligation — a durable repository artifact names the owner
  (AC-0017-0011, BR-0017-0022) — with the one substitute a reviewer would reach for explicitly
  refused: a bump owner stated only in a pull-request description does not satisfy it, because
  no gate can read a pull-request description. Inventing a machine check over a configuration
  that no agent may create would have made the requirement unsatisfiable rather than partial.
- Decision, case two — **build-artifact reuse (REQ-0005).** Its observable is a bundler
  invocation count compared against a captured baseline, and **that baseline does not exist
  yet**; capturing it is a precondition, not an assumption (NFR-0001). The requirement is
  therefore satisfied by **either** landing the reuse (AC-0017-0014) **or** recording a
  measurement that shows a wall-clock regression and keeping the rebuilds (AC-0017-0015). Both
  branches are accepting, which is what keeps the requirement falsifiable in both directions:
  it fails when a change lands with **no** captured numbers at all (BR-0017-0030), not when the
  numbers disagree with the hypothesis. A measured "no" is an outcome, not a failed attempt, so
  no retry-until-it-agrees loop is entered.
- Decision, and what is deliberately _not_ claimed as the same case: REQ-0008's cost partition
  and REQ-0010's final worker value are also incomplete today, but for a different reason —
  their inputs arrive later rather than being unobtainable. Both are already carried by
  measurement-gated criteria (AC-0017-0028, and the `should` priority on the layer-separation
  story), so neither needs a decision of its own. The distinction matters: case one is bounded
  by a policy that forbids the artifact, case two by a measurement that has not been taken.
- Consequences: two acceptance criteria are satisfiable by review plus an artifact rather than
  by an assertion, and one requirement has two accepting outcomes. A reviewer must therefore
  read the recorded evidence rather than only the exit code. The bump-owner half becomes
  machine-checkable the moment a user approves a bump configuration; that is the trigger to
  revisit this entry, and nothing else is.
- Related: AC-0017-0011, AC-0017-0014, AC-0017-0015, AC-0017-0028, BR-0017-0020, BR-0017-0022,
  BR-0017-0023, BR-0017-0029, BR-0017-0030, BR-0017-0031, OC-3, OC-5, OC-80

### DR-0017-0003: the action-pin bump owner is recorded here, as a role

- Status: accepted
- Context: BR-0017-0022 makes the pins unsatisfied until a durable repository artifact names who
  bumps them, and offers two homes — this decision record, or a bump configuration. The
  configuration cannot be created without user approval (OC-3), so this record is the home that
  is available today. The repository declares no code-owner file, so there is no existing
  artifact a name could be resolved from.
- Decision: the bump owner for every action pin under `.github/workflows/**` and
  `.github/actions/**` is **the QFAI repository maintainer role that owns `CAP-0017`**, and the
  obligation is discharged as a step of **release preparation** — the same pass that syncs
  `packages/qfai/package.json#version` to the branch pin and renames the CHANGELOG heading. At
  each such pass the owner re-resolves every pinned SHA against its upstream tag and records the
  result in the pull-request description.
- Decision, and why a role rather than a person: a named individual recorded here would go stale
  with no gate able to notice, which is the same failure class the version-marker rules exist to
  prevent. Release preparation is chosen as the cadence because it is the only recurring moment
  in this repository that is already structurally detectable — the branch-name version pin makes
  it observable, so an owner attached to it cannot quietly lapse into "whenever someone
  remembers".
- Consequences: the pins are auditable by review at a known moment rather than continuously, and
  drift between two pull requests is possible and accepted. Binding the role to a named person
  or team, and any automated bump lane, both require the user; that residual is recorded in
  DR-0017-0002 rather than papered over here.
- Related: AC-0017-0010, AC-0017-0011, BR-0017-0020, BR-0017-0022, BR-0017-0023, OC-3, OC-5

### DR-0017-0004: one script executes both the hygiene rule set and the required-context check

- Status: accepted
- Context: this spec introduces two assertions over the same input. The hygiene rule set
  (BR-0017-0037) parses every own workflow, and the required-context declaration check
  (BR-0017-0043) needs the job graph of every own workflow to decide whether the declared
  context resolves, is unskippable, and still carries its verification set.
- Decision: one repository script owns both. The hygiene script is the executor for the
  required-context declaration check, and the declaration is an input file it reads from the
  working tree. Two output sections, one exit code, one parse of the workflow tree.
- Decision, rejected alternative — a second, separate checker: a second parser over the same
  YAML is a second answer that drifts, and whichever runs first decides. This is the drift class
  the shipped-tree gate exists to close; reproducing it inside our own lane would be
  self-defeating.
- Decision, rejected alternative — a validator rule under `src/core/validators/**`: that surface
  belongs to `spec-0004` and ships to adopters. These checks are repository-internal and read a
  declaration only this repository has, so placing them there would put an undistributable
  obligation on a distributed surface and cross the boundary `DR-0276` fixes.
- Consequences: the script's rule set spans two concerns, so its output must name them
  separately (BR-0017-0038) or a green result becomes illegible. The script is also the single
  point of failure for both checks, which is why every rule carries its own positive and
  negative fixture (BR-0017-0039).
- Related: AC-0017-0019, AC-0017-0020, AC-0017-0021, AC-0017-0024, AC-0017-0025, BR-0017-0037,
  BR-0017-0038, BR-0017-0039, BR-0017-0042, BR-0017-0043, OC-72

### DR-0017-0005: the merge order is part of the design, not of the plan

- Status: accepted
- Context: five obligations in this spec can be violated by **merge order alone**, with every
  file individually correct. A plan file states approach and is not a gate; a decision record is
  citable from a review. So the order is recorded here.
- Decision: the following edges are mandatory, and a pull request that inverts one is rejected in
  review regardless of its diff:
  1. The derived aggregate verdict (BR-0017-0001) merges **before** any change that adds a job
     (BR-0017-0005). Otherwise a job can be added to a gate that ignores it.
  2. The own-tree hardening — permissions, checkout flags, pins (BR-0017-0015, BR-0017-0018,
     BR-0017-0020) — merges **with or before** the hygiene lane that asserts it. A lane that
     precedes its own tree's hardening lands instantly red.
  3. The single setup definition (BR-0017-0024) merges **before** build-artifact reuse
     (BR-0017-0029). The dedup is what makes reuse a win rather than a trade, because it is what
     removes the per-job install the reuse would otherwise still pay.
  4. The shipped-set structural contract gate — `spec-0003`'s, not ours — merges **with or
     before** the duplicate validate workflow's deletion (BR-0017-0061).
  5. Shipped-tree hygiene coverage (BR-0017-0044) merges **with or after** the shipped
     hardening, never before it (BR-0017-0045).
- Decision, and one non-edge stated so it is not invented: the parallelism **structure**
  (BR-0017-0047, BR-0017-0048) does not wait on the measurement. Only the final value does
  (BR-0017-0049). Slice-surface alignment (BR-0017-0055 … BR-0017-0057) sits inside the same
  file, so it lands first or in the same change, and the layer-to-CI-lane mapping document
  (BR-0017-0062 … BR-0017-0066) has no ordering relationship to anything else here.
- Consequences: two of the five edges cross a spec boundary into `spec-0003`, so this spec
  cannot be completed independently of it. That coupling is real and is recorded rather than
  designed away — the alternative was to duplicate the shipped-set gate on this side, which
  `DR-0276` forbids.
- Related: BR-0017-0001, BR-0017-0005, BR-0017-0015, BR-0017-0018, BR-0017-0020, BR-0017-0024,
  BR-0017-0029, BR-0017-0044, BR-0017-0045, BR-0017-0047, BR-0017-0049, BR-0017-0061,
  `OQ-0013`, `OQ-0022`

### DR-0017-0006: the traceability ledger is activated with a promotion rule

- Status: accepted
- Context: `16_Traceability-ledger.md` is adopted in only three of sixteen existing specs, so
  `QFAI-TRACE-001` is skipped for the other thirteen and `QFAI-TRACE-002` degrades to a
  warning. That skip is how three spec-claimed implementation paths survived unnoticed —
  `packages/qfai/src/core/validators/findDesignMdViolations.ts`,
  `packages/qfai/src/core/validators/reviewerReport.ts` and
  `packages/qfai/scripts/lint-ssot-pair.ts` do not exist, and the real symbol lives at
  `packages/qfai/src/core/prototyping/designMdViolations.ts`. `OQ-0025` records that gap.
  Of the three adopting specs, only one is actually live: the other two present a first table
  whose rows the validator ignores or whose header shape it rejects.
- Decision: `spec-0017` carries a ledger from creation, and it is shaped so the integrity check
  is **active**: the first Markdown table uses the header the validator requires, so
  `QFAI-TRACE-002` does not fire and the check is not skipped.
- Decision: rows are **promoted**, not predicted. `QFAI-TRACE-001` is an `error` that compares
  each linked path against the same branch's diff, so a row naming a file that does not exist
  yet turns every later edit to `03_Acceptance-Criteria.md` or `04_Business-Rules.md` red. The
  first table therefore holds only rows whose implementation artifact exists **and** is touched
  by the change that authors the row; every other binding lives in a clearly labelled second
  table, which the ledger contract defines as prose and the validator provably ignores. A row
  moves from the second table to the first in the same change that creates its file.
- Decision, rejected alternative — omit the ledger until implementation begins: that is exactly
  the state `OQ-0025` shows is unsafe. The cost of omission is not "the check runs later", it is
  "the check is silently skipped and a phantom path is never contradicted".
- Decision, rejected alternative — list every planned path in the first table now and accept a
  red gate: that inverts the gate's meaning. It would fail on correct spec authoring and be
  routinely waived, which is how an `error` becomes noise.
- Consequences: the active table starts small and grows monotonically, so its size is a legible
  measure of how much of this spec is realized. Paths in the second table are unguarded until
  promoted, which is the residual this entry accepts; `10_Plan.md` marks every such path as
  to-be-created so the two files cannot disagree about which exist.
- Related: AC-0017-0011, BR-0017-0022, `OQ-0025`, `QFAI-TRACE-001`, `QFAI-TRACE-002`

### DR-0017-0007: the duplicate validate workflow is retired, and the recorded cost is the lost manual cross-check

- Status: accepted
- Context: this repository shipped `.github/workflows/qfai-validate.yml` to adopters through
  `packages/qfai/assets/init/root/` **and** kept a copy of it in its own `.github/workflows/`. The two
  were not equivalent: the own copy ran `qfai validate --profile full --fail-on error` on every push to
  `main`/`master` and every pull request, while the repository's own `build` job ran `--profile tdd`
  and `--profile sdd` and a default-profile pass over the packed sandbox. So the own copy was the only
  place the `full` profile ran against this tree, and `BR-0017-0058` asks for it to be gone.
- Decision: the own copy is deleted, and its full-profile run is folded into the `build` job as a
  named item of that job's enumerated verification set (`BR-0017-0059`, `BR-0017-0060`). The fold
  lands in the same change as the deletion, so no revision of this repository exists in which the
  `full` profile is unrun.
- Decision, the recorded justification for the deletion, stated in the form `BR-0017-0061` requires:
  what is lost is the **manual cross-check** — a reader could previously open the own copy and the
  shipped copy side by side and see whether the workflow this project distributes still resembles the
  workflow this project runs. That check was informal, unenforced and performed by nobody on a
  schedule, but it existed. It is **not** the loss of a mirror: the two files had already diverged on
  the one thing that matters, the profile they run, so there was no mirror to lose. Recording the
  absent mirror as the cost would overstate what the deletion takes away and understate what replaces
  it.
- Decision: what replaces the manual cross-check is structural, and it predates this change.
  `packages/qfai/tests/integration/shippedWorkflowShapeGate.test.ts` pins the shipped set's contract
  dimensions and diffs every one of them, and it runs in `ci:lint` as `lint:workflow-shape`. That is
  the gate `BR-0017-0061` and `DR-0017-0005` edge 4 require to be present at or before the deletion,
  and it is a stronger instrument than the cross-check it replaces because it fails a build rather
  than relying on somebody looking.
- Decision, rejected alternative — repoint the own run at the shipped workflow file: rejected on
  resolution, not on taste. The root manifest declares no dependency on `packages/qfai` and provides
  no local binary, so an invocation through the package name resolves to the **published** release.
  CI would validate a version nobody is reviewing, which inverts the dogfooding this repository exists
  to demonstrate. `TC-0017-0072` asserts both the local-binary invocation and the absence of any
  resolver-based one, and it also asserts the warrant — that the root manifest declares no such
  dependency — so the reason cannot rot into a stale comment.
- Decision, rejected alternative — delete the copy and drop the profile: that is the coverage loss the
  fold exists to prevent, and it is what "removed a duplicate" would have quietly meant.
- Consequences: the `build` job now carries six enumerated verifications rather than five, and the
  enumeration is held as literals in `TC-0017-0073` so removing any member fails a test instead of
  reading as a cleanup. The folded run exits 1 today, on the same two pre-existing cross-spec
  aggregates (`QFAI-ATDD-111`, `QFAI-ATDD-112`) that the `--profile tdd` step above it already
  reports; `CR-20260807-0001` covers those. The fold therefore adds no new failure mode, which is a
  weaker claim than "green" and the only one the measurement supports.
- Related: AC-0017-0030, AC-0017-0031, BR-0017-0058, BR-0017-0059, BR-0017-0060, BR-0017-0061,
  EX-0017-0061, TC-0017-0071, TC-0017-0072, TC-0017-0073, TC-0017-0074, TC-0017-0075,
  `DR-0017-0005` edge 4, `CR-20260807-0001`

### DR-0017-0008: shipped-tree hygiene coverage was enabled over an already-hardened tree

- Status: accepted
- Context: `BR-0017-0045` allows shipped-tree coverage to land in the same change as the shipped
  hardening or later, and forbids it landing earlier, because a lane enabled over an unhardened tree
  "lands instantly red" — and a lane that arrives red is a lane the next person disables. The hardening
  itself belongs to `spec-0003`, so this spec cannot assert it happened; it can only check the state
  before switching the scan on, and record what it found.
- Decision: the scan over `packages/qfai/assets/init/root/.github/workflows/**` was enabled only after
  the shipped tree was verified to satisfy every rule the scan applies. The check was run first, not
  after the fact, and these are its results:
  - every shipped job declares a **permission** block reachable from it;
  - every shipped job declares **`timeout-minutes`**;
  - every `uses:` reference in the shipped tree resolves to a forty-hex commit SHA — a **pin** — with
    one third-party owner, `pnpm`, which is the sanctioned entry;
  - no shipped job declares `secrets:`;
  - `fail-fast` is absent because there is no matrix to disable it on: `qfai-tests.yml` expresses its
    lanes as seven independent jobs rather than as matrix legs.
- Decision, and why the check is recorded rather than merely performed: the accepting order and the
  rejected one differ only in what was true at the moment the scan was switched on, and that is not
  recoverable from the diff afterwards. A reviewer reading the commit that adds the scan sees a lane
  that passes; they cannot see whether it passes because the tree was hardened first or because the
  rules were written to fit whatever the tree happened to be. This paragraph is the difference.
- Consequences: the shipped tree now has two guards with different subjects — this lane over its
  structural hygiene, and `spec-0003`'s shape gate over its contract dimensions. Neither subsumes the
  other, and the lane's own coverage boundary says so rather than implying it covers the shipped
  contract as well.
- Related: AC-0017-0022, BR-0017-0044, BR-0017-0045, EX-0017-0045, TC-0017-0050, TC-0017-0051,
  TC-0017-0052, `DR-0017-0004`

### DR-0017-0009: the declared parallelism value of ten measured flakier, and was kept

- Status: accepted
- Context: `BR-0017-0048` fixes the declared starting value at ten on the worker axis, and change 6
  landed it. Several sweeps passed at ten. Then one did not: the `integration` slice failed three cases
  of `spec-0003`'s `shippedWorkflowDetection` row, all with `Test timed out in 15000ms` and none on an
  assertion.
- Decision, the measurement, because `BR-0017-0030` forbids a parallelism claim landing on argument.
  Fourteen logical CPUs, one variable changed per row:
  - the failing file alone — **10 passed**, so not broken;
  - the `integration` slice at workers 10, concurrency 10 — **3 timeouts**, reproduced twice;
  - the slice at workers 10, concurrency 5 — **3 timeouts**, so not the concurrency axis;
  - the slice at workers 4, concurrency 5 — **862 passed**, so the worker axis.
- Decision, what was proposed and refused: on that measurement the orchestrator proposed lowering the
  declared starting value, and asked, because `BR-0017-0051` reserves that revision — "no agent may
  substitute a different starting value on the strength of its own measurement". The user refused the
  proposal and its framing: ten is mandatory, and the instruction was to correct the structure that
  creates the contention rather than the number that exposes it. The sign-off `BR-0017-0051` requires
  was therefore never given, and the declared value did not move.
- Decision, what the cause turned out to be: not contention for a lock or a path, but VOLUME, and
  almost all of it repeated. The failing describe called its fixture builder once per `it()`, three
  times, for fixtures its own comment called "the SAME three degraded fixtures" — roughly eighty-four
  git process spawns and nine shell runs to build one fixture set three times. On a platform where a
  spawn costs tens of milliseconds that is the entire fifteen-second budget. The fixture set is now
  memoized, the shipped orchestrator document is parsed once per worker instead of once per call, and
  three `git config` invocations became `-c` flags. The file went from 22.90s to 5.49s and the slice
  passes at the declared ten.
- Decision, the outcome named as a THIRD one: `BR-0017-0050` says that when the higher setting measures
  slower or flakier, the lower setting MUST be kept and the measurement recorded as the reason. That is
  not what happened here. The higher setting was **kept**, unchanged, and the measured flakiness was
  removed by fixing what produced it. Recording this as compliance with `BR-0017-0050` would be false;
  recording it as a violation would be worse, because the rule's purpose — do not paper over flakiness
  — was served more completely than the rule's letter asks. `CR-20260820-0005` carries the question of
  whether the rule should name this outcome.
- Decision, and what did NOT happen: no re-run loop. `BR-0017-0031` forbids "re-running the comparison
  until it agrees", and the temptation was real — the sweeps under changes 6 through 9 had all been
  green at ten, so one more run might have been green too. Each run above changed exactly one variable
  and the conclusion came from the differences between them, not from repetition until a green appeared.
- Consequences: the declared value stays ten and the override remains available for measurement without
  editing a declaration. One cost is accepted and named: the repaired describe is now the only place in
  that file where fixtures are memoized, so the next expensive describe will need the same treatment
  rather than inheriting it. `validators/upstreamSsotGuard.test.ts` still builds a fixture repository
  with three `git config` spawns and takes 9.19s; it is not on any failing path today and was left
  alone rather than swept up.
- Related: AC-0017-0028, AC-0017-0029, BR-0017-0030, BR-0017-0031, BR-0017-0048, BR-0017-0050,
  BR-0017-0051, EX-0017-0050, EX-0017-0051, TC-0017-0066, TC-0017-0067, `CR-20260820-0005`

### DR-0017-0010: the declared ten stands, and is held to the cores the machine has

- Status: accepted
- Context: `BR-0017-0048` fixes the declared starting value at ten on the worker axis, and
  `DR-0017-0009` records that it stood against a measurement that made it look flakier. Both
  settled the number. Neither settled what the number means on a machine that cannot hold it.
  `ubuntu-latest` gives four logical CPUs. A fifth fork there does not run — it waits for a core —
  and the waiting is charged to the fork, so the suite reports as though it were ten-way parallel
  while running four-way.
- Decision, the measurement, because `BR-0017-0030` forbids a parallelism claim landing on
  argument. Whole package suite, four cores, one full run per setting, back to back:
  - ten forks — **307.4 s** wall, 347.8 s collect and 1999.2 s tests summed across forks;
  - four forks — **253.0 s** wall, 109.6 s collect and 703.6 s tests summed.
    The summed figures are what the wall clock understates: at ten, most of each fork's measured
    time was spent waiting rather than working. Summed test time falls to a third while the same
    11 338 cases run with the same outcomes. On the wall clock ten is 21.5% slower, outside the ten
    percent `EX-0017-0049` allows — where the fourteen-core comparison in
    `.qfai/evidence/timing-workers-spec-0017.md` puts it at 6.01%, inside it. An independent pair on
    the same core count gave 299 s and 269 s, an 11.2% spread and the same verdict. The sign of that
    verdict flipping on the core count is the fact this entry rests on.
- Decision, what was NOT done: the declared value was not revised. `BR-0017-0051` reserves that
  revision to the user, and this is not it — `DECLARED_START` is still ten and both axes are still
  overridable, which is the whole of what `BR-0017-0048` requires. What changed is the value handed
  to the runner: `Math.min(DECLARED_START, availableParallelism())`. A machine with ten cores or
  more is unaffected, so the fourteen-core comparison that adopted ten still describes what that
  machine runs.
- Decision, the shape chosen, and the one refused: lowering the declaration to four was available
  and is wrong in the other direction — it would under-use a large developer machine, and it would
  revise a value that is not this file's to revise. The cap keeps one number and makes it true
  everywhere.
- Decision, what stays uncapped: the override. A comparison that could not oversubscribe could not
  measure what oversubscribing costs, which is the measurement above. `QFAI_TEST_MAX_WORKERS` is
  therefore honoured as asked, and a row pins that.
- Decision, the scope of this entry: the worker axis. The within-file concurrency axis bounds
  concurrent cases inside one process rather than forks, so the measurement above does not reach
  it and this cap does not cover it. That axis now carries a cap of its own, on a sweep of its own:
  `DR-0017-0013`. Neither axis is uncapped, and neither is unmeasured.
- Consequences: on four cores the suite runs at four forks rather than ten, and the reported
  collect and test totals stop overstating the work by the time spent waiting. One cost is accepted
  and named: a run on a small machine no longer reproduces the fork count a large one uses, so a
  race that needs ten forks to surface now needs the override to reproduce. The floor lane already
  sets the override to the machine's own count and is unaffected.
- Related: AC-0017-0026, AC-0017-0028, BR-0017-0030, BR-0017-0048, BR-0017-0049, BR-0017-0051,
  EX-0017-0049, TC-0017-0061, TC-0017-0065, DR-0017-0009, DR-0017-0013

### DR-0017-0011: the engines-floor lane is sliced, and the runner time that costs is accepted

- Status: accepted
- Context: the `node-floor` lane runs the package test suite on the floor `engines.node` promises,
  and it ran the whole suite in one process pool. At 312 s it was the longest job in the run and set
  the wall clock for every other lane, which is the same shape that put the `test` job behind a
  matrix. The lane expands over the same slices the `test` job declares, whichever they are, with
  `fail-fast: false`, each leg pinning and asserting the floor, and the build running on the `e2e`
  and `integration` legs only. The set itself is `BR-0017-0057`'s to state; naming it here would be
  a second place for it to be wrong.
- Decision, the measurement, because `BR-0017-0030` forbids a wall-clock or parallelism claim
  landing on argument. One full run per side, the last successful run of `main` against the first
  complete run on the branch:
  - the floor lane's critical path went from **312 s** to **100 s**, its longest leg;
  - the run's wall clock went from **328 s** to **128 s**;
  - runner time went from **1018 s** to **1274 s**.
    The full per-job tables are in `.qfai/evidence/timing-node-floor-spec-0017.md`, and both totals
    are derived from them rather than reported beside them.
- Decision, the regression, recorded as the reason rather than re-measured: runner time rose 256 s,
  a quarter. The cause is structural — one job became seven, so six further checkouts and toolchain
  setups are paid and the build runs on two floor legs where it ran on one — so no second comparison
  would improve it. `AC-0017-0015` makes a measured negative result an accepting outcome precisely
  so that re-running until the answer agrees is not the cheapest route. The 212 s off the lane's
  critical path is what that quarter buys.
- Decision, what was NOT changed: the aggregate verdict. A matrix job contributes one rolled-up
  result, so the pinned check-name set is untouched — which is the constraint that keeps
  `TC-0017-0032` open, because a producer job for the build would add a name no agent can configure.
- Consequences: `lint` now sets the wall clock, at 120 s against 100 s for the longest floor leg.
  Slicing the floor lane further buys nothing until `lint` is shorter, so the next lane to look at is
  named by the measurement rather than chosen. A second cost is accepted and named: a failure that
  only appears while slices contend for one pool is no longer reachable on the floor, because the
  legs no longer share one.
- Related: AC-0017-0014, AC-0017-0015, AC-0017-0028, BR-0017-0030, NFR-0001, NFR-0004,
  `.qfai/evidence/timing-node-floor-spec-0017.md`

### DR-0017-0012: the lint gate runs five lanes, and the grouping is a constraint

- Status: accepted
- Context: `DR-0017-0011` ends by naming `lint` as the lane that now sets the run's wall clock, at
  120 s against 100 s for the longest engines-floor leg. The gate ran two lanes: the mirror-surface
  runner, and one serial chain of eighteen commands beside it. It now starts five, and
  `packages/qfai/tests/pr-fix/prFixMonitor.test.ts` runs its fifteen cases concurrently, which
  shortens the mirror lane those five contend with.
- Decision, the measurement, because `BR-0017-0030` forbids a wall-clock or parallelism claim
  landing on argument. `pnpm ci:lint` end to end, same machine, nothing else running, three runs per
  shape, the "before" taken by stashing the change on this same branch so both shapes met the same
  tree:
  - median wall clock **114.5 s** before, **80.1 s** after — 34.4 s, a 30.0% fall;
  - the two ranges do not overlap: the slowest run after, 83.6 s, beats the fastest run before,
    112.6 s, by 29.0 s. That non-overlap is what three runs a side establishes, and it is a stronger
    claim than the median gap, which carries the variance of six runs.
  - every run of both shapes exited 0. The per-run tables are in
    `.qfai/evidence/timing-lint-concurrency-spec-0017.md`.
- Decision, the grouping, recorded because two of its edges are constraints rather than
  preferences. The five lanes are `lint:mirror-surface`, `format:check`, `lint`, the document and
  shipped-surface structure checks, and the eleven repository readers:
  - **seven of the eleven readers invoke `git`**, and all seven sit in one serial lane, so no two
    git subprocesses in the chain run concurrently and no index contention is introduced;
  - **two of the eighteen commands each start a forking test runner**. They share one lane and are
    kept away from the mirror lane, because oversubscribing forks past the core count is measured —
    in `DR-0017-0013` below — as both slower and noisier.
- Decision, what sets the floor now: `format:check`. No regrouping moves the number further; only
  splitting the formatter itself would, which is a change nobody has asked for.
- Consequences: peak concurrency is five lanes, sampled every 400 ms on a real run, against four
  cores on the runner and fourteen on the machine measured. That is more processes than cores there,
  which is the oversubscription `DR-0017-0013` charges a cost for. The local direction is
  unambiguous and the CI figure is not: it must be read off the pull-request run rather than
  inferred, and it is recorded as a limit of this measurement rather than predicted. No wall-clock
  regression was measured locally, so `AC-0017-0015` has nothing to record here.
- Related: AC-0017-0014, AC-0017-0015, BR-0017-0030, BR-0017-0031, NFR-0001, NFR-0004,
  `DR-0017-0011`, `DR-0017-0013`, `.qfai/evidence/timing-lint-concurrency-spec-0017.md`

### DR-0017-0013: the within-file concurrency axis is held to the cores the machine has

- Status: accepted
- Context: `BR-0017-0048` declares ten on both tunable axes. `DR-0017-0010` held the worker axis to
  `Math.min(DECLARED_START, availableParallelism())` and left this one open, because it bounds
  concurrent cases inside one process rather than forks and no measurement had been taken on it.
  This entry takes that measurement and closes it the same way.
- Decision, the measurement, because `BR-0017-0030` forbids a parallelism claim landing on argument.
  `packages/qfai/tests/pr-fix/prFixMonitor.test.ts` standalone — fifteen cases, each spawning a shell
  that runs a script through its poll loop and shelling out once per poll, which makes it the
  heaviest concurrent file in the suite. One full run per setting, 15 of 15 passing every time,
  swept at 1, 2, 4, 5, 8, 10 and 15 on two core counts:
  - **four cores**: fastest is four at **36.1 s**; ten is **47.0 s**, 10.9 s slower, **30.2%** — well
    outside the ten per cent `EX-0017-0049` allows. A repeated pair on the same core count returned
    the same verdict three times.
  - **fourteen cores**: fastest is four at **25.2 s**; the curve is flat from four upward, a 3.5 s
    band, and ten sits at **27.7 s**, **9.9%** off the fastest and inside the same allowance.
  - The full sweep is in `.qfai/evidence/timing-lint-concurrency-spec-0017.md`.
- Decision: `maxConcurrency` is declared as `Math.min(DECLARED_START, availableParallelism())` with
  its own override, so the runner is handed four on a four-core machine — the fastest measured there
  — and ten on a fourteen-core one. `EX-0017-0049` asks for a written reason where the adopted value
  is not the fastest, and the reason for the fourteen-core case is `BR-0017-0051`: ten is the user's
  declared starting value, and adopting four on the strength of this table is the substitution no
  agent may make. `EX-0017-0049` is written for the worker axis; the same test is applied here by
  analogy, because `BR-0017-0048` declares ten on both axes and no example fixes an allowance for
  the second.
- Decision, what was NOT done: the declaration was not revised. `DECLARED_START` is still ten, both
  axes are still overridable, and `QFAI_TEST_MAX_CONCURRENCY` is still honoured as asked — which is
  the whole of what `BR-0017-0048` requires, and what let this sweep oversubscribe in the first
  place.
- Decision, the correctness fix that makes the cap safe to declare: two assertions in
  `TC-0017-0061` compared each project's `maxConcurrency` against the literal declared start. With
  the cap in place both would have failed on any machine with fewer than ten cores, the CI runner
  included, because the configuration would correctly hand back four while the row demanded ten.
  They now compare against the held value, re-derived from `availableParallelism()` in the test
  rather than read out of the file under test. The worker axis already had that shape; the
  concurrency axis carries its own constant, so lifting either cap cannot silently move the row
  guarding the other.
- Decision, and what did NOT happen: no re-run loop. The four-core column is a measured "no" for the
  uncapped ten, and `AC-0017-0015` makes that an accepting outcome while `BR-0017-0031` forbids
  re-running the comparison until it agrees. Each run changed one variable, and the verdict comes
  from the differences between them.
- Consequences: on four cores the file runs four cases at a time rather than ten, and a race that
  needs ten concurrent cases to surface now needs the override to reproduce — the same residual
  `DR-0017-0010` accepted on the worker axis, and the same escape hatch. Two limits are named rather
  than smoothed over: the four-core figures come from a Windows processor-affinity mask, which
  `availableParallelism()` honours but which constrains this machine's scheduler and not a runner's;
  and the sweep covers one file, chosen as the heaviest concurrent one, so it does not claim the
  same curve for a file whose cases are cheap.
- Related: AC-0017-0026, AC-0017-0028, BR-0017-0030, BR-0017-0031, BR-0017-0048, BR-0017-0049,
  BR-0017-0051, EX-0017-0049, TC-0017-0060, TC-0017-0061, `DR-0017-0010`, `DR-0017-0012`,
  `.qfai/evidence/timing-lint-concurrency-spec-0017.md`

### DR-0017-0014: the root assistant tree is linked at the shipped assets, and the mirror criterion is restated

- Context: `AC-0017-0034` described `.qfai/assistant/**` as a generated byte-mirror, and held the
  mapping document's placement by a negative path — an edit made only to the repository-root copy is
  reverted by the next synchronization, and the tracked-tree diff fails. That was true of a copy.
  It has no subject under a link: there is no second copy to edit.
- Decision: the criterion states what the link makes true instead. The repository-root path resolves
  to the packaged asset, so there is one document reached from two paths, and the placement rule is
  held by `link-assistant-tree --check` rather than by a synchronization that reverts an edit.
  `BR-0017-0066`, `EX-0017-0066` and `TC-0017-0082` move with it, and `OC-70` records the link
  direction in place of the mirror direction.
- Decision, what the link does not settle: a path present here and absent from the assets is
  invisible to every adopter, and a link cannot report it. The check keeps that half, with one
  allowed prefix — `process/migrations/`, which an upgrade writes into the tree that ran it — and it
  reads only what git tracks, so a suite's scratch file is not a finding.
- Alternatives rejected: keeping the mirror and its drift gate, which leaves two copies that can
  disagree and a gate contributors do not run locally; and inverting the direction so the assets are
  the links, which breaks `npm pack`.
- Consequences: the four Stage 0 catalog documents a project owns stay real files, named by
  `ADOPTER_OWNED_CATALOG_FILES` and read from that source rather than restated. Two validators
  accepted only real directories in the canonical tree and now accept a link that stays inside the
  project and keeps its name; a link that leaves, does not resolve, or renames still fails.
- Related: AC-0017-0034, BR-0017-0066, EX-0017-0066, TC-0017-0082, OC-70, `scripts/link-assistant-tree.mjs`

### DR-0017-0015: the documentation-only cost is measured in runner-minutes, and the rule is a re-pin obligation

- Status: accepted
- Context: `BR-0017-0007` bounded a documentation-only run by a set equality over four job names —
  detection, `lint`, `build` and the verdict — and `TC-0017-0006` claim 1 held that set. The
  equality refuses a change that serves the requirement underneath it. One full run, 25 legs, all
  `success` and none skipped:
  - wall clock, first leg starting to the aggregate finishing — **302 s**;
  - the critical-path job — **`lint`, 285 s**, against its declared ten-minute budget;
  - the critical path inside it — the **`lint:mirror-surface`** lane, **253 s**;
  - the critical path inside that lane — `tests/pr-merge/prMergePlan.test.ts`, 222 tests,
    **250.1 s**;
  - the same file on a runner of its own in the same run — **111.7 s**, in `test (pr-merge)`;
  - the sum of leg durations — **39.9 runner-minutes**, of which 14.7% is everything but a leg's
    own work;
  - the aggregation itself — `ci-pass`, **3 s**, every step sub-second.
    The cause is contention rather than the file: five lint lanes fork onto one four-core runner,
    and prettier holds cores for 154 s of that window. Extracting the lane puts `lint` at about
    **160 s**, bounded by prettier's 154 s, and raises the headroom against the ten-minute job
    budget from 315 s to about 440 s. The extracted lane must stay unconditional, because a
    documentation change can break what it checks, so the equality forbids a change that cuts the
    measured critical path and adds no work.
- Decision: the pin measures **cost**, and the unit is **runner-minutes**, operationalized as
  the sum of declared `timeout-minutes` over the jobs a documentation-only run executes — the jobs
  with no `if`, plus the jobs whose `if` is `always()`. On `ci.yml` that is four jobs and 35
  declared minutes.
- Decision, the options and the verdict on each:

  | Option                                                     | Verdict                                                                                                                     |
  | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
  | Job instances, the unit in force                           | Refused. It charges +1 for a change that cuts the critical path and adds no work, which is the change measured above        |
  | Runner-minutes, as the declared `timeout-minutes` sum      | Adopted. It is derivable from the tree a pull request can read, and it falls when work is removed rather than when a job is |
  | Frozen-lockfile installs                                   | Refused. Today the count is numerically identical to instances, so it inherits the same defect under another name           |
  | A literal number in the rule                               | Refused. The dissent below is the position that held for it                                                                 |
  | Delete `BR-0017-0007`'s ceiling                            | Refused by the user. With no ceiling, nothing stops every job becoming unconditional                                        |
  | Raise `BR-0017-0007`'s ceiling from four job names to five | Refused by the user. It prices the next extraction exactly as badly and leaves the same question to be asked again          |

- Decision: **the rule carries no number.** The figures are a pin, re-derived from the workflow tree
  by `scripts/pin-documentation-only-cost.mjs` and written into
  `.github/required-status-contexts.json`,
  with one new `check-workflow-hygiene.mjs` rule comparing the committed value against a fresh
  recomputation. That is the pattern `pin-guard-bytes.mjs`, `pin-stage-evidence-counts.mjs` and
  `pin-cli-message-allowlist-count.mjs` already use. What stops a silent raise is not the pin:
  it is `BR-0017-0030`. A raised pin is a cost claim, so it may not land on argument.
- Decision, the two claims that replace the set equality:
  1. the committed pin equals what the tree recomputes: the jobs that execute — those with no `if`,
     plus those whose `if` matches `always()` — and the sum of their declared `timeout-minutes`. A
     change to either re-pins in the same change, carrying `BR-0017-0030`'s before-and-after
     numbers, and the hygiene lane exits 1 while committed and recomputed disagree.
  2. among the jobs the aggregate verdict depends on, the ones that execute are exactly the
     `dependencies` entries absent from `dependencyConditions` in
     `.github/required-status-contexts.json`, and `dependencyConditionsNote` names each one with
     the reason it cannot be skipped.
- Decision, and why the two claims read different sets: claim 1 sums the wider one, four jobs today,
  and the verdict belongs to it because `always()` makes it execute. Claim 2 is checked against the
  narrower one, three jobs today, because the verdict is not one of its own `dependencies` — a flat
  equality over the wider set would be false on the tree it describes.
- Decision, and what claim 2 needs that already exists: no new declaration file, and no new hygiene
  code. The declaration asserts the executing set by omission, and `check-workflow-hygiene.mjs`
  property 2c already rejects a listed job that drops its condition and an unlisted job that gains
  one. The verdict's own `always()` is property 2's subject and is already held there.
  `dependencyConditionsNote` already carries the prose reason for the three entries it holds today.
- Decision: `NFR-0002`'s baseline clause keeps instance count, and its documentation-only figure
  moves from four to five. That clause is a different artifact from `BR-0017-0007`'s ceiling in the
  table above, and it moves on a separate authorization: the user agreed to correct every statement
  the fifth job makes false. The figure stays in instances because the same clause is quantified in
  frozen-lockfile installs and bundler builds, so converting one part of it to minutes would leave
  one NFR carrying two units.
- Decision, the weaknesses of the adopted unit, named rather than smoothed over:
  - **The measure sits far from the reality it prices.** The declared sum over today's
    unconditional set is 35 minutes,
    against `NFR-0001`'s 3-minute bound for a documentation-only run — roughly twelve times the
    reality it prices. It still catches a runaway job and a forgotten raise, which is what it is
    for.
  - **The extraction will raise the pinned sum.** `timeout-minutes` is integer-only and each half
    of a split needs its own margin, so the sum rises while the measured critical path falls.
    `BR-0017-0030` judges the measured figures, not the pin.
  - **An unrelated raise trips it.** A timeout raised for a safety reason of its own reddens the
    lane until the pin is redone, which forces whoever raises it to re-price the documentation-only
    path deliberately.
  - **A "costs no more than the ceiling" clause could not fail.** Enforcement is equality against a
    value recomputed from the same tree, so once the pinner has run no state of the tree violates
    such a clause. The rule therefore states the re-pin obligation the lane can enforce, and no
    bound beside it that nothing can.
- Decision, the dissent, recorded beside the adopted answer: the test-design analyst held for a
  literal number in the rule, on the ground that an equality pin always agrees with the tree after
  a re-run and so refuses nothing — a tripwire rather than a ceiling. On the vacuity that position
  was right, and the rule now says so: the clause a re-derived pin could not contradict is gone,
  and what stands is the re-pin obligation. The literal itself was still not taken. `BR-0017-0030`
  is what refuses a raise, on review rather than in the lane, and that answer governed only the
  review until the unfalsifiable clause was removed. A literal is also the option the user rejected
  in its other form, which the table above records.
- Consequences: the measure now moves with the tree instead of with a job list, so a change that
  alters a `timeout-minutes` on an unconditional job re-pins in the same commit or the hygiene lane
  fails. One cost is accepted and named: a change that extracts a lane and re-pins together
  presents a raised pin as a green run, so the pin is not the evidence — the measured
  before-and-after is, in the pull-request description and in this file (OC-80, `BR-0017-0030`).
- Related: AC-0017-0003, BR-0017-0007, BR-0017-0009, BR-0017-0011, BR-0017-0012, BR-0017-0030,
  EX-0017-0007, TC-0017-0006, NFR-0001, NFR-0002, OC-80, `DR-0017-0004`, `DR-0017-0012`,
  `.github/required-status-contexts.json`

### DR-0017-0016: the selection exemption belongs to the lane, not to the job hosting it

- Status: accepted
- Context: `BR-0017-0011` exempted the lint lane from change-detection selection and gave four
  guards as the reason — the formatter, the Markdown linter, the leakage guard and the
  branch-version-pin guard. The lane also carries the agent-integration mirror guards, and the rule
  did not say so, so those guards were exempt only because one job happened to host them.
  `NFR-0002` and `REQ-0007` both state that the mirror-guard lane may never be skipped, and
  `AC-0017-0006` reads on the lane rather than on its host. Moving that lane into a job of its own
  is work this spec plans, so the gap stops being theoretical the moment the extraction lands.
- Decision: the exemption's subject is **every lane of the lint aggregate, whichever job hosts it**,
  and the guard list names the agent-integration mirror guards as a fifth member. A lane moved into
  a job of its own MUST NOT acquire a condition, and MUST NOT be added to `dependencyConditions`.
- Decision, why the narrower scope fails, which is the whole of the reason: `BR-0017-0007`
  **accepts** the arrangement in which the guard stops running. Give the lane a job of its own, put
  a detection-derived condition on that job, and list the job in `dependencyConditions`. Both of
  that rule's claims then hold — the job leaves the executing set, so the pinned set and sum stay
  consistent, and it leaves `dependencies` minus `dependencyConditions`, so membership stays
  consistent. The guard is priced, declared and skipped, and nothing in the tree objects.
- Decision, the consequence stated as a prohibition rather than an aim: the pair is forbidden, in
  `BR-0017-0011`'s second sentence, and `TC-0017-0085` is its oracle. A rule that only asked for
  the lane to run would be satisfied by the arrangement above, because there the lane does run —
  in a job that was skipped.
- Decision, the reading that is wrong, recorded because the rules invite it: `BR-0017-0007`'s
  membership claim does not carry this obligation. That claim constrains **which** jobs execute —
  the executing ones must be exactly `dependencies` minus `dependencyConditions` — and says nothing
  about any named job staying in the executing set. A change that moves a lane out of the executing
  set and declares the move satisfies it exactly. So the exemption needs its own statement, and
  deleting it as redundant removes the only rule that forbids the arrangement.
- Decision, rejected alternative — defer the whole obligation to the extraction change: refused,
  because it cannot be done without removing `NFR-0002`'s clause that lane selection may never skip
  the mirror-guard lane and `REQ-0007`'s exempt entry for it. Both are statements the user approved
  in this cycle, and reversing an approved statement is a change request the user owns.
- Consequences: the rule now has something the tree can fail rather than only something to do, so
  the extraction inherits the obligation instead of creating it, and `10_Plan.md` step 11 cites the
  rule for that reason. One cost is accepted and named: every lane later moved into a job of its own
  owes a `dependencyConditionsNote` entry giving the reason it cannot be skipped, and no lane parses
  that note, so the entry is held by review.
- Related: AC-0017-0006, BR-0017-0007, BR-0017-0011, EX-0017-0011, TC-0017-0012, TC-0017-0085,
  NFR-0002, NFR-0006, REQ-0007, `DR-0017-0015`

### DR-0017-0017: the mirror-surface lane gets a runner of its own, and the CI figure DR-0017-0012 deferred

- Status: accepted
- Context: `DR-0017-0012` measured the five-lane lint gate locally and left one thing open in its
  own Consequences — "peak concurrency is five lanes … against four cores on the runner … The
  local direction is unambiguous and the CI figure is not: it must be read off the pull-request
  run rather than inferred, and it is recorded as a limit of this measurement rather than
  predicted." This record reads that figure. The lane in question is `lint:mirror-surface`, a
  vitest run over eight files, one of which spawns a process in most of its cases.
- Decision: the lane leaves `pnpm ci:lint` for a job of its own. The gate starts four lanes
  rather than five, which retires one edge `DR-0017-0012` recorded as a constraint on the
  grouping: it kept the two forking commands away from the mirror lane, and a mirror lane
  outside the aggregate removes the contention that arrangement worked around.
- Decision, the measurement, because `BR-0017-0030` forbids a wall-clock or parallelism claim
  landing on argument. Both figures are green CI runs of the `pull_request` shape on
  `ubuntu-latest`, read from the runs API. Before: run 35468157603 on `9117bff2`. After: run
  35470980604 on `42fb2caf`.

  | Figure                 | Before        | After                             |
  | ---------------------- | ------------- | --------------------------------- |
  | `lint` job             | 265 s         | 68 s                              |
  | of which the lint gate | 243 s         | 44 s                              |
  | `mirror-surface` job   | —             | 133 s, of which the lane is 116 s |
  | Longest job in the run | `lint`, 265 s | `node-floor (pr-fix)`, 274 s      |
  | Job instances          | 25            | 26                                |
  | Summed runner time     | 38.0 min      | 39.0 min                          |

  The lint job fell by 197 s and its gate step by 199 s. The lane itself fell from roughly the
  gate step it dominated, 243 s, to 116 s once nothing contended with it — which agrees with the
  per-file measurement that opened this line of work, 111.7 s alone against 250.1 s under
  contention.

- Decision, the distribution, because one run a side could attribute nothing. Six default-branch
  runs of the same workflow, four before the extraction and two after, read from the runs API:

  | Revision   | Set    | Wall  | Longest job                    | Summed   | `lint` | `mirror-surface` | `node-floor (pr-fix)` |
  | ---------- | ------ | ----- | ------------------------------ | -------- | ------ | ---------------- | --------------------- |
  | `51d14bec` | before | 289 s | `lint`, 270 s                  | 40.5 min | 270 s  | —                | 260 s                 |
  | `4fc27188` | before | 275 s | `lint`, 268 s                  | 39.7 min | 268 s  | —                | 202 s                 |
  | `4a91bfa6` | before | 251 s | `test (pr-fix)`, 206 s         | 35.6 min | 188 s  | —                | 161 s                 |
  | `9752a701` | before | 310 s | `lint`, 265 s                  | 40.8 min | 265 s  | —                | 258 s                 |
  | `b960b49a` | after  | 317 s | `test (pr-fix)`, 265 s         | 39.8 min | 88 s   | 181 s            | 262 s                 |
  | `7b8945ac` | after  | 224 s | `node-floor (pr-merge)`, 204 s | 38.7 min | 85 s   | 195 s            | 158 s                 |

- Decision, what the distribution establishes: the `lint` job fell from 265–270 s to **85–88 s**,
  the two ranges do not overlap, and the run's longest job is `lint` in three of the four before
  runs and in neither after run. The critical path no longer runs through the lint aggregate.
  Against the job's ten-minute ceiling that is headroom of about 85 percent, where the job
  previously exceeded the ceiling on the retry this work began from.
- Decision, the region with no measured improvement, named because the acceptance asks for it:
  **the run's wall clock and its summed runner minutes.** Before: 251–310 s and 35.6–40.8 min.
  After: 224 s and 317 s, 38.7 and 39.8 min. Both after values sit inside the before range, so
  neither supports a claim in either direction. The cause is visible in the table: the run is set
  by the `pr-fix` and `pr-merge` slices, and `node-floor (pr-fix)` alone spans 158–262 s across
  six runs of unchanged code. That spread is larger than any effect this change could have, so
  the extraction moved work off the critical path without shortening the run. Shortening it is a
  separate subject — those slices — and belongs to whatever measures them.
- Decision, what this measurement is not: a controlled comparison. `DR-0017-0012` took three runs
  per shape on one machine; a CI run cannot be repeated on an identical machine, and the six runs
  above differ in their trees as well as their hardware. What the non-overlap of the `lint` ranges
  supports is that job's fall. Nothing here supports a claim about the run.
- Consequences:
  - `documentationOnlyCostPin` rises from four jobs / 35 declared minutes to five / 45. That is
    a declared ceiling rather than a measurement, so it moves by the new job's
    `timeout-minutes` and not by what the job costs.
  - A check name is created. No repository setting changed: only `ci-pass` is required and the
    verdict is derived from its `needs` map, so the new lane is gated by the context that
    already exists. `TC-0017-0043`'s pinned set gains the name, which is how the addition
    arrives as a failing equality rather than as a diff nobody reads.
  - The new job carries no condition and appears in no `dependencyConditions` entry, which
    `BR-0017-0011` requires of a lane moved into a job of its own. `TC-0017-0012` asserts it by
    resolving each exempt lane to its host job — through a step that names the lane, or through
    the aggregate whose script does.
  - The hygiene lane does not enforce that pair. Measured: with a detection-derived condition on
    the new job and the job added to `dependencyConditions`,
    `node scripts/check-workflow-hygiene.mjs --root .` exits 0. `TDD-0094` is the seeded row for
    the lane-level rule and stays `todo`; enforcing it there needs the exempt-lane list declared
    where the lane can read it, which is a decision of its own.
- Related: AC-0017-0014, BR-0017-0007, BR-0017-0011, BR-0017-0030, NFR-0001, NFR-0002,
  NFR-0004, `DR-0017-0011`, `DR-0017-0012`, `DR-0017-0013`, `DR-0017-0015`, `DR-0017-0016`

### DR-0017-0018: the code path leaves NFR-0002, and what it costs is pinned instead

- Status: accepted
- Context: `NFR-0002` capped a code-path pull request at 12 job instances / 8 frozen-lockfile
  installs / 3-or-5 bundler builds, against a baseline of 14 / 13 / 6. Measured from the tree, a
  code path runs **26 instances / 24 installs / 5 build executions**, declaring **350 minutes** of
  ceiling. Nothing regressed: the `test` and `node-floor` matrices were each widened to nine legs
  to shorten the wall clock, and each widening was recorded. What was never re-priced is the
  requirement's own figure, and `.qfai/evidence/sdd-spec-0017.md` had already noted the gap and
  left it alone because correcting it read as a cost claim.
- Decision, the unit: the code-path figures stay in instances, installs and builds. `DR-0017-0015`
  settled that for this requirement — converting one part of it to minutes would leave one
  requirement carrying two units — and this record does not reopen it. The minutes figure the pin
  also carries lives in the declaration beside them, never in `NFR-0002`, which is exactly where
  the documentation-only half already keeps its own minutes sum.
- Decision, the shape: a pin with a re-pin obligation, not a ceiling. Enforcement is equality
  against a value recomputed from the same tree, so a clause forbidding a higher cost could not
  fail; what the pin refuses is a change that moved the cost and did not move the figure.
  `scripts/pin-code-path-cost.mjs` writes it and the hygiene lane's `code-path-cost-pin` rule
  reads it, both importing one computation.
- Decision, the requirement: the code path **leaves `NFR-0002`**, whose subject is consumption
  falling. On a code path it did not fall. It rose, on purpose, and the reason is the requirement
  next door: nine legs finishing together cost fewer runner minutes than one leg running them in
  series, and count more instances — so an instance figure on a code path moves against the very
  thing `NFR-0002` is named for, while the wall clock it buys is `NFR-0001`'s subject. A
  requirement that claimed a fall here would be false on the tree that satisfies the design.
  `NFR-0002` keeps the documentation-only claim, where consumption does fall and the figure is
  five executed instances.
- Decision, what is NOT claimed: that the figures are acceptable. This record prices the code path;
  it does not argue the price. `BR-0017-0030` governs a cost claim, and none is made here.
- Decision, three limits of the measure, named rather than smoothed over:
  - **`buildJobs` counts jobs, not executions.** Two of the three condition their build step on
    `matrix.slice == 'e2e' || matrix.slice == 'integration'`, so an execution count needs a GitHub
    expression evaluated and the lane evaluates none. The five executions are real and no lane
    counts them. The jobs figure still moves when a build is added to or removed from a job.
  - **The pin is not compared with a run.** Reading what a run actually cost needs the forge's API
    and a finished run, which no lint lane has. A tree that was always more expensive than it
    declared is therefore outside the rule, and that gap is deliberate: it is the one
    `.qfai/specs/spec-0017/10_Plan.md` leaves to the wall-clock reading of a pull request.
  - **`timeout-minutes` is a declared worst case.** The 350-minute sum sits far above what the path
    costs — two green runs measured 38.0 and 39.0 runner-minutes. It still catches a runaway job
    and a forgotten raise, which is the class a declared ceiling can catch.
- Consequences:
  - `NFR-0002`'s code-path ceiling is gone, and every artifact that read it is corrected in the
    same change. Nothing in the tree asserted those numbers, so no test changes because of the
    removal — which is itself the finding: the code-path half had no falsifiable artifact behind
    it, and the figure went stale in silence.
  - Two readers compute the figures independently: the hygiene lane through its own collector, and
    the topology test through its own parse of `ci.yml`. Equality between two readings of one tree
    is what a single implementation cannot give itself.
  - A slice added to either matrix, a ceiling raised, an install introduced or a build moved
    between jobs now fails until the pinner has run.
- Related: BR-0017-0030, NFR-0001, NFR-0002, OC-80, `DR-0017-0012`, `DR-0017-0015`, `DR-0017-0017`

### DR-0017-0019: release uploads require a complete successful gate path

- Status: accepted
- Context: release prerequisites have two valid result maps. The sliced path runs
  `gate-tests` and `gate-floor`; the whole path runs `gate-floor-whole`. Both require
  `verify` and `gate`. Excluding failure and cancellation alone also accepts a
  required gate that was skipped or supplied no result.
- Decision: each upload condition accepts only the successful selected path and
  skipped inactive gates. An unknown shape refuses upload. GitHub Release remains
  push-only, and npm publication retains manual dispatch. Environment approval,
  permissions, tag identity and packed-artifact verification are unchanged.
- Scope: this is the release publication barrier. The change-detected `ci-pass`
  verdict still permits its declared skips. The shipped templates have no release
  or registry publication jobs.
- Sequencing: harden this barrier before adding release gate jobs. Operation
  extraction must extend tag capability detection and these result-map tests.
- Baseline: [successful release run 35414209463](https://github.com/aganesy/QFAI/actions/runs/35414209463),
  source `4fc271880d30ea7ab66f6584dbdfee722f3afb7f`, on 2026-09-19. The jobs API
  reports `gate` at 137 seconds, its checks step at 112 seconds, and its post-build
  leakage scan at 4 seconds. The remaining 21 seconds cover setup, cleanup and
  step boundaries. Against the declared 30-minute timeout, headroom is 1,663
  seconds (92.4 percent).
- The gate log places the lint lane starts near 01:58:01 UTC and the type check
  start at 01:59:02 UTC. Type checking and the first build together end near
  01:59:29 UTC; pack verification ends near 01:59:52 UTC. These are approximate
  log intervals, not separate operation timers: the first build wrapper buffers
  its output until completion, so type checking cannot be separated from that
  build using line timestamps.
- The last gate to finish is `gate-tests (pr-fix)`, at 02:03:42 UTC after 261
  seconds on its runner. `verify` started at 01:57:27 UTC, so the gate phase
  spans 375 seconds including scheduling. All job durations sum to 2,118 seconds
  (35.3 runner-minutes). Publication starts at 03:57:42 UTC behind approval;
  that wait must not be credited to gate execution. This is one baseline run,
  not a before/after comparison or evidence of a performance improvement.
- Remaining independent blocks: SSOT sync plus its diff; the four lint lanes;
  type checking; and the build, pack and post-build scan chain. Extraction needs
  isolated checkouts and tag-declared entry points. Checkout precedes the sidecar,
  setup precedes its consumers, and artifact generation precedes artifact scans.
- Related: AC-0017-0035, BR-0017-0068, TC-0017-0088, TC-0017-0089

### DR-0017-0020: release checks use isolated jobs when the tag declares their entry points

- Status: accepted
- Decision: `verify` publishes both suite and checks capabilities from the tagged
  manifests. The checks capability is `operations` only when the suite is sliced
  and all four operation scripts are declared. Every other runnable tag uses
  `aggregate`. The manifests are data; their command bodies are never evaluated
  by the classifier.
- The three valid paths are sliced/operations, sliced/aggregate and
  whole/aggregate. Publication requires successful selected jobs and skipped
  inactive jobs. An unknown output or whole/operations refuses publication.
- Each operation job checks out the verified tag before fetching the shared setup
  action at the workflow revision. The sidecar keeps `clean: false`. No new job
  has write permissions or publication credentials. Lint skips the branch-name
  version pin because `verify` already checked the tag version.
- Local `ci:gate:checks` calls the four entry points serially, in its original
  order. The workflow changes scheduling, not the set or order of commands inside
  each operation. The suite runs exactly once per runtime on every valid path.

| Operation                            | Inputs and effects                                                      | Dependency retained                                                                        |
| ------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Verify tag and classify capabilities | Tag ref and manifests; publishes immutable SHA, version and both shapes | All consumers wait for this trust decision                                                 |
| SSOT sync and tracked-tree diff      | Tag tree; sync may rewrite tracked assistant files                      | The diff must read the synchronized tree                                                   |
| Lint                                 | Tag tree; existing four lanes start together                            | Setup precedes each lane; existing lane command ordering is preserved                      |
| Types                                | Tag source and declarations; tsc writes dist and incremental state      | Compiler verification precedes compilation; source compilation precedes test type checking |
| Build, pack and leakage scan         | Tag source and assets; bundler and pack both rebuild dist               | The two writers stay serial, and leakage scanning reads the final build                    |
| Sliced package suites                | Tag source; integration and e2e also read a local build                 | Each relevant slice builds before its tests, on both runtime ranges                        |
| Whole-tag fallback                   | The old tag's complete aggregate and floor suite                        | Its scripts define the checks that tag supports; operation scripts cannot be assumed       |
| GitHub Release and npm publication   | Successful selected gates, verified tag and inspected package           | All selected gates precede upload; approval precedes npm publication                       |

- Isolation is required: tsc writes `dist/` while the bundler cleans it. Running
  both in one checkout would race. SSOT also writes files that lint reads; separate
  checkouts let lint inspect the committed source while the sync job independently
  refuses any drift. No generated output passes between the operation jobs.
- Cost declaration for a tag-push sliced path, counting publication after approval:
  22 executed job instances become 25; declared timeout minutes sum from 520 to 545. The added jobs each install their own dependencies. These are topology
  counts, not runner-minute measurements or cost ceilings. Whole and older sliced
  paths retain their previous executing jobs; the added jobs are skipped.
- Measurement boundary: the baseline is `DR-0017-0019`. The roughly 61-second lint
  interval is independent of types and build/pack work, but the baseline does not
  isolate every operation's duration. The topology and execution fixtures prove
  eligibility, complete coverage, isolation and refusal paths; they do not measure
  hosted runner scheduling. A comparable completed release run is still needed
  for actual overlap, per-operation duration, setup overhead, deadline headroom,
  total runner-minutes and a before/after wall-clock claim. No release is created
  or published to obtain that measurement.
- Scope: these jobs build this repository's package. The shipped workflow
  templates have no corresponding release checks.
- Related: AC-0017-0036, BR-0017-0069, TC-0017-0090, TC-0017-0091, TC-0017-0092

### DR-0017-0021: exempt lint hosts remain unconditional in the hygiene declaration

- Status: accepted
- Decision: `unconditionalDependencies` names the jobs hosting the exempt lint
  lanes. Each must exist in the verdict's direct dependencies, carry no condition,
  and be absent from `dependencyConditions`. A missing, empty, malformed or
  duplicate list is invalid.
- The independent topology assertion resolves every exempt command to its host
  and compares those hosts with the declaration. The hygiene lane can therefore
  reject a matching workflow condition and skip declaration even on a path that
  does not run the topology tests.
- The declaration owns job names; the rule does not hard-code today's hosts.
  Removing a host from this declaration is a reviewed exemption change, and the
  topology equality still refuses it while the host runs an exempt command.
- The declaration plus independent host equality enforces the existing exemption
  without a second workflow parser or changed allowed skip conditions.
- Related: BR-0017-0011, TC-0017-0012, TC-0017-0085

### DR-0017-0022: conditional matrix check names are pinned by selection state

- Status: accepted
- Decision: the check-name inventory models full and documentation-only runs
  separately. A selected matrix reports one check per declared slice; a matrix
  skipped by its job-level condition reports one check under its bare job name.
  Both sliced lanes follow the same rule. The required `ci-pass` context and
  declared matrix values remain unchanged.
- Observation: the documentation-only run
  <https://github.com/aganesy/QFAI/actions/runs/35492666770> at
  `dad4384dced73d5fde5d619a9644503932da9ea9` reported ten checks: five successful
  unconditional jobs and five skipped jobs, including bare `test` and
  `node-floor`. Paginated jobs and commit check-runs responses both contained
  ten entries, matching their totals. The full run
  <https://github.com/aganesy/QFAI/actions/runs/35479590985> at
  `bf473648c3f32ff61f63a7de6587c4db4f1e5346` reported 26 successful checks in
  both APIs, including nine expanded checks per sliced lane.
- The inventories are literals so an added, removed or renamed job remains a
  failing equality. Matrix conditions outside the model are rejected rather
  than silently interpreted as the observed detection condition.
- Related: AC-0017-0003, AC-0017-0006, AC-0017-0018, BR-0017-0006,
  BR-0017-0013, TC-0017-0007, TC-0017-0043

### DR-0017-0024: a `windows-latest` job runs the control-core and init suites, and gates no merge yet

- Status: accepted
- Date: 2026-09-24
- Context: `discussion-20260923171450572#NFR-0011` requires the journal, atomic
  publish, lock, path handling, init and upgrade to behave the same on Windows as
  on Linux, CRLF checkouts and paths with spaces included. Every job in
  `.github/workflows/ci.yml` runs on `ubuntu-latest`, so nothing observes that
  property today. The pack deferred how it is verified as its `OQ-0012`, and the
  pack is not tracked, so this entry is the tracked record of the answer.
- Decision: the user answered `OQ-0012` with A on 2026-09-24 (AskUserQuestion):
  a `windows-latest` job limited to the control-core suites and the init and
  migration suites.
  - The job is `windows-parity` in `ci.yml`. It needs `detect` and carries the
    `test` job's detection condition verbatim, so a documentation-only pull
    request skips it and its check name stays declared.
  - It sits in the aggregate verdict's `needs`, and the expected-required-context
    declaration gains its entry.
  - The suite list is the `test:windows-parity` script in
    `packages/qfai/package.json`, which the job calls. A developer runs the same
    list locally.
  - The job builds the package itself before its tests, and sets `TEMP` and `TMP`
    to a directory whose name has a space.
  - Its `SHIPPED-CI:` disposition is `not-applicable`: the shipped test lanes run
    the adopter's own scripts on the runner the adopter names, so the shipped set
    has no QFAI suite or fixed platform to add.
- The non-gating limit: the job turns the aggregate verdict `ci-pass` red on the
  pull request that causes a Windows regression, which is the reason the answer
  records. It does not block that pull request from merging. The repository's
  only required status check is the job named `build` (OC-73), and `build` has no
  `needs`, so no lane in `ci-pass`'s `needs` gates a merge today. The declaration
  in `.github/required-status-contexts.json` expects `ci-pass`, and moving the
  setting to match it is OQ-0017-0002, a repository-settings action no agent
  takes. Until that lands, the Windows job gates merges exactly as far as `lint`
  and `test` do.
- Measurement: the change that adds the job appends here the trial run's
  per-suite counts and timings, the `timeout-minutes` it sets from them, and the
  code-path pin's before-and-after figures (BR-0017-0030, BR-0017-0067). This
  record makes no cost claim before those numbers exist.
- Rejected: a recorded manual Windows run before each release
  - DO NOT: rely on a manual run to find a Windows regression. Temptation: it costs
    no runner minutes, but the regression then ships from the pull request that
    caused it and is found at release.
- Rejected: both the job and a manual run
  - DO NOT: add a second verification of the same property. Temptation: it looks
    safer, and it is two records to keep true.
- Rejected: the whole test suite on Windows
  - DO NOT: widen the suite list beyond the control-core and init and migration
    suites. Temptation: more coverage, but the answer limits the job, and suites
    that read the repository's tracked links fail on a Windows checkout for a
    reason that is not a parity defect.
- Rejected: making the job named `build` depend on the Windows job
  - DO NOT: put a conditional job under the required-context job. Temptation: it
    would gate merges today, but `build` would then be skipped whenever detection
    skips the job, and a skipped job reports success (OC-73, BR-0017-0012).
- Consequences: a documentation-only pull request executes nothing more, so its
  pin is unchanged. The code-path pin moves and is re-pinned in the same change.
  A test red on the trial run is classed as platform-inapplicable, a parity
  defect or a test defect, and no test leaves the list for being red.
- Related: AC-0017-0037, AC-0017-0038, AC-0017-0039, BR-0017-0070, BR-0017-0071,
  BR-0017-0072, BR-0017-0073; OQ-0017-0002; CLI-INIT `### Windows parity`.
