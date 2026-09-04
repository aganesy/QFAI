# `validate.json` schema

`.qfai/report/validate.json` is the machine-readable result of
`npx qfai validate`. It is a **public surface** (`@api` under
`constitution/change-classification.md`): the skills instruct agents to read it,
so a key change is a breaking change and takes the `@api` path.

This file is the SSOT for its keys. Before it existed the situation was: the
skills mandated reading the file, `change-classification.md` called it `@api`,
the README called it internal and not a stable contract, and no shipped file
named a single key — so an agent looking for the findings array guessed
`findings` and got `undefined` from a file whose array is `issues`.

## Top level

| key | type | notes |
| --- | --- | --- |
| `toolVersion` | `string` | the qfai that produced the run |
| `generatedAt` | `string?` | ISO-8601. Absent from a file written before the field existed |
| `profile` | `string?` | the `--profile` the run used; absent for the default |
| `issues` | `Issue[]` | **the findings array. It is `issues`, not `findings`** |
| `counts` | `{ info, warning, error }` | all three always present, all numbers |
| `traceability` | `{ sc, testFiles }` | coverage of the run |
| `waivers` | object? | present only when `.qfai/waivers.yml` was read |

`counts` is what `--fail-on` compares, so it is the field to read for a pass/fail
decision. It is derived from `issues` and cannot disagree with it.

## `issues[]`

| key | type | notes |
| --- | --- | --- |
| `code` | `string` | the finding code — **this is what a waiver's `rule:` must equal** |
| `severity` | `"info" \| "warning" \| "error"` | |
| `category` | `string` | `canonical` for a contract violation, `change` for an advisory |
| `message` | `string` | human-readable, not stable across versions |
| `suggested_action` | `string?` | the remedy, when the rule has one |
| `file` | `string?` | repo-relative path, POSIX separators |
| `relatedFiles` | `string[]?` | the other files a finding implicates when `file` is a representative |
| `refs` | `string[]?` | the IDs or values the finding is about |
| `rule` | `string?` | the internal rule id, for grouping |
| `suppressed` | `boolean?` | true when a waiver suppressed it; it stays in the array |
| `job` | `string?` | the CI job, for findings ingested from a lane |
| `loc` | object? | line / column, where the producer reported one |
| `dl_id` | `string?` | the decision-log id, for change advisories |

Only `code`, `severity`, `category` and `message` are always present. Everything
else is optional and a consumer must treat it as such — a finding with no
`file` is a repo-level one, not a malformed record.

## What is stable, and what is not

**Stable** (a change takes the `@api` path): the key names above, the shape of
`counts`, the three `severity` values, and the fact that the findings array is
called `issues`.

**Not stable**: `message` text, the order of `issues`, and which optional keys a
given rule populates. A consumer that matches on `message` will break; match on
`code`.

## Reading it

A waiver's `rule:` is `issues[].code`, copied verbatim:

```bash
npx qfai validate --profile full --fail-on error
jq -r '.issues[] | select(.severity == "error") | .code' .qfai/report/validate.json
```

For a pass/fail decision, read `counts.error` (or `counts.warning` under
`--fail-on warning`) rather than filtering the array — the counts already
account for suppressed findings.

## Related

- `.qfai/report/report.md` is the human-readable form of the same run. It is not
  machine-readable; this file is the one to parse.
- `report.json`, `doctor.json` and the `run-*` JSON logs are **not** covered
  here and remain internal exports.
