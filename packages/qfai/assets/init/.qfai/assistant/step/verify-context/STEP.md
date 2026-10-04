---
name: verify-context
owner: qfai-verify
purpose: "Load what the change is verified against, fix the run's scope, and give every gate in that scope a command."
requires: [common-steering-refresh]
roles: [orchestrator, delivery-planner, qa-strategist]
---

# verify-context

The first step of verification. It reads the inputs, fixes the scope and makes
sure each gate the scope needs has a command. It runs no gate.

## Reads

In this order when unsure:

1. The rules this step cites, the routed cards under `.qfai/assistant/agent/`,
   and the project context under `.qfai/spec/01_policy/` and
   `.qfai/spec/03_contract/`.
2. `.qfai/spec/decisions.md`. When no decision applies, say "not applicable".
3. The business flows, stories, contracts, tests and evidence the change
   touches.

The file-by-file list is
`.qfai/assistant/skill/qfai-verify/references/context-load.md`, and the
principles every run keeps are
`.qfai/assistant/skill/qfai-verify/references/articles.md`.

A discussion pack is not a verification input. Verify reads normalized specs,
contracts and evidence only.

## Writes

- In the stage report: the declared scope and the inputs reviewed.
- Gate commands found here, in
  `.qfai/spec/03_contract/tech.md#standard-commands-copy-paste`.

## Procedure

1. Refresh the steering as `common-steering-refresh` says.
2. Write the plan, or delegate it (below), and read the inputs.
3. Analyse the project (below).
4. Fix the scope (below) and state it in the stage report.
5. Give each gate in scope a command (below).

## Delegation

Use `.qfai/assistant/rule/agent-selection.md` as the routing SSOT.

- Routed phase: `plan` (`delivery-planner`, `qa-strategist`).

```text
Role: delivery-planner
Task title: Create an execution plan and DoD
Goal: sequence quality gates and evidence work
Inputs:
- current change context
- required gates
Constraints:
- evidence-first
- no self-approval
Return:
- phases + risks + DoD
```

The gate runner and the report writer draft the execution evidence and the
verification summary. The orchestrator consolidates their output and presents
it to the user.

## Project analysis

Before any deliverable, check:

- [ ] README, CHANGELOG and release notes, where present
- [ ] the `.qfai/` layout and its existing story, test and evidence artifacts
- [ ] the project's source tree: entrypoints, core modules, packaged assets
- [ ] where the format, lint, type, test and pack commands are defined
- [ ] runtime versions, the CI matrix and packaging rules

When part of it cannot be done, say what was not verified and continue on the
lowest-risk assumption.

## Scope

Verification is a full scan **within the declared scope**. Do not use
Preflight Diff or any diff-only shortcut: verify is the safety gate and is
never reduced to incremental checks.

"Full scan" means every gate that applies to the current stage, not every gate
in the repository. Each scope names the validate profile that produces it, and
the two must match:

| Scope         | When                                                          | Profile                 |
| ------------- | ------------------------------------------------------------- | ----------------------- |
| `full`        | Any whole-repository run, and every run inside a workflow run | `--profile verify`      |
| `prototyping` | A run checking the prototyping profile alone                  | `--profile prototyping` |

A `full`-profile run is `full` whatever stage triggered it. A prototyping-scoped run covers the prototyping
profile alone: BF, AC and EX test coverage belongs to the later acceptance or
full run and is never fabricated to pass this earlier gate. The closed scope
enum is in `.qfai/assistant/skill/qfai-verify/references/verify-output-contract.md`.

A prototyping-scoped run needs its primary UI contract, and a flow-scoped run
its story source and business flow. Each is hard-required in the parent's
`## Default Autopilot Policy`; one that cannot be resolved stops the run here.

## Stop on detection

For the rest of the run, a contradiction in the spec, an unconsidered case or a
technical obstacle stops the work under Article IX of
`.qfai/assistant/rule/constitution.md`.

## Gate commands

Before any gate runs, check that each gate in scope has an entry in
`.qfai/spec/03_contract/tech.md#standard-commands-copy-paste`, the section
`common-gate-run` reads. Discover and record a missing one as
`.qfai/assistant/rule/shared-skill-operating-baseline.md#standard-commands-mandatory`
says. A gate still without an entry is UNRUN, and no PASS is claimed over it.

## For the rest of the run

Every five major actions, restate the Definition of Done and what does not
count as done, the gates run and those remaining, and the evidence captured
and still missing.

## Gate

The step is done when:

- the inputs are read and the discussion pack is not among them;
- the scope is fixed, matches its profile and is stated in the stage
  report;
- every input the scope needs is resolved;
- every gate in scope has a command in `tech.md`, or is named as UNRUN with
  the missing command.
