# 07 Constraints

## Technical Constraints

| ID    | Constraint                                                            | Rationale                                                                                                            | Impact                               |
| ----- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| TC-01 | Node.js >= 18.0.0 必須                                                | ES2022+ 機能、fetch API、structuredClone 等の使用                                                                    | 実行環境の制約                       |
| TC-02 | TypeScript 5.6.3                                                      | 最新の型機能（satisfies 演算子等）の利用                                                                             | ビルド環境の制約                     |
| TC-03 | pnpm >= 9.12.3（monorepo 管理）                                       | workspace 機能、依存関係の厳密な管理                                                                                 | 開発環境の制約                       |
| TC-04 | ESM / CJS デュアルビルド（tsup）                                      | npm 配布での幅広い互換性                                                                                             | ビルド設定の制約                     |
| TC-05 | @cucumber/gherkin v37+ 依存                                           | Gherkin パース（Feature/Scenario 解析）                                                                              | パーサーの互換性                     |
| TC-06 | jsdom v26+ 依存                                                       | DOM クローリング（UI フィデリティ検証）                                                                              | ブラウザエミュレーションの制約       |
| TC-07 | fast-glob v3+ 依存                                                    | ファイル検索のパフォーマンス                                                                                         | ファイルシステムの制約               |
| TC-08 | yaml v2+ 依存                                                         | YAML 1.2 仕様のパース                                                                                                | 設定ファイル形式の制約               |
| TC-09 | バリデータは純粋 async 関数                                           | 副作用なし、Issue[] を返すのみ                                                                                       | アーキテクチャの制約                 |
| TC-10 | ファイル検索上限 10,000 件                                            | メモリ・パフォーマンスの安全限界                                                                                     | 大規模プロジェクトの制約             |
| TC-11 | Windows Developer Mode 必須                                           | Windows で symlink 作成に Developer Mode 必要                                                                        | Windows 環境の実行制約               |
| TC-12 | symlink type 指定（Windows）                                          | Windows は symlink 種別を明示（dir/file）                                                                            | クロスプラットフォーム制約           |
| TC-13 | Git symlink は相対パスで記録                                          | リポジトリルートからの相対パスで格納                                                                                 | リポジトリ可搬性の制約               |
| TC-14 | .agent.md サフィックス必須                                            | GitHub Copilot のエージェント認識に必要                                                                              | ファイル命名の制約                   |
| TC-15 | SDP v1 ランタイム: SKILL.md/prompt                                    | TS 変更なし; spec/policy 文書で SDP を別途定義                                                                       | Diff ロジック: プロンプト記述のみ    |
| TC-16 | git diff の利用は任意                                                 | git がない環境やシャローコピーでの動作を保証                                                                         | Source B, C でのフォールバックが必須 |
| TC-17 | 無限ループ防止: 全否定 3 連続 FAIL → アドバイザリー降格               | 全否定エージェントの無制限 FAIL によるスキル未完了を防止                                                             | レビューサイクルの収束保証           |
| TC-18 | test-list.md は `.qfai/specs/spec-XXXX/tdd/` に配置                   | 既存spec ディレクトリレイアウト規約への準拠                                                                          | スペック構造の制約                   |
| TC-19 | Phase 1 バリデータは既存エラーインフラを使用                          | 新しいエラーサブシステムを導入しない                                                                                 | アーキテクチャの制約                 |
| TC-20 | 非実装スキルは後方互換性を維持                                        | 実装フェーズのみが影響を受ける                                                                                       | 互換性の制約                         |
| TC-21 | Phase 2 は既存 tddList.ts を拡張                                      | Phase 1 コードとの一貫性維持、新ファイル作成禁止                                                                     | バリデータアーキテクチャの制約       |
| TC-22 | テストファイル実在チェックは Node.js fs.promises.stat を使用          | シェル実行なし、クロスプラットフォーム対応、ディレクトリ誤判定防止                                                   | ファイルシステムアクセスの制約       |
| TC-23 | Windows バックスラッシュのパス正規化                                  | Test file パスをフォワードスラッシュに正規化してから検査                                                             | クロスプラットフォーム制約           |
| TC-24 | parseFirstMarkdownTable 再利用（TC 収集は Markdown テーブル直接走査） | 既存ユーティリティの活用、重複実装禁止                                                                               | コード再利用の制約                   |
| TC-25 | instructions ファイルは create-only + force-disabled                  | 既存の instructions を上書きするとユーザーカスタマイズが消失する                                                     | instructions 保護の制約              |
| TC-26 | テンプレートアセットは 70行超の場合ファイル管理                       | ハードコードは可読性を損なう。copilot-instructions.md（17行）はハードコード可だが instructions（70-110行）はアセット | テンプレート管理の制約               |

## Operational Constraints

| ID    | Constraint                                             | Rationale                                            | Impact                            |
| ----- | ------------------------------------------------------ | ---------------------------------------------------- | --------------------------------- |
| OC-01 | CI/CD 環境で 2分以内に完了                             | CI パイプラインのタイムアウト回避                    | バリデーション設計の制約          |
| OC-02 | validate.json は内部契約（安定 API ではない）          | バージョン間の互換性保証なし                         | 外部ツール連携の制約              |
| OC-03 | .qfai/evidence/ はデフォルトで gitignore               | ローカル成果物であり、リポジトリ肥大化を防ぐ         | 証跡管理の制約                    |
| OC-04 | review-pack は append-only                             | レビュー履歴の改竄防止                               | レビューシステムの制約            |
| OC-05 | スキルファイルは QFAI パッケージの SSOT                | skills.local/ のみユーザーカスタマイズ可能           | カスタマイズ範囲の制約            |
| OC-06 | --force による既存 symlink の再作成                    | マイグレーション・破損修復のサポート                 | init 運用の制約                   |
| OC-07 | qfai init は冪等（idempotent）                         | 既存の有効な symlink はスキップする                  | init 運用の制約                   |
| OC-08 | /qfai-verify は SDP 適用外                             | 品質ゲートとして全 spec の一貫性を保証する必要がある | verify のみインクリメンタル対象外 |
| OC-09 | \_policies 変更時は保守的に全 spec 影響                | policy 変更の影響範囲を正確に判定することは困難      | false positive 許容、漏れは不許容 |
| OC-10 | 1バージョン = 1 PR ポリシー（v1.6.0）                  | v1.6.0の全変更を単一PRで提供                         | アトミックバージョニングの制約    |
| OC-11 | 全ラッパーフォーマットの同期（v1.6.0）                 | .agents, .claude, .codex を同一PRで更新              | ラッパー整合性の制約              |
| OC-12 | シリアル実行がデフォルト（v1.6.0）                     | 並列化は独立スライスのみ許可                         | 状態破損防止の制約                |
| OC-13 | 1バージョン = 1 PR ポリシー（v1.6.1）                  | v1.6.1の全変更を単一PRで提供                         | アトミックバージョニングの制約    |
| OC-14 | Phase 1 エラーコードは変更不可                         | 既存 CI パイプラインの破壊防止                       | 後方互換性の制約                  |
| OC-15 | test-list.md 未存在 spec は warning 維持               | TDDLIST_MISSING は error に昇格しない                | マイグレーション制約              |
| OC-16 | instructions 配布スコープは .github/instructions/ のみ | workflow、PR template は環境固有のため対象外         | 配布スコープの制約                |
| OC-17 | instructions アップグレードは v1.7.0 以降              | v1.6.3 は初回配布。手動削除→再init で更新可能        | アップグレードパスの制約          |

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
