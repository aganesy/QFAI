# 04 Sources

## Source Registry

| SRC-ID  | Title                                                                       | Type              | Location / Reference                                                          | Role         |
|---------|-----------------------------------------------------------------------------|-------------------|-------------------------------------------------------------------------------|--------------|
| SRC-0001 | qfai_v1_7_15_packages_qfai_single_pr_completion_design_rev7.md             | Design document   | Provided by user; primary input for this discussion                           | Primary      |
| SRC-0002 | qfai_v1_7_15_07_packages_qfai_audit_report.md                              | Audit report      | v1.7.15-07 audit; source of the 6 contract gap findings                       | Normative    |
| SRC-0003 | qfai_v1_7_canonical_unified_requirements_spec_design_v1.0.md               | Canonical spec    | QFAI v1.7 unified requirements and spec design; top-level authority           | Normative    |
| SRC-0004 | discussion-20260415161758193 (rev6)                                         | Upstream discussion pack | `.qfai/discussion/discussion-20260415161758193/`; provides rev6 baseline context and closed issues | Context only |

## Notes

- SRC-0001 is the direct input for this discussion pack. All workstream definitions (WS-1 through WS-7), DoD conditions, and implementation guidance are derived from it.
- SRC-0002 is cited as the upstream audit that generated the 6 residual findings addressed by rev7. It is not reproduced here.
- SRC-0003 is the canonical authority that SRC-0001 defers to. All design decisions in SRC-0001 are required to be consistent with SRC-0003.
- SRC-0004 is upstream context only. Rev7 does NOT re-open rev6 issues. Do not duplicate rev6 content in this pack.

## Excluded Source Types

- No trend scan or competitive reference registry (non-UI pack; no UX benchmarking required).
- No third-party library evaluation (no new dependencies introduced).
