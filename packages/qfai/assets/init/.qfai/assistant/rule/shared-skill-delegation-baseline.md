# Shared Skill Delegation Baseline

Use this document to keep SKILL bodies compact. Skill files should reference this baseline and only add role-, stage-, or gate-specific rules.

## Sub-agent Delegation (MANDATORY)

This section binds every skill and every step as written. A skill or step
restates none of it and writes no placeholder stanza for a subsection it does
not change; it states only an override, under the subsection it overrides.

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
- A review is done by an agent that did not author what it reviews. The
  orchestrator never reviews its own work and never approves it for
  convenience.

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
- `git add -A`, `git add .` and `git commit -a` are forbidden for delegated agents, in both isolation modes. In degraded / shared-index mode the concurrent agents share one index, so a sweeping stage command commits a sibling agent's in-flight files and misattributes work in the audit trail. Under worktree separation there is no shared index and no sibling file to sweep, but the command
  still stages everything else loose in that agent's own worktree, so the commit still stops matching its declared deliverables.
- When the agent's deliverable paths are not known up front, it hands back an unstaged diff and the orchestrator commits — under the same rule. The orchestrator commits one handed-back diff at a time, stages that agent's declared paths only, and is equally forbidden from `git add -A` / `git add .` / `git commit -a` while a parallel stage is in flight. Being the committer does not exempt
  it; in degraded mode it is the only committer, so a sweeping stage there mixes every sibling's work into one commit.
- Isolation requirements for concurrent stages are defined once in `.qfai/assistant/rule/workflow.md#concurrency-stage-independent-mandatory`.

### Host backstops above the declared shape

The dispatch limits in this baseline and in each skill's own policy are read by
the agent doing the dispatch. A run that has lost its way is the one least likely
to apply them, so nothing here bounds a run that spawns more workers than it
declared, nests delegation deeper than the stage intended, or keeps spending.

Some hosts refuse delegation outside their limits. Each control below states
what it covers.
QFAI sets none of them, so the host defaults stand.

**A backstop sits above the declared shape, never at it.** Leave room for other
permitted agents sharing the host limit. The policy decides the ordinary case.

Claude Code 2.1.217 or later:

| Control                                                                              | Default                      | What it bounds                                             |
| ------------------------------------------------------------------------------------ | ---------------------------- | ---------------------------------------------------------- |
| `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`                                               | 3 (1 in 2.1.217 and 2.1.218) | How deep delegation nests. `1` turns nesting off           |
| `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`                                               | 20                           | When new Agent tool spawns are refused                     |
| `--max-budget-usd` in print mode; `maxBudgetUsd` / `max_budget_usd` in the Agent SDK | none                         | What one run may spend, in US dollars, sub-agents included |

The spawn limit has exceptions for ultracode, `/subtask` forks, and resuming an
exited agent.

Codex:

| Control                                                                                   | Default                    | What it bounds                                                        |
| ----------------------------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------- |
| `agents.max_concurrent_threads_per_session` in `config.toml` (alias `agents.max_threads`) | chosen by Codex when unset | How many spawned-agent threads are open at once, the primary excluded |

No equivalent was confirmed for nesting depth or for a spend cap.

GitHub Copilot CLI:

| Control                            | Documented default                   | What it bounds                           |
| ---------------------------------- | ------------------------------------ | ---------------------------------------- |
| `subagents.maxDepth` setting       | 6 in the limits table                | How deep sub-agents nest                 |
| `COPILOT_SUBAGENT_MAX_DEPTH`       | 4 in the environment-variable table  | How deep sub-agents nest                 |
| `subagents.maxConcurrency` setting | set by the Copilot plan, 2 to 32     | How many sub-agents run at once          |
| `COPILOT_SUBAGENT_MAX_CONCURRENT`  | 32 in the environment-variable table | How many sub-agents run at once          |
| `--max-ai-credits`                 | unset                                | AI credits per response, as a soft limit |

The two settings take effect only on usage-based billing plans.

The depth defaults disagree across the CLI documentation. Which control takes
precedence was not confirmed.

VS Code Local harness (`runSubagent`):

| Control                                        | Default | What it bounds                                                        |
| ---------------------------------------------- | ------- | --------------------------------------------------------------------- |
| `chat.subagents.allowInvocationsFromSubagents` | `false` | Whether a sub-agent may start sub-agents. Nesting stops at depth five |

No equivalent was confirmed for concurrent sub-agents or for a spend cap. None
was confirmed for any of the three in the Copilot cloud agent.

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

#### A griller's recommendations, and what they disqualify

A grilling session puts a recommended answer beside each question (`.agents/rules/grilling.md`). Who settled the decision decides what happens next.

| The decision was settled                              | What follows                                                                      |
| ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| By the user, from the recommendation among the inputs | The decision is theirs. The griller may review the artifact                       |
| Agent to agent, not critical                          | The decision stands. The griller that recommended it does not review the artifact |
| Agent to agent, critical, with no user adjudication   | The artifact is wrong, and no reviewer can clear it                               |

**The second row is how a delegated session is meant to end** (`.agents/rules/grilling.md`), not a finding. The reviewer checks that the decision is in the final report and is not critical. A reviewer that doubts its merit raises that as an ordinary finding against the artifact, under its own remit, as it would for any other content.

**The third row is not a routing problem.** A critical decision is the user's in every session, and a run that could not ask records it as an open question rather than adopting it. An agent-adopted critical decision is therefore an artifact carrying something nobody with the standing decided, and handing it to a different reviewer would launder it.
The reviewer must return `REVISE` and name the decision: it is reopened and put to the user, or recorded open where no question can be asked.

The first row needs a reason, because the intuitive one is wrong. A sub-agent starting with a reset context cannot defer to something it does not remember, so deference is not the risk. **Correlation** is: a fresh instance of the same agent, on the same model, over the same evidence, re-derives the preference that produced the recommendation and finds it good on the merits. Resetting the
context removes the memory, not the disposition — which is why role name alone never establishes independence either. Where the user chose, that disposition is one input among several and the decision is not the griller's to re-derive.

**The stage's final report is the record.** It lists every decision the agents adopted and the agent that recommended it, so a reviewer with a reset context reads the third row off the report rather than off recollection.

- Reviewers must verify Drift Protocol enforcement
  (`.qfai/assistant/rule/drift-protocol.md`).
- Reviewers must verify test-layer policy enforcement when relevant
  (`.qfai/assistant/rule/test-layers.md`).
- Test volume ratios, floors and planning estimates are signals, not gates,
  unless the skill explicitly says so.
- Do not declare DONE until every finding of its one review is fixed or answered, as `.qfai/assistant/rule/review-convergence.md` sets out.
- An in-scope blocking finding from a routed reviewer prevents DONE until it is fixed or answered; no reviewer is rerun.
- Every reviewer returning `REVISE` must include a concrete fix proposal.

### Review convergence

A stage is reviewed once, and the author fixes or answers every finding with no re-review: `.qfai/assistant/rule/review-convergence.md`.

### Reviewer remit (in scope per stage)

A finding outside the reviewing stage's remit is recorded and deferred, never blocking:

| Stage                      | In scope                                                                                                                                       | Out of scope (record and defer)                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `/qfai-discussion`         | Requirement clarity, scope boundary, decision traceability                                                                                     | Spec structure, runtime behavior                                                                                     |
| `/qfai-sdd`                | Spec / contract consistency, testability, traceability edges, each document in its template's shape                                            | Runtime enforcement correctness, code quality                                                                        |
| `/qfai-implement`          | Code quality, spec alignment of the item, RED/GREEN evidence, silent failure and type design across the whole of every file the change touches | Upstream spec content, contract design, and a finding on code in a touched file that the change did not add or alter |
| `/qfai-prototyping`        | The prototype against its UI contracts and the root `DESIGN.md`, loop evidence, the handoff                                                    | Spec and contract content, downstream implementation code                                                            |
| `/qfai-migration-v1-to-v2` | Migration plan and report fidelity, ID mapping, every deletion listed in the reports, each written document in its template's shape            | New story content and downstream implementation quality                                                              |
| `/qfai-configure`          | Config / manifest validity and the surfaces the run generated                                                                                  | Spec content, implementation structure                                                                               |
| `/qfai-verify`             | Gate execution, evidence completeness, report / artifact fidelity                                                                              | Authoring quality of the artifacts it verifies                                                                       |
| `/web-research`            | Source authority and freshness, citation accuracy, claim support                                                                               | Spec content, implementation structure                                                                               |
| `/qfai-grilling`           | Decisions asked rather than assumed, facts naming where they were read, the session's end condition                                            | The merit of what the user decided, and the artifacts the invoking stage writes from it                              |
| `/qfai-grill`              | The same, reported to the user rather than to a stage                                                                                          | The merit of what the user decided; there is no artifact to review                                                   |
| `/qfai-maintain`           | That the diff changes no behaviour, and the checks run over it                                                                                 | Whether the new wording is the better one                                                                            |
| `/qfai-triage`             | That no tracked file changed, the recorded outcome, each follow-up, and the sources an answer cites                                            | The work a follow-up request describes                                                                               |
| `/qfai-run`                | The artifacts the session writes, in the specification or code review the plan names after a stage                                             | Whether the route the decision rules chose was the right one                                                         |

Article VII excess in the reviewing stage's own artifacts is in scope;
quality of downstream implementation code is deferred at upstream stages.

Apply this route only where the installed Article VII governs the artifact.
A retained constitution does not gain newer authority from refreshed cards.
Report an unsupported Article VII route as advisory and follow the installed constitution.

A step's remit is its owner's row. A `common-*` step's work is reviewed under
the row of the skill whose stage ran it.

**Fallback for any stage not listed.** A stage that references this baseline without a row above has, as its remit, the artifacts that stage itself produces; everything upstream of them is out of scope, recorded and deferred. Add the row when a new stage starts routing blocking reviewers, so the in/out split is not re-derived per run.

### Finding provenance

- Every finding must declare a severity (`blocking` or `advisory`) and a `Traces to:` value.
- `Traces to:` names what the finding enforces. Legal values:
  - an upstream obligation — a `BF-*`, `AC-*`, `EX-*`, `BR-*` or contract ID, or a named shared rule **that governs the product's behaviour**;
  - `defect:correctness`, `defect:security`, or `defect:code-quality` — a defect demonstrable from the changed artifacts themselves, cited with the evidence that demonstrates it (see `.qfai/assistant/rule/drift-protocol.md#defect-or-new-scope-decide-this-first`). A reviewer who can show the deliverable is wrong on its own terms does not need an `AC-*` to say so;
  - `record:<CODE>` — a defect in the run's own record rather than in the product: an evidence section, a round block, an anchor, or provenance prose. `<CODE>` names the record rule;
  - `none` — reviewer-originated scope, i.e. a new product obligation upstream never asked for.
- `record:*` and `none` MUST be recorded as `advisory`; neither can be `blocking` or gate `DONE`. A `record:*` finding never re-runs the row: the orchestrator files it in the record-defect queue the reviewing stage's own completion contract names, and that contract is what drains it (`.qfai/assistant/rule/drift-protocol.md#the-record-defect-queue`). **The class needs a drain:
  only a stage whose completion conditions require that queue drained may use it — today `/qfai-implement` alone, so `/qfai-sdd`, `/qfai-configure`, `/qfai-verify`, `/qfai-discussion` and `/web-research` reviewers must not, and there the finding keeps the class it would otherwise have had.** An entry closes only on a repaired record;
  `record:unchecked` is a bug report against `validateTddList` and never a substitute for the repair — a record rule worth a round is worth a validator code.
- **Integrity is not record class.** Evidence copied from another round or a sibling row, an anchor resolving to a run other than the one it names, and a reviewer that authored what it reviews all claim work that was not done or independence that is missing. A `PASS` built on them is refused,
  so they stay `blocking` as `defect:code-quality` and are never filed as `record:*` — which covers an honestly produced record that is merely wrong.
- A `none` advisory takes the Change Request / Open Question path (`.qfai/assistant/rule/drift-protocol.md#reviewer-originated-obligations`); a `record:*` advisory takes the queue above. Neither goes to the implementer.
- Only `blocking` findings force `REVISE`, and only a finding citing a behaviour-governing obligation or a defect class may be one. **The trace class bounds which findings may block; the severity is declared, and it settles whether one does.** Read as "an obligation trace is blocking", the same item was a discussion-blocking defect to one reviewer and carried advice to the next.
- An obligation-traced finding is recorded `advisory` where a named section places the work outside the reviewed stage. The discussion review's implementation precision is that section
  (`.qfai/assistant/rule/review-convergence.md#discussion-review-precision`): the obligation is agreed, and what the advice is about is how a later stage implements it, so the finding is carried to that stage rather than demanded here. Nothing else lowers a behaviour-governing finding to `advisory`.

### What a reviewer may demand more of (MUST)

A finding that asks for more work — another item, more detail, a wider set — is admissible only on
the concrete artifacts.

| Admissible on                                                           | Inadmissible on                                                                   |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| business flows, user stories, acceptance criteria, examples, test cases | business rules, non-functional requirements, policies and decisions, architecture |

Two demands stay admissible on any artifact:

- that an abstract item already recorded carry its mandatory pair, such as a quality floor naming
  its verification method;
- that a safety-floor item be met: security, accessibility, data-loss handling, or validation at a
  trust boundary (`.agents/rules/minimal-implementation.md` § 2).

This bounds what a reviewer may require, never what a reviewer may report. A demand the table does
not admit, such as one for another business rule, is recorded as `advisory` and cannot force
`REVISE`.

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
