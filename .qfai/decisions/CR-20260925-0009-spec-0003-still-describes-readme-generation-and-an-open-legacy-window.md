# Change Request

- ID: `CR-20260925-0009`
- Title: `spec-0003 still describes README generation and an open legacy window`
- Raised by: `qfai-sdd`
- Raised at: `2026-09-25T03:18:00Z`
- Class: `intent`
- Status: `approved`
- Approved by: `claude-code` — under the user's standing instruction to process every issue of this session with its own judgment; NOT a user decision on these options
- Approved at: `2026-09-25T03:19:00Z`
- Approved option: `1`
- Applied at: `2026-09-25T03:40:00Z` — see Resolution
- Superseded by: `-`

## Context

`CR-20260923-0011` restated most of the `spec-0003` statements that described the
product before a deliberate change. It listed three it did not answer. This record
answers them. Paths under `src/`, `tests/` and `assets/` are relative to
`packages/qfai/`.

| Statements                                                                                                                               | What they say                                                                                                                               | What the product does, and where it is asserted                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `BR-0003-0006`                                                                                                                           | `README.md` is not symlinked, which presumes a README init writes                                                                           | No `README.md` exists anywhere under `assets/init/`, and init writes none into `.agents/`, `.codex/`, `.claude/agents/` or `.github/agents/`. `tests/e2e/initE2E.test.ts:326-354` asserts all four carry none. `EX-0003-0006` already says so                                                                                                                                                                |
| `07_Decisions.md` `DR-0003-0005`, the second rationale bullet of `DR-0003-0002`, and the `syncIntegrationWrappers()` row of `10_Plan.md` | A README is kept as a regular file in each integration directory, regenerated under `--force`, and `syncIntegrationWrappers()` generates it | `src/cli/commands/init.ts` `syncIntegrationWrappers` prunes the old wrappers, writes `.github/copilot-instructions.md`, distributes the two review instructions and creates the skill and agent links. It writes no README. `09_delta.md` records the retirement of the story that asked for one                                                                                                             |
| The `.github/copilot-instructions.md` that init writes (`src/cli/commands/init.ts`, `buildCopilotInstructions`)                          | The legacy `.qfai/assistant/steering/` layout is read-compatible during the deprecation window, and `D-DEPRECATED-PATH` fires as a warning  | The window closed at the sunset release. `emitLegacyAssistantSteeringSunset` writes `D-DEPRECATED-PATH` through `error()`, which writes stderr, for `.qfai/assistant/steering/` and `.qfai/assistant/instructions/`, and names `qfai init --upgrade-assistant-tree`. `tests/cli/init.test.ts` (`TC-0003-0026 (TDD-0026)`) asserts it. No test asserts the generated Copilot text, and no test case states it |
| `tests/integration/shippedWorkflowDetection.test.ts`, the fourth `it` of the `TDD-0038` describe                                         | Full history is requested "on the detection job only"                                                                                       | The same case sanctions and requires three requests: the orchestrator's `detection` job, the document `scope` job, and the validation job on a pull request. `TC-0003-0038` verify bullet 4, restated by `CR-20260923-0011`, already says so                                                                                                                                                                 |

The third row is product text shipped to every adopter. It is wrong, and nothing
would fail if it stayed wrong, because no case states it.

`TDD-0038`'s `Selector` names the describe, `TC-0003-0038 (TDD-0038): docs-only
diff selects the minimal lane set, source diff selects the full one`. The stale
title is an `it` inside that describe. Renaming it leaves the `Selector` resolving
to the same describe and the same four cases, so the ledger cell already follows
the rename.

## Options (at least 3) and recommendation

| #   | Option                                                                                                                                                                                                          | Cost                                                                                                      | Risk                                                                                                                                             | Recommended |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| 1   | Restate the README statements to what the product does. Add one test case, with its criterion, rule and example, for the Copilot text, and correct that text under a new ledger row. Rename the `TDD-0038` `it` | Four statements restated; one criterion, rule, example, test case and ledger row added; one title renamed | The new row goes through the full cycle. The `TDD-0038` rename changes a `done` row's test file without changing its `Selector` or any assertion | ✅          |
| 2   | Restate the README statements and correct the Copilot text with a test that no test case names                                                                                                                  | Four statements, one product line, one test                                                               | The shipped text is asserted but has no obligation behind it, so a later change to it is not traced to anything                                  |             |
| 3   | Restate the README statements only, and leave the Copilot text and the `TDD-0038` title for later                                                                                                               | Four statements                                                                                           | Adopters keep receiving guidance that calls a closed window open and an error a warning                                                          |             |

## Proposed change

Option 1.

1. `BR-0003-0006`, `DR-0003-0005`, the second rationale bullet of `DR-0003-0002`
   and the `syncIntegrationWrappers()` row of `10_Plan.md` say that init writes no
   README into those directories. Ids stay as they are.
2. `AC-0003-0039`, `BR-0003-0049`, `EX-0003-0052` and `TC-0003-0059` state that
   the generated `.github/copilot-instructions.md` describes the legacy layout as
   past its compatibility window, reported on stderr as a `D-DEPRECATED-PATH`
   error, and names `qfai init --upgrade-assistant-tree`. `TDD-0094` is seeded for
   `TC-0003-0059` at `todo`.
3. The fourth `it` of the `TDD-0038` describe is renamed to what it asserts. No
   assertion changes, and the row's `Selector` is unchanged.

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                                 |
| -------------------- | ------------ | -------------------------------------------------------------- |
| `spec-0003/TDD-0094` | `ledger-row` | Seeded by this request for `TC-0003-0059`; it starts at `todo` |

- Not blocked by this CR: `TDD-0006` (`TC-0003-0006`). `BR-0003-0006` now says
  what `EX-0003-0006` already said, and `TC-0003-0006` carries no verify text, so
  the row owes nothing new.
- Not blocked by this CR: `TDD-0038`. Its `Selector`, its test case and every
  assertion are unchanged. The proof its entry records was taken on the same four
  cases, and its mutation targets the first case, which this change does not
  touch. The row stays `done`.
- Not blocked by this CR: `TDD-0026` (`TC-0003-0026`). It asserts the stderr
  finding, which does not change.
- Overlapping open CRs: `none`

## Impact scope

- Specs: `spec-0003`
- Plans: `.qfai/specs/spec-0003/10_Plan.md`
- Tests: `spec-0003/TDD-0094` (new),
  `packages/qfai/tests/integration/shippedWorkflowDetection.test.ts` (one `it`
  title of `spec-0003/TDD-0038`)
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR:
  `.qfai/specs/spec-0003/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0003/04_Business-Rules.md`,
  `.qfai/specs/spec-0003/05_Examples.md`,
  `.qfai/specs/spec-0003/06_Test-Cases.md`,
  `.qfai/specs/spec-0003/07_Decisions.md`,
  `.qfai/specs/spec-0003/09_delta.md`,
  `.qfai/specs/spec-0003/10_Plan.md`,
  `.qfai/specs/spec-0003/tdd/test-list.md`

## Decision needed from user

Approve option 1: restate the README statements, add a test case for the
generated Copilot text and correct that text under a new ledger row, and rename
the `TDD-0038` title?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0003`, mode `re-derive`: restate the statements in
   `## Context`, add `AC-0003-0039`, `BR-0003-0049`, `EX-0003-0052` and
   `TC-0003-0059`, seed `spec-0003/TDD-0094` at `todo`, and record this request in
   `spec-0003/09_delta.md`.
2. `/qfai-atdd spec-0003`: write the `TC-0003-0059` case and hand `TDD-0094`
   over.
3. `/qfai-implement spec-0003`: take `TDD-0094` through its cycle, correcting the
   Copilot text in `src/cli/commands/init.ts`. Rename the `TDD-0038` `it` and
   re-run the selectors of the rows that share its test file. No row is reset.
   No row is retired.

## Resolution

Applied under option 1.

- `03_Acceptance-Criteria.md`: `AC-0003-0039` added, with its catalog row.
- `04_Business-Rules.md`: `BR-0003-0006` restated; `BR-0003-0049` added.
- `05_Examples.md`: `EX-0003-0052` added.
- `06_Test-Cases.md`: `TC-0003-0059` added.
- `07_Decisions.md`: `DR-0003-0005` restated; the second rationale bullet of
  `DR-0003-0002` no longer names a README.
- `10_Plan.md`: the `syncIntegrationWrappers()` row no longer names README
  generation.
- `spec-0003/09_delta.md` records this request.
- Ledger rows seeded: `spec-0003/TDD-0094` at `todo`. Ledger rows reset: none.
  Ledger rows retired: none.
- `/qfai-atdd` and `/qfai-implement` took `spec-0003/TDD-0094` to `refactor`
  (`.qfai/evidence/atdd-spec-0003.md#tdd-0094`), and renamed the `TDD-0038`
  case, which stays `done`
  (`.qfai/evidence/implement-spec-0003.md#title-rename-in-the-tdd-0038-describe`).
