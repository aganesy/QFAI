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
