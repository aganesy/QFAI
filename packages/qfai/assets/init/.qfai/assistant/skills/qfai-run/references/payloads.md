# qfai-run payloads

The calls `qfai-run` makes, and the files it writes for them. Field names are
exact: an unknown key is refused.

## Calls

| Call                                                   | When                                          |
| ------------------------------------------------------ | --------------------------------------------- |
| `npx qfai workflow status [--run <runId>]`             | First, for the mode and any run in progress   |
| `npx qfai workflow start --in <file>`                  | A new change request in mode `active`         |
| `npx qfai workflow next --run <runId>`                 | For the routing work order, then each stage's |
| `npx qfai workflow accept --run <runId> --in <file>`   | With a routing result or a stage result       |
| `npx qfai workflow decision --run <runId> --in <file>` | With the operator's answer, or their `stop`   |
| `npx qfai workflow resume --run <runId>`               | When the operator says `continue`             |
| `npx qfai workflow finish --run <runId>`               | When `next` returns no work order             |

- Each call prints one JSON document.
- An `--in` file lies under `.qfai/runs/`: the start input under
  `.qfai/runs/inbox/`, every later payload under `.qfai/runs/<runId>/inbox/`.
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
      { "kind": "spec-id", "ref": "spec-0002" }
    ],
    "observedRefs": [{ "kind": "path", "ref": "src/checkout/total.ts" }],
    "affectedSpecIds": ["spec-0002"],
    "riskSignals": [],
    "unresolvedQuestions": [],
    "newCapabilities": [],
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
- `expectedBehaviorRefs` takes `request`, `spec-id`, `contract-id` and `path`.
  `observedRefs` takes `path` and `evidence`. A path is project-relative, names
  a file that exists, and holds no glob.
- `newCapabilities` holds `{ goal, covers, excludes, evidence }` for each
  capability no spec owns. `evidence` is what shows no spec owns it.
- `proposedWriteScope` never names `.git/`, `.qfai/runs/`, `.qfai/decisions/`,
  `.qfai/evidence/decisions/`, `.qfai/evidence/workflow/`,
  `.qfai/evidence/change-request-*.md` or `.qfai/evidence/decision-*.md`, and
  never overlaps a protected target. The run refuses any of these.

Each stage kind adds only its narrowest set to `proposedWriteScope`:
`sdd_delta` the spec packs its `affectedSpecIds` name; `sdd` `.qfai/specs/**`
and `_policies/**`, only for a new capability; `discussion` its tracked records,
and `DESIGN.md` for a UI-bearing target; a UI-bearing `prototype`
`.qfai/contracts/design/**`.

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
- The operator's stop is `{ "stop": true, "answeredBy": "..." }`, with no
  question open.

## Stage result

The executor skill returns it. `qfai-run` writes it to the run's inbox as the
skill gave it, and never edits its outcome, its review results or its
changed-file list.
