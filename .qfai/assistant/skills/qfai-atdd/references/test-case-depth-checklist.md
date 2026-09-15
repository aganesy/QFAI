# Test Case Depth Checklist

This checklist covers declared behavior, boundaries, combinations and kept failures.
Reviewers MUST use this checklist when evaluating test case completeness during ATDD and SDD review gates.

## Scoring scope

A **kept failure** is one of:

- A failure named by a specification, unless a type or schema excludes it.
- A failure actually observed, whatever a type or schema says: the observation
  happened, so a schema claiming it cannot is a contradiction the Drift Protocol
  settles rather than a reason to drop the row.
- A failure declared by an active CON-API or CON-DB owned by the reviewed spec,
  unless a type or schema excludes it.
- A failure required by the safety floor in
  `.agents/rules/minimal-implementation.md` § 2.

Score every kept failure whether or not handling code exists yet. Declared
valid behavior always remains scored; failure-side bullets apply only to kept failures.

Contract-derived failures are scored only for active, owned whole contracts;
a planned contract contributes no contract-derived failure obligation in this
slice. Read API `x-qfai-status: planned` at the document root or, when absent or
unreadable, in a column-0 comment, never an API operation. A DB marker is a
standalone SQL comment, `-- x-qfai-status: planned`; leading whitespace is
allowed, trailing SQL is not. Explicit specification failures and actual
observations remain kept even when a contract is deferred, as do safety-floor
failures. Sibling ownership follows
`.qfai/assistant/skills/qfai-atdd/references/cross-spec-obligations.md`.

A type or schema excludes a failure only after the value has passed that type
or schema's validation. Untrusted input still requires boundary validation and
rejection under the safety floor. If a specification or contract names a failure
that conflicts with a type or schema, record DRIFT and route it to the upstream
owner. Do not erase the declared obligation or mark it n/a while that conflict
is unresolved.

Map every kept CON-API or CON-DB failure to a covering US/TC row in the existing
matrix for the spec's owned obligations: name the contract ID and failure clause,
and cite the appropriate API
or Integration assertion and evidence in that row or its accompanying notes.
Happy-path annotations alone do not cover the failure. If no existing US/TC row
owns it, record DRIFT and route it to the upstream spec or contract owner before
a clean coverage verdict. No additional table or column is required.
Sibling obligations follow the existing cross-spec ownership rule; do not invent
a local US/TC row to discharge them.

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

Scored as the `Equivalence partitions` cell of the matrix below.

For each input parameter or condition:

- [ ] Valid partitions identified with at least one representative test case each.
- [ ] Invalid partitions identified with at least one representative test case each, only for kept failures.
- [ ] Valid special-value partitions (null, empty, zero, default) identified with test cases.
- [ ] Invalid special-value partitions (null, empty, zero, default) tested only for kept failures.

## 2. Boundary Value Analysis (境界値分析)

For each numeric, date, string-length, or ordered domain:

- [ ] Minimum valid value tested.
- [ ] Maximum valid value tested.
- [ ] Just below minimum (invalid) tested only for kept failures.
- [ ] Just above maximum (invalid) tested only for kept failures.
- [ ] Off-by-one boundaries within the declared valid domain tested where applicable.

## 3. Normal / Error / Edge Path Coverage (正常系・異常系・エッジケース)

Scored as the `Normal path`, `Error path` and `Edge cases` cells of the matrix
below. Both edge-case bullets belong to `Edge cases`; neither can pass
unscored on a row whose normal and error cells are ✅.

For each US or TC:

- [ ] At least one normal (happy) path test case exists.
- [ ] A test case exists for each kept failure — every one, not one of them (invalid input, missing data, unauthorized access). The `Error path` cell is ✅ only when none is left over.
- [ ] Valid edge cases identified and tested (concurrent access, timing, empty collections, maximum payload).
- [ ] Failure edge cases tested only for kept failures (concurrent access, timing, empty collections, payload limits).

## 4. Special Values (特殊値)

- [ ] Null / undefined / missing values tested where valid.
- [ ] Invalid null / undefined / missing values tested only for kept failures.
- [ ] Empty strings, empty arrays, empty objects tested where valid.
- [ ] Invalid empty strings, arrays or objects tested only for kept failures.
- [ ] Maximum-length strings and maximum-size payloads tested where valid.
- [ ] Length or payload-limit failures tested only for kept failures.
- [ ] Special characters tested where valid (Unicode, control characters, literal SQL-like text).
- [ ] Special-character failures tested only for kept failures (Unicode, control characters, SQL injection patterns).

## 5. State Transitions (状態遷移)

For business flows with state machines or multi-step processes:

- [ ] All valid state transitions have test cases.
- [ ] Invalid state transitions tested and rejected only for kept failures.
- [ ] Terminal / end states are reachable and verified.

## 6. Combinatorial Coverage (組み合わせ)

When multiple conditions interact:

- [ ] Key condition combinations tested (at minimum pairwise for high-risk interactions).
- [ ] Conflicting or contradictory input combinations tested only for kept failures.

## 7. Business Rule Coverage (ビジネスルール網羅)

Scored in the **Business rule coverage** table below the matrix, one row per
`BR-*`. This obligation is keyed on the rule, not on a `US/TC`: one `BR-*`
spans several `TC`s and one `TC` realizes several `BR-*`, so it has no matrix
row to sit in and gets its own table in the same file.

- [ ] Every active BR-\* declared in 04_Business-Rules.md has at least one positive test case.
- [ ] Negative business-rule cases tested only for kept failures.
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
Mark applicable cells: ✅ covered, ⚠️ partial, ❌ missing. Use `n/a` only where
the category's own obligation is absent for this row — no kept failure, no
ordered or sized domain to have boundaries, no special value the input admits,
no state machine, no interacting conditions — and an uncovered obligation
remains ❌. Every column may carry `n/a` on the row whose obligation it names,
because a category that does not exist cannot be covered and demanding a mark
for it would have an analyst invent coverage or record a blocking gap for
nothing. Normal path and Oracle strength are the two that never do: every row
has a normal path, and every case it holds has an assertion that either can
fail or cannot.

**Every section above is scored.** Sections 1–6 and 8 are matrix columns;
section 7 is the business rule table that follows the matrix. A section with no
cell could never be ❌, never need a justification and never block — it would be
decoration in a document the completion gate reads cell by cell.

**Home: `.qfai/evidence/coverage-depth-<spec-id>.md`.** That path is negated in
the managed `.gitignore` block, so the matrix and the justifications below it
are committed. The per-item `atdd-<spec-id>.md` is committed too, but it is the
ledger's evidence payload, not the matrix artifact that the PASS/REVISE criteria
below read. Write the matrix once, in its own file, and link it from the stage
evidence.

| US/TC ID | Equivalence partitions | Normal path | Error path   | Edge cases   | Boundary values | Special values | State transitions | Combinatorial | Oracle strength | Status |
| -------- | ---------------------- | ----------- | ------------ | ------------ | --------------- | -------------- | ----------------- | ------------- | --------------- | ------ |
| US-0001  | ✅/⚠️/❌/n/a           | ✅/⚠️/❌    | ✅/⚠️/❌/n/a | ✅/⚠️/❌/n/a | ✅/⚠️/❌/n/a    | ✅/⚠️/❌/n/a   | ✅/⚠️/❌/n/a      | ✅/⚠️/❌/n/a  | ✅/⚠️/❌        | —      |
| TC-0001  | ✅/⚠️/❌/n/a           | ✅/⚠️/❌    | ✅/⚠️/❌/n/a | ✅/⚠️/❌/n/a | ✅/⚠️/❌/n/a    | ✅/⚠️/❌/n/a   | ✅/⚠️/❌/n/a      | ✅/⚠️/❌/n/a  | ✅/⚠️/❌        | —      |

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
| BR-0001 | ✅/⚠️/❌      | ✅/⚠️/❌/n/a  | ✅/⚠️/❌/n/a         | TC-0001     | —      |

### Evaluation criteria

- **Only the mark cells are scored.** `US/TC ID`, `BR ID`, `Covering TC` and
  `Status` hold identifiers and the row verdict, not marks. PASS and REVISE
  below read the matrix's category columns and the business rule table's
  `Positive case` / `Negative case` / `Conditional branches` columns; a
  reference value such as `BR-0001` or `TC-0001` in a non-scored cell is never
  a missing ✅, or no row filled in as templated could ever pass.
- **PASS**: All scored cells in both tables are ✅, ⚠️ with documented rationale
  for partial coverage, or `n/a`. `n/a` says the category does not exist for
  this row — an unconditional `BR-*` has no branches to cover, and an `Error
path` or `Negative case` cell may have no kept failures — and is the
  templated value of `Conditional branches`; it is not a coverage gap and never
  needs a justification. Use it only where the obligation is absent, not where
  it is unmet: an uncovered category is ❌.
- **A safety-floor failure is not waivable.** Where a cell's kept failures
  include one required by the safety floor in
  `.agents/rules/minimal-implementation.md` § 2 — validation of input crossing a
  trust boundary, error handling that prevents data loss, security,
  accessibility — that cell is ✅ or the row is a REVISE. Neither `⚠️` with a
  rationale nor `❌` with a Decision Record discharges it: the floor is what the
  ladder never removes, and a gate that a written reason can open is not a
  floor.
- **Oracle strength is not waivable by category coverage.** A row whose eight
  category cells are ✅ and whose Oracle strength cell is ❌ is a REVISE: it has
  cases in every category and no evidence that any of them can fail.
- **REVISE**: Any scored cell in either table is ❌ without an explicit justification (e.g., Decision Record).
- **A justification counts only where it survives.** It goes under the matrix in
  `.qfai/evidence/coverage-depth-<spec-id>.md`, naming the cell, why the
  obligation is not coverable at this layer, and the `DR-*` or `CR-*` that
  carries the decision when one exists. A justification recorded anywhere else
  under `.qfai/evidence/**` does not satisfy the matrix's dedicated artifact
  contract and cannot discharge this gate.

### Usage

- `test-design-analyst`: Produce this matrix and its business rule table when defining coverage obligations. Flag ❌ cells in either as gaps.
- `qa-gatekeeper`: Verify the matrix exists and no unjustified ❌ scored cells
  remain in it. Require the business rule table **only when the spec declares an
  active `BR-*`** — where none is declared, the stated omission is the correct
  form and not a missing table. Where it is required, read the spec's
  `04_Business-Rules.md` and reconcile: every active `BR-ID` owns a row, and a
  table of ✅ rows that silently drops a declared rule is a REVISE. Read
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
