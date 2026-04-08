# evidence

## Purpose

Evidence files record what was actually executed, observed, skipped, or deferred.

## Prototyping stage required artifacts

`/qfai-prototyping` uses these canonical files:

- `.qfai/evidence/prototyping.md`
- `.qfai/evidence/prototyping.json`
- `.qfai/evidence/render.json` (when render evidence is emitted)
- `.qfai/evidence/browser-qa.json` (when browser QA is emitted)

## prototyping.json minimum schema

Always required:

- `specs[]`
- `meta.generatedAt`
- `meta.toolVersion`
- `meta.commands[]`
- `mode.effective`
- `mode.source`
- `mode.rationale`

Optional:

- `surface`
- `mode.requested`
- `mode.discussionRecommendation`
- `runtimeGate`
- `uiFidelity`
- `renderEvidence`
- `browserQa`
- `fullHarness`

## Obligation matrix

| surface / mode         | specs    | runtimeGate | uiFidelity                    | render evidence | browser QA | fullHarness |
| ---------------------- | -------- | ----------- | ----------------------------- | --------------- | ---------- | ----------- |
| web / low-cost         | required | optional    | optional (`skeleton` allowed) | optional        | optional   | absent      |
| web / standard         | required | optional    | required                      | optional        | optional   | absent      |
| web / full-harness     | required | required    | required                      | required        | required   | required    |
| mobile / low-cost      | required | optional    | optional (`skeleton` allowed) | optional        | optional   | absent      |
| mobile / standard      | required | optional    | required                      | optional        | optional   | absent      |
| mobile / full-harness  | required | required    | required                      | required        | required   | required    |
| desktop / low-cost     | required | optional    | optional (`skeleton` allowed) | optional        | optional   | absent      |
| desktop / standard     | required | optional    | required                      | optional        | optional   | absent      |
| desktop / full-harness | required | required    | required                      | required        | required   | required    |
| cli / low-cost         | required | optional    | n/a                           | n/a             | n/a        | absent      |
| cli / standard         | required | optional    | n/a                           | n/a             | n/a        | absent      |
| cli / full-harness     | required | optional    | n/a                           | n/a             | n/a        | required    |
| mixed / low-cost       | required | optional    | optional (`skeleton` allowed) | optional        | optional   | absent      |
| mixed / standard       | required | optional    | required                      | optional        | optional   | absent      |
| mixed / full-harness   | required | required    | required                      | required        | required   | required    |

Interpretation:

- `required`: schema and completeness are enforced
- `optional`: if present, schema must be valid
- `n/a`: absent is normal success

## cli surface canonical semantics

For `cli` surface, the following are normal success when absent:

- `uiFidelity`
- render evidence bundle
- browser QA bundle
- `runtimeGate.ui`

`ui_bearing: false` specs are not prototyping execution targets. Contradictory UI-only payloads on `cli` surface are validation errors.

## uiFidelity notes

- `uiFidelity` is the canonical UI evidence block.
- `mode: interactive` is the default when a working UI flow is exercised.
- `mode: skeleton` is allowed for low-cost UI proof where structure exists but wiring is intentionally partial.
- Keep `"version": "0.1"` in the `uiFidelity` payload until the schema version changes.

## fullHarness schema v2

When `mode.effective = "full-harness"`:

| Field                        | Type                                                                  | Required       | Description                                             |
| ---------------------------- | --------------------------------------------------------------------- | -------------- | ------------------------------------------------------- |
| `enabled`                    | `true`                                                                | yes            | Always true for full-harness                            |
| `runId`                      | string                                                                | yes            | Unique run identifier                                   |
| `calibrationRef.configPath`  | string                                                                | yes            | Path to qfai.config.yaml                                |
| `calibrationRef.packPath`    | string                                                                | yes            | Path to calibration pack                                |
| `calibrationRef.packVersion` | string                                                                | yes            | Calibration pack version                                |
| `iterationCount`             | number                                                                | yes            | Total iterations recorded                               |
| `bestIteration`              | number                                                                | yes            | Iteration with highest weightedTotal                    |
| `status`                     | `"in-progress"` \| `"completed"`                                      | yes            | Current harness status                                  |
| `terminationReason`          | `"converged"` \| `"max-iterations"` \| `"plateau"` \| `"manual-stop"` | when completed | Required when status=completed                          |
| `reviewerSignoff.reviewerId` | string                                                                | yes            | Real reviewer identifier (placeholders rejected)        |
| `reviewerSignoff.status`     | `"approved"` \| `"rejected"`                                          | yes            | Signoff status                                          |
| `reviewerSignoff.timestamp`  | string                                                                | yes            | ISO timestamp                                           |
| `reviewerSignoff.source`     | `"cli"`                                                               | yes            | Always "cli"                                            |
| `reviewerLogs[]`             | array                                                                 | yes            | Per-iteration reviewer verdicts                         |
| `iterations[]`               | array                                                                 | yes            | Full iteration records with L1/L2/commitSha/limitations |
| `scoringTrace[]`             | array                                                                 | yes            | Per-iteration scoring summary                           |
| `limitations[]`              | string[]                                                              | yes            | Unresolved limitations                                  |

**Truthfulness rules:**

- `weightedTotal = min(l1.total, l2.total)` — validator enforces this invariant
- `commitSha` is mandatory on every iteration — must be a real git commit
- `limitations` is mandatory — empty array is valid, absent is not
- `reviewerId` must not be a placeholder (e.g., "qfai", "default", "none")
- `observed` values in uiFidelity must come from real measurement, not copied from `expected`
- `mockPaths` must come from real browser QA findings, not auto-generated as "pass"
- `specCoverage` must come from real spec/runtime evidence, not zero-seeded

## Render evidence bundle conventions

Canonical path: `.qfai/evidence/render.json`

```json
{
  "renderEvidence": {
    "status": "captured",
    "requested": true,
    "viewports": ["desktop", "mobile"],
    "outputPath": ".qfai/evidence/render.json"
  },
  "screens": [
    {
      "route": "/orders",
      "viewport": "desktop",
      "status": "captured",
      "width": 1440,
      "height": 900,
      "imagePath": ".qfai/evidence/render/orders.desktop.png",
      "htmlPath": ".qfai/evidence/render/orders.desktop.html"
    },
    {
      "route": "/orders",
      "viewport": "mobile",
      "status": "skipped",
      "skippedReason": "path-only review for non-blocking mobile check"
    }
  ]
}
```

Rules:

- `status`: `captured | skipped | failed`
- `captured`: `imagePath` and `htmlPath` required (QFAI-PROT-252)
- `skipped`: `skippedReason` required (QFAI-PROT-252)
- `failed`: `error` required (QFAI-PROT-252)
- external bundle is the source of truth
- in-band `uiFidelity.screens[].renders[]` is summary/projection only
- render evidence must remain `path-only`; `data:` URIs, `base64,` payloads, and inline HTML are invalid (QFAI-PROT-251)
- extremely long single-line payloads (>500 chars) are treated as inline payload violations
- top-level `renderEvidence.status` and individual `screens[].status` must not contradict (QFAI-PROT-253)

## browser-qa.json canonical contract

```json
{
  "browserQa": {
    "executed": true,
    "status": "completed",
    "mode": "full-harness",
    "summary": {
      "smoke": { "passed": 3, "failed": 0 },
      "interaction": { "passed": 4, "failed": 1 }
    }
  },
  "findings": [
    {
      "category": "interaction",
      "severity": "error",
      "route": "/orders",
      "message": "Save button submits duplicate request"
    }
  ]
}
```

Rules:

- required only for `ui-bearing / full-harness` (QFAI-PROT-263)
- optional for `ui-bearing / low-cost|standard`
- n/a for `non-ui`
- `executed=true` requires `status=completed`; `executed=false` permits `status=skipped|failed` only
- `status=completed` without `summary` or `findings` produces a warning (QFAI-PROT-262)
- `browserQa.mode` must match `prototyping.json.mode.effective` (QFAI-PROT-261)
- `summary.*.passed/failed` must be non-negative integers
- each finding requires `category`, `severity`, and `message`

## Example prototyping.json

```json
{
  "surface": "web",
  "specs": [
    {
      "specId": "spec-0001",
      "declared": { "uiRoutes": 1, "apiEndpoints": 1, "dbObjects": 1 },
      "checked": { "uiOk": 1, "apiNon404": 1, "dbPresent": 1 },
      "missing": { "uiRoutes": [], "apiEndpoints": [], "dbObjects": [] }
    }
  ],
  "mode": {
    "effective": "standard",
    "source": "default",
    "rationale": "No explicit request or discussion recommendation was provided."
  },
  "meta": {
    "generatedAt": "2026-04-04T00:00:00.000Z",
    "toolVersion": "<current-tool-version>",
    "commands": ["qfai validate --fail-on error"]
  },
  "uiFidelity": {
    "version": "0.1",
    "mode": "interactive",
    "screens": []
  }
}
```
