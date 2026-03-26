# Review: Pattern Doubler

- **Reviewer ID**: pattern-doubler
- **Target**: spec-0016
- **Cycle**: 1
- **Date**: 2026-03-20
- **Verdict**: PASS

> Premise: 現状のパターン数では不十分である。ID付き項目数を基準に倍増目標を設定し、追加パターンの根拠を示す。

## ID-Bearing Item Count

| Type      | Current Count | 2× Target |
| --------- | ------------- | --------- |
| US        | 5             | 10        |
| AC        | 35            | 70        |
| BR        | 27            | 54        |
| EX        | 42            | 84        |
| TC        | 29            | 58        |
| **Total** | **138**       | **276**   |

## Doubling Demand Assessment

The pattern-doubler mandate is to demand at least 2× the current count. However, per `rcp_footer.md`: "根拠なしの追加要求は無効" — each addition must be justified by missing perspective (boundary, negative, permission, state-transition, idempotency).

I will analyze each category for genuinely missing patterns before asserting demands.

---

### US Analysis (5 current → demand for 10)

Examining missing user story perspectives:

**US-0016-0001 through US-0016-0005** map cleanly to F-6201 through F-6205. The failure modes are the driver; adding more USs requires identifying additional failure modes not in the current scope.

- Proposed US-0016-0006: "As a developer, I want the RedGreenAuditor to provide diff evidence (before/after test run), so that audit trails capture state transitions, not just outcomes." → Rationale: state-transition perspective; current evidence contract captures commands+results but not diffs.
- Proposed US-0016-0007: "As a maintainer, I want the 10-point checklist to be queryable, so that a checkpoint command can verify the current completion state." → Rationale: observability perspective; currently the checklist is in SKILL.md text but there is no query interface.
- Proposed US-0016-0008 through US-0016-0010: Additional USs would require identifying new failure modes (F-6206+). No such failure modes are defined in the current spec scope.

**Assessment**: US-0016-0006 and US-0016-0007 are genuine boundary extensions but fall outside the scope of v1.6.2 (5 targeted failure modes). Doubling to 10 USs would require inventing out-of-scope failure modes. This is artificially inflating scope, not genuine coverage improvement. Demanding 10 USs without valid failure-mode justification violates the "根拠なしの追加要求は無効" rule.

**Pattern-doubler demand for US: WITHDRAWN** — insufficient justification for out-of-scope addition. Current 5 USs fully cover the 5 targeted failure modes.

---

### AC Analysis (35 current → demand for 70)

Examining missing acceptance criteria perspectives:

**Missing boundary/edge ACs identified:**

1. AC for "parallel dispatch with 3+ independent slices" (current coverage only mentions 2 slices in examples; AC-0016-0023 says "both slices" implying 2-slice minimum — but 3+ slices is untested)
   - Rationale: boundary — the parallelism rules must generalize beyond 2 slices
   - Proposed AC: "Scenario: Three or more independent slices dispatched in parallel — Given 3 slices with no shared dependencies, When parallel dispatch is requested, Then all 3 slices are dispatched in separate worktrees and integration verify runs after all complete"

2. AC for "partial reviewer PASS — one reviewer PASS and one reviewer FAIL" (current ACs cover both-PASS and both-not-run cases, but not the asymmetric case)
   - Rationale: state-transition — the completion prohibition should be clear when only one of two reviewers has passed
   - Proposed AC: "Scenario: One reviewer PASS and one reviewer FAIL on same item — Given TDDSpecReviewer issued PASS and TDDCodeQualityReviewer issued FAIL, When completion is attempted, Then completion is blocked and only the FAIL reviewer's re-approval is required"

3. AC for "evidence entry with future timestamp" (idempotency/temporal boundary)
   - However — the spec uses free-text+labels format, not timestamps. Timestamps are not required fields. This AC is groundless for v1.6.2.
   - **Withdrawn**: no basis in current evidence contract.

4. AC for "evidence format check on spec review result field" — current AC-0016-0017 lists reviewer results as required fields, but there is no AC for what happens when the spec review result field contains a value other than PASS/FAIL (e.g., "PENDING")
   - Rationale: boundary — the valid values for reviewer result fields are unspecified

**Assessment**: ACs 1 and 2 above are genuinely missing boundary and state-transition cases. AC 4 identifies an unspecified boundary but is likely intentionally free-text (the evidence format is free-text+labels, not an enum). Demanding 70 ACs would require padding, but 2-3 genuine additions are justified.

**Pattern-doubler demand for AC: ADVISORY (non-blocking)** — 2 genuinely missing ACs identified (3+ slice parallel dispatch boundary; asymmetric reviewer PASS/FAIL state). These are recommended for v1.6.2 but do not constitute blocking defects because the existing ACs + BRs cover the core prohibition rules correctly. Implementers can treat these as edge cases covered by the general prohibition logic.

---

### BR Analysis (27 current → demand for 54)

The 27 BRs provide comprehensive coverage. Examining gaps:

- Missing BR for "partial reviewer state": BR-0016-0009 and BR-0016-0010 each handle their reviewer independently, but there is no BR explicitly covering the case where both reviewers have been run but with different outcomes. This is implicitly covered (both must PASS) but an explicit BR would improve clarity.
- Missing BR for "N+1 slices parallel dispatch": BR-0016-0017 references "slices" without specifying behavior for N>2 independent slices.

**Assessment**: These are genuine precision gaps but are covered by the union of existing BRs. Demanding 54 BRs would require restatements of existing rules at finer granularity. Non-blocking.

---

### EX Analysis (42 current → demand for 84)

The 42 examples have strong perspective coverage. Examining gaps:

**Missing examples with genuine justification:**

1. EX for "3 independent slices all completing successfully" → Rationale: boundary for N>2 parallel dispatch
2. EX for "one reviewer PASS, other reviewer FAIL — completion blocked" → Rationale: state transition for asymmetric reviewer outcome
3. EX for "forbidden phrase in SKILL.md itself (not just wrappers)" → Rationale: the forbidden phrase guardrail covers SKILL.md too, but all current negative examples target wrappers

**Assessment**: 3 genuinely missing examples. Non-blocking because the general rules cover these cases, but the examples would strengthen the spec.

---

### TC Analysis (29 current → demand for 58)

The 29 TCs are well-distributed. Examining gaps:

**Missing TCs with genuine justification:**

1. TC for "3+ slice parallel dispatch" → L3 Integration; covers AC for N>2 slices
2. TC for "evidence missing only the reviewer result field (not the command fields)" → boundary test distinct from TC-0016-0013 (which covers fully empty evidence)

**Assessment**: 2 genuinely missing TCs. Non-blocking because the existing TCs cover the primary assertions.

---

## Summary

| Category | Current | Demanded | Justified Additions                                                    | Blocking?     |
| -------- | ------- | -------- | ---------------------------------------------------------------------- | ------------- |
| US       | 5       | 10       | 0 (out-of-scope failure modes)                                         | No            |
| AC       | 35      | 70       | 2 (3+ slice parallel; asymmetric reviewer)                             | No — advisory |
| BR       | 27      | 54       | 2 (asymmetric reviewer BR; N>2 slice BR)                               | No — advisory |
| EX       | 42      | 84       | 3 (3-slice happy path; asymmetric reviewer; SKILL.md forbidden phrase) | No — advisory |
| TC       | 29      | 58       | 2 (3-slice TC; partial evidence field TC)                              | No — advisory |

The pattern-doubler demand for full 2× count is **not fully justified** by genuine missing patterns. The spec has unusually strong coverage (138 total ID-bearing items across 10 files). Demanding 276 items would require scope expansion beyond the 5 targeted failure modes or redundant restatements of existing patterns.

**Genuine additions identified: 9 items** (2 AC, 2 BR, 3 EX, 2 TC). These are advisory recommendations for strengthening the spec, not blocking defects.

## Verdict

**PASS** — The spec contains 138 ID-bearing items with strong perspective coverage across happy path, negative path, edge/boundary, permission/role, state transition, and idempotency. Pattern-doubler's 2× demand cannot be fully justified for all categories without scope inflation. 9 genuine missing patterns identified as advisory additions. No blocking pattern gaps found.
