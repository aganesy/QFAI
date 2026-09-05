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
routing-profile: implementation-heavy
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

- **`.qfai/specs/<spec-id>/tdd/test-list.md` must exist and contain the eight required columns.** It is the ledger every step of this skill reads.
- **Producer**: `/qfai-sdd` Phase 2b seeds it. Do **not** proceed with an absent ledger and do **not** invent rows that no TC backs.
- **An empty ledger is a fault only when `06_Test-Cases.md` disagrees.** Never read a header-only table as "nothing to do" on its own. The recovery procedure and the coverage-target test that separates a truthfully empty ledger from an incomplete one are in `references/ledger-preconditions.md`; read it before exiting on an empty ledger.

## Spec Auto-Discovery Protocol

When no explicit argument is given, detect the candidate specs. Execution is constrained to one spec at a time. Auto-discovery MAY present several specs as a queue to be processed sequentially (see `references/volume-policy.md#multi-spec-queue`); this protocol does NOT enable multi-spec parallel execution.

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
- Write a `.qfai/steering/<id>.md` work-log entry when this stage hits a condition in the `kind` trigger table of `.qfai/assistant/catalog/worklog-entry.schema.md` — `blocker`, `handoff`, `consultation-needed` and `decision` are the ones it reaches most. `npx qfai validate` polices that surface but nothing else asks for an entry, so an unwritten one is simply lost.
- Items are processed **serially** by default. Item-level parallel processing inside one spec is allowed only under `## Parallelization Policy` below — both its technical gate and its consent gate must hold, and user approval cannot override a technical DENY. Cross-spec parallelism is never allowed.
- Status transitions follow a forward-only lifecycle: `todo` -> `red` -> `green` -> `refactor` -> `done`. That spine is not the whole table. `references/execution-ledger.md#allowed-transitions` is the complete and only list; it additionally carries the QA re-entry (`refactor` -> `red`), the resumption (`blocked` -> `todo`), the anomaly exit (`exception` -> `todo`), the reviewer loop (`refactor` -> `review-fix` -> `refactor`) and the approved upstream reset. **Never infer that an edge does not exist from its absence in this summary** — read the reference before writing a `Status` cell.
- The `exception` status can be reached from any active status when an anomaly is detected, and leaves via `exception` -> `todo` once the anomaly is resolved. That exit needs no Change Request **when the row's approved obligation is unchanged** — nothing upstream moved, so the row simply restarts its cycle, keeping the anomaly's DR-ID, and it is what `TDDLIST_EXCEPTION_PARKED` asks for. **When the investigation finds the obligation itself was wrong**, this exit does not apply: that is an upstream change, and the row re-enters through the approved-Change-Request reset under the Drift Protocol (`references/change-request-reset.md`). Reading this line alone let a row restart on a changed obligation with no approval anywhere.
- Backward transitions are prohibited (e.g., `green` -> `red` is not allowed). The only exception is an approved Change Request reset (see Status Lifecycle). **"Backward" is the reference's term of art**, not "moves to an earlier status": `blocked` -> `todo`, `exception` -> `todo` and the `qa-gatekeeper` rework edge all return a row to an earlier phase and none of them is backward. `references/execution-ledger.md#allowed-transitions` is the complete list; do not infer an edge's absence from this line.
- Completed items (`done`) are skipped on re-execution, unless an approved Change Request reset them.
- When every item is terminal (`done` or a valid `exception`) **and the mandatory Change Request
  preflight (see Required Process) reset nothing**, the per-item work is finished — but the
  **spec-level checkpoint boundary** may still be owed — an interrupted run, or a re-run of an
  already-terminal ledger, leaves it unrecorded. Before reporting "nothing to do" and exiting, confirm fresh spec-level checkpoint verification evidence exists for this ledger state; run the
  per-spec verification first when it is missing or stale (`references/checkpoint-verification.md#spec-level-boundary-on-an-already-complete-ledger`).
  Only then report "nothing to do" for that spec, then advance to the next spec of a confirmed queue; exit when the queue is empty (`references/volume-policy.md#advancing-the-queue`).

## Goal

Execute the TDD micro-cycle for each pending item in `test-list.md`, transitioning each through Red -> Green -> Refactor -> Done, producing tested production code aligned with the spec.

## Visual Review Guard

- Review rendered output, screenshot evidence, or HTML output before closing any UI-affecting item — on a cli-only target the reviewable rendering is the captured command output (stdout/stderr transcript, exit code) instead.
- Read spec + contract inputs first whenever implementation touches UI or critique-driven behavior. Read order: `01_Spec.md` → `03_Acceptance-Criteria.md` → `05_Examples.md` → root `DESIGN.md` → `.qfai/contracts/design/DESIGN.md.lock.yaml` → `.qfai/contracts/design/design-system.yaml` (post-loop token mirror) → `.qfai/contracts/design/prototype-handoff.yaml` → `.qfai/contracts/ui/*.yaml` → `.qfai/evidence/prototyping/iter-NN/<screen>.{png,html}` → `.qfai/prototypes/final/index.html`. **cli-only target** — decided per implemented spec, never per session: read the classification from the `01_Context.md` of the discussion pack **this spec's own provenance names** (`Source: discussion-<ts>#...` in its `02_User-stories.md` / `03_Acceptance-Criteria.md`), and the target is cli-only when that block says `primary_surface: cli` with no visual `secondary_surfaces`. Consult `.qfai/state.json#discussion.currentId` only when the spec carries no pack provenance at all, and treat the target as visual when neither resolves — `/qfai-implement` takes any one spec from an argument or the queue, so a `discussion.currentId` pointer left on someone else's CLI pack must not strip a web spec of its `DESIGN.md` / lock / prototype inputs (nor the inverse demand them of an older CLI spec). On a cli-only target none of the four design-contract entries nor either prototype-evidence entry exists — `/qfai-discussion` authors no root `DESIGN.md`, `/qfai-sdd` Phase 0 skips the freeze and `/qfai-prototyping` rejects `cli` — so the read order is `01_Spec.md` → `03_Acceptance-Criteria.md` → `05_Examples.md` → `.qfai/contracts/ui/*.yaml` and nothing is missing.
- Do not read discussion-pack UI/UX sidecars or fallback mocks.
- Prototype HTML is analysis input, not production source. Reimplement with project-native patterns while preserving the visual identity captured in `prototype-handoff.yaml` `implementationNotes` (free-form prose).
- UI-affecting items require a `product-surface-reviewer` review before `done`. On a visual-prototyping target that review is **prototype parity**. On a cli-only target there is no prototype to compare against (`/qfai-prototyping` rejects `cli`), so parity is replaced — not waived — by a surface review of the captured command output (stdout/stderr transcript + exit code) against `.qfai/contracts/ui/*.yaml` and `03_Acceptance-Criteria.md`; never block a cli item on prototype artifacts that cannot exist. If code intent and the reviewed output diverge, treat the rendered/HTML/transcript result as the blocking review input and reconcile before DONE.

## Non-goals

- Writing spec artifacts other than this skill's own `tdd/test-list.md` ledger (use `/qfai-sdd`). The ledger's `Status` / `DR-ID` / `Evidence` cells are carved out unconditionally by the Drift Protocol, and its `Test file` / `Selector` cells conditionally — a placeholder may be filled, and a selector that does not resolve against the row's named test file may be repaired, but neither may be rewritten once its condition has ceased to hold, i.e. a `Test file` that names a path and a `Selector` that resolves (`constitution/drift-protocol.md#allowed-exceptions-minimal-whitelist`, which states both conditions); its rows, and the columns carrying their obligation identity, are still upstream. A row whose own test asserts over the CONTENT of an artifact this skill may not write is not implementable here at all, and the three moves available to it all lose: `references/upstream-artifact-ordering.md`.
- Writing acceptance tests (use `/qfai-atdd`). `Layer = E2E` / `Layer = API` ledger rows are tracked here but their tests are authored there, and the RED provenance those rows carry is defined in `../qfai-atdd/references/red-provenance.md` — this skill writes their `Status` / `DR-ID` / `Evidence` from the evidence that stage produced.
- Running validation gates (use `/qfai-verify`).
- Parallel execution across multiple **specs** simultaneously. (Item-level parallelism _within_ one spec is a separate question, governed by `## Parallelization Policy` below.)

## Execution Ledger: test-list.md

The execution ledger at `.qfai/specs/<spec-id>/tdd/test-list.md` is the single record of what this skill has done and may still do. Status values are `todo`, `blocked`, `red`, `green`, `refactor`, `review-fix`, `done`, `exception`;
the lifecycle is forward-only along `todo` -> `red` -> `green` -> `refactor` -> `done` plus the re-entry edges the reference enumerates, an `exception` requires a DR-ID, and a `blocked` row requires a `Blocked-By` and is never selected.

The eight required columns, the allowed transitions and the exception rules are in `references/execution-ledger.md`. Read it before writing to the ledger.

## Required Process

### Phase: Stage 0 + Preflight — MANDATORY, runs first

1. Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#stage-0---steering-completion-refresh-mandatory`, `.qfai/assistant/constitution/shared-skill-operating-baseline.md#format-ssot-mandatory` and `.qfai/assistant/constitution/shared-skill-operating-baseline.md#delta-rejected-guard-mandatory`, then read `catalog/tech.md` + `catalog/structure.md` and take every Test / Lint / Typecheck / Build command below from `tech.md#standard-commands-copy-paste` rather than inventing one. Refresh both files when the repository contradicts them; do not continue on stale steering. This stage was bound by neither inheritance route while being the one that creates production source trees.
2. Enumerate the in-scope `.qfai/decisions/CR-*.md` and apply every approved reset per `references/change-request-reset.md` **before** any other ledger judgement — including the all-`done` "nothing to do" exit, which an approved reset invalidates.

### Phase: Red (Write Failing Test)

1. Read `test-list.md`. **A named row wins**: when the invocation names one or more `TDD-ID`s — `/qfai-atdd` stage gate P1c hands over by id — process exactly those, in the order given, and select nothing else. Row order in the ledger is not a priority: a branch-2 row sitting above the named one would otherwise be picked up first, and its checkpoint runs the full suite against a tree that still holds the named row's deliberate RED, so it fails and lands at `refactor`, which this step does not re-select. Otherwise, **rework first**: if any row is at `review-fix`, select the first such row and resume its rework (`references/round-evidence.md`) before any `todo` row — one left by an interrupted session is otherwise never picked up. Otherwise select the first row with `Status = todo`, skipping any `blocked` row — it cannot be started, and re-issuing it is what made the determination get re-derived every pass (`references/execution-ledger.md#blocked-rows`). **A mutation-only request wins over even that, and moves no row.** `/qfai-atdd` sends one when a stage that owns no ledger row has edited a shared test artifact a completed row reads (`../qfai-atdd/references/shared-test-artifacts.md`): it names, per affected row, that row's spec and `TDD-ID`, the mutation its `Oracle proof` plan or `Satisfied-by` names, and the selector to run under the changed artifact. Apply the mutation, run the selector, capture the failure, **revert in the same step**, re-run for the restored GREEN, and return both. **Write nothing to `test-list.md` and nothing to that row's evidence**: the row stays `done`, no round block opens, and the returned pair is recorded by the requesting stage in its own `## Shared-artifact re-verify` block. This is the only entry that takes a row already at a terminal status, and it takes it read-only — every path below selects `todo`, a named row or `review-fix`, none of which a `done` row can be, so without this the request had no receiver and the requesting stage could never complete.
2. Transition status to `red` — **only for a `todo` row**, and **not yet for an `E2E` / `API` / `Integration` row**: that row's transition is decided by step 3b, after its handover has been verified, so a missing or malformed one leaves it at `todo` instead of parking a `red` row with no RED behind it. A `review-fix` row **stays at `review-fix`** for the whole rework: it runs steps 3-5 and the Green phase in place, and `review-fix -> red` is not an allowed transition.
3. Write a **failing test** from the row's obligation column, selected by `Layer`: `TC-Refs` for `Unit` / `Component` / `Integration`, `US-Refs` for `E2E`, `CON-API-Refs` for `API`. An `E2E` or `API` row's test is authored by `/qfai-atdd` (Non-goals); this skill only drives that row's status and evidence once the acceptance test exists, and stops with a handoff note if it does not.
   3a. Create the **minimal seam** the test needs to reach its assertion, with no behaviour behind it. This is not Phase Green's production code: it implements no predicate. Without it, the first failure of any new-symbol row is a resolution error by construction. What the seam is depends on how the test reaches the surface: a **module, export or signature** for a test that imports one, and for an HTTP test a **registered route** — the 404 an unregistered route returns is a resolution error by the same rule, and `/qfai-atdd` hands such a row here for exactly this reason (`../qfai-atdd/references/red-provenance.md#the-three-branches-must`). **Register it with a status the row does not contract for.** When the row's predicate _is_ the status — `201` on create, `204` on delete, `403` on a refusal — a handler that already returns it passes on the first run and the RED is gone; a sentinel the contract does not name (`501`, or `200` where the row owns `201`) resolves the route and still fails the assertion. **A seam-only invocation stops here.** When `/qfai-atdd` calls this skill for the seam alone — the row has no RED yet, which is why it needs one — build the seam, leave the row at `todo`, and return. Do **not** continue to step 3b, and do **not** route `qa-gatekeeper`: there is no assertion failure for it to judge, so a blocking verdict at this point can only be REVISE, and step 3b would read the row's entry as malformed for lacking the RED this trip exists to make possible. The blocking gate applies to the handoff that follows, once that stage has taken the RED against the seam.
   3b. **A `todo` `E2E` / `API` / `Integration` row consumes the provenance `/qfai-atdd` recorded; steps 4 and 5 do not apply to it.** A `review-fix` row does **not** come here — a reviewer's REVISE needs a fresh round, not the original handoff replayed, and its status is neither `todo` nor transitionable to one. Run it through `references/round-evidence.md`, **and hand the acceptance test back to `/qfai-atdd` first when the REVISE asks for a change to it**: this skill does not author those tests (Non-goals) and its `red` phase has no `acceptance-test-engineer`, so a rework that needs the test edited has nobody here to do it — the row would sit at `review-fix` or a production agent would edit a test it does not own. That stage returns the corrected test and its new RED; the production fix and the re-review happen here. **A handback naming a new `Selector` or `Test file` is written to both the ledger and the entry's identity copy before the re-review** — updating one alone leaves gate item 10 comparing a changed value with an unchanged one, which it fails by construction. **A returned proof marked `stale — test replaced` is re-taken here too**, before the re-review: the corrected test passed on the first run, so what is owed is not a RED but the evidence that it still fails when its predicate is broken. **Which field names that predicate depends on the row's branch** — `Satisfied-by` on a `falsifiability` row, the `Oracle proof` plan on an `observed-red` one, which has no `Satisfied-by` at all. Reading `Satisfied-by` unconditionally left a branch-1 row with nothing to re-run and stranded it at `review-fix`. Re-run that mutation under the corrected selector, **write the re-taken proof and, in `Replacement proof revision`, the tree it ran against — the field arrives marked `test-only replacement` and empty, because that stage owns no mutation and could not have taken it. Leave `RED revision` alone**: on an `observed-red` row it addresses the natural RED the round block still describes, and overwriting it hashed two trees as one observation — route `qa-gatekeeper` on it as step 3c does, then revert and re-run for the GREEN. That stage marks the proof rather than re-taking it because the mutation is production work it owns no agent for. For a `todo` row, verify its entry in `.qfai/evidence/atdd-<spec-id>.md` **first**, then write the status the verified branch calls for, per `../qfai-atdd/references/red-provenance.md#handover-to-qfai-implement`: `observed-red` and `falsifiability` write `todo -> red` and continue at Phase Green; `exception` writes `todo -> exception` with the recorded `DR-*` **and only when the entry carries the `qa-gatekeeper` PASS P1d took on that `DR-*`** — this path skips steps 4 and 5, so nothing here judges the claim and a row with no verdict would reach a terminal status unexamined; an entry without it goes back with a handoff note. It **does not** enter Phase Green; a `falsifiability` entry whose branch is named but whose evidence is not complete goes to **step 3c** — and **complete means the trio _and_ the recorded `qa-gatekeeper` PASS on it**, not the trio alone. Step 3c writes the trio and only then routes the gatekeeper, so an interrupted run, or one that ended at REVISE, leaves a trio with no verdict; reading the trio alone as verified sent the row to `todo -> red` on mutation evidence no gate had judged, and step 3c is the only place that submits it. A trio with no PASS re-enters step 3c at the point the verdict is taken: re-apply the mutation, re-run the selector, **write the re-taken trio, `RED test hash`, manifest and `Falsifiability revision` over the recorded ones**, and only then route the gatekeeper. The same "entry complete before the gate sees it" rule as the first pass, and for the same reason: after a REVISE the mutation or the test has usually changed, so a gatekeeper reading the current tree while hashing the previous entry either repeats the REVISE or records a PASS that describes neither run; an entry that is absent, names no branch, or is malformed in any other way leaves the row at `todo` and stops with a handoff note. Steps 4 and 5 are skipped because re-running the test here passes — an `observed-red` row's surface is built in Phase Green, a `falsifiability` row's already exists — and treating that as step 5's unexpected pass is what sent correctly evidenced rows to `exception`.
   3c. **A `falsifiability` entry with no evidence yet: take it here.** The mutation rewrites a production predicate, which `/qfai-atdd` owns no agent for — so it names the predicate to break and hands the row over rather than running it (`../qfai-atdd/references/red-provenance.md#the-three-branches-must`). Delegate it in this phase, which is why the production owners are routed here. **In this order**, because the gatekeeper's ownership check reads the mutated tree: apply the mutation, run **each entry of** this row's `Selector` separately and capture each failure — a `Selector` may legally hold a comma-separated list or a glob, and one aggregate run shows the first entry failing while the rest are unobserved, which is the same rule step 4 applies to a RED and which `qa-gatekeeper` enforces on both. Record the trio per entry, or split the row before the handoff, and **write the entry complete before the gate sees it** — `Round 1: Satisfied-by`, `Round 1: Falsifiability command`, `Round 1: Falsifiability result` — the trio takes the RED pair's place inside the round block, so it takes the prefix too (`references/round-evidence.md`) — and the `RED failure mode: falsifiability`, and — as `Round N:` fields of the round this mutation belongs to, never row-level, because a blocking REVISE opens a round on its own tree and one field cannot hold two of them (`references/round-evidence.md` decides this and nothing else restates it) — `RED test hash` and its manifest, and `Falsifiability revision` — **the mutated tree's address, taken here because the revert destroys it** — in that row's entry in `.qfai/evidence/atdd-<spec-id>.md`. **Then route `qa-gatekeeper` on that mutation run.** The gatekeeper hashes the phase-authored entry for its `Audited evidence hash`, and every one of those fields is inside that subject, so writing any of them afterwards made a correct PASS stale the moment it was recorded. **Revert and re-run for the GREEN once the gatekeeper has answered — whatever it answered.** `Round 1: Revision` is written from **that** run, not from the mutated tree: it is the address items 5, 7 and 8 share, the revert moves it by construction on an uncommitted tree, and recording it before made every correct branch-2 row stale on arrival. The mutated tree has its own field. A REVISE left the deliberately broken predicate in the working tree, and step 3b readmits such a row and re-applies the mutation, so the next run either broke an already-broken tree or carried the damage into whatever came next. The revert is cleanup, not a reward for PASS. Reverting first left it nothing to inspect but the restored tree, so it could not confirm that what was broken is the predicate `Satisfied-by` names — the one check that distinguishes a falsifiability trio from a test that would pass against anything. Record the `RED test hash` and its manifest here too, over the same inputs a handed-over RED hashes: this run is where this skill first executes the row's selector, and the completion gate recomputes the hash for **every** handed-over `E2E` / `API` / `Integration` row. **And `Falsifiability revision`, taken before the revert** by the procedure in `references/evidence-revision.md` — it addresses the mutated tree, which stops existing at the revert, so this is the only moment it can be taken and gate item 10 requires it on every `falsifiability` row. Steps 4 and 5 are skipped for this row and step 4 is the only place that submits a RED, so without this the branch advanced the ledger with no observation verdict at all — and the gatekeeper is conditional in this phase, so nothing selected it by default. On PASS write `todo -> red` from the mutation run; and continue at Phase Green with the restored run as its GREEN — Phase Green step 2a does **not** repeat it, because this mutation _is_ the row's `Oracle proof`. Deferring the row instead is what left nobody able to perform the first mutation: this step waits for evidence 3b would only accept after it existed. **Reached from step 3b, never before it.** Listed ahead of 3a/3b, an ordered read ran the production mutation and wrote `todo -> red` before 3b had checked the entry's branch, its selector and its missing fields — advancing the ledger on provenance nobody had verified.
4. Run the test and **watch it fail**. Admissible only when an assertion — or an expected-exception check — inside this row's `Selector` raised the failure and its message names the predicate the row owns; a collection / import / syntax / fixture error, or an unasserted throw, is a **missing seam**, not a RED (`references/red-admissibility.md`). Observe each `Selector` entry's failure separately; one aggregate run is not a valid RED observation. Submit that run to `qa-gatekeeper` and obtain confirmation **before** any production code exists — routing phase `red`.
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
   > observation**. Split the row per `references/execution-ledger.md#selector-granularity-must` (rules
   > and examples: `references/selector-granularity.md`) before continuing; do not proceed to Green.

### Phase: Green (Make It Pass)

1. Write the **minimum production code** to make the failing test pass. On the _RED not observable_ path there is none to write — the `Satisfied-by` row already implements the predicate — so go straight to step 2.
2. Run the test and **watch it pass**. Do not submit it yet: `qa-gatekeeper` requires an `Oracle proof` on every item, so a GREEN submitted before step 2a has produced one is a REVISE by construction — and the `build` phase is blocking, so that REVISE is what blocks the step meant to produce the proof. Take the proof first (2a), then submit the pass and the proof together for the GREEN confirmation — routing phase `build`, which is blocking for the same reason `red` is.
   2a. **Run the `Oracle proof` and record it here, before the submission in step 2.** Apply the named production mutation, run this row's selector, capture the failing output verbatim, then **revert the mutation immediately** and re-run to confirm the tree is green again — that restored run is the GREEN the gatekeeper is given. Completion item 5 and `references/oracle-strength.md` require the command and its real failing output, not an intention — an `observed-red` row handed over by `/qfai-atdd` arrives with the mutation _planned_ and nothing run, because there was no production code to mutate until this phase built it. A row on the _RED not observable_ path already has one: its falsifiability run **is** the Oracle proof, and must not be repeated. Record `equivalent-mutant` instead only when no mutation can distinguish the behaviour, with the weaker contract clause named.
3. Transition status to `green` — **only for a row that entered from `todo`**. A `review-fix` row stays at `review-fix` here too; `review-fix -> green` is not an allowed transition and must not be written to the ledger.
4. If the test still fails after implementation, investigate and fix. Do not skip to refactor.

### Phase: Refactor

1. Improve code quality (naming, structure, duplication removal) while keeping all tests green. **Before editing a production file**, check whether another spec's `tdd/test-list.md` names it in `Test file`; if so the edit is cross-spec — record it in this item's evidence and re-run `completion-reviewer` against that spec's obligations too (`references/cross-spec-ownership.md`).
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
   `refactor` until the group closes (`references/volume-policy.md#group-formation-states-and-transitions`).
5. After all routed blocking reviewers return PASS, run checkpoint verification
   **while the item is still `refactor`** (see `#checkpoint-verification`). On a
   checkpoint boundary that means the full suite. Off a boundary it is already
   satisfied by step 2's narrow suite — nothing is re-run. Transition to `done`
   only on PASS; on failure transition to `exception` with a DR-ID (legal from
   `refactor`, whereas re-opening a `done` row is not). For a T1 group every member
   transitions in the same ledger write.

### Completion

1. After processing all items, update `test-list.md` with final Status, DR-ID and Evidence values — the three cells the Drift Protocol carve-out covers unconditionally, and the ones gate item 10 reads. `Test file` and `Selector` are covered too, but only while their stated condition still holds, so fill a placeholder or repair an unresolvable selector when you reach it rather than at the end.
2. If all items are `done`, report "All items complete".
3. If some items are `exception`, report them as **blocking output**, not as an
   informational list: for each, the `TDD-ID`, the `DR-ID`, and whether that DR
   is a user-approved accepted-risk waiver. Completion cannot be declared while
   any `exception` row lacks such a waiver.
4. If a multi-spec queue was confirmed, announce the next queued spec and restart at
   Phase: Red with its ledger; exit only after the last entry
   (`references/volume-policy.md#advancing-the-queue`).

## Sub-agent Delegation (MANDATORY)

Follow `.qfai/assistant/constitution/shared-skill-delegation-baseline.md`.

### Orchestrator Protocol (MUST)

- Orchestrator MUST NOT write test or production code directly; delegate every TDD phase to the routed implementation agents.
- Additional implement-specific overrides:
  - read `test-list.md`, determine the next pending item, and delegate each TDD phase;
  - update `test-list.md` **Status and Evidence** after each phase completes, recording the delegated agent's one-word RED/GREEN outcome plus the anchor into the evidence file the row's `Layer` owns — `.qfai/evidence/implement-<spec-id>.md`, or `.qfai/evidence/atdd-<spec-id>.md` for an `E2E` / `API` row, whose RED was produced by the stage that authored its test (gate item 10) — and that agent's command+result verbatim in the evidence file itself — a GFM cell cannot hold either a newline or a bare `|` (`references/execution-ledger.md#evidence-cell-contract`). Gate item 10 requires both columns, the protocol permits both, and the orchestrator is the only role permitted to write this file (`references/parallelization-policy.md#ledger-ownership`).

### Formal Sub-agent Roster

This skill delegates through the centralized routing policy in `.qfai/assistant/manifest/agent-routing.yml`. Its `red`, `build`, `test` and `review` phases carry `iteration: per-ledger-item` — they run once **per row**, not once per invocation, which is what puts `qa-gatekeeper` in a phase where a RED state still exists to observe.

- `delivery-planner`
  - reads `test-list.md`, selects the next pending item, and is the sole authority for **item selection and item scope** — whether this row's selector is a sufficient slice of the obligation its `Layer` names — `TC-Refs` for `Unit` / `Component` / `Integration`, `US-Refs` for `E2E`, `CON-API-Refs` for `API`
  - enforces Red-Green-Refactor **ordering** (which phase may run next), not the RED/GREEN observation itself
  - is the sole authority for parallel dispatch decisions
- `frontend-engineer` / `backend-engineer`
  - implement the selected item only, write the failing test first, write minimal passing code, and refactor without unrelated changes
- `qa-gatekeeper`
  - is the sole authority for validating **RED/GREEN observation evidence** — did the test fail (or pass) for the expected reason — and completion gate evidence. Routed per row in `red` (before production code) and `build` (after), not only in `review`
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
`implementation-reviewer` all mandatory and all blocking, and criticality
(authz, crypto, money, data integrity) forces T2 regardless of layer. Why this exists, the tier
table, the group-formation transitions and the queue-advance steps: `references/volume-policy.md`.

### Handoff Contracts

All agent-to-agent transitions follow these contracts:

1. `delivery-planner` selects the next item and assigns it to the appropriate implementation agent.
2. Implementation agent submits the RED run to `qa-gatekeeper` **while no production code exists** (routing phase `red`), then the GREEN run after it (routing phase `build`). One combined post-hoc submission is not a substitute: RED is unrecoverable once Green begins, so it leaves nothing but the implementer's own account of a destroyed state — the self-attestation this gate exists to prevent. It **returns it to the orchestrator in the per-item evidence contract's form** so it can be written to the ledger. The implementation agent never writes `test-list.md` itself.
3. `qa-gatekeeper` confirms or rejects each observation. A RED rejection stops the row before Green; it does not wait for the `review` phase.
4. After the item reaches `refactor`, implementation agent submits it to `completion-reviewer` for spec alignment and to `implementation-reviewer` for code quality review. Review is requested from `refactor`, never from `green`, so a `REVISE` always lands on the one status with an outbound `review-fix` edge.
5. `product-surface-reviewer` is added when the item affects UI behavior or rendered output.
6. Only after every required reviewer passes may the item transition to `done`. Every reviewer in `blocking_agents` blocks `done` — for `qfai-implement` that is `implementation-reviewer`, `qa-gatekeeper` and `completion-reviewer` — and `product-surface-reviewer` joins for UI-affecting items. The authority for an item transition is `#item-completion-checklist-12-point-gate`, not the routing list, which governs phase progression (`references/volume-policy.md#routing-is-unchanged`).
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

Use the shared schema (per-row `Status (PASS/REVISE/PENDING)` column, reviewer response `Reviewer role:` + `Reviewed artifact:` + `Result: PASS | REVISE`).

### Reviewer Gate (MUST)

- Delegate final completion gate to an independent Reviewer.
- Reviewer response must include `Reviewer role:`, `Reviewed artifact:` and `Result: PASS | REVISE` (matching shared-skill-delegation-baseline.md#reviewer-response-template). A bare `Result:` line is not a verdict — without the role and the artifact it is textually identical to a doer's self-assessment, so a response missing either line is re-requested, never read for its `Result:`.
- Reviewer checks Drift Protocol compliance and alignment with `.qfai/assistant/catalog/test-layers.md`.
- Test volume floors/ratios are not gates; they are signals.
- Do not declare DONE until Reviewer returns `PASS` under those two lines, naming the artifact this gate covers; otherwise apply `REVISE`.

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
  write. Under RED-first the source modules do not exist when `delivery-planner` must judge, so the conditions are evaluated over each row's declared `Owning module` (`references/execution-ledger.md`); a ledger without that column supports parallel dispatch only for seams that already exist. Full rules: `references/parallelization-policy.md`.
- `parallel_groups: []` in `agent-routing.yml` describes **role fan-out within
  a phase**, not item dispatch.

### Post-parallel integration verify

- **Reconcile the ledger first.** Under worktree separation each worker holds a private copy of `test-list.md`, so the merged trunk carries none of their transitions. Write Status + Evidence for every merged item from the worker reports **before** integration verify, and fail the verify if any merged item's row is still `todo` — an unreconciled ledger reports finished work as unstarted (`references/parallelization-policy.md#ledger-ownership`).
- After parallel slices complete and merge, run integration verify on the merged result
- Then reconcile the seams: diff each slice's touched `src/` paths against its declared `Owning module` and report undeclared or overlapping paths as a deny-condition breach — **independently of whether the merged suite is green** (`references/parallelization-policy.md#seam-reconciliation-after-a-parallel-run`)
- If integration verify fails, re-run it once with no intervening change before acting. A failure that does **not** reproduce is an `environment/tooling` finding (`shared-skill-operating-baseline.md#nondeterministic-gates`), reported with every run — not a rollback trigger. For a reproducible failure, **classify before acting** per `shared-skill-operating-baseline.md#gate-failure-autorepair-protocol`, attributing it to one slice, to the merge resolution, or to code outside every slice. Remedies by class: `references/parallelization-policy.md#failed-integration-verify`. Unconditional rollback is not one of them — the protocol classifies this as a local, non-destructive defect to fix and re-run, and reserves stopping for destructive changes. Only a **reproducible** failure flags all slices for re-examination and rolls back the merge, and only where the classification calls for it
- If integration verify passes, state transitions back to `delivery-planner` for sequential flow

## Completion Contract (Shared)

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#completion-contract-shared`.
Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#gate-failure-autorepair-protocol` for validate, doctor, and quality-gate failures.

### Item completion checklist (12-point gate)

An item in `test-list.md` may transition to `done` only when ALL of the following are satisfied. For T1 rows, items 3, 5, 7 and 8 are satisfied by the confirmation covering the row's coherent group; they are never waived.

1. Corresponding `TDD-ID` has been selected and is in progress
2. A failing test was added first (test-first) — **or**, on the _RED not observable_ path, the correct test was added first and proven falsifiable by mutation instead of by a natural failure
3. RED was observed — `qa-gatekeeper` confirmed an **admissible** failure: an assertion or expected-exception check inside the row's `Selector`, not a load or fixture error (`references/red-admissibility.md`), **or** the row carries falsifiability evidence per _RED not observable_
4. Minimal production code was written to make the test pass — **waived** on the _RED not observable_ path, where the `Satisfied-by` row already implements the predicate; do not manufacture a change to satisfy this item
5. GREEN was observed — `qa-gatekeeper` confirmed the test passes after implementation (watch it pass) **and** that the pass depends on this item's behaviour: `Oracle proof` records a production mutation that made the test fail again, or `equivalent-mutant` naming the weaker contract clause (`references/oracle-strength.md`). Exit code 0 alone does not distinguish a discriminating test from one that cannot fail
6. Refactor was performed and GREEN was re-confirmed after refactor
7. `completion-reviewer` returned PASS (spec / completion review gate)
8. `implementation-reviewer` returned PASS (code quality review gate)
9. UI-affecting items have `product-surface-reviewer` PASS — **prototype parity** on a visual-prototyping target, and on a cli-only target (see `#visual-review-guard`) a surface review of the captured command output in its place, because no prototype exists to compare against
10. `test-list.md` Status is current and its Evidence cell's anchor resolves to a fresh per-item entry in the evidence file its `Layer` owns — `.qfai/evidence/implement-<spec-id>.md`, or `.qfai/evidence/atdd-<spec-id>.md` for an `E2E` / `API` / `Integration` row, whose RED provenance was produced by the stage that authored its test — `/qfai-atdd` owns all three, because `QFAI-ATDD-112` puts every `L3` and undeclared-`Level` TC in `tests/integration/**` and its P4 writes those tests (`references/execution-ledger.md#atdd-owned-rows`). **Compatibility:** an `E2E` / `API` row that reached `done` or `review-fix` before this split has its evidence and anchor in `implement-<spec-id>.md`, which was the contract at the time. **Identify it by a marker, not by its status**: the row carries `Pre-split-evidence: implement` in its `Evidence` cell. **Write it once, from the history**: for **every** `E2E` / `API` row past `todo` — `red` and `green` and `refactor` as much as `done` and `review-fix` — check whether its `Evidence` anchor pointed at `implement-<spec-id>.md` in the commit that last advanced it. A row interrupted mid-cycle by the upgrade has legitimately stored evidence there too, and skipping it left that row unable to finish: unmarked, it is judged by the current rule whatever its status, so the evidence it lawfully wrote was rejected at item 10. Find that commit from the row's **patch history**, not with `git log -S`: the id is on both sides of a status-only change, and `-S` matches a filepair only when one side contains the string, so it walks back to the commit that _added_ the row instead. `git log -p -- <test-list.md>` and take the newest commit whose hunk changes that `TDD-ID`'s line (`git log -L` on the row also works where the line is stable). If its anchor named the implement file, append the marker. A row advanced after the split has an ATDD anchor there and gets none. Run it as part of taking this version; until it has run, those rows are judged by the current rule, which is the safe direction: they are reported, not silently accepted. Status and anchor alone cannot tell a legacy row from a new `E2E` / `API` row written to the wrong file — which would let a row that never produced its ATDD handoff be accepted as complete. **A row with no marker is judged by the current rule whatever its status**, which for an `E2E` / `API` row means the ATDD file: status and anchor alone cannot tell a legacy row from one written to the wrong file after the split, and accepting the implement anchor without the marker let a row that never produced an ATDD handoff pass the gate as complete. **A row that carries the marker** is the legacy case, and its implement anchor is accepted — it has no ATDD entry to produce, and a `done` row has no legal transition that would let it re-observe a RED, so requiring the new location would make an already-complete row permanently ungateable. Until the marker pass has run, unmarked legacy rows are reported rather than accepted; that is the safe direction, and running it is what clears them. A row advanced after the split writes to the file its `Layer` owns. The cell is a pointer, not the payload (`references/execution-ledger.md#evidence-cell-contract`). `Review pack seal` is recomputed here from the `review-<timestamp>/` directory it names, and a mismatch means the pack was edited after the round closed. Each reviewer verdict's `Audited evidence hash` is **recomputed** here over the entry's phase-authored fields: the revision excludes `.qfai/evidence/**`, so this is the only thing that tells a verdict passed on the evidence as read from one passed on evidence edited afterwards. A verdict carrying a `Record re-attestation` is compared against **that** hash and not the superseded original — a record repair moved the bytes the original read, by design — and the re-attestation's `Record re-attestation pack seal` is recomputed here beside the round's `Review pack seal`, each from the pack it names. The re-attestation is written as a pack of its own for exactly this reason: neither seal is ever edited, so a repaired record stays checkable rather than becoming an untraceable rewrite of a sealed pack (`.qfai/assistant/constitution/drift-protocol.md#the-record-defect-queue`). The item's four sub-agent observations (items 3, 5, 7, 8) all name the **same** revision (`references/evidence-revision.md`) — **except item 3**, which cannot be taken against the final tree on any row: a RED precedes the code that makes it pass, and a `falsifiability` row's mutation run is taken against a tree reverted before the GREEN. It names its own field (`RED revision`, or `Falsifiability revision` in its place); items 5, 7 and 8 share `Revision`. That is the property that RED is worth having, not a defect in it; demanding one revision across all four made an `observed-red` E2E/API row unable to reach `done` however correct its evidence was. Such a row's RED names the revision it was observed at, items 5, 7 and 8 agree among themselves, and the reviewer checks that the handed-over RED names this row's selector and the predicate it owns rather than that it matches the final tree
11. The item's evidence file (item 10) is appended with both reviewer verdicts after items 7-8 returned PASS — this skill runs those reviewers for every row it advances, including the ones whose RED came from `/qfai-atdd`
12. Checkpoint verification passed (see `#checkpoint-verification`), and its `Checkpoint verification seal` is **recomputed** here over the recorded command, result and revision — a mismatch means the checkpoint record was edited after the run, and nothing else in the entry would have moved. The **full** suite is required here only when the item sits on a checkpoint boundary; a row between boundaries satisfies this with the narrow relevant suite from Phase: Refactor step 2, which is also what items 6, 7 and 8 are evaluated against.

**Portable item-10 verification.** `Pre-split-evidence: implement` selects the historical completed-artifact contract as well as its file owner: do not retroactively require the ATDD-only manifest/hash. For current evidence use only the latest round, the canonical shared-artifact block, and the local-only review-pack rules in `references/review-artifact-layout.md`.

Sequencing note: the phase-authored part of the evidence file **item 10's `Layer` rule selects** is written **before** items 7-8, because it is what the reviewers audit — naming only `implement-<spec-id>.md` here split an `E2E` row in two. The verdict fields are appended **after** items 7-8, and a phase-authored evidence file whose only gap is those fields is NOT a blocking finding at review time (`Per-item evidence contract`).

### Review artifact layout (MUST)

Gate items 7-9 are evidence-bearing: reviewer verdicts must be written to a review pack, not left in
conversation. There is exactly **one** `.qfai/review/**` layout — `review-<17-digit-timestamp>/`
holding `review_request.md`, `R01_<reviewer-id>.md` (at least one) and `summary.json`. Do not nest
`<scope>/<layer>/attempt-NN/` directories: packs written there are invisible to `npx qfai validate`.
Each review round creates a new pack. Full schema and the `REVISE` -> `status: "FAIL"` mapping:
`references/review-artifact-layout.md`.

### Spec completion conditions

The skill may declare "this spec's implementation is complete" only when:

- All TC-\* from `06_Test-Cases.md` with applicable layer are present in `test-list.md`. "Applicable layer" is decided by `.qfai/assistant/catalog/test-layers.md#layer-derivation-procedure-normative`
- `QFAI-ATDD-111` and `QFAI-ATDD-113` are clean for this spec — every declared `US-*` and
  `CON-API-*` is traced by an annotation in the test tree, and where `06_Test-Cases.md` declares an
  E2E coverage-target TC, by a `Layer = E2E` row naming it. **Not** "every `US-*` has an `E2E` row":
  those rows have no producer (`../qfai-atdd/references/red-provenance.md#a-spec-with-no-atdd-owned-rows`)
- Each item reached `done` or valid `exception` (with DR-ID)
- 0 blocking reviewer issues remain, and this spec's `## Record defects` queue is drained — every `record:*` advisory filed there is **repaired in place**, and where the rule it names is one no validator checks the entry **also** owes a `validateTddList` bug report, which tracks the missing check and never stands in for the repair (`references/finding-classification.md#advisory`). Closing on the report alone would leave the wrong record exactly as wrong with the round that found it already spent, so repair is the only close: where the round's artifacts no longer say what the run did, the record cannot be repaired honestly and the entry is reclassified `defect:code-quality`, blocking, rather than closed. A repaired entry a reviewer had hashed is open until its record re-attestation exists. Making that class advisory removed the round it used to force, not the defect; the drain is the only place it is collected, so an open entry here is an uncorrected record certified as complete
- Checkpoint verification passed at the spec-level boundary (see `#checkpoint-verification`), and its `Checkpoint verification seal` is **recomputed** here over the recorded command, result and revision. That boundary has no row, so gate item 12 never runs for it — without this recomputation the full-suite result on a terminal ledger could be edited from FAIL to PASS afterwards with no revision, no `Audited evidence hash` and no pack seal moving
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
- The item's evidence file (item 10) does not exist, or does not record both reviewer verdicts for the item (this is the single blocking statement about the evidence file; its absence of _verdicts_ is never blocking before items 7-8)
- A `## Cross-spec obligations` entry in this spec's evidence file is still open — the change it names has not landed, or the blocked spec's obligation is still untested. A clean completion here would certify an obligation this run knowingly left unmet (`references/cross-spec-ownership.md`)
- Items with `todo`, `red`, `green`, `refactor`, or `review-fix` status still exist (for spec-level completion)
- Items with `exception` status still exist, **unless** the row's `DR-ID` names
  a Decision Record explicitly recorded as a **user-approved accepted-risk
  waiver** (a `TDDLIST-001` entry in `.qfai/waivers.yml`). An `exception` whose
  DR only describes the anomaly is a parked defect, not a completed item.
- Parallel slices were used but integration verify has not been run post-merge
- A checkpoint boundary was reached (see `#checkpoint-verification`) but the verification command set was not executed, or any command in it exited non-zero — the last row a run completes is always a boundary, not the physical last row of the file, which is often already `done` and skipped, so every spec runs the full suite at least once
- `it.todo(...)` / `test.todo(...)` / `describe.todo(...)` stubs remain in any file covered by `validation.traceability.testFileGlobs` (`QFAI-TEST-001`). Implement the body or delete the stub — an opt-out via `validation.testStrategy.forbidTestTodoStubs: false` is permitted only with an accompanying waiver DR-ID.

## Evidence (MANDATORY)

Create/update the evidence file the row's `Layer` owns: `.qfai/evidence/implement-<spec-id>.md` for the rows this skill runs end to end, and `.qfai/evidence/atdd-<spec-id>.md` for an `E2E` / `API` / `Integration` row, whose RED provenance was produced by the stage that authored its test — all three, so the GREEN, the refactor-verify pair and the review verdicts land in the same file as the provenance and item 10 reads one complete entry rather than half of one from each. This is the file gate item 10 resolves the `Evidence` anchor against, so the whole per-item record — RED, GREEN, Refactor, `Oracle proof` and both reviewer verdicts — belongs in the **one** file, appended to the `## Ledger rows advanced` entry `/qfai-atdd` opened. Splitting a row across both leaves the file the gate reads incomplete.

Required sections:

- Objective
- Items processed (TDD-ID, TC-Refs, final status)
- **Per item, one `### TDD-NNNN` section** carrying the contract below — the single home for that item's RED/GREEN commands and output, in whichever of the two files the row's `Layer` names. The ledger's `Evidence` cell anchors here and holds only the one-word outcomes, because a GFM cell cannot hold a newline or a bare `|` (`references/execution-ledger.md#evidence-cell-contract`)
- Test results summary
- Exception items (if any) with DR-IDs
- `## Cross-spec obligations` (if any): per affected spec, the TDD-ID that forced the change, the blocked spec and its TDD-IDs, the file, the change required, the obligation left unverified, and the resolution (`re-reviewed` or a `CR-*`). Fields and the rule: `references/cross-spec-ownership.md`
- Commands executed

### Per-item evidence contract (fresh evidence required)

Each TDD item MUST have fresh evidence containing at minimum the fields below. The contract has two
parts with different write points; the fields are the same, the sequencing is not.

**Phase-authored (written before the reviewer gate, items 7-8):**

- `TDD-ID`, `Layer`, `Test file`, `Selector` — the row identity, copied from `test-list.md`. The reviewers hash these and gate item 10 checks the copy against the ledger, so a row recorded without them has no identity record to hash and cannot pass that check (`constitution/shared-skill-delegation-baseline.md#reviewer-response-template`)
- `TC-ref` — reference to the test case(s). On a `Layer = E2E` row read `US-ref` (the row's `US-Refs`) instead, and on a `Layer = API` row read `CON-API-ref` (the row's `CON-API-Refs`): exactly one obligation reference is required, the one the row's `Layer` selects
- `Revision` — the state the observation was made against: `git rev-parse HEAD`, or `working-tree+<content hash>` for an uncommitted tree.
- `RED test hash` — **required on a handed-over `E2E` / `API` / `Integration` row**, and checked, not just read. On an `observed-red` row the producer records it with the RED; on a `falsifiability` row — which has no RED pair, so nothing was hashed at handoff — **Phase Red step 3c records it against the mutation run**, which is the run this gate is about for that branch. Phase Green rewrites the production tree, so the working-tree hash cannot be recomputed from the final one and `Revision` alone cannot tell "only production changed" from "the acceptance test was edited after the handoff". Recompute it over the **same inputs the producer hashed** — the row's `Test file` column _and_ the acceptance-test-owned artifacts it names, in the manifest order `../qfai-atdd/references/red-provenance.md` defines. The producer records that manifest beside the hash for exactly this reason: recomputing over `Test file` alone yields a different value for every row that reads a fixture or a snapshot, so an unchanged row failed the gate and was sent back to `/qfai-atdd` on every pass. Recompute before GREEN is submitted and before the reviews: it is unchanged by Phase Green, so a mismatch means the test moved under the RED and the row goes back to `/qfai-atdd` for a fresh one — **unless a `Shared-artifact re-verify` entry names this row — its spec and `TDD-ID` together — and carries its re-run, re-taken proof and the artifact's new manifest and hash. Two places hold such an entry and both clear it**: a later row's evidence, and the `## Shared-artifact re-verify` block in the stage evidence file of a stage that moved the artifact. Naming only the later row left a spec with no ATDD-owned rows — the ordinary case for a fresh spec that edits a shared fixture — with nowhere its re-verify would be read, so a correctly re-verified consumer stayed stale for ever. A shared fixture edited by a later row moves this hash by construction, and a `done` row cannot take a fresh RED, so that entry is what clears it (`../qfai-atdd/references/red-provenance.md#a-shared-test-artifact-outlives-the-row-that-recorded-it`). Without this the stale RED passes gate item 10 exactly as a fresh one does. Where it lives is `references/round-evidence.md`'s list, and that list is the only statement of it — recorded at the handoff for an `observed-red` row's first round, at step 3c for a `falsifiability` one, and again by each fresh RED a REVISE opens. `Revision` is the field that is per round block and once more for the refactor-verify pair (`references/evidence-revision.md`)
- `Falsifiability revision` — **required on a `falsifiability` row**, and distinct from `Revision` by construction. The gate now reads the mutated tree before the revert (Phase Red step 3c), so item 3's observation is made against a tree that is deliberately thrown away, while the GREEN and both reviews see the restored one. Requiring one revision across all four made every correct branch-2 row permanently stale — the same shape as the handed-over RED below, for the same reason: the observation that proves the test discriminates cannot be taken against the tree the reviewers judge. Record the mutated tree's address here; items 5, 7 and 8 agree among themselves on `Revision`
- `Round N: RED revision` — **required in every round block with a RED pair**, not only a handed-over one, and per round because each round's RED is observed on its own tree: a RED is observed before the code that makes it pass exists, so on an uncommitted tree Phase Green moves the content address by construction and one shared `Revision` made an ordinary cycle stale at GREEN. A row whose proof was re-taken after a test-only replacement also carries `Replacement proof revision` — the tree that proof ran against — and `RED revision` keeps the tree the original RED was observed on (`../qfai-atdd/references/review-fix-rounds.md`). That RED was observed before the production code existed, so its revision is earlier than `Revision` by construction; recording both in one field made the row permanently stale (`references/evidence-revision.md`)
- `RED command` — the exact command executed to observe failure
- `RED result` — the failure output. Truncation is acceptable for the stack tail, never for the assertion message and its location: that is what demonstrates admissibility
- `RED failure mode` — `assertion` | `expected-error` | `falsifiability`. There is no admissible value for a load error (`references/red-admissibility.md`)
- **Exclusive alternative to the RED pair**: a row on the _RED not observable_ path carries `Satisfied-by`, `Falsifiability command` and `Falsifiability result` in place of the two RED fields above. Exactly one of the two forms must be present — never both, never neither (`references/red-not-observable.md`).
- `GREEN command` — the exact command executed to observe success
- `GREEN result` — the success output
- Each RED/GREEN cycle is one **round block**. Which fields carry a `Round N:` prefix is `references/round-evidence.md`'s list and only that; do not re-derive it here. The **row-level** fields do not: `TDD-ID` and `TC-ref` are recorded once for the row. `RED test hash`, `RED revision` and `Falsifiability revision` were listed here as row-level while that reference put them in each round's block, and a blocking REVISE that opens Round 2 makes the two irreconcilable — one instruction overwrites Round 1's address, the other reuses it for a RED it was not taken on. Numbering, cardinality and the two rework paths are that reference's alone
- `Refactor verify command` — the exact command re-executed after refactor. Written once for the item as a whole, so it takes no `Round N:` prefix
- `Refactor verify result` — the output confirming GREEN is maintained (likewise once per item)
- `Oracle proof` — the smallest production change that makes this item's test fail again, its command and its failing output, reverted immediately; or `equivalent-mutant` naming the contract clause weaker than the obligation. A row on the _RED not observable_ path satisfies this with its falsifiability fields (`references/oracle-strength.md`)

These exist _for_ the reviewers: they are the evidence items 7-8 audit. They MUST be present when a
review is requested.

**Gate-completed (appended after items 7-8 return PASS):**

- `Spec review` — completion-reviewer result (PASS or REVISE), recorded with the unambiguous sibling fields `Spec reviewed revision`, `Spec audited evidence hash`, `Spec review pack`, and `Spec review pack seal`. The revision and audit hash must be the values in the sealed pack's PASS response, and gate item 10 recomputes both the evidence hash and the whole-pack seal (`references/evidence-revision.md`)
- `Code quality review` — implementation-reviewer result (PASS or REVISE), with the parallel sibling fields `Code quality reviewed revision`, `Code quality audited evidence hash`, `Code quality review pack`, and `Code quality review pack seal`, checked the same way. Do not use two unlabeled `Reviewed revision` / `Audited evidence hash` pairs: the completion gate cannot tell which reviewer owns which pair. A record repair drained from the `## Record defects` queue adds `Record re-attestation`, `Record re-attestation pack` and `Record re-attestation pack seal` **beside** the verdict they supersede — never an edit to that verdict's own hash line, and never an edit inside the sealed pack holding it (`.qfai/assistant/constitution/drift-protocol.md#the-record-defect-queue`)
- `Prototype parity` — product-surface-reviewer result for UI-affecting items (PASS or REVISE). On a cli-only target the field records the captured-command-output surface review item 9 substitutes for parity; the field name does not change, so nothing downstream has to learn a second key
- `Checkpoint verification command` — the exact command set executed at the checkpoint boundary
- `Checkpoint verification result` — the outcome of that command set (PASS only when every command exits 0) — and `Checkpoint verification seal`, the audit hash over these two fields together with the `Revision` the checkpoint ran against, taken by whoever ran it the moment the run ends. The three are appended after every reviewer has hashed, so they are in no audit subject by construction; the revision excludes `.qfai/evidence/**`, and the review pack seal covers only the pack. Without a seal of their own, a row already at `done` could have its checkpoint result edited from FAIL to PASS with no revision, no `Audited evidence hash` and no pack seal moving, and item 12 would accept it

These record verdicts that do not exist until the reviews have run. A reviewer MUST NOT treat their
absence as a blocking gap during review — an evidence file complete in its phase-authored part and
missing only the verdict fields is the expected state at review time. It becomes blocking only at
the completion gate (see `Completion prohibition conditions`).

### Evidence hard rules

- Status-only evidence (e.g., "Status: PASS" with no command) is invalid and MUST be rejected; both command and result are required, and "should pass" or "looks good" alone is not acceptable — `TDDLIST_EVIDENCE_STATUS_ONLY` (warning, waivable as `TDDLIST-004`: ledgers predating the check carry prose verdicts)
- Empty evidence entries are rejected: minimum evidence per TDD item must be met — `TDDLIST_EVIDENCE_EMPTY` (warning inside its promotion window, error from the release the finding names; a row already at a terminal status backfills the cell in place — `references/execution-ledger.md`)
- Stale evidence from a previous run MUST NOT be reused to claim completion for a new cycle. **Stale is mechanical**: evidence whose named `Revision` differs from the revision the item finally landed at (`references/evidence-revision.md`). **Reviewer obligation, not a machine gate** — why, and the full rules: `references/execution-ledger.md`.
- **Selective reporting of repeated runs of the same gate is invalid.** When a gate was run more than once, report every run in order — a clean rerun after a red one is an `environment/tooling` finding, not a pass (`.qfai/assistant/constitution/shared-skill-operating-baseline.md#nondeterministic-gates`)

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
  Action: run `npx qfai validate --profile tdd --fail-on error --spec <spec-id>` for this skill, then `/qfai-verify` for full-scan approval.
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

- One TDD item at a time from test-list.md by default; item-level parallelism inside one spec only when the Parallelization Policy technical gate and user consent both pass; status lifecycle is forward-only along todo → red → green → refactor → done, plus re-entry edges (refactor → red on a qa-gatekeeper REVISE, blocked → todo, exception → todo, refactor → review-fix → refactor, approved upstream reset) enumerated only in `references/execution-ledger.md#allowed-transitions` — never conclude an edge is illegal from this line alone; exception requires DR-ID.
- Fresh RED + GREEN command/result evidence is mandatory per item, except on the _RED not observable_ path where `Satisfied-by` + falsifiability command/result replace the RED pair (exclusive alternative, never both); status-only evidence (e.g. "Status: PASS") is rejected.
- UI-affecting items require product-surface-reviewer PASS before the item can transition to done — prototype-parity on a visual-prototyping target, and on a cli-only target a surface review of the captured command output in its place, since `/qfai-prototyping` rejects `cli` and produces no prototype to compare against.
