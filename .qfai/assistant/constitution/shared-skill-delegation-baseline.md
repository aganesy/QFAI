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

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | -------------------- |
| 1    | <role>           | <instance id>  | <task>     | <refs>       | <refs>        | PASS/REVISE          |

- `Output (refs)` should point to in-file anchors or relative evidence paths.
- `Agent instance` is a run-stable identifier for the sub-agent that actually performed the step
  (platform-supplied id where available, otherwise `<role>#<n>` assigned in order of first use).
  It exists so an author→reviewer collision is detectable after the fact from the evidence alone;
  the same instance appearing in an authoring step and in a review step over the same artifact is
  a reviewer-independence violation.

## Reviewer Gate Baseline

- Final completion gate must be delegated to an independent reviewer.

### Definition: independent reviewer (NORMATIVE)

An **independent reviewer** is a sub-agent that did **not** author or edit any artifact under
review in this run.

- The protected invariant is independence from authorship, not reviewer instance identity.
  An agent that produced or modified none of the artifacts under review is independent even if
  it filled another role earlier in the run; an agent that drafted or edited one of them is not
  independent, however it is routed.
- Independence is judged per review target, over the whole run — not per phase. Authoring in an
  earlier phase disqualifies the agent from reviewing that artifact in a later one.
- Role name alone never establishes independence. Routing dispatches by role; independence is a
  separate constraint the routed agent must satisfy and attest to.
- A reviewer that discovers it authored or edited a review target MUST stop, declare the
  conflict, and hand the same evidence set to a non-participating reviewer. It MUST NOT return
  `PASS` on an artifact it authored.
- This definition governs every skill. Skill-local wording (e.g. `qfai-configure`'s "a reviewer
  who did not modify the config") is an instance of it, not a competing rule.

- Reviewers must verify Drift Protocol enforcement.
- Reviewers must verify test-layer policy enforcement when relevant.
- Do not treat test volume ratios or floors as hard gates unless the skill explicitly says so.
- Do not declare DONE until all routed blocking reviewers return `PASS`.
- Every reviewer returning `FAIL` or `REVISE` must include a concrete fix proposal.

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
Authored/edited under review: none | <artifact refs this reviewer authored or edited in this run>
Findings:
- <issue>
Required fixes:
- <action>
Evidence checked:
- <refs>
```

- `Authored/edited under review` is REQUIRED. A response omitting it is not a valid review verdict.
- Anything other than `none` is a declared independence conflict: the verdict cannot be `PASS`,
  and the review must be handed to a non-participating reviewer (see
  `Definition: independent reviewer`).

### Verdict vocabulary

- Reviewer responses in-flight use `Result: PASS | REVISE` (this file).
- `summary.json` archived into review packs historically uses
  `status: "PASS|FAIL"` (validated by
  `packages/qfai/src/core/validators/reviewArtifacts.ts`).
- A `REVISE` verdict during iteration maps to `status: "FAIL"` when the
  final `summary.json` is written; they represent the same outcome.
  Review packs should not invent a third verdict.
