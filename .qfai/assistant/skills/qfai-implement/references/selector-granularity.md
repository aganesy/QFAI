# Selector Granularity

`Selector` is **not** restricted to a single test function. A row may legally own several, written as
a comma-separated list or a glob — but only when they observe the **same** boundary from different
angles: `test_rejects_expired_token_via_header, test_rejects_expired_token_via_cookie`, or
`test_rejects_expired_token_*`. Two different rejection reasons (`expired_token` and
`wrong_audience`) are two boundaries and therefore two rows. What is restricted is what a row may
_conflate_:

- **One independently observable boundary per row.** Multiple selector entries are for covering that
  one boundary from more than one angle, never for packing several boundaries behind one `TDD-ID`.
  RED is still observed **per selector entry**, not once per row — each entry needs its own "watch it
  fail for the expected reason" observation, and each entry's failure reason is recorded separately
  in Evidence.
- **A matrix-shaped `TC-*` must be decomposed before RED begins.** A `TC-*` that enumerates many
  rejection reasons, a status-code matrix, or several independent state transitions is split across
  multiple TDD rows — one falsifying oracle per row — rather than accumulated behind one selector.
  The splitting rule: **one row per independently observable boundary**. Rows that decompose the
  same `TC-*` all carry that `TC-*` in `TC-Refs`; `TC-Refs` is many-to-many with `TDD-ID`.
- A selector that accumulates unrelated boundaries **invalidates the RED observation** — see the Red
  phase below.
- **Precedence, when the two rules seem to disagree:** the row-splitting rule wins. If you cannot
  name the single boundary that every selector entry on a row observes, the row is carrying more
  than one and must be split.
