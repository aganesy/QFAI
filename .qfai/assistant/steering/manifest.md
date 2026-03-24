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
- Criteria (Change): Breaking changes deferred until v2.0. Migration guide required.
- Examples: `_shared/` -> `_policies/` rename (v1.5.3), spec-pack -> layered migration (v1.4.17)
- Evidence: CHANGELOG.md, OQ-0003 (validate.json), OQ-0004 (legacy deprecation)

## Governance (Ownership / Review / Evidence)

- Owner: aganesy (maintainer)
- Review / approval: 13-reviewer roster (review-roster.yml), RCP with PASS/FAIL/N/A (v1.5.6: +devils-advocate, +pattern-doubler; v1.5.7: +integrated-uiux-reviewer)
- Evidence requirements: evidence file per skill run, validate.log, specs-coverage
- Update cadence: Per release (semver)
- Evidence: .qfai/assistant/steering/review-roster.yml

## Evidence

- Rule: All claims must have repo evidence (source code, config, CHANGELOG, discussion-pack)
- Evidence: .qfai/discussion/discussion-20260324090005338/ (latest pack, v1.6.5 デザインディレクション＆UI品質強化 + ChatGPT 分析統合)
- Assumptions: None (all verified from repository analysis)

## Non-goals / Not-now (Optional)

- IDE plugin / GUI development
- Plugin architecture (to be reconsidered in v2.0)
- Automated test generation
- Evidence: 05_Scope.md (Out of Scope), OQ-0001, OQ-0002

## References (Optional)

- product.md
- tech.md
- structure.md
