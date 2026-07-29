# Test Layers Policy

This document is the SSOT for ATDD test-layer semantics and completion gates.

## Layer vocabulary crosswalk (normative)

qfai spells the same layer four ways across shipped artifacts. This table is
the crosswalk; every artifact MUST use the spelling in its column.

| Code | Word        | Tag                 | Test directory              | `06_Test-Cases.md#Level` | `tdd/test-list.md#Layer` |
| ---- | ----------- | ------------------- | --------------------------- | ------------------------ | ------------------------ |
| L1   | Unit        | `layer-unit`        | project convention          | `L1`                     | `Unit`                   |
| L2   | Component   | `layer-component`   | project convention          | `L2`                     | `Component`              |
| L3   | Integration | `layer-integration` | `<testsDir>/integration/**` | `L3`                     | `Integration`            |
| L4   | API         | `layer-api`         | `<testsDir>/api/**`         | —                        | `API`                    |
| L5   | E2E         | `layer-e2e`         | `<testsDir>/e2e/**`         | —                        | `E2E`                    |

Rules:

- **One value per cell.** A `Level` cell and a `Layer` cell each hold exactly
  one layer. An obligation spanning two layers is two rows, not one row with
  two values.
- `06_Test-Cases.md` uses the **code** (`L1`…`L3`) in its `Level` column.
- `tdd/test-list.md` uses the **word** in its `Layer` column.
- Test-strategy tags in prompts and policy files use the **tag** form.
- **`<testsDir>` is `paths.testsDir` from `qfai.config.yaml`**, whose default
  is `tests` — hence the shipped `tests/integration/**`, `tests/api/**` and
  `tests/e2e/**`. A project that repoints `paths.testsDir` moves all three at
  once; the ATDD traceability scan follows the configured value, so never
  hard-code the literal `tests/` prefix in a project's own artifacts.
- L1 and L2 have no mandated directory: unit and component tests live wherever
  the project's own convention puts them. Only L3-L5 are directory-pinned, and
  only those directories are scanned by the ATDD traceability rules.
- **A `TC-*` row's `Level` is L1-L3.** The ATDD annotation hard gate routes an
  obligation by its ID, not by its `Level`: `US-*` is answered from
  `<testsDir>/e2e/**` (`QFAI-ATDD-111`), `TC-*` from
  `<testsDir>/integration/**` (`QFAI-ATDD-112`) and `CON-API-*` from
  `<testsDir>/api/**` (`QFAI-ATDD-113`), while a `TC-*` reference inside
  `<testsDir>/api/**` or `<testsDir>/e2e/**` is rejected outright
  (`QFAI-ATDD-121` / `QFAI-ATDD-122`). L4's goal is `CON-API-*` and L5's is
  `US-*` (see the layer definitions below), so an oracle that lands at L4 or L5
  means the obligation is misfiled: record it as `CON-API-*` or `US-*` rather
  than as a `TC-*` row no test directory can carry.
- The two code-side word lists (`tddHelpers.ts#UNIT_COMPONENT_LAYERS` /
  `#NON_COVERAGE_LAYERS`) accept both the code and the word form for the same
  layer; they MUST stay in step with this table.

## Layer definitions

### L3 Integration

- Scope: real infrastructure integration (for example DB/queue/filesystem) within service boundaries.
- Goal: verify `TC-*` obligations from specs.
- Location rule: `tests/integration/**`.

### L4 API

- Scope: service-boundary contracts (HTTP/gRPC/etc), auth, and error contracts.
- Goal: verify `CON-API-*` obligations from contracts.
- Location rule: `tests/api/**`.

### L5 E2E

- Scope: representative full-system journeys across UI/API/data.
- Goal: verify `US-*` obligations from specs.
- Location rule: `tests/e2e/**`.

## TestKind resolution (single source)

- `tests/e2e/**` -> E2E
- `tests/api/**` -> API
- `tests/integration/**` -> Integration

## Annotation schema (code-side)

- Smallest trace unit is ID.
- Multiple IDs per test file are allowed.
- AC annotations are optional (indirect coverage through TC is acceptable).
- Allowed forms:
  - `QFAI:SPEC-0001:US-0001`
  - `QFAI:SPEC-0001:TC-0001`
  - `QFAI:CON-API-0001`

## ATDD annotation hard gate

- E2E obligations:
  - Every `US-*` in specs must be referenced at least once from `tests/e2e/**` (no exception).
  - Use `QFAI:SPEC-XXXX:US-YYYY` annotations.
- Integration obligations:
  - Every `TC-*` in specs must be referenced at least once from `tests/integration/**`.
  - Use `QFAI:SPEC-XXXX:TC-YYYY` annotations.
- API obligations:
  - Every declared `CON-API-*` must be referenced at least once from `tests/api/**`.
  - Use `QFAI:CON-API-XXXX` annotations.
- Forbidden references:
  - `tests/api/**` must not include `QFAI:SPEC-XXXX:TC-YYYY`.
  - `tests/e2e/**` must not include `QFAI:SPEC-XXXX:TC-YYYY`.
- Unknown references (`US/TC/CON-API` not declared) are errors.
- AC annotations are not required in code; AC coverage is treated as indirect through TC coverage.
- `QFAI:CON-API-*` in `tests/e2e/**` is not forbidden, but contract guarantee belongs to API tests.

## Volume policy

- Floors and ratios are signals, not completion gates.
- Completion gate is validation pass with no errors:
  - `qfai validate --fail-on error`

If a volume signal is unmet:

1. STOP auto-adjustment.
2. Raise a Change Request with 3 options and recommendation.
3. Wait for explicit user approval.
4. Update upstream artifacts via owner-phase rerun when required.

## Anti-patterns

- Do not treat `scenario.feature` or a coverage ledger as mandatory completion input.
- Do not convert all obligations into E2E.
- Do not inflate tests only to satisfy floor numbers.
