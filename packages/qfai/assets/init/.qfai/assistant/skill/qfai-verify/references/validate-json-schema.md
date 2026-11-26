# `validate.json` schema

`validate.json` is the machine-readable result of `npx qfai validate`. Read
the file the invocation wrote, not a fixed path:

| run                                    | file it writes                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| repository-wide, `--profile <profile>` | the configured `output.validateJsonPath` with `-<profile>` before the extension |
| repository-wide, no `--profile`        | the same, with `-full`                                                          |
| `--flow BF-0003` (any `--profile`)     | `<stem>.flow-0003<ext>` beside the configured path, and nothing else            |

`output.validateJsonPath` defaults to `.qfai/report/validate.json`, which every
repository-wide run also rewrites, so it can hold another profile's or worker's
result. Use a result only when its `profile` is the one the command ran and its `generatedAt` is no earlier than the command's start.
Two runs of one profile write one file, so where they can overlap on one tree, read the run's own `run-*/` directory instead, named by the `run-log:` line: `run.json` holds the counts and `validator.json` the unsuppressed errors and warnings by `code`.
`npx qfai report --profile <profile>` reads the suffixed file but only warns on another profile.

It is a **public surface** (`@api` under
`.qfai/assistant/rule/change-classification.md`): the skills instruct agents to read it,
so a key change is a breaking change and takes the `@api` path.

This file is the SSOT for its keys.

## Contents

- Top level
- `waivers`
- `timings` and `familyTimings`
- `issues[]`
- What is stable, and what is not
- Reading it
- Related

## Top level

| key                    | type                       | notes                                                         |
| ---------------------- | -------------------------- | ------------------------------------------------------------- |
| `toolVersion`          | `string`                   | the qfai that produced the run                                |
| `generatedAt`          | `string?`                  | ISO-8601. Absent from a file written before the field existed |
| `profile`              | `string?`                  | the `--profile` the run used; `full` for the default          |
| `profileValidatorsRan` | `boolean?`                 | whether the profile's own validators ran; see below           |
| `flowIds`              | `string[]?`                | the flows a `--flow` run checked, sorted; see below           |
| `issues`               | `Issue[]`                  | **the findings array. It is `issues`, not `findings`**        |
| `counts`               | `{ info, warning, error }` | all three always present, all numbers                         |
| `waivers`              | object?                    | the waivers applied and what they suppressed; see below       |
| `timings`              | object?                    | UI/UX validator time in ms; see below                         |
| `familyTimings`        | object?                    | time per finding family in ms, under `--timings`; see below   |

`counts` is what `--fail-on` compares, so it is the field to read for a pass/fail
decision. It is derived from `issues` and cannot disagree with it.

`profileValidatorsRan` says whether `issues` can describe the profile's gates:

- `true`: the profile's own validators ran, and `issues` holds what they found.
- `false`: they did not run. The run stopped first, at a story tree in the old
  layout (`QFAI-LAYOUT-001`) or at a path those validators walk that cannot be
  walked (`QFAI-LINK-001`), and `issues` holds only what the run found before
  it stopped. No error for a gate of the profile is not a pass for that gate:
  repair what the findings name and run again.
- absent: the file makes no claim either way. A file written by a qfai from
  before the field existed does not carry it, nor does a run that could not
  finish. That run reports a `QFAI-SCAN-002` error and fails under every
  `--fail-on` except `never`; under `never` it still exits 0, so read its
  result as incomplete whatever the exit code. Read absence as "not known",
  not as `true`.

`flowIds` is written only by a `--flow` run: the business flows it checked,
sorted, each named once, such as `["BF-0003"]`. A repository-wide run leaves it
out. `npx qfai report` compares it with the flows it was asked for, none for a
repository-wide report, and refuses a file that records another scope: a file
copied or renamed into place cannot be told apart by its name.

BF, AC, and EX test obligations appear in `issues` as `QFAI-STORY-006` through
`QFAI-STORY-009` findings. There is no separate traceability summary field.

## `waivers`

Every run that reaches its checks writes `waivers`, whether or not a
`.qfai/waivers.yml` exists, so its presence says nothing about a waiver file.
With no file, or with one that could not be read or parsed, it is the empty
object:

```json
{ "active": [], "suppressed": { "total": 0, "byWaiver": {}, "byRule": {} } }
```

- `active`: the waiver entries in force for this run, whether or not one
  matched a finding. An expired, malformed or refused entry is not listed; the
  run reports it as a `QFAI-WAIVER-*` finding.
- `suppressed.total`: how many findings a `suppress` waiver hid.
  `byWaiver` counts them by waiver `id`, `byRule` by the `rule:` as written.

`waivers` is absent from a run that stopped before its checks: one stopped at a
story tree in the old layout (`QFAI-LAYOUT-001`), and one that could not finish
(`QFAI-SCAN-002`). A file written by an older qfai may not carry it either. Read
absence as "no waiver result", not as "no waiver file".

## `timings` and `familyTimings`

Both describe the machine that ran the check, not the tree, so they raise no
finding and never change `counts`. Every time is wall-clock milliseconds, a
fractional number.

`timings` is written by the profiles that run the UI/UX validator group
(`verify`, `full`, `prototyping` and `saas-package`), and is absent from the
others and from a run that stopped early:

| key                | notes                                                                |
| ------------------ | -------------------------------------------------------------------- |
| `uiuxMs`           | the whole UI/UX group, without the one-off html-mock parser load     |
| `uiuxBudgetMs`     | the target `uiuxMs` is compared with; going over is not a failure    |
| `htmlMockMs`       | parsing the html mock blocks                                         |
| `htmlMockBudgetMs` | the target for `htmlMockMs` (`uiux.htmlMockTimeout` when set)        |
| `uiuxPartsRun`     | `side-by-side` on a plain run, `one-after-another` under `--timings` |
| `uiuxParts`        | `{ name, ms }[]`, slowest first                                      |

Side by side, each part's time includes waiting for the others, so the parts
overlap and do not add up to `uiuxMs`. One after another, each is that
validator's own work.

`familyTimings` is written, by any profile, only when `npx qfai validate
--timings` asks for it, and is absent from a run that stopped early:

| key                    | notes                                                                  |
| ---------------------- | ---------------------------------------------------------------------- |
| `sequential`           | `{ family, ms }[]` for the checks run one after another, slowest first |
| `uiux`                 | `{ family, ms }[]` for each check of the UI/UX group, slowest first    |
| `htmlMockLoadMs`       | the one-off html-mock parser load, `0` when no mock needed it          |
| `sharedMarkdownReadMs` | the Markdown read the html-mock and UI definition checks share         |

A `family` is the code family of the findings its checks returned (`STORY` for
`QFAI-STORY-*`, several joined with `/`), or the check's own name when it
returned none. The whole UI/UX group is the one `uiux` entry of `sequential`,
which includes `htmlMockLoadMs` and `sharedMarkdownReadMs`.

```json
{
  "familyTimings": {
    "sequential": [
      { "family": "STORY", "ms": 412.7 },
      { "family": "uiux", "ms": 96.3 }
    ],
    "uiux": [{ "family": "html mock", "ms": 51.2 }],
    "htmlMockLoadMs": 0,
    "sharedMarkdownReadMs": 4.1
  }
}
```

## `issues[]`

| key                | type                             | notes                                                                |
| ------------------ | -------------------------------- | -------------------------------------------------------------------- |
| `code`             | `string`                         | the finding code — **copy this into a waiver's `rule:`**             |
| `severity`         | `"info" \| "warning" \| "error"` |                                                                      |
| `relaxedFrom`      | `"info" \| "warning" \| "error"` | optional severity before an older exploration-mode downgrade         |
| `category`         | `string`                         | `canonical` for a contract violation, `change` for an advisory       |
| `message`          | `string`                         | human-readable, not stable across versions                           |
| `suggested_action` | `string?`                        | the remedy, when the rule has one                                    |
| `file`             | `string?`                        | repo-relative path, POSIX separators                                 |
| `relatedFiles`     | `string[]?`                      | the other files a finding implicates when `file` is a representative |
| `refs`             | `string[]?`                      | the IDs or values the finding is about                               |
| `rule`             | `string?`                        | the internal rule id, for grouping; see "Reading it" for waivers     |
| `suppressed`       | `boolean?`                       | true when a waiver suppressed it; it stays in the array              |
| `job`              | `string?`                        | the CI job, for findings ingested from a lane                        |
| `loc`              | object?                          | line / column, where the producer reported one                       |

An older finding with `relaxedFrom: "error"` and `severity: "warning"` was
lowered from error to warning by exploration mode.

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

Write a waiver's `rule:` as `issues[].code`, copied verbatim. A waiver also
matches a finding whose `rule` has the shape of a code (for example
`WAIVER-003` on a `QFAI-WAIVER-003` finding), compared in upper case, so an
existing entry written that way is valid; most `rule` values, such as
`storyTree.oldLayout`, do not have that shape and cannot be used.

A waiver covers only a `warning` or `info` finding. One that names an `error`
finding is refused with `QFAI-WAIVER-002`, also when the run raises that code
as an `error` elsewhere: repair what the error names instead.
The example lists the codes a waiver can name. It assumes the default
`output.validateJsonPath`; with another one, read its `-full` sibling instead:

```bash
npx qfai validate --profile full --fail-on error
jq -r '.issues[] | select(.severity != "error") | .code' .qfai/report/validate-full.json
```

For a pass/fail decision, read the counts rather than filtering the array — the
counts already account for suppressed findings. The run fails on
`counts.error > 0` under `--fail-on error`, and on
`counts.error + counts.warning > 0` under `--fail-on warning`, so an error-only
result fails both.

## Related

- `npx qfai report` writes the human-readable form, `report.md` under
  `paths.outDir` (by default `.qfai/report/`). `validate` does not write it, so
  an existing `report.md` can describe an earlier run: before reading it as
  current, run `npx qfai report` with the same `--profile` and `--flow` as the
  validate run, or `npx qfai report --run-validate`. It is not
  machine-readable; this file is the one to parse.
- `report.json`, `doctor.json` and the `run-*` JSON logs are **not** covered
  here and remain internal exports.
