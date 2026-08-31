# 16 Traceability Ledger

## Purpose

Link each `BR-*` / `AC-*` in this spec to the implementation file that realizes it and the test
file that proves it. `npx qfai validate` reads the **first** Markdown table below to enforce
implementation integrity: when this spec's `03_Acceptance-Criteria.md` or
`04_Business-Rules.md` changes on a branch, every implementation file linked from that table must
also have changed on the same branch, or `QFAI-TRACE-001` fires at severity `error`.

This artifact is optional in general, and `spec-0017` carries it from creation on purpose.
`16_Traceability-ledger.md` is adopted in only three of sixteen existing specs, so
`QFAI-TRACE-001` is skipped for the other thirteen — which is how three spec-claimed
implementation paths in other packs survived unnoticed (`OQ-0025`). Of the three adopters only
one is genuinely live; the other two present a first table whose rows the validator skips or
whose header shape it rejects. The table below uses the header the validator requires, so the
check is active rather than warned-past.

Rows are **promoted, not predicted** (DR-0017-0006). Only bindings whose implementation artifact
exists today live in the first table. Everything else lives in
`### Planned bindings (not read by the validator)`, whose first column is a path rather than an
ID, and a binding moves up in the same change that creates its file.

## Ledger Table (required when this file exists)

| BR/AC        | Implementation File                   | Test File                                             | Notes                                                                                                                                                              |
| ------------ | ------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-0017-0011 | .qfai/specs/spec-0017/07_Decisions.md | packages/qfai/tests/assets/actionPinBumpOwner.test.ts | The criterion's satisfying artifact **is** a durable repository record, and DR-0017-0003 is it. No bump configuration may be created without user approval (OC-3). |
| BR-0017-0005 | .qfai/specs/spec-0017/07_Decisions.md | packages/qfai/tests/assets/actionPinBumpOwner.test.ts | Sequencing rule. Its only durable realization is DR-0017-0005, which is what a reviewer cites to reject an inverted merge order.                                   |
| BR-0017-0022 | .qfai/specs/spec-0017/07_Decisions.md | packages/qfai/tests/assets/actionPinBumpOwner.test.ts | DR-0017-0003 names the owner and binds the obligation to release preparation. A pull-request description is explicitly not an acceptable home.                     |
| BR-0017-0023 | .qfai/specs/spec-0017/07_Decisions.md | packages/qfai/tests/assets/actionPinBumpOwner.test.ts | The prohibition's realization is the absence of a root configuration plus the recorded reason. DR-0017-0003 carries the reason.                                    |
| BR-0017-0045 | .qfai/specs/spec-0017/07_Decisions.md | packages/qfai/tests/assets/actionPinBumpOwner.test.ts | Sequencing rule, DR-0017-0005 edge 5. Crosses into `spec-0003`, so the record is the only place the edge is stated on this side.                                   |
| BR-0017-0061 | .qfai/specs/spec-0017/07_Decisions.md | packages/qfai/tests/assets/actionPinBumpOwner.test.ts | Sequencing rule, DR-0017-0005 edge 4. The recorded justification is the lost manual cross-check, not an absent mirror.                                             |

Six live rows, one implementation file. The coupling is deliberate and its cost is stated rather
than discovered: every one of these six obligations is a governance rule whose only durable
artifact is the decision record, so a change to the rule set that leaves `07_Decisions.md`
untouched is a change that should be revisited — which is exactly what `QFAI-TRACE-001` will say.
The test file is named once because one test asserts all six properties of that record; the
test-design agent owns its `TC-*` binding and may split it.

### Column rules

- `BR/AC` — a single `BR-0017-NNNN` or `AC-0017-NNNN` ID defined in this spec.
- `Implementation File` — one repository-root-relative path, no globs, no `./` prefix and **no
  backticks**. The cell is compared verbatim against `git diff --name-only`, so a decorated path
  never matches and silently disables the row.
- `Test File` — not machine-checked here; `TC`-level coverage is enforced from
  `06_Test-Cases.md` and `tdd/test-list.md`.
- One row per `BR`/`AC` ↔ implementation-file pair. A row naming several files in one cell does
  not match.

### Planned bindings (not read by the validator)

The first column is an implementation path, never an ID, so no row here can be mistaken for a
ledger row by any reader — machine or human. `State today` was checked against the tree; the
same paths and the same states appear in `10_Plan.md`, and the two files must not disagree.

| Implementation File                                                         | State today   | BR / AC it will realize                                                                                                                                                                                                                                                                                                                                 | Test File (planned)                                         | Promotion trigger                                                                        |
| --------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`                                                  | present       | BR-0017-0001, BR-0017-0002, BR-0017-0003, BR-0017-0004 (verdict); BR-0017-0006 … BR-0017-0013 (detection and selection); BR-0017-0015, BR-0017-0016, BR-0017-0018, BR-0017-0019, BR-0017-0020, BR-0017-0021, BR-0017-0025, BR-0017-0027; BR-0017-0029, BR-0017-0032, BR-0017-0033, BR-0017-0034, BR-0017-0035; BR-0017-0057, BR-0017-0059, BR-0017-0060 | `packages/qfai/tests/scripts/ownWorkflowTopology.test.ts`   | The first change that edits the file for one of these rules                              |
| `.github/workflows/release.yml`                                             | present       | BR-0017-0015, BR-0017-0016, BR-0017-0018, BR-0017-0019, BR-0017-0020                                                                                                                                                                                                                                                                                    | `packages/qfai/tests/scripts/workflowHygiene.test.ts`       | The own-tree hardening change                                                            |
| `.github/workflows/qfai-validate.yml`                                       | present       | BR-0017-0058 (by deletion)                                                                                                                                                                                                                                                                                                                              | `packages/qfai/tests/scripts/ownWorkflowTopology.test.ts`   | The retirement change. The row is promoted as a deletion, which the diff still names     |
| `.github/actions/setup/action.yml`                                          | to be created | BR-0017-0024, BR-0017-0026, BR-0017-0028                                                                                                                                                                                                                                                                                                                | `packages/qfai/tests/scripts/ownWorkflowTopology.test.ts`   | The change that creates the composite action                                             |
| `.github/required-status-contexts.json`                                     | to be created | BR-0017-0042                                                                                                                                                                                                                                                                                                                                            | `packages/qfai/tests/scripts/workflowHygiene.test.ts`       | The change that creates the declaration                                                  |
| `scripts/check-workflow-hygiene.mjs`                                        | to be created | BR-0017-0014, BR-0017-0017, BR-0017-0037, BR-0017-0038, BR-0017-0039, BR-0017-0040, BR-0017-0043, BR-0017-0044, BR-0017-0046                                                                                                                                                                                                                            | `packages/qfai/tests/scripts/workflowHygiene.test.ts`       | The change that creates the script                                                       |
| `package.json`                                                              | present       | BR-0017-0041                                                                                                                                                                                                                                                                                                                                            | `packages/qfai/tests/scripts/workflowHygiene.test.ts`       | The `ci:lint` registration change                                                        |
| `packages/qfai/package.json`                                                | present       | BR-0017-0056, BR-0017-0057                                                                                                                                                                                                                                                                                                                              | `packages/qfai/tests/scripts/sliceSurfaceAlignment.test.ts` | The slice-alignment change                                                               |
| `packages/qfai/vitest.workspace.ts`                                         | present       | BR-0017-0047, BR-0017-0048, BR-0017-0052, BR-0017-0055, BR-0017-0057                                                                                                                                                                                                                                                                                    | `packages/qfai/tests/scripts/vitestWorkspaceKnobs.test.ts`  | The parallelism-structure change                                                         |
| `packages/qfai/assets/init/.qfai/assistant/catalog/test-layers-ci-lanes.md` | to be created | BR-0017-0036, BR-0017-0062, BR-0017-0063, BR-0017-0064, BR-0017-0065, BR-0017-0066                                                                                                                                                                                                                                                                      | `packages/qfai/tests/assets/layerCiLaneMapping.test.ts`     | The change that authors the mapping document                                             |
| `packages/qfai/assets/init/.qfai/assistant/catalog/test-layers.md`          | present       | BR-0017-0062 (the cross-link half), BR-0017-0065                                                                                                                                                                                                                                                                                                        | `packages/qfai/tests/assets/layerCiLaneMapping.test.ts`     | The same change, since the cross-link is bidirectional                                   |
| `.qfai/specs/spec-0017/07_Decisions.md`                                     | present       | BR-0017-0030, BR-0017-0031, BR-0017-0049, BR-0017-0050, BR-0017-0051, BR-0017-0053, BR-0017-0054                                                                                                                                                                                                                                                        | `packages/qfai/tests/assets/actionPinBumpOwner.test.ts`     | The first change that records a captured measurement, since the numbers are the artifact |

`.qfai/evidence/**` is intentionally absent from both tables. It is version-control-ignored
(OC-7), so a linked path there could never appear in a diff and would make `QFAI-TRACE-001`
permanently red. That is exactly why BR-0017-0030 requires the numbers to be quoted in
`07_Decisions.md` as well, and why the decision record is the row's implementation file.

## Authoring and maintenance

- Authored and refreshed by `/qfai-sdd` alongside `03_Acceptance-Criteria.md` and
  `04_Business-Rules.md`. It is upstream SSOT — downstream skills must not edit it directly.
- Whenever a `BR`/`AC` is added, removed or renumbered, update this ledger in the same change.
- When a linked implementation file is renamed or moved, update the path here in the same commit,
  or `QFAI-TRACE-001` reports the old path as unmodified.
- When a planned binding's file is created, move its row into the first table **in that same
  change**, one row per `BR`/`AC` ↔ file pair. Promoting early makes every later
  acceptance-criteria edit red; promoting late leaves the file unguarded.

## Not the same as the spec-pack ledger

Legacy 18-file spec-pack layouts also carry a `16_Traceability-ledger.md`, with a different
schema checked by `QFAI-LEDGER-001`. That check runs only on `spec-pack` layouts. `spec-0017` is
a layered spec, so the file above is read only by the implementation-integrity check. Do not
merge the two schemas into one table.
