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
  round 2 reviews the fixes. **The budget is spent the moment round 2 returns
  `REVISE`**: the orchestrator MUST NOT start a third review, and MUST stop and
  escalate to the user with the open findings, the fixes already applied, and a
  recommendation. The decision point is round 2's verdict, never a prediction
  about a review that must not run.
- Escalation is not failure. The artifact stays at its current status and the
  user decides: accept with the finding recorded as an Open Question, apply a
  named fix, or drop the item from scope.
- **Completion after escalation.** The user's decision is the exception to
  "no DONE until all blocking reviewers `PASS`", so the escalation has an exit:
  - _Accept as Open Question_ or _drop from scope_ — the artifact may reach
    DONE with the finding recorded; the reviewer's outstanding `REVISE` is
    superseded by the recorded user decision. Cite the decision where the
    stage records decisions (`*_delta.md` / `07_Decisions.md` / a Change
    Request).
  - _Apply a named fix_ — one **verification review** of exactly that fix is
    permitted and does not consume budget (it is round 2b, not round 3). Its
    remit is the named fix only. It may not raise findings unrelated to that
    fix, but a defect the fix **introduced or exposed** is in remit and MUST be
    reported rather than passed over: verifying only the named lines and
    returning `PASS` while a regression sits next to them is a false `PASS`.
    Such a finding escalates immediately (see the severity floor below) and
    still does not start a round 3. The review returns `PASS` or escalates
    again.
  - **One 2b per artifact, total.** The verification review is free of budget,
    not unbounded: a second escalation on the same artifact MUST NOT be
    answered with another _apply a named fix_ + 2b cycle. Without this cap the
    two rules compose into a loop — 2b costs nothing, and escalating again is
    always allowed — so the gate has no guaranteed end. At the second
    escalation the user is offered only _accept as Open Question_ or _drop the
    item from scope_ (subject to the severity floor below); if the floor
    withholds both, the artifact does not reach DONE and the stage stops with
    the finding recorded.
  - **Severity floor on the exit.** _Accept as Open Question_ is NOT available
    for a finding that names a concrete security defect, data loss or
    corruption, or a correctness defect that would break a released contract.
    Present the user only _apply a named fix_ or _drop the item from scope_ for
    those, and say why the third option is withheld. Without this the general
    exit is a route around "deferring such a finding to an Open Question so a
    `PASS` can be returned is prohibited" — one that needs no lateness and no
    reviewer consent, only a user click.
- The round number MUST be recorded on each reviewer response
  (`Round:` in the shared response template).

### Convergence (MUST)

- A finding first raised in round N > 1 MUST state why it was not raisable in
  round N-1 — the fix introduced it, or the fix exposed it. A finding that was
  raisable in round 1 and was not raised is **out of budget**: record it as an
  Open Question or a `*_delta.md` Decision Record for the owning stage, do not
  block on it.
- A reviewer MUST NOT open a new blocking _class_ of finding after the artifact
  under review has been declared stable. New classes go to the owning stage.
- **Severity overrides lateness.** The out-of-budget rule is about review
  discipline, not about shipping known harm. A late finding that names a
  concrete security defect, data loss or corruption, or a correctness defect
  that would break a released contract is **not** deferrable: the orchestrator
  stops and escalates to the user immediately, exactly as it does when the
  round budget is spent. It is still not a third round — no further review is
  started, the finding goes straight to the user with its evidence. Deferring
  such a finding to an Open Question so a `PASS` can be returned is prohibited.
  That prohibition does not depend on lateness or on who proposes the deferral:
  the escalation exit in the round budget withholds _Accept as Open Question_
  for this same class, so a user choice cannot supersede it either.

### Reviewer remit (in scope per stage)

A finding outside the reviewing stage's remit is recorded and deferred, never
blocking:

| Stage              | In scope                                                          | Out of scope (record and defer)                |
| ------------------ | ----------------------------------------------------------------- | ---------------------------------------------- |
| `/qfai-discussion` | Requirement clarity, scope boundary, decision traceability        | Spec structure, runtime behavior               |
| `/qfai-sdd`        | Spec / contract consistency, testability, traceability edges      | Runtime enforcement correctness, code quality  |
| `/qfai-atdd`       | Obligation coverage, layer placement, annotation validity         | Implementation structure                       |
| `/qfai-implement`  | Code quality, spec alignment of the item, RED/GREEN evidence      | Upstream spec content, contract design         |
| `/qfai-configure`  | Config / manifest validity and the surfaces the run generated     | Spec content, implementation structure         |
| `/qfai-verify`     | Gate execution, evidence completeness, report / artifact fidelity | Authoring quality of the artifacts it verifies |

**Fallback for any stage not listed.** A stage that references this baseline
without a row above has, as its remit, the artifacts that stage itself
produces; everything upstream of them is out of scope, recorded and deferred.
Add the row when a new stage starts routing blocking reviewers, so the
in/out split is not re-derived per run.

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
Round: 1 | 2 | 2b
Result: PASS | REVISE
Findings:
- <issue>
Required fixes:
- <action>
Evidence checked:
- <refs>
```

`Round` is required — the round budget above is counted from it. `2b` is the
post-escalation verification review of a user-named fix.

### Verdict vocabulary

- Reviewer responses in-flight use `Result: PASS | REVISE` (this file).
- `summary.json` archived into review packs historically uses
  `status: "PASS|FAIL"` (validated by
  `packages/qfai/src/core/validators/reviewArtifacts.ts`).
- A `REVISE` verdict during iteration maps to `status: "FAIL"` when the
  final `summary.json` is written; they represent the same outcome.
  Review packs should not invent a third verdict.
