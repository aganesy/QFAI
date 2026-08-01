---
name: qfai-implement
title: QFAI Implement (Unified TDD Micro-cycle)
description: "Unified implementation skill that orchestrates the full TDD micro-cycle (Red/Green/Refactor) one test at a time using test-list.md as the execution ledger."
argument-hint: "[spec-id]"
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob, Agent]
roles:
  [
    orchestrator,
    delivery-planner,
    test-design-analyst,
    frontend-engineer,
    backend-engineer,
    acceptance-test-engineer,
    implementation-reviewer,
    qa-gatekeeper,
    completion-reviewer,
    product-surface-reviewer,
  ]
routing-profile: runtime-heavy
mode: approval-gated
---

<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

## /qfai-implement - Unified TDD Micro-cycle

[DRIFT-PROTOCOL:MANDATORY]

## Preconditions

- **`.qfai/specs/<spec-id>/tdd/test-list.md` must exist and contain the eight
  required columns.** It is the ledger every step of this skill reads.
- **Producer**: `/qfai-sdd` Phase 2b seeds it. Do **not** proceed with an absent
  ledger and do **not** invent rows that no TC backs.
- **An empty ledger is a fault only when `06_Test-Cases.md` disagrees.** Never read a header-only
  table as "nothing to do" on its own. The recovery procedure and the coverage-target test that
  separates a truthfully empty ledger from an incomplete one are in
  `references/ledger-preconditions.md`; read it before exiting on an empty ledger.

## Spec Auto-Discovery Protocol

When no explicit argument is given, detect the candidate specs. Execution is constrained to one spec at a time. Auto-discovery MAY present several specs as a queue to be processed sequentially (see Volume Policy > Multi-spec queue); this protocol does NOT enable multi-spec parallel execution.

### User Selection Flow

- Single spec: announce the detected spec; ask for confirmation when scope is ambiguous.
- Multiple specs: display the candidates and require the user to choose one spec, or to confirm an ordered queue processed one spec at a time.
- Zero specs: stop and ask the user to provide the target spec explicitly.

## User Questions (AskUserQuestion Protocol)

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol`.

Skill-specific examples:

- exception handling
- scope confirmation

## CRITICAL CONSTRAINTS (Read First)

- This skill processes **one test at a time** from `test-list.md`: at most one row is in `red` or `green` at any moment, except under an item-level parallel dispatch authorized by `## Parallelization Policy` below. A T1 row parked in `refactor` waiting for its review group (see Volume Policy) does not violate this.
- Each item goes through the full TDD micro-cycle: write a **failing test** first, then make it pass, then refactor.
- The execution ledger is located at `.qfai/specs/<spec-id>/tdd/test-list.md`.
- Items are processed **serially** by default. Item-level parallel processing inside one spec is allowed only under `## Parallelization Policy` below — both its technical gate and its consent gate must hold, and user approval cannot override a technical DENY. Cross-spec parallelism is never allowed.
- Status transitions follow a strict forward-only lifecycle: `todo` -> `red` -> `green` -> `refactor` -> `done`. The single re-entry is `refactor` -> `red` after a `qa-gatekeeper` `REVISE` on the row's RED/GREEN evidence.
- The `exception` status can be reached from any active status when an anomaly is detected.
- Backward transitions are prohibited (e.g., `green` -> `red` is not allowed). The only exception is an approved Change Request reset (see Status Lifecycle).
- Completed items (`done`) are skipped on re-execution, unless an approved Change Request reset them.
- When every item is terminal (`done` or a valid `exception`) **and the mandatory Change Request
  preflight (see Required Process) reset nothing**, the per-item work is finished — but the
  **spec-level checkpoint boundary** may still be owed — an interrupted run, or a re-run of an
  already-terminal ledger, leaves it unrecorded. Before reporting "nothing to do" and exiting,
  confirm fresh spec-level checkpoint verification evidence exists for this ledger state; run the
  per-spec verification first when it is missing or stale. See
  `references/checkpoint-verification.md#spec-level-boundary-on-an-already-complete-ledger`. Only
  then report "nothing to do" for that spec, then advance to the next spec of a confirmed queue; exit when the queue is empty (Volume Policy > Advancing the queue).

## Goal

Execute the TDD micro-cycle for each pending item in `test-list.md`, transitioning each through Red -> Green -> Refactor -> Done, producing tested production code aligned with the spec.

## Visual Review Guard

- Review rendered output, screenshot evidence, or HTML output before closing any UI-affecting item.
- Read spec + contract inputs first whenever implementation touches UI or critique-driven behavior. Read order: `01_Spec.md` → `03_Acceptance-Criteria.md` → `05_Examples.md` → root `DESIGN.md` → `.qfai/contracts/design/DESIGN.md.lock.yaml` → `.qfai/contracts/design/design-system.yaml` (post-loop token mirror) → `.qfai/contracts/design/prototype-handoff.yaml` → `.qfai/contracts/ui/*.yaml` → `.qfai/evidence/prototyping/iter-NN/<screen>.{png,html}` → `.qfai/prototypes/final/index.html`.
- Do not read discussion-pack UI/UX sidecars or fallback mocks.
- Prototype HTML is analysis input, not production source. Reimplement with project-native patterns while preserving the visual identity captured in `prototype-handoff.yaml` `implementationNotes` (free-form prose).
- UI-affecting items require product-surface-reviewer prototype parity review before `done`. If code intent and rendered output diverge, treat the rendered/HTML result as the blocking review input and reconcile before DONE.

## Non-goals

- Writing spec artifacts (use `/qfai-sdd`).
- Writing acceptance tests (use `/qfai-atdd`). `Layer = E2E` / `Layer = API` ledger rows are tracked here but their tests are authored there.
- Running validation gates (use `/qfai-verify`).
- Parallel execution across multiple **specs** simultaneously. (Item-level
  parallelism _within_ one spec is a separate question, governed by
  `## Parallelization Policy` below.)

## Execution Ledger: test-list.md

The execution ledger at `.qfai/specs/<spec-id>/tdd/test-list.md` is the single record of what this
skill has done and may still do. Status values are `todo`, `red`, `green`, `refactor`, `done`,
`exception`; the lifecycle is forward-only and an `exception` requires a DR-ID.

The eight required columns, the allowed transitions and the exception rules are in
`references/execution-ledger.md`. Read it before writing to the ledger.

## Required Process

### Phase: Preflight (Change Request reset) — MANDATORY, runs first

1. Enumerate the in-scope `.qfai/decisions/CR-*.md` and apply every approved reset per `references/change-request-reset.md` **before** any other ledger judgement — including the all-`done` "nothing to do" exit, which an approved reset invalidates.

### Phase: Red (Write Failing Test)

1. Read `test-list.md`. **Rework first**: if any row is at `review-fix`, select the first such row and resume its rework (`references/round-evidence.md`) before any `todo` row — one left by an interrupted session is otherwise never picked up. Otherwise select the first row with `Status = todo`.
2. Transition status to `red` — **only for a `todo` row**. A `review-fix` row **stays at `review-fix`** for the whole rework: it runs steps 3-5 and the Green phase in place, and `review-fix -> red` is not an allowed transition.
3. Write a **failing test** from the row's obligation column, selected by `Layer`: `TC-Refs` for `Unit` / `Component` / `Integration`, `US-Refs` for `E2E`, `CON-API-Refs` for `API`. An `E2E` or `API` row's test is authored by `/qfai-atdd` (Non-goals); this skill only drives that row's status and evidence once the acceptance test exists, and stops with a handoff note if it does not.
4. Run the test and **watch it fail** — confirm the test actually fails for the expected reason. When
   the row's `Selector` holds several entries, observe each entry's failure separately; a single
   aggregate run is not a valid RED observation.
5. If the test unexpectedly passes, classify **why** before doing anything else. An obligation
   already satisfied by a sibling row is **not an anomaly** and does **not** go to `exception`;
   anything else transitions to `exception` and records the anomaly as `.qfai/decisions/DR-<id>-<slug>.md` — never in
   `07_Decisions.md` / `09_delta.md`, which are upstream SSOT this skill may not patch. Never weaken a correct
   test until it fails in order to manufacture a RED. See `references/red-not-observable.md`.
   > **RED observation is only as good as the selector's granularity.** A single test function can fail
   > only once, so if one selector entry carries an entire obligation matrix, "the expected reason" is
   > whichever assert happens to execute first — every assertion after it is unobserved on every RED
   > run, and a non-deterministic assertion placed early silently disables everything below it. A TDD
   > row whose selector accumulates unrelated boundaries therefore **invalidates its own RED
   > observation**. Split the row per `#selector-granularity-must` before continuing; do not proceed to
   > Green.

### Phase: Green (Make It Pass)

1. Write the **minimum production code** to make the failing test pass. On the _RED not observable_ path there is none to write — the `Satisfied-by` row already implements the predicate — so go straight to step 2.
2. Run the test and **watch it pass**.
3. Transition status to `green` — **only for a row that entered from `todo`**. A `review-fix` row stays at `review-fix` here too; `review-fix -> green` is not an allowed transition and must not be written to the ledger.
4. If the test still fails after implementation, investigate and fix. Do not skip to refactor.

### Phase: Refactor

1. Improve code quality (naming, structure, duplication removal) while keeping all tests green.
2. Run the **relevant test suite** to confirm nothing broke. "Relevant" means the
   smallest selector that covers the module you touched **plus its reverse
   dependency closure** — walk the production import graph backwards, not just the
   test files that import the module directly. Fall back to the package containing
   the touched module whenever that walk cannot be completed; never "every test in
   the repository" at this step. Cadence: **narrow suite per item, full suite at
   each checkpoint boundary**, because a full run per item is quadratic in ledger
   size. Full rules, the fallback triggers and the boundary list:
   `references/relevant-test-suite.md`.
3. Transition status to `refactor`.
4. Submit for completion review (`completion-reviewer`) and code quality review
   (`implementation-reviewer`). A T1 row submits with its coherent group and stays in
   `refactor` until the group closes (Volume Policy > Group formation).
5. After all routed blocking reviewers return PASS, run checkpoint verification
   **while the item is still `refactor`** (see `#checkpoint-verification`). On a
   checkpoint boundary that means the full suite. Off a boundary it is already
   satisfied by step 2's narrow suite — nothing is re-run. Transition to `done`
   only on PASS; on failure transition to `exception` with a DR-ID (legal from
   `refactor`, whereas re-opening a `done` row is not). For a T1 group every member
   transitions in the same ledger write.

### Completion

1. After processing all items, update `test-list.md` with final statuses.
2. If all items are `done`, report "All items complete".
3. If some items are `exception`, report them as **blocking output**, not as an
   informational list: for each, the `TDD-ID`, the `DR-ID`, and whether that DR
   is a user-approved accepted-risk waiver. Completion cannot be declared while
   any `exception` row lacks such a waiver.
4. If a multi-spec queue was confirmed, announce the next queued spec and restart at
   Phase: Red with its ledger; exit only after the last entry (Volume Policy >
   Advancing the queue).

## Sub-agent Delegation (MANDATORY)

Follow `.qfai/assistant/constitution/shared-skill-delegation-baseline.md`.

### Orchestrator Protocol (MUST)

- Orchestrator MUST NOT write test or production code directly; delegate every TDD phase to the routed implementation agents.
- Additional implement-specific overrides:
  - read `test-list.md`, determine the next pending item, and delegate each TDD phase;
  - update `test-list.md` status after each phase completes.

### Formal Sub-agent Roster

This skill delegates through the centralized routing policy in `.qfai/assistant/manifest/agent-routing.yml`.

- `delivery-planner`
  - reads `test-list.md`, selects the next pending item, and is the sole authority for **item selection and item scope** — whether this row's selector is a sufficient slice of its `TC-*` obligation
  - enforces Red-Green-Refactor **ordering** (which phase may run next), not the RED/GREEN observation itself
  - is the sole authority for parallel dispatch decisions
- `frontend-engineer` / `backend-engineer`
  - implement the selected item only, write the failing test first, write minimal passing code, and refactor without unrelated changes
- `qa-gatekeeper`
  - is the sole authority for validating **RED/GREEN observation evidence** — did the test fail (or pass) for the expected reason — and completion gate evidence
  - does not adjudicate item scope; a scope objection is `delivery-planner`'s call
- `implementation-reviewer`
  - reviews code quality, maintainability, backend correctness, and hidden coupling
- `completion-reviewer`
  - verifies spec alignment, drift-protocol compliance, and final DoD
- `product-surface-reviewer`
  - reviews UI-affecting implementation when the item changes surface behavior

## Volume Policy (MUST)

Scale the ceremony to the ledger: derive a **risk tier** per row, **batch** T1 gatekeeping and
reviews per coherent BR/AC group, process multiple specs as a **sequential queue**, state the
implied **cost** before starting. The tier scales how **often** a gate runs, never **whether** it
runs: `agent-routing.yml` keeps `qa-gatekeeper`, `completion-reviewer` and
`implementation-reviewer` all mandatory (only the first two are in `blocking_agents`, but item 8 of
the 11-point gate makes an `implementation-reviewer` REVISE block `done` anyway), and criticality
(authz, crypto, money, data integrity) forces T2 regardless of layer. Why this exists, the tier
table, the group-formation transitions and the queue-advance steps: `references/volume-policy.md`.

### Handoff Contracts

All agent-to-agent transitions follow these contracts:

1. `delivery-planner` selects the next item and assigns it to the appropriate implementation agent.
2. Implementation agent submits RED/GREEN execution evidence to `qa-gatekeeper`.
3. `qa-gatekeeper` confirms or rejects the RED/GREEN observation.
4. After the item reaches `refactor`, implementation agent submits it to `completion-reviewer` for spec alignment and to `implementation-reviewer` for code quality review. Review is requested from `refactor`, never from `green`, so a `REVISE` always lands on the one status with an outbound `review-fix` edge.
5. `product-surface-reviewer` is added when the item affects UI behavior or rendered output.
6. Only after every required reviewer passes may the item transition to `done`. "Required" is wider than `blocking_agents`: `implementation-reviewer` is mandatory and its `REVISE` blocks `done` independently of that list, and `product-surface-reviewer` joins for UI-affecting items. The authority for an item transition is `#item-completion-checklist-12-point-gate`, not the routing list, which governs phase progression (`references/volume-policy.md#routing-is-unchanged`).
7. For T1 rows the submitted unit in steps 2-4 is the coherent group, not the row; every required reviewer still runs, once per group. T2/T3 rows submit alone.

#### Precedence between `delivery-planner` and `qa-gatekeeper`

The two roles answer different questions and are ordered, not concurrent:

- `delivery-planner` answers _is this item's scope sufficient to be the whole of its `TC-*` obligation_.
- `qa-gatekeeper` answers _did the test fail (or pass) for the expected reason_.

Precedence rules:

- A `delivery-planner` REVISE on item scope MUST be resolved **before** RED evidence is submitted to `qa-gatekeeper` (step 2). Do not run step 2 while a scope REVISE is open.
- Once `qa-gatekeeper` PASSes the observation for a RED round, item scope MUST NOT be re-litigated for that round. A newly discovered scope gap opens a **new** `test-list.md` row rather than reopening the passed one.
- If a scope objection nonetheless arrives after step 3, it is treated as a new-row request; the existing PASS stands and is not discarded.
- Neither role may overrule the other inside the other's domain: a `qa-gatekeeper` PASS never widens item scope, and a `delivery-planner` verdict never substitutes for RED/GREEN observation evidence.

### Capability Probe (MUST)

- No additional overrides.

### Delegation Failure (Hard Stop)

- No additional overrides.
- Do not simulate roles. Classify the failure per the baseline taxonomy first: `unavailable` stops the stage with a remediation report; `saturated` uses the bounded retry branch and keeps the stage open.

## Work Orders Summary

Use the shared schema (per-row `Status (PASS/REVISE/PENDING)` column, reviewer response `Result: PASS | REVISE`).

### Reviewer Gate (MUST)

- Delegate final completion gate to an independent Reviewer.
- Reviewer response must include `Result: PASS | REVISE` (matching shared-skill-delegation-baseline.md#reviewer-response-template).
- Reviewer checks Drift Protocol compliance and alignment with `.qfai/assistant/catalog/test-layers.md`.
- Test volume floors/ratios are not gates; they are signals.
- Do not declare DONE until Reviewer returns `PASS`; otherwise apply `REVISE`.

#### Blocking vs advisory findings

Follow `shared-skill-delegation-baseline.md#finding-provenance-must`.

- Only **blocking** findings force `REVISE` and hold an item out of `done`. An **advisory**
  finding (`Traces to: none`) MUST NOT be implemented as production code or pinned as a test
  assertion; route it per `drift-protocol.md#reviewer-originated-obligations`.
- Do **not** edit `08_Open-questions.md` here — it is upstream SSOT under the Drift Protocol and
  creating spec artifacts is a non-goal of this skill; the owner phase (`/qfai-sdd`) records and
  adjudicates it.
- What each class cites, when an advisory takes the Change Request path, and why an advisory-only
  review still returns `PASS`: `references/finding-classification.md`.

## Parallelization Policy

- **Cross-spec parallelism is barred.** One spec per invocation, always. This
  is the Non-goal above and it is not approvable.
- **Item-level parallelism inside one spec** may be authorized. Two gates apply
  and **both must hold**: a technical gate adjudicated by `delivery-planner`
  (the sole authority), and explicit user approval. **User approval cannot
  override a technical DENY.**
- **Default**: Serial execution, one test at a time in `test-list.md` order.
- The allow/deny conditions are stated as **concurrent write conflicts** —
  including one item writing a module another item's test or implementation
  reads — not as the existence of shared things, and authorized parallel runs
  use the coordinated mode in which the orchestrator owns every `test-list.md`
  write. Full rules: `references/parallelization-policy.md`.
- `parallel_groups: []` in `agent-routing.yml` describes **role fan-out within
  a phase**, not item dispatch.

### Post-parallel integration verify

- After parallel slices complete and merge, run integration verify on the merged result
- If integration verify fails, flag all slices for re-examination and roll back the merge
- If integration verify passes, state transitions back to `delivery-planner` for sequential flow

## Completion Contract (Shared)

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#completion-contract-shared`.
Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#gate-failure-autorepair-protocol` for validate, doctor, and quality-gate failures.

### Item completion checklist (12-point gate)

An item in `test-list.md` may transition to `done` only when ALL of the following are satisfied. For T1 rows, items 3, 5, 7 and 8 are satisfied by the confirmation covering the row's coherent group; they are never waived.

1. Corresponding `TDD-ID` has been selected and is in progress
2. A failing test was added first (test-first) — **or**, on the _RED not observable_ path, the correct test was added first and proven falsifiable by mutation instead of by a natural failure
3. RED was observed — `qa-gatekeeper` confirmed the test failed for the expected reason (watch it fail), **or** the row carries falsifiability evidence per _RED not observable_
4. Minimal production code was written to make the test pass — **waived** on the _RED not observable_ path, where the `Satisfied-by` row already implements the predicate; do not manufacture a change to satisfy this item
5. GREEN was observed — `qa-gatekeeper` confirmed the test passes after implementation (watch it pass)
6. Refactor was performed and GREEN was re-confirmed after refactor
7. `completion-reviewer` returned PASS (spec / completion review gate)
8. `implementation-reviewer` returned PASS (code quality review gate)
9. UI-affecting items have prototype parity PASS from `product-surface-reviewer`
10. `test-list.md` Status and Evidence columns are updated with fresh evidence
11. `.qfai/evidence/implement-<spec-id>.md` is appended with both reviewer verdicts after items 7-8 returned PASS
12. Checkpoint verification passed (see `#checkpoint-verification`). The **full** suite is required here only when the item sits on a checkpoint boundary; a row between boundaries satisfies this with the narrow relevant suite from Phase: Refactor step 2, which is also what items 6, 7 and 8 are evaluated against.

Sequencing note: the phase-authored part of `.qfai/evidence/implement-<spec-id>.md` (RED / GREEN /
Refactor commands and results) is written **before** items 7-8, because it is the evidence the
reviewers audit. The verdict fields are appended **after** items 7-8. A phase-authored evidence file
whose only gap is the verdict fields is NOT a blocking finding at review time — see
`Per-item evidence contract`.

### Review artifact layout (MUST)

Gate items 7-9 are evidence-bearing: reviewer verdicts must be written to a review pack, not left in
conversation. There is exactly **one** `.qfai/review/**` layout — `review-<17-digit-timestamp>/`
holding `review_request.md`, `R01_<reviewer-id>.md` (at least one) and `summary.json`. Do not nest
`<scope>/<layer>/attempt-NN/` directories: packs written there are invisible to `npx qfai validate`.
Each review round creates a new pack. Full schema and the `REVISE` -> `status: "REVISE"` mapping:
`references/review-artifact-layout.md`.

### Spec completion conditions

The skill may declare "this spec's implementation is complete" only when:

- All TC-\* from `06_Test-Cases.md` with applicable layer are present in `test-list.md`. "Applicable layer" is decided by `.qfai/assistant/catalog/test-layers.md#layer-derivation-procedure-normative`
- Every `US-*` the spec declares has a `Layer = E2E` row whose `US-Refs` names it,
  and every declared `CON-API-*` has a `Layer = API` row whose `CON-API-Refs`
  names it. Without these rows an all-`done` ledger can sit alongside a
  `QFAI-ATDD-111` / `QFAI-ATDD-113` hard gate at 0%- Each item reached `done` or valid `exception` (with DR-ID)
- 0 blocking reviewer issues remain
- Checkpoint verification passed at the spec-level boundary (see `#checkpoint-verification`)
- No unresolved Change Request or waiver dependency exists. The gate covers only the
  `.qfai/decisions/CR-*.md` **in scope for this spec**; a CR confined to another spec never blocks
  this one. An in-scope CR is **resolved** only when every condition in
  `references/change-request-reset.md#when-an-in-scope-cr-counts-as-resolved` holds — `Status` is
  `approved`, `rejected` or `superseded` (never `open`), the approval fields are populated,
  `Resolution` records what was done, and when `Status` is `approved`, `Applied at` is populated —
  approval alone does not release the gate. A CR failing any one of them, a half-filled record
  included, is **unresolved** and blocks completion.

### Completion prohibition conditions

Completion MUST NOT be declared when any of the following are true:

- No RED fresh evidence exists for the item, and no falsifiability evidence replaces it
- No GREEN fresh evidence exists for the item
- Either reviewer (`completion-reviewer` or `implementation-reviewer`) has not been run or returned REVISE
- `.qfai/evidence/implement-<spec-id>.md` does not exist, or does not record both reviewer verdicts for the item (this is the single blocking statement about the evidence file; its absence of _verdicts_ is never blocking before items 7-8)
- Items with `todo`, `red`, `green`, `refactor`, or `review-fix` status still exist (for spec-level completion)
- Items with `exception` status still exist, **unless** the row's `DR-ID` names
  a Decision Record explicitly recorded as a **user-approved accepted-risk
  waiver** (a `TDDLIST-001` entry in `.qfai/waivers.yml`). An `exception` whose
  DR only describes the anomaly is a parked defect, not a completed item.
- Parallel slices were used but integration verify has not been run post-merge
- A checkpoint boundary was reached (see `#checkpoint-verification`) but the verification command set was not executed, or any command in it exited non-zero — the last row a run completes is always a boundary, not the physical last row of the file, which is often already `done` and skipped, so every spec runs the full suite at least once
- `it.todo(...)` / `test.todo(...)` / `describe.todo(...)` stubs remain in any file covered by `validation.traceability.testFileGlobs` (`QFAI-TEST-001`). Implement the body or delete the stub — an opt-out via `validation.testStrategy.forbidTestTodoStubs: false` is permitted only with an accompanying waiver DR-ID.

## Evidence (MANDATORY)

Create/update: `.qfai/evidence/implement-<spec-id>.md`

Required sections:

- Objective
- Items processed (TDD-ID, TC-Refs, final status)
- Test results summary
- Exception items (if any) with DR-IDs
- Commands executed

### Per-item evidence contract (fresh evidence required)

Each TDD item MUST have fresh evidence containing at minimum the fields below. The contract has two
parts with different write points; the fields are the same, the sequencing is not.

**Phase-authored (written before the reviewer gate, items 7-8):**

- `TDD-ID` — the item identifier
- `TC-ref` — reference to the test case(s). On a `Layer = E2E` row read `US-ref` (the row's `US-Refs`) instead, and on a `Layer = API` row read `CON-API-ref` (the row's `CON-API-Refs`): exactly one obligation reference is required, the one the row's `Layer` selects
- `RED command` — the exact command executed to observe failure
- `RED result` — the failure output (result completeness is best-effort; truncated output is acceptable)
- **Exclusive alternative to the RED pair**: a row on the _RED not observable_ path carries
  `Satisfied-by`, `Falsifiability command` and `Falsifiability result` in place of the two
  RED fields above. Exactly one of the two forms must be present — never both, never
  neither (`references/red-not-observable.md`).
- `GREEN command` — the exact command executed to observe success
- `GREEN result` — the success output
- Each RED/GREEN cycle is one **round block** and every field above carries a `Round N:` prefix; numbering, the two rework paths and the full field list are in `references/round-evidence.md`
- `Refactor verify command` — the exact command re-executed after refactor. Written once for the item as a whole, so it takes no `Round N:` prefix
- `Refactor verify result` — the output confirming GREEN is maintained (likewise once per item)

These exist _for_ the reviewers: they are the evidence items 7-8 audit. They MUST be present when a
review is requested.

**Gate-completed (appended after items 7-8 return PASS):**

- `Spec review` — completion-reviewer result (PASS or REVISE)
- `Code quality review` — implementation-reviewer result (PASS or REVISE)
- `Prototype parity` — product-surface-reviewer result for UI-affecting items (PASS or REVISE)
- `Checkpoint verification command` — the exact command set executed at the checkpoint boundary
- `Checkpoint verification result` — the outcome of that command set (PASS only when every command exits 0)

These record verdicts that do not exist until the reviews have run. A reviewer MUST NOT treat their
absence as a blocking gap during review — an evidence file complete in its phase-authored part and
missing only the verdict fields is the expected state at review time. It becomes blocking only at
the completion gate (see `Completion prohibition conditions`).

### Evidence hard rules

- Status-only evidence (e.g., "Status: PASS" with no command) is invalid and MUST be rejected
- Both command and result are required; "should pass" or "looks good" alone is not acceptable
- Stale evidence from a previous run MUST NOT be reused to claim completion for a new cycle
- Empty evidence entries are rejected: minimum evidence per TDD item must be met

## Checkpoint Verification

"Checkpoint verification" is the whole-repository regression check run at a checkpoint boundary. It
is what item 12 of the 12-point gate refers to and the only thing it refers to. A boundary is
reached **per item** (after all routed blocking reviewers return PASS, before `refactor` -> `done`)
and **per spec** (after the last ledger row is terminal). There is no "every N items" rule.

It PASSES only when **every** command in the verification command set exits 0; a partial run is not
a pass. The boundary definition, command set, pass criteria and evidence fields are in
`references/checkpoint-verification.md`.

## FINAL CHECKLIST (Check Last)

Work through `references/final-checklist.md` immediately before the completion message. Every box
must be ticked; a box that cannot be ticked is a reason not to declare completion.

## Completion Checklist (MUST)

- [ ] This skill's Definition of Done is satisfied.
- [ ] Required artifacts were produced or updated (if applicable).
- [ ] Open questions were logged to the proper OQ file (if applicable).
- [ ] The completion message was presented to the user.
- [ ] Next actions were enumerated for all available options.

## Completion Message & Next Actions (MUST)

When this skill is complete, provide a final user-facing completion message and enumerate all actionable next steps.

- Verify gates: `/qfai-verify`.
  Action: run `npx qfai validate --profile tdd --fail-on error` for this skill, then `/qfai-verify` for full-scan approval.
- Spec updates needed: `/qfai-sdd`.
  Action: update spec artifacts if implementation revealed scope changes.
- Acceptance tests: `/qfai-atdd`.
  Action: ensure acceptance test coverage aligns with implementation.

## Default Autopilot Policy

The skill collapses avoidable per-session prompts to 0-1 by classifying every decision into one of three named buckets:

- auto-decide:
  - output formatting
  - ID / sequence numbering
  - append-vs-create on subject overlap
  - equivalent-option pick
- ask-user:
  - CREATE / DELETE / SPLIT / MERGE / SUPERSEDE / UPDATE:REMOVE triage operations (each with a prompt template that names the target and rationale)
  - destructive operations (rm / overwrite / force-push)
  - version-pin changes (`package.json#version`, branch pin)
  - scope expansions outside the active envelope
- hard-required:
  - `companyName`
  - brand intent
  - `primarySpecId` (when absent from inputs)

A skill MAY narrow the auto-decide bucket (drop entries) but MUST NOT widen it. Widening triggers a Reviewer-Gate finding.

project_memory:

- One TDD item at a time from test-list.md by default; item-level parallelism inside one spec only when the Parallelization Policy technical gate and user consent both pass; status lifecycle is forward-only (todo → red → green → refactor → done) with one recorded re-entry, refactor → red on a qa-gatekeeper REVISE of the row's RED/GREEN evidence; exception requires DR-ID.
- Fresh RED + GREEN command/result evidence is mandatory per item, except on the _RED not observable_ path where `Satisfied-by` + falsifiability command/result replace the RED pair (exclusive alternative, never both); status-only evidence (e.g. "Status: PASS") is rejected.
- UI-affecting items require product-surface-reviewer prototype-parity PASS before the item can transition to done.
