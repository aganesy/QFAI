# 07 Constraints

## Technical Constraints

| ID    | Constraint                       | Rationale                                             | Impact                               |
| ----- | -------------------------------- | ----------------------------------------------------- | ------------------------------------ |
| TC-01 | Node.js >= 18.0.0 必須           | ES2022+ 機能、fetch API、structuredClone 等の使用     | 実行環境の制約                       |
| TC-02 | TypeScript 5.6.3                 | 最新の型機能（satisfies 演算子等）の利用              | ビルド環境の制約                     |
| TC-03 | pnpm >= 9.12.3（monorepo 管理）  | workspace 機能、依存関係の厳密な管理                  | 開発環境の制約                       |
| TC-04 | ESM / CJS デュアルビルド（tsup） | npm 配布での幅広い互換性                              | ビルド設定の制約                     |
| TC-05 | @cucumber/gherkin v37+ 依存      | Gherkin パース（Feature/Scenario 解析）               | パーサーの互換性                     |
| TC-06 | jsdom v26+ 依存                  | DOM クローリング（UI フィデリティ検証）               | ブラウザエミュレーションの制約       |
| TC-07 | fast-glob v3+ 依存               | ファイル検索のパフォーマンス                          | ファイルシステムの制約               |
| TC-08 | yaml v2+ 依存                    | YAML 1.2 仕様のパース                                 | 設定ファイル形式の制約               |
| TC-09 | バリデータは純粋 async 関数      | 副作用なし、Issue[] を返すのみ                        | アーキテクチャの制約                 |
| TC-10 | ファイル検索上限 10,000 件       | メモリ・パフォーマンスの安全限界                      | 大規模プロジェクトの制約             |
| TC-11 | Windows Developer Mode 必須      | Windows で symlink 作成に Developer Mode 必要         | Windows 環境の実行制約               |
| TC-12 | symlink type 指定（Windows）     | Windows は symlink 種別を明示（dir/file）             | クロスプラットフォーム制約           |
| TC-13 | Git symlink は相対パスで記録     | リポジトリルートからの相対パスで格納                  | リポジトリ可搬性の制約               |
| TC-14 | .agent.md サフィックス必須       | GitHub Copilot のエージェント認識に必要               | ファイル命名の制約                   |
| TC-15 | SDP v1 runtime: SKILL.md/prompt  | No TS changes; spec/policy docs define SDP separately | Diff logic: prompt descriptions only |
| TC-16 | git diff の利用は任意            | git がない環境やシャローコピーでの動作を保証          | Source B, C でのフォールバックが必須 |

## Operational Constraints

| ID    | Constraint                                    | Rationale                                            | Impact                            |
| ----- | --------------------------------------------- | ---------------------------------------------------- | --------------------------------- |
| OC-01 | CI/CD 環境で 2分以内に完了                    | CI パイプラインのタイムアウト回避                    | バリデーション設計の制約          |
| OC-02 | validate.json は内部契約（安定 API ではない） | バージョン間の互換性保証なし                         | 外部ツール連携の制約              |
| OC-03 | .qfai/evidence/ はデフォルトで gitignore      | ローカル成果物であり、リポジトリ肥大化を防ぐ         | 証跡管理の制約                    |
| OC-04 | review-pack は append-only                    | レビュー履歴の改竄防止                               | レビューシステムの制約            |
| OC-05 | スキルファイルは QFAI パッケージの SSOT       | skills.local/ のみユーザーカスタマイズ可能           | カスタマイズ範囲の制約            |
| OC-06 | --force による既存 symlink の再作成           | マイグレーション・破損修復のサポート                 | init 運用の制約                   |
| OC-07 | qfai init は冪等（idempotent）                | 既存の有効な symlink はスキップする                  | init 運用の制約                   |
| OC-08 | /qfai-verify は SDP 適用外                    | 品質ゲートとして全 spec の一貫性を保証する必要がある | verify のみインクリメンタル対象外 |
| OC-09 | \_policies 変更時は保守的に全 spec 影響       | policy 変更の影響範囲を正確に判定することは困難      | false positive 許容、漏れは不許容 |

## Legal / Compliance Constraints

| ID    | Constraint                       | Rationale                      | Impact           |
| ----- | -------------------------------- | ------------------------------ | ---------------- |
| LC-01 | MIT ライセンス                   | OSS としての自由な利用・再配布 | ライセンス互換性 |
| LC-02 | 依存パッケージのライセンス互換性 | MIT / ISC / Apache-2.0 等のみ  | 依存関係管理     |

## Budget Constraints

対象外（OSS プロジェクトのため予算制約は設定しない）。

## Timeline Constraints

| ID    | Constraint                                         | Rationale                            |
| ----- | -------------------------------------------------- | ------------------------------------ |
| DL-01 | v1.5.3 は現在リリース済み                          | 本ディスカッションは既存実装の仕様化 |
| DL-02 | 破壊的変更は次のメジャーバージョン（v2.0）まで保留 | 後方互換性の維持                     |
