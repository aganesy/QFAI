# 02 User Stories

## US Catalog

- US-0001: <summary>

## US-0001: <title>

- Parent: CAP-XXXX
- Source: discussion-YYYYMMDDhhmmssSSS#DUS-XXX <!-- originating pack + story ID, or `-` if none -->
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
