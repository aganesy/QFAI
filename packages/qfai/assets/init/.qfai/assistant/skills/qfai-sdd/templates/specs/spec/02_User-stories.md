# 02 User Stories

## US Catalog

- US-0001: <summary>

## US-0001: <title>

- Parent: CAP-XXXX
- Source: discussion-YYYYMMDDhhmmssSSS#DUS-XXX <!-- pack route: originating pack + story ID. Imported spec set (no pack): import-lite-YYYYMMDDhhmmssSSS#REQ-XXXX. `-` only when neither route produced this item. -->
- Goal: <goal>
- Non-goals: <non-goal>
- Notes: <notes>

> `Source` carries provenance back to the discussion pack. Write it as
> `<pack-id>#<discussion-id>`: the pack directory name under `.qfai/discussion/`, then the
> discussion-layer ID inside that pack, joined by `#`. Both halves are required. Every pack
> numbers its stories from `DUS-001`, so a bare `DUS-001` cannot say which pack it came from
> — and a spec that a second pack later `UPDATE:APPEND`s would carry two different stories
> under the same `Source` value. The pair resolves to exactly one entry:
> `.qfai/discussion/<pack-id>/03_Story-Workshop.md`, story `<discussion-id>`.
>
> Use the discussion-layer ID verbatim (`DUS-001`, `DAC-001-01`, ...) — never rewrite it into
> prose, and never renumber it into the spec-local `US-0001` form. Discussion IDs are
> `D`-prefixed precisely so they cannot be mistaken for spec IDs, and the `_policies`
> lower-layer-ID rule does not apply to them (it covers spec-local 4-digit IDs only).
>
> **Imported spec sets (no discussion pack)** carry the evidence pair instead:
> `import-lite-<ts>#<REQ-ID>` — the basename of the import-lite evidence file Stage 0 wrote,
> minus the `.md`, then the requirement ID as the imported material names it (its `## Sources`
> anchor when that material has no IDs). Both halves stay required. See
> `references/spec-traceability-rules.md`. Do not write `-` here and do not invent a discussion
> ID: on this route no pack exists to hold one.
>
> **Packs written before the `D` prefix** carry unprefixed IDs (`US-001`, `AC-001-01`).
> Copy those verbatim too: `discussion-YYYYMMDDhhmmssSSS#US-001`. Do NOT invent a `DUS-`
> form for them — that ID does not exist in the pack, so the `Source` would resolve to
> nothing. The pack half already disambiguates it from the spec-local `US-0001`, and the
> pack is immutable: rewriting its IDs to match this template is not a migration.
