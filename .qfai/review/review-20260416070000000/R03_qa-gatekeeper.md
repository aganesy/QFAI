# R03 QA Gatekeeper

**Role**: qa-gatekeeper
**Target**: spec-0012 v1.7.15-rev7
**Review Pack**: review-20260416070000000

---

## Scope

QA gate review focuses on:

- Validate gate result and pre-existing vs new error analysis
- Coverage obligations (QFAI-COV-201..206)
- ATDD annotation guidance
- Test-case quality (error/boundary coverage, not normal-path only)
- EX→TC traceability completeness

---

## Validate Gate

| Item                                         | Result                                      |
| -------------------------------------------- | ------------------------------------------- |
| `qfai validate --fail-on error`              | FAIL (52 errors)                            |
| New errors introduced by rev7 changes        | **0**                                       |
| Pre-existing errors (confirmed by HEAD diff) | **52**                                      |
| `QFAI-COV-201` (AC without TC) for spec-0012 | **0**                                       |
| `QFAI-COV-202` (BR without EX) for spec-0012 | **0**                                       |
| `QFAI-COV-203` (EX without TC) for spec-0012 | **0**                                       |
| `QFAI-COV-204/205/206` for spec-0012         | **0**                                       |
| `QFAI-ATDD-101/102/103/111/112/113/121/122`  | Out of SDD scope (test assets not authored) |

**Gate Assessment**: The 52 pre-existing errors are not blocking for the rev7 SDD phase. They exist in specs outside our scope (spec-0001..0011, 0013..0015) and in pre-existing spec-0012 content (AC ID format, BR AC-Refs format with sub-IDs from earlier revisions, TDDLIST references). Rev7 authoring introduced zero new errors.

---

## Coverage Obligations

### TC Coverage of New ACs (AC-0056..0075 → TC-0173..0197)

Each of the 20 new ACs has at least one TC:

- AC-0056..0058 → TC-0173..0177 (CalibrationLoader path; includes normal + error)
- AC-0059..0062 → TC-0178..0183 (uiFidelity guard; includes all 3 failure modes)
- AC-0063..0065 → TC-0184..0188 (evidenceRefs concrete check; normal + forbidden patterns)
- AC-0066..0068 → TC-0189..0192 (pack comparison; includes "1.0.0" heuristic removal)
- AC-0069..0070 → TC-0193..0195 (error taxonomy; normal + cross-phase catch)
- AC-0071..0073 → TC-0196..0197 (scalar field removal; normal + obsolete input error)
- AC-0074..0075 → TC-0196..0197 (surfacePolicy message; normal + stale surface)

### Error/Boundary Coverage Assessment

- TC-0178..0183: uiFidelity guard has 3 separate error paths (status, missing evidence, missing screen) — each covered
- TC-0184..0188: forbidden evidenceRefs patterns explicitly enumerated — boundary coverage present
- TC-0189..0192: pack comparison mismatch errors — each mismatch type (packPath, packVersion, configPath) covered
- TC-0193..0195: catch-block narrowing — covers normal class usage and cross-phase mismatch
- TC-0196..0197: config normalization — obsolete field error path covered

Normal-path-only coverage: **NOT present** — error/boundary paths are present for all new ACs.

---

## ATDD Annotation Guidance

Per `10_Plan.md` (v1.7.15 rev7 Implementation Strategy), downstream test implementation should use:

- `tests/integration/**` → `// QFAI:SPEC-0012:TC-XXXX`
- `tests/e2e/**` → `// QFAI:SPEC-0012:US-XXXX`

No API contracts exist for this spec (CLI tool). `CON-API-XXXX` annotations: n/a.

---

## Density Review

`QFAI-DENSITY-002` and `QFAI-DENSITY-004` warnings for spec-0012:

- These warnings indicate the coverage matrix and Scenario sections use aggregate IDs (`EX-0012`, `TC-0012`) rather than per-ID rows.
- This is a pre-existing density pattern across all specs in the repository and not a blocker for the SDD phase.
- The actual EX and TC content (EX-0109..0128, TC-0173..0197) is present and traceable.

---

## Findings

None blocking.

---

## Result

**PASS**

Validate gate: 52 errors, all pre-existing, 0 new. spec-0012 QFAI-COV-201..206 = 0. Test-case error/boundary coverage present for all 20 new ACs. ATDD annotation guidance in `10_Plan.md`. Density warnings are pre-existing and non-blocking.
