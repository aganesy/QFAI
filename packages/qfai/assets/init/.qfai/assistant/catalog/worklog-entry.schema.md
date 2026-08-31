# Work-log Entry Schema Contract

- Contract scope: frontmatter and body schema for `.qfai/steering/*.md` entries
- Owners: the validate stage (schema enforcement), the implement stage (primary writer) and the Reviewer-Gate stage (consumer)
- Used-by: All implementation/review-phase skills, `npx qfai validate`, Reviewer subagents
- SSOT modules (shipped inside the QFAI package, run by `npx qfai validate`):
  - the work-log entry parser (`string → Result<Entry, SchemaError>`)
  - the work-log link-integrity check
- The field checks, enums and required headings are compiled into the CLI, not read from this file: this document is their reference, so editing it does not change what `validate` accepts. Report a divergence as a QFAI bug instead of customizing the schema here.

## Storage model

- Per-project, project-root location: `.qfai/steering/`.
- The **surface** lives at `.qfai/steering/`, not under `.qfai/assistant/`. This
  **schema** ships with the package and `npx qfai init` seeds it at
  `.qfai/assistant/catalog/worklog-entry.schema.md` — the seeded README and entry
  template used to point at an unpublished path, so the contract was
  unresolvable on every consuming project.
- By default `.gitignore` excludes the directory; projects MAY opt in via override.
- Filename: `.qfai/steering/<id>.md` where `<id>` is kebab-case ASCII; the frontmatter `id` MUST match the filename stem.
- Templates live at `.qfai/steering/_templates/`; templates MUST NOT contain entry-shaped frontmatter (validator ignores `_templates/`).

## Frontmatter schema

```yaml
---
id: 2026-05-22-recut-design-call # required; string; kebab-case; matches filename stem
status: active # required; enum: active | handoff | archived
kind: decision # required; enum: see below
created: 2026-05-22 # required; ISO-8601 date (YYYY-MM-DD)
updated: 2026-05-22 # required; ISO-8601 date; >= created
scope: spec-0003 # required; "global" or "spec-NNNN"
blocking: false # required; boolean
promote-to: spec-0003/07_Decisions.md # required; string (path) OR null
links: # required; array (may be empty)
  - spec-0003
  - discussion-20260522081618995
closure-rationale: null # required when status=archived AND no promote-to satisfied; else null/omitted
promoted-to: null # required when status=archived AND promote-to was satisfied; value is the DR-ID (Decision Row identifier, e.g. `DR-3`) of the appended row in the target `07_Decisions.md`
---
```

### `kind` enum (REQ-0004)

The `kind` field MUST be exactly one of:

| `kind`                | Write trigger                                                                |
| --------------------- | ---------------------------------------------------------------------------- |
| `milestone`           | Task milestone reached                                                       |
| `decision`            | A decision was made during work that needs durable capture                   |
| `risk`                | A risk was identified                                                        |
| `consultation-needed` | The skill needs user input to proceed                                        |
| `unexpected`          | An unexpected event occurred during work                                     |
| `unscoped-discovery`  | Out-of-scope concern discovered; current task continues unblocked (REQ-0016) |
| `handoff`             | Work needs to pause; another session/operator will resume                    |
| `blocker`             | The skill is stuck (e.g. root-cause hunt stalled)                            |
| `scope-up`            | Work volume larger than expected                                             |
| `scope-down`          | Planned work is no longer required                                           |
| `spike`               | Exploratory investigation logged                                             |

### `status` enum

| `status`   | Meaning                                                                                       |
| ---------- | --------------------------------------------------------------------------------------------- |
| `active`   | Open; participates in drift/promote/stale checks                                              |
| `handoff`  | Open and awaiting resumption; body MUST satisfy the handoff-brief schema (REQ-0017)           |
| `archived` | Closed; either promoted (`promoted-to` set) or closed-without-promotion (`closure-rationale`) |

### `scope` semantics

- `global` — applies project-wide; visible to every skill invocation.
- `spec-NNNN` — applies only to the named spec. Implementation-phase skills filter on `scope ∈ {global, current-spec}` before reading.

### `promote-to` semantics

- `null` — entry will not promote.
- non-`null` — string of the form `spec-NNNN/07_Decisions.md` (target Decisions row to append). The promote-gate surfaces `W-PENDING-PROMOTION` until satisfied (REQ-0007).

### `links` array

Each element MUST resolve to one of:

- `spec-NNNN` — an existing spec directory under `.qfai/specs/`
- `discussion-*` — an existing discussion pack under `.qfai/discussion/`
- `<entry-id>` — another `.qfai/steering/<id>.md` entry

Broken links surface `W-WORKLOG-BROKEN-LINK` (REQ-0015).

## Body schema

The body (everything after the closing `---`) is free-form Markdown except for two `kind`-specific schemas below.

### `kind: handoff` body — required sections (REQ-0017)

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

- <bulleted list of entry IDs / spec IDs / discussion IDs>
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

`parseEntry.ts` MUST have ≥ 12 unit tests covering:

1. Well-formed entry
2. Missing required field (e.g. omitted `kind`)
3. Invalid enum value
4. Broken YAML (parse error)
5. UTF-8 BOM tolerated
6. CRLF line endings tolerated
7. `scope: spec-NNNN`
8. `scope: global`
9. `promote-to: null`
10. `promote-to: spec-NNNN/07_Decisions.md`
11. `links: []`
12. `links` array with broken reference (parser returns ok; validator emits `W-WORKLOG-BROKEN-LINK`)

≥ 90 % line coverage of `parseEntry.ts` in CI.

## Distributed-surface obligations

The seeded `_templates/entry.md`, and any sample entry shipped via `assets/init/`, MUST carry no internal spec ids, version markers or trace ids. The authoritative list of forbidden shapes is the scanner itself; entries use placeholder ids and dates only.
