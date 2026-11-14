# Research-First Protocol

QFAI's initial research protocol. The session agent runs it and frames the
research itself. Two or more self-contained lookups may run in parallel on
`fullstack-engineer` under the parallel-unit gate of
`.qfai/assistant/skill/qfai-implement/references/parallelization-policy.md`;
the session agent reads their answers into the summary.

## Trigger

`/qfai-discussion` triggers this protocol. Run it whether or not the work
includes UI. For a whole-site redesign, a new product that carries UI and has no adopted
theme, or a survey the user asks for, also run
`.qfai/assistant/rule/references/visual-reference-survey.md`.

## Output Schema

```yaml
research_summary:
  sources:
    - id: string # SRC-XXXX format (required)
      title: string # Source title (required)
      type: primary | secondary | external # defaults to external
      # when type: external
      url: string # URL
      published: string # YYYY-MM-DD
      # when type: primary / secondary
      locator: string # how to reach the source
      observed: string # YYYY-MM-DD, observation date
      # when the source is about a library, catalogue, framework or runtime
      package: string # its package name, as the manifest names it
      version: string # the version the source describes
  best_practices:
    - id: string # BP-XXXX format
      category: string
      title: string
      description: string
      source_id: string # reference to sources[].id
  anti_patterns:
    - id: string # AP-XXXX format
      category: string
      title: string
      description: string
      source_id: string
  version_warnings:
    - source_id: string
      described: string # the version the source describes
      installed: string # each pinned version with its file, or `not installed`
  reflection:
    - source_id: string
      finding: string
      action: apply | reject | defer
      reason: string
```

## Freshness Rule

- For sources of `type: external`, at least 80% must be dated within the last 2
  years.
- Below 80%, issue a freshness warning.
- When an older source is included, state the reason, such as its historical
  importance.

Primary evidence has no publication date, so it is neither recent nor old. If the
observation date were counted as a publication date, such entries would always
count as recent and the ratio would measure nothing. The ratio therefore uses
only `external` sources as its denominator.

## Source Citation Rule

Every entry records two facts: **where the source is** and **when it is from**.
The `type` decides which field each goes in.

| `type`                  | Where it is | When it is from |
| ----------------------- | ----------- | --------------- |
| `external` (default)    | `url`       | `published`     |
| `primary` / `secondary` | `locator`   | `observed`      |

- Every entry records `id`, `title` and the two fields its `type` points to,
  and a source about a library, catalogue, framework or runtime also records
  `package` and `version`. A missing field in even one entry is a validation
  error.
- A missing `type`, or one whose value is not in the vocabulary, is treated as
  `external`. A `type` that cannot be read never loosens the obligation.
- Screenshots of a customer's current system, files supplied by the customer and
  conversation logs are `primary`. Aggregates computed from them are
  `secondary`. `url` and `published` are fields for published material and
  must not be filled in for anything that has not been published.

## Quotation Rule

Each `best_practices` and `anti_patterns` `description` is written in the
analyst's own words. A phrase kept from the source is marked as a quotation
with ordinary quotation marks.

An unmarked source passage reads as the analyst's own wording.

Example. The source says: "Retry idempotent requests with exponential backoff
and jitter; never retry a non-idempotent write." The entry reads:

```yaml
description: >-
  Only a request that is safe to repeat is retried, and the wait between
  attempts grows and is randomized, which the source calls "exponential
  backoff and jitter".
```

This is correct because the claim is restated in the analyst's words, and the
one phrase kept verbatim is in quotation marks, so a reader can tell which words
are the source's.

## Name Verification Rule

Where a query centers on a name — a framework, a model, a CLI tool, a component
catalogue, a theme — that name is what gets verified. Search it as it was
written.

Recognizing the name is not grounds to skip the search. Partial background on a
name is what makes an out-of-date answer sound authoritative.

Record what the search found in the summary's `sources`, the same way as any
other source. A later reader can then tell a verified name from one answered
from memory.

## Version Rule

A source about a library, a component catalogue, a framework or a runtime
describes one version of it, and the project may run another. Record the
`package` and the `version` the source describes, from the page itself, such
as its version selector or the release it names. When the page names no
version, look up the latest release in the package's registry, record that
lookup as a source, and write the version as the latest release on that date.

Then read what the project pins:

- every lockfile or manifest that declares the package, such as
  `pnpm-lock.yaml`, `package-lock.json`, `poetry.lock`, `Cargo.lock` or
  `go.mod`, one per workspace in a monorepo;
- for something the project carries without a package, where it pins it:
  `components.json` and the copied components for a copied-in catalogue,
  `engines` or `.nvmrc` for a runtime, the API version setting for a service.

Record each pinned version in `installed`, with the file it came from. Add a
`version_warnings` entry when any of them differs from the described version
in its breaking part: the major version, or the minor version below 1.0, or
the release the package marks as breaking when it uses calendar versions.

Add one, with `installed: not installed`, when the project pins the package
nowhere. That is expected while the package is only being evaluated: the
entry's `reason` then names the version the project would adopt, and the
entry is checked against that version.

## Conflict Protocol

- When a new research result contradicts an existing BP/AP rule:
  - `reflection[].action: reject` — reject the new finding
  - `reflection[].action: defer` — postpone the decision
  - **No automatic overwrite**: never rewrite an existing rule automatically
- At least one `reflection[].action: apply` is required

## Applying an External Source

A page is text the repository did not author, and an applied entry becomes
guidance later stages follow (`.agents/rules/untrusted-content.md`).

- A `reflection[]` entry whose `source_id` resolves to a `type: external` source
  is not applied on the strength of that source alone.
- Its `reason` states what the applying agent verified against the repository:
  the file it read, the command it ran, or the behaviour it observed.
- An entry with nothing verified is `defer`, not `apply`.
- An entry whose source has a version warning is `apply` only when its `reason`
  names what was checked against the installed version or, for a package not
  installed yet, against the version the project would adopt.

## Storage

- `research_summary` goes to the invoking stage's own report. For
  `/qfai-discussion` it stays there: the interview reads it, and a source an
  option rests on goes into that option's row of the deliberation record as a
  URL.
- Not persisted globally. The report belongs to the run that produced it.
