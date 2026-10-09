# Finding Code Grammar

This document is internal to package development; it is **NOT** shipped via
`qfai init`. It declares the grammar of `Issue.code` — the operator-facing
identifier that `qfai validate` prints, that lands in `validate.json`, and that
an operator types into `.qfai/waivers.yml`.

## The grammar

```text
QFAI-<AREA>-<NNN>
```

- `QFAI` — literal prefix, always.
- `<AREA>` — one or more uppercase ASCII letters naming the gate family
  (`ATDD`, `HYG`, `TRACE`, `TEST`, …). No digits, no inner separator.
- `<NNN>` — exactly three decimal digits.

As a regular expression: `/^QFAI-[A-Z]+-\d{3}$/`.

**Every new finding code MUST match it.** There is no second grammar to pick
from, and a new prefix family is not a decision a single validator gets to make.

Why this shape: it is already most of the surface, and the three-segment form is
what every downstream consumer assumes — the `QFAI-<AREA>-*` globs in
`core/saasPackage/skippedGates.ts` and `GATE_GROUP_FAMILIES` in
`cli/commands/validate.ts`. A code outside the shape silently gets no
partial-profile family entry.

## The legacy registry

Codes that predate the grammar are frozen in
`tests/core/findingCodeGrammar.test.ts` (`LEGACY_FINDING_CODES`). The guard
there enforces both directions:

- a code in `src/` that is neither canonical nor registered fails the test — so
  the legacy set cannot grow;
- a registered code that no longer appears in `src/` fails the test — so the
  registry cannot rot behind a rename.

What counts as "in `src/`" is read off the TypeScript AST, not off a regular
expression: the guard first finds every function that turns a code into an
`Issue` — the shared `issue()` helper plus each local factory taking the code as
its first parameter — and then reads the code out of every call to one, out of
every `code:` field, and out of every `_CODE` / `_RULE_ID` / `_RULE` constant. A
literal scan for `issue("…")` matched none of the nine local factories
(`\bissue\(` does not match `classificationIssue(`), so the codes raised through
them were registered nowhere and a new non-conforming one added the same way
passed. The factory set itself is asserted, so a factory renamed out of the
convention fails loudly instead of quietly shrinking the scanned surface.

The frozen families, none of which may take a new member:

| family     | shape                        | example                     |
| ---------- | ---------------------------- | --------------------------- |
| `QFAI-`    | non-conforming `QFAI-` codes | `QFAI-CFG-LINK-001`         |
| `HANDOFF-` | handoff schema               | `HANDOFF-SCHEMA-NOT-OBJECT` |

## Adding a code

1. Pick `QFAI-<AREA>-<NNN>` with an `<AREA>` that already exists if one fits.
2. If the `<AREA>` is new, add a `QFAI-<AREA>-*` entry to the family tables in
   `core/saasPackage/skippedGates.ts` and `cli/commands/validate.ts` for the
   gate that emits it, or the partial-profile notice will under-state what a
   profile skipped.
3. Prefer a wildcard family entry (`QFAI-TEST-*`) over a bare code
   (`QFAI-TEST-001`): a bare entry drifts the moment the gate gains a second
   code, which is exactly how both tables came to omit `QFAI-TEST-002`.

## A branch that already emits a frozen-family code

A branch written before the guard, or against an older copy of it, reaches
review with a code the registry will not take. The registry does not grow, so
the branch renames.

1. **Rename to `QFAI-<AREA>-<NNN>`**, following "Adding a code". Reuse an
   `<AREA>` that fits before adding one.
2. **Check whether the code already exists.** A family several branches reached
   for at once tends to have been settled by whichever landed first:
   `QFAI-WAIVER-001` through `-004` are on the default branch already. Adopt
   the landed spelling rather than minting a parallel one.

### Renaming a code that has shipped

`issue.code` is written into the GitHub annotation each finding produces, into
`validate.json` and into the `rule:` of a `.qfai/waivers.yml` entry, so a
consumer that greps a log, keys an alert on the code, reads the JSON or waives
the rule sees the new spelling and not the old one.

So a rename is **breaking for anyone identifying findings by code**. Treat it
as a behaviour change: say so in the release notes and name both spellings
there.
