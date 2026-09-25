# 09 Delta

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-09-24
- Primary: Initial
- Tags: @docs, @test
- Summary: spec-0018 created for the free-text entry (`qfai-run`), the `direct` route skill
  (`qfai-maintain`) and the workflow control core (`npx qfai workflow`), from
  `discussion-20260923171450572`. Ten stories, 46 acceptance criteria and 122 business rules;
  the command and its files are specified in CLI-WF and CLI-WFFILE. The obligation
  reconciliation rewords BR-0018-0011, 0026, 0045, 0058, 0066 and 0076 to what the contracts
  state, adds the missing contract realization rows, and records four more seed rewrites in
  DR-0018-0012. The second reconciliation pass adds BR-0018-0123 and AC-0018-0047 for the
  record areas a work order grants, rewrites ROUTE-028, and leaves the safety floor to its
  rule with no fixed count. The third pass adds BR-0018-0124, BR-0018-0126 and AC-0018-0048, so the proposal
  names each tracked record its stages write, and BR-0018-0125 and AC-0018-0049, so upstream
  drift outside the checked scope halts the run and its Change Request is raised outside it.
  Applying an approved Change Request stays a standalone operation. The fourth pass rewords BR-0018-0125 and AC-0018-0049: the blocker's subject and owner come from the `blocked` result's `debts`, and `resume` reissues the stage. Phase 2c.7 reconciles CLI-WF's run change boundary with BR-0018-0127 and AC-0018-0050. Three L1 cases cover stage records, core evidence and the approved out-of-run repair with its refusal boundaries. The completion reconciliation adds BR-0018-0128 and BR-0018-0129 with AC-0018-0051 and AC-0018-0052: `qfai_done` checks that tracked run changes and workflow evidence are committed before completion, while either target records completion only in runtime state. The final tracked summary retains its last-written state and `status` reads the journal.

- Change ID: DELTA-0002
- Date: 2026-09-24
- Primary: Follow-up
- Tags: @docs
- Summary: CR-20260924-0001 clarifies that the Plan's usage table traces
  behavioural obligations rather than independent production consumers. The
  spec-required pure decision function has a narrow first-row exception to the
  three-consumer floor. U1 still wires the command adapter through it. No TC,
  US or CON-API obligation changed, so no TDD row requires a reset.

- Change ID: DELTA-0003
- Date: 2026-09-25
- Primary: Follow-up
- Tags: @docs, @test
- Summary: CR-20260924-0002 Option 1 adds EX-0018-0154, TC-0018-0268 and
  TDD-0527 for a missing persisted CREATE authorization before the SDD work
  order. CLI-WF gains the `ready` to `awaiting_input` issue-time edge. The
  positive TC-0018-0003 and existing TDD obligations are unchanged.

- Change ID: DELTA-0004
- Date: 2026-09-25
- Primary: Follow-up
- Tags: @docs, @test
- Summary: CR-20260925-0003 corrects TDD-0014's owning module to the
  workflow decision core for its JSON-verdict assertion. TC-0018-0010 and the
  separate skill-text row TDD-0261 are unchanged. The CR3 block on TDD-0014
  is released to todo; no obligation was reset or retired.

- Change ID: DELTA-0005
- Date: 2026-09-25
- Primary: Follow-up
- Tags: @docs, @test
- Summary: CR-20260925-0004 Option 1 gives every route proposal reference
  an explicit `kind` and `ref`. The normative and observed arrays remain
  separate. Missing path facts refuse `unknown-path`, and legacy string
  entries fail schema validation. EX-0018-0155, TC-0018-0269 and TDD-0528/0529
  cover both legacy-array boundaries. The owner sweep releases 48 CR4-blocked
  rows to todo and resets only TDD-0015, TDD-0016 and TDD-0025 because their
  independently observable obligations changed. TDD-0001 and TDD-0004 remain
  done pending shared-file re-verification.

- Change ID: DELTA-0006
- Date: 2026-09-25
- Primary: Follow-up
- Tags: @docs, @test
- Summary: CR-20260925-0006 parts B, C and D.
  - B: TC-0018-0031's input is a result whose `gateResults` claims a PASS for
    a gate, because a `gateResults` entry has no trust-level key. The claim is
    still recorded `agent_reported` and decides no gate.
  - C: CLI-WF `## Completion` fixes the owner of every `unmet[]` condition.
    No BR or AC of this spec contradicted it, so none changed.
  - D: TC-0018-0043 and EX-0018-0026 name `qfai-sdd` as the debt's
    `resolvingOwner`. `finish` lists `debt-open` with that owner and the other
    spec in `subject`, and the run does not complete until that spec repairs
    it.

  IDs are unchanged. TDD-0035 and TDD-0055 stay at todo; this CR goes in
  their DR-ID.

- Change ID: DELTA-0007
- Date: 2026-09-25
- Primary: Follow-up
- Tags: @docs, @test
- Summary: CR-20260925-0008.
  - Part A, option 1: a refusal changes no state, so a `test-fix-meaning`
    refusal cannot issue the next work order. TC-0018-0081, EX-0018-0049,
    AC-0018-0017 and BR-0018-0049 expect the refusal to name `qfai-sdd` as the
    owner of the fix and the run to be unchanged. The `test_fix` stage reaches
    SDD by returning `needs_repair` with that finding owned by `qfai-sdd`.
  - Part B, option 2: CLI-WF `### Work order` derives `requiredReviewerRoles`
    from the executor skill's review profile. `authorization-restored` gives
    `qfai-implement` and `qfai-atdd` work orders `implementation-heavy`.
    TC-0018-0085, EX-0018-0052, BR-0018-0052 and AC-0018-0019 name it in place
    of "the stronger review profile".

  IDs are unchanged. TDD-0100 and TDD-0111 stay at todo; this CR goes in their
  DR-ID.

- Change ID: DELTA-0008
- Date: 2026-09-25
- Primary: Follow-up
- Tags: @docs, @test
- Summary: CR-20260925-0009 option 1. A plan stage declares the external
  effects it needs in an optional `effects` list (CLI-WFFILE `### Format`),
  and a work order's `allowedEffects` are the declared effects the run's
  `project_policy` also names. A `request_scope` authorizes no effect.
  BR-0018-0053 and AC-0018-0020 drop the request path. TC-0018-0086 and
  EX-0018-0053 name the stage declaration. TC-0018-0087's second boundary is
  a push only the request names, which is not carried. IDs are unchanged.
  TDD-0112 to TDD-0119 stay at todo; this CR goes in their DR-ID.

## Triage (2026-09-24 intent-driven entry)

The per-spec copy of the approved `CREATE` row in `_policies/10_delta.md` under the same
heading. It restates the one approval the user gave and adds none.

| Source                                                                                                                     | Subject                                                                                                                                       | Existing Spec | Operation | Sub-op | Approved By              | Rationale                                                                                                                                                                   | Depends-On                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| REQ-0001..0042, REQ-0044, REQ-0049, REQ-0054, REQ-0055, REQ-0057..0063, REQ-0066..0068, NFR-0001, NFR-0002, NFR-0004..0018 | `spec-0018`: the free-text entry (`qfai-run`), the `direct` route skill (`qfai-maintain`) and the workflow control core (`npx qfai workflow`) | -             | CREATE    | -      | yusuke_senaga@2026-09-24 | The per-spec copy of the approved `CREATE` row in `_policies/10_delta.md`, which registers `CAP-0018`. The user approved the `CREATE` through AskUserQuestion on 2026-09-24 | OQ-0001, OQ-0002, OQ-0003, OQ-0004, OQ-0005, OQ-0007, OQ-0008, OQ-0009, OQ-0010, OQ-0011, OQ-0013, OQ-0018 |

## Update History

| Date       | DL      | Summary                                                                                 |
| ---------- | ------- | --------------------------------------------------------------------------------------- |
| 2026-09-24 | DL-0001 | DR-0018-0001: spec-0018 is not declared UI-bearing                                      |
| 2026-09-24 | DL-0002 | DR-0018-0002: The size signal is a signal, not a SPLIT trigger                          |
| 2026-09-24 | DL-0003 | DR-0018-0003: Five JSON Schemas ship, and the parser is the runtime authority           |
| 2026-09-24 | DL-0004 | DR-0018-0004: The core reads git read-only and runs validate in process                 |
| 2026-09-24 | DL-0005 | DR-0018-0005: `shadow` creates no run                                                   |
| 2026-09-24 | DL-0006 | DR-0018-0006: A later fail-closed cause on a `ready` or `awaiting_input` run is refused |
| 2026-09-24 | DL-0007 | DR-0018-0007: The stage kinds and the operation `defect-row-seeding`                    |
| 2026-09-24 | DL-0008 | DR-0018-0008: The built-in plans are not an extension point                             |
| 2026-09-24 | DL-0009 | DR-0018-0009: `io-error`, and the closed `reasons[]` of `invalid-input`                 |
| 2026-09-24 | DL-0010 | DR-0018-0010: The `blocker` names of a blocked run                                      |
| 2026-09-24 | DL-0011 | DR-0018-0011: The strongest chosen answer effect wins                                   |
| 2026-09-24 | DL-0012 | DR-0018-0012: The release eval measures English routing, with the seed rewrites         |
| 2026-09-24 | DL-0013 | DR-0018-0013: Only a `change` request calls `start`                                     |

## Decision Log

One entry per `07_Decisions.md` record: `DL-NNNN` is the twin of `DR-0018-NNNN`.

### DL-0001

DR-0018-0001: spec-0018 is not declared UI-bearing.

#### Meta

```yaml
id: DL-0001
date: 2026-09-24
primary: Initial
tags: ["@docs", "@test"]
compat: Improvement
scope:
  - .qfai/contracts/cli/qfai-workflow.md
  - .qfai/specs/_policies/05_Contracts.md
notes: The user left spec-0018 undeclared; its screens are a CLI-WF section and no other ledger changes
```

#### Migration / Follow-ups

- No migration required. spec-0018 is new.

#### Rejected

- option: declare spec-0018 UI-bearing and retire the other E2E rows
  reason: 218 E2E rows across 17 specs, 27 of them done, would be deleted through 17 approval-required removals
  do_not: add a UI-bearing marker, a UI contract or a prototyping title to this spec
  temptation: the discussion stage called the surface UI-bearing
- option: declare every other spec UI-bearing
  reason: each declared spec would owe a UI contract and a surface review no request asked for
  do_not: declare a spec UI-bearing to keep an obligation
  temptation: nothing is deleted

### DL-0002

DR-0018-0002: The size signal is a signal, not a SPLIT trigger.

#### Meta

```yaml
id: DL-0002
date: 2026-09-24
primary: Initial
tags: ["@docs"]
compat: Improvement
scope:
  - .qfai/specs/spec-0018
notes: About 46 acceptance criteria exceed the slice threshold; the spec stays one spec owning one capability
```

#### Migration / Follow-ups

- No migration required. spec-0018 is new.

#### Rejected

- option: split into two specs
  reason: a count-driven split of a one-capability spec has no legal end state and needs a second CREATE
  do_not: propose a count-driven SPLIT
  temptation: the numbers are over the threshold
- option: merge criteria to fit under 30
  reason: it merges outcomes a reviewer must judge apart
  do_not: merge two outcomes into one criterion to meet a count
  temptation: a smaller number looks tidier

### DL-0003

DR-0018-0003: Five JSON Schemas ship, and the parser is the runtime authority.

#### Meta

```yaml
id: DL-0003
date: 2026-09-24
primary: Initial
tags: ["@test"]
compat: Improvement
scope:
  - .qfai/contracts/cli/workflow-files.schema.md
  - packages/qfai/assets/schemas/workflow/
notes: The schemas ship for adopters and tests; the TypeScript parser decides at runtime
```

#### Migration / Follow-ups

- No migration required. spec-0018 is new.

#### Rejected

- option: ship no schema
  reason: the approved requirements name a shipped schema
  do_not: drop the shipped schemas
  temptation: one source of truth and no test-time validator
- option: validate against the schemas at runtime
  reason: it adds a runtime dependency for every adopter
  do_not: add a runtime schema validator
  temptation: one validator for both jobs

### DL-0004

DR-0018-0004: The core reads git read-only and runs validate in process.

#### Meta

```yaml
id: DL-0004
date: 2026-09-24
primary: Initial
tags: ["@test"]
compat: Improvement
scope:
  - .qfai/contracts/cli/qfai-workflow.md
notes: The core runs no repository command; it reads git through argv and calls validate in process
```

#### Migration / Follow-ups

- No migration required. spec-0018 is new.

#### Rejected

- option: take the git facts from the harness
  reason: finish would judge the diff scope on agent-reported facts
  do_not: let finish trust a submitted diff
  temptation: fewer moving parts in the core
- option: spawn the package's CLI for validate
  reason: it brings back the launcher problem on Windows
  do_not: capture and parse a child process's output for validate
  temptation: it matches the command a person runs

### DL-0005

DR-0018-0005: `shadow` creates no run.

#### Meta

```yaml
id: DL-0005
date: 2026-09-24
primary: Initial
tags: ["@test"]
compat: Improvement
scope:
  - .qfai/contracts/cli/qfai-workflow.md
notes: Under shadow, start writes nothing and returns the mode; the core checks no shadow proposal
```

#### Migration / Follow-ups

- No migration required. spec-0018 is new.

#### Rejected

- option: create a run, check the proposal and cancel it
  reason: shadow must write nothing
  do_not: write a run directory under shadow
  temptation: the core would check the proposal

### DL-0006

DR-0018-0006: A later fail-closed cause on a `ready` or `awaiting_input` run is refused.

#### Meta

```yaml
id: DL-0006
date: 2026-09-24
primary: Initial
tags: ["@test"]
compat: Improvement
scope:
  - .qfai/contracts/cli/qfai-workflow.md
notes: Such a run refuses every operation but stop until the cause clears; running and routing runs go blocked
```

#### Migration / Follow-ups

- No migration required. spec-0018 is new.

#### Rejected

- option: add edges from ready and awaiting_input to blocked
  reason: it widens the state table the requirements fixed
  do_not: widen the state table for this case
  temptation: every halted run would then read the same

### DL-0007

DR-0018-0007: The stage kinds and the operation `defect-row-seeding`.

#### Meta

```yaml
id: DL-0007
date: 2026-09-24
primary: Initial
tags: ["@docs"]
compat: Improvement
scope:
  - .qfai/contracts/cli/workflow-files.schema.md
notes: sdd_append, test_fix and regression_fix are the stage kinds; defect-row-seeding is the SDD operation
```

#### Migration / Follow-ups

- No migration required. spec-0018 is new.

#### Rejected

- option: rename sdd_append to seed_defect_row
  reason: the requirements and the recorded seeds already name sdd_append
  do_not: rename a stage kind the requirements and seeds name
  temptation: the new name reads better

### DL-0008

DR-0018-0008: The built-in plans are not an extension point.

#### Meta

```yaml
id: DL-0008
date: 2026-09-24
primary: Initial
tags: ["@test"]
compat: Improvement
scope:
  - .qfai/contracts/cli/workflow-files.schema.md
notes: The core loads the package plans and requires the installed copy to match
```

#### Migration / Follow-ups

- No migration required. spec-0018 is new.

#### Rejected

- option: load the project's copy and let adopters customize it
  reason: an edited plan would change what a run checks
  do_not: read an edited plan as the plan
  temptation: flexibility
- option: ship the plans in the package only
  reason: the requirements install the plans with the skills
  do_not: skip installing the plans
  temptation: nothing to drift

### DL-0009

DR-0018-0009: `io-error`, and the closed `reasons[]` of `invalid-input`.

#### Meta

```yaml
id: DL-0009
date: 2026-09-24
primary: Initial
tags: ["@test"]
compat: Improvement
scope:
  - .qfai/contracts/cli/qfai-workflow.md
notes: A busy file is refused io-error with no retry loop; invalid-input names its failed check from a closed set
```

#### Migration / Follow-ups

- No migration required. spec-0018 is new.

#### Rejected

- option: retry inside the core
  reason: a loop hides a Windows lock and can spin
  do_not: loop on a busy file
  temptation: it hides a transient lock
- option: one invalid-input with the check named only in the message
  reason: a test would have to read message text
  do_not: make a test read message text
  temptation: fewer codes

### DL-0010

DR-0018-0010: The `blocker` names of a blocked run.

#### Meta

```yaml
id: DL-0010
date: 2026-09-24
primary: Initial
tags: ["@test"]
compat: Improvement
scope:
  - .qfai/contracts/cli/qfai-workflow.md
notes: A blocked run names exactly one fail-closed cause or one blocker, each with a clearing condition
```

#### Migration / Follow-ups

- No migration required. spec-0018 is new.

#### Rejected

- option: widen the fail-closed cause set to cover blockers
  reason: a budget or a stage outcome is not policy drift
  do_not: call a budget or a stage outcome policy drift
  temptation: one field for every halt

### DL-0011

DR-0018-0011: The strongest chosen answer effect wins.

#### Meta

```yaml
id: DL-0011
date: 2026-09-24
primary: Initial
tags: ["@test"]
compat: Improvement
scope:
  - .qfai/contracts/cli/qfai-workflow.md
notes: A multi-select answer takes the strongest effect among its options, so one stop ends the run
```

#### Migration / Follow-ups

- No migration required. spec-0018 is new.

#### Rejected

- option: refuse an answer whose options carry different effects
  reason: a valid multi-select answer would be refused
  do_not: refuse a valid multi-select answer
  temptation: no precedence to define

### DL-0012

DR-0018-0012: The release eval measures English routing, with the seed rewrites.

#### Meta

```yaml
id: DL-0012
date: 2026-09-24
primary: Initial
tags: ["@test"]
compat: Improvement
scope:
  - packages/qfai/tests/
  - .qfai/specs/spec-0018/05_Examples.md
notes: Prompts are English and tracked; four seeds (ROUTE-014, 035, 055, 056) expect the routing-time question; four (ROUTE-044, 045, 022, 024) carry the direct exclusions no seed covered; ROUTE-028 resumes the one live run beside a terminal one; the counts stay 24 and 64; the runner sits under packages/qfai/tests/
```

#### Migration / Follow-ups

- No migration required. spec-0018 is new.

#### Rejected

- option: record the four uncovered direct exclusions as an open question
  reason: the requirement's signal names a seed for every excluded class
  do_not: leave an excluded class without a seed
  temptation: no seed changes
- option: add four seeds
  reason: the requirement fixes the counts at 24 and 64
  do_not: change the seed counts
  temptation: nothing is rewritten
- option: keep the Japanese prompts, or track both languages
  reason: the user chose English prompts only
  do_not: add a language variant of the seeds
  temptation: the eval would measure more
- option: a repository script under scripts/
  reason: a runner no lane runs is not toolchain
  do_not: put a manual runner in the toolchain's directories
  temptation: scripts/ is where scripts go

### DL-0013

DR-0018-0013: Only a `change` request calls `start`.

#### Meta

```yaml
id: DL-0013
date: 2026-09-24
primary: Initial
tags: ["@test"]
compat: Improvement
scope:
  - .qfai/contracts/cli/qfai-workflow.md
notes: The other request kinds are handled without a run; the core does not see how a request it never received was classified
```

#### Migration / Follow-ups

- No migration required. spec-0018 is new.

#### Rejected

- option: a plan per request kind
  reason: CLI-WFFILE allows one plan per route, and a read-only request must create no run
  do_not: add plans for kinds other than change
  temptation: one path for every request

## Size Signal

- spec-0018 holds 46 acceptance criteria against the slice threshold of 30, and will hold
  more than 50 test cases. It stays one spec owning `CAP-0018` (DR-0018-0002).

## Dropped Pack Seeds

The pack's example seeds in another spec's half are not carried as examples here.

| Pack story | Seed                                                                                                     | Owner                |
| ---------- | -------------------------------------------------------------------------------------------------------- | -------------------- |
| DUS-002    | How Phase 2b appends the test case and the row                                                           | spec-0013            |
| DUS-003    | Implement editing an acceptance-layer test is refused, because ATDD owns that layer                      | spec-0008, spec-0011 |
| DUS-008    | Every seed: the stage-skill hand-over, standalone invocation and `disable-model-invocation`              | spec-0001            |
| DUS-009    | The fresh install, the upgrade over an edited manifest, the unmodified upgrade and `qfai init` run twice | spec-0003            |
| DUS-009    | Copilot receiving the skills for manual use                                                              | spec-0003            |

Four seeds are rewritten rather than dropped: ROUTE-044, ROUTE-045, ROUTE-022 and ROUTE-024
each carry one `direct` exclusion no other seed covered, and ROUTE-028 expects the one live run
to be resumed rather than a choice between two (DR-0018-0012).

One seed is carried with a correction. The DUS-007 state seed ends
`running (verify) → completed`; the settled state table completes a run only from `ready`
through `finish`, so its example ends that way.

## Change Requests

| CR ID            | Upstream artifact                                                                                                                            | Mode      | Approved by | Applied at           |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ----------- | -------------------- |
| CR-20260924-0001 | `spec-0018/10_Plan.md`                                                                                                                       | re-derive | user        | 2026-09-24T11:38:52Z |
| CR-20260924-0002 | `.qfai/contracts/cli/qfai-workflow.md`; `spec-0018/05_Examples.md`, `06_Test-Cases.md`, `tdd/test-list.md`                                   | re-derive | user        | 2026-09-24T18:26:35Z |
| CR-20260925-0003 | `spec-0018/tdd/test-list.md`                                                                                                                 | re-derive | user        | 2026-09-24T18:36:12Z |
| CR-20260925-0004 | `.qfai/contracts/cli/qfai-workflow.md`; `.qfai/contracts/cli/workflow-files.schema.md`; `spec-0018/03..06`, `10_Plan.md`, `tdd/test-list.md` | re-derive | user        | 2026-09-24T19:00:08Z |
| CR-20260925-0006 | `.qfai/contracts/cli/qfai-workflow.md`; `spec-0018/05_Examples.md`, `06_Test-Cases.md`                                                       | re-derive | user        | 2026-09-25T02:36:35Z |
| CR-20260925-0008 | `.qfai/contracts/cli/qfai-workflow.md`; `spec-0018/03..06`                                                                                   | re-derive | user        | 2026-09-25T03:00:14Z |
| CR-20260925-0009 | `.qfai/contracts/cli/qfai-workflow.md`; `.qfai/contracts/cli/workflow-files.schema.md`; `spec-0018/03..06`                                   | re-derive | user        | 2026-09-25T03:23:20Z |
