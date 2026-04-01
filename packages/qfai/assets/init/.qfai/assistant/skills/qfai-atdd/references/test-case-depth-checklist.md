# Test Case Depth Checklist

This checklist ensures test cases cover not only happy paths but also boundary values, error paths, edge cases, and combinatorial scenarios.
Reviewers MUST use this checklist when evaluating test case completeness during ATDD and SDD review gates.

## 1. Equivalence Partitioning (同値分割)

For each input parameter or condition:

- [ ] Valid partitions identified with at least one representative test case each.
- [ ] Invalid partitions identified with at least one representative test case each.
- [ ] Special value partitions identified (null, empty, zero, default) with test cases.

## 2. Boundary Value Analysis (境界値分析)

For each numeric, date, string-length, or ordered domain:

- [ ] Minimum valid value tested.
- [ ] Maximum valid value tested.
- [ ] Just below minimum (invalid) tested.
- [ ] Just above maximum (invalid) tested.
- [ ] Off-by-one boundaries tested where applicable.

## 3. Normal / Error / Edge Path Coverage (正常系・異常系・エッジケース)

For each US or TC:

- [ ] At least one normal (happy) path test case exists.
- [ ] At least one error/failure path test case exists (invalid input, missing data, unauthorized access, etc.).
- [ ] Edge cases identified and tested (concurrent access, timing, empty collections, maximum payload, etc.).

## 4. Special Values (特殊値)

- [ ] Null / undefined / missing values handled.
- [ ] Empty strings, empty arrays, empty objects handled.
- [ ] Maximum-length strings or maximum-size payloads handled.
- [ ] Special characters (Unicode, control characters, SQL injection patterns) considered where applicable.

## 5. State Transitions (状態遷移)

For business flows with state machines or multi-step processes:

- [ ] All valid state transitions have test cases.
- [ ] Invalid state transitions are tested and rejected.
- [ ] Terminal / end states are reachable and verified.

## 6. Combinatorial Coverage (組み合わせ)

When multiple conditions interact:

- [ ] Key condition combinations tested (at minimum pairwise for high-risk interactions).
- [ ] Conflicting or contradictory input combinations tested.

## 7. Business Rule Coverage (ビジネスルール網羅)

- [ ] Every BR-\* referenced in 04_Business-Rules.md has at least one positive and one negative test case.
- [ ] Conditional business rules have test cases for each branch.

---

## Coverage Depth Matrix (テンプレート)

Reviewers and test-design-analysts MUST produce this matrix for each spec under review.
Mark each cell: ✅ covered, ⚠️ partial, ❌ missing.

| US/TC ID | Normal path | Error path | Boundary values | Special values | State transitions | Combinatorial | Status |
| -------- | ----------- | ---------- | --------------- | -------------- | ----------------- | ------------- | ------ |
| US-0001  | ✅/⚠️/❌    | ✅/⚠️/❌   | ✅/⚠️/❌        | ✅/⚠️/❌       | ✅/⚠️/❌          | ✅/⚠️/❌      | —      |
| TC-0001  | ✅/⚠️/❌    | ✅/⚠️/❌   | ✅/⚠️/❌        | ✅/⚠️/❌       | ✅/⚠️/❌          | ✅/⚠️/❌      | —      |

### Evaluation criteria

- **PASS**: All cells are ✅ or ⚠️ with documented rationale for partial coverage.
- **REVISE**: Any cell is ❌ without an explicit justification (e.g., Decision Record).

### Usage

- `test-design-analyst`: Produce this matrix when defining coverage obligations. Flag ❌ cells as gaps.
- `qa-gatekeeper`: Verify the matrix exists and no unjustified ❌ cells remain.
- `completion-reviewer`: Confirm the matrix was reviewed and any ⚠️ cells have rationale.
