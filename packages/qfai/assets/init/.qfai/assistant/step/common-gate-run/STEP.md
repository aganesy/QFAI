---
name: common-gate-run
owner: common
purpose: "Run one gate — a qfai validate profile or a project command from the Standard commands — and record its command, result and revision, so a gate that did not run is never read as a pass."
requires: []
roles: []
---

# common-gate-run

The calling step names the gate and the scope. This step resolves the command,
runs it and records what happened. Where a command comes from is
`.qfai/assistant/rule/shared-skill-operating-baseline.md#standard-commands-mandatory`,
and how a failure is handled is
`.qfai/assistant/rule/shared-skill-operating-baseline.md#gate-failure-autorepair-protocol`.
Neither is restated here.

## Reads

- `<paths.contractsDir>/tech.md#standard-commands-copy-paste` for a project
  command: Install, Format, Test, Lint, Typecheck, Build, Skeleton or Validate.
- `qfai.config.yaml` for `paths.contractsDir`, `paths.outDir` and the test
  globs.
- The launcher the preflight established, for a qfai command
  (`.qfai/assistant/rule/shared-skill-operating-baseline.md#canonical-qfai-launcher-mandatory`).

## Procedure

1. **Resolve the launcher once per stage.** Before the first qfai gate, run the
   launcher preflight. Where it fails, every qfai gate is UNRUN: record it as a
   blocker and stop.
2. **Resolve the command.** A qfai gate is the validate profile and scope the
   calling step names, for example
   `npx qfai validate --profile sdd --fail-on error --flow BF-NNNN`. A project
   gate is the matching entry of the Standard commands section, used as
   written. An entry that is missing makes the gate UNRUN: record it and route
   the gap as the rule says; never substitute a command from another stack.
3. **Run it** on the tree the stage will hand to its reviewer, in the
   environment the section declares.
4. **Record** in the stage evidence (`common-evidence-record`): the exact
   command, the exit code, the counts or outcome, the revision the run read,
   and for a validate run the `<paths.outDir>/validate.log` path and the
   `run-*/` directory its `run_log:` line names. The CLI writes that log on
   every run; shell redirection is not needed.
5. **Read a validate result from its JSON** where the step selects work from
   it. The result is usable only when the file exists, its `profile` is the one
   run, and its `generatedAt` is no earlier than this run's start. Read `counts`
   for the verdict and `issues[].code` for each finding; the array is `issues`
   (`.qfai/assistant/skill/qfai-verify/references/validate-json-schema.md`).
6. **On a failure**, classify each finding and repair only what this stage
   owns, then rerun the same gate on the same scope. A gate that failed and then
   passed with no change in between is a nondeterministic gate: record every
   run, in order.

## Scope

- A flow-scoped gate covers that flow. A result for another flow or another
  profile does not close it, and a sibling flow still being edited is not part
  of it.
- A finding attributed to another flow or owner is reported with that owner. It
  is neither repaired here nor counted as this gate's pass.
- A repository-wide PASS is never claimed from one flow's result.

## Outcomes

| Outcome | Means                                                              |
| ------- | ------------------------------------------------------------------ |
| `PASS`  | The command ran on the reviewed tree and exited 0 with zero errors |
| `FAIL`  | The command ran and reported an error or a non-zero exit           |
| `UNRUN` | No command, no launcher, or no environment to run it in            |

Only `PASS` satisfies a gate. `FAIL` and `UNRUN` go in the stop report with the
reason and the retry condition. Do not weaken a profile, lower `--fail-on`,
waive an error or invent a result to reach `PASS`.
