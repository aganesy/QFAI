# Test Case Depth Checklist

This checklist ensures test cases cover not only happy paths but also boundary values, error paths, edge cases, and combinatorial scenarios.
Reviewers MUST use this checklist when evaluating test case completeness during ATDD and SDD review gates.

## Where the matrix lives

Re-running `/qfai-atdd` recomputes which cells are `❌`. It does not recompute
_why_ an uncoverable obligation was accepted, and that judgement is what
discharges the "no unjustified `❌`" gate — so the matrix is a **governance
record**, not a regenerable log.

The per-item ATDD evidence is committed because ledger anchors resolve into it,
but the matrix remains a separate governance artifact with its own validation
contract and lifecycle. Embedding it in a ledger-evidence entry would not
satisfy that contract. Write the matrix and one justification per `❌` to
`.qfai/evidence/coverage-depth-<spec-id>.md`; the stage evidence file links to
it rather than restating it.

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

**Home: `.qfai/evidence/coverage-depth-<spec-id>.md`.** That path is negated in
the managed `.gitignore` block, so the matrix and the justifications below it
are committed. The per-item `atdd-<spec-id>.md` is committed too, but it is the
ledger's evidence payload, not the matrix artifact that the PASS/REVISE criteria
below read. Write the matrix once, in its own file, and link it from the stage
evidence.

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
- **A justification counts only where it survives.** It goes under the matrix in
  `.qfai/evidence/coverage-depth-<spec-id>.md`, naming the cell, why the
  obligation is not coverable at this layer, and the `DR-*` or `CR-*` that
  carries the decision when one exists. A justification recorded anywhere else
  under `.qfai/evidence/**` does not satisfy the matrix's dedicated artifact
  contract and cannot discharge this gate.

### Usage

- `test-design-analyst`: Produce this matrix when defining coverage obligations. Flag ❌ cells as gaps.
- `qa-gatekeeper`: Verify the matrix exists and no unjustified ❌ cells remain. Read
  `.qfai/evidence/coverage-depth-<spec-id>.md`; a matrix that exists only in an
  ATDD per-item evidence file is a missing matrix.
- `completion-reviewer`: Confirm the matrix was reviewed and any ⚠️ cells have rationale.
- `npx qfai validate --profile atdd` reports the three file-level facts the readings
  above assume: `QFAI-ATDD-131` when a spec with ATDD-owned tests has no matrix,
  `QFAI-ATDD-132` when the matrix is excluded by a `.gitignore` — any of them,
  from the git worktree root down — without already being tracked, and
  `QFAI-ATDD-133` when the stage evidence has no `## Coverage Depth Matrix`
  section at all, inlines the table, points at no matrix file, or points at one
  without the counted `✅ N / ⚠️ N / ❌ N` totals beside it. None of them reads
  the cells — that judgement stays with the reviewer.
