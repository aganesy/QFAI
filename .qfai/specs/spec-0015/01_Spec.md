# 01 Spec

- Spec: spec-0015
- Parent: CAP-0015

## Consumer View

- Primary SSOT for execution: `spec-0015/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In:
  - Validator Phase 2: 5 new error checks for test-list.md (TDDLIST_TC_NOT_COVERED, TDDLIST_EXCEPTION_MISSING_DR, TDDLIST_TEST_FILE_MISSING, TDDLIST_DUPLICATE_ID, TDDLIST_INVALID_ID)
  - Report: unit/component TC coverage summary per spec
  - Template: test-list.md 6→8 required columns (add DR-ID, Evidence)
  - Docs: specs/README.md update for execution ledger contract
  - Assets tests: 8-column template, exception DR-ID contract verification
  - Init tests: generated test-list.md structure verification
  - Verify-pack: new template/docs inclusion, old reference rejection
  - Stale wording cleanup: remove old 3-skill references
- Out:
  - Selector existence check (v1.6.2)
  - Orphan test detection (v1.6.2)
  - Sub-agent roster formalization (v1.6.2)
  - Evidence contract hardening (v1.6.2)
  - Generic spec lint generalization (v1.6.2)

## Applicable NFR

- NFR-0001: Backwards Compatibility — TDDLIST_MISSING remains warning
- NFR-0002: Validation Performance — <2x wall time increase
- NFR-0003: Multi-language Independence — works for .ts, .py, .go, .java paths
- NFR-0004: Error Message Actionability — all Phase 2 errors include file path, row, fix hint
- NFR-0005: Single PR Coherence — all v1.6.1 changes in one PR
- NFR-0006: No Scope Creep — 0 v1.6.2 features in PR

## Applicable Policy

- POL-V001: 1 version = 1 PR (atomic traceability)
- POL-Q001: All Phase 2 checks are error severity
- POL-Q002: No false negatives allowed
- POL-M001: Specs without test-list.md get TDDLIST_MISSING as warning
- POL-M002: Old 6-column format gets TDDLIST_REQUIRED_COLUMN_MISSING as error

## Evidence Summary

- Discussion: `.qfai/discussion/discussion-20260317153106326/`
- Review: `.qfai/review/review-20260317154600000/` (PASS)
- Design: `tmp/qfai_v1.6.1_implementation_design_for_engineers.md`

## Relevant Requirements

- REQ-0001 through REQ-0015 (see 06_REQ.md in discussion pack)

## Entry points

- US range in this spec: US-0015-0001..US-0015-0007
- Primary actors: QFAI user (developer/AI agent), CI/CD pipeline
- Notes: CLI tooling only, no UI requirements

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: multiple valid implementations exist.
- Conflict: NFR / Policy / AC conflict.
- Missing: required constraints or policy are unclear.
- Trade-off: performance vs security vs DX must be decided.

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
