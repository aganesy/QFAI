# 04 Sources

## Source Registry

| SRC-ID   | Title | Path/URL | Kind | Date | Notes |
|----------|-------|----------|------|------|-------|
| SRC-0001 | QFAI v1.7.15 単一PR完了設計書 rev6 | Provided by user: qfai_v1_7_15_packages_qfai_single_pr_completion_design_rev6.md | design-doc | 2026-04-15 | Primary design input; defines WS-1 to WS-7 and DoD |
| SRC-0002 | QFAI v1.7 Canonical Unified Requirements Spec v1.0 | (baseline reference doc) | requirements-spec | 2026 | Referenced as baseline judgment standard |
| SRC-0003 | QFAI v1.7.15-06 Audit Report | (audit report doc) | audit-report | 2026 | Audit findings that triggered rev6; lists 5 unresolved contradictions |
| SRC-0004 | packages/qfai/src/core/prototyping/ | packages/qfai/src/core/prototyping/ | source-code | 2026 | Existing implementation being changed |
| SRC-0005 | packages/qfai/src/core/validators/prototypingEvidence.ts | packages/qfai/src/core/validators/prototypingEvidence.ts | source-code | 2026 | Existing validator implementation |

## Source-to-Requirement Traceability

| SRC-ID   | REQ-IDs Derived | Notes |
|----------|-----------------|-------|
| SRC-0001 WS-1 | REQ-0001, REQ-0002 | mode/surface contract |
| SRC-0001 WS-2 | REQ-0003 | surfacePolicy module |
| SRC-0001 WS-3 | REQ-0004 | calibration SSOT |
| SRC-0001 WS-4 | REQ-0005, REQ-0006 | evidenceRefs traceability |
| SRC-0001 WS-5 | REQ-0007 | review semantics |
| SRC-0001 WS-6 | REQ-0008 | uiFidelityBuilder bug |
| SRC-0001 WS-7 | REQ-0009, REQ-0010 | stale docs/tests cleanup |
| SRC-0003 | REQ-0001 through REQ-0010 | All requirements motivated by audit findings |
