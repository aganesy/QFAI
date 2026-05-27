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

## BR-0015-0008: Reviewer-Gate cycle-check is structural

- AC-Refs: AC-0015-0013
- Reviewer Gate's `R-CERTIFY-VERIFY-CIRCULAR` check MUST be structural: it inspects the certify code path (and its imported validator-output reads) without re-running the certify pipeline.
- The check asserts the option-B path (chosen by the orchestrator's upstream deferred-OQ decision) is preserved — i.e. certify reads NO validator output whose profile requires `/qfai-atdd` or `/qfai-implement` artifacts at the prototyping phase.
- A natural-language reviewer assessment is NOT a substitute for the structural assertion; if the structural assertion fails, the gate emits the finding regardless of reviewer prose.
- The finding `justification:` MUST name (a) the certify code path that performs the offending read, (b) the validator-output file / profile whose artifact requirements include `/qfai-atdd` or `/qfai-implement`, (c) the option-B contract clause violated.

## BR-0015-0009: Reviewer-Gate `R-PROMPT-SCANNER-DRIFT` justification 3-part contract

- AC-Refs: AC-0015-0014
- When the upstream SSOT-sync-pair CI lane in spec-0004 signals drift, the Reviewer Gate MUST emit `R-PROMPT-SCANNER-DRIFT` at severity error.
- The `justification:` field MUST be non-empty (trimmed length > 0) AND MUST contain 3 elements: (a) modified file path, (b) un-paired counterpart path, (c) the specific contract clause whose match cannot be confirmed. The 3-part contract is the SSOT shared with the spec-0004 ingestion rule (one contract, two enforcers — Reviewer-Gate is the emitter, validate is the rejector).
- Empty / whitespace-only / structurally-incomplete `justification:` MUST be rejected by spec-0004's validate ingestion as advisory-failing error (R-WORKLOG-DRIFT family pattern reused; NFR-0115 justification-text contract reuse).
