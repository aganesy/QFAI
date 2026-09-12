# Coverage Depth Matrix — spec-0008

## Scope

This matrix scores the eighteen test cases `06_Test-Cases.md` declares — `TC-0008-0001` through
`TC-0008-0018` — against the tests that actually discharge them in `packages/qfai/tests/**`. The
obligation set is read from `06_Test-Cases.md` in full, not from the rows of
`.qfai/specs/spec-0008/tdd/test-list.md`, so a case whose ledger row was never updated is still
scored here. The business rule table below it carries all twelve `BR-0008-*` of
`04_Business-Rules.md`; none of the twelve headings carries a `Status:` retiring it, so all twelve
are active and all twelve own a row.

**Most cells are `❌` for a reason worth stating precisely, because it is not the obvious one.**
Sixteen of the eighteen obligations do have a passing annotated test — only `TC-0008-0009` and
`TC-0008-0010` have none. What ten of those sixteen do not have is a test that exercises a
behaviour. `TC-0008-0001` … `-0008`, `-0011` and `-0012` are discharged by assertions that read a
Markdown or TypeScript **source file** and check that a substring is present in it: that `SKILL.md`
contains the words `Raw count`, that `atddTraceability.ts` contains the identifier
`US_TEST_ANNOTATION_RE`, that `06_Test-Cases.md` contains the phrase `flagged as incomplete`. Those
cases pass, and they pass for every implementation of the behaviour they name, including an absent
one. A category column asks how thoroughly a behaviour is exercised; where the only case reads a
document about the behaviour, no category beyond `Normal path` has anything to score, and `Oracle
strength` has nothing to certify. That is the shape of rows 1-8, 11 and 12, and it is why they
carry eight `❌` each rather than two or three.

The remaining six rows are the opposite case and are scored on their merits: `TC-0008-0013` and
`TC-0008-0014` exercise `qfai atdd scaffold` against temp-directory fixtures, and `TC-0008-0015` …
`-0018` run real predicates over the shipped guidance artifact with a planted-violation control.

Committed, because it is a governance record. Section "Every `❌` cell, named" enumerates all 135 of
them so that "one justification per `❌`" is checkable rather than asserted, and section "Every `⚠️`
cell, named" does the same for the partial scores, which the PASS criterion also requires a rationale
for.

## What was measured, and how

Every score below rests on a test run, not on a reading of a ledger. The four files named in the
ledger plus the three that carry spec-0008 annotations without a ledger row were executed:

| File                                                             | Result           |
| ---------------------------------------------------------------- | ---------------- |
| `tests/integration/atddSkillSpec0008.test.ts`                    | 14 passed        |
| `tests/integration/specAutoDiscovery.test.ts`                    | 38 passed        |
| `tests/integration/atddScaffoldSkeleton.test.ts`                 | 13 passed        |
| `tests/integration/atddScaffoldEscalation.test.ts`               | 8 passed         |
| `tests/integration/atddCredentialReuseGuidance.test.ts`          | 12 passed        |
| `tests/integration/spec0008AtddScaffold.test.ts`                 | 2 **skipped**    |

The last row is the one a reader should not pass over. `spec0008AtddScaffold.test.ts` is the only
test that drives `TC-0008-0013` and `TC-0008-0014` the way their own text specifies — shelling out
to the CLI, running `qfai validate`, and reading `D-SCAFFOLD-PLACEHOLDER` out of the JSON — and its
entire suite is `describe.skip`, pending an implementation that has since landed. It contributes
nothing to any cell.

`TC-0008-0009` and `TC-0008-0010` carry no annotation anywhere in `packages/qfai/**`. That was
checked directly, not inferred from the ledger's empty `Test file` column.

## The matrix

| US/TC ID     | Equivalence partitions | Normal path | Error path | Edge cases | Boundary values | Special values | State transitions | Combinatorial | Oracle strength | Status |
| ------------ | ---------------------- | ----------- | ---------- | ---------- | --------------- | -------------- | ----------------- | ------------- | --------------- | ------ |
| TC-0008-0001 | ❌                     | ✅          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0008-0002 | ❌                     | ✅          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0008-0003 | ❌                     | ✅          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0008-0004 | ❌                     | ✅          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0008-0005 | ❌                     | ✅          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0008-0006 | ❌                     | ✅          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0008-0007 | ❌                     | ✅          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0008-0008 | ❌                     | ✅          | ⚠️         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0008-0009 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0008-0010 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0008-0011 | ❌                     | ✅          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0008-0012 | ❌                     | ✅          | ⚠️         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0008-0013 | ✅                     | ✅          | ✅         | ✅         | ⚠️              | ✅             | ⚠️                | ✅            | ⚠️              | ⚠️     |
| TC-0008-0014 | ✅                     | ✅          | ✅         | ✅         | ✅              | ⚠️             | ✅                | ✅            | ⚠️              | ✅     |
| TC-0008-0015 | ⚠️                     | ✅          | ❌         | ✅         | ❌              | ❌             | ❌                | ❌            | ✅              | ⚠️     |
| TC-0008-0016 | ✅                     | ✅          | ✅         | ❌         | ❌              | ❌             | ❌                | ❌            | ✅              | ✅     |
| TC-0008-0017 | ⚠️                     | ✅          | ❌         | ✅         | ❌              | ❌             | ❌                | ❌            | ✅              | ⚠️     |
| TC-0008-0018 | ⚠️                     | ✅          | ❌         | ⚠️         | ❌              | ❌             | ❌                | ❌            | ✅              | ⚠️     |

Totals by `Status`: **✅ 2 / ⚠️ 4 / ❌ 12**.

Totals across the nine depth columns, 162 cells: **✅ 35 / ⚠️ 11 / ❌ 116**.

### Business rule coverage

One row per active `BR-0008-*`. All twelve headings in `04_Business-Rules.md` are active — none
carries a `Status:` of `superseded`, `retired`, `removed` or `deprecated` — so none is omitted.
`Covering TC` is derived from each rule's `AC-Refs` and from the `BR-Ref` of the examples the test
cases cite, not from the rule's number.

| BR ID        | Positive case | Negative case | Conditional branches | Covering TC                              | Status |
| ------------ | ------------- | ------------- | -------------------- | ---------------------------------------- | ------ |
| BR-0008-0001 | ⚠️            | ❌            | ⚠️                   | TC-0008-0002, TC-0008-0003, TC-0008-0004 | ❌     |
| BR-0008-0002 | ⚠️            | ❌            | ⚠️                   | TC-0008-0003, TC-0008-0005               | ❌     |
| BR-0008-0003 | ⚠️            | ❌            | n/a                  | TC-0008-0001, TC-0008-0007               | ❌     |
| BR-0008-0004 | ⚠️            | ⚠️            | n/a                  | TC-0008-0006, TC-0008-0008               | ⚠️     |
| BR-0008-0005 | ❌            | ❌            | n/a                  | TC-0008-0009                             | ❌     |
| BR-0008-0006 | ⚠️            | ❌            | n/a                  | TC-0008-0010, TC-0008-0007               | ❌     |
| BR-0008-0007 | ⚠️            | ⚠️            | n/a                  | TC-0008-0011, TC-0008-0012               | ⚠️     |
| BR-0008-0008 | ✅            | ⚠️            | ⚠️                   | TC-0008-0013                             | ⚠️     |
| BR-0008-0009 | ✅            | ✅            | ✅                   | TC-0008-0014                             | ⚠️     |
| BR-0008-0010 | ✅            | ❌            | n/a                  | TC-0008-0015                             | ⚠️     |
| BR-0008-0011 | ✅            | ✅            | ⚠️                   | TC-0008-0016, TC-0008-0017               | ✅     |
| BR-0008-0012 | ✅            | ⚠️            | n/a                  | TC-0008-0018                             | ⚠️     |

Totals across the three scored columns, 36 cells: **✅ 8 / ⚠️ 14 / n/a 7 / ❌ 7**.

`n/a` is used only where the rule states no condition, so there is no branch to cover. It is not
used anywhere an obligation exists and is unmet.

`BR-0008-0009` is the one row whose `Status` is weaker than its three scored cells. Positive,
negative and conditional coverage are all genuinely present — escalation fires on the third cycle,
the first two cycles must not escalate, a filled skeleton resets the counter, and the default of 3
and a configured 1 are both exercised. The verdict is `⚠️` because the rule counts `qfai validate`
cycles and the test drives `runAtddScaffold` calls, so what is measured is adjacent to what the rule
states.

## Every ❌ cell, named

The matrix carries 116 `❌` depth cells plus 12 in `Status`, and the business rule table below it
carries 7 more — 135 in all. Each is named below with its own reason.
A row's `Status` is `❌` when the obligation is not discharged at the depth the case describes; that
verdict is stated once per row and is not repeated per cell.

### TC-0008-0001 — Volume Estimate Produces Signal Table

Parked at `Status = exception` under **DR-0008-0001**, which records the eight backfill rows as
one-shot GREEN over an implementation already in production and calls a strict TDD cycle
"ceremonial" for them. The single case reads `SKILL.md` and asserts it contains `Estimator output
table`, `Raw count`, `Signal`, `Evidence`, `Notes` and three layer-row patterns.

- **Equivalence partitions** — one input exists, the shipped `SKILL.md`. No valid, invalid or
  special partition of the estimator's input (a spec's US/TC/CON-API counts) is fed to anything.
- **Error path** — no case supplies a spec the estimator cannot read.
- **Edge cases** — no case covers a spec with zero US, zero TC or zero CON-API.
- **Boundary values** — `EX-0008-0001` names 5 US, 3 CON-API and 10 TC; no count is exercised at,
  below or above any limit, because no count is exercised at all.
- **Special values** — no null, empty or default count is supplied.
- **State transitions** — producing a table from counts is a single step; no transition exists to
  cover, and no case establishes one.
- **Combinatorial** — the three layer counts are never varied, so no combination of them is tested.
- **Oracle strength** — the assertion is a substring search over documentation. Deleting the
  estimator implementation entirely leaves it green, so no production mutation makes the case fail.
- **Status** — the AC names a produced table; nothing produces one under test.

### TC-0008-0002 — E2E Tests Cover All Required US

DR-0008-0001, as above. Two cases: `atddTraceability.ts` contains the identifier
`US_TEST_ANNOTATION_RE` and the strings `QFAI:SPEC-` and `:US-`; `SKILL.md` matches
`/tests\/e2e\/\*\*.*US/`.

- **Equivalence partitions** — no US is classified as covered or uncovered by anything; there is no
  input to partition.
- **Error path** — no case supplies a spec with a required US that has no E2E test.
- **Edge cases** — no case covers a spec declaring zero US, or a US annotated in two files.
- **Boundary values** — the covered/required US count has no case at any edge.
- **Special values** — no malformed or duplicated annotation is supplied.
- **State transitions** — no uncovered-to-covered progression is observed.
- **Combinatorial** — US coverage is never crossed with any other condition.
- **Oracle strength** — the assertion reads an identifier out of a source file. Deleting the regex's
  use while leaving its declaration keeps the case green.
- **Status** — the obligation is coverage detection; detection is never run.

### TC-0008-0003 — API Tests Cover All Required CON-API

DR-0008-0001, as above. Two cases: `API_TEST_ANNOTATION_RE` and `QFAI:CON-API-` appear in
`atddTraceability.ts`; `SKILL.md` matches `/tests\/api\/\*\*.*CON-API/`.

- **Equivalence partitions** — no CON-API is fed to anything, so no partition of the input exists.
- **Error path** — the case's own text requires "zero TC references" in API tests; no case supplies
  an API file that carries one.
- **Edge cases** — a spec with no API surface is the normal case for this repository and is untested.
- **Boundary values** — no count of CON-API entries is exercised at an edge.
- **Special values** — no malformed `CON-API-*` reference is supplied.
- **State transitions** — none exists in a single coverage check, and none is established.
- **Combinatorial** — CON-API coverage is never crossed with the forbidden-TC condition the same
  case names.
- **Oracle strength** — a substring search over source. The API scan could be deleted and the case
  stays green.
- **Status** — neither half of the case (coverage, zero TC references) is exercised.

### TC-0008-0004 — Integration Tests Cover All Required TC

DR-0008-0001, as above. Two cases: `TC_TEST_ANNOTATION_RE` and `:TC-` appear in
`atddTraceability.ts`; `SKILL.md` matches `/tests\/integration\/\*\*.*TC/`.

- **Equivalence partitions** — no TC is classified by anything under test.
- **Error path** — no case supplies a required TC without an Integration test.
- **Edge cases** — no case covers a TC annotated in a file outside `tests/integration/**`, which is
  the condition that actually occurs in this spec (see Findings).
- **Boundary values** — no covered/required count is exercised at an edge.
- **Special values** — no malformed TC annotation is supplied.
- **State transitions** — none exists, and none is established.
- **Combinatorial** — TC coverage is never crossed with layer or level.
- **Oracle strength** — a substring search over source; the scan could be removed and the case stays
  green.
- **Status** — the coverage obligation is never evaluated.

### TC-0008-0005 — Forbidden TC Annotations Detected

DR-0008-0001, as above. Two cases: `atddTraceability.ts` contains `AtddForbiddenRef`, `tcInApi` and
`tcInE2e`; `atddCodeTraceability.ts` contains the literals `QFAI-ATDD-121` and `QFAI-ATDD-122`.

- **Equivalence partitions** — no file is scanned, so the compliant and violating partitions both go
  unrepresented.
- **Error path** — this case's entire subject is error detection, and no case runs a file carrying a
  forbidden annotation through the detector. The cell is `❌` rather than `⚠️` because nothing is
  detected: the assertions establish that two finding-code literals occur in a source file.
- **Edge cases** — an annotation inside a comment, a string or a fixture is untested.
- **Boundary values** — no count of forbidden references is exercised at an edge.
- **Special values** — no near-miss annotation form is supplied.
- **State transitions** — none exists, and none is established.
- **Combinatorial** — the `tests/api/**` and `tests/e2e/**` branches are never combined in one run.
- **Oracle strength** — the literal `QFAI-ATDD-121` occurring in a source file is satisfied by a
  comment. Removing the emission while leaving the constant keeps the case green.
- **Status** — detection is asserted to be declared, never to work.

### TC-0008-0006 — Stage Gates Not Skipped

DR-0008-0001, as above. One case: `SKILL.md` contains `Stage 0` and `mandatory`.

- **Equivalence partitions** — no gate run exists, so no partition of gate outcomes is represented.
- **Error path** — no case attempts to skip a gate and requires a refusal.
- **Edge cases** — no case covers a gate that produces no evidence.
- **Boundary values** — the case's own text names gates P0 through P8; neither end of that ordered
  domain is exercised, and the assertion does not even name P8.
- **Special values** — no absent or duplicated gate result is supplied.
- **State transitions** — P0 through P8 is a nine-state sequence and is the clearest state-machine
  obligation in this spec. No transition between any two gates is exercised.
- **Combinatorial** — no combination of gate outcomes is tested.
- **Oracle strength** — `SKILL.md` containing the word `mandatory` is satisfied by any document that
  uses the word anywhere, for any reason.
- **Status** — the sequence the AC requires is never evaluated.

### TC-0008-0007 — Evidence File Contains Required Sections

DR-0008-0001, as above. Two cases assert `SKILL.md` mentions `atdd-<spec-id>.md`, `Evidence
(MANDATORY)`, `Work Orders Summary` and `Reviewer notes`.

- **Equivalence partitions** — no evidence file is read, so complete and incomplete files are both
  unrepresented.
- **Error path** — no case supplies an evidence file missing a required section.
- **Edge cases** — an empty evidence file, or one with a section present but empty, is untested.
- **Boundary values** — `AC-0008-0007` enumerates eleven required sections; no case exercises ten or
  twelve, and none counts them.
- **Special values** — no empty or absent section body is supplied.
- **State transitions** — none exists in a single completeness check, and none is established.
- **Combinatorial** — no combination of present and absent sections is tested.
- **Oracle strength** — the assertions read the skill that states the requirement, not an evidence
  file that meets it. The evidence writer could emit nothing and the case stays green.
- **Status** — no evidence file is checked for completeness.

### TC-0008-0008 — Reviewer Independence Enforced

DR-0008-0001, as above. Two cases assert `SKILL.md` declares a `Reviewer Gate (MUST)`, matches
`/independent.*completion-reviewer/i` and `/PASS.*REVISE/`, and contains `Orchestrator MUST NOT`
with `/must not.*self-approv/i`.

`Error path` is `⚠️`, not `❌`: the self-approval prohibition is a negative-shaped obligation and a
case does address it, at the level of the declaration rather than of an attempted self-approval.

- **Equivalence partitions** — no reviewer identity is compared against any implementer identity.
- **Edge cases** — a reviewer who is also an implementer, and a reviewer returning a third verdict,
  are both untested.
- **Boundary values** — the allowed verdict set has exactly two members; no case supplies a third.
- **Special values** — no empty or unrecognised verdict is supplied.
- **State transitions** — no review cycle is driven from one verdict to another.
- **Combinatorial** — reviewer identity is never crossed with verdict.
- **Oracle strength** — `/PASS.*REVISE/` matches any document containing those two words in that
  order. The gate could permit self-approval and the case stays green.
- **Status** — independence is asserted to be documented, never to be enforced.

### TC-0008-0009 — Coverage Placeholder for EX-0008-0006

The ledger row records `Test file` as `—` and parks the row at `Status = exception` citing
**DR-0008-0100**, with the evidence string `exception:DR-0008-0100 deferred — no impl yet, v1.7.15
rev3`. No test in `packages/qfai/**` carries a `TC-0008-0009` annotation; that was searched for
directly. Every cell is `❌` for one reason — **no test exists** — and each is named so the count is
checkable:

- **Equivalence partitions**, **Normal path**, **Error path**, **Edge cases**, **Boundary values**,
  **Special values**, **State transitions**, **Combinatorial**, **Oracle strength** — nine cells,
  each `❌` because the row has no test at any depth. A category cannot be partially exercised by
  nothing, so `⚠️` would overstate every one of them.
- **Status** — the obligation is undischarged and deferred.

The `DR-0008-0100` the row cites **has no decision record**. `07_Decisions.md` declares two items,
`DR-0008-0001` and `DR-0008-0003`, and reserves `DR-0008-0002`; `DR-0008-0100` appears nowhere under
`.qfai/` except in these two ledger rows. This justification therefore names the identifier the row
records and states that the record behind it is absent. It does not supply a rationale on that
record's behalf, because there is none to read.

### TC-0008-0010 — Coverage Placeholder for EX-0008-0007

Identical recorded state: `Test file` = `—`, `Status = exception`, cited **DR-0008-0100**, evidence
`deferred — no impl yet, v1.7.15 rev3`. No `TC-0008-0010` annotation exists in `packages/qfai/**`.

- **Equivalence partitions**, **Normal path**, **Error path**, **Edge cases**, **Boundary values**,
  **Special values**, **State transitions**, **Combinatorial**, **Oracle strength** — nine cells,
  each `❌` because the row has no test at any depth.
- **Status** — undischarged and deferred, under a decision record that does not exist.

### TC-0008-0011 — Coverage Depth Matrix Produced and Verified

Parked at `Status = exception` citing **DR-0008-0002**, evidence `backfill — impl-first v1.7.15
rev3`. Two cases in `specAutoDiscovery.test.ts` assert that `06_Test-Cases.md` contains the string
`Coverage Depth Matrix` and that `03_Acceptance-Criteria.md` contains `AC-0008-0009` and matches
`/normal.*error.*boundary/i`.

Both read this spec's own Markdown. Neither reads a matrix, and neither reaches
`src/core/validators/atddCoverageDepth.ts`, the validator that now implements the gate.

- **Equivalence partitions** — no matrix is read, so complete and incomplete matrices are both
  unrepresented.
- **Error path** — no case supplies a spec whose matrix is absent or malformed.
- **Edge cases** — a matrix with no rows, or one with a column missing, is untested.
- **Boundary values** — the matrix's column count and row count are never exercised at an edge.
- **Special values** — no empty cell or unrecognised mark is supplied.
- **State transitions** — none exists in a single production check, and none is established.
- **Combinatorial** — no combination of cell marks is tested.
- **Oracle strength** — the assertions read the spec that states the requirement. Deleting
  `atddCoverageDepth.ts` outright leaves both cases green, so there is no production mutation that
  makes this row fail.
- **Status** — the AC requires a matrix to be produced; nothing produces or reads one under test.

`DR-0008-0002` is described in `07_Decisions.md` only as "reserved by the v1.7.15 backfill
exception". It has no `### DR-0008-0002` record of its own, so the row's citation resolves to a
sentence about the identifier rather than to a decision.

### TC-0008-0012 — Normal-Path-Only Flagged as Incomplete

Same recorded state: `exception`, **DR-0008-0002**, impl-first backfill. Two cases assert
`06_Test-Cases.md` contains `Normal-Path-Only Flagged as Incomplete` and matches `/flagged as
incomplete/i`, and that `05_Examples.md` contains `EX-0008-0008` and the word `incomplete`.

`Error path` is `⚠️`, not `❌`: the case is typed `error` and its subject is the incomplete verdict,
which a case does address — at the level of the phrase appearing in the spec rather than of a
verdict being produced.

- **Equivalence partitions** — no US or TC is classified as complete or incomplete by anything.
- **Edge cases** — a row with a normal case and an `n/a` elsewhere, and a row with no cases at all,
  are both untested.
- **Boundary values** — the threshold is "only normal-path cases"; the case one over that line (one
  normal plus one error) is never supplied.
- **Special values** — no empty or absent test-case set is supplied.
- **State transitions** — no incomplete-to-complete progression is observed.
- **Combinatorial** — no combination of covered and uncovered categories is tested.
- **Oracle strength** — both assertions search this spec's own Markdown for phrases this spec
  contains by construction. The flagging logic could be deleted and the row stays green.
- **Status** — the REVISE the AC requires is never triggered.

### TC-0008-0013 — Scaffold Emits Per-TC Skeleton with TODO and Refs

`Status = done` under **DR-0008-0003**, which copies down `DR-0272`. Discharged by
`tests/integration/atddScaffoldSkeleton.test.ts`, 13 passing cases, all exercising `runAtddScaffold`
against `mkdtemp` fixtures. This row has **no `❌` depth cell**. Its three `⚠️` cells are stated
below, and its `Status` is `⚠️` for the reason given there.

### TC-0008-0014 — Scaffold Idempotency and 3-Cycle Escalation

`Status = done` under **DR-0008-0003**. Discharged by
`tests/integration/atddScaffoldEscalation.test.ts`, 8 passing cases. This row has **no `❌` cell** in
any column, including `Status`. Its two `⚠️` cells are stated below.

### TC-0008-0015 — Seven Rules and Companion Rule Stated and Linked

The ledger records `Status = todo`, `Test file` = `—` and `DR-ID` = `—`. **The ledger is stale**:
`tests/integration/atddCredentialReuseGuidance.test.ts` carries the `TC-0008-0015` annotation and
its three cases for this obligation pass. The scores are taken from what those cases assert, and the
ledger discrepancy is recorded under Findings rather than used as a justification, because writing
"no test exists" here would assert something contradicted by the tree.

- **Error path** — the three cases require the seven rules, the companion rule and a resolving link
  to be present. None runs the same predicates against an artifact missing one and requires a
  failure. `TC-0008-0016` does exactly that for its own predicates, so the technique is available in
  the same file and is not applied here.
- **Boundary values** — the obligation has no numeric, date, length or ordered domain. The count of
  seven is fixed by the spec, and while a sixth-rule deletion reddens the case, no case pins the
  upper side: an eighth rule added to the artifact fails nothing.
- **Special values** — no null, empty or maximum-length input exists; the artifact is read as
  shipped and no variant of it is constructed.
- **State transitions** — reading a document has no state machine, and no multi-step process is
  exercised.
- **Combinatorial** — the seven rule predicates are never crossed with one another or with the
  cross-link condition.
- **Status** — `⚠️` rather than `✅`: the positive obligation is covered thoroughly and with a strong
  oracle, and the negative direction is unchecked.

### TC-0008-0016 — Guidance Names No Browser Backend

Same stale ledger state (`todo`, `—`). Three passing cases: a zero-match scan over the shipped
artifact for three predicate classes, a planted-fixture control requiring each predicate to fire,
and the worked-example framing.

- **Edge cases** — the deny-list uses `\b` boundaries so that a word merely containing a backend's
  name is not a match, and a comment in the test says so. No case supplies such a near-miss string,
  so the boundary behaviour is designed and unverified.
- **Boundary values** — no numeric, date, length or ordered domain exists in the obligation; a match
  count is either zero or not, with no edge between.
- **Special values** — no empty artifact, Unicode variant or control-character case is supplied.
- **State transitions** — scanning a document has no state machine.
- **Combinatorial** — the three predicate classes are evaluated independently; no case supplies an
  input violating two at once, and no conflicting combination is constructed.
- This row's `Status` is `✅`: both directions are checked and the planted control makes the green
  a measured one.

### TC-0008-0017 — Guidance Adds No Layer, Token, Finding Code or Validator

Same stale ledger state (`todo`, `—`). Four passing cases: the ATDD finding-code set enumerated
exactly, the layer token set fixed at five members with no layer heading in the guidance, the
absence of annotation tokens and finding codes in the artifact, and no validator referencing it.

- **Error path** — every case asserts an absence over the real tree. None plants a new finding code,
  layer token or validator reference and requires detection, which is the control `TC-0008-0016`
  carries and this row does not.
- **Boundary values** — the finding-code set is enumerated, not counted, so no count sits at an
  edge; the obligation has no other ordered domain.
- **Special values** — no empty, null or maximum-size input is supplied.
- **State transitions** — the vocabulary is read once; no transition exists.
- **Combinatorial** — the finding-code, layer-token and annotation-token classes are never combined
  in one violating input.
- **Status** — `⚠️`: strong oracles, including the `expect(validators.length).toBeGreaterThan(0)`
  guard against an empty-by-construction loop, and no negative direction.

### TC-0008-0018 — Script-Naming Rule Is Adopter-Only and Excludes Unit/Component

Same stale ledger state (`todo`, `—`). Two passing cases: the script-naming rule and the three
non-adoption statements, and the Scope section naming the three ATDD layers with the unit/component
disclaimer.

- **Error path** — no case constructs a scope statement carrying a unit or component obligation and
  requires the predicate to fire.
- **Boundary values** — the obligation has no numeric, date, length or ordered domain; the layer set
  is three named members with no edge.
- **Special values** — no empty or absent Scope section is constructed; the `not.toBe("")` guard
  covers the case where one is missing from the real artifact, which is a guard rather than a
  supplied special value.
- **State transitions** — reading a scope statement has no state machine.
- **Combinatorial** — the adopter-only condition and the layer-scope condition are asserted
  separately and never crossed.
- **Status** — `⚠️`: the positive direction is well covered and section-scoped, the negative is
  absent.

### The seven ❌ cells of the business rule table

- **BR-0008-0001 × Negative case** — nothing supplies a test file whose annotation does not match its
  layer and requires a rejection. The three covering cases assert that the mapping is declared in
  `atddTraceability.ts` and `SKILL.md`.
- **BR-0008-0002 × Negative case** — nothing supplies a compliant `tests/api/**` or `tests/e2e/**`
  file and requires zero findings, so the rule's discriminating power is unestablished in both
  directions.
- **BR-0008-0003 × Negative case** — the rule states that volume floors are **not** completion gates.
  No case drives a completion check with a failing volume signal and requires it to pass anyway,
  which is the only form this rule's negative can take.
- **BR-0008-0005 × Positive case** and **BR-0008-0005 × Negative case** — the rule's only covering
  case is `TC-0008-0009`, which has no test at all. Neither an unknown reference treated as an error
  nor a known reference accepted is exercised anywhere.
- **BR-0008-0006 × Negative case** — the rule has two clauses and the negative applies to the second:
  that the evidence file must not be committed. Nothing tests it. It is also **contradicted by the
  tree** (see Findings), so this `❌` marks an obligation that should be rewritten rather than
  covered.
- **BR-0008-0010 × Negative case** — nothing runs the seven rule predicates against an artifact with
  a rule removed or two rules collapsed into one statement and requires a failure.

## Every ⚠️ cell, named

11 depth cells in the matrix and 14 scored cells in the business rule table are `⚠️`. The PASS
criterion requires a documented rationale for each, so each is named here.

### Matrix

- **TC-0008-0008 × Error path** — the self-approval prohibition is addressed, as a phrase required to
  be present in `SKILL.md`, not as an attempted self-approval that is refused.
- **TC-0008-0012 × Error path** — the incomplete verdict is addressed, as a phrase required to be
  present in this spec's own Markdown, not as a verdict produced from a normal-path-only input.
- **TC-0008-0013 × Boundary values** — the one ordered domain the obligation has is the destination
  path, and it is exercised at its degenerate value: the `it.each` covers `testsDir` of `spec-tests`
  and of `.`, and asserts the whole clause rather than the two paths on their own, because
  `spec-tests/api/**` contains `tests/api/**` as a substring and a containment check would pass on
  the very default it rules out. No numeric, date or length boundary exists in the obligation.
- **TC-0008-0013 × State transitions** — the placeholder-to-filled transition is covered in both
  directions that matter: a filled file is left byte-identical with its mtime unchanged, and a
  sibling still carrying the marker is left as-is. No invalid transition is attempted, and no
  terminal state beyond "filled" is verified.
- **TC-0008-0013 × Oracle strength** — three separate weaknesses, one of them measured:
  1. The TODO-marker assertion is `toContain("// TODO: implement assertion for TC-0001-0001")`, and
     `JS_TS_DIALECT.buildBody` in `src/core/atdd/scaffoldDialect.ts` emits that exact line **twice** —
     once at the `describe` level and once inside the `it.skip` body. Each site was removed in turn
     and the suite was re-run: **13 passed both times**. A single-site mutation is invisible to this
     row.
  2. The test asserts the skeleton lands in `tests/integration/<spec-id>/`, while `AC-0008-0010`,
     `BR-0008-0008`, this case's own text and `EX-0008-0009` all name `tests/atdd/spec-NNNN/`. The
     oracle pins a path the spec does not.
  3. The case's second half — that `qfai validate` emits `D-SCAFFOLD-PLACEHOLDER` at `warning` — is
     not exercised at this layer at all.
  The remaining cases in the file have clear named mutations (the refusal messages, the mtime
  equality, the whole-clause path check), so the row is `⚠️` rather than `❌`.
- **TC-0008-0014 × Special values** — `scaffoldEscalateCycles: 1` is exercised as a configured
  special value, and `shouldEscalate(0, 3)` covers a zero counter. A threshold of `0`, a negative
  threshold and a non-numeric threshold are the values a config-driven limit most needs, and none is
  supplied through the command.
- **TC-0008-0014 × Oracle strength** — the row is strong almost throughout: the threshold table pins
  2/3/4 exactly, and the concurrency cases name the lock-free load-mutate-store mutation they exist
  to catch. Two weaknesses keep it off `✅`. The persistence assertion is
  `expect(parsed && typeof parsed === "object").toBe(true)` — a truthiness-shaped check on a value
  whose expected content, a counter of 3 for that `(spec, TC)` pair, is in hand two lines earlier.
  And the case's own text names 3 `qfai validate` cycles while the test drives 3 `runAtddScaffold`
  calls, so escalation is observed through the scaffold command rather than the validate cycle the
  AC specifies.
- **TC-0008-0015 × Equivalence partitions** — seven valid partitions, one per rule, each with its own
  predicate and each required to land in a different section. No invalid partition and no
  special-value partition is represented.
- **TC-0008-0017 × Equivalence partitions** — three vocabulary classes (finding codes, layer tokens,
  annotation tokens) each with a valid representative. No invalid representative for any of them.
- **TC-0008-0018 × Equivalence partitions** — the Scope section is isolated from the rest of the file
  before matching, which is a real partition and the one the obligation is about: a mention elsewhere
  in the prose would satisfy a whole-file scan while the scope statement stayed silent. No invalid
  partition is constructed.
- **TC-0008-0018 × Edge cases** — one edge is guarded, a guidance artifact with no Scope section at
  all. No other edge is identified or tested.

### Business rule table

- **BR-0008-0001 × Positive case** — the mapping is asserted to be declared in `atddTraceability.ts`
  and `SKILL.md`, not to be applied to an annotation in a layer.
- **BR-0008-0001 × Conditional branches** — all three branches (E2E, Integration, API) have a case,
  and every one of them is a declaration check of the kind above.
- **BR-0008-0002 × Positive case** — the forbidden-reference types and the two finding-code literals
  are asserted to be present in source files. Detection is never run.
- **BR-0008-0002 × Conditional branches** — both branches, `tests/api/**` and `tests/e2e/**`, are
  named by those assertions, and neither is exercised on a file.
- **BR-0008-0003 × Positive case** — the signal table the rule qualifies is asserted to be declared
  with its four columns. The rule's own property, that the signals are planning aids rather than
  gates, is not asserted anywhere.
- **BR-0008-0004 × Positive case** — reviewer independence is addressed at the level of `SKILL.md`
  wording: `/independent.*completion-reviewer/i` and `/PASS.*REVISE/`.
- **BR-0008-0004 × Negative case** — the self-approval prohibition is addressed the same way, by
  `Orchestrator MUST NOT` and `/must not.*self-approv/i`, rather than by a refused self-approval.
- **BR-0008-0006 × Positive case** — `TC-0008-0007` asserts that `SKILL.md` mandates the evidence
  file under `.qfai/evidence/`. Nothing checks that a produced evidence file exists there.
- **BR-0008-0007 × Positive case** — the matrix-production obligation has a case, and it searches
  this spec's own Markdown for a phrase the spec contains by construction.
- **BR-0008-0007 × Negative case** — the normal-path-only verdict has a case, and it searches the
  same Markdown the same way rather than producing a verdict from an input.
- **BR-0008-0008 × Negative case** — the emission clause has genuine negative cases: an L1 TC and an
  L4/L5 TC are both refused with a message naming the TC, and the L4/L5 refusal names
  `QFAI-ATDD-123` and the two directories the work belongs in. The placeholder clause's negative —
  that no finding is emitted once the marker is removed — exists only in
  `tests/unit/core/validators/scaffoldPlaceholder.test.ts`, which is an L1 file and outside this
  ATDD row's layer.
- **BR-0008-0008 × Conditional branches** — both sides of "any skeleton whose marker is still
  present" are exercised for the writer: the filled file is preserved, the still-placeholder sibling
  keeps its marker. The validator-emission side of the same condition is not exercised at this layer.
- **BR-0008-0011 × Conditional branches** — the rule permits a worked example only under the "one
  illustration among possible backends" framing. The permitted branch is asserted. The forbidden
  branch — an example without that framing — is not constructed.
- **BR-0008-0012 × Negative case** — "introduces no unit or component obligation" is asserted as a
  required disclaimer inside the Scope section, which is negative in shape. No case plants a unit
  obligation in a fixture and requires the predicate to fire.

## Findings

Six things were found while producing this matrix that the reviewing stage should act on. None of
them is repaired here; this artifact scores coverage and does not edit tests, ledgers or specs.

1. **The ledger is stale for `TDD-0015` … `TDD-0018`.** All four rows read `Status = todo`,
   `Test file` = `—`, `DR-ID` = `—`, `Evidence` = `—`. `tests/integration/atddCredentialReuseGuidance.test.ts`
   carries all four annotations and its 12 cases pass. The CHG-007 notes in the ledger say "every
   row's oracle reads a shipped artifact", which describes the file that exists. The rows need the
   test file, a status and evidence.
2. **`DR-0008-0100` does not exist.** `TDD-0009` and `TDD-0010` are parked as exceptions citing it.
   `07_Decisions.md` declares `DR-0008-0001` and `DR-0008-0003` and reserves `DR-0008-0002`; the
   identifier `DR-0008-0100` appears nowhere under `.qfai/` outside those two rows. An exception
   whose decision record is absent is an unjustified gap wearing a citation, and it is the form the
   depth checklist's REVISE criterion is written against.
3. **`DR-0008-0002` has no record either.** It is described only as "reserved by the v1.7.15 backfill
   exception" in the header line of `07_Decisions.md`. `TDD-0011` and `TDD-0012` cite it as their
   exception basis, so the same concern applies in a weaker form: the citation resolves to a sentence
   about the identifier, not to a decision with a rationale.
4. **The scaffold destination diverges from the spec.** `AC-0008-0010`, `BR-0008-0008`,
   `TC-0008-0013` and `EX-0008-0009` all specify `tests/atdd/spec-NNNN/<TC-ID>.test.*`. The
   implementation writes `<testsDir>/integration/<spec-id>/`, and the passing test asserts the
   implementation's path. One of the two is wrong and neither is flagged, because the oracle was
   written from the code.
5. **`BR-0008-0006` is contradicted by the tree.** It requires that the evidence file "MUST NOT be
   committed to git". `.gitignore` negates `!.qfai/evidence/atdd-*.md` and
   `!.qfai/evidence/coverage-depth-*.md`, `atdd-spec-0012.md` and `atdd-spec-0017.md` are committed,
   and the depth checklist states that the matrix is committed **because** it is a governance record.
   The rule predates that decision and needs a Change Request rather than a test.
6. **Two ATDD test-case annotations sit at the unit layer, where they count for nothing.**
   `tests/unit/core/validators/scaffoldPlaceholder.test.ts` carries `QFAI:SPEC-0008:TC-0008-0013`
   and `QFAI:SPEC-0008:TC-0008-0014`. `catalog/test-layers.md` states that of L1-L3 only L3 owes an
   ATDD annotation, because L1 and L2 have no mandated directory and `QFAI-ATDD-112` does not read
   them; `BR-0008-0001` places `TC-*` annotations in `tests/integration/**`. So those two
   annotations discharge no coverage obligation at the layer their rows are scored at.
   That is worth resolving rather than deleting, because the file holds the strongest coverage in
   the spec for the `D-SCAFFOLD-PLACEHOLDER` lifecycle — the warning, the escalation, the threshold
   override, `scaffoldEscalateCycles: 0`, the fail-soft path and the counter reset — and that is
   exactly the coverage `TC-0008-0013` and `TC-0008-0014` are marked down above for lacking. Moving
   it to L3, or splitting the validator half out, would close several `⚠️` cells.

## Follow-up this matrix does not discharge

There is no `.qfai/evidence/atdd-spec-0008.md`. `QFAI-ATDD-133` requires the stage evidence to carry
a `## Coverage Depth Matrix` section that links to this file and restates the counted totals beside
it. That file belongs to the ATDD stage and is not written here.
