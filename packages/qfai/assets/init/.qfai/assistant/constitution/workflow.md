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

- `09_delta.md` Change Log (latest CL entry)
- PR description (Change Type section)

Allowed values:

- Primary: `Initial | Behavior | Structural | Ops`
- Tags (optional): `@ui @api @db @nfr @docs @test`

Do not proceed without a declared Change Type.

---

## Drift Protocol (Mandatory)

- Read and enforce `.qfai/assistant/constitution/drift-protocol.md`.
- Downstream phases must not edit upstream SSOT artifacts without explicit user approval.
- If drift is required, STOP and raise a Change Request (3 options + recommendation), then wait for approval and rerun the owner skill.

## Test-layer policy (Mandatory)

- Read and enforce `.qfai/assistant/catalog/test-layers.md`.
- Treat floors/ratios as signals, not completion gates.
- Completion gate is `qfai validate --fail-on error` with evidence.

---

## Stages (canonical)

0. Steering refresh (project memory bootstrap)
1. Discussion (optional): clarify idea → requirement seed
2. Requirements: discussion pack in `.qfai/discussion/`
3. Specification (SDD): unified preflight + `_policies` / `spec-*/01..10`
4. Prototyping (optional): contract-aligned implementation skeleton
5. Acceptance tests (ATDD): runnable E2E/API/Integration tests derived from specs/contracts obligations (`US` / `TC` / `CON-API`)
6. Verify: run quality gates and provide evidence

Stage 3 (`/qfai-sdd`) target policy:

- With argument (`/qfai-sdd <spec-id-or-name>`): scope is the matched single spec only.
- Without argument (`/qfai-sdd`): scope is all capabilities from `.qfai/specs/_policies/03_Capabilities.md` in order.
- `/qfai-sdd` must create or refresh `.qfai/specs/_policies/11_Slice-Policy.md` before deciding whether a spec change is CREATE / UPDATE / DELETE.
- For no-argument batch runs, execute Contracts-first and Outline once, then delegate Slice/Plan/Delta in parallel per target spec.

Prototyping stage policy:

- `/qfai-prototyping` scope is fixed to **ALL specs** discovered from `.qfai/specs/spec-*`.
- Completion requires prototyping evidence (markdown + json in `.qfai/evidence/`) and `qfai validate --fail-on error` pass.
- Coverage gaps (missing spec rows, unresolved declared checks, API 404) are blocking.

Implementation stage:

- `/qfai-implement` orchestrates the full TDD micro-cycle (Red/Green/Refactor) one test at a time using `test-list.md` as the execution ledger.
- Each item requires watch it fail (RED observation confirmed), watch it pass
  (GREEN observation confirmed), and fresh evidence (command+result pairs, not
  status-only).
  - **Exception — RED not observable.** When the obligation is already satisfied
    by a sibling row, the RED cannot be observed. The row then carries
    falsifiability evidence in place of the RED pair; see
    `.qfai/assistant/skills/qfai-implement/references/red-not-observable.md`.
  - Weakening a correct test to manufacture a RED is forbidden.
- Completion requires independent spec review and code quality review gates — both must PASS before an item is marked done.
- Parallel execution is allowed only for independent slices with no shared state; worktree separation is required.

Legacy note:

- The three legacy TDD skills were abolished. Use `/qfai-implement` instead.

### Stage 0 — Steering refresh contract (mandatory)

At the beginning of each stage (`qfai-discussion`, `qfai-sdd`, `qfai-prototyping`, `qfai-atdd`, `qfai-verify`):

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
- In CI, use default/full validation (`qfai validate --fail-on error`); `--phase refinement` is local-only.
- Waivers are for `warning` / `info` findings only. Waivers targeting `error` findings are treated as configuration errors and must fail.

---

## Evidence policy

At the end of each stage, report:

- what changed (file list)
- what was executed (commands)
- whether it passed (PASS/FAIL)

Never claim completion without evidence.
