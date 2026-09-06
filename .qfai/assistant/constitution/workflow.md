# QFAI Default Workflow

QFAI standardizes work into a fixed pipeline:

## SDD -> ATDD -> TDD -> Verification

This file defines the canonical stages and delegation expectations.

---

## Absolute Rule — Output Language

**All outputs MUST be written in the user’s working language for this session.**

---

## Change Type (Mandatory)

At the start of any work, classify the change and record it in:

- `09_delta.md` `## Change Summary` (latest `DELTA-NNNN` entry)
- PR description (Change Type section)

Allowed values:

- Primary: `Initial | Behavior | Structural | Ops`
- Tags (optional): `@api @db @nfr @docs @test`

These values are restated from `.qfai/assistant/constitution/change-classification.md` (SSOT). See `change-classification.md#2-tags-multi-select` for each tag's trigger condition and examples; a tag not listed there is dropped by every consumer.

Do not proceed without a declared Change Type.

---

## Drift Protocol (Mandatory)

- Read and enforce `.qfai/assistant/constitution/drift-protocol.md`.
- Downstream phases must not edit upstream SSOT artifacts without explicit user approval.
- If drift is required, STOP and raise a Change Request (3 options + recommendation), then wait for approval and rerun the owner skill.
- The STOP is scoped: it halts the affected upstream artifact and every downstream item that depends on it, which the Change Request enumerates. Unaffected items continue, and more than one Change Request may be open at once — see `drift-protocol.md#multiple-open-change-requests`.

## Test-layer policy (Mandatory)

- Read and enforce `.qfai/assistant/catalog/test-layers.md`.
- Treat floors/ratios as signals, not completion gates.
- Completion gate is `npx qfai validate --fail-on error` with evidence.

---

## Stages (canonical)

0. Steering refresh (project memory bootstrap)
1. Discussion (optional): clarify idea → requirement seed
2. Requirements: discussion pack in `.qfai/discussion/`
3. Specification (SDD): unified preflight + `_policies` / `spec-*/01..10`
4. Prototyping (optional): contract-aligned implementation skeleton
5. Acceptance tests (ATDD): runnable E2E/API/Integration tests derived from specs/contracts obligations (`US` / `TC` / `CON-API`)
6. Implementation (TDD): `/qfai-implement` drives the Red/Green/Refactor micro-cycle one `test-list.md` row at a time
7. Verify: run quality gates and provide evidence

Stage 3 (`/qfai-sdd`) target policy:

- With argument (`/qfai-sdd <spec-id-or-name>`): scope is the matched single spec only.
- Without argument (`/qfai-sdd`): scope is all capabilities from `.qfai/specs/_policies/03_Capabilities.md` in order.
- `/qfai-sdd` must create or refresh `.qfai/specs/_policies/11_Slice-Policy.md` before deciding whether a spec change is CREATE / UPDATE / DELETE.
- For no-argument batch runs, execute Contracts-first and Outline once, then delegate Slice/Plan/Delta in parallel per target spec.

Prototyping stage policy:

- `/qfai-prototyping` scope is governed by Article VII § Prototyping exception (scope floor) in `.qfai/assistant/constitution/constitution.md` — the single home for both the scope floor and the Change Request exception to it. Do not restate the floor here; on any overlap between this file and the constitution, the constitution wins.
- Completion requires prototyping evidence (markdown + json in `.qfai/evidence/`) and `npx qfai validate --profile prototyping --fail-on error` pass. The profile is explicit on purpose: an omitted `--profile` defaults to `full`, which runs the ATDD traceability rules (`QFAI-ATDD-111/112/113`) at severity `error` — obligations of stage 5, which has not run yet at stage 4.
- The `/qfai-verify` run that feeds `npx qfai prototyping certify` writes `.qfai/report/verify.json` with `scope: "prototyping"`; certify accepts no other scope. See the Verify Output Contract in `.qfai/assistant/skills/qfai-verify/SKILL.md`.
- Coverage gaps (missing spec rows, unresolved declared checks, API 404) are blocking.

Implementation stage:

- `/qfai-implement` orchestrates the full TDD micro-cycle (Red/Green/Refactor) one test at a time using `test-list.md` as the execution ledger.
- Each item requires watch it fail (RED observation confirmed), watch it pass
  (GREEN observation confirmed), and fresh evidence (command+result pairs, not
  status-only). A RED is admissible only when an assertion — or an
  expected-exception check — inside the row's own `Selector` raised the failure;
  a collection, import, syntax or fixture error, or an unasserted throw, is a
  missing seam, not a RED
  (`skills/qfai-implement/references/red-admissibility.md`).
  - **Exception — RED not observable.** When the obligation is already satisfied
    by a sibling row, the RED cannot be observed. The row then carries
    falsifiability evidence in place of the RED pair; see
    `.qfai/assistant/skills/qfai-implement/references/red-not-observable.md`.
  - Weakening a correct test to manufacture a RED is forbidden.
- Completion requires independent spec review and code quality review gates — both must PASS before an item is marked done.
- Parallel execution is allowed only for independent slices with no shared state.

Legacy note:

- The three legacy TDD skills were abolished. Use `/qfai-implement` instead.

### Concurrency (stage-independent, mandatory)

This subsection binds **every** stage that delegates in parallel, including
`/qfai-sdd` no-argument batch runs and `/qfai-implement` slice execution. It is
a real heading so `workflow.md#concurrency-stage-independent-mandatory` resolves
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

1. Check these steering files:
   - `.qfai/assistant/catalog/manifest.md`
   - `.qfai/assistant/catalog/product.md`
   - `.qfai/assistant/catalog/structure.md`
   - `.qfai/assistant/catalog/tech.md`
2. Detect incomplete content (empty sections, placeholder-only lines, `<...>`, `TBD`, outdated facts).
3. If the current stage can fill missing facts from repository evidence, update the steering files immediately.
4. If information cannot be verified, record Open Questions and ask the user.
5. Even when steering is already complete, update it when new facts are discovered during the stage.

Do not continue downstream work on stale steering.

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
