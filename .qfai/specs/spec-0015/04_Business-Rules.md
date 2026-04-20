# 04 Business Rules

## BR-0015-0001: Orchestrator Restrictions

- AC-Refs: AC-0015-0001

- Orchestrator may only: create work orders, delegate tasks, integrate outputs, present results.
- Orchestrator MUST NOT: generate primary artifact first draft, serve as Reviewer, skip delegation.

## BR-0015-0002: Capability Probe By Real Delegation

- AC-Refs: AC-0015-0011

- Attempt the first required delegation at stage start; do not use preflight availability confirmation as the execution gate.
- Treat that first real delegation attempt as the capability check.

## BR-0015-0003: Delegation Failure Hard Stop Output

- AC-Refs: AC-0015-0012

- If the first required delegation fails, stop immediately.
- Do not simulate roles and do not continue with self-execution.
- Report: attempted role, attempted task, failure summary, why the stage stopped, required user remediation, and retry condition.

## BR-0015-0004: Devils-Advocate Gate

- AC-Refs: AC-0015-0004

- `can_be_na: false` -- N/A is not allowed for devils-advocate.
- FAIL must include concrete alternative. Bare negation is invalid.
- 3 consecutive FAILs trigger advisory demotion (current cycle only).

## BR-0015-0005: Pattern-Doubler Gate

- AC-Refs: AC-0015-0005

- `can_be_na: true` -- N/A is default when no ID-bearing items exist.
- Sets 2x target for current ID-bearing items (US/AC/BR/EX/TC).
- Rationale required for each proposed addition.

## BR-0015-0006: Work Orders Schema

- AC-Refs: AC-0015-0006

- Every major artifact must include Work Orders Summary with columns: Step, Role, Task title, Input refs, Output refs, Status (PASS/REVISE).

## BR-0015-0007: All-Reviewer Alternative Obligation

- AC-Refs: AC-0015-0007

- Every reviewer MUST provide concrete alternative or fix on FAIL.
- Feedback without concrete alternative is invalid and triggers re-judgment.
