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

| File | Reason |
| --- | --- |
| `validators/legacy/ddpCompatibility.ts` | Legacy DDP compatibility path 不要（current-only SSOT） |
| `validators/legacy/uixCompatibility.ts` | Legacy UIX compatibility path 不要 |
| `validators/legacy/index.ts` | Legacy barrel 不要 |
| `validators/legacyStatusDir.ts` | Legacy status directory check 不要 |
| `validators/migration/formatDetection.ts` | Migration format detection 不要 |
| `validators/uix/rollout.ts` | Rollout/phase-1 ratchet infrastructure 不要 |
| `assets/uix-rev/migration-review.md` | Migration review asset 不要 |

### Added Source Files (v1.7.14)

| File | Purpose |
| --- | --- |
| `core/domain/strategyDecision.ts` | Canonical strategy decision vocabulary (DR-0114) |
| `core/prototyping/recommendationSemantics.ts` | Semantic invariant SSOT helper (DR-0113) |
| `core/validators/uix/types.ts` | UIX validator shared types |
| `core/validators/uix/index.ts` | UIX validator barrel refactoring |
