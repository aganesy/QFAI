# 10 Plan

- Spec: spec-0003
- Parent: CAP-0003

## 実装戦略

### 主要モジュール

| モジュール                   | パス                                                | 操作 | 説明                                                                                   |
| ---------------------------- | --------------------------------------------------- | ---- | -------------------------------------------------------------------------------------- |
| report コマンド              | `packages/qfai/src/cli/commands/report.ts`          | 修正 | CLI エントリポイント。--format, --base-url, --run-validate, --help オプション処理      |
| report コア                  | `packages/qfai/src/core/report.ts`                  | 修正 | レポート生成ロジック（Markdown/JSON 出力）                                             |
| Markdown レンダラー          | `packages/qfai/src/core/report/markdownRenderer.ts` | 新規 | エグゼクティブサマリー、イシュー一覧、トレーサビリティマトリックスの Markdown 生成     |
| JSON レンダラー              | `packages/qfai/src/core/report/jsonRenderer.ts`     | 新規 | 構造化レポートデータの JSON 生成                                                       |
| リンク付与                   | `packages/qfai/src/core/report/linkResolver.ts`     | 新規 | --base-url に基づくファイルパスからリポジトリ URL への変換（末尾スラッシュ正規化含む） |
| validate 連携                | `packages/qfai/src/core/report/validateRunner.ts`   | 新規 | --run-validate 時の内部バリデーション実行・結果取得                                    |
| トレーサビリティマトリックス | `packages/qfai/src/core/traceabilityMatrix.ts`      | 修正 | レポート向けマトリックスデータ構築                                                     |
| 型定義                       | `packages/qfai/src/core/types.ts`                   | 修正 | ReportOutput, ReportOptions 等の型追加                                                 |

### レポート出力構造（Markdown）

```
# QFAI Validation Report
## Executive Summary
## Issues
## Traceability Matrix
```

### レポート出力構造（JSON）

```
{
  summary: { errors, warnings, infos, timestamp },
  issues: Issue[],
  traceability: { matrix: TraceEntry[] }
}
```

## テスト戦略

### L5 E2E テスト（tests/e2e/）

| テストファイル                          | アノテーション              | 検証内容                                                 |
| --------------------------------------- | --------------------------- | -------------------------------------------------------- |
| `tests/e2e/report-markdown.test.ts`     | QFAI:SPEC-0003:US-0003-0001 | validate.json から Markdown レポート生成、セクション確認 |
| `tests/e2e/report-json.test.ts`         | QFAI:SPEC-0003:US-0003-0002 | validate.json から JSON レポート生成、キー確認           |
| `tests/e2e/report-base-url.test.ts`     | QFAI:SPEC-0003:US-0003-0003 | --base-url でリポジトリリンク付与確認                    |
| `tests/e2e/report-run-validate.test.ts` | QFAI:SPEC-0003:US-0003-0004 | --run-validate で内部バリデーション実行確認              |

### L3 Integration テスト（tests/integration/）

| テストファイル                                  | アノテーション                                                        | 検証内容                                                    |
| ----------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------- |
| `tests/integration/report-markdown.test.ts`     | QFAI:SPEC-0003:TC-0003-0001, TC-0003-0002, TC-0003-0012               | Markdown レンダリング（正常系、ゼロイシュー、複数イシュー） |
| `tests/integration/report-error.test.ts`        | QFAI:SPEC-0003:TC-0003-0003, TC-0003-0005, TC-0003-0013, TC-0003-0014 | validate.json 不在エラー、終了コード検証                    |
| `tests/integration/report-json.test.ts`         | QFAI:SPEC-0003:TC-0003-0004                                           | JSON レンダリング（summary, issues, traceability キー確認） |
| `tests/integration/report-base-url.test.ts`     | QFAI:SPEC-0003:TC-0003-0006, TC-0003-0007                             | リンク変換（Markdown/JSON）、末尾スラッシュ正規化           |
| `tests/integration/report-run-validate.test.ts` | QFAI:SPEC-0003:TC-0003-0008, TC-0003-0009                             | --run-validate 正常系・エラー検出系                         |
| `tests/integration/report-help.test.ts`         | QFAI:SPEC-0003:TC-0003-0010                                           | --help 出力テスト                                           |
| `tests/integration/report-idempotent.test.ts`   | QFAI:SPEC-0003:TC-0003-0011                                           | 同一入力で2回実行、出力一致確認                             |

### L4 API テスト

- 対象外: QFAI は API サービスではないため

## 依存関係

- spec-0002（qfai validate）: `validate.json` がレポート生成の入力として必要
- spec-0001（qfai init）: `.qfai/` ディレクトリ構造が前提（間接依存）
- --run-validate オプション使用時は `packages/qfai/src/core/validate.ts` を内部呼び出しする

## リスクと軽減策

| リスク                                                       | 影響度 | 軽減策                                                                                    |
| ------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------- |
| validate.json スキーマ変更時のレポート破損                   | 高     | validate.json のスキーマバージョニング。レポート側でスキーマバリデーション実施            |
| 大規模プロジェクトでのレポート肥大化                         | 中     | イシュー件数が多い場合のサマリー集約。--limit オプションの将来的な追加を検討              |
| --base-url のプラットフォーム差異（GitHub/GitLab/Bitbucket） | 中     | URL パターンのテストケースを複数プラットフォームで用意。TC-0003-0006, TC-0003-0007 で検証 |
| --run-validate と validate.json の同時指定時の挙動           | 低     | --run-validate 指定時は validate.json を無視し、内部実行結果を優先。CLI ヘルプで明記      |

## 実装順序

1. **US-0003-0001**: Markdown レポート生成（基盤機能。validate.json 読み込み + Markdown 出力）
2. **US-0003-0002**: JSON レポート生成（US-0003-0001 のデータモデルを共有し、出力フォーマットのみ変更）
3. **US-0003-0003**: リポジトリリンク付与（US-0003-0001/0002 の出力にリンク変換を追加）
4. **US-0003-0004**: 内部バリデーション実行（validate コア連携。US-0003-0001 の入力ソースを拡張）
