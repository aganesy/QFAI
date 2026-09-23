# Change Request

- ID: `CR-20260923-0006`
- Title: `spec-0003 states obligations the product reversed on purpose`
- Raised by: `qfai-sdd`
- Raised at: `2026-09-23T08:10:00Z`
- Class: `intent`
- Status: `approved`
- Approved by: `claude-code` — under the user's standing instruction to process every issue of this session with its own judgment; NOT a user decision on these options
- Approved at: `2026-09-23T08:12:46Z`
- Approved option: `1`
- Applied at: `2026-09-23T08:13:56Z` — see Resolution
- Superseded by: `-`

## Context

The coverage-depth matrix for this spec
(`.qfai/evidence/coverage-depth-spec-0003.md`, Finding 2) reports statements in
`spec-0003` that say the opposite of what the product does. In each case the
product changed deliberately, and the tests assert the product. No test can
satisfy both the statement and the product, so the pack is restated.

Every claim below was checked against the test that asserts it and the source
that implements it before the statement was changed.

| Statements                                                                     | What they said                                                                               | What the product does, and where it is asserted                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `US-0003-0001`, `AC-0003-0001`                                                 | `qfai init` creates `specs/`, `contracts/`, `discussion/`, `evidence/`, `review/`, `report/` | `packages/qfai/tests/e2e/initE2E.test.ts`, "creates .qfai/ with assistant assets and no artifact scaffold": `.qfai/assistant` exists and each of the six is asserted absent                                                                                                                                                                                                                                                      |
| `US-0003-0015`, `AC-0003-0015`, `BR-0003-0013`, `EX-0003-0016`, `TC-0003-0018` | A nine-line block with `.qfai/discussion/discussion-*/` and four README negations            | `packages/qfai/src/core/gitignore.ts`: `QFAI_GITIGNORE_LEGACY_LINES` lists all five as retired lines stripped on migration, and `QFAI_GITIGNORE_BLOCK` writes `.qfai/discussion/*` followed by `QFAI_GITIGNORE_GOVERNANCE_NEGATIONS`. Asserted by both `initE2E.test.ts` gitignore cases and by `tests/cli/init.test.ts` "appends QFAI entries to root .gitignore on init"                                                       |
| `REQ-0019`, `AC-0003-0018`, `BR-0003-0016`, `TC-0003-0022`                     | `qfai init` seeds `.qfai/steering/README.md`                                                 | `tests/cli/init.test.ts`, "TC-0003-0022 (TDD-0022): seeds project-root .qfai/steering/ surface": reading `README.md` rejects. `init.ts#seedProjectSteering` seeds `.gitkeep` and `_templates/entry.md` only                                                                                                                                                                                                                      |
| `US-0003-0020`, `AC-0003-0023`, `AC-0003-0024`, `BR-0003-0020`, `TC-0003-0026` | An open migration window: a warning on stdout, exit 0                                        | `tests/cli/init.test.ts`, "TC-0003-0026 (TDD-0026): qfai init retains legacy steering/ and reports it as an error": at tool version 1.10.0 stderr carries `D-DEPRECATED-PATH` and `past the announced sunset (v1.10.0)`, names `qfai init --upgrade-assistant-tree`, and no longer says `read-compatible`. `init.ts#emitLegacyAssistantSteeringSunset` writes it through `error()`, which writes stderr; the legacy file is kept |
| `NFR-C0016`, `AC-0003-0030`, `BR-0003-0031`, `TC-0003-0037`                    | Two installing job declarations, four and three instances                                    | `tests/integration/shippedWorkflowInertness.test.ts`, TC-0003-0037's first case: the installing jobs are exactly `qfai-docs.yml#checks`, `qfai-tests.yml#tests` and `qfai-validate.yml#validate`, expanding to 9 on a pull request and 8 on a push, the test lane counted at its bound of five layer legs                                                                                                                        |
| `BR-0003-0040`, `TC-0003-0046`                                                 | The provenance record is kept out of the managed block                                       | `tests/integration/shippedWorkflowOwnership.test.ts`, "the provenance record path is not in the managed gitignore block": the block contains `!.qfai/install-provenance.json` and no line that ignores the record. `gitignore.ts` explains why: `!.qfai/` re-includes only the directory                                                                                                                                         |
| `BR-0003-0032`, `TC-0003-0038`                                                 | Full history is requested by the detection job only                                          | `tests/integration/shippedWorkflowDetection.test.ts`, "the full-history request appears on the detection job only": `fetch-depth: 0` is sanctioned on `qfai-tests.yml#detection` and `qfai-docs.yml#scope`, and the pull-request-only depth on `qfai-validate.yml#validate` for the drift profile                                                                                                                                |
| `AC-0003-0035`, `BR-0003-0043`, `TC-0003-0049`                                 | Nine shape dimensions                                                                        | `.qfai/contracts/cli/shipped-workflows.md` §5 lists ten; the tenth is each aggregate's external check name. `tests/integration/shippedWorkflowShapeGate.test.ts` holds `CONTRACT_DIMENSION_IDS` as 1 to 10 and asserts "the declared shape pins all ten contract dimensions"                                                                                                                                                     |
| `REQ-0028`                                                                     | One runner variable, a second tier deferred until a second job class exists                  | `tests/integration/shippedWorkflowRunners.test.ts` holds `QFAI_CI_RUNNER` and `QFAI_CI_LIGHT_RUNNER` as the two sanctioned selectors. Every `runs-on` in the shipped set is one of those two, and the jobs that install nothing and run no test read the light variable first                                                                                                                                                    |
| `US-0003-0006`                                                                 | `README.md` stays a regular file                                                             | `initE2E.test.ts`, "writes no README into any agent directory": `.agents/`, `.codex/`, `.claude/agents/` and `.github/agents/` carry none                                                                                                                                                                                                                                                                                        |

Every claim in the issue held. None was found wrong and left alone.

One clause beyond the issue's claim was corrected inside a statement this record
restates: `BR-0003-0016` said `.gitkeep` alone may be overwritten. In
`init.ts#seedProjectSteering` both seed files are skipped when present, and not
even `--force` rewrites them.

### Statements with the same defect that this record does not restate

This record restates only the statements the issue named. These carry the same
contradictions and are left as they are. They need a follow-up Change Request:

| Statement                                                           | What it still says                                                                   |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `TC-0003-0001` verify bullet 1, `EX-0003-0001`                      | `specs/`, `contracts/` and the other artifact directories exist after init           |
| `REQ-0016`                                                          | The block carries `.qfai/discussion/discussion-*/` and README negations              |
| `EX-0003-0019`                                                      | `.qfai/steering/README.md` is seeded                                                 |
| `REQ-0023`, `EX-0003-0023`                                          | The legacy layout is readable for one window, and the finding is a warning on stdout |
| `EX-0003-0034`                                                      | Two installing declarations, four and three instances                                |
| `EX-0003-0043`                                                      | The provenance record is not in `QFAI_GITIGNORE_BLOCK`                               |
| `REQ-0027`, `AC-0003-0031`, `EX-0003-0035`                          | Full history is requested by the detection job only                                  |
| `REQ-0031`, `EX-0003-0046`, the `CLI-WFSET` §5 line of `01_Spec.md` | Nine dimensions                                                                      |
| `US-0003-0025` Non-goals                                            | A second runner tier waits for a second job class                                    |
| `EX-0003-0006`                                                      | `README.md` stays a regular file                                                     |

The test names of `TDD-0037` still read "two installing job declarations, four
and three executing instances", while the case asserts nine and eight. The
ledger's `Selector` cell holds that name, and this record changes no test.

## Options (at least 3) and recommendation

| #   | Option                                                                                                                                                    | Cost                                                                   | Risk                                                                                                                                                                                  | Recommended |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Restate each named statement to what the product does and the tests assert. No test or product change                                                     | Twenty-nine statements in six files                                    | None found: every restated statement is already asserted by a `done` row or by the story's end-to-end case. The same defect stays in the statements listed above                      | ✅          |
| 2   | Revert the product to the statements: scaffold the six directories, restore the old block, seed the README, reopen the window, drop the test-lane install | Five product changes and their tests, each undoing a deliberate change | Reintroduces what each change removed: untracked scaffold, README duplicates the schema, a legacy layout the readers no longer accept, a test lane without the adopter's dependencies |             |
| 3   | Retire the contradicted statements instead of restating them                                                                                              | Deletions across six files and the ledger rows that cite them          | Behaviour the tests assert loses its obligation, so a later regression reddens a test no spec row asks for                                                                            |             |

## Proposed change

Option 1. Each statement named in `## Context` is restated to what the product
does and the tests assert. Ids stay as they are; a count changes only where the
statement names one.

## Blocked downstream items

No ledger row is blocked, and none is reset.

- Not blocked by this CR: `spec-0003/TDD-0018`, `TDD-0022`, `TDD-0026`,
  `TDD-0037`, `TDD-0038`, `TDD-0046` and `TDD-0049`. Each is `done`, its test is
  unchanged, and that test already asserts the restated statement. The reset
  exists to drive a test against an obligation it has not yet met, and here the
  obligation moved to what the test already proves. The skill's upstream-reset
  rule would return these rows to `todo`; that position is recorded here and not
  taken, because a reset would re-run a cycle whose RED cannot exist.
- Not blocked by this CR: the story rows `spec-0003/TDD-0068` (`US-0003-0020`),
  `TDD-0069` (`US-0003-0001`), `TDD-0074` (`US-0003-0006`) and `TDD-0083`
  (`US-0003-0015`). They are already `todo`, and whoever takes them now reads
  the restated story.
- Overlapping open CRs: `none`

## Impact scope

- Specs: `spec-0003`
- Plans: `none`
- Tests: `none`
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR:
  `.qfai/specs/spec-0003/01_Spec.md`,
  `.qfai/specs/spec-0003/02_User-stories.md`,
  `.qfai/specs/spec-0003/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0003/04_Business-Rules.md`,
  `.qfai/specs/spec-0003/05_Examples.md`,
  `.qfai/specs/spec-0003/06_Test-Cases.md`,
  `.qfai/specs/spec-0003/09_delta.md`,
  `.qfai/evidence/coverage-depth-spec-0003.md`

## Decision needed from user

Approve option 1: restate the named `spec-0003` statements to what the product
does and the tests assert, with no test, product or ledger change?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0003`, mode `re-derive`, restating the statements in
   `## Context` and recording this Change Request in `spec-0003/09_delta.md`'s
   `## Change Requests` table.
2. Downstream ledger sweep: none. No row is reset or retired, for the reason in
   `## Blocked downstream items`.

## Resolution

Applied under option 1 by `/qfai-sdd spec-0003`, mode `re-derive`.

- `01_Spec.md`: `NFR-C0016`, `REQ-0019` and `REQ-0028`.
- `02_User-stories.md`: `US-0003-0001`, `US-0003-0006`, `US-0003-0015` and
  `US-0003-0020`, with the catalog lines of the last two.
- `03_Acceptance-Criteria.md`: `AC-0003-0001`, `AC-0003-0015`, `AC-0003-0018`,
  `AC-0003-0023`, `AC-0003-0024`, `AC-0003-0030` and `AC-0003-0035`, with the
  catalog titles of `AC-0003-0023` and `AC-0003-0024`.
- `04_Business-Rules.md`: `BR-0003-0013`, `BR-0003-0016`, `BR-0003-0020`,
  `BR-0003-0031`, `BR-0003-0032`, `BR-0003-0040` and `BR-0003-0043`.
- `05_Examples.md`: `EX-0003-0016`.
- `06_Test-Cases.md`: `TC-0003-0018`, `TC-0003-0022`, `TC-0003-0026`,
  `TC-0003-0037`, `TC-0003-0038`, `TC-0003-0046` and `TC-0003-0049`, with the
  titles of `TC-0003-0026` and `TC-0003-0037`.
- `.qfai/evidence/coverage-depth-spec-0003.md`: Finding 2 says what was
  restated. The matrix is not rescored.
- `spec-0003/09_delta.md` records this request.
- Ledger rows reset: none. Ledger rows retired: none.
