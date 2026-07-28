# Shared Skill Delegation Baseline

Use this document to keep SKILL bodies compact.
Skill files should reference this baseline and only add role-, stage-, or gate-specific rules.

## Sub-agent Delegation (MANDATORY)

### Orchestrator Protocol (MUST)

- The orchestrator may create work orders, delegate tasks, integrate outputs, and present results.
- The orchestrator must not generate the primary artifact first draft.
- The orchestrator must not self-approve or act as reviewer for convenience.

### Capability Probe (MUST)

1. Attempt the first required delegation at stage start using the platform's native delegation mechanism.
2. Treat that first real delegation attempt as the capability check. Do not gate execution on preflight availability questions or synthetic probe-only checks.
3. If the delegation fails, stop the stage immediately. Do not simulate roles and do not continue with self-execution.

### Delegation Failure (Hard Stop)

- Report all of:
  - `Delegation failure: <raw reason or concise summary>`
  - `Attempted role: <role>`
  - `Attempted task: <task title>`
  - `Why stopped: QFAI requires real sub-agent delegation in this environment.`
  - `User action needed: <settings or tooling changes required>`
  - `Retry condition: rerun after the required delegation succeeds`

## Work Orders Summary

Every major artifact in the stage should include this table schema:

| Step | Role (sub-agent) | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ---------- | ------------ | ------------- | -------------------- |
| 1    | <role>           | <task>     | <refs>       | <refs>        | PASS/REVISE          |

- `Output (refs)` should point to in-file anchors or relative evidence paths.

## Reviewer Gate Baseline

- Final completion gate must be delegated to an independent reviewer.
- Reviewers must verify Drift Protocol enforcement.
- Reviewers must verify test-layer policy enforcement when relevant.
- Do not treat test volume ratios or floors as hard gates unless the skill explicitly says so.
- Do not declare DONE until all routed blocking reviewers return `PASS`.
- Every reviewer returning `FAIL` or `REVISE` must include a concrete fix proposal.

### Round budget (MUST)

- **Two rounds per reviewer per artifact.** Round 1 is the initial review;
  round 2 reviews the fixes. If a blocking reviewer would return `REVISE` a
  third time, the orchestrator MUST stop and escalate to the user with the
  open findings, the fixes already applied, and a recommendation — it MUST NOT
  start another round.
- Escalation is not failure. The artifact stays at its current status and the
  user decides: accept with the finding recorded as an Open Question, apply a
  named fix, or drop the item from scope.
- The round number MUST be recorded on each reviewer response.

### Convergence (MUST)

- A finding first raised in round N > 1 MUST state why it was not raisable in
  round N-1 — the fix introduced it, or the fix exposed it. A finding that was
  raisable in round 1 and was not raised is **out of budget**: record it as an
  Open Question or a `*_delta.md` Decision Record for the owning stage, do not
  block on it.
- A reviewer MUST NOT open a new blocking *class* of finding after the artifact
  under review has been declared stable. New classes go to the owning stage.

### Reviewer remit (in scope per stage)

A finding outside the reviewing stage's remit is recorded and deferred, never
blocking:

| Stage | In scope | Out of scope (record and defer) |
| ----- | -------- | ------------------------------- |
| `/qfai-discussion` | Requirement clarity, scope boundary, decision traceability | Spec structure, runtime behavior |
| `/qfai-sdd` | Spec / contract consistency, testability, traceability edges | Runtime enforcement correctness, code quality |
| `/qfai-atdd` | Obligation coverage, layer placement, annotation validity | Implementation structure |
| `/qfai-implement` | Code quality, spec alignment of the item, RED/GREEN evidence | Upstream spec content, contract design |

## Work order template

```text
Task title: <short>
Role: <sub-agent role>
Goal: <what to decide/produce>
Inputs (refs):
- <file/section>
Constraints:
- must: enforce Drift Protocol
- must: follow applicable test-layer or validation policy
- must_not: patch upstream artifacts directly when owner rerun is required
Output format:
- <headings / bullet schema>
Quality bar:
- PASS if ...
- REVISE if ...
```

## Reviewer response template

```text
Result: PASS | REVISE
Findings:
- <issue>
Required fixes:
- <action>
Evidence checked:
- <refs>
```

### Verdict vocabulary

- Reviewer responses in-flight use `Result: PASS | REVISE` (this file).
- `summary.json` archived into review packs historically uses
  `status: "PASS|FAIL"` (validated by
  `packages/qfai/src/core/validators/reviewArtifacts.ts`).
- A `REVISE` verdict during iteration maps to `status: "FAIL"` when the
  final `summary.json` is written; they represent the same outcome.
  Review packs should not invent a third verdict.
