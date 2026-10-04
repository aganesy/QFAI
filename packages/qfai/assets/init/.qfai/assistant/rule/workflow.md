# QFAI Default Workflow

QFAI standardizes work into a fixed pipeline:

## SDD → Implementation → Verification

This file defines the canonical stages and delegation expectations.

---

## Absolute Rule — Output Language

**All outputs MUST be written in the user’s working language for this session.**

---

## Change Type

The workflow routes are orthogonal to the Change Type that
`.qfai/assistant/rule/change-classification.md` defines and the pull request
body declares. A route of `npx qfai workflow plan`, such as `fix-defect`,
`add-feature` or `edit-text`, says which stages run; the Change Type says what
kind of change it is. Neither selects the other, and a change declares both: a
`fix-defect` change may declare `Behavior`, and an `add-feature` change
`Structural`. No route declares a Change Type, and no route maps to a Change
Type.

---

## Workflow routes

A change request follows one route. `npx qfai workflow plan` chooses it from
the facts `qfai-run` reads out of the request, returns the route's plan and
writes nothing; the session runs the plan.

- A stage runs every step its plan names, in plan order. Nothing a request says
  adds, drops or reorders a step.
- A pass-through step still runs. When it can show it has nothing to write, it
  writes nothing and states why, and the route's review reads that statement.
- At a decision point the plan names, each critical decision goes to the user
  before anything that depends on it changes. A decision is critical when it
  contradicts a specification, a contract or a recorded decision, cannot be
  taken back, or rests on product intent nothing written states. Every other
  decision is taken and reported.
- At the release point the plan names, the user approves the release before
  anything after it runs. The approval authorizes no push, merge, tag or
  publication.
- A stage that finds work no step of its route does, does none of it. At a
  branch point its plan declares, it reports the outcome that moves the work to
  another route. Anywhere else the work stops and names the stage skill to
  invoke.
- A request that ends without a change to the project runs a route owned by
  `qfai-triage`.

---

## Drift Protocol (Mandatory)

- Read and enforce `.qfai/assistant/rule/drift-protocol.md`.
- Downstream phases must not edit upstream SSOT artifacts without explicit user approval.
- If drift is required, append a `Change request:` row in `<paths.specsDir>/decisions.md`, obtain approval, and rerun the owner skill. A defect with one sound repair does not need invented alternatives.
- The STOP is scoped: it halts the affected upstream artifact and every downstream item that depends on it, which the Change Request enumerates. Unaffected items continue, and more than one Change Request may be open at once — see `.qfai/assistant/rule/drift-protocol.md#multiple-open-change-requests`.

## Test-layer policy (Mandatory)

- Read and enforce `.qfai/assistant/rule/test-layers.md`.
- Treat floors/ratios as signals, not completion gates.
- Completion gate is `npx qfai validate --fail-on error` with evidence.

---

## Stages (canonical)

1. Discussion (optional): clarify idea → requirement seed
2. Requirements: discussion pack in `.qfai/discussion/`
3. Specification (SDD): preflight, triage, policy, business flows, stories with AC and EX, and enforcing contracts
4. Prototyping (optional): contract-aligned implementation skeleton
5. Implementation: `/qfai-implement` writes the BF E2E test and the AC integration tests with empty bodies, then implements one EX at a time through Red, Green, Refactor; the acceptance test bodies are written once the system's shape has settled
6. Verify: run quality gates and provide evidence

Stage 3 (`/qfai-sdd`) target policy:

- With a BF argument, scope requested work to that flow and its shared dependencies.
- Without an argument, triage the incoming requirements and update the flows they affect.
- Record approval-required operations in `decisions.md`; a pending `TODO` row does not authorize a protected change.
- Write policy and flows before stories, AC, EX, and enforcing contracts. Validate every affected BF.

Prototyping stage policy:

- `/qfai-prototyping` scope is governed by Article VII § Prototyping exception (scope floor) in `.qfai/assistant/rule/constitution.md` — the single home for both the scope floor and the Change Request exception to it. Do not restate the floor here; on any overlap between this file and the constitution, the constitution wins.
- Prototyping completes when the user confirms the prototype. No command or check certifies it. The one file a `qfai` command reads under `.qfai/prototype/` is `final/handoff.json`, which `npx qfai validate --profile saas-package` checks.
- Coverage gaps (missing BF or AC obligations, unresolved declared checks, API 404) are blocking.

Implementation stage:

- Inside a route, `/qfai-implement` works the examples its work order names and runs no `npx qfai validate`. Invoked by name, it validates the flow once, at completion, with `npx qfai validate --profile tdd --fail-on error --flow BF-NNNN`. For each example it records an observable assertion failure, the passing result, and the refactor check for that EX.
- A collection, import, syntax, or fixture failure is not an admissible RED. When existing behavior already satisfies the EX, record falsifiability evidence under the rule in `references/red-not-observable.md`. Never weaken a correct test to manufacture RED.
- While implementing, run only the test being written. Lint, typecheck, build, the full suite and `npx qfai validate` run once, in the verify stage. Parallel execution requires disjoint writes and user consent.

### Concurrency (stage-independent, mandatory)

This subsection binds **every** stage that delegates in parallel, including
`/qfai-sdd` no-argument batch runs and `/qfai-implement` slice execution. It is
a real heading so `.qfai/assistant/rule/workflow.md#concurrency-stage-independent-mandatory` resolves
from the skills and baselines that cite it.

- Worktree separation is required whenever two or more delegated agents write
  files concurrently. One agent per worktree; no shared index.
- If worktree separation is not available, parallel delegation degrades to
  "one agent commits at a time; the others hand back an unstaged diff to the
  orchestrator". State which of the two modes is in force in the stage
  evidence.
- Commit scoping is mandatory in both modes and binds **every** committer —
  delegated agent and orchestrator alike. Stage only the paths belonging to the
  task being committed (`git add <paths>`). `git add -A`, `git add .` and
  `git commit -a` are forbidden while any parallel stage is in flight.
  - In **degraded / shared-index** mode the damage is immediate: the siblings
    share one index, so a sweeping stage commits their in-flight files into an
    unrelated commit and misattributes work in the audit trail the Drift
    Protocol depends on.
  - Under **worktree separation** there is no shared index, so no sibling file
    can be swept in. The ban still holds: a sweeping stage commits whatever
    else is loose in that agent's own worktree — build output, scratch files, a
    half-finished edit outside the work order — so the commit still stops
    matching its declared deliverables, which is what the audit trail reads.
- Degraded mode makes this the **orchestrator's** obligation above all, since
  it is the one holding the commit: it commits one handed-back diff at a time,
  staging that agent's declared deliverable paths only, and never blanket-stages
  the shared worktree. A diff whose paths it cannot enumerate is not
  committable — ask the agent for its path list first.

### Policy check (mandatory)

Once per run, at the start, before the first stage. A stage invoked by name on
its own is a run of its own.

1. Check the current story-tree policy files under `<paths.specsDir>`:
   - `01_policy/objective.md` and `01_policy/initiative.md`
   - `01_policy/principle.md` and `01_policy/constraint.md`
   - `03_contract/tech.md`
2. Detect incomplete content (empty sections, placeholder-only lines, `<...>`, `TBD`, outdated facts). A table with no rows or a `- None.` list is complete where the template allows it.
3. If a stage of the run owns the file, fill verified facts into the sections its template has, adding none. Otherwise follow the drift protocol and rerun the owning stage.
4. If information cannot be verified, append an OQ row to `<paths.specsDir>/open-questions.md` and ask the user.
5. Record new facts discovered during the run and route an upstream change to its owner.

Do not continue affected downstream work on stale policy. The procedure that
carries out these five points is the `common-policy-check` step.

This contract narrows, and does not replace, the project-memory read of **Article III** in
`.qfai/assistant/rule/constitution.md`: Article III says what to read at stage start, the policy check says which
of those files must additionally be verified and repaired before the run proceeds.

---

## Delegation pattern (multi‑role)

A QFAI custom prompt may delegate to subagents (roles) and then consolidate results.

Recommended delegation rules:

- Delegate **analysis** and **review** (Architect / QA / Code Reviewer) early.
- Delegate **contracts** only when needed (Contract Designer).
- Delegate **CI/gates** verification to DevOps/CI Engineer when changes affect scripts or packaging.

### Subagent response contract (required)

When a subagent is invoked, it must respond using this structure:

1. **Findings** (facts observed)
2. **Recommendations** (what to do)
3. **Proposed edits** (files/sections to change)
4. **Open Questions / Risks**
5. **Confidence** (High/Medium/Low + reason)

---

## Quality gates

Gate commands are project-defined. Always discover them from the repo.
Typical minimum:

- format check
- lint
- typecheck
- tests
- pack/verify (if distributed)
- In CI, use default/full validation (`npx qfai validate --fail-on error`); `--phase refinement` is local-only.
- Waivers are for `warning` / `info` findings only. Waivers targeting `error` findings are treated as configuration errors and must fail.

---

## Evidence policy

At the end of each stage, report:

- what changed (file list)
- what was executed (commands)
- whether it passed (PASS/FAIL)

Never claim completion without evidence.
