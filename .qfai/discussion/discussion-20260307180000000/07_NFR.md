# 07 Non-Functional Requirements (NFR)

## Categories

| Category        | Description              |
| --------------- | ------------------------ |
| performance     | 処理速度・メモリ使用量   |
| reliability     | 信頼性・正確性           |
| security        | セキュリティ             |
| scalability     | スケーラビリティ         |
| usability       | 使いやすさ               |
| maintainability | 保守性                   |
| operability     | 運用性                   |

## Requirements

| NFR-ID   | Category        | Title                          | Target                                        | Measurement                                   | Source              | Priority |
| -------- | --------------- | ------------------------------ | --------------------------------------------- | --------------------------------------------- | ------------------- | -------- |
| NFR-0001 | performance     | バリデーション実行時間         | 中規模プロジェクト（spec 5個）で 10秒以内      | `time qfai validate` の実測                   | SRC-0001            | must     |
| NFR-0002 | performance     | 大規模プロジェクト対応         | spec 50個、テストファイル 1000個で 60秒以内    | CI 環境での実測                               | SRC-0001            | should   |
| NFR-0003 | performance     | ファイル探索効率               | fast-glob によるストリーム処理、上限 10,000件  | TestFileScan.truncated フラグ                  | SRC-0009            | must     |
| NFR-0010 | reliability     | バリデーション正確性           | 誤検知率（False Positive）5% 未満              | テストスイートでのリグレッションチェック       | SRC-0001            | must     |
| NFR-0011 | reliability     | ウェイバー正確性               | ウェイバー適用による意図しない Issue 消失なし  | ウェイバーテストケース                         | SRC-0009            | must     |
| NFR-0012 | reliability     | 冪等性                         | 同一入力に対して同一出力を保証                 | 2回連続実行の diff                             | SRC-0001            | must     |
| NFR-0013 | reliability     | レガシー互換性                 | spec-pack / v1.4.16 形式のフォールバック検出   | レガシーフィクスチャでのテスト                 | SRC-0001            | should   |
| NFR-0020 | security        | パストラバーサル防止           | 設定ファイルのパスが root 外を参照しないこと   | パス解決ロジックのテスト                       | SRC-0009            | must     |
| NFR-0021 | security        | 危険 SQL 操作検出              | DB コントラクトの DROP/TRUNCATE 検出           | QFAI-DB-001 ルール                             | SRC-0008            | must     |
| NFR-0022 | security        | 双方向テキスト検出             | Bidi 制御文字の混入防止                        | check-bidi.mjs スクリプト                      | SRC-0016            | should   |
| NFR-0030 | scalability     | モノレポ対応                   | pnpm workspace 構造でのビルド・テスト・配布    | packages/qfai/ 単独ビルド成功                  | SRC-0002            | must     |
| NFR-0031 | scalability     | バリデータ拡張性               | 新規バリデータの追加が validate.ts に1行追加   | バリデータ関数シグネチャの統一                  | SRC-0008            | should   |
| NFR-0040 | usability       | エラーメッセージ品質           | 各 Issue に code, message, suggested_action    | Issue 型の必須フィールド                       | SRC-0009            | must     |
| NFR-0041 | usability       | 日本語サポート                 | doctor コマンドの日本語メッセージ対応          | ローカライゼーションテスト                     | SRC-0006            | should   |
| NFR-0042 | usability       | CLI ヘルプ                     | 各コマンドに `--help` で使用方法表示           | CLI テスト                                     | SRC-0010            | must     |
| NFR-0050 | maintainability | TypeScript 型安全性            | strict モードで型エラーゼロ                    | `pnpm check-types`                             | SRC-0002            | must     |
| NFR-0051 | maintainability | テストカバレッジ               | ユニットテスト + アセットテスト包括実行        | `pnpm test` 全パス                             | SRC-0002            | must     |
| NFR-0052 | maintainability | ビルド再現性                   | tsup による ESM/CJS デュアルビルド成功         | `pnpm build` 成功                              | SRC-0002            | must     |
| NFR-0053 | maintainability | パッケージ整合性               | verify-pack.mjs でパッケージ配布物の完全性検証 | `pnpm verify:pack`                             | SRC-0016            | must     |
| NFR-0060 | operability     | CI/CD 統合                     | GitHub Actions でのバリデーション自動実行      | `.github/workflows/` 定義                      | SRC-0005            | must     |
| NFR-0061 | operability     | 終了コード規約                 | 0=成功, 1=失敗（failOn 基準）                  | CLI テスト                                     | SRC-0010            | must     |
| NFR-0062 | operability     | Node.js バージョン             | >= 18.0.0 必須、package.json engines で宣言    | `engines` フィールド                           | SRC-0002            | must     |
