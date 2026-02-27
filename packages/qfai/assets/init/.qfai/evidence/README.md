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

- Add `.qfai/evidence/` to `.gitignore` (project-level), OR
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
- `runtimeGate.ui[]`
- `runtimeGate.api[]`
- `meta.generatedAt`
- `meta.toolVersion`
- `meta.commands[]`

`uiFidelity` handling depends on `mode`:

- `mode: interactive` (default): `uiFidelity` is required.
- `mode: skeleton`: keep `uiFidelity` with `screens: []` for L1 evidence.

When `uiFidelity` is present, keep all minimum fields above.

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
