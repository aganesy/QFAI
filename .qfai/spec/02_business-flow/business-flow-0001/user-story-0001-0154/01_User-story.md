# US-0001-0154: Required Edge Enforcement

## User Story

As a QA engineer, I want US -> AC -> BR -> EX -> TC edge completeness enforced in the spec-pack layout, and BF -> US -> AC -> EX <- BR edge completeness on the story tree, so that traceability gaps are caught during SDD.

## Legacy Source Scope

- In:
  - `/qfai-sdd` unified SDD workflow (Contracts-first -> Outline -> Slice -> Plan -> Delta); on the story tree, concrete-first (01 policy -> 02 business flow -> stories -> 03 contract with BRs)
  - On the story tree: the files of the tree written from their `qfai-sdd` templates, records kept as rows of `decisions.md` and `open-questions.md`, ID allocation, business rules inside contracts, and the per-flow completion gate
  - Layered artifact generation: `_policies/01..10` + `spec-XXXX/01..10`
  - Contract-first mandatory outputs: `.qfai/contracts/(api|db|ui|design)/**`
  - UI-bearing discussion UIUX sidecar の downstream contract への正規化
  - Contract Index in `_policies/05_Contracts.md` with short IDs (DB-001, API-001, UI-001)
  - Discussion-pack preflight validation (latest pack, readiness checks)
  - Phase order enforcement (Contracts-first -> Outline -> Slice -> Plan -> Delta)
  - Reference direction rules (upper-to-lower forbidden, lower-to-upper allowed)
  - Required edges: US -> AC -> BR -> EX -> TC; BF -> US -> AC -> EX <- BR on the story tree
  - Batch mode: no-argument invocation processes all capabilities
  - Spec Auto-Discovery Protocol (4-source unified diff detection)
  - RCP execution with 12-reviewer roster
  - Density Review Pass using `QFAI-COV-207` warnings
  - Preflight summary report (`.qfai/report/preflight_summary.md`)
  - Validate gate (`qfai validate --fail-on error`)
  - discussion-pack markdown readiness gate
  - optional side artifacts are ignored by preflight
  - Phase 0 freeze of root `DESIGN.md` sha256 into `<paths.contractsDir>/design/DESIGN.md.lock.yaml`; on the story tree the 03-contract step freezes it
  - drop legacy design contracts (`exploration-brief.yaml`, `evaluation-rubric.yaml`, `evaluator-calibration.yaml`, `selected-direction.yaml`, `reference-pool.yaml`, `brand-design.yaml`)
  - emit only `design-system.yaml`, `prototype-handoff.yaml`, `DESIGN.md`, `DESIGN.md.lock.yaml`, and the design-system mirror validator as the active design-contract surface
- Out:
  - Writing production code or runnable tests
  - Skipping phase order or bypassing gates
  - Reintroducing rejected options without re-open approval

## Source Provenance

- Spec scope: `.qfai/evidence/migration-spec-to-story/retired/spec-0013/01_Spec.md#scope`
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0013/02_User-stories.md#us-0013-0005`
