# QFAI Default Workflow

QFAI standardizes work into a fixed pipeline:

**SDD → ATDD → TDD → Implementation → Verification**

This file defines the canonical stages and delegation expectations.

---

## Absolute Rule — Output Language

**All outputs MUST be written in the user’s working language for this session.**

---

## Change Type (Mandatory)

At the start of any work, classify the change and record it in:

- `delta.md` Change Log (latest CL entry)
- PR description (Change Type section)

Allowed values:

- Primary: `Initial | Behavior | Structural | Ops`
- Tags (optional): `@ui @api @db @nfr @docs @test`

Do not proceed without a declared Change Type.

---

## Stages (canonical)

0. Steering refresh (project memory bootstrap)
1. Discussion (optional): clarify idea → requirement seed
2. Requirements: requirements document in `.qfai/require/`
3. Specification (SDD): `.qfai/specs/spec-XXXX/`
4. Scenario tests (ATDD): runnable scenario tests derived from `scenario.feature`
5. Unit tests (TDD): runnable unit tests enforcing the spec
6. Implementation: implement to satisfy spec + tests
7. Verify: run quality gates and provide evidence

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

---

## Evidence policy

At the end of each stage, report:

- what changed (file list)
- what was executed (commands)
- whether it passed (PASS/FAIL)

Never claim completion without evidence.
