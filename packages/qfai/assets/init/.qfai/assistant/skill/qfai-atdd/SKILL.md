---
name: qfai-atdd
title: QFAI ATDD (Executable acceptance tests)
description: "Use when invoked by name or handed a QFAI work order. Authors E2E tests for business flows and integration or API tests for acceptance criteria."
argument-hint: "<BF-ID> [--auto]"
allowed-tools: [Read, Glob, Write, Edit, TodoWrite, Task, Agent, Bash]
roles:
  - orchestrator
  - delivery-planner
  - test-design-analyst
  - qa-strategist
  - acceptance-test-engineer
  - devops-ci-engineer
  - completion-reviewer
  - qa-gatekeeper
  - implementation-reviewer
routing-profile: runtime-heavy
mode: execution-focused
---

## /qfai-atdd — Author acceptance tests

[DRIFT-PROTOCOL:MANDATORY]

Inside an `npx qfai workflow` run, follow `references/orchestrated-mode.md`.

## User Questions (AskUserQuestion Protocol)

Agents MUST follow `.qfai/assistant/rule/shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol`
for every user question. With `--auto`, they MUST ask nothing and record
explicit assumptions in the stage evidence.

The active scope is one `BF-NNNN` business flow. Read its stories, acceptance
criteria, examples and owning contracts under `paths.specsDir` before authoring.
Use the configured paths; the default tree is `.qfai/spec/`. Send a decision, a
question for the user or an out-of-scope discovery to `/qfai-sdd` as a change
request. Read `rule/test-layers.md` for the layer vocabulary.

### Ownership and annotation

| Obligation           | Test home              | Required annotation    | Author            |
| -------------------- | ---------------------- | ---------------------- | ----------------- |
| Business flow        | E2E                    | `QFAI:BF-NNNN`         | `/qfai-atdd`      |
| Acceptance criterion | Integration or API     | `QFAI:AC-NNNN-NNNN-NN` | `/qfai-atdd`      |
| Example              | Every other test layer | `QFAI:EX-NNNN-NNNN-NN` | `/qfai-implement` |

An E2E test carries its flow annotation. An integration or API test carries
its AC annotation. A BF annotation outside E2E, or an AC or EX annotation in
E2E, is misplaced. Contract references and business rules define assertions,
but contract IDs are not coverage annotations. Unit and component tests belong
to `/qfai-implement`. Each test needs an observable assertion; an annotation
or a generated placeholder alone never proves behavior.

Run `npx qfai validate --profile atdd --flow BF-NNNN --fail-on error` to obtain
current obligations and findings. An exception is a DONE row in the applicable
`decisions.md` table naming the BF or AC. Never invent a waiver in the test
or suppress a finding. Report repo-wide findings attributed to another flow
with their owner; do not claim repository-wide PASS from one flow's result.

### Preflight and test design

1. Confirm the BF exists and its US, AC, EX and contract references resolve.
   Stop for upstream repair when a required link is missing or contradictory;
   follow `rule/drift-protocol.md`.
2. Read `<paths.specsDir>/03_contract/tech.md#standard-commands` for Test, Lint,
   Typecheck and Build commands. Do not infer them from the package manager.
3. Inspect test roots, `validation.traceability.testFileGlobs` and exclusions.
   Confirm each proposed path is collected by the runner and by validation.
4. Cover the normal behavior, a boundary and a failure path where the
   contract makes them meaningful. Record an observable oracle for each
   assertion in the flow's Coverage Depth Matrix.

If credentials are needed in E2E, API or integration work, follow
`references/credential-reuse.md`. Keep actors and sessions isolated by worker.

### Scaffold and authoring

`npx qfai atdd scaffold --flow BF-NNNN` creates one E2E placeholder under
`<testsDir>/e2e/`. `npx qfai atdd scaffold --story US-NNNN-NNNN` creates one
integration placeholder per AC under the story's integration home. The options
are exclusive. A generated path must match configured globs and exclusions;
an unsupported pattern is a refusal. Existing edited files are preserved.
A placeholder receives `D-SCAFFOLD-PLACEHOLDER` until a real assertion
replaces it. See `references/scaffolding.md`.

Author a failing acceptance test before the behavior that makes it pass
where observable. Capture the command, assertion failure and revision in
`.qfai/evidence/atdd-BF-NNNN.md`. A load error or broken fixture is not a
RED proof. For an already implemented surface, use a controlled falsifiability
check and restore the mutation. See `references/red-provenance.md`.

The Coverage Depth Matrix lives at
`.qfai/evidence/coverage-depth-BF-NNNN.md`. It records this flow's US, AC and
EX rows, the BF obligation in its header, and relevant layers, oracles and gaps
without assigning EX tests to ATDD. See
`references/test-case-depth-checklist.md` and `references/volume-signals.md`.
The header links an existing BF E2E test under configured `paths.testsDir/e2e`
with a Markdown link resolved from the matrix file. That test carries the
matching `QFAI:BF-NNNN` annotation. Give each
required ID its own row, and give each partial or missing coverage cell a
reason; name the owner of each missing cell. In
`.qfai/evidence/atdd-BF-NNNN.md`, add `## Coverage Depth Matrix` with a
Markdown link or code span naming the matrix path and a numeric summary in
the form `✅ N / ⚠️ N / ❌ N`. Count the six coverage cells in the matrix's
US, AC and EX rows; the summary must equal those cells. Confirm that both
files are tracked, including when an
evidence ignore rule would otherwise hide them. Commit both evidence files.
A shared fixture change needs the affected tests
rerun and their provenance updated; see `references/shared-test-artifacts.md`
and `references/stale-manifest.md`.

### Review and handoff

Use the configured routing profile and
`rule/shared-skill-delegation-baseline.md` for role selection. The acceptance
test engineer authors tests; the test-design analyst checks obligation mapping
and oracle depth; the qa-gatekeeper checks the observed RED or falsifiability
proof; the completion reviewer checks flow coverage and evidence independently.
An author cannot certify their own tests. Resolve blocking findings using
`rule/review-convergence.md`; seal review evidence as
`references/pack-seal.md` and `references/review-fix-rounds.md` require.
For a failed gate, follow
`rule/shared-skill-operating-baseline.md#gate-failure-autorepair-protocol`.

Write a handoff entry in `.qfai/evidence/atdd-BF-NNNN.md` naming BF and AC IDs,
test paths and selectors, commands and outcomes, evidence paths, unresolved
findings and implementation work.
Follow `references/stage-handover.md`. Keep cross-flow findings with their
owning flow; see `references/cross-spec-obligations.md`.

### Reviewer Gate

The completion reviewer and qa-gatekeeper independently check the active BF's
test layers, observable assertions, RED/GREEN evidence, matrix, and handoff.
They enforce the Drift Protocol and `rule/test-layers.md`. Test volume and
planning estimates are signals, not gates. A finding ends in explicit PASS
or REVISE on the current revision; the test author cannot sign off their own
work.

### Completion gate

The stage may report PASS only when:

1. Every BF and AC obligation in scope has an executed, behavior-checking test
   at its required layer, or a valid DONE decision exception.
2. The flow's matrix and ATDD evidence are current, committed, and name the
   test command, selected tests and observed result.
3. Routed reviewers and qa-gatekeeper passed the current work, with no
   blocking finding remaining.
4. `npx qfai validate --profile atdd --flow BF-NNNN --fail-on error` reports no
   error owned by this flow. Residual findings elsewhere have named owners.

Report changed tests, BF and AC coverage, commands and outcomes, review
decisions, open risks and the implementation handoff. `/qfai-implement` owns
EX tests and production behavior; `/qfai-verify` runs the repository gate.

## Grilling (MANDATORY)

Article IX of `.qfai/assistant/rule/constitution.md` owns the two sessions
this stage may run; `.agents/rules/grilling.md` owns the method.
Neither is restated here. Both sessions are delegated. Critical decisions go
to the user; other decisions follow the recorded griller recommendation.

- **At the preflight.** Open a session for unresolved test design choices.
  Record `confidence high` when there was no session to open.
- **On detection.** Stop and open a session when a contradiction, missing
  acceptance case, or technical obstacle appears during authoring.
- **Neither session changes settled input.** Route a needed story or contract
  change through `rule/drift-protocol.md`; the run solves local obstacles.

Record the sessions in `.qfai/evidence/atdd-BF-NNNN.md` under
`## Grilling Session`. Start the block with the invocation's UTC start time to
the millisecond and `Preflight: session opened` or `Preflight: confidence high`.
For every session that the user did not stop, record its session ID, subject,
ending, end time, source revision, time work resumed (or why it did not),
frontier, lookups, decisions, open nodes, and escalations. The ending is one
of `confirmed`, `user-closed`, `adopted`, or `no-question`; a `stopped`
session is reported to the user without writing the artifact they stopped.
List each open node beneath the record with its session ID. Record every
adopted decision and user answer in the Work Orders Summary, keyed to this
invocation and session; record `none` when no decision was settled.
Use one block per invocation, with a unique session ID for each row. Give
the reviewer the run start in its work order so an older block cannot pass
as the current run. `Revision` is a git revision or
`working-tree+<hash>`; `Ended at` cannot precede the run start, and
`Work resumed` must follow `Ended at`. The `Open` count must equal the
session-keyed open lines. The `Decisions` count must equal the Work Orders
Summary decisions keyed to the session and invocation; an unanswered escalation
is an open node, not a settled decision.

The completion reviewer checks the record against this invocation's start
time, each counted decision and open node, and the source revision. A missing
record, duplicate session key, unanswered critical decision, or work resumed
after a `stopped` session is `REVISE`. A `no-question` ending cannot hide an open node:
record the open question in the stage evidence and leave completion pending.

## Default Autopilot Policy

- auto-decide: test selectors, fixture organization, and output formatting
  within the active BF and its declared contracts.
- ask-user: approval-required operations, scope expansion, and product
  decisions not settled by the story tree. In `--auto`, report these as
  pending instead of supplying an answer.
- hard-required:

The BF selector and its sources come from the invocation and configured tree.
If they cannot be resolved, stop at preflight and report the missing source.

project_memory:

- BF maps to E2E; AC maps to integration or API; EX tests belong to implement.
- Placeholders and unasserted annotations discharge no obligation.
