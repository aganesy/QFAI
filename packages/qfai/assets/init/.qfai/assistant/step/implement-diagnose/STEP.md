---
name: implement-diagnose
owner: qfai-implement
purpose: "Reproduce a reported failure in one business flow, find its cause and name the repair it needs, without changing any tracked file."
requires: [common-steering-refresh, common-gate-run]
roles:
  - test-design-analyst
  - frontend-engineer
  - backend-engineer
  - devops-ci-engineer
  - completion-reviewer
routing-profile: default
---

# implement-diagnose

Reproduce the failure, find its cause and decide which repair it needs. The
flow is the work order's `target` inside a workflow run, and the invocation's
BF argument otherwise.

## Reads

- The report of the failure: the request, or the work order.
- The flow's stories, acceptance criteria, examples and owning contracts, from
  the configured `paths.specsDir` and `paths.contractsDir`.
- The tests that annotate the flow's IDs, and the commands of
  `common-gate-run`.

## Procedure

1. Reproduce the failure with the smallest command that shows it.
2. List the cause candidates and rule each one in or out by an observation.
3. Name the impact: the BF, AC and EX IDs the failure reaches.
4. Pick exactly one verdict:

| Verdict               | Means                                                            |
| --------------------- | ---------------------------------------------------------------- |
| `missing-test`        | Behaviour a story states has no test that checks it              |
| `defective-test`      | A test checks the wrong thing, or checks the right thing wrongly |
| `regression`          | A correct existing test fails because production code changed    |
| `expectation-differs` | The reporter expects something the story tree does not say       |

## What it writes

- The step changes no file git tracks: no product code, test, story or
  contract file changes, and the result names no changed file.
- A file it writes that git ignores, such as its reproduction record under
  `.qfai/evidence/`, is named in `artifactRefs`, not in `changedFiles`.

Inside a workflow run, the result carries:

- exactly one verdict in `diagnosis.verdict`, one of: `missing-test`,
  `defective-test`, `regression`, `expectation-differs`;
- `matchedIds`, which names the BF, AC or EX IDs of the bound flow that the
  next work order acts on. For `missing-test` it names the EX that states the
  case, or the AC the case falls under where no EX states it;
- `reproductionRef`, which names the record that holds the reproduction, the
  cause candidates and the impact.

## Gate

The step is done when the failure was reproduced, one verdict is recorded
with the observation that supports it, and no tracked file changed.
