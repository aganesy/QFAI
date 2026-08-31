# Test Case Depth Checklist

This checklist ensures test cases cover not only happy paths but also boundary values, error paths, edge cases, and combinatorial scenarios.
Reviewers MUST use this checklist when evaluating test case completeness during ATDD and SDD review gates.

## Where the matrix lives

Re-running `/qfai-atdd` recomputes which cells are `❌`. It does not recompute
_why_ an uncoverable obligation was accepted, and that judgement is what
discharges the "no unjustified `❌`" gate — so the matrix is a **governance
record**, not a regenerable log.

Written only into the stage evidence file it would never reach a commit (stage
evidence is regenerable and uncommitted), and a later reviewer could not tell a
justified `❌` from an unjustified one. Write the matrix and one justification
per `❌` to `.qfai/evidence/coverage-depth-<spec-id>.md`, which the managed
`.gitignore` block negates for exactly this reason. The stage evidence file
links to it rather than restating it.

## 1. Equivalence Partitioning (同値分割)

Scored as the `Equivalence partitions` cell of the matrix below.

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

Scored as the `Normal path`, `Error path` and `Edge cases` cells of the matrix
below — one cell per bullet, so the edge-case bullet cannot pass unscored on a
row whose normal and error cells are ✅.

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

Scored in the **Business rule coverage** table below the matrix, one row per
`BR-*`. This obligation is keyed on the rule, not on a `US/TC`: one `BR-*`
spans several `TC`s and one `TC` realizes several `BR-*`, so it has no matrix
row to sit in and gets its own table in the same file.

- [ ] Every active BR-\* declared in 04_Business-Rules.md has at least one positive and one negative test case.
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

**Every section above is scored.** Sections 1–6 and 8 are matrix columns;
section 7 is the business rule table that follows the matrix. A section with no
cell could never be ❌, never need a justification and never block — it would be
decoration in a document the completion gate reads cell by cell.

**Home: `.qfai/evidence/coverage-depth-<spec-id>.md`.** That path is negated in
the managed `.gitignore` block, so the matrix and the justifications below it
are committed. The rest of `.qfai/evidence/**` is not: a matrix written into
`atdd-<spec-id>.md` is deleted from history by the ignore rule, and with it
every reason a `❌` was accepted — which is the input the PASS/REVISE criteria
below read. Write it once, in its own file, and link it from the stage evidence.

| US/TC ID | Equivalence partitions | Normal path | Error path | Edge cases | Boundary values | Special values | State transitions | Combinatorial | Oracle strength | Status |
| -------- | ---------------------- | ----------- | ---------- | ---------- | --------------- | -------------- | ----------------- | ------------- | --------------- | ------ |
| US-0001  | ✅/⚠️/❌               | ✅/⚠️/❌    | ✅/⚠️/❌   | ✅/⚠️/❌   | ✅/⚠️/❌        | ✅/⚠️/❌       | ✅/⚠️/❌          | ✅/⚠️/❌      | ✅/⚠️/❌        | —      |
| TC-0001  | ✅/⚠️/❌               | ✅/⚠️/❌    | ✅/⚠️/❌   | ✅/⚠️/❌   | ✅/⚠️/❌        | ✅/⚠️/❌       | ✅/⚠️/❌          | ✅/⚠️/❌      | ✅/⚠️/❌        | —      |

### Business rule coverage (§7)

One row per **active** `BR-*` of `04_Business-Rules.md` — a rule that carries a
`BR-ID` row in that file's Rule Table, or its own heading **without a `Status:`
retiring it** (`superseded`, `retired`, `removed`, `deprecated`) — in the same
file, directly under the matrix. Retirement is recorded either way: some specs
delete the rule and keep a prose note, others keep the heading and stamp its
status. Neither form is an obligation, so neither gets a row — demanding
positive/negative cases for a rule the spec already replaced would REVISE a
correct ATDD. Omit the table only when the spec declares no active `BR-*`, and
say so in its place. Its cells are ❌-accounted exactly like the matrix cells:
an unjustified ❌ here is the same REVISE.

| BR ID   | Positive case | Negative case | Conditional branches | Covering TC | Status |
| ------- | ------------- | ------------- | -------------------- | ----------- | ------ |
| BR-0001 | ✅/⚠️/❌      | ✅/⚠️/❌      | ✅/⚠️/❌/n/a         | TC-0001     | —      |

### Evaluation criteria

- **Only the mark cells are scored.** `US/TC ID`, `BR ID`, `Covering TC` and
  `Status` hold identifiers and the row verdict, not marks. PASS and REVISE
  below read the matrix's category columns and the business rule table's
  `Positive case` / `Negative case` / `Conditional branches` columns; a
  reference value such as `BR-0001` or `TC-0001` in a non-scored cell is never
  a missing ✅, or no row filled in as templated could ever pass.
- **PASS**: All scored cells in both tables are ✅, ⚠️ with documented rationale
  for partial coverage, or `n/a`. `n/a` says the category does not exist for
  this row — an unconditional `BR-*` has no branches to cover — and is the
  templated value of `Conditional branches`; it is not a coverage gap and never
  needs a justification. Use it only where the obligation is absent, not where
  it is unmet: an uncovered category is ❌.
- **Oracle strength is not waivable by category coverage.** A row whose eight
  category cells are ✅ and whose Oracle strength cell is ❌ is a REVISE: it has
  cases in every category and no evidence that any of them can fail.
- **REVISE**: Any scored cell in either table is ❌ without an explicit justification (e.g., Decision Record).
- **A justification counts only where it survives.** It goes under the matrix in
  `.qfai/evidence/coverage-depth-<spec-id>.md`, naming the cell, why the
  obligation is not coverable at this layer, and the `DR-*` or `CR-*` that
  carries the decision when one exists. A justification recorded anywhere else
  under `.qfai/evidence/**` is ignored by Git and cannot be read at review time.

### Usage

- `test-design-analyst`: Produce this matrix and its business rule table when defining coverage obligations. Flag ❌ cells in either as gaps.
- `qa-gatekeeper`: Verify the matrix exists and no unjustified ❌ scored cells
  remain in it. Require the business rule table **only when the spec declares an
  active `BR-*`** — where none is declared, the stated omission is the correct
  form and not a missing table. Where it is required, read the spec's
  `04_Business-Rules.md` and reconcile: every active `BR-ID` owns a row, and a
  table of ✅ rows that silently drops a declared rule is a REVISE. Read
  `.qfai/evidence/coverage-depth-<spec-id>.md`; a matrix that exists only in an
  uncommitted stage-evidence file is a missing matrix.
- `completion-reviewer`: Confirm the matrix was reviewed and any ⚠️ cells have rationale.
- `npx qfai validate --profile atdd` reports the three file-level facts the readings
  above assume: `QFAI-ATDD-131` when a spec with ATDD-owned tests has no matrix,
  `QFAI-ATDD-132` when the matrix is excluded by a `.gitignore` — any of them,
  from the git worktree root down — without already being tracked, and
  `QFAI-ATDD-133` when the stage evidence has no `## Coverage Depth Matrix`
  section at all, inlines the table, points at no matrix file, or points at one
  without the counted `✅ N / ⚠️ N / ❌ N` totals beside it. None of them reads
  the cells — that judgement stays with the reviewer.
