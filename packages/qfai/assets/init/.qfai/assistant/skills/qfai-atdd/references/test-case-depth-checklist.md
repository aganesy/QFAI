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

## 8. Oracle Strength (オラクル強度)

The seven sections above count **case categories**. This one asks whether each
case's assertion can fail. A test that cannot fail satisfies every category.

- [ ] No assertion uses truthiness where the boundary's own value is available
      (`toBeTruthy()` on a result whose expected value is in hand).
- [ ] No assertion compares a stored value against the same helper the fixture
      wrote it with — that holds for every implementation, including a wrong one.
- [ ] No loop asserts over a collection that is empty by construction.
- [ ] No assertion observes a field the transport discards or a log the harness
      swallows.
- [ ] No assertion merely verifies a mock was called with what the test passed it.
- [ ] Each case has a named production mutation that makes it fail, or a recorded
      `equivalent-mutant` with the weaker contract clause named.

---

## Coverage Depth Matrix (テンプレート)

Reviewers and test-design-analysts MUST produce this matrix for each spec under review.
Mark each cell: ✅ covered, ⚠️ partial, ❌ missing.

| US/TC ID | Normal path | Error path | Boundary values | Special values | State transitions | Combinatorial | Oracle strength | Status |
| -------- | ----------- | ---------- | --------------- | -------------- | ----------------- | ------------- | --------------- | ------ |
| US-0001  | ✅/⚠️/❌    | ✅/⚠️/❌   | ✅/⚠️/❌        | ✅/⚠️/❌       | ✅/⚠️/❌          | ✅/⚠️/❌      | ✅/⚠️/❌        | —      |
| TC-0001  | ✅/⚠️/❌    | ✅/⚠️/❌   | ✅/⚠️/❌        | ✅/⚠️/❌       | ✅/⚠️/❌          | ✅/⚠️/❌      | ✅/⚠️/❌        | —      |

### Evaluation criteria

- **PASS**: All cells are ✅ or ⚠️ with documented rationale for partial coverage.
- **Oracle strength is not waivable by category coverage.** A row whose six
  category cells are ✅ and whose Oracle strength cell is ❌ is a REVISE: it has
  cases in every category and no evidence that any of them can fail.
- **REVISE**: Any cell is ❌ without an explicit justification (e.g., Decision Record).

### Usage

- `test-design-analyst`: Produce this matrix when defining coverage obligations. Flag ❌ cells as gaps.
- `qa-gatekeeper`: Verify the matrix exists and no unjustified ❌ cells remain.
- `completion-reviewer`: Confirm the matrix was reviewed and any ⚠️ cells have rationale.
