# Change Request

- ID: `CR-20260820-0008`
- Title: `The per-item evidence section contract is unsatisfiable when N rows share one RED/GREEN cycle, and this spec has N up to seven`
- Raised by: `/qfai-implement orchestrator, spec-0017; raised after completion-reviewer found 69 of 74 promoted rows without a section of their own`
- Raised at: `2026-08-20T00:00:00Z`
- Class: `intent`
- Status: `superseded`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `CR-20260820-0009`
- Blocked set: `none — the pointer contract is satisfied for all 74 rows and every anchor resolves; what is open is whether the SECTION contract can be met at all in this shape`

## SUPERSEDED — the premise was false

**2026-08-20, after round 6.** `completion-reviewer` was asked to challenge this CR and refuted it at
the citation. The argument rested on:

> "The commands are file-scoped, because that is what `references/relevant-test-suite.md` asks for."

That file's opening line is "What 'run the relevant test suite' resolves to in **Phase: Refactor step
2**". It governs Refactor, not Red. The rule that governs Red says the opposite — `SKILL.md` Phase Red
step 4: **"Observe each `Selector` entry's failure separately; one aggregate run is not a valid RED
observation."**

So there is no rule requiring one RED/GREEN pair per change, and there is one forbidding the
aggregate. Under a per-row RED there is no "one pair written seven times" — there are seven distinct
commands with seven distinct outputs, and the per-item section contract is satisfiable with no
conflict at all. The reviewer also corrected the reading of "the single home": the clause contrasts
the section with the LEDGER CELL ("because a GFM cell cannot hold a newline or a bare `|`"), not one
location per run.

A second claim in this CR was also false. § "What is not the problem" asserted "the per-item FIELD
contract … The fields exist per row". They do not: `Refactor verify` is six pairs for 74 rows and the
reviewer verdicts are one global table, both per-item fields. That paragraph is what would have
stopped an operator noticing.

Superseded by **`CR-20260820-0009`**, which files what was underneath this: 44 promoted rows rest on
an aggregate run the contract says is not a valid RED observation. Review finding B7 — seven cells
quoting one file-scoped RED, one of them never part of it — was the symptom of that, and two rounds
were spent repairing the symptom.

Nothing here needs approving. The decision this CR asked for does not exist.

## The requirement, quoted

`SKILL.md` § "Evidence (MANDATORY)", required sections:

> **Per item, one `### TDD-NNNN` section** carrying the contract below — the single home for the
> RED/GREEN commands and output. The ledger's `Evidence` cell anchors here and holds only the
> one-word outcomes, because a GFM cell cannot hold a newline or a bare `|`.

## The measurement

`.qfai/evidence/implement-spec-0017.md` holds **five** `### TDD-NNNN` headings and 74 promoted rows.
The record is organised into sixteen `## Change N` blocks instead, one per sequenced change, and each
ledger cell points at its row's anchor inside the block that covers it.

All 74 anchors resolve — that was review finding B5 and it is fixed. What does not exist is a section
per row.

## Why the record is shaped that way, and why the contract cannot simply be applied

A RED/GREEN cycle in this spec is **per change, not per row**. The commands are file-scoped, because
that is what `references/relevant-test-suite.md` asks for, and one file holds every row of a change:

| block                           | rows | one recorded RED/GREEN pair               |
| ------------------------------- | ---- | ----------------------------------------- |
| change 8, change detection      | 7    | `6 failed / 13 passed (19)` → `19 passed` |
| the hygiene rule set            | 6    | `6 failed / 16 passed (22)` → `22 passed` |
| the shipped tree joins the lane | 6    | `4 failed / 24 passed (28)` → `28 passed` |
| the mapping document            | 7    | `2 failed / 5 passed (7)` → `7 passed`    |
| the required-context job        | 4    | `2 failed / 24 passed (26)` → `26 passed` |

Writing a section per row means writing that **one pair seven times**. The contract calls the section
"the single home for the RED/GREEN commands and output", and seven copies of one run is the opposite
of a single home: it creates seven places where a re-measurement has to be applied consistently, and
this run has already been bitten twice by exactly that failure mode — a repair to one copy staling
the others (`CR-20260817-0002`, and review finding B7, where seven cells quoted one file-scoped RED
and one of the seven had not been part of it).

So the contract and the shape are in genuine conflict, and the conflict is not this spec's peculiar
mess: any spec whose rows share a test file will hit it. `spec-0006` did — `CR-20260817-0002` is that
CR, and its Option A ("revisions, not blob enumerations") settled the ADDRESSING question while
leaving the sectioning question untouched.

## What is not the problem

- **Not the anchors.** All 74 resolve, verified mechanically each round.
- **Not the per-item FIELD contract.** Every row has its own `RED failure mode`, its own oracle
  round or falsifiability trio, and its own entry in the ledger's `Evidence` cell. The fields exist
  per row; only the heading does not.
- **Not a shortage of per-row narrative.** Where a row needs its own explanation it has one, inside
  its block, addressed by its own anchor.

## Options

1. **Admit a shared section when rows share a cycle (recommended).** The contract gains: "where N
   rows are driven by one RED/GREEN cycle, one section may cover them, provided every covered row is
   named in the heading or an anchor list, each row's per-item fields appear under it, and the shared
   pair is written once." Cost: `### TDD-NNNN` stops being a reliable grep target, so the reviewer
   check becomes "every row's anchor resolves and its fields are present" rather than "count the
   headings". Benefit: it describes what a file-scoped RED actually is, and it keeps one run recorded
   once.
2. **Require a section per row and permit a cross-reference for the shared pair.** Each row gets
   `### TDD-NNNN` carrying its own fields plus `RED command / result: see the change-8 block`. Cost:
   74 headings, most of them four lines long, and the pair still lives in one place — so the section
   is a stub, and "the single home for the RED/GREEN commands" moves to the block anyway.
3. **Require a section per row with the pair duplicated in full.** Literal compliance. Cost: the
   seven-copies problem above, which this spec has already been burned by twice. Rejected on measured
   grounds rather than taste.
4. **Require one row per RED/GREEN cycle upstream** — i.e. forbid a change from promoting more than
   one row. Cost: it re-specifies the test-design side, not the evidence side, and it forbids the
   file-scoped run that `relevant-test-suite.md` asks for. It would also have made this spec 82
   changes instead of nine.

Recommended: option 1. It is the only one where the shared run is recorded once and the reviewer
check stays mechanical.

## Impact

- Specs: `none`
- Plans: `none`
- Tests: `none`
- Contracts: `none`
- Schema: `none`

Files that would change: `.qfai/assistant/skills/qfai-implement/SKILL.md` (the required-sections
list) and `references/execution-ledger.md#evidence-cell-contract` if the reviewer check moves.

## Decision needed from user

Should the per-item section requirement admit one shared heading-level-3 section for rows driven by one
RED/GREEN cycle, with the reviewer check becoming "every row's anchor resolves and its per-item
fields are present" (option 1) — or should this spec's record be restructured into 74 sections,
either as stubs (option 2) or with the shared pair duplicated (option 3)?

## Approved actions (owner skill rerun plan)

1. **No mode applies** — `SKILL.md` and `references/**` are packaged skill text under
   `packages/qfai/assets/init/**`, which the step-4 invocation table (`spec-*/**`, `_policies/**`,
   `.qfai/contracts/**`) does not cover. The installed `.qfai/` mirror follows by reinstall, not by
   a skill rerun.
2. Downstream ledger sweep: **no rows are reset** under option 1 — the record already satisfies what
   that option would require, and every row's anchor and fields are in place. Enumerated so a later
   sweep cannot widen: not reset, all 74 promoted rows. Under options 2 or 3 no row is reset either;
   the work is a restructure of `.qfai/evidence/implement-spec-0017.md` and touches no ledger cell.
3. Cross-check after applying: under option 1, re-run the anchor audit — every `#tdd-NNNN` a ledger
   cell names must resolve, currently 74 of 74 — and confirm each promoted row's `RED failure mode`
   or falsifiability trio is present in its cell. Under options 2 or 3, count `### TDD-` headings and
   require 74.

## Resolution

<!--
Filled in when Status leaves `open`. Record which option was taken and, for option 1, the wording
added to the required-sections list.
-->
