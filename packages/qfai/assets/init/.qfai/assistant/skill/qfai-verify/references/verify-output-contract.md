# Verify Output Contract — `.qfai/report/verify.json`

## Contents

- Verdict file
- Per-gate results
- CI-only checks
- Scope
- Example and rules

## Verdict file

`/qfai-verify` MUST write `.qfai/report/verify.json` at the end of the run. This file is the machine-readable verdict; the stage report is the human-readable account. No `qfai` command reads it, so an absent `verify.json` does not fail `npx qfai validate`.

Canonical path: `.qfai/report/verify.json`. Create the `.qfai/report/` directory if absent — it is the same directory `validate.json` is written to.

| Field        | Type             | Required | Meaning                                                                                                                                                 |
| ------------ | ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status`     | string           | yes      | `"PASS"` when every gate in scope passed, or is delegated to a CI check that is not red; `"FAIL"` otherwise. Only `"PASS"` satisfies a downstream gate. |
| `scope`      | string           | yes      | Which stage's gate set this run covers. See the enum below.                                                                                             |
| `flowId`     | string           | no       | The business flow this run targeted, when scoped to one (e.g. `"BF-0001"`).                                                                             |
| `recordedAt` | ISO-8601 string  | no       | When the run completed.                                                                                                                                 |
| `summary`    | string           | no       | One or two sentences an operator can read without opening the stage report.                                                                             |
| `gates`      | array of objects | no       | Per-gate results: as set out below. Advisory; no reader gates on it today.                                                                              |

When the scope includes acceptance scaffolds or unfinished BF/AC acceptance
bodies, an optional `summary` stays one or two short sentences naming remaining
work, its owner or UNASSIGNED, and the detailed human-report reference. The
five-field detail belongs in `verify-repo-gate`'s `## Report` section, not a
new JSON field or table inside `summary`. Empty-body exemptions, verdicts and
completion rules stay unchanged.

`status` is a closed two-value enum: `"PASS"` / `"FAIL"`. There is no `"WARN"` — a run with only `warning` / `info` findings is `"PASS"` (waivers apply to those severities only). Any `error` finding makes it `"FAIL"`.

## Per-gate results

Each entry of `gates` is `{ name, status, command }`, plus these optional fields:

| Field      | Type   | Meaning                                                                                                                                                                                               |
| ---------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status`   | string | `"PASS"`, `"FAIL"`, `"UNRUN"` or `"DELEGATED"`. `"UNRUN"` is a gate with no command, launcher or environment; it is never a pass.                                                                     |
| `baseline` | string | On a `"FAIL"`: `"same"` when the base commit fails identically, `"different"` when it does not, `"unrun"` when it cannot run.                                                                         |
| `reason`   | string | On an `"UNRUN"` gate, or a `baseline` of `"unrun"`: what is missing. On a `baseline` of `"same"`: the failing test identifiers and the environment, in one or two sentences (see `verify-repo-gate`). |
| `check`    | string | On a `"DELEGATED"` gate: the CI check that runs it.                                                                                                                                                   |
| `ci`       | string | On a `"DELEGATED"` gate: `"green"`, `"red"` or `"pending"`, the state of that check when the file is written.                                                                                         |

## CI-only checks

A gate the project's Standard commands declare `CI only: <check name>`, or the
user's instruction for this run delegates to an actual CI check,
is recorded `"DELEGATED"` with its `check` and `ci` for the candidate being evaluated.
`check` names the actual CI check and `ci` its observed state.
A `"red"` check makes the top-level `status` `"FAIL"` for that candidate.
A `"pending"` one does not, and `summary` names it. A runnable local gate is
never delegated to avoid running it on the agent's own judgment. Retain an
observed FAIL or UNRUN; neither becomes PASS or DELEGATED because a verification commit is wanted.

A `"PASS"` verdict with pending delegated checks supports only the existing
verification-commit allowance under a user instruction or project policy
covering that commit and its paths. It does not establish formal completion or
permission to push, create a pull request or merge. Every nondelegated gate
must pass. A delegated red check stops transport of the same unchanged candidate.
Explicit CI-only delegation covering a transport commit may instead carry actual
changes addressing that failure through the existing planned fix into a new
candidate, while HEAD still names the failed commit. Preserve the prior head,
check, run and observed result as FAIL; never relabel that evidence pending.
Report the actual fix and, after committing, the new head and resume condition.
The new candidate remains unverified until its own CI results are observed.

The stage report records the target, current head, run ID or URL when available,
check, actual outcome and counts, blocker and resume condition. No run yet means
no result; invent neither. `ci: "green"` needs actual passing evidence for that
same target and head. Missing or mismatched evidence remains pending. Formal
completion or merge waits for every required check to pass on the current head.
Keep this evidence in the stage report and `summary`; add no verdict fields or states.

A gate that fails identically on the base, or did not run and is not delegated, still makes the top-level `status` `"FAIL"`. The fields let a reader tell it from a failure the run caused.

Keep the full CI receipt in the stage report, as
`.qfai/assistant/step/common-gate-run/STEP.md#ci-evidence` requires. A branch
overview or a confirmed closed cleanup SKIP does not replace actual verification
or turn it into a behavioral PASS. Preserve failures for the current head;
unknown identity or purpose remains unverified. The receipt adds no fields or
states to this contract.

## Scope

`scope` is a closed enum. Write the gate set this invocation covers through
execution or an explicitly declared matching CI-only check. Delegation never
claims that the profile already ran; its check must perform the required scan
and profile. A whole-repository scope still requires full validation. Write the
one that matches the stage you were invoked for:

| `scope`       | Written by                                                          | validate profile                                |
| ------------- | ------------------------------------------------------------------- | ----------------------------------------------- |
| `prototyping` | a run checking the prototyping profile alone                        | `npx qfai validate --profile prototyping`       |
| `atdd`        | checking acceptance-test obligations only                           | `npx qfai validate --profile atdd`              |
| `full`        | any whole-repository run, including the one after `/qfai-implement` | `npx qfai validate --profile verify` (= `full`) |

There is no `implement` value: the enum is closed at these three, and a run after
`/qfai-implement` is recorded as `full`.

## Example and rules

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

- A PASS gate needs actual command output or matching CI evidence. The existing
  top-level pending-DELEGATED allowance supports only the covered verification
  commit described above. A `FAIL` verdict is a legitimate output; downstream
  work stops as its gate requires.
- Never write a `scope` this invocation does not cover by execution or its
  declared matching CI-only check. Writing `"prototyping"` for a `full` gate set
  is a false verdict, not a workaround. A `--profile verify` gate is
  `scope: "full"`, not `scope: "atdd"`; `atdd` covers the ATDD gate set only.
- Do not add a `version` / `schemaVersion` field. No reader validates one, and a second version series in a distributed artifact is exactly what the distributed-surface rule forbids: the npm package version is the only version this surface has.
