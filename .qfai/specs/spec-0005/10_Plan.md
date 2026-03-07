# 10 Plan

- Spec: spec-0005
- Parent: CAP-0005
- Role: Architect + TestStrategist

## 1. 実装戦略

### 新規作成

| ファイル | 責務 |
| --- | --- |
| `packages/qfai/src/core/decisionGuardrails.ts` | ガードレールエンジン本体。ガードレール検出・フィルタリング・整合性チェックを統括する |
| `packages/qfai/src/core/guardrails/scanner.ts` | US-0005-0001: _policies/ および spec 内からガードレール定義を検出・パースする |
| `packages/qfai/src/core/guardrails/extractor.ts` | US-0005-0002: キーワードによるガードレールフィルタリング（大文字小文字不区別の部分一致） |
| `packages/qfai/src/core/guardrails/checker.ts` | US-0005-0003: 成果物とガードレールの整合性チェック、Issue 生成 |
| `packages/qfai/src/core/guardrails/types.ts` | Guardrail, GuardrailIssue, CheckResult 等の型定義 |
| `packages/qfai/src/cli/commands/guardrails.ts` | CLI エントリポイント。list / extract / check サブコマンド処理 |

### 修正

| ファイル | 変更内容 |
| --- | --- |
| `packages/qfai/src/cli/index.ts` | guardrails サブコマンドの登録 |

## 2. テスト戦略

### L5 E2E テスト (`tests/e2e/`)

| テストファイル | アノテーション | 検証内容 |
| --- | --- | --- |
| `tests/e2e/guardrails.test.ts` | QFAI:SPEC-0005:US-0005-0001 | guardrails list でガードレール一覧が表示される |
| `tests/e2e/guardrails.test.ts` | QFAI:SPEC-0005:US-0005-0002 | guardrails extract --keyword でフィルタリング結果が表示される |
| `tests/e2e/guardrails.test.ts` | QFAI:SPEC-0005:US-0005-0003 | guardrails check で違反検出時に Issue 形式で出力される |

### L3 Integration テスト (`tests/integration/`)

| テストファイル | アノテーション | 検証内容 |
| --- | --- | --- |
| `tests/integration/guardrails/scanner.test.ts` | QFAI:SPEC-0005:TC-0005-0001 | _policies/ と spec 両方からガードレールを検出 |
| `tests/integration/guardrails/scanner.test.ts` | QFAI:SPEC-0005:TC-0005-0002 | テーブル形式（ID・タイトル・ソースファイル）での出力 |
| `tests/integration/guardrails/scanner.test.ts` | QFAI:SPEC-0005:TC-0005-0003 | 空ワークスペースでの空結果ハンドリング |
| `tests/integration/guardrails/extractor.test.ts` | QFAI:SPEC-0005:TC-0005-0004 | キーワード部分一致フィルタリング（大文字小文字不区別） |
| `tests/integration/guardrails/extractor.test.ts` | QFAI:SPEC-0005:TC-0005-0005 | 該当なし時の空結果メッセージ |
| `tests/integration/guardrails/checker.test.ts` | QFAI:SPEC-0005:TC-0005-0006 | 全適合時の issues=0、終了コード 0 |
| `tests/integration/guardrails/checker.test.ts` | QFAI:SPEC-0005:TC-0005-0007 | 違反時の Issue 形式出力（code, message, suggested_action） |
| `tests/integration/guardrails/checker.test.ts` | QFAI:SPEC-0005:TC-0005-0008 | 複数違反時の終了コード 1 |

### L4 API テスト

- 対象外（QFAI は API サービスではない）

## 3. 依存関係

| 依存先 | 依存内容 |
| --- | --- |
| spec-0002 (qfai validate) | guardrails check は validate の検証結果フォーマット（Issue 形式: code, message, suggested_action）を共有する。Issue 型定義は共通モジュールから参照する |
| spec-0001 (qfai init) | _policies/ および specs/ ディレクトリ構造が init で生成されていることが前提 |

## 4. リスクと軽減策

| リスク | 影響 | 軽減策 |
| --- | --- | --- |
| ガードレール定義フォーマットの未確定 | scanner のパースロジックが不安定になる | ガードレール定義フォーマットを `_policies/` 内の既存構造（Markdown の `## Rejected` セクション等）に基づいて確定し、型定義で制約する |
| キーワード検索の精度不足 | フィルタリング結果が期待と乖離する | 初期実装は部分一致に限定し、ファジー検索は将来スコープとする（spec で Non-goals として明記済み） |
| 成果物とガードレールの整合性定義が曖昧 | checker の判定基準が不明確になる | 整合性ルールを checker 内のルール定義配列として外出しし、各ルールを個別テストで検証する |
| _policies/ の構造変更への追従 | scanner がガードレールを検出できなくなる | scanner のパスパターンを設定化し、構造変更時はパターン追加のみで対応可能にする |

## 5. 実装順序

1. **US-0005-0001**: scanner + list - ガードレール検出・一覧表示（基盤となるスキャンロジックを最初に確立）
2. **US-0005-0002**: extractor + extract - キーワードフィルタリング（scanner の結果に対するフィルタ処理）
3. **US-0005-0003**: checker + check - 整合性チェック（scanner + 成果物読み込み + ルール適用の統合）
