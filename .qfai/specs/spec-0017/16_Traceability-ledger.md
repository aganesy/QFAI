# 16 Traceability Ledger

## Purpose

Link each `BR-*` / `AC-*` in this spec to the implementation file that realizes it and the test
file that proves it. `npx qfai validate` checks each changed obligation against the active
first-table bindings. An unchanged implementation needs explicit passing test proof. The planned
table records obligations whose bindings have not yet been promoted.

This artifact is optional in general, and `spec-0017` carries it from creation on purpose.
`16_Traceability-ledger.md` is adopted in only three of sixteen existing specs, so
`QFAI-TRACE-001` is skipped for the other thirteen — which is how three spec-claimed
implementation paths in other packs survived unnoticed (`OQ-0025`). Of the three adopters only
one is genuinely live; the other two present a first table whose rows the validator skips or
whose header shape it rejects. The table below uses the header the validator requires, so the
check is active rather than warned-past.

Rows are **promoted, not predicted** (DR-0017-0006). Active bindings live in the first table.
The planned table names unpromoted obligations with a path and current state. The validator reads
its ID, path and state, but requires implementation diffs or proof only for active bindings.
A binding moves up when its implementation obligation is realized.

## Ledger Table (required when this file exists)

| BR/AC        | Implementation File                   | Test File                                                          | Notes                                                               | Proof    |
| ------------ | ------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- | -------- |
| AC-0017-0003 | .github/workflows/ci.yml              | packages/qfai/tests/integration/spec0017CiMatrix.test.ts           | Documentation-only selection and skipped matrix jobs.               | -        |
| AC-0017-0003 | .github/required-status-contexts.json | packages/qfai/tests/scripts/workflowHygieneRequiredContext.test.ts | Pinned unconditional dependencies and their reasons.                | -        |
| AC-0017-0011 | .qfai/specs/spec-0017/07_Decisions.md | packages/qfai/tests/assets/actionPinBumpOwner.test.ts              | The criterion is realized by the durable decision record.           | -        |
| AC-0017-0027 | .github/workflows/ci.yml              | packages/qfai/tests/integration/spec0017SliceAlignment.test.ts     | Both CI slice matrices use the current set.                         | -        |
| AC-0017-0027 | .github/workflows/release.yml         | packages/qfai/tests/integration/spec0017SliceAlignment.test.ts     | Both release matrices and verify use the current set.               | -        |
| AC-0017-0027 | packages/qfai/package.json            | packages/qfai/tests/integration/spec0017SliceAlignment.test.ts     | Per-slice scripts use the current set.                              | -        |
| AC-0017-0027 | packages/qfai/vitest.workspace.ts     | packages/qfai/tests/integration/spec0017SliceAlignment.test.ts     | Runner projects use the current set.                                | -        |
| AC-0017-0036 | .github/workflows/release.yml         | packages/qfai/tests/integration/spec0017ReleaseOperations.test.ts  | Operation capability, isolation and fallback.                       | -        |
| AC-0017-0036 | package.json                          | packages/qfai/tests/integration/spec0017ReleaseOperations.test.ts  | The unchanged local aggregate preserves the ordered command vector. | TDD-0107 |
| BR-0017-0005 | .qfai/specs/spec-0017/07_Decisions.md | packages/qfai/tests/assets/actionPinBumpOwner.test.ts              | Sequencing rule in the decision record.                             | -        |
| BR-0017-0006 | .github/workflows/ci.yml              | packages/qfai/tests/integration/spec0017CiMatrix.test.ts           | Retained matrix legs skip when detection excludes them.             | -        |
| BR-0017-0006 | .github/required-status-contexts.json | packages/qfai/tests/scripts/workflowHygieneRequiredContext.test.ts | Current check names stay pinned when a suite retires.               | -        |
| BR-0017-0022 | .qfai/specs/spec-0017/07_Decisions.md | packages/qfai/tests/assets/actionPinBumpOwner.test.ts              | Release preparation owns the pin update.                            | -        |
| BR-0017-0023 | .qfai/specs/spec-0017/07_Decisions.md | packages/qfai/tests/assets/actionPinBumpOwner.test.ts              | The decision record explains why no root configuration exists.      | -        |
| BR-0017-0045 | .qfai/specs/spec-0017/07_Decisions.md | packages/qfai/tests/assets/actionPinBumpOwner.test.ts              | Sequencing rule across specs.                                       | -        |
| BR-0017-0056 | .github/workflows/ci.yml              | packages/qfai/tests/integration/spec0017SliceAlignment.test.ts     | CI matrix legs use per-slice scripts.                               | -        |
| BR-0017-0056 | .github/workflows/release.yml         | packages/qfai/tests/integration/spec0017SliceAlignment.test.ts     | Release matrix legs use per-slice scripts.                          | -        |
| BR-0017-0056 | packages/qfai/package.json            | packages/qfai/tests/integration/spec0017SliceAlignment.test.ts     | Current and retired per-slice scripts.                              | -        |
| BR-0017-0057 | .github/workflows/ci.yml              | packages/qfai/tests/integration/spec0017SliceAlignment.test.ts     | Both CI slice sets agree.                                           | -        |
| BR-0017-0057 | .github/workflows/release.yml         | packages/qfai/tests/integration/spec0017SliceAlignment.test.ts     | Both release slice sets and verify agree.                           | -        |
| BR-0017-0057 | packages/qfai/package.json            | packages/qfai/tests/integration/spec0017SliceAlignment.test.ts     | Per-slice script set agrees.                                        | -        |
| BR-0017-0057 | packages/qfai/vitest.workspace.ts     | packages/qfai/tests/integration/spec0017SliceAlignment.test.ts     | Runner project set agrees.                                          | -        |
| BR-0017-0061 | .qfai/specs/spec-0017/07_Decisions.md | packages/qfai/tests/assets/actionPinBumpOwner.test.ts              | Sequencing rule in the decision record.                             | -        |
| BR-0017-0068 | .github/workflows/release.yml         | packages/qfai/tests/scripts/ownWorkflowTopology.test.ts            | Only selected successful gates permit upload.                       | -        |
| BR-0017-0069 | .github/workflows/release.yml         | packages/qfai/tests/integration/spec0017ReleaseOperations.test.ts  | Release capability, fallback and workspace isolation.               | -        |
| BR-0017-0070 | package.json                          | packages/qfai/tests/integration/spec0017ReleaseOperations.test.ts  | The existing local command vector satisfies the separate rule.      | TDD-0107 |

Six governance obligations bind to the decision record. A changed rule with an unchanged
decision record needs explicit proof of the existing binding. The release prerequisite rule
binds to `release.yml`, whose conditions the topology tests evaluate directly.

### Column rules

- `BR/AC` — a single `BR-0017-NNNN` or `AC-0017-NNNN` ID defined in this spec.
- `Implementation File` — one repository-root-relative path, no globs, no `./` prefix and **no
  backticks**. The validator resolves the exact path. A decorated or unavailable path rejects the
  binding.
- `Test File` — the test that checks this implementation binding.
- `Proof` — `-` for an implementation changed with its obligation, or the passing TDD row that
  proves an unchanged implementation still satisfies the changed obligation.
- One row per `BR`/`AC` ↔ implementation-file pair. A row naming several files in one cell does
  not match.

### Planned bindings

The first column is an implementation path, never an ID, so no row here is an active
implementation binding. The validator still checks the listed IDs, paths and states.
`State today` was checked against the tree; paths shared with `10_Plan.md` have the same state
in both files. An ID/path pair appears in only one table.

| Implementation File                                                         | State today | BR / AC it will realize                                                                                                                                                                                                                                                                                                                   | Test File (planned)                                                                                                | Promotion trigger                                                                        |
| --------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`                                                  | present     | BR-0017-0001, BR-0017-0002, BR-0017-0003, BR-0017-0004 (verdict); BR-0017-0007 … BR-0017-0013 (detection and selection); BR-0017-0015, BR-0017-0016, BR-0017-0018, BR-0017-0019, BR-0017-0020, BR-0017-0021, BR-0017-0025, BR-0017-0027; BR-0017-0029, BR-0017-0032, BR-0017-0033, BR-0017-0034, BR-0017-0035; BR-0017-0059, BR-0017-0060 | `packages/qfai/tests/scripts/ownWorkflowTopology.test.ts`                                                          | The first change that edits the file for one of these rules                              |
| `.github/workflows/release.yml`                                             | present     | BR-0017-0015, BR-0017-0016, BR-0017-0018, BR-0017-0019, BR-0017-0020                                                                                                                                                                                                                                                                      | `packages/qfai/tests/scripts/workflowHygiene.test.ts`, `packages/qfai/tests/scripts/sliceSurfaceAlignment.test.ts` | Workflow hygiene and slice-alignment changes                                             |
| `.github/workflows/qfai-validate.yml`                                       | absent      | BR-0017-0058 (by deletion)                                                                                                                                                                                                                                                                                                                | `packages/qfai/tests/scripts/ownWorkflowTopology.test.ts`                                                          | The retirement change. The row is promoted as a deletion, which the diff still names     |
| `.github/actions/setup/action.yml`                                          | present     | BR-0017-0024, BR-0017-0026, BR-0017-0028                                                                                                                                                                                                                                                                                                  | `packages/qfai/tests/scripts/ownWorkflowTopology.test.ts`                                                          | The change that creates the composite action                                             |
| `.github/required-status-contexts.json`                                     | present     | BR-0017-0042                                                                                                                                                                                                                                                                                                                              | `packages/qfai/tests/scripts/workflowHygiene.test.ts`                                                              | The change that creates the declaration                                                  |
| `scripts/check-workflow-hygiene.mjs`                                        | present     | BR-0017-0014, BR-0017-0017, BR-0017-0037, BR-0017-0038, BR-0017-0039, BR-0017-0040, BR-0017-0043, BR-0017-0044, BR-0017-0046                                                                                                                                                                                                              | `packages/qfai/tests/scripts/workflowHygiene.test.ts`                                                              | The change that creates the script                                                       |
| `package.json`                                                              | present     | BR-0017-0041                                                                                                                                                                                                                                                                                                                              | `packages/qfai/tests/scripts/workflowHygiene.test.ts`                                                              | The `ci:lint` registration change                                                        |
| `packages/qfai/vitest.workspace.ts`                                         | present     | BR-0017-0047, BR-0017-0048, BR-0017-0052, BR-0017-0055                                                                                                                                                                                                                                                                                    | `packages/qfai/tests/scripts/vitestWorkspaceKnobs.test.ts`                                                         | The parallelism-structure change                                                         |
| `packages/qfai/assets/init/.qfai/assistant/catalog/test-layers-ci-lanes.md` | present     | BR-0017-0036, BR-0017-0062, BR-0017-0063, BR-0017-0064, BR-0017-0065, BR-0017-0066                                                                                                                                                                                                                                                        | `packages/qfai/tests/assets/layerCiLaneMapping.test.ts`                                                            | The change that authors the mapping document                                             |
| `packages/qfai/assets/init/.qfai/assistant/catalog/test-layers.md`          | present     | BR-0017-0062 (the cross-link half), BR-0017-0065                                                                                                                                                                                                                                                                                          | `packages/qfai/tests/assets/layerCiLaneMapping.test.ts`                                                            | The same change, since the cross-link is bidirectional                                   |
| `.qfai/specs/spec-0017/07_Decisions.md`                                     | present     | BR-0017-0030, BR-0017-0031, BR-0017-0049, BR-0017-0050, BR-0017-0051, BR-0017-0053, BR-0017-0054                                                                                                                                                                                                                                          | `packages/qfai/tests/assets/actionPinBumpOwner.test.ts`                                                            | The first change that records a captured measurement, since the numbers are the artifact |

`.qfai/evidence/**` is intentionally absent from both tables. It is version-control-ignored
(OC-7), so it cannot serve as a tracked implementation binding. That is why
BR-0017-0030 requires the numbers in `07_Decisions.md` as well; the decision record is the
tracked implementation file.

## Authoring and maintenance

- Authored and refreshed by `/qfai-sdd` alongside `03_Acceptance-Criteria.md` and
  `04_Business-Rules.md`. It is upstream SSOT — downstream skills must not edit it directly.
- Whenever a `BR`/`AC` is added, removed or renumbered, update this ledger in the same change.
- When a linked implementation file is renamed or moved, update the path here in the same commit,
  or the binding is invalid.
- When a planned obligation is realized, move its ID/path pair into the first table **in that same
  change**, one row per `BR`/`AC` ↔ file pair. Do not leave the same pair active and planned.

## Not the same as the spec-pack ledger

Legacy 18-file spec-pack layouts also carry a `16_Traceability-ledger.md`, with a different
schema checked by `QFAI-LEDGER-001`. That check runs only on `spec-pack` layouts. `spec-0017` is
a layered spec, so the file above is read only by the implementation-integrity check. Do not
merge the two schemas into one table.
