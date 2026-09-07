# Selector Granularity

`Selector` is **not** restricted to a single test function. A row may legally own several, written as
a JSON array or a glob (`#entry-form`) — but only when they observe the **same** boundary from
different angles:
`["test_rejects_expired_token_via_header", "test_rejects_expired_token_via_cookie"]`, or
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

## Entry form

How many entries a cell holds is decided here, and only here — every consumer that runs a selector
per entry (Phase Red, `qa-gatekeeper`, `checkpoint-verification.md` step 1) splits it this way.

- **Parsing.** A cell whose first non-space character is `[` and which
  parses as a JSON array of strings holds **one entry per element**, each taken verbatim with no
  further splitting. Any other cell — one that does not start with `[`, or one that fails to
  parse — is exactly **one** entry, whatever punctuation it contains.
- **Never split a bare cell on commas.** A comma is legal inside a single test name, and vitest/jest
  names routinely carry one — this is one name, not three:

  ```text
  falls back to the built-in set, and labels it, when the file is absent
  ```

  A comma split turns it into three entries that each match nothing, so every command built from
  them selects zero tests — and a name option that matches nothing still exits 0, which is precisely
  the silent pass the per-entry rule exists to prevent.

- **Writing.** One entry: write the name bare. Nothing splits a bare cell, so a comma, a quote or a
  backtick inside the name needs no escaping. Two or more: write the JSON array, and let JSON's own
  escaping (`\"`, `\\`) carry whatever the names contain. A single name that would itself parse as a
  JSON array is written as a one-element array, so the cell cannot be read as a list.
- A **glob** is one entry either way — bare, or as an element of the array. It is expanded by the
  runner-specific translation rules, never by this split.
- The ledger is a GFM table, so a `|` inside any name is escaped `\|` exactly as in every other
  cell. That is the table's rule, not this one.

### Reading a cell written under the old comma rule

Before the array form, this contract called a multi-entry cell a _comma-separated list_, so ledgers
already persisted in projects hold rows like `renders the header, renders the footer` that meant two
names. Read literally by the rule above those are now **one** entry, and a name option handed the
joined string selects zero tests and still exits 0 — the row can never be advanced again. So a bare
cell containing a comma gets one bounded compatibility reading before it is treated as a single name:

1. Resolve the whole cell as one name against the row's `Test file`. If it names a test there, it is
   one entry. **This branch wins**, because a name that legitimately contains a comma is the case
   the array form was introduced to protect, and it is the more common one.
2. Only if the whole cell resolves to nothing, split it on commas and resolve each part. If **every**
   part names a test in that file, the cell was written under the old rule and holds those entries.
3. If neither reading resolves, it is one entry — and the entry names no test, which is the row's
   real problem and is reported as `TDDLIST_SELECTOR_UNRESOLVED` rather than papered over by a split.

The disambiguation is evidence, not guesswork: a split is adopted only when the file actually
contains every part, so it can never invent entries out of one comma-bearing name. Nothing here
changes **Writing** — a row you touch is rewritten in the array form, which is why this reading is a
migration and not a second permanent syntax.
