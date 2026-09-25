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
  "proposal": {
    "requestKind": "change",
    "candidateRoute": "bugfix",
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
    "requiredStages": ["diagnose", "implement", "verify"],
    "rationale": "A short reason a reviewer can check"
  }
}
```

- `requestKind` is `change`, `read_only`, `plan_only`, `verify_only`, `resume`,
  `cancel` or `explicit_stage`. Only `change` takes a route; the others carry
  `candidateRoute: null` and write nothing.
- `candidateRoute` is `direct`, `bugfix`, `bounded-change`, `feature` or
  `discovery`.
- `expectedBehaviorRefs` takes `request`, `flow-id`, `contract-id` and `path`.
  `observedRefs` takes `path` and `evidence`. A path is project-relative, names
  a file that exists, and holds no glob.
- A `contract-id` reference is refused as unknown. Name the contract file as a
  `path` instead.
- `affectedFlowIds` names exactly one business flow when `newStories` is empty
  and the plan has a stage that works on a flow.
- `newStories` holds `{ goal, covers, excludes, evidence, flowId }` for each
  story the plan needs that no existing story represents. `flowId` is the flow
  it joins, or `null` when the story needs a new flow. `evidence` is what shows
  no story represents it. The run asks one `create` question for each entry.
- `proposedWriteScope` never names `.git/`, `.qfai/run/`,
  `.qfai/evidence/workflow/`, `.qfai/evidence/decision/`, or `decisions.md` or
  `open-questions.md` under `paths.specsDir`, and never overlaps a protected
  target. The run refuses any of these.

Each stage kind adds only its narrowest set to `proposedWriteScope`:

| Stage kind              | Write areas                                                             |
| ----------------------- | ----------------------------------------------------------------------- |
| `sdd_delta`             | The story and contract files of the bound flow it changes               |
| `sdd`                   | The new story's directory, or the new flow's for a story that needs one |
| `discussion`            | Its tracked records, and `DESIGN.md` for a UI-bearing target            |
| `prototype`, UI-bearing | `<paths.contractsDir>/design/**`                                        |

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

## Stage result

The executor skill returns it. `qfai-run` writes it to the run's inbox as the
skill gave it, and never edits its outcome, its review results or its
changed-file list.
