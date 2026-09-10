# 02 User Stories

## US Catalog

- US-0001: <summary>

## US-0001: <title>

- Parent: CAP-XXXX
- Source: discussion-YYYYMMDDhhmmssSSS#DUS-XXX <!-- pack route: originating pack + story ID. Imported spec set (no pack): import-lite-YYYYMMDDhhmmssSSS#REQ-XXXX. `-` only when neither route produced this item. -->
- Flow: BF-XXXX <!-- optional; the business flows that realize this story, comma-separated -->
- Goal: <goal>
- Non-goals: <non-goal>
- Notes: <notes>

> **`Flow` binds the story to the business flow that realizes it.** Write the IDs
> `_policies/04_Business-Flow.md` declares, comma-separated, in this story's own block. A test
> under `<testsDir>/e2e/**` annotated `QFAI:BF-0001` then answers the E2E obligation of every
> story naming that flow, so one test covers a flow rather than one test covering a story —
> which is the grain E2E verifies. The line is optional: a story that names no flow keeps the
> obligation it already had, answered by a `QFAI:SPEC-XXXX:US-XXXX` annotation as before. The
> edge runs this way, and only this way, because `_policies/**` must not name a lower-layer ID;
> see `references/spec-traceability-rules.md`.

> **Deferring a story out of the current slice.** Add a `- x-qfai-status: planned` meta line
> to this block. That story is then excluded from the E2E coverage obligation (`QFAI-ATDD-111`)
> and named at `info` by `QFAI-ATDD-118`, so the deferral is recorded rather than silent — the
> same token and the same treatment `CON-API-*` and `CON-DB-*` already have. The marker belongs
> to the block it is written in: one above the first `US-XXXX` heading defers nothing. Remove
> it when the slice is implemented. Do not instead leave the story uncovered, write an E2E test
> that asserts nothing, or declare the whole spec non-user-facing — that last one erases the
> obligation for every other story in the spec.

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
> minus the `.md`, then the requirement ID as the imported material names it, or the `IMP-NNN`
> the evidence file's `## Imported requirements` assigns when that material has no IDs of its
> own. Both halves stay required. See
> `references/spec-traceability-rules.md`. Do not write `-` here and do not invent a discussion
> ID: on this route no pack exists to hold one.
>
> **Packs written before the `D` prefix** carry unprefixed IDs (`US-001`, `AC-001-01`).
> Copy those verbatim too: `discussion-YYYYMMDDhhmmssSSS#US-001`. Do NOT invent a `DUS-`
> form for them — that ID does not exist in the pack, so the `Source` would resolve to
> nothing. The pack half already disambiguates it from the spec-local `US-0001`, and the
> pack is immutable: rewriting its IDs to match this template is not a migration.
