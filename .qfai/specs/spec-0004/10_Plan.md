# 10 Plan

- Spec: spec-0004
- Parent: CAP-0004
- Role: Architect + TestStrategist

## 1. 実装戦略

### 新規作成

| ファイル                                            | 責務                                                                    |
| --------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/qfai/src/core/doctor.ts`                  | doctor 診断エンジン本体。各チェッカーを順次実行し、Issue 配列を集約する |
| `packages/qfai/src/core/doctor/configChecker.ts`    | US-0004-0001: qfai.config.yaml の存在・スキーマ妥当性チェック           |
| `packages/qfai/src/core/doctor/directoryChecker.ts` | US-0004-0002: .qfai/ 配下の必要ディレクトリ存在チェック                 |
| `packages/qfai/src/core/doctor/pathResolver.ts`     | US-0004-0003: 設定ファイル内パスの解決正確性・パストラバーサル検出      |
| `packages/qfai/src/core/doctor/legacyDetector.ts`   | US-0004-0004: v1.4.25 以前のレガシーレイアウト検出                      |
| `packages/qfai/src/core/doctor/types.ts`            | DoctorIssue, DoctorResult, CheckStatus 等の型定義                       |
| `packages/qfai/src/cli/commands/doctor.ts`          | CLI エントリポイント。--format json, --fail-on オプション処理           |

### 修正

| ファイル                         | 変更内容                  |
| -------------------------------- | ------------------------- |
| `packages/qfai/src/cli/index.ts` | doctor サブコマンドの登録 |

## 2. テスト戦略

### L5 E2E テスト (`tests/e2e/`)

| テストファイル             | アノテーション              | 検証内容                                 |
| -------------------------- | --------------------------- | ---------------------------------------- |
| `tests/e2e/doctor.test.ts` | QFAI:SPEC-0004:US-0004-0001 | 有効な設定での doctor 正常終了           |
| `tests/e2e/doctor.test.ts` | QFAI:SPEC-0004:US-0004-0002 | ディレクトリ欠落時の警告出力             |
| `tests/e2e/doctor.test.ts` | QFAI:SPEC-0004:US-0004-0003 | パストラバーサル検出時のエラー終了       |
| `tests/e2e/doctor.test.ts` | QFAI:SPEC-0004:US-0004-0004 | レガシーレイアウト検出時の info 警告     |
| `tests/e2e/doctor.test.ts` | QFAI:SPEC-0004:US-0004-0005 | --format json での JSON 出力パース可能性 |

### L3 Integration テスト (`tests/integration/`)

| テストファイル                                      | アノテーション              | 検証内容                           |
| --------------------------------------------------- | --------------------------- | ---------------------------------- |
| `tests/integration/doctor/configChecker.test.ts`    | QFAI:SPEC-0004:TC-0004-0001 | 有効な config での ok 結果         |
| `tests/integration/doctor/configChecker.test.ts`    | QFAI:SPEC-0004:TC-0004-0002 | config 不在時のエラー Issue 生成   |
| `tests/integration/doctor/configChecker.test.ts`    | QFAI:SPEC-0004:TC-0004-0003 | 必須フィールド欠落時のエラー Issue |
| `tests/integration/doctor/configChecker.test.ts`    | QFAI:SPEC-0004:TC-0004-0004 | 型不正時のエラー Issue             |
| `tests/integration/doctor/directoryChecker.test.ts` | QFAI:SPEC-0004:TC-0004-0005 | 全ディレクトリ存在時の ok          |
| `tests/integration/doctor/directoryChecker.test.ts` | QFAI:SPEC-0004:TC-0004-0006 | ディレクトリ欠落時の warning Issue |
| `tests/integration/doctor/pathResolver.test.ts`     | QFAI:SPEC-0004:TC-0004-0007 | パス解決成功                       |
| `tests/integration/doctor/pathResolver.test.ts`     | QFAI:SPEC-0004:TC-0004-0008 | パス解決失敗時の warning           |
| `tests/integration/doctor/pathResolver.test.ts`     | QFAI:SPEC-0004:TC-0004-0009 | パストラバーサル検出               |
| `tests/integration/doctor/legacyDetector.test.ts`   | QFAI:SPEC-0004:TC-0004-0010 | spec-pack 形式検出                 |
| `tests/integration/doctor/legacyDetector.test.ts`   | QFAI:SPEC-0004:TC-0004-0011 | 非推奨ディレクトリ検出             |
| `tests/integration/doctor/legacyDetector.test.ts`   | QFAI:SPEC-0004:TC-0004-0012 | マイグレーション suggested_action  |
| `tests/integration/doctor/jsonOutput.test.ts`       | QFAI:SPEC-0004:TC-0004-0013 | JSON 出力正常系                    |
| `tests/integration/doctor/jsonOutput.test.ts`       | QFAI:SPEC-0004:TC-0004-0014 | JSON 出力エラー含有                |
| `tests/integration/doctor/failOn.test.ts`           | QFAI:SPEC-0004:TC-0004-0015 | --fail-on warning での終了コード   |
| `tests/integration/doctor/failOn.test.ts`           | QFAI:SPEC-0004:TC-0004-0016 | --fail-on error での終了コード     |
| `tests/integration/doctor/help.test.ts`             | QFAI:SPEC-0004:TC-0004-0017 | --help 表示                        |
| `tests/integration/doctor/i18n.test.ts`             | QFAI:SPEC-0004:TC-0004-0018 | 日本語メッセージ検証               |

### L4 API テスト

- 対象外（QFAI は API サービスではない）

## 3. 依存関係

| 依存先                | 依存内容                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| spec-0001 (qfai init) | doctor は .qfai/ ディレクトリ構造と qfai.config.yaml の存在を前提とする。init 未実行環境では config 不在エラーが期待動作となる |

## 4. i18n 実装方式

### 方式

静的辞書ファイル（JSON 形式）+ フォールバック英語キー

### アーキテクチャ

| 項目           | 内容                                                                                  |
| -------------- | ------------------------------------------------------------------------------------- |
| 辞書ファイル   | `src/i18n/messages.json`（key-value ペア）                                            |
| キー命名規則   | `<module>.<messageId>` 形式（例: `doctor.configNotFound`, `doctor.directoryMissing`） |
| デフォルト言語 | 日本語 (ja)                                                                           |
| フォールバック | 翻訳キーが見つからない場合、英語キー文字列をそのまま返却                              |

### ルックアップ関数

```typescript
function t(key: string, params?: Record<string, string>): string;
```

- 各モジュールで辞書を import し、`t(key, params?)` を呼び出してメッセージを取得する
- `params` が指定された場合、`{paramName}` プレースホルダを置換する

### 選定理由

- TC-04 制約（最小依存）に適合する。i18next は日本語のみのサポートに対して過剰である
- 外部ライブラリ不要で、バンドルサイズ・依存管理コストを抑制できる

### 将来方針

- 多言語対応が必要になった時点で再検討する（YAGNI 原則）
- その時点で i18next 等のライブラリ導入を評価する

## 5. リスクと軽減策

| リスク                                                  | 影響                             | 軽減策                                                                                                     |
| ------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| qfai.config.yaml のスキーマ変更に doctor が追従できない | 偽陽性/偽陰性の診断結果          | config スキーマを共通モジュール (`packages/qfai/src/core/config/schema.ts`) から参照し、単一定義を維持する |
| レガシーレイアウトパターンの網羅性不足                  | 検出漏れ                         | legacyDetector にパターン定義配列を外出しし、テストで各パターンを個別検証する                              |
| パストラバーサル検出の OS 依存                          | Windows/macOS でのパス区切り差異 | Node.js path.resolve + path.relative を使用し、OS 非依存の正規化を行う                                     |
| --format json 出力スキーマの後方互換性                  | ツール連携の破壊                 | DoctorResult 型を明示的にバージョニングし、スキーマ変更時は major bump とする                              |

## 6. 実装順序

1. **US-0004-0001**: configChecker - 設定ファイル診断（他チェッカーの基盤となる config 読み込みロジックを含む）
2. **US-0004-0002**: directoryChecker - ディレクトリ構造診断（config 読み込み結果を利用）
3. **US-0004-0003**: pathResolver - パス解決診断（config のパス定義を利用）
4. **US-0004-0004**: legacyDetector - レガシー警告（独立性が高いが、ディレクトリスキャンのパターンを参考にする）
5. **US-0004-0005**: JSON 診断出力 + --fail-on（全チェッカー完成後に出力フォーマッタを実装）
