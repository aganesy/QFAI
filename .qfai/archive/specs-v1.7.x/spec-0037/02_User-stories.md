# 02 User Stories

## US Catalog

- US-0037-0001: Reviewer Extension (D-12)
- US-0037-0002: Migration Normalization (D-13)
- US-0037-0003: Docs/State Normalization (D-14)
- US-0037-0004: Non-UI Validator Safety (cross-cutting US-0037-0005)
- US-0037-0005: Docs/steering/tests normalized to v1.7.11 truth [v1.7.11 WS-J]

## US-0037-0001: Reviewer Extension (D-12)

- Parent: CAP-0037
- Goal: As a discussion reviewer, I want review templates that evaluate taste/trend reflection quality so that new discussion artifacts are reviewed for design direction fidelity
- Non-goals: Automated scoring without reviewer, full anti-preference traceability beyond taste/axes/review
- Notes: Adds 5 review template items to uix-rev assets: taste reflection quality, anti-preference enforcement, trend relevance/freshness, dynamic axis specificity, generic fallback persistence. REQ-0024, REQ-0029

## US-0037-0002: Migration Normalization (D-13)

- Parent: CAP-0037
- Goal: As a QFAI adopter with existing packs, I want a clear old -> intermediate -> final migration path so that validator strengthening does not cause mysterious failures on existing packs
- Non-goals: Automated migration execution, in-place pack rewriting
- Notes: 3 migration versions defined: (1) old no-sidecar, (2) v1.7.6-v1.7.7 intermediate, (3) v1.7.8 final. UIX-VAL-MIGRATION-\* validators upgraded for canonical model. Stale version detection + upgrade guidance. REQ-0025

## US-0037-0003: Docs/State Normalization (D-14)

- Parent: CAP-0037
- Goal: As a QFAI user/developer, I want consistent feature maturity vocabulary across README/CHANGELOG/steering/source comments so that no subsystem is simultaneously described as "done" and "deferred"
- Non-goals: Retroactive changelog rewriting, cross-repo vocabulary enforcement
- Notes: 4 allowed maturity terms: complete / foundation-only / preview / correction target (QP-04). Master convergence document as new steering doc per OQ-0008/AD-008. REQ-0026, REQ-0027, REQ-0030

## US-0037-0004: Non-UI Validator Safety (cross-cutting US-0037-0005)

- Parent: CAP-0037
- Goal: As a CLI project user, I want zero UI-bearing validator fires on non-UI projects so that validation results are trustworthy and free of false positives
- Non-goals: UI-bearing detection logic rewrite, validator performance optimization
- Notes: Cross-cutting obligation — every new validator across all specs must have surface type guard. Non-UI fixture tests for every new validator. Over-fire count = 0. REQ-0028, QP-05, TP-01

## US-0037-0005: Docs/steering/tests normalized to v1.7.11 truth [v1.7.11 WS-J]

- Parent: CAP-0037
- Source: v1.7.11 completion release, REQ-0021, REQ-0022, REQ-0023
- Goal: As a QFAI user/developer, I want all documentation, steering artifacts, and test fixtures normalized to v1.7.11 canonical truth, so that maturity claims are consistent, test fixtures reflect the 3-layer model, and integration tests validate the canonical path.
- Non-goals: Retroactive changelog rewriting; cross-repo vocabulary enforcement; full re-architecture of test harness
- Notes: REQ-0021 normalizes maturity claims in steering/changelog/release notes. REQ-0022 updates test fixtures to canonical 3-layer expectations. REQ-0023 adds validateProject() integration tests for canonical path. v1.7.11 WS-J scope.
