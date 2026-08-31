# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0001
# Source: discussion-YYYYMMDDhhmmssSSS#DAC-001-01
# (imported spec set, no pack: import-lite-YYYYMMDDhhmmssSSS#REQ-XXXX)
Scenario: <scenario title>
  Given <precondition>
  When <action>
  Then <expected outcome>
```

> The `# Source:` comment is required on every AC and lives in this block, not in the optional
> catalog below — a spec that skips the catalog would otherwise have nowhere to record
> provenance, losing the only machine-checkable trace back to the discussion pack.
>
> Write it as `<pack-id>#<discussion-id>`: the pack directory name under `.qfai/discussion/`,
> then the discussion criterion ID inside it, joined by `#`. Both halves are required —
> every pack numbers its criteria from `DAC-001-01`, so a bare `DAC-001-01` cannot say which
> pack it came from, and two packs updating the same spec would collide. Use `-` when the AC
> has no discussion ancestor. Keep the discussion ID verbatim; do not paraphrase it into prose.
>
> An imported spec set with no discussion pack has no pack half to write: use the evidence pair
> `import-lite-<ts>#<REQ-ID>` — the basename of the import-lite evidence file Stage 0 wrote, minus
> the `.md`, then the requirement ID as the imported material names it (its `## Sources` anchor when
> that material has no IDs). See `references/spec-traceability-rules.md`. `-` stays reserved for an
> AC with no ancestor at all; never invent a discussion ID for a pack that does not exist.
>
> Packs written before the `D` prefix carry unprefixed IDs (`AC-001-01`). Copy those verbatim
> as well — `discussion-YYYYMMDDhhmmssSSS#AC-001-01` — rather than inventing a `DAC-` form
> the pack does not contain.

## AC Catalog (optional)

| AC-ID   | Title   | Notes   | Priority |
| ------- | ------- | ------- | -------- |
| AC-0001 | <title> | <notes> | P1       |

> This catalog is a human-facing index. It deliberately carries no `Source` column: provenance
> has exactly one home, the `# Source:` comment in the required Gherkin block above, so the two
> can never disagree.
