# Verify Output Contract — `.qfai/report/verify.json`

`/qfai-verify` MUST write `.qfai/report/verify.json` at the end of the run. This file is the machine-readable verdict; the stage report is the human-readable account. No `qfai` command reads it, so an absent `verify.json` does not fail `npx qfai validate`.

Canonical path: `.qfai/report/verify.json` (NOT `.qfai/output/`). Create the `.qfai/report/` directory if absent — it is the same directory `validate.json` is written to.

`.qfai/output/verify.json` is the legacy location, history for projects created before the move. Never write there.

| Field        | Type             | Required | Meaning                                                                                                                                                 |
| ------------ | ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status`     | string           | yes      | `"PASS"` when every gate in scope passed, or is delegated to a CI check that is not red; `"FAIL"` otherwise. Only `"PASS"` satisfies a downstream gate. |
| `scope`      | string           | yes      | Which stage's gate set this run covers. See the enum below.                                                                                             |
| `flowId`     | string           | no       | The business flow this run targeted, when scoped to one (e.g. `"BF-0001"`).                                                                             |
| `recordedAt` | ISO-8601 string  | no       | When the run completed.                                                                                                                                 |
| `summary`    | string           | no       | One or two sentences an operator can read without opening the stage report.                                                                             |
| `gates`      | array of objects | no       | Per-gate results: `{ name, status, command }`. Advisory; no reader gates on it today.                                                                   |

`status` is a closed two-value enum: `"PASS"` / `"FAIL"`. There is no `"WARN"` — a run with only `warning` / `info` findings is `"PASS"` (waivers apply to those severities only). Any `error` finding makes it `"FAIL"`.

A gate the project runs in CI only is recorded in `gates` as `{ name, status: "DELEGATED", check, ci }`. `check` names the CI check that runs it, and `ci` is `"green"`, `"red"` or `"pending"`, the state of that check when the file is written. A `"red"` check makes the top-level `status` `"FAIL"`. A `"pending"` one does not, and `summary` names it, so a reader sees what the run left to CI. A gate that can run here is never delegated to avoid running it.

`scope` is a closed enum. Write the one that matches the stage you were invoked for:

| `scope`       | Written by                                                          | validate profile                                |
| ------------- | ------------------------------------------------------------------- | ----------------------------------------------- |
| `prototyping` | a run checking the prototyping profile alone                        | `npx qfai validate --profile prototyping`       |
| `atdd`        | checking acceptance-test obligations only                           | `npx qfai validate --profile atdd`              |
| `full`        | any whole-repository run, including the one after `/qfai-implement` | `npx qfai validate --profile verify` (= `full`) |

There is no `implement` value: the enum is closed at these three, and a run after
`/qfai-implement` is recorded as `full`.

Minimal conforming example for the prototyping gate:

```json
{
  "status": "PASS",
  "scope": "prototyping",
  "flowId": "BF-0001",
  "recordedAt": "2026-01-31T09:12:44Z",
  "summary": "Prototyping gates passed: validate --profile prototyping error=0."
}
```

Rules:

- Never write `"status": "PASS"` without the command outputs that justify it. A `FAIL` verdict is a legitimate output — the gate downstream is supposed to stop.
- Never write a `scope` you did not actually run. Writing `"prototyping"` after a `full` run is a false verdict, not a workaround — and the reverse is just as wrong: a `--profile verify` run is `scope: "full"`, not `scope: "atdd"`, because `atdd` means the ATDD gate set only.
- Do not add a `version` / `schemaVersion` field. No reader validates one, and a second version series in a distributed artifact is exactly what the distributed-surface rule forbids: the npm package version is the only version this surface has.
