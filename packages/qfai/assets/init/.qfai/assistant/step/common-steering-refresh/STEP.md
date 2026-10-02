---
name: common-steering-refresh
owner: common
purpose: "At a stage's start, find the project facts in policy and technology that are missing or stale, fill the verified ones this stage owns, and record what cannot be verified."
requires: []
roles: []
---

# common-steering-refresh

Design, tests and code fit a project only when its facts are current. The
contract this step serves is
`.qfai/assistant/rule/workflow.md#stage-0--steering-refresh-contract-mandatory`:
it runs at every stage start, and no affected work continues on stale steering.

## Reads

The steering files under `<paths.specsDir>`, resolved from `qfai.config.yaml`
(default `.qfai/spec`):

| File                                                | Holds                                                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `01_policy/objective.md`, `01_policy/initiative.md` | what is built, for whom, what success is, non-goals, release posture                                    |
| `01_policy/principle.md`, `01_policy/constraint.md` | the principles and constraints every design keeps                                                       |
| `03_contract/tech.md`                               | runtime, package manager, stack, dependencies, the Standard commands and a Skeleton line per entrypoint |

## Procedure

1. **Detect.** A file is incomplete when it is missing, has an empty section,
   holds only placeholder text (`<...>`, a lone `-`), carries `TBD`, or states a
   fact the repository contradicts. A table with no rows is complete where the
   template's table has none, and so is a `- None.` list: the project has
   nothing to record there.
2. **Fill what this stage owns.** Derive each fact from the repository and name
   where it was read:
   - the objective from the README, the docs and the project's own issues;
   - runtime, tooling and the Standard commands from the task-runner manifest
     (`package.json` scripts, `Makefile`, `justfile`, `pyproject.toml`,
     `Cargo.toml`, …), then the CI configuration, then the lockfiles;
   - entry points from the file tree and the scripts, one Skeleton line each in
     `tech.md`.
3. **Route what it does not own.** A file another stage owns changes through
   `.qfai/assistant/rule/drift-protocol.md`; the owner reruns.
4. **Record what cannot be verified.** Write `TBD` with what evidence is
   missing, and raise the matching row in `<paths.specsDir>/open-questions.md`.
   Ask the user under the invocation's question policy. Never invent a fact.
5. **Route new facts** found later in the stage to the file that owns them.

The file shapes are the paired templates under
`.qfai/assistant/skill/qfai-sdd/templates/spec/01_policy/` and
`.qfai/assistant/skill/qfai-sdd/templates/spec/03_contract/`.

## Inside a workflow run

A stage reuses the refresh an earlier stage of the run recorded only when the
key recorded with it, recomputed, is equal; on a different key it refreshes only
what changed. The key and its inputs are
`.qfai/assistant/rule/shared-skill-operating-baseline.md#inside-a-workflow-run`.
No stage-specific check is served from that output. Outside a run, the refresh
runs in full at every stage start.

## Gate

Every steering file is complete or carries a documented `TBD` with its open
question, each filled fact names its source, and nothing this stage does not own
was edited.
