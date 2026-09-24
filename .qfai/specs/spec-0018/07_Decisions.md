# 07 Decisions

Decision Records for this spec. A `DR-*` cited from the `DR-ID` column of
`tdd/test-list.md` — which every `exception` row is required to carry — resolves
against this file, so an entry here is what makes that citation checkable.

## ID scheme

- **Spec-scoped**: `DR-0018-NNNN`. Every entry below binds only `spec-0018`.
- **Policy-level**: `DR-0296` (a new capability is approved once, at routing) and
  `DR-0297` (a diagnosed missing-test row is appended without a Change Request)
  are declared in `_policies/08_Decisions.md`. They are cited from here and not
  restated: an ID declared twice has two owners.
- Each entry here has a `### DL-NNNN` twin in `09_delta.md` `## Decision Log`.

The mechanism each decision governs is stated in the CLI contracts, which the
entries cite rather than copy: CLI-WF (`.qfai/contracts/cli/qfai-workflow.md`) and
CLI-WFFILE (`.qfai/contracts/cli/workflow-files.schema.md`). Requirement IDs are
the upstream pack's, written `discussion-20260923171450572#REQ-NNNN`; the pack is
not tracked, so each entry states its reason here.

## Decisions

### DR-0018-0001: spec-0018 is not declared UI-bearing

- Status: accepted
- Date: 2026-09-24
- Context: the discussion stage classified the pack as UI-bearing with a `cli`
  primary surface, and `/qfai-sdd` normally normalizes such a pack's screens into
  a UI contract. A spec with a UI contract must declare itself UI-bearing, and
  that declaration would be this repository's first surface signal. Once any
  signal exists, only UI-bearing specs owe an E2E reference per user story, so the
  E2E rows of every other spec would have to be retired. Counted from each
  `tdd/test-list.md`: 218 E2E rows across 17 specs, 27 `done` and 191 `todo`.
  Retiring them takes 17 approval-required `UPDATE:REMOVE` rows, six of them on
  specs outside the approved triage.
- Evidence: `core/prototyping/specResolution.ts` (`UI_BEARING_MARKER_RE`,
  `TITLE_MARKER_RE`); `validators/surfaceTypeDrift.ts`; `QFAI-ATDD-111` scoping in
  `core/atddTraceability.ts`; `qfai-sdd/SKILL.md` on retiring E2E rows when the
  first signal appears.
- Decision: the user chose to leave spec-0018 undeclared (2026-09-24). No file is
  written under `.qfai/contracts/ui/`. The fourteen operator-facing screens are
  the `## Operator-facing screens` section of CLI-WF. `01_Spec.md` carries no
  surface marker of any kind, and the shared Mapping Rule in
  `_policies/05_Contracts.md` states this exception.
- Rejected: declare spec-0018 UI-bearing and retire the other specs' E2E rows
  - DO NOT: add a UI-bearing marker, a UI contract, or a heading that reads as a
    prototyping title to this spec. Temptation: the discussion stage called the
    surface UI-bearing, and the skill's normalization rule seems to require it.
- Rejected: declare every other spec UI-bearing to keep its E2E obligations
  - DO NOT: declare a spec UI-bearing to keep an obligation. Temptation: nothing
    is deleted, but each declared spec then owes a UI contract and a surface
    review no request asked for.
- Consequences: `QFAI-ATDD-111` stays project-wide, and spec-0018's stories owe E2E
  references like every other spec's. `product-experience-architect` and
  `product-surface-reviewer` are not routed for this spec, so operator-facing
  text gets no product-surface review at implement; interface clarity is held by
  the ordinary reviewers. The UI-contract lanes do not check these screens.
  Adopting surface typing later is one change with its own approvals.
- Related: CLI-WF `## Operator-facing screens`; `_policies/05_Contracts.md`
  `## Mapping Rules`.

### DR-0018-0002: the size signal is a signal, not a SPLIT trigger

- Status: accepted
- Date: 2026-09-24
- Context: this spec is created with about 41 acceptance criteria, and its test
  cases will exceed fifty. `_policies/11_Slice-Policy.md` carries the size test
  `acCount <= 30 && tcCount <= 50`, and its step 4 routes an oversized spec to
  SPLIT.
- Evidence: `packages/qfai/src/core/sddTriage.ts:320-327`;
  `validators/specSplitByCapability.ts`; DR-0017-0001.
- Decision: record the breach as a signal and keep spec-0018 as one spec owning
  `CAP-0018`. The size test decides where an arriving requirement goes, not how
  large a spec may be; spec-0018 arrived through an approved CREATE. It holds one
  capability, so a SPLIT has nothing to separate. A second spec directory with no
  second capability fails the positional capability gate.
- Rejected: split into two specs
  - DO NOT: propose a count-driven SPLIT. Temptation: the numbers are over the
    threshold, and the table reads like a cap.
- Rejected: merge acceptance criteria to fit under 30
  - DO NOT: merge two outcomes into one criterion to meet a count. Temptation:
    it silences the signal at the cost of criteria a reviewer can judge alone.
- Consequences: one line in `09_delta.md` records the counts.
- Related: `CAP-0018`; `_policies/11_Slice-Policy.md` `## APPEND vs CREATE 判定アルゴリズム`.

### DR-0018-0003: five JSON Schemas ship, and the parser is the runtime authority

- Status: accepted
- Date: 2026-09-24
- Context: the execution context must validate against a shipped schema that
  carries no private version marker, and the schema tests run on every pull
  request. Node has no JSON Schema validator, and the package declares none.
- Evidence: `discussion-20260923171450572#REQ-0025`, `#NFR-0004`, `#NFR-0009`,
  `#NFR-0015`; `packages/qfai/package.json` dependencies and devDependencies.
- Decision: ship five schemas and keep the TypeScript parser as the only runtime
  authority, so adopters get no new runtime dependency. A draft 2020-12 validator
  runs in tests only, as a devDependency, and every example and fixture must get
  the same verdict from both (CLI-WFFILE `## Shipped schemas`).
- Rejected: ship no schema and let the parser alone define the payloads
  - DO NOT: drop the shipped schemas. Temptation: one source of truth and no
    dependency, but the requirements' acceptance signals name a shipped schema.
- Rejected: validate against the schemas at runtime
  - DO NOT: add a runtime dependency for adopters. Temptation: one validator
    everywhere, but the result still needs narrowing into types.
- Consequences: the devDependency's licence is checked when it is added. Two
  sources are kept in agreement by a test.
- Related: CLI-WFFILE `## Shipped schemas`.

### DR-0018-0004: the core reads git read-only and runs validate in process

- Status: accepted
- Date: 2026-09-24
- Context: the pack says the only command the core runs is validation. The core
  also needs the branch, the worktree identity, the dirty state and the diff
  inside the scope, which only git can report.
- Evidence: `discussion-20260923171450572#REQ-0029`, `#REQ-0030`, `#REQ-0061`,
  `#NFR-0013`; `core/gitChanges.ts`, which the validator already uses.
- Decision: the core runs no repository command. It reads git read-only through
  argv with no shell, and runs validate in process (CLI-WF `## Boundaries`).
- Rejected: take the git facts from the harness
  - DO NOT: let `finish` judge the diff scope on agent-reported facts.
    Temptation: the core would then spawn nothing at all.
- Rejected: spawn the package's CLI for validate
  - DO NOT: capture and parse a child process's output. Temptation: it matches
    the pack's wording, but it needs a launcher on Windows and gains nothing.
- Consequences: the wording departs from the pack, not from the recorded
  decisions, which remove only a command registry and an `exec` operation.
- Related: CLI-WF `## Boundaries`, `## Completion`.

### DR-0018-0005: `shadow` creates no run

- Status: accepted
- Date: 2026-09-24
- Context: `shadow` proposes a route and its reason and writes or approves
  nothing, and its acceptance signal is that it writes nothing.
- Evidence: `discussion-20260923171450572#REQ-0059`; the `host:request-entry`
  screen.
- Decision: under `shadow`, `start` writes nothing and returns the mode.
  `qfai-run` reads the mode from `status`, proposes in the conversation and calls
  no write operation (CLI-WF `## Modes`).
- Rejected: create a run, check the proposal, and cancel it
  - DO NOT: write a run directory under `shadow`. Temptation: the core would
    check the shadow proposal, but the tree would no longer be byte-identical.
- Consequences: known limit — the core checks no shadow proposal.
- Related: CLI-WF `## Modes`.

### DR-0018-0006: a later fail-closed cause on a `ready` or `awaiting_input` run is refused

- Status: accepted
- Date: 2026-09-24
- Context: a fail-closed cause found after `start` was to send the run to
  `blocked`. The state table has no edge from `ready` or `awaiting_input` to
  `blocked`.
- Evidence: `discussion-20260923171450572#REQ-0033`, `#REQ-0059`.
- Decision: a cause found on a `running` or `routing` run moves it to `blocked`
  over the existing edges. Found on a `ready` or `awaiting_input` run, the
  operation is refused `fail-closed`, naming the cause, and the state is
  unchanged. A `stop` is never refused on that ground (CLI-WF `## State machine`,
  `## Fail-closed`).
- Rejected: add edges from `ready` and `awaiting_input` to `blocked`
  - DO NOT: widen the state table to carry this case. Temptation: every halted
    run would then read `blocked`, but the table is fixed by the requirement.
- Consequences: automatic chaining stops until the cause is cleared through
  `resume` or the run is stopped. `status` names the cause either way.
- Related: CLI-WF `## State machine`, `## Fail-closed`.

### DR-0018-0007: the stage kinds and the operation `defect-row-seeding`

- Status: accepted
- Date: 2026-09-24
- Context: the pack left the final names of the three bugfix stages open.
- Evidence: `discussion-20260923171450572#REQ-0006`, `#REQ-0047`, `#REQ-0066`,
  whose signals and seed rewrites name `sdd_append`.
- Decision: the stage kinds are CLI-WFFILE `### Vocabulary`, with `sdd_append`,
  `test_fix` and `regression_fix`. The SDD operation is `defect-row-seeding`, and
  its Phase 2b procedure is "defect row seeding".
- Rejected: rename `sdd_append` to `seed_defect_row`
  - DO NOT: rename a stage kind the requirements and seeds already name.
    Temptation: the kind would read as its operation, at the cost of the recorded
    safety list.
- Consequences: the name does not collide with Phase 2c "Obligation
  reconciliation".
- Related: CLI-WFFILE `### Vocabulary`; DR-0297.

### DR-0018-0008: the built-in plans are not an extension point

- Status: accepted
- Date: 2026-09-24
- Context: the plans are installed into the project under
  `.qfai/assistant/process/workflows/`, where a project can edit them.
- Evidence: `discussion-20260923171450572#REQ-0057`, `#REQ-0059`, `#REQ-0064`.
- Decision: the core loads the package's plans and requires the installed copy
  to match after CRLF normalization. A missing or differing copy is trigger (b),
  not a fourth kind of drift. A project does not add, remove or edit a plan
  (CLI-WFFILE `## Plan files`).
- Rejected: load the project's copy and let adopters customize it
  - DO NOT: read an edited plan as the plan. Temptation: flexibility, but an
    adopter could drop a stage and every gate behind it.
- Rejected: ship the plans in the package only, with no project copy
  - DO NOT: skip the install. Temptation: nothing to drift, but the requirements
    install the plan definitions.
- Consequences: every stage skill a plan names declares its operations in the
  table CLI-WFFILE `### The Operations table` fixes.
- Related: CLI-WFFILE `## Plan files`; CLI-WF `## Fail-closed`.

### DR-0018-0009: `io-error`, and the closed `reasons[]` of `invalid-input`

- Status: accepted
- Date: 2026-09-24
- Context: the refusal registry is a closed set with no code for a write that
  the file system refused, and `invalid-input` named no check, while the tests
  assert codes and never message text.
- Evidence: `discussion-20260923171450572#REQ-0017`, `#REQ-0022`, `#NFR-0011`,
  `#NFR-0012`.
- Decision: `EBUSY`, `EPERM` and `EACCES` while writing are refused `io-error`,
  naming the system error, with no retry loop. `invalid-input` carries
  `reasons[]` from a closed set, in the shape `proposal-refused` uses. The exit
  code of `io-error` is the one CLI-WF `## Exit codes` gives; no rule in this
  spec restates the number.
- Rejected: retry inside the core
  - DO NOT: loop on a busy file. Temptation: it hides a transient Windows lock,
    but every write operation is idempotent, so the harness re-invoking it is the
    retry.
- Rejected: one `invalid-input` with the check named only in the message
  - DO NOT: make a test read message text. Temptation: fewer codes.
- Consequences: if the Phase 0 reviewer changes either, this entry is amended in
  the same revision.
- Related: CLI-WF `## Output`, `## Exit codes`, `## Journal, lock and crash states`.

### DR-0018-0010: the `blocker` names of a blocked run

- Status: accepted
- Date: 2026-09-24
- Context: a run can be `blocked` for a reason that is not a fail-closed cause —
  a stage reporting `blocked`, an unavailable delegation, a budget at its cap, a
  dependency outside the scope — and the notice has to name that reason and who
  can clear it.
- Evidence: `discussion-20260923171450572#REQ-0031`, `#REQ-0037`, `#REQ-0040`.
- Decision: a blocked run names exactly one fail-closed cause or one blocker from
  the closed set CLI-WF `## State machine` gives, with who can clear it. `resume`
  also fires `interrupted` to `blocked` when reconciliation leaves one.
- Rejected: widen the fail-closed cause set to cover these
  - DO NOT: call a budget or a stage outcome policy drift. Temptation: one field
    instead of two, but fail-closed is defined as exactly three kinds of drift and
    three other causes.
- Consequences: each blocker has a clearing condition that `resume` checks.
- Related: CLI-WF `## State machine`.

### DR-0018-0011: the strongest chosen answer effect wins

- Status: accepted
- Date: 2026-09-24
- Context: each option of a question carries one effect, `proceed`, `replan` or
  `stop`, and a question may allow several options to be chosen.
- Evidence: `discussion-20260923171450572#REQ-0018`, `#REQ-0039`.
- Decision: the answer's effect is the strongest among the chosen options, in the
  order `stop`, `replan`, `proceed` (CLI-WF `## Questions and decisions`).
- Rejected: refuse an answer whose options carry different effects
  - DO NOT: refuse a valid multi-select answer. Temptation: no precedence to
    define, but the operator would be asked to answer again.
- Consequences: a single stop among the chosen options ends the run.
- Related: CLI-WF `## Questions and decisions`.

### DR-0018-0012: the release eval measures English routing, with the seed rewrites

- Status: accepted
- Date: 2026-09-24
- Context: the 64 routing seeds become a manual release-gate eval, and 60 of
  their prompts were written in Japanese. Four seeds expect no question on a new
  capability, which the routing-time CREATE question (DR-0296) contradicts. Four
  of the classes that must never route `direct` have no seed: an environment
  setting, a SQL file, a generated file, and QFAI's own skills or constitution.
  ROUTE-028 expects a choice between two resumable runs, a state a worktree
  cannot hold.
- Evidence: `discussion-20260923171450572#REQ-0066`, `#REQ-0007`, `#NFR-0005`,
  `#NFR-0009`;
  the user's answer that the prompts are translated and tracked with no Japanese
  variant; `.agents/rules/repository-language.md`.
- Decision:
  - The prompts are translated to English and tracked, with no Japanese variant.
  - Four seeds, ROUTE-014, ROUTE-035, ROUTE-055 and ROUTE-056, are rewritten to
    expect the routing-time CREATE question, which widens the requirement's
    rewrite list.
  - Four seeds are rewritten to carry one of those four classes each, in a form
    that tempts `direct`: ROUTE-044, ROUTE-045, ROUTE-022 and ROUTE-024. Each
    takes an `allowedRoutes` without `direct`, a `forbid` naming `direct`, and a
    materialized fact. Each held a case another seed already holds: ROUTE-044
    the clear feature of ROUTE-014, and the other three the no-write request of
    ROUTE-021 and ROUTE-031. The counts stay 24 and 64.
  - ROUTE-028 is rewritten to one live run beside a terminal one, resumed with no
    question, because a worktree holds at most one non-terminal run
    (BR-0018-0066).
  - The manual runner lives under `packages/qfai/tests/`, with a file name vitest
    does not collect. A test fails if any workflow file references it.
- Rejected: record the four missing classes as an open question and add no seed
  - DO NOT: leave an excluded class without a seed. Temptation: no seed changes,
    but the requirement's signal names a seed for every excluded class.
- Rejected: keep ROUTE-028's choice between two runs
  - DO NOT: score a state the core cannot reach. Temptation: the seed names a
    real risk, guessing the run, but one non-terminal run per worktree leaves
    nothing to guess.
- Rejected: add four seeds
  - DO NOT: change the seed counts. Temptation: nothing is rewritten, but the
    requirement fixes the counts at 24 and 64.
- Rejected: keep the Japanese prompts, or track both languages
  - DO NOT: add a language variant of the seeds. Temptation: the eval would then
    measure the language the prompts were written in.
- Rejected: a repository script under `scripts/`
  - DO NOT: put a runner no lane runs in the toolchain's directories. Temptation:
    it looks like a script, but that category owns lane wiring.
- Consequences: no requirement scores routing in another language. The pass bar
  stays with the user at release. The safety-relevant list is recomputed by its
  rule before it is recorded, and the clear-feature case stays on it through
  ROUTE-014.
- Related: `05_Examples.md` rewritten-seed rows.

### DR-0018-0013: only a `change` request calls `start`

- Status: accepted
- Date: 2026-09-24
- Context: `qfai-run` classifies a request into seven kinds, and only `change`
  starts a change workflow. The built-in plans cover the five change routes and
  nothing else.
- Evidence: `discussion-20260923171450572#REQ-0002`, `#REQ-0053`; the
  `host:request-entry` screen's `empty` state.
- Decision: only a `change` request calls `start`. `resume` calls `resume`,
  `cancel` calls `decision` with `stop`, `explicit_stage`, `plan_only` and
  `verify_only` invoke the stage by name, and `read_only` is answered in the
  conversation. A routing result whose request kind is not `change` is refused
  `proposal-refused` with reason `scope-escape`.
- Rejected: a plan per request kind
  - DO NOT: add plans for kinds other than `change`. Temptation: one path for
    every request, but the plans are the five change routes and not an extension
    point (DR-0018-0008).
- Consequences: known limit — the core does not see how `qfai-run` classified a
  request it never received.
- Related: CLI-WF `### Route proposal`, `## Operator-facing screens`.
