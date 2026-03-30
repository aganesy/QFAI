# 04 Sources

## Source Registry

| SRC-ID   | Title                                                  | Type      | Location                                             | Status    | Relevance                                          |
| -------- | ------------------------------------------------------ | --------- | ---------------------------------------------------- | --------- | -------------------------------------------------- |
| SRC-0001 | qfai_session_master_design_spec_v0.1                   | primary   | .qfai/specs/ (session archive)                       | approved  | Canonical 3-layer model definition                 |
| SRC-0002 | qfai_session_handoff_package_v0.1                      | primary   | .qfai/specs/ (session archive)                       | approved  | Session handoff context                            |
| SRC-0003 | qfai_v1.7.8_repo_audit_report                          | secondary | .qfai/specs/ (session archive)                       | approved  | v1.7.8 audit findings                              |
| SRC-0004 | qfai_v1.7.9_convergence_design_spec_v0.1               | primary   | .qfai/specs/ (session archive)                       | approved  | Convergence design                                 |
| SRC-0005 | qfai_v1.7.9_issue_register_and_execution_plan_v0.1     | secondary | .qfai/specs/ (session archive)                       | approved  | Issue register and execution plan                  |
| SRC-0006 | qfai_v1.7.9_implementation_audit_report_v0.1           | secondary | .qfai/specs/ (session archive)                       | approved  | Implementation audit findings                      |
| SRC-0007 | qfai_v1.7.11_completion_design_spec_v0.1               | primary   | .qfai/specs/ (session archive)                       | approved  | This release's design spec (primary input)         |
| SRC-0008 | QFAI repo implementation                               | primary   | packages/qfai/src/                                   | current   | Current implementation truth                       |
| SRC-0009 | QFAI skill definitions                                 | primary   | .qfai/assistant/skills/                              | current   | Current skill definitions                          |
| SRC-0010 | QFAI steering documents                                | primary   | .qfai/assistant/steering/                            | current   | Steering documents                                 |

## Source Types

- `primary`: First-hand evidence (design specs, implementation code, skill definitions).
- `secondary`: Derived information (audit reports, issue registers, execution plans).
- `external`: Third-party references (specs, RFCs, vendor docs).

## Notes

- This is a **non-ui** surface type release. No Trend Scan section is required.
- No Competitive Reference Registry is required for non-ui packs.

## Traceability

- Each REQ/NFR should reference at least one SRC-ID.
- Sources without REQ/NFR links should be reviewed for relevance.
- SRC-0007 is the primary input for all workstreams in this release.
- SRC-0001 through SRC-0006 provide historical context and audit trail for convergence decisions.
- SRC-0008 through SRC-0010 represent the current repo state against which all changes are validated.
