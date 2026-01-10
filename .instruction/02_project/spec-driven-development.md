---
category: project
update-frequency: occasional
dependencies:
  - 00_universal/thinking.md
  - 00_universal/quality.md
  - 00_universal/communication.md
  - 01_specialties/planning.md
  - 01_specialties/testing.md
  - 02_project/development.md
  - 02_project/tech-stack.md
  - 02_project/patterns.md
version: 1.0.0
---

> **言語指示（厳守）**
>
> - 報告・出力: 日本語（Plan も含む）

# 仕様書駆動開発（QFAI Toolkit）運用ガイド

QFAI は `.qfai/` 配下の成果物を SSOT として扱い、検証とレポートで整合性を担保する。
契約参照の SSOT は Spec（QFAI-CONTRACT-REF）とする。

## 全体フロー（成果物ベース）

```text
.qfai/require（上流要件）
        ↓
.qfai/specs（Spec Pack: spec/delta/scenario）
        ↓
.qfai/contracts（UI/API/DB）
        ↓
qfai validate → .qfai/out/validate.json
        ↓
qfai report → .qfai/out/report.md
```

## フェーズ別の要点

### Phase 0: 要件の取り込み

- `.qfai/require/` に要件資料を集約する
- 取り込み後は Spec 作成の入力として参照する

### Phase 1: Spec Pack 作成

- 配置: `.qfai/specs/spec-0001/`
- 必須ファイル: `spec.md` / `delta.md` / `scenario.feature`
- 命名規約は `docs/rules/naming.md` に従う
- `delta.md` には変更内容/影響/受入観点を記録する

### Phase 2: Contracts の作成

- UI/API/DB の契約を `.qfai/contracts/` に配置する
- Spec の QFAI-CONTRACT-REF を必須にする（none 可）
- Scenario からの契約 ID 参照は任意（未知参照の severity は設定で制御）

### Phase 3: 検証とレポート

- `npx qfai validate --fail-on error` でエラー 0 を確認
- `npx qfai report` でレポートを生成する

## 品質ゲート（最低限）

- Spec Pack が 1 つ以上存在する
- Spec/Scenario/Contracts の ID 形式が正しい
- BR → SC のトレーサビリティが成立する
- Spec → Contract のトレーサビリティが成立する
- SC → Test のトレーサビリティが成立する
- `validate` の error が 0

## 実装に進む前の確認

- 既存の実装パターンは `.instruction/02_project/patterns.md` を参照
- 不明点が残る場合は実装せず質問する
