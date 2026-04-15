# Manifest (Decision Spine)

## Product / Mission

- Summary: QFAI is a Quality-First Development Kit (CLI tool) for AI coding agents. It integrates SDD/ATDD/TDD and verifies specs, contracts, and traceability with 50+ validation rules.
- Value: Detects agent spec drift and hallucinations via objective gates, ensuring quality.
- Evidence: README.md, packages/qfai/package.json (description), 02_Inception-Deck.md

## Axioms (Non-negotiable)

- Axioms / principles (non-negotiable):
  - Correctness > Completeness > Usability > Performance > Extensibility (Trade-off priority)
  - Validators are pure async functions (no side effects, return Issue[] only)
  - Layered specs: 1 CAP = 1 spec directory
  - Drift protocol: Unauthorized editing of upstream artifacts is prohibited
- Decision lens (what we optimize for): Minimize false positives (reliability), traceability completeness
- Evidence: 02_Inception-Deck.md (Trade-offs), 09_Constraints.md (TC-09)

## Compatibility vs Change Rubric

- Criteria (Compatibility): validate.json is an internal contract (not a stable API). CLI command system follows semver.
- Criteria (Change): canonical consistency, validator alignment, and shipped SSOT alignment take priority. Breaking changes are allowed when required to restore canonical consistency.
- Examples: `_shared/` -> `_policies/` rename (v1.5.3), spec-pack -> layered migration (v1.4.17)
- Evidence: CHANGELOG.md

## Governance (Ownership / Review / Evidence)

- Owner: aganesy (maintainer)
- Review / approval: agent-catalog + agent-routing + review-profiles. Default gate is completion-reviewer; specialist reviewers are conditionally routed by skill/phase.
- Evidence requirements: evidence file per skill run, validate.log, specs-coverage
- Update cadence: Per release (semver)
- Evidence: .qfai/assistant/steering/agent-catalog.yml, .qfai/assistant/steering/agent-routing.yml, .qfai/assistant/steering/review-profiles.yml

## Evidence

- Rule: All claims must have repo evidence (source code, config, CHANGELOG, discussion-pack)
  - Evidence:
    `.qfai/discussion/discussion-20260326072322818/`
    (v1.7.2 Design Audit & Slop Guardrails),
    `.qfai/discussion/discussion-20260328120000000/`
    (v1.7.3 Discussion/UIUX Authoring Foundation),
    `.qfai/discussion/discussion-20260329120000000/`
    (v1.7.4 Validation, Review, and Migration Stabilization),
    `.qfai/discussion/discussion-20260329130000123/`
    (v1.7.5 Runtime & Evidence Foundation),
    `.qfai/discussion/discussion-20260329175059391/`
    (v1.7.6 Critique, Calibration, and Full-Harness Expansion),
    `.qfai/discussion/discussion-20260329195516830/`
    (v1.7.6 Audit Remediation — targeted correction pass for 13 issues across P0/P1/P2),
    `.qfai/discussion/discussion-20260330153902875/`
    (v1.7.9 Convergence Correction Release — truthful implementation alignment across validate/discussion/prototyping/docs),
    `.qfai/discussion/discussion-20260414072809763/`
    (v1.7.15 Runtime Truthfulness Hardening — fail-closed runtime, pre-scored path elimination, screen-level UiObservation, l2Evidence, validator error upgrades),
    `.qfai/discussion/discussion-20260414195449523/`
    (v1.7.15 rev4 Single-PR Completion — 5 remaining audit issues: cli/full-harness reject, screen contract targets, evidence chain completeness, canonical route semantics, L2 structured parse, stale cleanup),
    `.qfai/discussion/discussion-20260415161758193/`
    (v1.7.15 rev6 — full-harness-only mode enforcement, surfacePolicy.ts, CalibrationLoader internal resolution, concrete evidenceRefs, reviewerSignoff semantics, uiFidelityBuilder screenId matching, stale cleanup),
    `.qfai/discussion/discussion-20260415203030886/`
    (v1.7.15 rev7 — 6 contract gaps: pack resolution upstream move, uiFidelity fail-closed, concrete evidenceRefs, validator calibration metadata check, error taxonomy, config packPath-only; WS-7: surfacePolicy rejection message from constant)
  - Assumptions: None (all verified from repository analysis)

## Non-goals / Not-now (Optional)

- IDE plugin / GUI development
- Plugin architecture
- Automated test generation
- browser QA full audit / screenshot diff / repair loop / external critique adapter (v1.7.1)
- auto-fix / rewrite for design findings (v1.7.2)
- Evidence: 05_Scope.md (Out of Scope)

## References (Optional)

- product.md
- tech.md
- structure.md
