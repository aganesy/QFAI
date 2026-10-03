# qfai-run plan

The one command `qfai-run` calls, what it reads and what it prints. Field names
are exact: an unknown key is refused.

## Calls

| Call                                     | When                                                         |
| ---------------------------------------- | ------------------------------------------------------------ |
| `npx qfai workflow plan --in <file>`     | A request, with its extraction in a JSON file                |
| `npx qfai workflow plan --in -`          | The same, with the extraction on standard input              |
| `npx qfai workflow plan --route <route>` | The candidate chosen, a branch destination, or a new session |

- Each call prints one JSON document and writes no file.
- Exit 0 is a plan or candidates, 2 a refused input, and 1 a plan the package
  ships that does not load in this project.
- The request text never goes on the command line or into the extraction.

## Extraction

The facts `references/extraction.md` defines, and nothing else. It names no
route, stage or step.

```json
{
  "intent": "defect",
  "entryFlags": ["repro", "expect"],
  "qualifiers": [],
  "signals": [],
  "risks": [],
  "gate": "none",
  "artifacts": ["code", "tests"],
  "confidence": "high"
}
```

At `low` confidence, `alternatives` holds the one or two other readings, each
with `intent`, `entryFlags`, `qualifiers` and `signals`.

## Plan

The route, its stages in order with each step's file, and its points.

```json
{
  "ok": true,
  "route": "route-a",
  "family": "fix",
  "rule": 27,
  "stages": [
    {
      "id": "diagnose",
      "kind": "diagnose",
      "steps": [
        {
          "name": "implement-diagnose",
          "path": ".qfai/assistant/step/implement-diagnose/STEP.md",
          "mode": null,
          "passThrough": false
        }
      ]
    },
    {
      "id": "spec",
      "kind": "sdd_append",
      "review": "spec",
      "steps": [
        {
          "name": "sdd-story",
          "path": ".qfai/assistant/step/sdd-story/STEP.md",
          "mode": null,
          "passThrough": true
        },
        {
          "name": "sdd-gate",
          "path": ".qfai/assistant/step/sdd-gate/STEP.md",
          "mode": null,
          "passThrough": false
        }
      ]
    }
  ],
  "decisionPoints": [],
  "releasePoint": null,
  "branchPoints": [
    {
      "step": "implement-diagnose",
      "outcomes": [{ "outcome": "regression", "routes": ["route-b"] }]
    }
  ]
}
```

| Field            | Meaning                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `rule`           | The decision rule that chose the route; `null` when none held; absent for `--route`       |
| `review`         | `spec` or `code`: the review that follows the stage; absent where none does               |
| `mode`           | `settled` or `read-only` where the plan fixes how the step runs; otherwise `null`         |
| `passThrough`    | The step runs, and writes nothing when it shows it has nothing to write                   |
| `decisionPoints` | The steps that put each critical decision to the user before acting on it                 |
| `releasePoint`   | The step the user approves the release before, `end` for after the last stage, or `null`  |
| `branchPoints`   | Each outcome with its destinations; `decision-table` means plan the step's new extraction |

## Candidates

A `low` extraction whose readings reach two or three routes returns them in the
order the decision rules reach them, the main reading's route recommended.

```json
{
  "ok": true,
  "candidates": [
    {
      "route": "route-c",
      "family": "decide",
      "rule": 13,
      "summary": "Settle the decision before any change.",
      "recommended": false
    },
    {
      "route": "route-d",
      "family": "change",
      "rule": 28,
      "summary": "Change the product's behaviour.",
      "recommended": true
    }
  ]
}
```

## Refusal

```json
{
  "ok": false,
  "message": "The extraction has a field this command does not take. Fix it and try again.",
  "reasons": [{ "reason": "schema", "subject": "candidateRoute" }]
}
```

`reason` is `invalid-input` for the command line or an input that is not JSON,
`schema` for an extraction field, `unknown-route` for a route the catalog does
not name, `plan-invalid` for a plan that does not load, naming its `file` and
`cause`, and `io-error` for a file that cannot be read.
