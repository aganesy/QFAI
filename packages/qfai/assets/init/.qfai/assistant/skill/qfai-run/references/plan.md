# qfai-run plan

The one command `qfai-run` calls, what it reads and what it prints. Field names
are exact: an unknown key is refused.

## Contents

- Calls
- Extraction
- Plan
- Candidates
- Scopes
- Refusal

## Calls

| Call                                     | When                                                                    |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `npx qfai workflow plan --in <file>`     | A request, with its extraction in a JSON file                           |
| `npx qfai workflow plan --in -`          | The same, with the extraction on standard input                         |
| `npx qfai workflow plan --route <route>` | The candidate chosen, or a branch destination                           |
| `npx qfai workflow plan --order`         | An operation the session runs itself that deletes nothing, with no file |

- Each call prints one JSON document and writes no file.
- Exit 0 is a plan or candidates, 2 a refused input, and 1 an input file that
  cannot be read or a plan the package ships that does not load in this project.
- The request text never goes on the command line or into the extraction.

## Extraction

The facts the extraction reference defines, and nothing else. It names no
route, stage or step.

```json
{
  "intent": "defect",
  "entryFlags": ["repro", "expect"],
  "qualifiers": [],
  "signals": [],
  "risks": [],
  "artifacts": ["code", "tests"],
  "confidence": "high"
}
```

At `low` confidence, `alternatives` holds the one or two other readings, each
with `intent`, `entryFlags`, `qualifiers` and `signals`. The optional
`flows` lists the business flows the implementation works, as distinct
`BF-NNNN` IDs.

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
      "id": "note",
      "kind": "verify",
      "review": "code",
      "steps": [
        {
          "name": "verify-change-note",
          "path": ".qfai/assistant/step/verify-change-note/STEP.md",
          "mode": null,
          "passThrough": true
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
  ],
  "scopes": [{ "scope": "broad", "stages": ["diagnose", "note"], "recommended": true }]
}
```

| Field            | Meaning                                                                                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rule`           | The decision rule that chose the route; `null` when none held; absent for `--route`                                                                             |
| `review`         | `spec` or `code`: the review that follows the stage; absent where none does                                                                                     |
| `mode`           | `settled` or `read-only` where the plan fixes how the step runs; otherwise `null`                                                                               |
| `passThrough`    | The step runs, and writes nothing when it shows it has nothing to write                                                                                         |
| `decisionPoints` | The steps that put each critical decision to the user before acting on it; with the `decision` flag set, a plan that names none gets its first step that writes |
| `releasePoint`   | The step the user approves the release before, `end` for after the last stage, or `null`                                                                        |
| `branchPoints`   | Each outcome with its destinations; `decision-table` means plan the step's new extraction                                                                       |
| `scopes`         | How far the work may go, narrowest first; absent for `--route`                                                                                                  |
| `workOrders`     | On an implement stage when the extraction lists `flows`: one `{ target }` per flow, in ascending ID order; absent otherwise                                     |

A plan from an extraction that names `spec` or `contract` can hold a `spec`
stage its route's catalog row lacks, when no stage of the route is marked for
the `spec` review; run it like any other stage.

A stage with `workOrders` runs every one of its steps once per work order, for
that work order's `target` flow alone, before the next stage starts. Run the
work orders in the order listed; the implementation skill's parallelization
policy says when two may run at once. No work order adds a step, a stage or a
review. The stage's review runs once, after its last work order. A plan
`--route` returns has none: for a chosen candidate or a branch destination, give
each of its implement stages one work order per flow of the extraction's
`flows`, in ascending ID order.

## Candidates

A `low` extraction returns the distinct routes its readings reach, one to three,
in the order the decision rules reach them, the main reading's route
recommended. Each candidate carries the `decisionPoints` its reading gives;
the plan `--route` returns for the chosen one takes them in place of its own.

```json
{
  "ok": true,
  "candidates": [
    {
      "route": "route-c",
      "family": "decide",
      "rule": 13,
      "summary": "Settle the decision before any change. Stages: discussion, close.",
      "recommended": false,
      "scopes": [{ "scope": "broad", "stages": ["discussion", "close"], "recommended": true }],
      "decisionPoints": ["discussion-interview"]
    },
    {
      "route": "route-d",
      "family": "change",
      "rule": 28,
      "summary": "Change the product's behaviour. Stages: spec, prototype, implement, verify.",
      "recommended": true,
      "scopes": [
        { "scope": "narrow", "stages": ["spec", "prototype"], "recommended": true },
        { "scope": "medium", "stages": ["spec", "prototype", "verify"], "recommended": false },
        {
          "scope": "broad",
          "stages": ["spec", "prototype", "implement", "verify"],
          "recommended": false
        }
      ],
      "decisionPoints": ["sdd-triage"]
    }
  ]
}
```

## Scopes

Each scope is `{ scope, stages, recommended }`: `narrow`, `medium` or `broad`,
the ids of the stages it runs in plan order, and `true` for the narrowest.

- `narrow` runs the stages up to the last one that writes an artifact the
  extraction names, less any implementation that writes none of them. When those stages include implementation or a test fix, the
  change note and the gates that end the route follow; when they reach the route's last stage
  that writes code, every verify stage that ends the route follows.
- `medium` adds the change note and the gates to those stages; where `narrow`
  already holds implementation, it equals `narrow`. It is listed unless `broad`
  adds only pass-through stages that write neither code nor tests and have no review.
- Documentation-only maintenance or procedure writing keeps the change note
  and closing gates. A procedure plan therefore gets `broad` alone.
- A security intake plan gets `broad` alone.
- `broad` runs every stage.

A scope holding every stage is `broad`, and `medium` is left out when it equals `narrow`. A scope is also left
out when the next wider one adds only such pass-through stages. An extraction with
no artifacts, or whose route writes nothing, gets `broad` alone. A candidate
keeps its scopes: `--route` returns none.

## Refusal

```json
{
  "ok": false,
  "message": "The extraction has a field this command does not take. Fix it and try again.",
  "reasons": [
    {
      "reason": "schema",
      "subject": "candidateRoute",
      "cause": "unknown: candidateRoute is not a field here"
    }
  ]
}
```

`reason` is `invalid-input` for the command line or an input that is not JSON,
`schema` for an extraction field, naming its `cause`: `missing` for a required
field that is absent, `unknown` for a key the extraction does not take,
`wrong-type` for a value of another type, `wrong-value` for a value outside the
field's vocabulary, and `invalid` for the rules tying `alternatives` to
`confidence`, refusing an empty or repeated `flows`, or requiring `owned-temporary-cleanup` to use `intent: order` and
empty `artifacts`, including alternative readings. Each cause states what was
expected and received, or the field name. `unknown-route` for a route the catalog does
not name, `plan-invalid` for a plan that does not load, naming its `file` and
`cause`, `artifact-unserved` for an artifact the extraction names when no stage
of the route writes any artifact it names, so the work stops before the first
stage and the session names the artifact, and `io-error` for a file that cannot
be read.
