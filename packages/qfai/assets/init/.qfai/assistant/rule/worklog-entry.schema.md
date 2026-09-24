# Work-log Entry Schema Contract

- Contract scope: frontmatter and body schema for `.qfai/steering/*.md` entries
- Owners: the validate stage (schema enforcement), the implement stage (primary writer) and the Reviewer-Gate stage (consumer)
- Used-by: All implementation/review-phase skills, `npx qfai validate`, Reviewer subagents
- Enforced by: `npx qfai validate` (`--profile sdd` and `--profile full`), whose
  work-log surface checks ship already compiled inside the installed package:
  - the work-log entry parser
  - the work-log link-integrity check
- The field checks, enums and required headings are compiled into the CLI, not read from this file: this document is their reference, so editing it does not change what `validate` accepts. Report a divergence as a QFAI bug instead of customizing the schema here.

  The QFAI source tree is not part of the npm distribution, so this contract
  names no local module path on purpose: the schema below plus the
  `npx qfai validate` output are the surface you can actually read here.

## Storage model

- Per-project, project-root location: `.qfai/steering/`.
- The **surface** lives at `.qfai/steering/`, not under `.qfai/assistant/`. This
  **schema** ships with the package and `npx qfai init` seeds it at
  `.qfai/assistant/rule/worklog-entry.schema.md`, which is the path every
  other document cites it by.
- By default `.gitignore` excludes the directory; projects MAY opt in via override.
- Filename: `.qfai/steering/<id>.md` where `<id>` is kebab-case ASCII; the frontmatter `id` MUST match the filename stem.
- Templates live at `.qfai/steering/_template/`; the validator ignores that directory. `npx qfai init` seeds `entry.md` there as the canonical entry shape.

## Validation

```sh
npx qfai validate --profile sdd --fail-on error
```

Five findings read this surface. Each is described where the rule it belongs to
is stated; they are collected here so a reader knows the whole set.

| Finding                 | Reports                                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| `W-WORKLOG-SCHEMA`      | frontmatter that does not satisfy the schema below, including an `id` that does not match the filename stem |
| `W-WORKLOG-BROKEN-LINK` | a `links` entry that resolves to nothing                                                                    |
| `W-WORKLOG-STALE`       | an `active` entry nothing has updated for too long                                                          |
| `W-PENDING-PROMOTION`   | a `promote-to` target that has not been written                                                             |
| `R-HANDOFF-INCOMPLETE`  | a `handoff` body missing one of its five required sections                                                  |

## Frontmatter schema

```yaml
---
id: 2026-05-22-recut-design-call # required; string; kebab-case; matches filename stem
status: active # required; enum: active | handoff | archived
kind: decision # required; enum: see below
created: 2026-05-22 # required; ISO-8601 date (YYYY-MM-DD)
updated: 2026-05-22 # required; ISO-8601 date; >= created
scope: BF-0001 # required; "global" or "BF-NNNN"
blocking: false # required; boolean
promote-to: decisions.md # required; "decisions.md" OR null
links: # required; array (may be empty)
  - BF-0001
  - discussion-20260522081618995
closure-rationale: null # required when status=archived AND no promote-to satisfied; else null/omitted
promoted-to: null # set to the DEC-NNNN ID of the matching decisions.md row when promoted
---
```

### `kind` enum

The `kind` field MUST be exactly one of:

| `kind`                | Write trigger                                                     |
| --------------------- | ----------------------------------------------------------------- |
| `milestone`           | Task milestone reached                                            |
| `decision`            | A decision was made during work that needs durable capture        |
| `risk`                | A risk was identified                                             |
| `consultation-needed` | The skill needs user input to proceed                             |
| `unexpected`          | An unexpected event occurred during work                          |
| `unscoped-discovery`  | Out-of-scope concern discovered; current task continues unblocked |
| `handoff`             | Work needs to pause; another session/operator will resume         |
| `blocker`             | The skill is stuck (e.g. root-cause hunt stalled)                 |
| `scope-up`            | Work volume larger than expected                                  |
| `scope-down`          | Planned work is no longer required                                |
| `spike`               | Exploratory investigation logged                                  |

### `status` enum

| `status`   | Meaning                                                                                       |
| ---------- | --------------------------------------------------------------------------------------------- |
| `active`   | Open; participates in drift/promote/stale checks                                              |
| `handoff`  | Open and awaiting resumption; body MUST satisfy the handoff-brief schema                      |
| `archived` | Closed; either promoted (`promoted-to` set) or closed-without-promotion (`closure-rationale`) |

### `scope` semantics

- `global` — applies project-wide; visible to every skill invocation.
- `BF-NNNN` — applies to the named business flow. A US, AC, or EX ID carries its flow number. Implementation-phase skills read entries whose scope is `global` or the current flow.

### `promote-to` semantics

- `null` — entry will not promote.
- `decisions.md` — promote into the decision table under `paths.specsDir`. A `kind: decision` entry remains pending until a row cites its entry ID as a whole token, its status is `archived`, and `promoted-to` equals that row's `DEC-NNNN` ID. The gate surfaces `W-PENDING-PROMOTION` until all three conditions hold.

### `links` array

Each element MUST resolve to one of:

- `BF-NNNN` — an existing `02_business-flow/business-flow-NNNN/` directory under `paths.specsDir`
- `DEC-NNNN` — an existing row in `paths.specsDir/decisions.md`
- `discussion-*` — an existing discussion pack under `paths.discussionDir`
- `<entry-id>` — another `.qfai/steering/<id>.md` entry

Broken links surface `W-WORKLOG-BROKEN-LINK`.

## Body schema

The body (everything after the closing `---`) is free-form Markdown except for two `kind`-specific schemas below.

### `kind: handoff` body — required sections

```markdown
## State of the task

<one paragraph: where am I, what is done, what remains>

## Next single action

<one bullet: the very next thing to do on resume>

## Constraints to preserve

- <bulleted list of invariants that the next operator MUST preserve>

## Open questions

- <bulleted list; may be empty>

## References to consult first

- <bulleted list of entry IDs / BF IDs / discussion IDs>
```

Reviewer Gate emits `R-HANDOFF-INCOMPLETE` if any of the five sections is missing or empty.

### `kind: decision` body — recommended sections

```markdown
## Context

<what triggered the decision>

## Decision

<what was decided>

## Alternatives considered

<bulleted; mark each as accepted | rejected | deferred>

## Rationale

<why this option>

## Consequences

<what changes downstream>
```

The body is consulted by Reviewer Gate when emitting `R-WORKLOG-DRIFT`; the structured shape improves the false-positive rate.

## Unit-test obligations (NFR-0010)

The work-log reader and validator tests cover:

1. Well-formed entry
2. Missing required field (e.g. omitted `kind`)
3. Invalid enum value
4. Broken YAML (parse error)
5. UTF-8 BOM tolerated
6. CRLF line endings tolerated
7. `scope: BF-NNNN`
8. `scope: global`
9. `promote-to: null`
10. `promote-to: decisions.md`
11. `links: []`
12. `links` array with broken reference (parser returns ok; validator emits `W-WORKLOG-BROKEN-LINK`)

## Distributed-surface obligations

The seeded `_template/entry.md` and any shipped sample entry pass the distributed-surface guards. Sample IDs stay in the permitted sample band.
