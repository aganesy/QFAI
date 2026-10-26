# Shared Skill Delegation Baseline

Skills cite this baseline and add only stage or gate overrides.

## Sub-agent Delegation (MANDATORY)

This section binds every skill and step. A skill or step repeats none of it
and adds no placeholder for a subsection it does not change. State only an
override, under the subsection it overrides.

The session agent, the agent the user talks to, does the work itself:
research, design, the specification, code, tests and documentation. Background
shared in one context is not lost in a hand-off, so the session agent starts a
sub-agent for exactly two reasons:

| Reason                   | What it covers                                                                                                                                               | Agent                                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| An independent judgement | A review, the finder of the concrete-abstract cycle, a griller, the prototyping evaluator: work whose value is that its judge did not make what it judges    | The reviewer the plan or the skill names; the finder and a griller on `requirements-reviewer`, a griller on a contract or architecture decision on `architecture-reviewer` |
| Parallel units           | Two or more story units or read-only lookups that pass the parallel-unit gate of `.qfai/assistant/skill/qfai-implement/references/parallelization-policy.md` | `fullstack-engineer`, one per unit                                                                                                                                         |

Nothing else is a reason. Context size is not: the host compacts a long run. A
technical domain is not, and neither is keeping the session's own context
small. A host's built-in agents follow the same two reasons. An agent that only
stands in for a tool the host lacks, and returns that tool's result, is a tool
call, not a delegation.
Whatever the skill, an agent is never simulated, and a failed delegation is
classified by the taxonomy below before any response.

### Session Agent Protocol

- The session agent authors every artifact itself, starts a sub-agent only for
  one of the two reasons above, and integrates and presents the results.
- **No sub-agent inherits the conversation.** Each starts from a
  self-contained brief: never a forked copy of the session. A host that can
  only fork the conversation is `unavailable` for an independent judgement.
- **A judgement brief is black-box.** It holds the fixed revision, the request
  in the user's own words, the story tree and contracts that bind the work, the
  written decisions and the remit. It never holds the author's rationale, the
  options the session weighed, or the session's view of its own work.
- **A unit brief is complete.** It holds the step files to run, the story-tree
  IDs, the owned paths (none for a lookup) and the answer's shape. A unit whose
  brief would have to retell the conversation is not a unit; the session agent
  does that work itself.
- The session agent is not required to wait while a sub-agent runs. Where the
  host starts a delegation and returns at once, delivers the finished result
  later as a message, and lets the session agent wait for a result on purpose,
  the session agent carries on with its own work meanwhile and waits only when
  it has none. A host without all three keeps the session agent waiting.
- That work is planning, preparing the next brief, integrating results
  already returned, and its own part of the task. It never repeats the work it
  handed out. Starting another delegation needs the parallel-unit gate.
  Where the stage's ledger or a seam makes an ordering mandatory, carrying on
  does not override it.
- On Codex, read `.qfai/assistant/rule/references/codex-delegation.md` before delegating.
- The session agent runs every step that starts a finder, griller or reviewer,
  and starts those agents itself: `sdd-cycle`, `common-review-cycle`,
  `prototyping-grill`, `prototyping-loop` and any step that holds a
  delegated grilling session, such as a pre-draft grilling checkpoint. A
  `fullstack-engineer` it delegates to starts no agent of its own. Where a
  judgement cannot be delegated, the failure handling below applies.
- A review is done by an agent that did not author what it reviews. The
  session agent never judges its own work and never approves it for
  convenience.
- A read-only agent never runs `git checkout` or `git switch` in a worktree it
  shares; it reads other revisions with `git show <rev>:<path>`. Each agent
  writes scratch files only under a path of its own.
- Give each judge a fixed revision: a commit, or the base commit with the
  exact diff of the uncommitted work saved where the judge can read it. Leave
  the checkout alone until reviews return. Only read-only fixed-SHA `git show`
  reviews permit clean switches. Writers, local gates and reviews using live
  files or checkout-dependent execution must finish first.
- A reviewer runs no suite or gate the verify stage runs; it reads their
  results.

### Worker edit boundary

Before assigning write paths or handling a refused edit, read
`.qfai/assistant/rule/references/worker-edit-boundary.md`.

### Capability Probe (MUST)

1. No delegation attempt is required at the start of a stage. The session agent
   delegates only when it chooses to.
2. When it does, the real delegation attempt is the capability check. Do not
   gate execution on preflight availability questions or synthetic probe-only
   checks.
3. If the delegation fails, classify the failure first (see
   `Delegation Failure Taxonomy`), then apply the response for that class.
   Never simulate an agent.

### Delegation Failure Taxonomy (MUST)

Every delegation failure belongs to exactly one of two classes.

| Class         | Meaning                                                                                                                                                                                                     | Sanctioned response                                                                      |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `unavailable` | The host has no usable delegation mechanism, the agent is unknown, or the failure is a configuration / tooling / quota gap only the user can close — including a limit that waiting cannot clear.           | The session agent does the work itself. An independent judgement stops the stage instead |
| `saturated`   | The host can delegate but is momentarily out of budget — `agent thread limit reached`, concurrency cap, queue full, rate limit, busy pool. The identical call would succeed later with no change by anyone. | Bounded wait-and-retry of the identical delegation                                       |

- Classify from the raw failure reason, and classify `saturated` only when the reason states or plainly implies that the identical call would succeed later **with no change by anyone**: a queue or pool that is currently full, a rate limit with a retry window, a concurrency cap that is momentarily reached, an explicit "try again later".
- A limit or quota that only a user can lift is `unavailable`, not `saturated` — a configured concurrency cap of 0, a maximum delegation depth, an input-size limit, an exhausted account quota or plan. Waiting cannot clear those, so a retry loop would only delay the response.
- When retryability is not explicit, default to `unavailable`.
- When the `saturated` retry budget is exhausted, handle the failure as `unavailable` and report the class as `saturated (retry budget exhausted)`.

### Delegation Failure — `saturated` (Bounded Retry)

- Retry the identical delegation with backoff: 30s, then 60s, then 120s. Attempt cap: 3 retries per delegation.
- Do not re-scope, re-plan, or re-route the delegation between retries — same agent, same task.
- Report on entering the retry loop and on its outcome:
  - `Delegation deferred: <raw reason or concise summary>`
  - `Failure class: saturated`
  - `Attempted agent: <agent>`
  - `Attempted task: <task title>`
  - `Retry condition: retry after <N> seconds / when a delegation slot frees`
  - `Attempts used: <n>/3`

### Delegation Failure — `unavailable` (The Session Agent Does The Work)

- The session agent does the work itself and reports it as its own, never as the
  attempted agent's.
- Report all of:
  - `Delegation failure: <raw reason or concise summary>`
  - `Failure class: unavailable | saturated (retry budget exhausted)`
  - `Attempted agent: <agent>`
  - `Attempted task: <task title>`
  - `Done by: the session agent`
- An independent judgement is the exception. The
  session agent does not do it, and the stage stops under the hard stop below.

### Delegation Failure (Hard Stop)

Applies when the failed delegation is an independent judgement, and the class
is `unavailable` or `saturated (retry budget exhausted)`.

- Report all of:
  - `Delegation failure: <raw reason or concise summary>`
  - `Failure class: unavailable | saturated (retry budget exhausted)`
  - `Attempted agent: <agent>`
  - `Attempted task: <task title>`
  - `Why stopped: this judgement needs an agent that did not author the work.`
  - `User action needed: <settings or tooling changes required — or "none; wait for a delegation slot to free" when the class is saturated>`
  - `Retry condition: rerun after the review delegation succeeds`

### Commit Scoping

- A delegated agent stages only the paths it declared as deliverables in its work order: `git add <path> …`.
- `git add -A`, `git add .` and `git commit -a` are forbidden for delegated agents, in both isolation modes. In degraded / shared-index mode the concurrent agents share one index, so a sweeping stage command commits a sibling agent's in-flight files and misattributes work in the audit trail. Under worktree separation the command still stages whatever else is loose in that agent's own worktree.
- When the agent's deliverable paths are not known up front, it hands back an unstaged diff and the session agent commits — under the same rule. The session agent commits one handed-back diff at a time, stages that agent's declared paths only, and is equally forbidden from `git add -A` / `git add .` / `git commit -a` while a parallel stage is in flight. Being the committer does not exempt it.
- Isolation requirements for concurrent stages are defined once in `.qfai/assistant/rule/workflow.md#concurrency-stage-independent-mandatory`.

### Host backstops above the declared shape

Read `.qfai/assistant/rule/references/host-backstops.md` when you set or read a host limit on agents, or a run stops at one. It holds the backstops each host applies above the declared shape and how to leave room for them. Not needed when no host limit is involved.

## Work Orders Summary

A stage that fans work out to agents in parallel records the fan-out in this table:

| Step | Agent (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ----------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1    | <agent>           | <instance id>  | <task>     | <refs>       | <refs>        | PASS/REVISE/PENDING          |

- `Output (refs)` should point to in-file anchors or relative evidence paths.
- `Agent instance` is a run-stable identifier for the sub-agent that actually performed the step (platform-supplied id where available, otherwise `<agent>#<n>` assigned in order of first use). It exists so an author→reviewer collision is detectable after the fact from the evidence alone; the same instance appearing in an authoring step and in a review step over the same artifact is a
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

- The protected invariant is independence from authorship, not reviewer instance identity. An agent that produced or modified none of the artifacts under review is independent even if it filled another role earlier in the run; an agent that drafted or edited one of them is not independent, however it is briefed.
- Independence is judged per review target, over the whole run — not per phase. Authoring in an earlier phase disqualifies the agent from reviewing that artifact in a later one.
- A card alone never establishes independence: independence is a separate constraint the briefed agent must satisfy and attest to.
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
- An in-scope blocking finding from a required reviewer prevents DONE until it is fixed or answered; only a behaviour fix is re-reviewed, once.
- Every reviewer returning `REVISE` must include a concrete fix proposal.

#### A griller's recommendations, and what they disqualify

Read `.qfai/assistant/rule/references/griller-recommendations.md` when a griller's recommendation is offered as evidence for a decision, or when you check whether a griller may review the work it interviewed. Not needed otherwise.

### Review convergence

A stage is reviewed once, and the author fixes or answers every finding: `.qfai/assistant/rule/review-convergence.md`.

### Reviewer remit (in scope per stage)

Read `.qfai/assistant/rule/references/reviewer-remit.md` when you brief a reviewer or judge whether a finding is in scope for the stage under review. It holds what each stage's reviewer may and may not examine. Not needed when no review runs.

### Finding provenance

Read `.qfai/assistant/rule/references/reviewer-findings.md` when you write or judge a reviewer finding: where it comes from, and what a reviewer may demand more of. Not needed when no review runs.

### What a reviewer may demand more of (MUST)

What a reviewer may demand is in `.qfai/assistant/rule/references/reviewer-findings.md`, read under the condition above.

### Reviewer budget exhausted

A blocking review that cannot be delegated because the agent budget is spent is a `saturated` failure, not a licence to skip the gate or to self-review.

- First apply the `saturated` bounded retry. A freed slot is the preferred outcome.
- If retries are exhausted, a reviewer card MAY be reused sequentially with a cleared context, provided the reviewer did not author or edit any artifact under review in this run. The protected invariant is independence from authorship, not reviewer instance identity.
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

When preparing a delegation, use the template in
`.qfai/assistant/rule/references/worker-edit-boundary.md#work-order-template`.

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
