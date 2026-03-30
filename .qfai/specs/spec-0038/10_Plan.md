# 10 Plan

## Purpose

- How-only plan for spec-0038 implementation.
- This file is the single source of truth for How.

## Implementation Strategy

### Phase 1: specDiffDetector モジュール

- Location: `packages/qfai/src/core/specDiffDetector.ts`
- Responsibilities:
  - Source A: `git diff --name-only <baseBranch>..HEAD` → spec-id抽出
  - Source B: `git diff --name-only` + `git diff --name-only --staged` → spec-id抽出
  - Source C: evidence timestamp vs spec file mtime 比較
  - Source D: `09_delta.md` パース
  - Union統合: `changed_specs = A ∪ B ∪ C ∪ D`
  - 分類: implemented / missing / stale / unchanged
- Dependencies: `child_process` (exec), `fs.stat`, `specLayout.ts` (collectSpecEntries)
- Config: `qfai.config.yaml` に `baseBranch` 追加（デフォルト: `origin/main`）

### Phase 2: traceabilityValidator モジュール

- Location: `packages/qfai/src/core/validators/traceabilityIntegrity.ts`
- Responsibilities:
  - 変更specの BR/AC ファイル特定
  - Traceability Ledger (`16_Traceability-ledger.md`) のマッピング取得
  - 紐づき実装ファイルの diff 有無チェック
  - ValidationIssue 生成 (QFAI-TRACE-001)
- Dependencies: `specLayout.ts`, `validate.ts` (ValidationResult/ValidationIssue)
- Fallback: Ledger不在時は warning + スキップ

### Phase 3: validate パイプライン統合

- Location: `packages/qfai/src/core/validate.ts` (既存ファイル修正)
- Changes: traceabilityValidator を validateProject() に統合
- Error code: QFAI-TRACE-001 (spec-implementation traceability drift)

### Phase 4: SKILL.md 改修

- Files:
  - `.github/skills/qfai-prototyping/SKILL.md` — Spec Auto-Discovery Protocol セクション追加
  - `.github/skills/qfai-implement/SKILL.md` — Spec Auto-Discovery Protocol セクション追加
- Content: 4ソース差分検出手順、フォールバック動作、ユーザー確認フロー

### Phase 5: config 拡張

- File: `packages/qfai/src/core/config.ts`
- Changes: `QfaiConfig` 型に `baseBranch?: string` 追加
- Default: `origin/main`

## Test Strategy

### Unit Tests

- `specDiffDetector.test.ts`: 各Source単体テスト、union統合テスト、フォールバックテスト
- `traceabilityIntegrity.test.ts`: BR変更+実装変更、BR変更+実装未変更、Ledger不在
- `config.test.ts`: baseBranch設定の読み込み

### Integration Tests

- prototyping SKILL.md + specDiffDetector 連携テスト
- implement SKILL.md + specDiffDetector 連携テスト
- validate + traceabilityValidator パイプラインテスト

### Test Layers (per test-layers.md)

| Layer | Target | Annotation pattern |
| ----- | ------ | ------------------- |
| Unit | specDiffDetector, traceabilityValidator, config | QFAI:SPEC-0038:TC-YYYY |
| Integration | validate pipeline, SKILL.md integration | QFAI:SPEC-0038:TC-YYYY |

## Risk Mitigation

- R1 (git不在): Source C/D フォールバック + --full フラグ
- R2 (shallow clone): timestamp + delta.md バックアップ
- R3 (偽陰性): union戦略で4ソース統合、ファイルレベル検出
- R4 (後方互換): Diff Contextセクション不在でもエラーにしない
