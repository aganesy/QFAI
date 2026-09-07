# Verify Output Contract — `.qfai/report/verify.json`

`/qfai-verify` MUST write `.qfai/report/verify.json` at the end of the run. This file is the machine-readable verdict; `.qfai/evidence/verify-<spec-id>.md` remains the human-readable evidence and does not replace it. Two independent readers consume it — `npx qfai prototyping certify` and the `R-CERTIFY-VERIFY-CIRCULAR` validator. Only `certify` fails closed: it refuses to seal a certificate when the file is missing, unparseable, or not `status: "PASS"` with `scope: "prototyping"`. The validator is advisory in the other direction — a missing, unparseable, scope-less or unknown-scope `verify.json` produces no finding (`reviewerGate.ts#detectCertifyVerifyCircular`), because its job is to catch a _wrong-phase_ verdict, not to demand that one exist. So an absent `verify.json` will not fail `npx qfai validate`; it will stop `certify`.

Canonical path: `.qfai/report/verify.json` (NOT `.qfai/evidence/`, NOT `.qfai/output/`). Create the `.qfai/report/` directory if absent — it is the same directory `validate.json` is written to.

`.qfai/output/verify.json` is the legacy location. Readers still fall back to it when the canonical file is absent, and `npx qfai prototyping certify` prints a migration note when they do — it is read-only history for projects created before the move. Never write there.

| Field        | Type             | Required | Meaning                                                                                                                                                                                                                                    |
| ------------ | ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `status`     | string           | yes      | `"PASS"` when every gate in scope passed; `"FAIL"` otherwise. Only `"PASS"` satisfies a downstream gate.                                                                                                                                   |
| `scope`      | string           | yes\*    | Which stage's gate set this run covers. See the enum below. \*Required on every new run. `certify` still accepts a file written before this field existed, so a reader MUST treat absence as "legacy file", never as a licence to omit it. |
| `specId`     | string           | no       | The spec this run targeted, when scoped to one (e.g. `"spec-0001"`).                                                                                                                                                                       |
| `recordedAt` | ISO-8601 string  | no       | When the run completed.                                                                                                                                                                                                                    |
| `summary`    | string           | no       | One or two sentences an operator can read without opening the evidence markdown.                                                                                                                                                           |
| `gates`      | array of objects | no       | Per-gate results: `{ name, status, command }`. Advisory; no reader gates on it today.                                                                                                                                                      |

`status` is a closed two-value enum: `"PASS"` / `"FAIL"`. There is no `"WARN"` — a run with only `warning` / `info` findings is `"PASS"` (waivers apply to those severities only). Any `error` finding makes it `"FAIL"`.

`scope` is a closed enum. Write the one that matches the stage you were invoked for:

| `scope`       | Written by                                                                          | validate profile                                | Accepted by                                                                                          |
| ------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `prototyping` | Work Order H of `/qfai-prototyping`, before `certify`                               | `npx qfai validate --profile prototyping`       | `npx qfai prototyping certify` — this is the ONLY value it accepts                                   |
| `atdd`        | after `/qfai-atdd`, checking ATDD obligations only                                  | `npx qfai validate --profile atdd`              | rejected by prototyping certify; `R-CERTIFY-VERIFY-CIRCULAR` when a prototyping loop is still active |
| `full`        | any whole-repository run, including the one after `/qfai-atdd` or `/qfai-implement` | `npx qfai validate --profile verify` (= `full`) | same as `atdd`                                                                                       |

There is no `implement` value: the enum is closed at these three, and a run after
`/qfai-implement` is recorded as `full`. (`reviewerGate.ts` still recognises a
legacy `implement` string so an old file is not silently treated as
prototyping-scoped, but nothing accepts it as a verdict — do not write it.)

Minimal conforming example for the prototyping gate:

```json
{
  "status": "PASS",
  "scope": "prototyping",
  "specId": "spec-0001",
  "recordedAt": "2026-01-31T09:12:44Z",
  "summary": "Prototyping gates passed: validate --profile prototyping error=0, per-iter evidence present for all declared screens, reviewer gate PASS."
}
```

Rules:

- Never write `"status": "PASS"` without the command outputs that justify it. A `FAIL` verdict is a legitimate output — the gate downstream is supposed to stop.
- Never write a `scope` you did not actually run. Writing `"prototyping"` after a `full` run is a false verdict, not a workaround — and the reverse is just as wrong: a `--profile verify` run is `scope: "full"`, not `scope: "atdd"`, because `atdd` means the ATDD gate set only (see `_policies/06_Glossary.md`, `verify.json#scope`).
- `scope` is marked `yes\*` in the table above for exactly one reason: `certify` tolerates its absence in a file written before the field existed. That is a read-side allowance for legacy artifacts, not a write-side option — a new run that omits it is producing a malformed `verify.json`, and no reader should be built assuming the field may be missing.
- Do not add a `version` / `schemaVersion` field. No reader validates one, and a second version series in a distributed artifact is exactly what the distributed-surface rule forbids: the npm package version is the only version this surface has.
