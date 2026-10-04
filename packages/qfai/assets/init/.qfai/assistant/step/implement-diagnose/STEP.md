---
name: implement-diagnose
owner: qfai-implement
purpose: "Reproduce a reported failure in one business flow, find its cause and give the one verdict that decides what the run does next. On a fix route the reproduction is a failing test."
requires: [common-gate-run]
roles:
  - test-design-analyst
  - frontend-engineer
  - backend-engineer
  - devops-ci-engineer
routing-profile: default
---

# implement-diagnose

Reproduce the failure, find its cause and decide what it needs. The flow is
the work order's `target` inside a workflow run, and the invocation's BF
argument otherwise.

## Reads

- The report of the failure: the request, or the work order.
- The record of an earlier step the run carries, such as a bisection, a
  minimal input, a harness, a parity check or a baseline measurement.
- The flow's stories, acceptance criteria, examples and owning contracts, from
  the configured `paths.specsDir` and `paths.contractsDir`.
- The tests that annotate the flow's IDs, and the commands of
  `common-gate-run`.

## Procedure

1. Reproduce the failure with the smallest command that shows it. After a
   baseline measurement, profile the measured path instead. On a route of the
   `fix` family other than `improve-performance`, the reproduction is a test,
   as [The failing test](#the-failing-test) states.
2. List the cause candidates and rule each one in or out by an observation.
3. Name the impact: the BF, AC and EX IDs the failure reaches.
4. Pick exactly one verdict:

| Verdict               | Means                                                                           |
| --------------------- | ------------------------------------------------------------------------------- |
| `missing-test`        | Behaviour a story states has no test that checks it                             |
| `defective-test`      | A test checks the wrong thing, or checks the right thing wrongly                |
| `regression`          | A correct existing test fails because production code changed                   |
| `expectation-differs` | The reporter expects something the story tree does not say                      |
| `as-specified`        | The behaviour is what the story tree and the contracts state                    |
| `not-ours`            | The cause lies upstream, with the operator, or in another project               |
| `duplicate`           | An existing item reports the same failure                                       |
| `needs-info`          | Only information the reporter holds can reproduce or decide it                  |
| `surface-conflict`    | Two declared surfaces, such as a spec, a contract, a document or code, disagree |
| `check-gap`           | A check misses the case, or a check the project needs does not exist            |
| `product-race`        | A test fails intermittently because of a race in product code, not in the test  |

The verdict is what the route acts on. Where the route declares this step a
branch point, some verdicts move the run to another route; the step reports
the verdict and does not choose the route.

## The failing test

On a route of the `fix` family other than `improve-performance`, a command or
manual steps alone reproduce nothing. A test that already exists and fails
while the defect is present is the reproduction. For `missing-test`, write the
test that should have caught it, before any production code changes:

1. Put it where the failing behaviour belongs, as
   `.qfai/assistant/rule/test-layers.md` states. Annotate it with the EX that
   states the case. Where no EX states it yet, leave the annotation to
   `implement-tdd`, which appends the EX and annotates the test.
2. Run that test alone and observe its assertion fail for the reported
   behaviour (Red). A load error, a missing dependency or a broken fixture is
   not a Red.
3. Record the test path, the command and the failure in the stage report.

A verdict that moves the work to another route leaves no new test behind:
remove the test written here.

## Read-only mode

A work order may run the step in `read-only` mode, to inspect before a split
or a hand-off. The step then reproduces only by reading and by commands that
change nothing: no install, no migration, no write to a database or a service,
and not the operation the request asks a person to run.

Where the request bundles several findings, the record holds a verdict for
each finding, and the result carries the verdict of the first one the request
lists.

## At a decision point

Where the route declares this step a decision point, such as agreeing how to
make a slow path faster:

- under `gate:user`, put the decision to the operator as a question, return
  `awaiting_input` and change nothing;
- otherwise take the decision and list it in the result's `adopted` as
  `{ step, decision, reason }`.

## What it writes

- The failing test, on a route of the `fix` family. It is the only file the
  step changes: no product code, other test, story or contract file changes.
- Elsewhere, and in read-only mode, the step changes no file git tracks, and
  the result names no changed file.
- Its reproduction record goes in the stage report, not in a file.

Inside a workflow run, the result carries:

- exactly one verdict in `diagnosis.verdict`, one of: `missing-test`,
  `defective-test`, `regression`, `expectation-differs`, `as-specified`,
  `not-ours`, `duplicate`, `needs-info`, `surface-conflict`, `check-gap`,
  `product-race`;
- `matchedIds`, which names the BF, AC or EX IDs of the bound flow that the
  next work order acts on. For `missing-test` it names the EX that states the
  case, or the AC the case falls under where no EX states it;
- `reproductionRef`, which names the record that holds the reproduction, the
  cause candidates and the impact.

## Gate

The step is done when one verdict is recorded with the observation that
supports it, and no tracked file changed but the failing test. That
observation is the reproduction: on a `fix` route the test's observed Red, and
for `needs-info` the attempts that could not reproduce it.
