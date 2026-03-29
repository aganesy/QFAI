# 05 Scope

## Metadata

| Key           | Value                        |
| ------------- | ---------------------------- |
| Discussion ID | discussion-20260329120000000 |
| Date          | 2026-03-29                   |

## In Scope

### Slice 1: Deterministic Validator Implementation (UIX-VAL-\*)

- UI-bearing detection consistency validator
- Implementation strategy artifact presence/completeness validator
- Scoring-ready axes completeness validator
- Aggregate scoring completeness validator
- Option comparison / selected anchor presence validator
- Screen contracts minimum structure validator
- OQ closure / downstream readiness validator
- Prototyping mode declaration consistency validator
- Visual-review backend expectation declaration validator
- Static/runtime boundary protection validator

### Slice 2: Semantic Review Integration (UIX-REV-\*)

- Strategy selection necessity/appropriateness check
- `selection_required=no` justification check
- Evaluation axis overlap/weakness check
- Trend translation weakness check
- Weak product-specificity check
- Weak selected anchor check
- Generic fallback risk check
- `accept / refine / pivot` recommendation generation

### Slice 3: Tests / Verify-Pack / Report UX

- Rule-by-rule pass/fail fixtures for each UIX-VAL-\*
- Stale asset detection fixtures
- Non-UI project fixtures (immunity verification)
- Report snapshot tests
- Verify-pack tests for redesign path
- Reviewer prompt contract tests (structure-level)

### Slice 4: Migration / Upgrade Support

- Missing `uiux/` sidecar detection
- Stale template behavior definition
- Upgrade sequencing definition
- Compatibility expectations for old packs

## Out of Scope

| Item                           | Reason                                              |
| ------------------------------ | --------------------------------------------------- |
| Browser/runtime evidence       | v1.8 scope -- requires runtime infrastructure       |
| Render capture                 | v1.8 scope -- requires headless browser integration |
| External critique adapters     | v1.8 scope -- requires adapter abstraction          |
| Full-harness orchestration     | v1.8 scope -- requires end-to-end pipeline          |
| Runtime gate redesign          | v1.8 scope -- separate architectural decision       |
| Cost observability             | v1.8 scope -- requires metrics infrastructure       |
| Aesthetic taste hard gate      | By design: taste is UIX-REV (reviewer), not UIX-VAL |
| Strategy "bestness" judgment   | By design: quality is reviewer scope                |
| Originality quality assessment | By design: subjective, not deterministic            |

## Success Criteria

1. All UIX-VAL-\* rules are deterministic: same input produces same output across runs
2. UIX-REV-_ checks are clearly separated from UIX-VAL-_ validators (no taste in hard gates)
3. Every UIX-VAL-\* rule has at least one pass and one fail fixture test
4. Legacy projects receive migration guidance without false-positive errors on non-UI projects
5. Report output includes rule ID, file path, and actionable fix suggestion for every error
6. `qfai validate --fail-on error` exits cleanly on non-UI projects with zero UIX issues

## Constraints

- Must follow existing validator pattern: `(root, config) => Promise<Issue[]>`
- Must register in `validate.ts` and export from `validators/index.ts`
- Must not break existing validator behavior or test suite
- Migration checks must be soft-launch capable (warning before error)
