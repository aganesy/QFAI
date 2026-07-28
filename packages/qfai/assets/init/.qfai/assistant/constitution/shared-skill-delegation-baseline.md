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
3. If the delegation fails, classify the failure first (see `Delegation Failure Taxonomy`), then apply the response for that class. Never simulate roles and never continue with self-execution, whatever the class.

### Delegation Failure Taxonomy (MUST)

Every delegation failure belongs to exactly one of two classes.

| Class | Meaning | Sanctioned response |
| ----- | ------- | ------------------- |
| `unavailable` | The host has no usable delegation mechanism, the role is unknown, or the failure is a configuration / tooling gap only the user can close. | Hard stop. |
| `saturated` | The host can delegate but is momentarily out of budget — `agent thread limit reached`, concurrency cap, queue full, rate limit, busy pool. The identical call would succeed later with no change by anyone. | Bounded wait-and-retry on the same stage. |

- Classify from the raw failure reason. A reason naming a limit, cap, quota, queue, rate, slot, or busy pool is `saturated`; anything else defaults to `unavailable`.
- `saturated` never authorises self-execution of a primary artifact or of a blocking review, and never authorises discarding stage progress.
- When the `saturated` retry budget is exhausted, fall through to the hard stop and report the class as `saturated (retry budget exhausted)`.

### Delegation Failure — `saturated` (Bounded Retry)

- Retry the identical delegation with backoff: 30s, then 60s, then 120s. Attempt cap: 3 retries per work order.
- Do not re-scope, re-plan, or re-route the work order between retries — same role, same task.
- The stage stays open and resumable across the wait; completed work orders keep their `PASS` status.
- Report on entering the retry loop and on its outcome:
  - `Delegation deferred: <raw reason or concise summary>`
  - `Failure class: saturated`
  - `Attempted role: <role>`
  - `Attempted task: <task title>`
  - `Retry condition: retry after <N> seconds / when a delegation slot frees`
  - `Attempts used: <n>/3`
  - `Stage state: held open and resumable — no stage progress discarded`

### Delegation Failure (Hard Stop)

Applies to `unavailable`, and to `saturated` once the retry budget is exhausted.

- Report all of:
  - `Delegation failure: <raw reason or concise summary>`
  - `Failure class: unavailable | saturated (retry budget exhausted)`
  - `Attempted role: <role>`
  - `Attempted task: <task title>`
  - `Why stopped: QFAI requires real sub-agent delegation in this environment.`
  - `User action needed: <settings or tooling changes required — or "none; wait for a delegation slot to free" when the class is saturated>`
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

### Reviewer budget exhausted

A blocking review that cannot be delegated because the agent budget is spent is a `saturated`
failure, not a licence to skip the gate or to self-review.

- First apply the `saturated` bounded retry. A freed slot is the preferred outcome.
- If retries are exhausted, a reviewer role MAY be reused sequentially with a cleared context,
  provided the reviewer did not author or edit any artifact under review in this run. The
  protected invariant is independence from authorship, not reviewer instance identity.
- Record the reuse in the Work Orders Summary (`Task title` prefixed `re-review (sequential reuse)`).
- If even sequential reuse is impossible, hard stop with the review gate recorded as `PENDING`
  rather than `PASS`. `PENDING` is not `PASS`; DONE stays blocked and the stage stays resumable.
- Never record a waived or self-performed review as `PASS`.

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
