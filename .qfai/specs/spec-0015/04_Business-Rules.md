# 04 Business Rules

## BR-0015-0001: Orchestrator Restrictions

- Orchestrator may only: create work orders, delegate tasks, integrate outputs, present results.
- Orchestrator MUST NOT: generate primary artifact first draft, serve as Reviewer, skip delegation.

## BR-0015-0002: Capability Probe Before Delegation

- Run one harmless Probe Task once at stage start to check subagent availability.
- If unavailable, ask for Simulation mode approval. Without approval, stop.

## BR-0015-0003: Simulation Mode Opt-In

- Allowed only when user explicitly states `Simulation mode allowed`.
- Record: simulated reason and user approval reference.

## BR-0015-0004: Devils-Advocate Gate

- `can_be_na: false` -- N/A is not allowed for devils-advocate.
- FAIL must include concrete alternative. Bare negation is invalid.
- 3 consecutive FAILs trigger advisory demotion (current cycle only).

## BR-0015-0005: Pattern-Doubler Gate

- `can_be_na: true` -- N/A is default when no ID-bearing items exist.
- Sets 2x target for current ID-bearing items (US/AC/BR/EX/TC).
- Rationale required for each proposed addition.

## BR-0015-0006: Work Orders Schema

- Every major artifact must include Work Orders Summary with columns: Step, Role, Task title, Input refs, Output refs, Status (PASS/REVISE).

## BR-0015-0007: All-Reviewer Alternative Obligation

- Every reviewer MUST provide concrete alternative or fix on FAIL.
- Feedback without concrete alternative is invalid and triggers re-judgment.
