# Parallelization Policy

## Default

Process one open EX at a time in ascending ID order within the selected BF
flow. The session agent does the work itself. Work orders for several flows run
one at a time, in ascending flow ID order; the stage's review runs once, after
the last.

## Units

Two kinds of unit may run in parallel, each on its own `fullstack-engineer`:

| Unit   | Where                                                                                     | What the worker does                                                                                                                  |
| ------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Story  | An implement stage only                                                                   | Runs the stage's steps for one user story no EX of which a test annotates yet, in ascending EX ID order, writing only its owned paths |
| Lookup | Discussion research, a grilling session, the web-research search, fetch and verify stages | Answers one self-contained question from the repository or the web, writes nothing, and returns the answer with its sources           |

Everything else runs in the session agent: the specification, the discussion
interview and pack, prototyping, triage, verify, maintenance, the framing of
research and the reading of its answers, and every change to a story that is
already implemented.

## Parallel-unit gate

The session agent fans out only when every condition holds for every pair of
units. It decides alone, records the result in the stage report, and asks the
user nothing.

| #   | Condition                                                                                                                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Each unit is a story unit or a lookup unit, as above                                                                                                                                                    |
| G2  | There are two or more units, and the stage report records that each is large enough to be worth a brief                                                                                                 |
| G3  | Written artifacts hold everything a unit needs: step files, story-tree IDs, contracts, `decisions.md`. A unit whose brief would retell the conversation runs in the session agent                       |
| G4  | Writes are disjoint, compared by read and write sets rather than by file name: production files, test files, fixtures, schema or database objects, generated assets, and shared resources such as ports |
| G5  | No unit needs another unit's output                                                                                                                                                                     |
| G6  | Each unit returns a small result: a diff on its owned paths with its selectors' results, or a cited answer                                                                                              |

Two units that write the same shared fixture or mock file, or mutate the same
fixture instance, fail G4. A shared fixture module that both only read as-is
does not fail it on its own. Where any condition is uncertain, the units run
serially.

## Briefing a unit

Give each worker a self-contained brief, never a fork of the session's
conversation: the step files to run, the story-tree IDs, the exact owned-path
list (empty for a lookup), the checks to run and the shape of its answer.
Give each a checkout assigned by the host. Use separate worktrees when the host
supports editing them; otherwise use the existing shared-index mode in
`.qfai/assistant/rule/workflow.md#concurrency-stage-independent-mandatory`.
Creating a worktree does not grant edit permission. For a refused edit, follow
`.qfai/assistant/rule/shared-skill-delegation-baseline.md#worker-edit-boundary`.
Workers do not change another worker's files or the story tree.

## Integration gate

The session agent integrates the results and resolves every overlap before
judging any story complete. It reruns every story unit's selectors and
`qfai validate --profile tdd --fail-on error --flow BF-NNNN` on the merged
tree; the suites run once, in the verify stage. A worker's isolated PASS is not
an integrated PASS.

On an integration failure, assign the defect to the owning story when the
dependency is known. When the combination itself causes the failure, stop the
fan-out and repair serially. Record the gate's result and the integration
results in the stage report. The decision's record carries the four labelled
Approach items stated at the top of
`.qfai/assistant/skill/qfai-sdd/templates/spec/decisions.md`.

Host limits above this policy: `.qfai/assistant/rule/shared-skill-delegation-baseline.md#host-backstops-above-the-declared-shape`.
