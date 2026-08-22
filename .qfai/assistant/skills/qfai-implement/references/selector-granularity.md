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
  same `TC-*` all carry that `TC-*` in `TC-Refs`; `TC-Refs` is many-to-many with `TDD-ID`. **The
  decomposition is `/qfai-sdd` Phase 2b's write, not this skill's** — adding or re-scoping a row is
  upstream (`../../qfai-sdd/references/spec-traceability-rules.md` **Ownership split**), so a matrix
  shape first visible at RED is stopped and raised as a Change Request, never split in place
  (`../SKILL.md` Phase Red).
- A selector that accumulates unrelated boundaries **invalidates the RED observation.** A single test
  function can fail only once, so if one selector entry carries an entire obligation matrix, "the
  expected reason" is whichever assert happens to execute first — every assertion after it is
  unobserved on every RED run, and a non-deterministic assertion placed early silently disables
  everything below it. `../SKILL.md` Phase Red **step 1** stops such a row at selection, while it is
  still `todo`, rather than proceeding to Green on it — the row normally fails as expected on its
  first assert, so a check placed after the test run would never fire.
- **Precedence, when the two rules seem to disagree:** the row-splitting rule wins. If you cannot
  name the single boundary that every selector entry on a row observes, the row is carrying more
  than one and must be split.
