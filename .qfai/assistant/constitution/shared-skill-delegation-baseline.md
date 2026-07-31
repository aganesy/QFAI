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

### Commit Scoping (MUST)

- A delegated agent stages only the paths it declared as deliverables in its
  work order: `git add <path> …`.
- `git add -A`, `git add .` and `git commit -a` are forbidden for delegated
  agents, in both isolation modes. In degraded / shared-index mode the
  concurrent agents share one index, so a sweeping stage command commits a
  sibling agent's in-flight files and misattributes work in the audit trail.
  Under worktree separation there is no shared index and no sibling file to
  sweep, but the command still stages everything else loose in that agent's own
  worktree, so the commit still stops matching its declared deliverables.
- When the agent's deliverable paths are not known up front, it hands back an
  unstaged diff and the orchestrator commits — under the same rule. The
  orchestrator commits one handed-back diff at a time, stages that agent's
  declared paths only, and is equally forbidden from `git add -A` / `git add .`
  / `git commit -a` while a parallel stage is in flight. Being the committer
  does not exempt it; in degraded mode it is the only committer, so a sweeping
  stage there mixes every sibling's work into one commit.
- Isolation requirements for concurrent stages are defined once in
  `constitution/workflow.md#concurrency-stage-independent-mandatory`.

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
