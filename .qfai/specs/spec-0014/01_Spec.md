# 01 Spec

- Spec: spec-0014
- Parent: CAP-0014

## Consumer View

- Primary SSOT for execution: `spec-0014/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In:
  - `/qfai-verify` quality gates and evidence workflow
  - Full-scan verification (always full-scan, no diff-only shortcuts)
  - QFAI gates: `qfai validate --fail-on error`, optional `qfai report`
  - Repository gates: format, lint, typecheck, tests, build/package
  - Fix loop: identify root cause, fix, re-verify until PASS
  - Evidence summary production (copy-paste for PR)
  - Change Classification (Primary/Tags) per `change-classification.md`
  - Static policy checks: drift-protocol.md exists, test-layers.md exists, SKILL.md includes DRIFT-PROTOCOL tag
  - UIX-VAL deterministic validators (from spec-0027)
  - UIX-REV semantic reviewers (from spec-0027)
  - Non-UI validator safety (zero UIX fires on non-UI projects)
  - Migration/upgrade support (old/intermediate/final version paths)
  - Feature maturity vocabulary normalization (from spec-0037)
  - Waiver handling: waivers for warning/info only, error waivers rejected
  - Canonical UIX validators (runCanonicalUixValidators — 12 modular validators)
  - Legacy compatibility path (validators/legacy/ namespace, migration tooling only)
- Out:
  - Incremental/diff-only verification (DR-0007: verify is always full-scan)
  - Spec artifact authoring (belongs to `/qfai-sdd`)
  - Test implementation (belongs to `/qfai-implement`)

## Applicable NFR

- NFR-0001: Full-scan -- verify always runs full-scan, never incremental
- NFR-0002: UIX-VAL determinism -- same input produces same output
- NFR-0003: UIX-VAL performance -- total execution time < 2000ms
- NFR-0004: Non-UI safety -- zero UI-bearing validator fires on non-UI projects
- NFR-0005: Waiver integrity -- error-level waivers are rejected and treated as failures
- NFR-0006: Evidence actionability -- all gate results include exact commands and outcomes

## Applicable Policy

- Policy: Drift Protocol mandatory
- CI must run default/full validation only (`--phase refinement` is local-only)
- Waivers are for warning/info only; error waivers are rejected

## Evidence Summary

- Evidence: SKILL.md at `packages/qfai/assets/init/.qfai/assistant/skills/qfai-verify/SKILL.md`
- Consolidates: old spec-0027 (UIX-VAL/UIX-REV), spec-0037 (SSOT Unification)

## Relevant Requirements

- REQ-0001: Full-scan verification -- always run full-scan, no diff-only shortcuts
- REQ-0002: QFAI gates -- `qfai validate --fail-on error` and optional `qfai report`
- REQ-0003: Repository gates -- format, lint, typecheck, tests, build/package in stable order
- REQ-0004: Fix loop -- identify root cause, fix, re-verify until all gates PASS
- REQ-0005: Evidence summary -- copy-paste ready summary with Change Classification
- REQ-0006: Static policy checks -- drift-protocol.md, test-layers.md, SKILL.md DRIFT-PROTOCOL tags
- REQ-0007: UIX-VAL validators -- deterministic UI/UX artifact validation (sidecar presence, strategy completeness, etc.)
- REQ-0008: UIX-REV reviewers -- semantic review prompts with accept/refine/pivot recommendations
- REQ-0009: Non-UI safety -- zero UIX fires on non-UI projects
- REQ-0010: Migration support -- old/intermediate/final version detection and upgrade guidance
- REQ-0011: Feature maturity normalization -- canonical vocabulary across README/CHANGELOG/steering/source
- REQ-0012: Waiver handling -- warning/info waivers accepted, error waivers rejected
- REQ-0013: Canonical UIX Validators — verify は runCanonicalUixValidators() を使用。12 modular validators:
  canonical.ts（aggregator）, classification.ts（明示的 UI 分類検証）, foundation.ts（サイドカー存在検証）,
  comparisonValidator.ts（option comparison + selected direction）, oqClosure.ts（OQ 参照解決）, rollout.ts（migration 検出）,
  scoringReady.ts（scoring schema 完全性）, strategy.ts（strategy artifact 完全性）, screenContract.ts（screen contract schema）,
  trend.ts（trend research 検証）, threeLayer.ts（3-layer evaluation 完全性）を canonical.ts が順次実行
- REQ-0014: Legacy Compatibility Path — legacy/ddpCompatibility.ts と legacy/uixCompatibility.ts は migration tooling 専用。verify の production path には含まれない。IssueCategory "compatibility" で区別

## Entry points

- US range in this spec: US-0014-0001..US-0014-0011
- Primary actors: QFAI user (developer), CI/CD pipeline, DevOps/CI Engineer
- Notes: Verify is the final quality gate before PR creation. It produces evidence for PR descriptions.

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: multiple valid implementations exist.
- Conflict: NFR / Policy / AC conflict.
- Missing: required constraints or policy are unclear.
- Trade-off: verification depth vs execution time must be decided.

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
