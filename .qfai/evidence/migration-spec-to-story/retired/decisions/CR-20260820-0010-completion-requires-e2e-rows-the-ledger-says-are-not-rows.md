# Change Request

- ID: `CR-20260820-0010`
- Title: `spec-0017's nine user stories have no E2E test annotating them, and the required status context validates every spec at once`
- Raised by: `/qfai-implement orchestrator, spec-0017; raised from qa-gatekeeper's round-6 finding N7, which it left unfiled`
- Raised at: `2026-08-20T00:00:00Z`
- Class: `intent`
- Status: `approved`
- Approved by: `user (interactive decision, /qfai-sdd session)`
- Approved at: `2026-08-23T00:00:00Z`
- Approved option: `1` — scope the completion condition to specs that declare an E2E coverage-target TC
- Applied at: `2026-08-23T00:00:00Z` — SKILL.md completion condition reworded, net-zero against the 500-line ceiling
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

## Re-measured after merging `origin/main`, and the contradiction changed shape

**Added 2026-08-20.** Two things moved, and together they make this CR stronger rather than moot.

**1. The `SKILL.md` sentence this CR quotes is gone from merged `main`.** The spec-completion
condition "Every `US-*` the spec declares has a `Layer = E2E` row whose `US-Refs` names it" is
absent. So one half of the contradiction as originally filed no longer exists.

**2. The VALIDATOR still enforces it.** `QFAI-ATDD-111` fires exactly as before. Measured at the
merge commit, with each item counted once:

```text
QFAI-ATDD-111   20 items across 5 specs
  spec-0003  8      spec-0006 1      spec-0008 1      spec-0015 2
  spec-0017  9      <- US-0017-0001 .. US-0017-0009, every user story this spec declares
```

So the contradiction is no longer doc-versus-doc. It is **code versus doc**: `QFAI-ATDD-111` requires
every `US-*` to be referenced from an E2E test, and the ledger's producer note says `US-*` are not
rows in this ledger and that `/qfai-atdd` does not write here. A rule enforced by a validator against
a rule stated in the artifact the validator reads is a harder contradiction than two sentences, not a
softer one — a reader cannot resolve it by preferring the newer text.

### And it now blocks a green pull request, not just a checkpoint

This CR originally said the contradiction was "half of why 74 rows cannot reach `done`". Running the
scaffold for the first time (PR #794) showed it is more than that. The `build` job — the one
`.github/required-status-contexts.json` names as carrying the required status context — runs
`validate --profile tdd --fail-on error` over the whole repository as a dogfooding step. That step
exits 1 on these two errors, so:

```text
build  fail  57s   QFAI self-validate this repo (dogfooding — TDD gates)  -> exit 1
```

**The required status context cannot go green while these findings stand.**

### The part that changes what any amount of work here can achieve

`spec-0017` contributes 9 of the 20 `QFAI-ATDD-111` items and 8 of the 15 `QFAI-ATDD-112` items. The
other specs contribute 11 and 7. So even if every row of this spec were `done` and every annotation
written, the step would still exit 1 on `spec-0003`, `spec-0006`, `spec-0008` and `spec-0015` — and
the required context would still fail.

That is not an argument for ignoring it. It is the reason the dogfooding step's scope belongs in the
options: a required-context job that validates the WHOLE repository cannot be made green by any one
spec, which makes it a gate no pull request can satisfy until every spec is clean simultaneously.

### An option this CR did not have

**Option 5 — scope the dogfooding step to the specs the pull request touches.** `--fail-on error` over the
whole tree makes every spec's findings every pull request's problem. Scoping it to changed specs
keeps the gate meaningful for the work in hand and lets a clean spec merge while another is
mid-flight. Cost: a repository-wide regression in an untouched spec stops failing the required
context, which is exactly what a dogfooding gate is for — so this trades one real property for
another and should be decided rather than assumed. It also interacts with `BR-0017-0007`'s
executed-instance ceiling, since scoping needs the changed-spec list the `detect` job already
computes.

`spec-0017`'s own contribution to `QFAI-ATDD-112` is exactly its 6 `blocked` and 2 `todo` rows —
`TC-0017-0016`, `0030`, `0032`..`0035`, `0069`, `0070` — which have no test because those rows are not
implemented. That part is not a defect and clears when they are.

## CORRECTION — there is no contradiction, and this CR was wrong from the start

**2026-08-20, after measuring what the validator actually reads.** Everything above is superseded by
this section. Kept rather than deleted because the mistake is the third of its kind in this run and
the shape is worth being able to see.

### What is actually true

```text
QFAI: US annotations in packages/qfai/tests/e2e/**      74
  for spec-0017                                          0
E2E test files, one per spec, by convention              spec0004…E2E.test.ts, spec0006…, spec0008…
specs declaring surface_type in FRONTMATTER               0
.qfai/contracts/ui/ companions                            0  (README only)
```

The ledger's Producer note says `US-*` are "traced by `QFAI:` annotations in the test tree". That is
**exactly** what `QFAI-ATDD-111` checks. The note and the validator agree, and 74 live annotations
prove the mechanism is in use.

So the finding is not a contradiction to resolve. It is a true statement: **spec-0017 declares nine
user stories and has no E2E test annotating any of them**, while every other spec that is clean has
one. `QFAI-ATDD-111` is reporting a real coverage gap.

The other four specs it names are in the same position, not collateral: spec-0003 (8 unreferenced),
spec-0006 (1), spec-0008 (1), spec-0015 (2).

### Where the error came from

I read the `SKILL.md` sentence — "Every `US-*` the spec declares has a `Layer = E2E` **row** whose
`US-Refs` names it" — as the operative rule, and built a contradiction between it and the Producer
note's "`US-*` are not rows here". Those two really do conflict, and merged `main` removed the
sentence. But the sentence was never what the validator enforced, and the annotation mechanism the
Producer note names was working the whole time in 74 places.

The `surface_type` scoping I then investigated is also a dead end, and correctly so:
`resolveUiBearingScope` returns `null` when no spec declares a surface, which keeps the gate
project-wide — and its docblock says that is deliberate ("the obligation remains project-wide and
this change relaxes nothing for it"). No spec here has a UI companion contract, so none should
declare one, and the strict fallback is the intended behaviour.

**The pattern, stated because it has now happened three times.** `CR-20260820-0008` argued from
`relevant-test-suite.md`, which governs a different phase. `CR-20260820-0009` argued from step 4's
"aggregate" without checking whether it meant a multi-entry `Selector`. This one argued from a
sentence the validator does not read. Each time I reasoned from a quoted text rather than from what
the system does — the same failure as the four vacuous claims, which asserted over how code is
written rather than what it does. The fix in both cases is the same: run it and look.

### What is left of this CR

One thing, and it is not a decision about rules:

**`spec-0017` needs an E2E test annotating `US-0017-0001` … `US-0017-0009`.** `/qfai-atdd` owns that
— `SKILL.md`'s Non-goals are explicit ("Writing acceptance tests (use `/qfai-atdd`)"), and
`/qfai-implement` "stops with a handoff note if it does not" exist. That is a handoff, not a change
request.

And one thing that IS a decision, which the options below keep: the `build` job runs
`validate --profile tdd --fail-on error` over the WHOLE repository, so the required status context
cannot go green until every spec's US are referenced — spec-0003's 8, spec-0006's 1, spec-0008's 1 and
spec-0015's 2 included. No work on spec-0017 alone can clear it. That is option 5, and it is the only
option in this CR that survives the correction.

Options 1 through 4 are withdrawn: 1 rewords a sentence that no longer exists and was never
enforced, 2 and 3 would put rows in a ledger whose producer rule correctly excludes them, and 4
waives a condition that is doing its job.

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
