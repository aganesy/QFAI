# Change Request

- ID: `CR-20260820-0010`
- Title: `Spec completion requires a Layer = E2E ledger row per US-*, and the ledger's own producer note says US-* are not rows there`
- Raised by: `/qfai-implement orchestrator, spec-0017; raised from qa-gatekeeper's round-6 finding N7, which it left unfiled`
- Raised at: `2026-08-20T00:00:00Z`
- Class: `intent`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`
- Blocked set: `spec-0017 — no ledger row is blocked by this; what it blocks is the SPEC's completion, and it is one of the two reasons the item-12 checkpoint is unreachable`

## Two sentences that cannot both hold

`.qfai/assistant/skills/qfai-implement/SKILL.md:345`, under the spec-completion conditions:

> Every `US-*` the spec declares has a `Layer = E2E` row whose `US-Refs` names it

`.qfai/specs/spec-0017/tdd/test-list.md`, the Producer note the seeding skill writes at the top of
every ledger:

> `US-*` and `CON-API-*` are **not** rows here. They are ATDD obligations, traced by `QFAI:`
> annotations in the test tree per `.qfai/assistant/catalog/test-layers.md`, and `/qfai-atdd` does
> **not** write to this ledger.

The first requires a row per `US-*` in this ledger. The second says `US-*` are not rows in this
ledger and that the skill owning them does not write there. A spec declaring any user story cannot
satisfy both.

## The measurement

```text
US-0017-* declared in 02_User-stories.md      9
ledger rows with Layer = E2E                  0
rows the Producer note derives                one per coverage-target TC in 06_Test-Cases.md
```

The ledger is correct by its own producer rule: `06_Test-Cases.md` declares no E2E coverage-target
TC, so no E2E row exists to seed. Nothing was omitted here.

## What it costs, concretely

This is the root of `QFAI-ATDD-111`, one of the two `validate --profile tdd` errors that have stood
through six review rounds:

```text
validate --profile tdd --fail-on error --root .
  -> exit 1, counts: info=4 warning=352 error=2
     QFAI-ATDD-111  wants US-0017-* E2E annotations
     QFAI-ATDD-112  names the eight rows with no test, plus TCs from spec-0003/0008/0015
```

And `error=2` is what makes the item-12 checkpoint's step 4 exit non-zero. So the contradiction is
not academic: it is half of why 74 rows cannot reach `done`, and no amount of implementer work
touches it — every path through it needs either an E2E row this ledger forbids, or a change to one
of the two sentences.

## Whose obligation it actually is

`/qfai-atdd` authors E2E tests, and `SKILL.md`'s own Non-goals say so: an `E2E` row's test "is
authored by `/qfai-atdd`", and `/qfai-implement` "only drives that row's status and evidence once the
acceptance test exists, and stops with a handoff note if it does not". So even under a reading where
the E2E rows should exist, this skill cannot produce them — and the ledger's producer note says the
skill that can does not write here.

That is the shape of the problem: three documents, each internally consistent, describing an
ownership boundary with a gap in it.

## Options

1. **Scope the completion condition to specs that declare E2E coverage-target TCs (recommended).**
   Reword `:345` to "every `US-*` the spec declares is traced by a `QFAI:` annotation in the test
   tree, and where `06_Test-Cases.md` declares an E2E coverage-target TC, by a `Layer = E2E` row
   naming it in `US-Refs`". Cost: `US-*` coverage stops being checkable from the ledger alone for
   specs like this one, and moves to the annotation tree — which is where the Producer note already
   says it lives, and where `QFAI-ATDD-111` already looks. Benefit: the three documents agree, and
   the condition becomes satisfiable without either skill writing outside its boundary.
2. **Let the ledger carry `Layer = E2E` rows, seeded from `02_User-stories.md` rather than from
   `06_Test-Cases.md`.** Cost: it contradicts the Producer note's derivation rule ("one row per
   coverage-target TC"), needs `/qfai-atdd` to gain write access to a ledger it is currently
   forbidden, and makes `US-Refs` a second seeding source with its own delta rules. It is the reading
   `:345` most literally implies, and it is the largest change.
3. **Require `06_Test-Cases.md` to declare an E2E coverage-target TC for every `US-*`.** Push the fix
   upstream of both: if every user story has an E2E TC, the Producer note seeds the row and `:345` is
   satisfied with no rule change. Cost: it makes an E2E test mandatory per user story, which
   `test-layers.md` argues against directly — its "convert all obligations into E2E" anti-pattern.
4. **Waive the condition for specs whose `US-*` are all covered by non-E2E rows.** Cost: a waiver is
   a per-spec judgement, and the condition exists to stop a spec closing over an untested user story.
   A waiver that any spec can claim is not a condition.

Recommended: option 1. It is the only one where each document keeps saying what it already says and
the obligation lands where two of the three already put it.

## Impact

- Specs: `none directly — spec-0017's artifacts are correct under their own producer rule`
- Plans: `none`
- Tests: `none`
- Contracts: `none`
- Schema: `none`

Files that would change under option 1: `packages/qfai/assets/init/**` copy of
`skills/qfai-implement/SKILL.md`, and the installed `.qfai/` mirror by reinstall. Under option 2, the
ledger template and `/qfai-atdd`'s write boundary as well.

## Decision needed from user

Should the spec-completion condition at `SKILL.md:345` be scoped to specs that declare E2E
coverage-target TCs, with `US-*` coverage otherwise traced through the annotation tree (option 1) —
or should the ledger carry E2E rows seeded from the user stories (option 2), or should every `US-*`
be required to have an E2E test case upstream (option 3)?

## Approved actions (owner skill rerun plan)

1. **No mode applies** — the target is packaged skill text under `packages/qfai/assets/init/**`,
   which the step-4 invocation table (`spec-*/**`, `_policies/**`, `.qfai/contracts/**`) does not
   cover. The installed `.qfai/` mirror follows by reinstall. Under option 3 the target WOULD be a
   spec artifact (`06_Test-Cases.md`), and the mode there is **`re-derive`**, because E2E TCs would
   have to be authored rather than confirmed.
2. Downstream ledger sweep: **no rows are reset** under options 1 or 4 — no row's obligation changes.
   Under option 2 or 3 the sweep is an APPEND rather than a reset: nine new `Layer = E2E` rows at
   `Status = todo`, one per `US-0017-*`, and no existing row is touched. Enumerated so a later sweep
   cannot widen: not reset, all 82 existing rows.
3. Cross-check after applying: `validate --profile tdd --fail-on error --root .` must stop reporting
   `QFAI-ATDD-111` for `spec-0017`. That is the check, and it is the reason to prefer whichever
   option actually clears it over whichever reads best.

## Resolution

<!--
Filled in when Status leaves `open`. Record the option taken and the re-measured validate counts.
-->
