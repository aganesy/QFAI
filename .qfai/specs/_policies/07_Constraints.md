# 07 Constraints

## Technical Constraints

| ID    | Constraint                                                                                                           | Rationale                                                                                                            | Impact                                                                 |
| ----- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| TC-01 | Node.js >= 18.0.0 必須                                                                                               | ES2022+ 機能、fetch API、structuredClone 等の使用                                                                    | 実行環境の制約                                                         |
| TC-02 | TypeScript 5.6.3                                                                                                     | 最新の型機能（satisfies 演算子等）の利用                                                                             | ビルド環境の制約                                                       |
| TC-03 | pnpm >= 9.12.3（monorepo 管理）                                                                                      | workspace 機能、依存関係の厳密な管理                                                                                 | 開発環境の制約                                                         |
| TC-04 | ESM / CJS デュアルビルド（tsup）                                                                                     | npm 配布での幅広い互換性                                                                                             | ビルド設定の制約                                                       |
| TC-05 | @cucumber/gherkin v37+ 依存                                                                                          | Gherkin パース（Feature/Scenario 解析）                                                                              | パーサーの互換性                                                       |
| TC-06 | jsdom v26+ 依存                                                                                                      | DOM クローリング（UI フィデリティ検証）                                                                              | ブラウザエミュレーションの制約                                         |
| TC-07 | fast-glob v3+ 依存                                                                                                   | ファイル検索のパフォーマンス                                                                                         | ファイルシステムの制約                                                 |
| TC-08 | yaml v2+ 依存                                                                                                        | YAML 1.2 仕様のパース                                                                                                | 設定ファイル形式の制約                                                 |
| TC-09 | バリデータは純粋 async 関数                                                                                          | 副作用なし、Issue[] を返すのみ                                                                                       | アーキテクチャの制約                                                   |
| TC-10 | ファイル検索上限 10,000 件                                                                                           | メモリ・パフォーマンスの安全限界                                                                                     | 大規模プロジェクトの制約                                               |
| TC-11 | Windows Developer Mode 必須                                                                                          | Windows で symlink 作成に Developer Mode 必要                                                                        | Windows 環境の実行制約                                                 |
| TC-12 | symlink type 指定（Windows）                                                                                         | Windows は symlink 種別を明示（dir/file）                                                                            | クロスプラットフォーム制約                                             |
| TC-13 | Git symlink は相対パスで記録                                                                                         | リポジトリルートからの相対パスで格納                                                                                 | リポジトリ可搬性の制約                                                 |
| TC-14 | .agent.md サフィックス必須                                                                                           | GitHub Copilot のエージェント認識に必要                                                                              | ファイル命名の制約                                                     |
| TC-15 | SDP v1 ランタイム: SKILL.md/prompt                                                                                   | TS 変更なし; spec/policy 文書で SDP を別途定義                                                                       | Diff ロジック: プロンプト記述のみ                                      |
| TC-16 | git diff の利用は任意                                                                                                | git がない環境やシャローコピーでの動作を保証                                                                         | Source B, C でのフォールバックが必須                                   |
| TC-17 | 無限ループ防止: 全否定 3 連続 FAIL → アドバイザリー降格                                                              | 全否定エージェントの無制限 FAIL によるスキル未完了を防止                                                             | レビューサイクルの収束保証                                             |
| TC-18 | test-list.md は `.qfai/specs/spec-XXXX/tdd/` に配置                                                                  | 既存spec ディレクトリレイアウト規約への準拠                                                                          | スペック構造の制約                                                     |
| TC-19 | Phase 1 バリデータは既存エラーインフラを使用                                                                         | 新しいエラーサブシステムを導入しない                                                                                 | アーキテクチャの制約                                                   |
| TC-20 | 非実装スキルは後方互換性を維持                                                                                       | 実装フェーズのみが影響を受ける                                                                                       | 互換性の制約                                                           |
| TC-21 | Phase 2 は既存 tddList.ts を拡張                                                                                     | Phase 1 コードとの一貫性維持、新ファイル作成禁止                                                                     | バリデータアーキテクチャの制約                                         |
| TC-22 | テストファイル実在チェックは Node.js fs.promises.stat を使用                                                         | シェル実行なし、クロスプラットフォーム対応、ディレクトリ誤判定防止                                                   | ファイルシステムアクセスの制約                                         |
| TC-23 | Windows バックスラッシュのパス正規化                                                                                 | Test file パスをフォワードスラッシュに正規化してから検査                                                             | クロスプラットフォーム制約                                             |
| TC-24 | parseFirstMarkdownTable 再利用（TC 収集は Markdown テーブル直接走査）                                                | 既存ユーティリティの活用、重複実装禁止                                                                               | コード再利用の制約                                                     |
| TC-25 | instructions ファイルは create-only + force-disabled                                                                 | 既存の instructions を上書きするとユーザーカスタマイズが消失する                                                     | instructions 保護の制約                                                |
| TC-26 | テンプレートアセットは 70行超の場合ファイル管理                                                                      | ハードコードは可読性を損なう。copilot-instructions.md（17行）はハードコード可だが instructions（70-110行）はアセット | テンプレート管理の制約                                                 |
| TC-27 | DDP は QFAI テキストアーティファクトとして定義（Figma 非依存）                                                       | 外部デザインツール必須依存の排除                                                                                     | ツール独立性の制約                                                     |
| TC-28 | Mermaid フェンスブロックのみでフロー定義                                                                             | 一貫したダイアグラム形式                                                                                             | ダイアグラム制約                                                       |
| TC-29 | Research-to-Constraint 変換は contracts/design/\*.yaml に出力する                                                    | BP/AP rule DB のフォーマット統一（discussion-20260324090005338 TC-05）                                               | 変換出力先の制約                                                       |
| TC-30 | UI Contract schema 拡張は既存フィールドと後方互換を保つ                                                              | 新フィールドは optional start で段階的に required へ（discussion-20260324090005338 TC-06）                           | スキーマ互換性の制約                                                   |
| TC-31 | Anti-pattern validator は静的・半静的検出のみ（runtime 不要）                                                        | v1.6.5 スコープでは runtime 計測を含めない（discussion-20260324090005338 TC-07）                                     | バリデータスコープの制約                                               |
| TC-32 | UI-bearing 検出はアーティファクト/セクション存在で判定（キーワードマッチング単独禁止）                               | false positive 防止と検出精度の確保                                                                                  | バリデータ設計の制約                                                   |
| TC-33 | 新構造バリデータは既存 validate.ts オーケストレータに統合                                                            | アーキテクチャ一貫性の維持                                                                                           | バリデータ統合の制約                                                   |
| TC-34 | 新ランタイム依存パッケージの追加禁止                                                                                 | 依存関係肥大化防止                                                                                                   | 依存管理の制約                                                         |
| TC-35 | render evidence は path-only metadata を保持する                                                                     | JSON の肥大化と秘匿情報混入を防ぐ                                                                                    | evidence 形式の制約                                                    |
| TC-36 | Playwright は optional かつ lazy import で扱う                                                                       | browser tooling を必須依存にしない                                                                                   | runtime 依存の制約                                                     |
| TC-37 | render capture は `/qfai-prototyping` スキルの拡張に留める                                                           | CLI surface の拡散を防ぐ                                                                                             | コマンド設計の制約                                                     |
| TC-38 | designAudit.ts / designSlop.ts は既存 Issue 型 (types.ts) にマッピングする                                           | 下流 report/CI が Issue 型に依存                                                                                     | 新 finding は code/severity/category/message/rule を持つ Issue に変換  |
| TC-39 | designSlopPatterns.json は JSON Schema に従い、id/category/tier/scopes/match/message/guidance を必須フィールドとする | ルール追加の一貫性と自動バリデーション                                                                               | JSON parse error は validate 全体をブロックしない                      |
| TC-40 | v1.7.2 バリデータは render evidence 非依存で動作する                                                                 | v1.7.1 は optional                                                                                                   | 静的監査は discussion pack + contracts + optional HTML mock のみで成立 |
| TC-41 | uiux/ サイドカーは既存15ファイルコアパック構造に影響を与えないこと（アディティブ）                                   | 既存パック依存の下流スキルの破壊を防止                                                                               | サイドカーは追加ディレクトリとして独立                                 |
| TC-42 | サイドカー YAML スキーマは v1.7.4 以降のバリデータとの前方互換性を維持すること                                       | 将来のバリデータ導入を阻害しない                                                                                     | スキーマ設計の制約                                                     |
| TC-43 | SKILL.md の UI-bearing 検出は surface type ベースであり、interaction complexity ベースではないこと (DR-0057)         | surface type は決定論的に判定可能（DR-0057）                                                                         | 検出ロジックの制約                                                     |
| TC-44 | テンプレート変更は外部ランタイム依存を導入しないこと                                                                 | 依存関係肥大化防止                                                                                                   | テンプレート設計の制約                                                 |
| TC-45 | UIX-VAL バリデータは既存 async パターン `(root, config) => Promise<Issue[]>` に従うこと                              | 新バリデータシグネチャ禁止。既存パイプラインとの一貫性維持                                                           | バリデータアーキテクチャの制約                                         |
| TC-46 | UIX-VAL バリデータは validate.ts の UI/UX グループ `Promise.all` に登録すること                                      | 並列実行による性能確保と登録場所の一貫性                                                                             | バリデータ登録の制約                                                   |
| TC-47 | UIX-VAL-\* グループは既存 UI/UX バリデータと共有の 2000ms パフォーマンスバジェット内で完了すること                   | CI タイムアウト回避と既存性能保証の維持                                                                              | パフォーマンスの制約                                                   |
| TC-48 | UI-bearing 検出は単一の共有関数として `validators/utils.ts` または `validators/uiBearing.ts` に配置すること          | 個別バリデータでの検出ロジック重複禁止                                                                               | 検出ロジックの制約                                                     |
| TC-49 | UIX-VAL バリデータは LLM API 呼び出し・乱数・外部ネットワーク状態への依存を禁止（deterministic）                     | 同一入力→同一出力の保証                                                                                              | 決定論的バリデーションの制約                                           |
| TC-50 | ルール ID は SCREAMING-KEBAB フォーマット、最大 48 文字（例: `UIX-VAL-SIDECAR-MISSING`）                             | セマンティック名による可読性と actionability の確保                                                                  | ルール命名の制約                                                       |
| TC-51 | 8 ステップバリデータ実装シーケンスに従うこと（Step N の前提条件が完了するまで Step N+1 に着手しない）                | 依存関係順の実装によるリグレッション防止                                                                             | 実装順序の制約                                                         |
| TC-52 | prototyping default path に browser/web hard dependency を追加してはならない                                         | non-web/non-visual project の互換性保護                                                                              | static-first default の制約                                            |
| TC-53 | mode-aware semantics を壊す一括 obligation 化をしてはならない                                                        | standard/low-cost/full-harness の分離保持                                                                            | mode 分離の制約                                                        |
| TC-54 | backend provider abstraction は optional registration pattern に従うこと                                             | Playwright 固定設計の防止、将来 backend 多様性の確保                                                                 | backend 拡張性の制約                                                   |
| TC-55 | render evidence の capture status は captured/skipped/failed を区別すること                                          | partial capture の表現と absent case の明示                                                                          | evidence schema の制約                                                 |
| TC-56 | browser QA output は structured findings schema に従い repair suggestion を含むこと                                  | downstream 修正の actionability 確保                                                                                 | QA 出力形式の制約                                                      |
| TC-57 | 標準パスへの変更禁止                                                                                                 | v1.7.6 premium path は明示的オプトインであり、standard path のコード・パフォーマンスに影響を与えてはならない         | 標準パス保護の制約                                                     |
| TC-58 | critique adapter は複数バックエンドをサポート                                                                        | generic command interface でプロバイダーを接続。特定プロバイダーへのハードコード依存禁止                             | プロバイダー拡張性の制約                                               |
| TC-59 | calibration pack はファイルベース（外部 DB 禁止）                                                                    | 独立して更新可能であること。コード変更なしでアセット更新                                                             | calibration 管理の制約                                                 |
| TC-60 | full-harness loop の最大反復数は設定可能（デフォルト 15）                                                            | 無制限実行の防止                                                                                                     | コスト/時間制御の制約                                                  |
| TC-61 | critique adapter の fail-open はアダプターレベルのみ                                                                 | full-harness レベルの fail-open はカスケード障害のリスク                                                             | 障害境界の制約                                                         |
| TC-62 | display/stub detection はヒューリスティックベース（AST 非依存）                                                      | AST 解析は複雑さに対して利点が不釣り合い                                                                             | 検出方式の制約                                                         |
| TC-63 | 外部コマンド実行面はインジェクションリスクをレビュー・サニタイズ                                                     | critique adapter の generic command interface のセキュリティ                                                         | セキュリティの制約                                                     |
| TC-64 | handoff artifacts は資格情報を含まない                                                                               | セッション再開時のセキュリティ                                                                                       | セキュリティの制約                                                     |
| TC-65 | validator に LLM/AI 判定を含めない（deterministic only）                                                             | 全バリデータが同一入力→同一出力を保証し CI 再現性を維持する                                                          | バリデータ設計の制約                                                   |
| TC-66 | v1.7.6/v1.7.7 pack を即座に壊さない（backward compatible migration）                                                 | migration window 内は warning level で段階的に移行                                                                   | 後方互換性の制約                                                       |
| TC-67 | non-UI project で新 validator が over-fire しない（全新 validator に surface type guard）                            | non-UI project の安全性保証                                                                                          | バリデータ安全性の制約                                                 |

### v1.7.13 追加制約

- TC-68: prototyping.yaml は discussion-pack の必須サイドアーティファクトであり、15 markdown ファイルとともに存在チェックされる
- TC-69: Existence-based precedence — prototyping key の存在自体が namespaced contract の権威性を決定する（値の妥当性ではなく key の有無）
- TC-70: Canonical/legacy validator 分離 — production path は runCanonicalUixValidators のみ、legacy path は migration tooling 専用
- TC-71: IssueCategory "canonical" は全新規 canonical validator が emit する category 値
- TC-72: prototypingRecommendation validator は SDD preflight のブロッカーとして機能する
- TC-73: prototyping.calibration config block はデフォルト値を持ち、未設定でも正常動作する

### v1.7.15 追加制約

- TC-74: 単一 PR で packages/qfai/\*\* のみ変更する。repo root `.qfai/` への変更を禁止
- TC-75: 破壊的変更を許容する。後方互換性の維持義務なし
- TC-76: ユーザー移行ケアは不要（internal-only refactor）
- TC-77: schema / runtime / validator / docs / tests を同一 PR で同時更新する

### v1.7.15 rev2 追加制約

- TC-78: CalibrationLoader は fail-closed。pack 不在 / YAML parse 不正 / version 欠落 / thresholds 欠落 / maxIterations/plateauDelta/plateauLookback 欠落の全ケースで throw。DEFAULT_PACK fallback と version="1.0.0" 補完を削除
- TC-79: iteration.evidenceRefs は 8 カテゴリ（runtimeGate / render / browserQa / uiObservation / specCoverage / discussion / screenContract / trend）を必ず非空で保持
- TC-80: l2Evidence.ts は packages/qfai/src/core/prototyping/ に配置。実 discussion artifact から軸数を抽出し artifact 内評価値の再利用を禁止
- TC-81: bundleWriter schema v2 を一本化。v1/v2 並存を禁止
- TC-82: ScreenObservation 型（route, htmlCaptureRef, domLabelsFound, elementsPlaced, actionsWired, mockPathFindings）で screen-level を表現。flatten 集約を廃止
- TC-83: actionsWired は browser QA 由来の観測値。0 固定を廃止し、観測不能は "unknown" で表現
- TC-84: 実装順序は依存グラフに従う: calibration/history/runtime/types → l2Evidence/measurement/panelInputs/panelScore → execution 結線 → specCoverage/uiObservation/uiFidelityBuilder

## Operational Constraints

| ID    | Constraint                                                                                                 | Rationale                                                        | Impact                                   |
| ----- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------- |
| OC-01 | CI/CD 環境で 2分以内に完了                                                                                 | CI パイプラインのタイムアウト回避                                | バリデーション設計の制約                 |
| OC-02 | validate.json は内部契約（安定 API ではない）                                                              | バージョン間の互換性保証なし                                     | 外部ツール連携の制約                     |
| OC-03 | .qfai/evidence/ はデフォルトで gitignore                                                                   | ローカル成果物であり、リポジトリ肥大化を防ぐ                     | 証跡管理の制約                           |
| OC-04 | review-pack は append-only                                                                                 | レビュー履歴の改竄防止                                           | レビューシステムの制約                   |
| OC-05 | スキルファイルは QFAI パッケージの SSOT                                                                    | skills.local/ のみユーザーカスタマイズ可能                       | カスタマイズ範囲の制約                   |
| OC-06 | --force による既存 symlink の再作成                                                                        | マイグレーション・破損修復のサポート                             | init 運用の制約                          |
| OC-07 | qfai init は冪等（idempotent）                                                                             | 既存の有効な symlink はスキップする                              | init 運用の制約                          |
| OC-08 | /qfai-verify は SDP 適用外                                                                                 | 品質ゲートとして全 spec の一貫性を保証する必要がある             | verify のみインクリメンタル対象外        |
| OC-09 | \_policies 変更時は保守的に全 spec 影響                                                                    | policy 変更の影響範囲を正確に判定することは困難                  | false positive 許容、漏れは不許容        |
| OC-10 | 1バージョン = 1 PR ポリシー（v1.6.0）                                                                      | v1.6.0の全変更を単一PRで提供                                     | アトミックバージョニングの制約           |
| OC-11 | 全ラッパーフォーマットの同期（v1.6.0）                                                                     | .agents, .claude, .codex を同一PRで更新                          | ラッパー整合性の制約                     |
| OC-12 | シリアル実行がデフォルト（v1.6.0）                                                                         | 並列化は独立スライスのみ許可                                     | 状態破損防止の制約                       |
| OC-13 | 1バージョン = 1 PR ポリシー（v1.6.1）                                                                      | v1.6.1の全変更を単一PRで提供                                     | アトミックバージョニングの制約           |
| OC-14 | Phase 1 エラーコードは変更不可                                                                             | 既存 CI パイプラインの破壊防止                                   | 後方互換性の制約                         |
| OC-15 | test-list.md 未存在 spec は warning 維持                                                                   | TDDLIST_MISSING は error に昇格しない                            | マイグレーション制約                     |
| OC-16 | instructions 配布スコープは .github/instructions/ のみ                                                     | workflow、PR template は環境固有のため対象外                     | 配布スコープの制約                       |
| OC-17 | instructions アップグレードは v1.7.0 以降                                                                  | v1.6.3 は初回配布。手動削除→再init で更新可能                    | アップグレードパスの制約                 |
| OC-18 | DDP フィールドは UI 仕様の必須前提条件                                                                     | テーマ未定義でのプロトタイピング禁止                             | UI 仕様品質の制約                        |
| OC-19 | レンダークリティークはデスクトップ/モバイル両方必須                                                        | 片方のみの評価は不完全                                           | レビュープロセスの制約                   |
| OC-20 | 禁止ジェネリックパターンの明示的 FAIL                                                                      | カードグリッドデフォルト等の自動拒否                             | レビュー品質の制約                       |
| OC-21 | 複数案比較は primary screen のみ必須とする                                                                 | 全画面に強制しない（discussion-20260324090005338 OC-03）         | 工数と品質のバランス制約                 |
| OC-22 | 競合/参考 UI は URL またはスクリーンショットで記録する                                                     | 入手不能な場合は理由を記載（discussion-20260324090005338 OC-04） | 参考情報記録の制約                       |
| OC-23 | v1.7.0 は単一 PR ポリシー                                                                                  | アトミックバージョニングの制約                                   | バージョン管理の制約                     |
| OC-24 | テスト・verify-pack・ドキュメントは同一 changeset                                                          | 整合性の確保                                                     | リリース管理の制約                       |
| OC-25 | 新規トップレベル CLI コマンドの追加禁止                                                                    | CLI インターフェースの安定性                                     | CLI 設計の制約                           |
| OC-26 | render evidence の生成物は `.qfai/evidence/prototyping/` 配下に集約する                                    | path convention と reviewability を固定する                      | evidence 運用の制約                      |
| OC-27 | render helper / validator / report / docs / tests は同一 changeset で更新する                              | capture model の不整合を防ぐ                                     | リリース管理の制約                       |
| OC-28 | audit.enabled / slopDetection config フラグで v1.7.2 バリデータの有効/無効を制御する                       | config 省略時はデフォルト有効                                    | 特定プロジェクトで不要な検知を無効化可能 |
| OC-29 | 標準 npm publish パイプラインでデプロイ可能であること                                                      | 特殊なデプロイ手順を要求しない                                   | デプロイメントの制約                     |
| OC-30 | スライスごとにロールバック可能であること                                                                   | 部分的な障害からの復旧を保証                                     | ロールバック可能性の制約                 |
| OC-31 | UIX-VAL-\* バリデータ追加は既存バリデータの出力を変更せず、既存テストを破壊しないこと                      | 後方互換性の保証                                                 | 後方互換性の制約                         |
| OC-32 | Migration checks はデフォルト warning。error への昇格は `uiux.migration.strict: true` config opt-in が必要 | レガシープロジェクトの段階的移行を支援                           | マイグレーション soft launch の制約      |
| OC-33 | 全変更（validators + reviewers + tests + migration + docs）を単一 PR で提供すること                        | アトミックレビューと整合性の確保                                 | 単一 PR デリバリーの制約                 |
| OC-34 | docs/report/tests を同時に更新しないと static/runtime boundary に関する誤読が残る                          | 下流の誤解防止                                                   | ドキュメント同期の制約                   |
| OC-35 | runtime correction は独立 revert 可能な slice を維持すること                                               | 部分障害からの復旧を保証                                         | ロールバック可能性の制約                 |
| OC-36 | optional capability の absent case を必ずテスト・docs で扱うこと                                           | fail-open/skipped semantics の網羅性                             | absent case 網羅性の制約                 |
| OC-37 | premium path のコスト推定を表示し、ユーザー確認を要求する                                                  | 予想外のコスト発生防止                                           | コスト透明性の制約                       |
| OC-38 | 10 分以上の long-running session は定期的な進捗を emit する                                                | ユーザーへの進捗可視性                                           | ユーザー体験の制約                       |
| OC-39 | calibration assets はバージョン管理下に置く                                                                | drift 防止と再現性                                               | calibration 管理の制約                   |
| OC-40 | `qfai validate --fail-on error` PASS が v1.7.8 でも維持される                                              | validate hard gate の継続的 PASS 保証                            | 品質ゲートの制約                         |
| OC-41 | prototyping mode precedence は `CLI > discussion recommendation > system default=standard` を維持する      | mode 解決の deterministic 性と説明可能性を保証                   | mode 解決の制約                          |
| OC-42 | render evidence は `captured/skipped/failed` を固定し fake success を許容しない                            | truthful runtime reporting を維持                                | runtime evidence の制約                  |
| OC-43 | full-harness は explicit non-default path を維持し、standard path に暗黙昇格させない                       | premium path のコスト/複雑さを opt-in に限定する                 | mode/posture の制約                      |
| OC-44 | docs / steering / changelog は implemented / foundation-only / deferred の語彙で成熟度を表現する           | release truthfulness と reviewer 判断の一貫性を維持              | 文書整合性の制約                         |

- OC-45: report の prototyping セクションは v1.7.13 では foundation-only（blocking validation には統合しない）
- OC-46: harness loop の termination status は "converged" / "max-iterations" に正規化される（旧 "accepted" / "cap-reached" は非推奨）
- OC-47: ModeGuidance の recommendation は有効な PrototypingMode 値を返す（"full-harness"、旧 "premium" は削除）

## Business Constraints

| ID    | Constraint                                                | Rationale                                                                | Impact               |
| ----- | --------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------- |
| BC-01 | v1.6.5 では design quality 向上を最優先する               | aesthetics + usability のバランス                                        | スコープ優先度の制約 |
| BC-02 | breaking changes は delta と migration expectation を伴う | user approved envelope                                                   | 変更管理の制約       |
| BC-03 | generic UI 排除を品質ゲートとして位置づける               | presence gate から quality gate への転換（discussion-20260324090005338） | 品質基準の制約       |

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

## v1.7.15 rev4 Constraints

### Technical Constraints (rev4)

| CON-ID  | Constraint                                            | Rationale                                 | Impact                             |
| ------- | ----------------------------------------------------- | ----------------------------------------- | ---------------------------------- |
| CON-017 | 変更対象は `packages/qfai/` 配下のみ                  | `.qfai/` は運用ディレクトリで直接編集禁止 | ソース変更のみ許可                 |
| CON-018 | 単一 PR でのデリバリー                                | 6 WS の原子性確保                         | 段階的マージ不可                   |
| CON-019 | 実装順序は 6 ステップの依存関係を遵守                 | WS 間の入出力依存                         | 並行開発は同一ステップ内に限定     |
| CON-020 | `40_screen_contracts.md` パース仕様が確定していること | WS-2/WS-4/WS-5 がパース結果に依存         | パース仕様未確定時は WS-2 着手不可 |
| CON-021 | 公開 API シグネチャに破壊的変更を加えない             | 利用者への影響最小化                      | 内部実装変更のみ                   |

## v1.7.17 Constraints

### Technical Constraints (v1.7.17)

| CON-ID  | Constraint | Rationale | Impact |
| ------- | ---------- | --------- | ------ |
| CON-022 | design guideline research は UI-bearing pack のみ必須 | non-UI pack への over-fire 防止 | non-UI では validator short-circuit 必須 |
| CON-023 | 新 validator は warning-first 導入 | 既存 discussion pack への即時破壊を避ける | T05/T06 は次版で error ratchet 可否を再評価 |
| CON-024 | validator ownership は `uix/trendScan.ts` と `uix/scoringReady.ts` に閉じる | 現行 canonical UIX validator 構造と整合 | top-level bespoke validator 新設禁止 |
