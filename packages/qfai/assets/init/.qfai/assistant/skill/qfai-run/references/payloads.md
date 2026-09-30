# qfai-run payloads

The calls `qfai-run` makes, and the files it writes for them. Field names are
exact: an unknown key is refused.

## Calls

| Call                                                   | When                                                  |
| ------------------------------------------------------ | ----------------------------------------------------- |
| `npx qfai workflow status [--run <runId>]`             | First, for the mode and any run in progress           |
| `npx qfai workflow start --in <file>`                  | A new change request in mode `active`                 |
| `npx qfai workflow next --run <runId>`                 | For the routing work order, then each stage's         |
| `npx qfai workflow accept --run <runId> --in <file>`   | With a routing result or a stage result               |
| `npx qfai workflow decision --run <runId> --in <file>` | With the operator's answer, or their `stop`           |
| `npx qfai workflow resume --run <runId>`               | When the operator says `continue`                     |
| `npx qfai workflow finish --run <runId>`               | When `next` reports `ready` with every stage accepted |

- Each call prints one JSON document.
- An `--in` file lies under `.qfai/run/`: the start input under
  `.qfai/run/inbox/`, every later payload under `.qfai/run/<runId>/inbox/`.
- A retry after a lost response re-sends the same file.

## Start input

```json
{
  "request": { "text": "The change, exactly as the operator wrote it" },
  "completionTarget": "qfai_done",
  "harness": {
    "host": "claude-code",
    "capabilities": {
      "fetchSkillBody": true,
      "invokeStage": true,
      "delegateSubAgent": true,
      "relayQuestion": true,
      "runShellAndTests": true,
      "writeProjectRoot": true,
      "keepRunRecord": true,
      "resume": true
    }
  }
}
```

- `host` is `claude-code` or `codex`.
- Report a capability `false` when the host lacks it. `start` then refuses and
  names it.

## Routing result

The routing work order's result carries the proposal.

```json
{
  "resultId": "route-1",
  "workOrderId": "<from the work order>",
  "stageInstanceId": "<from the work order>",
  "attempt": 1,
  "expectedSequence": 3,
  "outcome": "accepted",
  "testObservation": "not_applicable",
  "actor": { "agentInstance": "routing-1" },
  "proposal": {
    "requestKind": "routed",
    "extraction": {
      "intent": "defect",
      "entryFlags": ["repro", "expect"],
      "qualifiers": [],
      "signals": [],
      "risks": [],
      "gate": "none",
      "artifacts": ["code", "tests"],
      "confidence": "high"
    },
    "goal": "One sentence",
    "expectedBehaviorRefs": [
      { "kind": "request", "ref": "request" },
      { "kind": "flow-id", "ref": "BF-0002" }
    ],
    "observedRefs": [{ "kind": "path", "ref": "src/checkout/total.ts" }],
    "affectedFlowIds": ["BF-0002"],
    "riskSignals": [],
    "unresolvedQuestions": [],
    "newStories": [],
    "proposedWriteScope": ["src/checkout/**", "tests/checkout/**"],
    "protectedTargets": [],
    "rationale": "A short reason a reviewer can check"
  }
}
```

- `actor` names the agent instance that wrote the extraction. The run records
  it as the recommender, and never counts it as an independent reviewer.
- `requestKind` is `routed`: a change, a question, a proposal to decide or a
  report to close. The run refuses any other kind.
- `extraction` holds the facts `references/extraction.md` defines: `intent`,
  `entryFlags`, `qualifiers`, `signals`, `risks`, `gate`, `artifacts` and
  `confidence`. `alternatives` is required at `low`, allowed at `medium` and
  left out at `high`; each one is `{ intent, entryFlags, qualifiers, signals }`.
- At `accept`, the CLI's decision rules choose the route from the extraction.
  A proposal names no route, stage or step: the run refuses
  `candidateRoute`, `route`, `requiredStages` and `optionalSteps` as unknown
  keys.
- `expectedBehaviorRefs` takes `request`, `flow-id`, `contract-id` and `path`.
  `observedRefs` takes `path` and `evidence`. A path is project-relative, names
  a file that exists, and holds no glob.
- A `contract-id` reference is refused as unknown. Name the contract file as a
  `path` instead.
- `affectedFlowIds` names exactly one business flow when `newStories` is empty
  and the plan has a stage that works on a flow. A route whose only such stage
  is a test fix takes one flow or none, and any other route binds none.
- A change to several flows runs once per flow. Narrow the goal and the write
  scope to one flow. Once `finish` reports that run, start the next with the
  same request for the next flow, without asking the operator.
- A route that ends by closing the request writes nothing but the records its
  discussion stage keeps, so its `proposedWriteScope` names nothing else.
- `newStories` holds `{ goal, covers, excludes, evidence, flowId }` for each
  story the plan needs that no existing story represents. `flowId` is the flow
  it joins, or `null` when the story needs a new flow. `evidence` is what shows
  no story represents it. The run asks one `create` question for each entry.
- `proposedWriteScope` never names `.git/`, `.qfai/run/`,
  `.qfai/evidence/workflow/`, `.qfai/evidence/decision/`, or `decisions.md` or
  `open-questions.md` under `paths.specsDir`, and never overlaps a protected
  target. The run refuses any of these.
- A check that depends on the chosen route, such as the flow binding or the
  write scope of a route that changes nothing, can refuse a proposal whose
  extraction was valid. Revise it by the reasons `proposal-refused` lists.
- After a re-route the routing work order carries `reroute`, and its route is
  already fixed. The result has the same shape, extraction included, but the
  decision rules do not choose again. It supplies the scope, the flows and the
  new stories for the fixed route.

Each stage kind adds only its narrowest set to `proposedWriteScope`:

| Stage kind              | Write areas                                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `sdd`                   | The story and contract files of the bound flow it changes, the new story's directory or the new flow's for a story that needs one, and `DESIGN.md` for a UI-bearing flow |
| `discussion`            | Its tracked records                                                                                                                                                      |
| `triage` and `diagnose` | Nothing                                                                                                                                                                  |

A stage's own evidence file and table rows are not named: the run derives them
from the stage kind.

## Question input

A routing or stage result carries a question as:

```json
{
  "kind": "decision",
  "text": "The question as the operator will see it",
  "options": [
    { "optionId": "keep", "label": "Keep it", "description": "What follows", "effect": "proceed" },
    { "optionId": "drop", "label": "Drop it", "description": "What follows", "effect": "stop" }
  ],
  "selection": { "min": 1, "max": 1 },
  "recommendation": "keep"
}
```

- `kind` is `decision`, `fact` or `create`. A `fact` question has no
  `recommendation`; one with no options carries `effect` instead.
- `effect` is `proceed`, `replan` or `stop`.

## Decision input

```json
{
  "questionId": "<from status or next>",
  "answer": { "optionIds": ["keep"] },
  "answeredBy": "the operator's name as the host reports it",
  "expectedSequence": 7
}
```

- A value answers as `"answer": { "value": "..." }`.
- The operator's stop is `{ "stop": true, "answeredBy": "..." }`, whether or
  not a question is open.
- An answer that approves a change is written into the `decisions.md` row the
  run appends: who answered, when, and what was approved. The values come from
  the run's authorization record: its `answeredBy`, its `recordedAt`, and the
  `question.options[].label` of each option the answer chose. The run's own
  records under `.qfai/evidence/workflow/` stay local and are never committed.

## Work order

`next` returns one per stage. Hand it whole to one sub-agent.

```json
{
  "runId": "run-20260927090000000",
  "workOrderId": "work-order-implement-1",
  "stageInstanceId": "implement",
  "attempt": 1,
  "stageKind": "implement",
  "target": { "kind": "flow", "flowId": "BF-0002" },
  "steps": [
    {
      "name": "implement-tdd",
      "path": ".qfai/assistant/step/implement-tdd/STEP.md",
      "mode": null,
      "passThrough": false,
      "decisionPoint": null,
      "branchPoint": false
    },
    {
      "name": "implement-checkpoint",
      "path": ".qfai/assistant/step/implement-checkpoint/STEP.md",
      "mode": null,
      "passThrough": false,
      "decisionPoint": null,
      "branchPoint": false
    }
  ],
  "scope": {
    "digest": "<scope digest>",
    "writeAreas": ["src/checkout/**", "tests/checkout/**"],
    "protectedTargets": [],
    "allowedEffects": [],
    "nonGoals": []
  },
  "modifiers": [],
  "recordAreas": [".qfai/evidence/implement-BF-0002.md"],
  "inputs": [],
  "requiredGates": [],
  "requiredReviewerRoles": ["completion-reviewer", "qa-gatekeeper", "implementation-reviewer"],
  "actorHistory": [],
  "authorizationRefs": [],
  "priorStageReceiptRefs": [],
  "expectedSequence": 9
}
```

- `steps` lists every step the stage runs, in order. The sub-agent reads a
  step's `path` when it reaches that step, never before.
- A step with `passThrough: true` still runs. When it shows it has nothing to
  write, the result records a pass for it, and writes nothing for that step.
- The stage is reviewed once, after its last step, by every role in
  `requiredReviewerRoles`.
- The routing work order carries `executor` `qfai-run` and `operation` `route`
  instead of `steps`.
- A routing work order issued by a re-route also carries
  `reroute: { route, fromStep, outcome }`: the route the run moves to, and the
  step and the outcome that sent it there. Its result follows
  [Routing result](#routing-result).
- A step with `branchPoint: true` can send the run to another route. It reports
  that through the stage result's `branch`, or its diagnosis `verdict`.

## Stage result

The sub-agent that ran the work order's steps returns it. `qfai-run` writes it to the run's inbox as the
skill gave it, and never edits its outcome, its review results or its
changed-file list. It names its author in `actor`, as the routing result does.
A result with no `actor`, a field of the wrong shape or an unknown key is
refused before the run reads it.

- `passes` holds `{ step, reason, evidenceRef }` for each pass-through step
  that had nothing to write. `evidenceRef` names a git-ignored record of what
  the step read. The run refuses a pass for a step its work order does not mark
  `passThrough`, and a pass while work the step owns remains.
- `branch` holds `{ outcome, route?, extraction? }` from a step marked
  `branchPoint: true` other than `implement-diagnose`, which reports its
  diagnosis `verdict` instead:
  - `outcome` is one the step declares;
  - `route` picks one of several destinations the step names for that outcome;
  - `extraction` is `{ intent, entryFlags, qualifiers, signals }`, from which the
    decision rules choose the destination when the step leaves it to them.
- A `branch` moves the run to routing with the destination fixed. A result
  without one continues the route.
- A `branch` from a step that is not a branch point, an outcome the step does
  not declare, or a `route` outside its destinations is refused `invalid-input`
  with reason `branch-undeclared`.
