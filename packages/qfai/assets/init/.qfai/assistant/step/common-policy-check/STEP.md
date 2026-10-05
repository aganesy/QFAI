---
name: common-policy-check
owner: common
purpose: "Once, at the start of a run, find the project facts in policy and technology that are missing or stale, fill the verified ones the run owns, and record what cannot be verified."
requires: []
roles: []
---

# common-policy-check

Design, tests and code fit a project only when its facts are current. The
contract this step serves is
`.qfai/assistant/rule/workflow.md#policy-check-mandatory`:
it runs once per run, at the start, and no affected work continues on stale policy.

## Reads

The policy files under `<paths.specsDir>`, resolved from `qfai.config.yaml`
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
2. **Fill what the run owns.** Derive each fact from the repository and name
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
5. **Route new facts** found later in the run to the file that owns them.

The file shapes are the paired templates under
`.qfai/assistant/skill/qfai-sdd/templates/spec/01_policy/` and
`.qfai/assistant/skill/qfai-sdd/templates/spec/03_contract/`.

## Gate

Every policy file is complete or carries a documented `TBD` with its open
question, each filled fact names its source, and nothing the run does not own
was edited.
