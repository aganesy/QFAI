# Coverage Depth Matrix — spec-0018

## Scope

This matrix scores every active obligation the pack declares: the **10 user stories** of
`02_User-stories.md`, the **269 test cases** of `06_Test-Cases.md`, and the **129 business rules**
of `04_Business-Rules.md`. All three sets are read from the pack, not from the ledger.

The marks are derived from `.qfai/specs/spec-0018/tdd/test-list.md` as it stands on 2026-09-25, by the rules
below. A mark records what the ledger shows was run: a row's status, and whether its evidence
records an assertion that failed before the change and passed after it. It is not a reviewer's
reading of the assertions, and a reviewer who reads one and disagrees overrides the mark.

`Status` is a row verdict, not a mark, and is outside every total.

## How each cell is scored

- **A test case is one scenario of its declared `Type`.** The column that `Type` names — `normal`,
  `error`, `edge` or `boundary`; a case with no `Type` owes the normal path — is scored from the
  ledger rows citing the case: ✅ when every row is closed and records `RED:fail` or
  `RED:falsifiability` with `GREEN:pass`, ⚠️ when a row is closed without a failing RED or a row
  is still open beside a closed one, ❌ when no row is closed.
- **`Normal path` is `n/a` on a case that declares a non-normal `Type`.** Its normal sibling
  carries it, as the template states.
- **`Equivalence partitions` is scored on a case only when the case is a matrix**: two or more
  ledger rows with distinct `Boundary` values, one per partition. It takes the case's mark.
- **Every other depth column of a case is `n/a`.** One case is one scenario; the category is
  scored on the story row, which aggregates every case tracing to the story.
- **`Oracle strength`** is ✅ when every row records a failing RED, ⚠️ when a closed row records
  none, and ❌ when no row is closed.
- **A story row** takes `Normal path` and `Oracle strength` from the story's E2E ledger rows, and
  `Equivalence partitions`, `Error path`, `Edge cases` and `Boundary values` from the cases that
  trace to it through its acceptance criteria: ✅ when every such case is covered, ❌ when none
  is, ⚠️ otherwise. A category with no such case is `n/a`: the pack declares no obligation of
  that kind for the story.
- **`Special values`, `State transitions` and `Combinatorial` are `n/a` on every row.** The
  pack's `Type` vocabulary has no such category, so no case declares one. A case exercising a
  state change is scored under the `Type` it declares.
- **A business rule** is covered by the cases whose ledger rows name it in `BR-Ref`, or, where no
  row does, by the cases sharing one of its acceptance criteria. `Positive case` reads its normal
  cases, `Negative case` its error, edge and boundary cases (`n/a` when it has none), and
  `Conditional branches` is `n/a` unless the rule text states a condition.

## The matrix

| US/TC ID | Equivalence partitions | Normal path | Error path | Edge cases | Boundary values | Special values | State transitions | Combinatorial | Oracle strength | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| US-0018-0001 | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| US-0018-0002 | ✅ | ❌ | ✅ | n/a | ✅ | n/a | n/a | n/a | ❌ | ❌ |
| US-0018-0003 | ✅ | ❌ | ✅ | n/a | n/a | n/a | n/a | n/a | ❌ | ❌ |
| US-0018-0004 | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| US-0018-0005 | ✅ | ✅ | ✅ | ✅ | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| US-0018-0006 | ✅ | ✅ | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| US-0018-0007 | ✅ | ❌ | n/a | n/a | n/a | n/a | n/a | n/a | ❌ | ❌ |
| US-0018-0008 | ✅ | ✅ | ✅ | n/a | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| US-0018-0009 | ✅ | ✅ | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| US-0018-0010 | ✅ | ✅ | ✅ | n/a | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0001 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0002 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0003 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0004 | n/a | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0005 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0006 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0007 | n/a | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0008 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0009 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0010 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0011 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0012 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0013 | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0014 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0015 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0016 | ✅ | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0017 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0238 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0018 | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0019 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0020 | ✅ | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0021 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0022 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0023 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0024 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0025 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0026 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0027 | ✅ | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0028 | n/a | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0029 | ✅ | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0030 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0031 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0032 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0033 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0034 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0035 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0036 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0037 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0038 | n/a | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0039 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0040 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0041 | n/a | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0042 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0043 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0044 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0239 | ✅ | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0240 | ✅ | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0045 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0046 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0047 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0048 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0049 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0050 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0051 | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0052 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0053 | ✅ | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0054 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0055 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0056 | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0057 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0058 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0059 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0246 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0247 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0248 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0249 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0250 | ✅ | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0251 | n/a | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0254 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0255 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0256 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0257 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0258 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0259 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0260 | ✅ | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0261 | n/a | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0262 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0263 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0264 | ✅ | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0265 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0266 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0267 | n/a | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0268 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0269 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0060 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0061 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0062 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0063 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0064 | n/a | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0065 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0066 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0067 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0068 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0069 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0070 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0071 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0072 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0073 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0074 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0075 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0076 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0077 | ✅ | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0078 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0079 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0080 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0081 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0082 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0083 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0084 | ✅ | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0085 | n/a | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0086 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0087 | ✅ | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0088 | ✅ | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0089 | n/a | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0090 | ✅ | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0091 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0092 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0093 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0094 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0241 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0242 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0095 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0096 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0097 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0098 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0099 | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0100 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0101 | ✅ | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0102 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0103 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0104 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0105 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0106 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0107 | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0108 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0109 | n/a | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0110 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0111 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0112 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0113 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0114 | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0115 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0116 | ✅ | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0117 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0118 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0119 | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0120 | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0121 | n/a | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0122 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0123 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0124 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0125 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0126 | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0127 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0128 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0129 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0130 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0131 | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0132 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0133 | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0134 | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0135 | ✅ | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0136 | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0137 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0138 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0139 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0140 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0141 | ✅ | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0142 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0143 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0144 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0145 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0146 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0147 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0148 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0149 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0150 | n/a | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0151 | n/a | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0152 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0153 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0154 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0155 | n/a | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0156 | ✅ | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0157 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0158 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0159 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0160 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0161 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0162 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0163 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0164 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0165 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0166 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0167 | ✅ | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0168 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0169 | ✅ | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0170 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0171 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0172 | ✅ | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0173 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0174 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0175 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0176 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0177 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0178 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0179 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0180 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0181 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0182 | n/a | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0183 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0184 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0185 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0186 | ✅ | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0187 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0188 | ✅ | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0189 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0190 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0191 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0192 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0193 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0194 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0195 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0196 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0197 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0198 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0199 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0200 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0201 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0202 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0203 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0204 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0205 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0206 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0252 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0243 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0244 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0245 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0207 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0208 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0209 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0210 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0211 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0212 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0213 | ✅ | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0253 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0214 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0215 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0216 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0217 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0218 | ✅ | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0219 | ✅ | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0220 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0221 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0222 | n/a | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0223 | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0224 | n/a | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0225 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0226 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0227 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0228 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0229 | n/a | n/a | n/a | n/a | ✅ | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0230 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0231 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0232 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0233 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0234 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0235 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0236 | n/a | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0018-0237 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |

Matrix: **US 10 / TC 269**; scored cells **✅ 644 / ⚠️ 0 / ❌ 6** and n/a 1861;
status **✅ 276 / ⚠️ 0 / ❌ 3**.

### Business rule coverage (§7)

| BR ID | Positive case | Negative case | Conditional branches | Covering TC | Status |
| --- | --- | --- | --- | --- | --- |
| BR-0018-0001 | ✅ | n/a | ⚠️ | TC-0018-0001, TC-0018-0002 | ⚠️ |
| BR-0018-0002 | ✅ | ✅ | n/a | TC-0018-0003, TC-0018-0268 | ✅ |
| BR-0018-0003 | ⚠️ | ✅ | n/a | TC-0018-0004 | ⚠️ |
| BR-0018-0004 | ✅ | n/a | n/a | TC-0018-0005 | ✅ |
| BR-0018-0005 | ⚠️ | ✅ | ⚠️ | TC-0018-0006, TC-0018-0007 | ⚠️ |
| BR-0018-0006 | ✅ | n/a | n/a | TC-0018-0008, TC-0018-0009 | ✅ |
| BR-0018-0007 | ✅ | n/a | n/a | TC-0018-0010, TC-0018-0011 | ✅ |
| BR-0018-0008 | ⚠️ | ✅ | n/a | TC-0018-0012, TC-0018-0013, TC-0018-0014, TC-0018-0269 | ⚠️ |
| BR-0018-0009 | ✅ | n/a | n/a | TC-0018-0015 | ✅ |
| BR-0018-0010 | ✅ | n/a | ⚠️ | TC-0018-0016 | ⚠️ |
| BR-0018-0011 | ✅ | ✅ | n/a | TC-0018-0017, TC-0018-0238 | ✅ |
| BR-0018-0012 | ⚠️ | ✅ | ⚠️ | TC-0018-0018 | ⚠️ |
| BR-0018-0013 | ✅ | n/a | ⚠️ | TC-0018-0019 | ⚠️ |
| BR-0018-0014 | ✅ | n/a | n/a | TC-0018-0020 | ✅ |
| BR-0018-0015 | ✅ | ✅ | n/a | TC-0018-0021, TC-0018-0022, TC-0018-0023 | ✅ |
| BR-0018-0016 | ✅ | n/a | n/a | TC-0018-0024 | ✅ |
| BR-0018-0017 | ✅ | ✅ | n/a | TC-0018-0025, TC-0018-0026 | ✅ |
| BR-0018-0018 | ✅ | ✅ | n/a | TC-0018-0027, TC-0018-0028, TC-0018-0029 | ✅ |
| BR-0018-0019 | ✅ | ✅ | n/a | TC-0018-0030, TC-0018-0031, TC-0018-0039 | ✅ |
| BR-0018-0020 | ⚠️ | ✅ | n/a | TC-0018-0032, TC-0018-0033 | ⚠️ |
| BR-0018-0021 | ⚠️ | ✅ | n/a | TC-0018-0034 | ⚠️ |
| BR-0018-0022 | ✅ | ✅ | n/a | TC-0018-0035, TC-0018-0036 | ✅ |
| BR-0018-0023 | ✅ | ✅ | n/a | TC-0018-0037, TC-0018-0038 | ✅ |
| BR-0018-0024 | ✅ | ✅ | n/a | TC-0018-0040, TC-0018-0041 | ✅ |
| BR-0018-0025 | ✅ | n/a | ⚠️ | TC-0018-0042 | ⚠️ |
| BR-0018-0026 | ✅ | ✅ | n/a | TC-0018-0043, TC-0018-0044, TC-0018-0239, TC-0018-0240 | ✅ |
| BR-0018-0027 | ✅ | n/a | ⚠️ | TC-0018-0045 | ⚠️ |
| BR-0018-0028 | ⚠️ | ✅ | n/a | TC-0018-0046 | ⚠️ |
| BR-0018-0029 | ✅ | ✅ | n/a | TC-0018-0047, TC-0018-0048 | ✅ |
| BR-0018-0030 | ✅ | n/a | n/a | TC-0018-0049, TC-0018-0050 | ✅ |
| BR-0018-0031 | ⚠️ | ✅ | n/a | TC-0018-0051, TC-0018-0052, TC-0018-0053, TC-0018-0056 | ⚠️ |
| BR-0018-0032 | ⚠️ | ✅ | n/a | TC-0018-0054, TC-0018-0055 | ⚠️ |
| BR-0018-0033 | ⚠️ | ✅ | n/a | TC-0018-0057 | ⚠️ |
| BR-0018-0034 | ✅ | ✅ | n/a | TC-0018-0058, TC-0018-0059, TC-0018-0060 | ✅ |
| BR-0018-0035 | ⚠️ | ✅ | n/a | TC-0018-0061, TC-0018-0062 | ⚠️ |
| BR-0018-0036 | ✅ | ✅ | ✅ | TC-0018-0063, TC-0018-0064, TC-0018-0065 | ✅ |
| BR-0018-0037 | ✅ | n/a | n/a | TC-0018-0066 | ✅ |
| BR-0018-0038 | ✅ | n/a | n/a | TC-0018-0067 | ✅ |
| BR-0018-0039 | ✅ | ✅ | n/a | TC-0018-0068, TC-0018-0069 | ✅ |
| BR-0018-0040 | ⚠️ | ✅ | n/a | TC-0018-0070 | ⚠️ |
| BR-0018-0041 | ✅ | ✅ | ✅ | TC-0018-0071, TC-0018-0072 | ✅ |
| BR-0018-0042 | ✅ | n/a | n/a | TC-0018-0073 | ✅ |
| BR-0018-0043 | ✅ | n/a | n/a | TC-0018-0074 | ✅ |
| BR-0018-0044 | ✅ | n/a | n/a | TC-0018-0075 | ✅ |
| BR-0018-0045 | ✅ | n/a | n/a | TC-0018-0076 | ✅ |
| BR-0018-0046 | ✅ | n/a | n/a | TC-0018-0077 | ✅ |
| BR-0018-0047 | ✅ | ✅ | ✅ | TC-0018-0078, TC-0018-0083 | ✅ |
| BR-0018-0048 | ✅ | ✅ | n/a | TC-0018-0079, TC-0018-0080 | ✅ |
| BR-0018-0049 | ⚠️ | ✅ | n/a | TC-0018-0081 | ⚠️ |
| BR-0018-0050 | ✅ | n/a | n/a | TC-0018-0082 | ✅ |
| BR-0018-0051 | ✅ | n/a | n/a | TC-0018-0084 | ✅ |
| BR-0018-0052 | ⚠️ | ✅ | n/a | TC-0018-0085 | ⚠️ |
| BR-0018-0053 | ✅ | ✅ | ✅ | TC-0018-0086, TC-0018-0087 | ✅ |
| BR-0018-0054 | ✅ | ✅ | n/a | TC-0018-0088, TC-0018-0089, TC-0018-0090 | ✅ |
| BR-0018-0055 | ✅ | n/a | n/a | TC-0018-0091 | ✅ |
| BR-0018-0056 | ✅ | n/a | n/a | TC-0018-0092 | ✅ |
| BR-0018-0057 | ✅ | n/a | ⚠️ | TC-0018-0093 | ⚠️ |
| BR-0018-0058 | ✅ | n/a | n/a | TC-0018-0094, TC-0018-0241, TC-0018-0242 | ✅ |
| BR-0018-0059 | ⚠️ | ✅ | n/a | TC-0018-0095, TC-0018-0096, TC-0018-0097, TC-0018-0098 | ⚠️ |
| BR-0018-0060 | ⚠️ | ✅ | n/a | TC-0018-0099, TC-0018-0100, TC-0018-0101 | ⚠️ |
| BR-0018-0061 | ⚠️ | ✅ | n/a | TC-0018-0102, TC-0018-0103, TC-0018-0104 | ⚠️ |
| BR-0018-0062 | ✅ | n/a | n/a | TC-0018-0105 | ✅ |
| BR-0018-0063 | ⚠️ | ✅ | n/a | TC-0018-0106, TC-0018-0107 | ⚠️ |
| BR-0018-0064 | ✅ | ✅ | n/a | TC-0018-0108, TC-0018-0109 | ✅ |
| BR-0018-0065 | ✅ | n/a | n/a | TC-0018-0110 | ✅ |
| BR-0018-0066 | ✅ | n/a | n/a | TC-0018-0111 | ✅ |
| BR-0018-0067 | ✅ | ✅ | n/a | TC-0018-0112, TC-0018-0113, TC-0018-0114 | ✅ |
| BR-0018-0068 | ✅ | ✅ | ✅ | TC-0018-0115, TC-0018-0116 | ✅ |
| BR-0018-0069 | ⚠️ | ✅ | n/a | TC-0018-0117, TC-0018-0118, TC-0018-0119, TC-0018-0120, TC-0018-0121 | ⚠️ |
| BR-0018-0070 | ⚠️ | ✅ | n/a | TC-0018-0122 | ⚠️ |
| BR-0018-0071 | ✅ | ✅ | n/a | TC-0018-0123, TC-0018-0124, TC-0018-0125, TC-0018-0126 | ✅ |
| BR-0018-0072 | ✅ | ✅ | n/a | TC-0018-0127, TC-0018-0128, TC-0018-0129, TC-0018-0130 | ✅ |
| BR-0018-0073 | ✅ | ✅ | n/a | TC-0018-0131, TC-0018-0132, TC-0018-0133, TC-0018-0134 | ✅ |
| BR-0018-0074 | ✅ | ✅ | n/a | TC-0018-0135, TC-0018-0136, TC-0018-0137, TC-0018-0138 | ✅ |
| BR-0018-0075 | ✅ | n/a | n/a | TC-0018-0139 | ✅ |
| BR-0018-0076 | ✅ | n/a | n/a | TC-0018-0140 | ✅ |
| BR-0018-0077 | ✅ | ✅ | n/a | TC-0018-0141, TC-0018-0142, TC-0018-0143, TC-0018-0144, TC-0018-0145, TC-0018-0146, TC-0018-0147, TC-0018-0148, TC-0018-0149, TC-0018-0150 | ✅ |
| BR-0018-0078 | ⚠️ | ✅ | n/a | TC-0018-0151, TC-0018-0152 | ⚠️ |
| BR-0018-0079 | ✅ | n/a | n/a | TC-0018-0153 | ✅ |
| BR-0018-0080 | ⚠️ | ✅ | n/a | TC-0018-0154 | ⚠️ |
| BR-0018-0081 | ⚠️ | ✅ | n/a | TC-0018-0155, TC-0018-0156 | ⚠️ |
| BR-0018-0082 | ✅ | n/a | n/a | TC-0018-0157 | ✅ |
| BR-0018-0083 | ⚠️ | ✅ | n/a | TC-0018-0158 | ⚠️ |
| BR-0018-0084 | ✅ | n/a | n/a | TC-0018-0159 | ✅ |
| BR-0018-0085 | ✅ | n/a | n/a | TC-0018-0160 | ✅ |
| BR-0018-0086 | ✅ | ✅ | n/a | TC-0018-0161, TC-0018-0162, TC-0018-0163 | ✅ |
| BR-0018-0087 | ✅ | n/a | n/a | TC-0018-0164, TC-0018-0165 | ✅ |
| BR-0018-0088 | ✅ | n/a | n/a | TC-0018-0166 | ✅ |
| BR-0018-0089 | ✅ | n/a | n/a | TC-0018-0167 | ✅ |
| BR-0018-0090 | ✅ | n/a | n/a | TC-0018-0168 | ✅ |
| BR-0018-0091 | ✅ | n/a | n/a | TC-0018-0169 | ✅ |
| BR-0018-0092 | ✅ | n/a | n/a | TC-0018-0170 | ✅ |
| BR-0018-0093 | ✅ | n/a | n/a | TC-0018-0171, TC-0018-0172 | ✅ |
| BR-0018-0094 | ✅ | ✅ | n/a | TC-0018-0173, TC-0018-0174 | ✅ |
| BR-0018-0095 | ⚠️ | ✅ | n/a | TC-0018-0175 | ⚠️ |
| BR-0018-0096 | ⚠️ | ✅ | n/a | TC-0018-0176, TC-0018-0177, TC-0018-0178 | ⚠️ |
| BR-0018-0097 | ⚠️ | ✅ | ⚠️ | TC-0018-0179, TC-0018-0180, TC-0018-0181, TC-0018-0182 | ⚠️ |
| BR-0018-0098 | ✅ | n/a | n/a | TC-0018-0183 | ✅ |
| BR-0018-0099 | ⚠️ | ✅ | n/a | TC-0018-0184, TC-0018-0185, TC-0018-0186 | ⚠️ |
| BR-0018-0100 | ✅ | ✅ | n/a | TC-0018-0187, TC-0018-0188 | ✅ |
| BR-0018-0101 | ✅ | n/a | n/a | TC-0018-0189 | ✅ |
| BR-0018-0102 | ⚠️ | ✅ | n/a | TC-0018-0190 | ⚠️ |
| BR-0018-0103 | ✅ | ✅ | n/a | TC-0018-0191, TC-0018-0192, TC-0018-0193, TC-0018-0194, TC-0018-0195, TC-0018-0196, TC-0018-0197, TC-0018-0198, TC-0018-0199, TC-0018-0200, TC-0018-0201, TC-0018-0202, TC-0018-0203, TC-0018-0204, TC-0018-0205, TC-0018-0206, TC-0018-0252, TC-0018-0243, TC-0018-0244, TC-0018-0245, TC-0018-0207, TC-0018-0208 | ✅ |
| BR-0018-0104 | ✅ | n/a | n/a | TC-0018-0209 | ✅ |
| BR-0018-0105 | ✅ | ✅ | n/a | TC-0018-0210, TC-0018-0211 | ✅ |
| BR-0018-0106 | ✅ | n/a | n/a | TC-0018-0212 | ✅ |
| BR-0018-0107 | ✅ | n/a | ⚠️ | TC-0018-0213, TC-0018-0253 | ⚠️ |
| BR-0018-0108 | ✅ | ✅ | n/a | TC-0018-0214, TC-0018-0215 | ✅ |
| BR-0018-0109 | ✅ | ✅ | n/a | TC-0018-0216, TC-0018-0217 | ✅ |
| BR-0018-0110 | ✅ | n/a | n/a | TC-0018-0218, TC-0018-0219 | ✅ |
| BR-0018-0111 | ✅ | ✅ | n/a | TC-0018-0220, TC-0018-0221, TC-0018-0222 | ✅ |
| BR-0018-0112 | ✅ | ✅ | n/a | TC-0018-0223, TC-0018-0224, TC-0018-0225 | ✅ |
| BR-0018-0113 | ✅ | n/a | n/a | TC-0018-0226 | ✅ |
| BR-0018-0114 | ✅ | ✅ | n/a | TC-0018-0227, TC-0018-0228 | ✅ |
| BR-0018-0115 | ⚠️ | ✅ | n/a | TC-0018-0229 | ⚠️ |
| BR-0018-0116 | ✅ | n/a | n/a | TC-0018-0230 | ✅ |
| BR-0018-0117 | ✅ | n/a | n/a | TC-0018-0231 | ✅ |
| BR-0018-0118 | ✅ | n/a | n/a | TC-0018-0232 | ✅ |
| BR-0018-0119 | ✅ | n/a | n/a | TC-0018-0233 | ✅ |
| BR-0018-0120 | ✅ | n/a | n/a | TC-0018-0234 | ✅ |
| BR-0018-0121 | ✅ | ✅ | n/a | TC-0018-0235, TC-0018-0236 | ✅ |
| BR-0018-0122 | ✅ | n/a | n/a | TC-0018-0237 | ✅ |
| BR-0018-0123 | ✅ | ✅ | n/a | TC-0018-0246, TC-0018-0247, TC-0018-0248, TC-0018-0249, TC-0018-0250, TC-0018-0251 | ✅ |
| BR-0018-0124 | ⚠️ | ✅ | n/a | TC-0018-0255 | ⚠️ |
| BR-0018-0126 | ✅ | n/a | n/a | TC-0018-0254 | ✅ |
| BR-0018-0125 | ✅ | ✅ | n/a | TC-0018-0256, TC-0018-0257, TC-0018-0258, TC-0018-0259, TC-0018-0260, TC-0018-0261 | ✅ |
| BR-0018-0127 | ✅ | ✅ | n/a | TC-0018-0262, TC-0018-0263, TC-0018-0264 | ✅ |
| BR-0018-0128 | ⚠️ | ✅ | n/a | TC-0018-0265 | ⚠️ |
| BR-0018-0129 | ✅ | ✅ | n/a | TC-0018-0266, TC-0018-0267 | ✅ |

Business rules: **BR 129**; scored cells **✅ 176 / ⚠️ 42 / ❌ 0** and n/a 169;
status **✅ 90 / ⚠️ 39 / ❌ 0**.

## Every ❌ cell, named

6 cell(s), each with the reason its mark was derived.

Each is an open gap, not an exemption: the ledger row that would cover it is still open.

- `US-0018-0002` · Normal path: the story's E2E ledger rows; no ledger row is closed (TDD-0456 todo).
- `US-0018-0002` · Oracle strength: the story's E2E rows: no row of the obligation is closed, so no assertion has been run against it.
- `US-0018-0003` · Normal path: the story's E2E ledger rows; no ledger row is closed (TDD-0457 todo).
- `US-0018-0003` · Oracle strength: the story's E2E rows: no row of the obligation is closed, so no assertion has been run against it.
- `US-0018-0007` · Normal path: the story's E2E ledger rows; no ledger row is closed (TDD-0461 todo).
- `US-0018-0007` · Oracle strength: the story's E2E rows: no row of the obligation is closed, so no assertion has been run against it.

## Every ⚠️ cell, named

42 cell(s), each with the reason its mark was derived.

- `BR-0018-0001` · Conditional branches: the rule is conditional and only one side of its condition has a case.
- `BR-0018-0003` · Positive case: only non-normal cases cover it (TC-0018-0004; the ledger rows naming it in `BR-Ref`).
- `BR-0018-0005` · Positive case: only non-normal cases cover it (TC-0018-0006, TC-0018-0007; the ledger rows naming it in `BR-Ref`).
- `BR-0018-0005` · Conditional branches: the rule is conditional and only one side of its condition has a case.
- `BR-0018-0008` · Positive case: only non-normal cases cover it (TC-0018-0012, TC-0018-0013, TC-0018-0014, TC-0018-0269; the ledger rows naming it in `BR-Ref`).
- `BR-0018-0010` · Conditional branches: the rule is conditional and only one side of its condition has a case.
- `BR-0018-0012` · Positive case: only non-normal cases cover it (TC-0018-0018; the ledger rows naming it in `BR-Ref`).
- `BR-0018-0012` · Conditional branches: the rule is conditional and only one side of its condition has a case.
- `BR-0018-0013` · Conditional branches: the rule is conditional and only one side of its condition has a case.
- `BR-0018-0020` · Positive case: only non-normal cases cover it (TC-0018-0032, TC-0018-0033; the ledger rows naming it in `BR-Ref`).
- `BR-0018-0021` · Positive case: only non-normal cases cover it (TC-0018-0034; the ledger rows naming it in `BR-Ref`).
- `BR-0018-0025` · Conditional branches: the rule is conditional and only one side of its condition has a case.
- `BR-0018-0027` · Conditional branches: the rule is conditional and only one side of its condition has a case.
- `BR-0018-0028` · Positive case: only non-normal cases cover it (TC-0018-0046; the ledger rows naming it in `BR-Ref`).
- `BR-0018-0031` · Positive case: only non-normal cases cover it (TC-0018-0051, TC-0018-0052, TC-0018-0053, TC-0018-0056; the ledger rows naming it in `BR-Ref`).
- `BR-0018-0032` · Positive case: only non-normal cases cover it (TC-0018-0054, TC-0018-0055; the ledger rows naming it in `BR-Ref`).
- `BR-0018-0033` · Positive case: only non-normal cases cover it (TC-0018-0057; the ledger rows naming it in `BR-Ref`).
- `BR-0018-0035` · Positive case: only non-normal cases cover it (TC-0018-0061, TC-0018-0062; the ledger rows naming it in `BR-Ref`).
- `BR-0018-0040` · Positive case: only non-normal cases cover it (TC-0018-0070; the ledger rows naming it in `BR-Ref`).
- `BR-0018-0049` · Positive case: only non-normal cases cover it (TC-0018-0081; the ledger rows naming it in `BR-Ref`).
- `BR-0018-0052` · Positive case: only non-normal cases cover it (TC-0018-0085; the ledger rows naming it in `BR-Ref`).
- `BR-0018-0057` · Conditional branches: the rule is conditional and only one side of its condition has a case.
- `BR-0018-0059` · Positive case: only non-normal cases cover it (TC-0018-0095, TC-0018-0096, TC-0018-0097, TC-0018-0098; the ledger rows naming it in `BR-Ref`).
- `BR-0018-0060` · Positive case: only non-normal cases cover it (TC-0018-0099, TC-0018-0100, TC-0018-0101; the ledger rows naming it in `BR-Ref`).
- `BR-0018-0061` · Positive case: only non-normal cases cover it (TC-0018-0102, TC-0018-0103, TC-0018-0104; the ledger rows naming it in `BR-Ref`).
- `BR-0018-0063` · Positive case: only non-normal cases cover it (TC-0018-0106, TC-0018-0107; the ledger rows naming it in `BR-Ref`).
- `BR-0018-0069` · Positive case: only non-normal cases cover it (TC-0018-0117, TC-0018-0118, TC-0018-0119, TC-0018-0120, TC-0018-0121; the ledger rows naming it in `BR-Ref`).
- `BR-0018-0070` · Positive case: only non-normal cases cover it (TC-0018-0122; the ledger rows naming it in `BR-Ref`).
- `BR-0018-0078` · Positive case: only non-normal cases cover it (TC-0018-0151, TC-0018-0152; the ledger rows naming it in `BR-Ref`).
- `BR-0018-0080` · Positive case: only non-normal cases cover it (TC-0018-0154; the ledger rows naming it in `BR-Ref`).
- `BR-0018-0081` · Positive case: only non-normal cases cover it (TC-0018-0155, TC-0018-0156; the ledger rows naming it in `BR-Ref`).
- `BR-0018-0083` · Positive case: only non-normal cases cover it (TC-0018-0158; the ledger rows naming it in `BR-Ref`).
- `BR-0018-0095` · Positive case: only non-normal cases cover it (TC-0018-0175; the ledger rows naming it in `BR-Ref`).
- `BR-0018-0096` · Positive case: only non-normal cases cover it (TC-0018-0176, TC-0018-0177, TC-0018-0178; the ledger rows naming it in `BR-Ref`).
- `BR-0018-0097` · Positive case: only non-normal cases cover it (TC-0018-0179, TC-0018-0180, TC-0018-0181, TC-0018-0182; the ledger rows naming it in `BR-Ref`).
- `BR-0018-0097` · Conditional branches: the rule is conditional and only one side of its condition has a case.
- `BR-0018-0099` · Positive case: only non-normal cases cover it (TC-0018-0184, TC-0018-0185, TC-0018-0186; the ledger rows naming it in `BR-Ref`).
- `BR-0018-0102` · Positive case: only non-normal cases cover it (TC-0018-0190; the ledger rows naming it in `BR-Ref`).
- `BR-0018-0107` · Conditional branches: the rule is conditional and only one side of its condition has a case.
- `BR-0018-0115` · Positive case: only non-normal cases cover it (TC-0018-0229; the ledger rows naming it in `BR-Ref`).
- `BR-0018-0124` · Positive case: only non-normal cases cover it (TC-0018-0255; the ledger rows naming it in `BR-Ref`).
- `BR-0018-0128` · Positive case: only non-normal cases cover it (TC-0018-0265; the ledger rows naming it in `BR-Ref`).

## Story cells scored n/a

Beyond the three columns no case declares, these story cells are `n/a` because no case of
that kind traces to the story. A reviewer who finds such an obligation in the story's criteria
scores the cell ❌ and names the missing case.

- `US-0018-0002` · Edge cases: no case of `Type` edge traces to this story, so the pack declares no such obligation for it.
- `US-0018-0003` · Edge cases: no case of `Type` edge traces to this story, so the pack declares no such obligation for it.
- `US-0018-0003` · Boundary values: no case of `Type` boundary traces to this story, so the pack declares no such obligation for it.
- `US-0018-0006` · Edge cases: no case of `Type` edge traces to this story, so the pack declares no such obligation for it.
- `US-0018-0006` · Boundary values: no case of `Type` boundary traces to this story, so the pack declares no such obligation for it.
- `US-0018-0007` · Error path: no case of `Type` error traces to this story, so the pack declares no such obligation for it.
- `US-0018-0007` · Edge cases: no case of `Type` edge traces to this story, so the pack declares no such obligation for it.
- `US-0018-0007` · Boundary values: no case of `Type` boundary traces to this story, so the pack declares no such obligation for it.
- `US-0018-0008` · Edge cases: no case of `Type` edge traces to this story, so the pack declares no such obligation for it.
- `US-0018-0009` · Edge cases: no case of `Type` edge traces to this story, so the pack declares no such obligation for it.
- `US-0018-0009` · Boundary values: no case of `Type` boundary traces to this story, so the pack declares no such obligation for it.
- `US-0018-0010` · Edge cases: no case of `Type` edge traces to this story, so the pack declares no such obligation for it.

## What this matrix does not claim

It does not read an assertion. A ✅ says the ledger records a case that failed before the change and
passed after it; whether that case asserts all of its obligation is the reviewer's judgement. The
`n/a` cells classify by the declared `Type`, not by reading each criterion.
