# 09 Delta (Migration Record)

## Origin

- Consolidates: old spec-0006 (prototyping CLI), spec-0024 (render evidence), spec-0028-0033 (runtime/harness), spec-0035 (canonical), spec-0036 (foundation)
- MAJOR CHANGE: CLI command `qfai prototyping` has been REMOVED from the codebase
- This spec covers the `/qfai-prototyping` SKILL workflow only

## Adopted

- AD-0012-0001: Skill-only prototyping -- CLI command removed, skill workflow retained
- AD-0012-0002: All-spec scope -- prototyping processes ALL specs, not single-spec
- AD-0012-0003: 3-mode system -- low-cost, standard (default), full-harness (opt-in)
- AD-0012-0004: Spec Auto-Discovery -- 4-source diff detection from spec-0038
- AD-0012-0005: L1/L2 fidelity DoD -- skeleton vs interactive fidelity levels
- AD-0012-0006: Full-harness loop -- Planner/Generator/Evaluator/Decision Gate from spec-0028-0033

## Rejected

- RJ-0012-0001: CLI command `qfai prototyping`
  - DO NOT reintroduce the CLI command
  - Temptation: adding CLI entrypoint for standalone prototyping runs
  - Reason: prototyping is an agent-orchestrated workflow, not a standalone CLI operation

- RJ-0012-0002: Runtime-heavy default mode
  - DO NOT make full-harness the default mode
  - Temptation: defaulting to full runtime verification for "safety"
  - Reason: static-first (standard) mode is sufficient for most cases; full-harness is opt-in only

## ID Renumbering

| Old ID               | New ID                      | Notes                               |
| -------------------- | --------------------------- | ----------------------------------- |
| spec-0006 US/TC      | US-0012-YYYY / TC-0012-YYYY | Prototyping CLI (CLI parts removed) |
| spec-0024 US/TC      | US-0012-YYYY / TC-0012-YYYY | Render evidence                     |
| spec-0028-0033 US/TC | US-0012-YYYY / TC-0012-YYYY | Runtime/harness                     |
| spec-0035 US/TC      | US-0012-YYYY / TC-0012-YYYY | Canonical                           |
| spec-0036 US/TC      | US-0012-YYYY / TC-0012-YYYY | Foundation                          |

## v1.7.12 Convergence Correction (DR-0108)

### Summary

Skill-centered truth unification. spec-0012 already stated the CLI command was removed, but policies and docs still referenced `qfai prototyping` command. v1.7.12 resolves this inconsistency so that spec, policies, docs, and code unanimously agree the skill is the only interface.

### Discussion Pack Reference

- D-003: Prototyping as skill-centered truth (no CLI command)

### Requirements Added

- REQ-0012: Resolve prototyping truth — all layers must agree skill is sole interface
- REQ-0013: Archive/label superseded content referencing CLI command
- REQ-0014: Eliminate responsibility leakage between skill and CLI
- REQ-0015: Normalize static-first/mode-aware prototyping contract

### Artifacts Added

| Layer | IDs Added                  | Description                                                               |
| ----- | -------------------------- | ------------------------------------------------------------------------- |
| US    | US-0012-0008..US-0012-0010 | Skill-centered truth, CLI ref elimination, mode-aware contract            |
| AC    | AC-0012-0010..AC-0012-0012 | No CLI refs in active docs, skill SSOT, static-first contract             |
| BR    | BR-0012-0008..BR-0012-0010 | Active doc prohibition, skill SSOT boundary, mode self-containment        |
| EX    | EX-0012-0010..EX-0012-0013 | Correct invocation, CLI not-found, doc violation, contract self-contained |
| TC    | TC-0012-0014..TC-0012-0016 | Doc scan for CLI refs, skill SSOT verification, mode contract check       |

### Traceability Chain (v1.7.12 additions)

```text
REQ-0012 → US-0012-0008 → AC-0012-0010, AC-0012-0011 → BR-0012-0008, BR-0012-0009 → EX-0012-0010..0012 → TC-0012-0014, TC-0012-0015
REQ-0013 → US-0012-0009 → AC-0012-0010 → BR-0012-0008 → EX-0012-0011, EX-0012-0012 → TC-0012-0014
REQ-0014 → US-0012-0008 → AC-0012-0011 → BR-0012-0009 → EX-0012-0010 → TC-0012-0015
REQ-0015 → US-0012-0010 → AC-0012-0012 → BR-0012-0010 → EX-0012-0013 → TC-0012-0016
```

## v1.7.13 (2026-04-04) — Canonical Sidecar Convergence

- adopted: REQ-0016~0021 追加（prototyping mode module, existence-based precedence, recommendation artifact, recommendation schema, calibration config, report integration）
- adopted: US-0012-0011~0016, AC-0012-0013~0019, BR-0012-0011~0015, EX-0012-0014~0016, TC-0012-0017~0022 追加
- rationale: v1.7.13 で prototyping/ モジュール新設、mode resolution engine 実装、existence-based precedence 導入、calibration config 追加の実装の仕様反映

### v1.7.13 補完 (2026-04-04)

- adopted: BR-0012-0016~0019, EX-0012-0019~0020, TC-0012-0026~0027 追加
- rationale: コミット履歴分析で特定された fullHarness schema, calibration config fields, mode provenance, surface inference の設計意図補完

### v1.7.13 収束 (2026-04-05)

- adopted: REQ-0022~0027 追加（Browser QA 4-phase model, evidence bundle persistence, render evidence capture, provider registry, UI fidelity builder, prototyping execution orchestrator）
- adopted: Scope 拡張: Browser QA phases, evidence bundling, render capture, provider registry, full-harness runtime, uiFidelityBuilder, execution orchestrator
- rationale: 実装分析で特定された v1.7.13 の主要新規モジュール群の仕様反映:
  - `browserQa/` 4-phase model（smoke/interaction/visual/accessibility）
  - `evidence/` bundling system（bundleWriter, fsEvidenceWriter, playwrightRenderAdapter, renderRunner）
  - `providers/` registry pattern（config → concrete provider 依存逆転）
  - `prototyping/uiFidelityBuilder.ts`（QFAI-PROT-270/271/272 emit）
  - `prototyping/execution.ts`（本番パスオーケストレータ）
  - `harness/` runtime（runtime.ts, adapters.ts, resultWriter.ts）

## v1.7.14 (2026-04-07) — Current-Only SSOT & Strict Semantic Enforcement

- adopted: REQ-0028（Canonical Prototyping Surfaces）, REQ-0029（Execution Hard Gates）, REQ-0030（Namespaced-Only Schema）, REQ-0031（Semantic Invariant SSOT）, REQ-0032（Classification Separation）, REQ-0033（Surface Inference Nullable）追加
- adopted: US-0012-0017~0021, AC-0012-0020~0026, BR-0012-0020~0023 追加
- adopted: DR-0012-0002~0005 追加
- adopted: BR-0012-0012 更新（QFAI-PROT-231/232 warning → hard error）, BR-0012-0018 更新（sourceSchema "top-level" 廃止）, BR-0012-0019 更新（surface inference null default）
- adopted: US range 更新 US-0012-0001..US-0012-0021
- rationale: v1.7.14 は QFAI の current-only SSOT リリース。以下の破壊的変更を仕様に反映:
  - **Canonical surfaces**: web-ui/mobile-ui/desktop-ui → web/mobile/desktop。cli/mixed 追加。non-ui を prototyping surface 外に分離（DR-0109）
  - **Execution hard gates**: invalid classification/recommendation を即座に reject。non-UI パックを prototyping execution 対象外として明示拒否（DR-0111）
  - **Namespaced-only schema**: legacy top-level keys の存在を hard error に昇格。QFAI-PROT-231/232 warning 廃止（DR-0112）
  - **Semantic invariant SSOT**: recommendationSemantics.ts に recommended_mode ∈ allowed_modes 検証を集約。parser/resolver/execution/CLI/validator/preflight 全レイヤーで共有（DR-0113）
  - **Classification separation**: isUiBearingSurface() → isDiscussionUiBearingPrototypingSurface() + requiresVisualBrowserEvidenceSurface() に分割。cli は discussion UI-bearing だが browser evidence は不要（DR-0110）
  - **Surface inference nullable**: inferSurfaceFromRecommendationAndEvidence() が推定不能時に null を返す（旧 "non-ui" デフォルト廃止）
  - **Legacy infrastructure 完全削除**: rollout.ts, legacy/ validators, migration/ validators, compatibility tests をソースツリーから完全除去

### Traceability Chain (v1.7.14 additions)

```text
REQ-0028 → US-0012-0017 → AC-0012-0020 → BR-0012-0020 → DR-0012-0002
REQ-0029 → US-0012-0018 → AC-0012-0021, AC-0012-0022 → BR-0012-0021 → DR-0012-0002, DR-0012-0005
REQ-0030 → US-0012-0019 → AC-0012-0023 → BR-0012-0012 (updated) → DR-0012-0003
REQ-0031 → US-0012-0020 → AC-0012-0024 → BR-0012-0022 → DR-0012-0004
REQ-0032 → US-0012-0021 → AC-0012-0025 → BR-0012-0023 → DR-0012-0005
REQ-0033 → US-0012-0021 → AC-0012-0026 → BR-0012-0019 (updated)
```

### Deleted Source Files (v1.7.14)

| File                                      | Reason                                                  |
| ----------------------------------------- | ------------------------------------------------------- |
| `validators/legacy/ddpCompatibility.ts`   | Legacy DDP compatibility path 不要（current-only SSOT） |
| `validators/legacy/uixCompatibility.ts`   | Legacy UIX compatibility path 不要                      |
| `validators/legacy/index.ts`              | Legacy barrel 不要                                      |
| `validators/legacyStatusDir.ts`           | Legacy status directory check 不要                      |
| `validators/migration/formatDetection.ts` | Migration format detection 不要                         |
| `validators/uix/rollout.ts`               | Rollout/phase-1 ratchet infrastructure 不要             |
| `assets/uix-rev/migration-review.md`      | Migration review asset 不要                             |

### Added Source Files (v1.7.14)

| File                                          | Purpose                                          |
| --------------------------------------------- | ------------------------------------------------ |
| `core/domain/strategyDecision.ts`             | Canonical strategy decision vocabulary (DR-0114) |
| `core/prototyping/recommendationSemantics.ts` | Semantic invariant SSOT helper (DR-0113)         |
| `core/validators/uix/types.ts`                | UIX validator shared types                       |
| `core/validators/uix/index.ts`                | UIX validator barrel refactoring                 |

### v1.7.14 Full-Harness Iteration Protocol & Validator Rules (2026-04-08)

- adopted: REQ-0034（Full-Harness Iteration Protocol）, REQ-0035（Independent Evaluator Panel）, REQ-0036（Score Scope Separation）, REQ-0037（Evaluation Rigor Rules）, REQ-0038（Asset Acquisition Strategy）, REQ-0039（Reviewer Gate Strengthening）, REQ-0040（Full-Harness Validator Rules QFAI-PROT-290~294）追加
- adopted: US-0012-0022~0025, AC-0012-0027~0033, BR-0012-0024~0031 追加
- adopted: DR-0012-0006~0009 追加
- adopted: BR-0012-0016 更新（fullHarness schema: reviewerSignoff boolean→object, scoringTrace boolean→array, terminationReason に "plateau"/"manual-stop" 追加）
- adopted: US range 更新 US-0012-0001..US-0012-0025
- rationale: 2 つの full-harness インシデントレポートに基づく改善:
  - **Iteration Protocol**: single-pass evidence dump を反復改善ループに拡張。4-step cycle, MIN_ITERATIONS=5, 4 termination conditions
  - **Independent Evaluator Panel**: 3-layer（product-surface-reviewer/product-experience-architect/qa-gatekeeper）で self-evaluation bias を構造的に排除
  - **Score Scope Separation**: discussion 3-layer scores ≠ prototyping scoringTrace を明確化。コピー禁止
  - **Evaluation Rigor**: 3-tier rubric（existence_gate/quality_criteria/excellence_criteria）, L1/L2/L1-manual finding 分類
  - **Asset Strategy**: free assets MUST, emoji/placeholder prohibition, WCAG 2.1 AA checklist
  - **Reviewer Gate**: 6 full-harness-specific checks, Limitations section obligation
  - **QFAI-PROT-290~294**: 5 新規 validator rules（iteration integrity）。taxonomy range 281-294 に拡張

### Traceability Chain (v1.7.14 Full-Harness additions)

```text
REQ-0034 → US-0012-0022 → AC-0012-0027 → BR-0012-0024, BR-0012-0031 → DR-0012-0006
REQ-0035 → US-0012-0023 → AC-0012-0028 → BR-0012-0025 → DR-0012-0006, DR-0012-0009
REQ-0036 → US-0012-0024 → AC-0012-0029 → BR-0012-0026 → DR-0012-0007
REQ-0037 → US-0012-0022 → AC-0012-0030 → BR-0012-0027 → DR-0012-0008
REQ-0038 → US-0012-0022 → AC-0012-0031 → BR-0012-0028
REQ-0039 → US-0012-0022 → AC-0012-0032 → BR-0012-0029
REQ-0040 → US-0012-0025 → AC-0012-0033 → BR-0012-0030
```

### Modified Skill/Steering Files (v1.7.14 Full-Harness)

| File                                                                                            | Change                                                                           |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `assets/init/.qfai/assistant/skills/qfai-prototyping/SKILL.md`                                  | +200行: Iteration Protocol, Evaluation Rigor, Asset Strategy, Reviewer Gate 追加 |
| `assets/init/.qfai/assistant/skills/qfai-discussion/SKILL.md`                                   | Score Scope 注記 + iteration_expectations ブロック追加                           |
| `assets/init/.qfai/assistant/skills/qfai-discussion/templates/uiux/23_design_eval_aggregate.md` | Score Scope Limitation セクション追加                                            |
| `assets/init/.qfai/assistant/steering/review-profiles.yml`                                      | full-harness プロファイル追加                                                    |
| `assets/init/.qfai/assistant/steering/agent-routing.yml`                                        | prototyping evidence phase に product-experience-architect 追加                  |
| `core/validators/prototypingEvidence.ts`                                                        | QFAI-PROT-290~294 追加（+104行）                                                 |
| `cli/commands/validate.ts`                                                                      | PROT-290~294 description 追加                                                    |
| `tests/core/prototypingEvidence.test.ts`                                                        | 5 test cases 追加（+270行）                                                      |
| `tests/core/issueCodeUniqueness.test.ts`                                                        | TAXONOMY_RANGE_MAX 283→294, fullHarness range 281→294                            |

## v1.7.15 Adopted

- AD-0012-0007: Panel scoring L1/L2 from real evidence — l1/l2 fixed-zero generation prohibited (REQ-0041, REQ-0042)
- AD-0012-0008: weightedTotal = min(l1.total, l2.total) always enforced (REQ-0043)
- AD-0012-0009: converged requires iterationCount >= 2 + plateauLookback >= 2 in CalibrationLoader schema (REQ-0044)
- AD-0012-0010: plateau/max-iterations termination rules hardened (REQ-0045, REQ-0046)
- AD-0012-0011: reviewerLogs[] append-only cumulative (REQ-0047)
- AD-0012-0012: reviewer CLI mandatory, placeholder reject list frozen (REQ-0048)
- AD-0012-0013: commitSha mandatory in full-harness (REQ-0049)
- AD-0012-0014: specCoverage from real diffs only, zero-seeded prohibited (REQ-0050)
- AD-0012-0015: uiFidelity observation-only, synthetic mockPaths pass prohibited (REQ-0051)
- AD-0012-0016: extractHtmlLabelsFromString empty impl removed, moved to uiObservation.ts (REQ-0052)
- AD-0012-0017: CalibrationLoader wired in execution.ts (not config.ts) (REQ-0053)
- AD-0012-0018: packVersion from pack metadata only, hardcode prohibited (REQ-0054)
- AD-0012-0019: docs/SKILL/README reality sync — claims match runtime failure conditions (REQ-0055)
- AD-0012-0020: fail-fast on missing evidence — no silent fallback (REQ-0056)

### Traceability Chain (v1.7.15 additions)

```text
REQ-0041..0044 → US-0012-0026 → AC-0012-0026-01..03 → BR-0012-0041..0047 → EX-0012-0041..0045 → TC-0012-0030..0035
REQ-0048..0049,0053,0056 → US-0012-0027 → AC-0012-0027-01..04 → BR-0012-0048..0049,0053,0056 → EX-0012-0046..0047,0050,0053 → TC-0012-0036..0039
REQ-0050..0052 → US-0012-0028 → AC-0012-0028-01..03 → BR-0012-0050..0052 → EX-0012-0048..0049,0054 → TC-0012-0040..0042
REQ-0054..0055 → US-0012-0029 → AC-0012-0029-01..02 → BR-0012-0054..0055 → EX-0012-0051..0052 → TC-0012-0043..0045
```

## v1.7.15 Rejected

- RJ-0012-0003: Silent fallback on missing evidence
  - DO NOT reintroduce silent fallback on missing evidence
  - Temptation: fill default values to keep pipeline green when evidence is partially available
  - Reason: silent fallback produces partially-grounded evidence that appears valid but is not truthful

- RJ-0012-0004: Copy discussion 3-layer scores to scoringTrace
  - DO NOT copy discussion 3-layer scores to scoringTrace
  - Temptation: reduce re-compute cost by reusing discussion evaluation results
  - Reason: discussion scores measure design direction quality (what); prototyping scores measure implementation fidelity (how well) — different evaluation targets

- RJ-0012-0005: Single-iteration converged
  - DO NOT accept single-iteration converged
  - Temptation: short-circuit to save runtime when first iteration exceeds threshold
  - Reason: single iteration provides no plateau data, no score progression, and no convergence evidence

- RJ-0012-0006: Auto-generate mockPaths.status="pass"
  - DO NOT auto-generate mockPaths.status="pass"
  - Temptation: reduce evidence authoring burden by generating pass entries for all declared mock paths
  - Reason: synthetic pass entries bypass actual browser QA verification and produce false-positive fidelity reports

- RJ-0012-0007: Hardcode packVersion
  - DO NOT hardcode packVersion
  - Temptation: bypass calibration plumbing by setting packVersion: "1.0.0" directly
  - Reason: hardcoded packVersion creates drift between calibration pack metadata and runtime summary

- RJ-0012-0008: Fallback resolvedReviewer ?? "qfai"
  - DO NOT use fallback resolvedReviewer ?? "qfai"
  - Temptation: keep CLI frictionless by auto-filling reviewer when not specified
  - Reason: auto-filled reviewer identity defeats the purpose of human accountability in review signoff
