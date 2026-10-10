# Shared Skill Delegation Baseline

Skills cite this baseline and add only role, stage or gate overrides.

## Sub-agent Delegation (MANDATORY)

This section binds every skill and step. A skill or step repeats none of it
and adds no placeholder for a subsection it does not change. State only an
override, under the subsection it overrides.

Delegation is optional. The session agent, called the orchestrator below, may
author any artifact itself. It uses a sub-agent only for work that runs in
parallel and for a review that someone other than the author should do. The
griller of a delegated grilling session is such a review: it examines decisions
it did not author, before the draft rather than after it. A fact lookup a
grilling session dispatches is parallel work: the session asks the rest of the
frontier while the lookup runs.
Whatever the skill, a role is never simulated, and a failed delegation is
classified by the taxonomy below before any response.

### Orchestrator Protocol

- The orchestrator may author any artifact itself, or give independent parts of
  the work to sub-agents that run in parallel. It integrates and presents the
  results.
- The orchestrator is not required to wait while a sub-agent runs. Where the
  host starts a delegation and returns at once, delivers the finished result
  later as a message, and lets the orchestrator wait for a result on purpose,
  the orchestrator carries on with its own work meanwhile and waits only when
  it has none. A host without all three keeps the orchestrator waiting.
- That work is planning, preparing the next work order, integrating results
  already returned, and its own part of the task. It never repeats the work it
  handed out. Starting another delegation needs the independence conditions of
  `.qfai/assistant/skill/qfai-implement/references/parallelization-policy.md`.
  Where the stage's ledger or a seam makes an ordering mandatory, carrying on
  does not override it.
- A review is done by an agent that did not author what it reviews. The
  orchestrator never reviews its own work and never approves it for
  convenience.
- A read-only agent never runs `git checkout` or `git switch` in a worktree it
  shares; it reads other revisions with `git show <rev>:<path>`. Each agent
  writes scratch files only under a path of its own.
- Give each reviewer a fixed commit. Leave the checkout alone until reviews
  return. Only read-only fixed-SHA `git show` reviews permit clean switches.
  Writers, local gates and reviews using live files or checkout-dependent
  execution must finish first.

### Worker edit boundary

The work order names the checkout assigned to the task by the host, the worker's
write paths and the permitted edit method. Creating a Git worktree does not
grant the host's tools permission to edit it. Even an assigned checkout can
receive a refusal; verify the actual edit result rather than claiming access.

If an edit is refused, stop writes to that target. Report the tool, working
directory, target path and refusal text, omitting secrets. Return the owned
paths and a reviewable diff that can be prepared within the worker's permitted
area. Do not bypass the refusal through a shell, script or another tool.
This does not forbid shell authoring where the host already permits it.

The orchestrator checks the diff against the current files in its own permitted
checkout before applying it. If that edit is refused too, leave the application
pending and continue only independent work. Follow the existing worktree or
shared-index mode in `.qfai/assistant/rule/workflow.md#concurrency-stage-independent-mandatory`
when assigning writers and integrating their paths.

### Capability Probe (MUST)

1. No delegation attempt is required at the start of a stage. The orchestrator
   delegates only when it chooses to.
2. When it does, the real delegation attempt is the capability check. Do not
   gate execution on preflight availability questions or synthetic probe-only
   checks.
3. If the delegation fails, classify the failure first (see
   `Delegation Failure Taxonomy`), then apply the response for that class.
   Never simulate a role.

### Delegation Failure Taxonomy (MUST)

Every delegation failure belongs to exactly one of two classes.

| Class         | Meaning                                                                                                                                                                                                     | Sanctioned response                                                                                             |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `unavailable` | The host has no usable delegation mechanism, the role is unknown, or the failure is a configuration / tooling / quota gap only the user can close — including a limit that waiting cannot clear.            | The orchestrator does the work itself. A review someone other than the author has to do stops the stage instead |
| `saturated`   | The host can delegate but is momentarily out of budget — `agent thread limit reached`, concurrency cap, queue full, rate limit, busy pool. The identical call would succeed later with no change by anyone. | Bounded wait-and-retry of the identical delegation                                                              |

- Classify from the raw failure reason, and classify `saturated` only when the reason states or plainly implies that the identical call would succeed later **with no change by anyone**: a queue or pool that is currently full, a rate limit with a retry window, a concurrency cap that is momentarily reached, an explicit "try again later".
- A limit or quota that only a user can lift is `unavailable`, not `saturated` — a configured concurrency cap of 0, a maximum delegation depth, an input-size limit, an exhausted account quota or plan. Waiting cannot clear those, so a retry loop would only delay the response.
- When retryability is not explicit, default to `unavailable`.
- When the `saturated` retry budget is exhausted, handle the failure as `unavailable` and report the class as `saturated (retry budget exhausted)`.

### Delegation Failure — `saturated` (Bounded Retry)

- Retry the identical delegation with backoff: 30s, then 60s, then 120s. Attempt cap: 3 retries per delegation.
- Do not re-scope, re-plan, or re-route the delegation between retries — same role, same task.
- Report on entering the retry loop and on its outcome:
  - `Delegation deferred: <raw reason or concise summary>`
  - `Failure class: saturated`
  - `Attempted role: <role>`
  - `Attempted task: <task title>`
  - `Retry condition: retry after <N> seconds / when a delegation slot frees`
  - `Attempts used: <n>/3`

### Delegation Failure — `unavailable` (The Orchestrator Does The Work)

- The orchestrator does the work itself and reports it as its own, never as the
  attempted role's.
- Report all of:
  - `Delegation failure: <raw reason or concise summary>`
  - `Failure class: unavailable | saturated (retry budget exhausted)`
  - `Attempted role: <role>`
  - `Attempted task: <task title>`
  - `Done by: the orchestrator`
- A review someone other than the author has to do is the exception. The
  orchestrator does not do it, and the stage stops under the hard stop below.

### Delegation Failure (Hard Stop)

Applies when the failed delegation is a review someone other than the author
has to do, and the class is `unavailable` or
`saturated (retry budget exhausted)`.

- Report all of:
  - `Delegation failure: <raw reason or concise summary>`
  - `Failure class: unavailable | saturated (retry budget exhausted)`
  - `Attempted role: <role>`
  - `Attempted task: <task title>`
  - `Why stopped: this review needs a reviewer that did not author the work.`
  - `User action needed: <settings or tooling changes required — or "none; wait for a delegation slot to free" when the class is saturated>`
  - `Retry condition: rerun after the review delegation succeeds`

### Commit Scoping

- A delegated agent stages only the paths it declared as deliverables in its work order: `git add <path> …`.
- `git add -A`, `git add .` and `git commit -a` are forbidden for delegated agents, in both isolation modes. In degraded / shared-index mode the concurrent agents share one index, so a sweeping stage command commits a sibling agent's in-flight files and misattributes work in the audit trail. Under worktree separation the command still stages whatever else is loose in that agent's own worktree.
- When the agent's deliverable paths are not known up front, it hands back an unstaged diff and the orchestrator commits — under the same rule. The orchestrator commits one handed-back diff at a time, stages that agent's declared paths only, and is equally forbidden from `git add -A` / `git add .` / `git commit -a` while a parallel stage is in flight. Being the committer does not exempt it.
- Isolation requirements for concurrent stages are defined once in `.qfai/assistant/rule/workflow.md#concurrency-stage-independent-mandatory`.

### Host backstops above the declared shape

Read `.qfai/assistant/rule/references/host-backstops.md` when you set or read a host limit on agents, or a run stops at one. It holds the backstops each host applies above the declared shape and how to leave room for them. Not needed when no host limit is involved.

## Work Orders Summary

A stage that fans work out to agents in parallel records the fan-out in this table:

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1    | <role>           | <instance id>  | <task>     | <refs>       | <refs>        | PASS/REVISE/PENDING          |

- `Output (refs)` should point to in-file anchors or relative evidence paths.
- `Agent instance` is a run-stable identifier for the sub-agent that actually performed the step (platform-supplied id where available, otherwise `<role>#<n>` assigned in order of first use). It exists so an author→reviewer collision is detectable after the fact from the evidence alone; the same instance appearing in an authoring step and in a review step over the same artifact is a
  reviewer-independence violation.
- `PENDING` records a gate that could not be run — the only honest status for the exhausted-budget branch below, which mandates it. It is never a substitute for `PASS`: DONE stays blocked while any row is `PENDING`. A skill that allows only `PASS`/`REVISE` would force an agent on that path to either break the schema or mislabel an unrun gate.

## Reviewer Gate Baseline

Every skill and step inherits this gate. Its own reviewer gate names only the
checks specific to its artifacts; the Drift Protocol, test-layer and
signals-not-gates bullets below, and the `PASS` / `REVISE` vocabulary, are not
restated. A skill with no check of its own carries no reviewer gate section. A
stage that runs several steps is reviewed once, after its last step, by the one
review its parent names
(`.qfai/assistant/rule/shared-skill-operating-baseline.md#running-steps-mandatory`).

- Final completion gate must be delegated to an independent reviewer, except where the skill runs no review: `qfai-triage` invoked by name, and a `qfai-verify` run that wrote nothing.
- Each reviewer records an explicit PASS or REVISE for the reviewed revision.
- The one exception: a work order that names no required reviewer is reviewed
  by none, and the two bullets above then have nothing to apply to.

### Definition: independent reviewer (NORMATIVE)

An **independent reviewer** is a sub-agent that did **not** author or edit any artifact under review in this run.

- The protected invariant is independence from authorship, not reviewer instance identity. An agent that produced or modified none of the artifacts under review is independent even if it filled another role earlier in the run; an agent that drafted or edited one of them is not independent, however it is routed.
- Independence is judged per review target, over the whole run — not per phase. Authoring in an earlier phase disqualifies the agent from reviewing that artifact in a later one.
- Role name alone never establishes independence. Routing dispatches by role; independence is a separate constraint the routed agent must satisfy and attest to.
- A reviewer that discovers it authored or edited a review target must stop, declare the conflict, and hand the same evidence set to a non-participating reviewer. It must not return `PASS` on an artifact it authored.
- This definition governs every skill. Skill-local wording (e.g. `qfai-configure`'s "a reviewer who did not modify the config") is an instance of it, not a competing rule.

**The reviewer gate is not self-verification.** Model guidance advising "don't
use subagents to verify your own work" does not apply to this gate. The
definition above already excludes an agent reviewing its own output. The author
cannot accept its own output.

- Reviewers must verify Drift Protocol enforcement
  (`.qfai/assistant/rule/drift-protocol.md`).
- Reviewers must verify test-layer policy enforcement when relevant
  (`.qfai/assistant/rule/test-layers.md`).
- Test volume ratios, floors and planning estimates are signals, not gates,
  unless the skill explicitly says so.
- Do not declare DONE until every finding of its one review is fixed or answered, as `.qfai/assistant/rule/review-convergence.md` sets out.
- An in-scope blocking finding from a routed reviewer prevents DONE until it is fixed or answered; no reviewer is rerun.
- Every reviewer returning `REVISE` must include a concrete fix proposal.

#### A griller's recommendations, and what they disqualify

Read `.qfai/assistant/rule/references/griller-recommendations.md` when a griller's recommendation is offered as evidence for a decision, or when you check whether a griller may review the work it interviewed. Not needed otherwise.

### Review convergence

A stage is reviewed once, and the author fixes or answers every finding with no re-review: `.qfai/assistant/rule/review-convergence.md`.

### Reviewer remit (in scope per stage)

Read `.qfai/assistant/rule/references/reviewer-remit.md` when you brief a reviewer or judge whether a finding is in scope for the stage under review. It holds what each stage's reviewer may and may not examine. Not needed when no review runs.

### Finding provenance

Read `.qfai/assistant/rule/references/reviewer-findings.md` when you write or judge a reviewer finding: where it comes from, and what a reviewer may demand more of. Not needed when no review runs.

### What a reviewer may demand more of (MUST)

What a reviewer may demand is in `.qfai/assistant/rule/references/reviewer-findings.md`, read under the condition above.

### Reviewer budget exhausted

A blocking review that cannot be delegated because the agent budget is spent is a `saturated` failure, not a licence to skip the gate or to self-review.

- First apply the `saturated` bounded retry. A freed slot is the preferred outcome.
- If retries are exhausted, a reviewer role MAY be reused sequentially with a cleared context, provided the reviewer did not author or edit any artifact under review in this run. The protected invariant is independence from authorship, not reviewer instance identity.
- Record the reuse in the stage report.
- If even sequential reuse is impossible, hard stop with the review gate recorded as `PENDING` rather than `PASS`. `PENDING` is not `PASS`, and DONE stays blocked.
- Never record a waived or self-performed review as `PASS`.

## Reviewer independence

- An agent that authored or recommended an artifact never counts as that
  artifact's independent reviewer.
- No required reviewer is dropped to save tokens. A required review that cannot
  be delegated stops the stage, as
  [Delegation Failure (Hard Stop)](#delegation-failure-hard-stop) states.

## Work order template

```text
Task title: <short>
Role: <sub-agent role>
Review series: <reviewed artifact> + <reviewer role> + <replacement ordinal>   # review work orders only
Goal: <what to decide/produce>
Checkout: <absolute checkout assigned to this task by the host>
Write paths: <exact owned paths, or none for a read-only task>
Edit method: <host-permitted tool; worktree creation does not grant access>
If an edit is refused: stop that target; return tool, cwd, target, refusal text, owned paths and a reviewable diff
Inputs (refs):
- <file/section>
- .qfai/assistant/rule/drift-protocol.md#core-rule  <!-- the protected set, in front of the agent -->
Constraints:
- must: enforce Drift Protocol
- must: follow applicable test-layer or validation policy
- must_not: patch upstream artifacts directly; every upstream change requires
  STOP + Change Request + owner rerun per .qfai/assistant/rule/drift-protocol.md
Output format:
- <headings / bullet schema>
Time budget: none | <seconds>   # advisory: nothing stops at it. See .qfai/assistant/rule/stage-cost.md
Elapsed line: end every message with `elapsed <seconds>s / <budget>s`, or `elapsed <seconds>s` when the budget is none
Acceptance bar: <accept when ...> | <rework when ...>   # never `PASS`/`REVISE`: that is the reviewer's vocabulary and the completion gate matches on it, so a doer told to report in it emits a verdict on its own work
```

## Reviewer response template

```text
Result: PASS | REVISE
Findings:
- <issue> | Severity: blocking|advisory | Traces to: <BF-*/AC-*/EX-*/BR-*/<contract-ID>/rule-name|defect:correctness|defect:security|defect:code-quality|record:<CODE>|none> | Fix: <action, for a blocking finding>
```

- A reviewer that authored or edited what it reviews says so instead of returning a verdict, and the review goes to a non-participating reviewer (see `Definition: independent reviewer`).
- `Result: REVISE` is legal only when at least one finding is `Severity: blocking`. A response whose findings are all advisory returns `Result: PASS` with the proposals attached.

### Verdict vocabulary

- Reviewer responses use `Result: PASS | REVISE` (this file). There is no third verdict.
