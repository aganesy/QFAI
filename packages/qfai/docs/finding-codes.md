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
what every downstream consumer assumes — the prefix strip in
`core/waivers.ts#resolveRuleKeys`, the `QFAI-<AREA>-*` globs in
`core/saasPackage/skippedGates.ts`, and `GATE_GROUP_FAMILIES` in
`cli/commands/validate.ts`. A code outside the shape silently gets no waiver
alias and no partial-profile family entry.

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

| family     | shape                        | example                        |
| ---------- | ---------------------------- | ------------------------------ |
| `QFAI-`    | non-conforming `QFAI-` codes | `QFAI-CFG-LINK-001`            |
| `QFAI_`    | underscore-separated         | `QFAI_CONFIG_INVALID`          |
| `TDDLIST_` | screaming snake              | `TDDLIST_INVALID_STATUS`       |
| `TDDLIST-` | numbered rule ids            | `TDDLIST-001`                  |
| `R-`       | rule/report drift            | `R-SKILL-MANIFEST-DRIFT`       |
| `E_`       | spec-layer errors            | `E_TC_ORPHAN`                  |
| `D-`       | deprecation / degradation    | `D-SCAFFOLD-PLACEHOLDER`       |
| `W-`       | warnings                     | `W-WORKLOG-SCHEMA`             |
| `UIX-`     | prototyping UI checks        | `UIX-VAL-DS01`                 |
| `HANDOFF-` | handoff schema               | `HANDOFF-SCHEMA-NOT-OBJECT`    |
| `TRACE_`   | traceability scope           | `TRACE_SHARED_SCOPE_VIOLATION` |
| `I-`       | informational                | `I-ASSISTANT-LAYER-UNSEEDED`   |

Some rules carry two spellings of themselves — `TDDLIST-001` is the `rule` a
finding is waived by and `TDDLIST_EXCEPTION_PARKED` the `code` it prints (see
`src/core/ruleIds.ts`). Both are registered; neither is canonical.

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
2. **Keep the `<AREA>-<NNN>` suffix the old id had**, when the code being
   renamed has one. `resolveRuleKeys` in `src/core/waivers.ts` adds a stripped
   spelling of the emitted code to the keys a waiver may match on, so a finding
   coded `QFAI-TDDLIST-007` also answers to `TDDLIST-007` and an existing
   `.qfai/waivers.yml` entry keeps matching. Change the number —
   `QFAI-TDDLIST-007` to `QFAI-TDDLIST-011` — and the alias becomes
   `TDDLIST-011` rather than `TDDLIST-007`, which is the spelling the entry
   names.
3. **Check the stripped spelling for a collision, not only the full code.**
   `TDDLIST-001` and `TDDLIST-002` are live rule ids with no
   `QFAI-TDDLIST-00N` counterpart, so taking one of those numbers for an
   unrelated condition would let an existing waiver suppress the new finding.
   Search `src/core/ruleIds.ts` and every `Issue.rule` for the spelling
   `resolveRuleKeys` would derive, as well as for the code itself.
4. **The strip is narrow.** It reads `code`, and matches `QFAI-<AREA>-<NNN>`
   with a single all-letter area — so `QFAI-CFG-LINK-001` strips to nothing,
   and a screaming-snake code (`TDDLIST_EXCEPTION_PARKED`) does not match at
   all, so no alias is derived from it. Such a finding may still carry a
   numbered id: `TDDLIST_EXCEPTION_PARKED` is published under
   `rule` `TDDLIST-001`. That is a separately declared back-compat alias in
   `ruleIds.ts`, not something the strip produces, so renaming one of these
   needs an explicit alias — the work `## Not covered here` defers.
5. **Check whether the code already exists.** A family several branches reached
   for at once tends to have been settled by whichever landed first:
   `QFAI-TDDLIST-007` through `-010` are on the default branch already. Adopt
   the landed spelling rather than minting a parallel one.

### Renaming a code that has shipped

The alias above covers waivers and nothing else. `issue.code` is written into
the GitHub annotation each finding produces and into `validate.json`, so a
consumer that greps a log, keys an alert on the code, or reads the JSON sees
the new spelling and not the old one.

So a rename is source-compatible for waivers and **breaking for anyone
identifying findings by code**. Treat it as a behaviour change: say so in the
release notes, name both spellings there, and give consumers the release the
old one stops appearing in.

## Not covered here

Renaming a legacy code whose shape is **not** `<AREA>-<NNN>` needs an alias
table with a deprecation window, because the prefix strip above gives it
nothing: a `.qfai/waivers.yml` entry written against `TDDLIST_EXCEPTION_PARKED`
or `R-SKILL-MANIFEST-DRIFT` resolves through neither spelling once the code
moves. That migration, and publishing the inventory as a build artifact, are
separate work.
