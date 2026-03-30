# 10 Plan

- Spec: spec-0037
- Parent: CAP-0037

## Implementation Sequence

### Step 0 (P0, cross-cutting): Non-UI safety — surface type guards + fixture tests

- Add surface type guard to every new validator introduced across all specs.
- Implement the guard pattern: check `isUiBearing(pack)` at validator entry; return `{ status: 'n/a' }` for non-UI.
- Write 3 fixture tests per new validator: pass, fail, non-UI.
- This step must be done alongside all other specs' validator work; it is not sequential but concurrent.

### Step 1 (P1): Reviewer template extension — uix-rev assets

- Add 5 new review template items to uix-rev assets:
  1. taste-reflection-quality
  2. anti-preference-enforcement
  3. trend-relevance-freshness
  4. dynamic-axis-specificity
  5. generic-fallback-persistence
- Each item includes evaluation criteria and scoring guidance.

### Step 2 (P1): Migration validator upgrade — UIX-VAL-MIGRATION-*

- Define 3 migration version signatures: old no-sidecar, v1.7.6-v1.7.7 intermediate, v1.7.8 final.
- Upgrade UIX-VAL-MIGRATION-* validators to detect each version and provide upgrade guidance.
- Set severity to "warning" in v1.7.8 (error deferred to v1.8.0+).
- Include stale-asset detection: missing 3-layer axes or missing uiux/ sidecar on UI-bearing packs.

### Step 3 (P2): Docs/state normalization — vocabulary scan + convergence doc

- Implement vocabulary scan for feature maturity terms across README.md, CHANGELOG.md, steering docs, source comments.
- Enforce 4-term vocabulary: complete / foundation-only / preview / correction target.
- Implement contradiction detection: same subsystem with different maturity terms across docs.
- Create master convergence document as new steering doc (per OQ-0008/AD-008).
- Reference convergence doc from product/manifest/spec index.

## Execution Order

1. Non-UI safety guards first (cross-cutting, P0) — concurrent with all other work
2. Reviewer templates (P1)
3. Migration validators (P1)
4. Docs normalization (P2)

## File Targets

- `packages/qfai/assets/uix-rev/*` — reviewer template items
- `packages/qfai/src/validators/*` — migration validators, surface type guards
- `packages/qfai/tests/` — fixture tests (pass/fail/non-UI per validator)
- `README.md` — vocabulary alignment
- `CHANGELOG.md` — vocabulary alignment
- `.qfai/assistant/steering/` — master convergence document

## Test Strategy

- Integration: TC coverage for reviewer template completeness, migration version detection, vocabulary scan, contradiction detection, surface type guard behavior.
- Fixture: TP-01 — 3 fixtures per new validator (pass/fail/non-UI).
- Migration path: TP-02 — old/intermediate/final pack detection and guidance.
- Vocabulary scan: integration test for maturity term enforcement.
- Gate checks:
  - non-UI fire count = 0 on non-UI fixture
  - all 5 reviewer items present in uix-rev assets
  - migration validator detects all 3 versions
  - `qfai validate --fail-on error --format github`

## Risks and Controls

- Migration false positives on intentionally minimal packs: version detection uses structural signatures (directory + axis model), not content heuristics.
- Vocabulary scan false positives on non-maturity usage of terms (e.g., "complete" as a verb): scan targets feature maturity context, not arbitrary usage.
- Cross-cutting non-UI safety regression: over-fire regression test (TC-0037-0014) runs on every CI build.
