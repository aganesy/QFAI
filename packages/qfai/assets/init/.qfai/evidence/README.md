# evidence

## Purpose

Evidence files record **what was actually executed** for each custom prompt run:

- commands executed
- relevant logs (summary)
- gaps / exceptions
- reviewer approval

## Version control policy

Evidence is **not versioned by default**.
Recommended approach:

- Add `.qfai/evidence/` entries to root `.gitignore` (managed by `qfai init`), OR
- Add it to `.git/info/exclude` (local only), OR
- Store evidence outside the repository (artifact store, issue attachments).

## Naming

- Summary file: `.qfai/evidence/<prompt>-<run-id>.md`
- Optional artifacts: `.qfai/evidence/<prompt>/<YYYY-MM-DD>/<run-id>/...`
- `<run-id>`: prefer `spec-XXXX` when applicable.

### Prototyping stage required evidence

`/qfai-prototyping` requires two evidence artifacts in the evidence directory:

- one markdown evidence file for human-readable coverage/runtime logs
- one json evidence file for machine validation

### Prototyping JSON minimum + uiFidelity mode rule

`prototyping.json` keeps the existing minimum schema for validation:

- `specs[]`
- `mode`
- `fullHarness` (required only when `mode.effective = full-harness`)
- `runtimeGate.ui[]`
- `runtimeGate.api[]`
- `meta.generatedAt`
- `meta.toolVersion`
- `meta.commands[]`

`uiFidelity` handling depends on `mode`:

- `mode: interactive` (default): `uiFidelity` is required.
- `mode: skeleton`: keep `uiFidelity` with `screens: []` for L1 evidence.

When `uiFidelity` is present, keep all minimum fields above.

Additional v1.7.13 mode provenance fields:

- `mode.requested` (optional)
- `mode.effective` (required for canonical evidence)
- `mode.source` (required for canonical evidence)
- `mode.rationale` (required for canonical evidence)
- `mode.discussionRecommendation` (optional)

`full-harness` selected時の必須項目:

- `fullHarness.enabled = true`
- `fullHarness.available`
- `fullHarness.runId`
- `fullHarness.iterationCount`
- `fullHarness.bestIteration`
- `fullHarness.terminationReason`
- `fullHarness.reviewerSignoff`
- `fullHarness.scoringTrace`

non-visual / non-ui surface では、UI 固有項目は `n/a` / `skipped` として明示してよいが、mode provenance は残すこと。

### Render evidence bundle conventions

When render capture is enabled, keep render metadata path-only and store artifacts on disk:

- default bundle path: `.qfai/evidence/render.json`
- default viewports: `desktop`, `mobile`
- `uiFidelity.screens[].renders[]` is the normalized in-band source for validator/report use
- captured entries require `imagePath` and `htmlPath`
- skipped entries require `skippedReason`
- failed entries require `error`

Degraded mode is allowed:

- if renderer setup is unavailable, record `status: "skipped"` with a concrete reason
- do not inline screenshot bytes or HTML bodies into JSON
- keep `prototyping.json` and `render.json` aligned by file path only

```json
{
  "renderEvidence": {
    "status": "skipped",
    "requested": true,
    "autogenEnabled": false,
    "viewports": ["desktop", "mobile"],
    "outputPath": ".qfai/evidence/render.json",
    "reason": "render requested without autogen-ui-fidelity"
  }
}
```

Good example references:

- Repository docs sample: `docs/examples/prototyping-ui-fidelity.good.json`
- UI contract pair sample: `docs/examples/ui-contract.good.yaml`

```json
{
  "specs": [
    {
      "specId": "spec-0001",
      "declared": { "uiRoutes": 1, "apiEndpoints": 1, "dbObjects": 1 },
      "checked": { "uiOk": 1, "apiNon404": 1, "dbPresent": 1 },
      "missing": { "uiRoutes": [], "apiEndpoints": [], "dbObjects": [] }
    }
  ],
  "runtimeGate": {
    "ui": [{ "route": "/orders", "status": 200 }],
    "api": [{ "method": "GET", "path": "/api/orders", "status": 200 }]
  },
  "uiFidelity": {
    "version": "0.1",
    "mode": "interactive",
    "screens": [
      {
        "route": "/orders",
        "uiContractId": "CON-UI-0001",
        "expected": { "elements": 6, "actions": 2 },
        "observed": {
          "elementsPlaced": 6,
          "actionsWired": 2,
          "markersEmitted": 5
        },
        "mockPaths": [
          {
            "id": "mp_create_to_list",
            "status": "pass",
            "notes": "create -> list reflects (client mock)"
          }
        ],
        "placeholders": { "hasPlaceholderText": false, "notes": "" }
      }
    ]
  },
  "meta": {
    "generatedAt": "2026-02-27T00:00:00.000Z",
    "toolVersion": "<current-tool-version>",
    "commands": ["qfai validate --fail-on error"]
  }
}
```

## Minimal content template

```md
# Evidence: <prompt> (<run-id>)

## Scope

- Spec: <SPEC-XXXX or none>
- Branch: <name>
- Commit: <hash>

## Commands executed

- <cmd1>
- <cmd2>

## Results summary

- <what passed / what failed>

## Exceptions / gaps

- <explicit gaps>

## Reviewer approval

- Reviewer: <name/role>
- Approved at: <YYYY-MM-DD>
```

## Checklist

- [ ] Contains executed commands and outcomes.
- [ ] Notes any intentional gaps.
- [ ] Has non-author approval (when required by prompt).
- [ ] Prototyping stage includes both markdown and json evidence files.
