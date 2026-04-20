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
  - Stale sidecar compatibility detection (legacy filenames / 4-axis artifacts -> canonical migration errors)
  - Feature maturity vocabulary normalization (from spec-0037)
  - Waiver handling: waivers for warning/info only, error waivers rejected
  - Canonical UIX validators (runCanonicalUixValidators — 12 validator functions executed by the canonical production path)
  - Removed compatibility surface — package surface no longer exposes `validators/legacy/` or IssueCategory `compatibility`
  - UIX-VAL-T01..T04 (Trend->Axis traceability validators: evaluation_connection field presence/resolution, source_refs resolution, visual axis derivation coverage)
  - UIX-VAL-DS01/DS02 (uiux/12_design_system.md presence and required 3-section non-empty validators)
  - PROT-DS01 (prototyping.json scoringTrace.designSystemCompliance recording validator)
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
- NFR-0001 (v1.7.16 source: discussion-20260418093755100): backward compatibility — new validators must not produce ERRORs on legacy packs generated before v1.7.15 (WARNING-first introduction for rules that reference fields existing in legacy packs)
- NFR-0004 (v1.7.16 source: discussion-20260418093755100): validation speed — adding UIX-VAL-T01..T04, UIX-VAL-DS01/DS02, PROT-DS01 must keep qfai validate total runtime increase <= 20% over v1.7.15 baseline

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
- REQ-0010: Stale sidecar migration detection -- legacy sidecar filenames/content (for example `uiux/10_strategy.md`, legacy 4-axis evaluation artifacts) are rejected with explicit canonical migration errors and rename guidance
- REQ-0011: Feature maturity normalization -- canonical vocabulary across README/CHANGELOG/steering/source
- REQ-0012: Waiver handling -- warning/info waivers accepted, error waivers rejected
- REQ-0013: Canonical UIX Validators — verify は runCanonicalUixValidators() を使用。canonical.ts が以下 12 validator functions を順次実行する:
  classification.ts（明示的 UI 分類検証）, foundation.ts（サイドカー存在検証）, taste.ts（design taste interview 完全性）,
  trend.ts（trend research 検証）, threeLayer.ts（3-layer evaluation format 検証）, forbiddenLegacyFiles（legacy file reject）,
  threeLayerFamilyCompleteness（canonical family 完全性）, scoringReady.ts（scoring schema 完全性）,
  strategy.ts（strategy artifact 完全性）, screenContract.ts（screen contract schema）, comparisonValidator.ts（option comparison + selected anchor）,
  oqClosure.ts（OQ 参照解決）
- REQ-0014: Removed Compatibility Surface — package surface から `validators/legacy/` namespace と IssueCategory `compatibility` を除去し、互換性判定は canonical validators の migration errors で扱う
- REQ-0015: Trend->Axis traceability validators — UIX-VAL-T01 (ERROR: 04_Sources.md Trend Scan entries MUST have evaluation_connection), UIX-VAL-T02 (ERROR: evaluation_connection MUST reference existing TRD-XX axis), UIX-VAL-T03 (WARNING: TRD-XX source_refs MUST reference real 04_Sources.md entries), UIX-VAL-T04 (WARNING: visual Trend Scan categories present implies at least one visual axis derived in 21_design_eval_trend_derived.md). Non-UI packs MUST produce zero T01..T04 fires.
- REQ-0016: Design system presence and scoring validators — UIX-VAL-DS01 (ERROR: UI-bearing packs MUST contain uiux/12_design_system.md), UIX-VAL-DS02 (ERROR: 12_design_system.md MUST have non-empty Visual Theme, Color Palette, Do's and Don'ts sections), PROT-DS01 (ERROR when UI-bearing + 12_design_system.md exists + full-harness, WARNING otherwise: prototyping.json scoringTrace MUST record designSystemCompliance score). Non-UI packs MUST produce zero DS01/DS02/PROT-DS01 fires.

## Entry points

- US range in this spec: US-0014-0001..US-0014-0019
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

## v1.7.16 Scope Delta (2026-04-18)

- Source: discussion-20260418093755100 (REQ-0008, REQ-0018; NFR-0001, NFR-0004)
- Added validators: UIX-VAL-T01, UIX-VAL-T02, UIX-VAL-T03, UIX-VAL-T04, UIX-VAL-DS01, UIX-VAL-DS02, PROT-DS01
- Severity: T01/T02/DS01/DS02 = ERROR; T03/T04 = WARNING; PROT-DS01 = ERROR under (UI-bearing + 12_design_system.md exists + full-harness) else WARNING (see DR-0014-v1716-01)
- Non-UI safety (NFR-0004 of spec-0014 existing "Non-UI safety"): these 7 rules MUST fire zero times on non-UI projects
- Backward compatibility (NFR-0001 of discussion pack): UIX-VAL-T01/T02 may introduce as ERROR because legacy packs lack the evaluation_connection field entirely and validators only fire on packs already containing Trend Scan entries with the canonical v1.7.16 template marker — existing pre-v1.7.16 packs are not retro-validated for T01/T02 (see DR-0014-v1716-02)
