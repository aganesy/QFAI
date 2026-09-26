# QFAI Default Workflow

QFAI standardizes work into a fixed pipeline:

## SDD → ATDD → Implementation → Verification

This file defines the canonical stages and delegation expectations.

---

## Absolute Rule — Output Language

**All outputs MUST be written in the user’s working language for this session.**

---

## Change Type (Mandatory)

At the start of any work, classify the change and record it in:

- `<paths.specsDir>/decisions.md` (`Content` and `Approach` of a `DEC-NNNN` row for a durable decision)
- PR description (Change Type section)

Allowed values:

- Primary: `Initial | Behavior | Structural | Ops`
- Tags (optional): `@api @db @nfr @docs @test`

These values are restated from `.qfai/assistant/rule/change-classification.md` (SSOT). See `.qfai/assistant/rule/change-classification.md#2-tags-multi-select` for each tag's trigger condition and examples; a tag not listed there is dropped by every consumer.

Do not proceed without a declared Change Type.

The workflow routes are orthogonal to the Change Type. A route of
`npx qfai workflow` (`direct`, `bugfix`, `bounded-change`, `feature` or
`discovery`) says which stages run; the Change Type says what kind of change it
is. Neither selects the other, and a run declares both.

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

0. Steering refresh (project memory bootstrap)
1. Discussion (optional): clarify idea → requirement seed
2. Requirements: discussion pack in `.qfai/discussion/`
3. Specification (SDD): preflight, triage, policy, business flows, stories with AC and EX, and enforcing contracts
4. Prototyping (optional): contract-aligned implementation skeleton
5. Acceptance tests (ATDD): BF E2E and AC integration or API tests from the story tree and contracts
6. Implementation: `/qfai-implement` implements one EX at a time through Red, Green, Refactor
7. Verify: run quality gates and provide evidence

Stage 3 (`/qfai-sdd`) target policy:

- With a BF argument, scope requested work to that flow and its shared dependencies.
- Without an argument, triage the incoming requirements and update the flows they affect.
- Record approval-required operations in `decisions.md`; a pending `TODO` row does not authorize a protected change.
- Write policy and flows before stories, AC, EX, and enforcing contracts. Validate every affected BF.

Prototyping stage policy:

- `/qfai-prototyping` scope is governed by Article VII § Prototyping exception (scope floor) in `.qfai/assistant/rule/constitution.md` — the single home for both the scope floor and the Change Request exception to it. Do not restate the floor here; on any overlap between this file and the constitution, the constitution wins.
- Completion requires prototyping evidence (markdown + json in `.qfai/evidence/`) and `npx qfai validate --profile prototyping --fail-on error` pass. The profile is explicit on purpose: an omitted `--profile` defaults to `full`, which runs the ATDD traceability rules (`QFAI-ATDD-111/112/113`) at severity `error` — obligations of stage 5, which has not run yet at stage 4.
- The `/qfai-verify` run that feeds `npx qfai prototyping certify` writes `.qfai/report/verify.json` with `scope: "prototyping"`; certify accepts no other scope. See the Verify Output Contract in `.qfai/assistant/skill/qfai-verify/SKILL.md`.
- Coverage gaps (missing BF or AC obligations, unresolved declared checks, API 404) are blocking.

Implementation stage:

- `/qfai-implement` selects a current EX obligation from `npx qfai validate --profile tdd --flow BF-NNNN`. It records an observable assertion failure, the passing result, and the refactor check for that EX.
- A collection, import, syntax, or fixture failure is not an admissible RED. When existing behavior already satisfies the EX, record falsifiability evidence under the rule in `references/red-not-observable.md`. Never weaken a correct test to manufacture RED.
- The BF completion checkpoint runs the Test, Lint, Typecheck, and Build commands in `<paths.contractsDir>/tech.md`, flow validation, and independent review. Parallel execution requires disjoint writes, a passing technical gate, and user consent.

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

### Stage 0 — Steering refresh contract (mandatory)

At the beginning of each stage (`qfai-discussion`, `qfai-sdd`, `qfai-prototyping`, `qfai-atdd`, `qfai-implement`, `qfai-verify`):

1. Check the current story-tree steering files under `<paths.specsDir>`:
   - `01_policy/objective.md` and `01_policy/initiative.md`
   - `01_policy/principle.md` and `01_policy/constraint.md`
   - `03_contract/structure.md` and `03_contract/tech.md`
2. Detect incomplete content (empty sections, placeholder-only lines, `<...>`, `TBD`, outdated facts).
3. If the current stage owns the file, fill verified facts. Otherwise follow the drift protocol and rerun the owning stage.
4. If information cannot be verified, append an OQ row to `<paths.specsDir>/open-questions.md` and ask the user.
5. Record new facts discovered during the stage and route an upstream change to its owner.

Do not continue affected downstream work on stale steering.

This contract narrows, and does not replace, the project-memory read of **Article III** in
`.qfai/assistant/rule/constitution.md`: Article III says what to read at stage start, Stage 0 says which
of those files must additionally be verified and repaired before the stage proceeds.

---

## Delegation pattern (multi‑role)

A QFAI custom prompt may delegate to subagents (roles) and then consolidate results.

Recommended delegation rules:

- Delegate **analysis** and **review** (Architect / QA / Code Reviewer) early.
- Delegate **contracts** only when needed (Contract Designer).
- Delegate **CI/gates** verification to DevOps/CI Engineer when changes affect scripts or packaging.

### Subagent response contract (required)

When a subagent is invoked, they MUST respond using this structure:

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
