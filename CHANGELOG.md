# Changelog

この変更履歴は Keep a Changelog と Semantic Versioning に基づきます。

## [Unreleased]

### Added

- なし

### Changed

- なし

## [1.2.4] - 2026-01-28

### Added

- traceability: .feature の @SC-XXXX-XXXX をテスト証跡として収集
- traceability: layer-aware enforcement と deferred info を追加
- config: traceability.testFileGlobs に `features/**/*.feature` を追加
- prompts: qfai-atdd / qfai-tdd-* に Coverage Ledger と完了条件を追加
- prompts: qfai-spec の粒度ガイドを更新（1BR=1ルール＋分割）
- agents: Coverage Ledger 監査と差し戻し条件を追加

### Changed

- traceability: SC 未参照の出力を layer 付き + サンプル上限化
- docs: README / templates の説明を更新

## [1.2.3] - 2026-01-27

### Added

- config: testStrategy に requireLayerTags / requireSizeTags / maxE2eScenarioRatio / maxE2eScenarioCount を追加

### Changed

- validate: Spec が契約 ID を列挙しているのに Scenario が none の場合は warning を追加
- report: e2e 比率/上限のガードレール表示を追加

## [1.2.2] - 2026-01-27

### Added

- prompts: qfai-atdd / qfai-tdd-red / qfai-tdd-green / qfai-tdd-refactor を追加

### Changed

- prompts/docs: qfai-scenario-test / qfai-unit-test / qfai-implement を廃止し、新ワークフローへ更新

## [1.2.1] - 2026-01-27

### Added

- scenario: @layer-_/@size-_ タグの検証を追加（opt-in + 集約出力）
- report: layer/size 分布と未設定一覧を追加
- spec: case-catalogue / traceability-matrix の検証を追加
- traceability: Scenario の contract-ref subset 検証を追加

### Changed

- report: scenarios を scenario.feature のファイル数ではなく総シナリオ数で集計

## [1.2.0] - 2026-01-26

### Added

- ids: AC/CASE のフォーマット検証と Spec Pack 間の重複検知を追加
- traceability: scenario.feature 内の SC 重複検出（QFAI-TRACE-035）を追加

### Changed

- traceability: scenario.feature の複数 Scenario/Outline を許容し、Spec:SC=1:1 の制約を撤廃
- prompts/docs: Spec Pack ガイドと qfai-spec を複数シナリオ対応に更新
- report/tests: 新ルールに合わせてレポート/テストを更新

## [1.1.11] - 2026-01-26

### Changed

- prompts: qfai-unit-test をテスト実装専用に固定し、完了条件をテスト実行ベースへ更新
- prompts: qfai-implement を実装専用に固定し、runnable 証拠の明示とテスト責務分離を強化
- tests: assets guardrails に qfai-unit-test / qfai-implement の必須フレーズ検証を追加

## [1.1.10] - 2026-01-25

### Changed

- prompts: qfai-unit-test にテスト専用の範囲制約とブロック条件/DoD を追加
- prompts: qfai-implement に runtime evidence 必須化と禁止完了条件を追加
- agents: Unit Test Scope Enforcer / Runtime Gatekeeper のロールカードとラッパーを追加

## [1.1.9] - 2026-01-24

### Changed

- ids: Spec内ローカル連番に合わせて BR/SC ID フォーマットを更新
- traceability: SC/BR タグとテストアノテーションの検出を新形式へ対応
- prompts: qfai-discuss/qfai-spec/qfai-scenario-test を v1.1.9 方針に合わせて強化
- agents: 多層レビュー向けの役割カードを追加
- docs: 命名規約と例示の ID 形式を更新

## [1.1.8] - 2026-01-23

### Changed

- init: `.qfai` テンプレートから指定 README と require.md を削除し、report は実行時生成へ統一
- init: テンプレート Markdown を英語・汎用化（日本語/日付/版表記を除去）
- prompts: README 非編集ルールを全プロンプトへ拡張
- prompts: qfai-require の require.md 自動作成と安定テンプレ遵守を明記
- prompts: qfai-spec に要求/契約の事前準備を追加し、gate 実行条件を明確化
- tests: init 期待ファイル/プロンプト整合テストを更新し、英語-only ガードレールを追加

## [1.1.7] - 2026-01-23

### Changed

- init: `.qfai` 配下の全 README.md を全面刷新 — 意義/背景、配置可否、構造例、テンプレ、完成例、チェックリストを統一フォーマットで記載
- prompts: qfai-discuss / qfai-require / qfai-spec に README rule（README は編集せず参照のみ）を追加
- agents: 主要エージェントに README rule を追加

## [1.1.6] - 2026-01-22

### Changed

- prompts: qfai-spec に Contracts First の順序強制（contracts完成→FIX→specs作成）を追加
- prompts: qfai-spec の Hard Constraints を強化（1ファイル=1シナリオ、BR=1、許可カテゴリ api/db/ui のみ、samples生成禁止）
- prompts: qfai-discuss のコンセプト/NFR/方針必須化と discussions 保存を強化
- agents: contract-designer に UI/API/DB 必須成果物の強制と禁止事項（infra、YAML中のMarkdown混入）を追加
- tests: assets テストにプロンプト退行防止チェック（キーフレーズ存在検証）を追加

## [1.1.5] - 2026-01-21

### Changed

- prompts: qfai-spec に定量ガードレール（1 spec pack = 1シナリオ、ID形式、BR上限、contractRef必須）を追加
- prompts: qfai-spec の delta.md に Decision Log（候補→採用/不採用/保留）を必須化
- prompts: qfai-spec に discuss 記録参照を必須化し、最終ゲート（validate + repo gates）を作業完了条件に明記
- prompts: qfai-discuss にコンセプト/NFR/方針の必須化と `.qfai/discussions/discuss-XXXX.md` 保存を追加
- prompts: qfai-scenario-test に事前チェック（単一シナリオ確認）と SC 注釈ルール、最終ゲートを追加
- prompts: qfai-unit-test に SC 注釈ルールと最終ゲートを追加
- prompts: qfai-implement に最終ゲートを明記
- prompts: qfai-verify と qfai-require に最終ゲートを明記

## [1.1.4] - 2026-01-20

### Changed

- init: `.qfai/samples/**` の生成を撤廃し、Decision Guardrails の例を README 内のインライン例へ移行
- prompts: qfai-spec の delta.md テンプレートに Decision Table / Decision Guardrails を追加
- prompts: qfai-implement に delta の decision log 参照を必須化
- verify-pack: guardrails extract のスモークを合成 delta で実施
- docs: README の guardrails 説明を samples 依存から切り離し、ツリー記述も更新

## [1.1.3] - 2026-01-20

### Added

- init: `.github/agents` と `.claude/agents` にサブエージェント wrapper を追加（.qfai の role card 参照）

## [1.1.2] - 2026-01-20

### Changed

- prompts: qfai-spec に preflight（config/steering 収束保証）を追加
- prompts: qfai-configure に qfai-spec preflight の注記を追加
- docs: README に qfai-spec preflight の注記とフロー補足を追加

## [1.1.1] - 2026-01-19

### Changed

- docs: v1.0.14 実体に合わせ、v1.1.0 設計資料へ v1.1.1 addendum を追記
- init: `.qfai/README.md` の Template version を撤去し、テンプレ内 semver を排除
- init: `steering/manifest.md` と steering/specs の導線を v1.1.1 方針に整合
- prompts: qfai-configure に manifest 補完の evidence/assumptions を明記
- repo: PR テンプレに Manifest / Decision Guardrails の確認項目を追加

## [1.1.0] - 2026-01-19

### Added

- guardrails: Decision Guardrails の抽出/検査/整形 CLI を追加
- guardrails: delta.md の Decision Guardrails サンプルを同梱（opt-in）
- report: Decision Guardrails の集計章を追加
- doctor: Decision Guardrails の導入状況チェックを追加
- tests: guardrails のパース/CLI/verify-pack を追加

### Changed

- init: steering をフラット化し、manifest の参照を一意化
- prompts: qfai-configure に steering 自動補完ステップを追加
- verify-pack: guardrails extract のスモークを追加
- init: `.qfai/README.md` の Template version を明示（唯一の例外として許可）

## [1.0.14] - 2026-01-19

### Added

- tests: add guardrails to ensure init workflow does not rely on lockfile caching

### Changed

- init: remove cache settings from generated GitHub Actions workflow
- docs: clarify that the default workflow avoids dependency caching and show optional setup-node cache snippet

## [1.0.13] - 2026-01-18

### Changed

- init: remove npm ci from generated GitHub Actions workflow
- init: keep validate gate runnable without repository dependency install
- docs: align CI description with the generated workflow

## [1.0.12] - 2026-01-18

### Changed

- init: remove hard-coded version labels from init kit docs
- init: use meaning labels in contract docs

## [1.0.11] - 2026-01-18

### Changed

- prompts: remove orphan reference to /qfai-pr from qfai-verify
- tests: add guardrail to ensure prompt bodies do not reference missing /qfai-\* commands

## [1.0.10] - 2026-01-18

### Changed

- init: remove orphan prompt `qfai-pr` from `.qfai/assistant/prompts`
- tests: add guardrail test to ensure prompt bodies and agent wrappers are aligned

## [1.0.9] - 2026-01-18

### Changed

- spec: BR 抽出を固定セクション依存から全体走査に変更
- config: `validation.require.specSections` の既定値を空配列に変更
- docs: specSections の任意設定と /qfai-configure の推奨フローを追記

## [1.0.8] - 2026-01-18

### Changed

- docs: README の設定スキーマ例を実装に合わせて修正

## [1.0.7] - 2026-01-16

### Added

- init: `qfai-configure` プロンプトを追加
- init: Copilot / Claude Code / Codex 向けのラッパー資産を追加

### Changed

- docs: README を英語版に刷新し、npm README と同期
- verify-pack: init 資産の検証対象を拡張

## [1.0.6] - 2026-01-14

### Added

- assistant assets: instructions set expanded (thinking/communication/quality/agent-selection)

### Changed

- init: remove root tests sample
- contracts: DB is SQL
- docs: .qfai README clarity improvements

## [1.0.5] - 2026-01-12

### Added

- init: `.qfai/assistant/**` を同梱（instructions/steering/prompts/agents）

### Changed

- Breaking: `.qfai/out/` を廃止し、`.qfai/report/` に統一
- Breaking: `.qfai/prompts/` を `.qfai/assistant/prompts/` に移動
- Breaking: `qfai analyze` と analyze 資産を廃止
- init: `.qfai` テンプレ構成を v1.0.5 へ刷新（assistant 資産を SSOT 化）

## [1.0.4] - 2026-01-10

### Changed

- `qfai init` から `.qfai/rules/**` と `.qfai/samples/**` を削除（導入を簡素化）
- `delta.md` の「変更区分（Compatibility/Change）」チェック運用を撤廃（テスト/QA ゲートへ移行）
- `promptpack` / `prompts` / docs から分類ルールの参照を削除

### Fixed

- doctor の path checks から `rulesDir` を削除
- report のガイダンス文言を更新

## [1.0.3] - 2026-01-10

### Added

- thema 契約（`thema-*.yml`）を導入
- UI 契約に `themaRef` / `themeOverrides` / `assets` を追加
- validate に assets 参照整合チェックを追加（最小検証）

### Changed

- Breaking: Scenario は `scenario.feature` 固定（v1.0.2 で導入済みのため再掲）
- Breaking: `scenario.md` は v1.0.3 から error（自動救済なし）
- 移行: `scenario.md` を `scenario.feature` にリネームし、参照スクリプトも更新
- 補足: v1.0.2 が変更の初出、v1.0.3 で `scenario.md` の拒否挙動を追加

## [1.0.2] - 2026-01-09

### Added

- なし

### Changed

- Breaking: Spec Pack の Scenario ファイルを `scenario.feature` に変更（旧拡張子は非対応）
- docs: Spec Pack の例・命名規約・PRテンプレ等を `scenario.feature` に統一
- docs: 破壊的変更の例外運用（minor/patch での実施）を明記
- tests/pack: init テンプレと配布物検証を `scenario.feature` 前提に更新
- tests: fs glob のパス表記差を吸収するため比較を正規化

## [1.0.1] - 2026-01-09

### Added

- report: `--base-url` を追加し、report.md 内のファイルパスをリンク化可能に
- core: glob 走査の上限ガードレール（20000件で打ち切り + warning）
- ci: Node 20 の検証ジョブを追加

### Changed

- core: testFileGlobs 走査に truncated/limit を追加
- docs: Node.js の Supported/Tested/Recommended を明記
- docs: report.json / doctor.json の内部表現方針を明文化

## [1.0.0] - 2026-01-08

### Added

- verify:pack: analyze の `--list` / `--prompt spec_to_scenario` を配布物ゲートに追加
- ci: analyze の CLI スモークを追加
- tests: root README と npm README の一致チェックを追加

### Changed

- docs: v1.0.0 向けに README/RELEASE/CHANGELOG を整合

## [0.9.2] - 2026-01-07

### Added

- tests: npm README の初日導線/インストール/参照整合のガードレールを追加

### Changed

- docs: README の初日導線を init→doctor→validate→report に統一
- docs: npm README のインストール案内を dev dependency 前提に修正
- docs: npm README の docs/\*\* 参照を GitHub リンクへ置換

## [0.9.1] - 2026-01-07

### Added

- cli: `qfai analyze` を追加（`--list` / `--prompt <name>`）
- init: analyze 用の入力バンドル例を `.qfai/samples/analyze/input_bundle.md` に同梱（create-only）

### Changed

- init: analyze 用標準プロンプトの雛形/命名を改善

## [0.9.0] - 2026-01-07

### Added

- init: analyze 用の標準プロンプトを `.qfai/prompts/analyze/**` に同梱
- init: analyze 実施ログのテンプレートを `.qfai/samples/analyze/analysis.md` に同梱（create-only）

### Changed

- docs: analyze の目的/使い方/注意事項を追記

## [0.8.2] - 2026-01-07

### Fixed

- docs: init/--force の挙動説明を実装契約に一致させ、specs/contracts 破壊の誤誘導を解消
- cli: init 実行時に `--force` の適用範囲（prompts のみ）を明示

### Added

- tests: init の overwrite/create-only 契約を回帰テストで固定

## [0.8.1] - 2026-01-07

### Added

- validate: issue に category（compatibility/change）と suggested_action を追加
- doctor: `.qfai/prompts` の整合性チェック（標準 assets との差分検出）を追加

### Changed

- init: `.qfai/prompts` のみ `--force` で上書き（それ以外は create-only）
- validate: `.qfai/prompts` 直編集（標準資産改変）を error として検出
- report.md: Dashboard + カテゴリ別章 + issue カード形式に変更
- docs: validate.json schema/examples に category/suggested_action を反映

## [0.8.0] - 2026-01-07

### Added

- verify:pack: `.qfai/prompts.local/**` が `init --force` でも上書きされないことを回帰で検証
- validate: GitHubサマリに failOn/result を出力し、次アクション（report生成）を案内

### Changed

- report.md: Summary / Findings / Guidance に再構成し、Issue集計・安定ソート・fail-on根拠を明示
- docs: 初日導線（init→doctor→validate→report）の整合、prompts.local保護対象の明記
- validate: 代表的なエラーメッセージを具体化（例/次アクションを明示）

## [0.7.3] - 2026-01-06

### Added

- LICENSE を追加（repo root + packages/qfai、npm tarball に同梱）

### Changed

- packages/qfai: package.json のメタデータを補完（license/description/repository 等）
- verify:pack: packed artifact に LICENSE/README.md が含まれることを検査

## [0.7.2] - 2026-01-06

### Changed

- packages/qfai: パッケージメタデータ修正のため v0.7.2 として再リリース（version フィールド整合）

## [0.7.1] - 2026-01-06

### Added

- Prompts Overlay を採用（`.qfai/prompts.local/**` を優先参照する運用）

### Changed

- `init` は `.qfai/prompts.local/**` を上書きしない（利用者カスタム領域を保護）
- `doctor` に `.qfai/prompts.local` の存在を情報として出力

### Removed

- `qfai sync`（PromptPack 差分検知・export）を撤去（overlay 方針へ一本化）

## [0.7.0] - 2026-01-05

### Added

- `qfai sync` を追加（PromptPack の差分検知・同期候補書き出し）
  - `--mode check`: 同梱アセットとの差分を検出（exit 0=差分なし、1=差分あり、2=エラー）
  - `--mode export`: 同期候補を非破壊でエクスポート
  - `--out <path>`: export の出力先
  - `--format <text|json>`: 出力形式

### Changed

- なし

## [0.6.3] - 2026-01-05

### Changed

- docs: 回数ベースの完了基準を削除し、DoD/CI 基準に統一
- docs: README の JSON 例から version フィールドを削除
- docs: README にバッジ・目次・インストールセクション・ライセンスセクションを追加
- docs: npm パッケージ README をルート README と同期

## [0.6.2] - 2026-01-05

### Added

- doctor に `--fail-on` を追加（warning/error で exit 1）
- doctor に monorepo outDir 衝突検出（`--root` 指定時のみ）
- CI と verify:pack に doctor スモークを追加

### Changed

- report/doctor JSON から formatVersion を削除
- README/ドキュメントに非契約方針とレビュー完了基準を追記

## [0.6.1] - 2026-01-05

### Changed

- doctor のチェック出力順を config→paths→spec→output→traceability に整合
- README に doctor JSON / report.json の非契約方針と短い例を追記

## [0.6.0] - 2026-01-05

### Added

- `qfai doctor` を追加（設定/探索/パス/glob/validate.json の事前診断）

### Changed

- `report --format json` に `reportFormatVersion` を追加

## [0.5.2] - 2026-01-04

### Added

- `report --run-validate` / `report --in` を追加
- `qfai.config.yaml` の自動探索（cwd から親へ）
- `test:assets` と CI での assets/Docs スモーク検証

### Changed

- `validate --format github` のアノテーション上限・重複排除・サマリ出力
- report の Spec キーを specId 固定にし、出力パスは root 相対化
- PromptPack と docs/examples の運用ガイドを更新（非契約/experimental 明記）

## [0.5.1] - 2026-01-04

### Added

- Scenario の 1ファイル=1シナリオ検証（`QFAI-TRACE-030`）を追加
- report で Spec→契約の missing/none を区別し、全 Spec を出力

### Changed

- Scenario の契約参照を `# QFAI-CONTRACT-REF:` コメント宣言に統一（タグ抽出を廃止）
- issue code を `QFAI-TRACE-xxx` 形式へ正規化し、Spec の contract-ref エラーを `021/023/024` に分割
- orphan contract 設定を `allowOrphanContracts` から `orphanContractsPolicy` へ移行
- docs/examples・init テンプレートを新ルールに整合

## [0.5.0] - 2026-01-03

### Added

- report に Spec の contract-ref 未宣言一覧を追加
- トレーサビリティ/契約/変更区分の運用プロンプトを追加

### Changed

- report の契約→Spec / Spec→契約 表に (none)/(orphan) を明示
- PromptPack と README の導線・文言を v0.5.0 仕様に整合

## [0.4.9] - 2026-01-03

### Fixed

- README の `unknownContractIdSeverity` 説明を Scenario 側の契約参照に整合（Spec の未知契約は常に error）
- `prepack` を `npm run build` に変更し、pack の自己完結性を向上

## [0.4.8] - 2026-01-03

### Fixed

- npm pack/publish 時に dist が必ず生成されるようにし、壊れた成果物の生成を防止
- d.ts ビルドが monorepo 外でも成立しやすいように @types/node を追加

## [0.4.7] - 2026-01-03

### Fixed

- PromptPack/.instruction のトレーサビリティ文面を現行方針に整合（Spec→下流参照禁止は運用担保、Spec→Contract を SSOT）

## [0.4.6] - 2026-01-03

### Fixed

- init テンプレの contracts README を Spec/Contract ルールに整合（Spec の参照が SSOT、Scenario→Contracts は任意）

## [0.4.5] - 2026-01-03

### Added

- 契約ファイルの `QFAI-CONTRACT-ID` 宣言を必須化（1ファイル1ID）
- Spec の `QFAI-CONTRACT-REF` 宣言を必須化（`none` 可）
- 契約→Spec のカバレッジ検証（orphan contract）
- report に契約カバレッジと Spec/Contract マップを追加
- PromptPack と PR テンプレに Compatibility / Change の分類欄を追加

### Changed

- DATA ID を DB ID に統一（`DATA-xxxx` を無効化）
- 契約 ID の抽出を宣言行（SSOT）に統一（本文/operationId からの抽出を撤去）
- SC→契約の接続必須ルールを廃止
- init テンプレの Spec/Contract サンプルと README を新ルールに整合

## [0.4.2] - 2026-01-02

### Added

- テスト探索の glob 設定（`testFileGlobs` / `testFileExcludeGlobs`）を追加
- init テンプレートにテスト glob 生成プロンプトを追加
- validate/report にテスト探索のメタ情報（glob/除外/件数）を追加

### Changed

- SC→Test 判定を glob 設定に切替（未設定・一致0件は `QFAI-TRACE-013`）
- Scenario の SPEC/BR 欠落を `QFAI-TRACE-014/015` として検出
- Spec→Contract 参照の存在チェック（`QFAI-TRACE-009`）を廃止
- Spec:SC=1:1 で SC が 0 件の場合も error

## [0.4.1] - 2026-01-02

### Added

- SC→Test アノテーション方式（`QFAI:SC-xxxx`）と `tests/`・`src/` 探索を追加
- テスト側の未知 SC アノテーション検出（`QFAI-TRACE-011`）を追加
- Spec:SC=1:1 検証（`QFAI-TRACE-012`）を追加
- `validate.json` に SC→Test カバレッジを追加
- report に Spec:SC=1:1 違反一覧を追加

### Changed

- Scenario の複数記述を許容（参照 SC は同一）
- SCカバレッジの missing 表示に scenario ファイル情報を付与
- `QFAI-TRACE-002` を info に格下げ
- init テンプレートのテストサンプルをアノテーション方式に更新

## [0.4.0] - 2026-01-01

### Added

- SC→Test 参照のトレーサビリティ検証（`scMustHaveTest` / `scNoTestSeverity`）
- report に SC カバレッジと参照テスト一覧を追加
- init テンプレートに tests サンプルを追加

### Changed

- report の Markdown 出力に SC カバレッジセクションを追加

### Removed

- ロードマップ文書を削除

## [0.3.8] - 2026-01-01

### Changed

- validate/report の入出力から schemaVersion を廃止（後方互換破棄）
- docs/examples を現行例に一本化
- テスト/fixture を schemaVersion 廃止に追従

### Removed

- `docs/schema/validation-result.schema.json` から schemaVersion を削除

## [0.3.7] - 2026-01-01

### Changed

- （タグ整合のための追記）v0.3.7 は既にリリース済み

## [0.3.6] - 2026-01-01

### Changed

- `.instruction/02_project` を QFAI Toolkit 向けに更新し、誤誘導の元を除去
- `AGENTS.md` の参照ガイドとレビュー運用ルールを更新
- `docs/rules/naming.md` の版表記を削除
- README/RELEASE/テスト/パッケージのバージョン表記を更新

## [0.3.5] - 2025-12-31

### Added

- PromptPack を init テンプレートに追加（`.qfai/promptpack/`）
- `docs/promptpack.md` を追加

### Changed

- OQ表記の排除対象を「現行仕様として参照される場所」に限定する方針を明文化
- RELEASE/README の表記を更新（PromptPack 追記を含む）

## [0.3.4] - 2025-12-31

### Changed

- init で生成する require を `.qfai/require/` 配下へ移動（後方互換なし）

### Fixed

- PRテンプレのOQチェックリストを撤去し、決定事項チェックへ置換
- 命名規約の過去状態（OQ継続/版表記）を除去し、標準構成へ収束
- CHANGELOG の誤記（ADR検証表現）を修正

## [0.3.3] - 2025-12-31

### Added

- pnpm allowlist 運用ガイド（`.qfai/rules/pnpm.md`）をテンプレートに追加
- `.qfai/require/README.md` と require-to-spec プロンプト雛形をテンプレートに追加

### Changed

- README に「できること」セクションを追加
- init テストでテンプレート生成を検証
- 命名規約ドキュメントの版表記を更新

### Fixed

- init のテンプレート探索パスを明確化し、見つからない場合はエラーで通知

## [0.3.2] - 2025-12-31

### Added

- Gherkin 公式パーサ（@cucumber/gherkin）と Scenario モデルを追加
- Scenario 内の本文/DocString から契約 ID を抽出するトレーサビリティを追加
- Feature の SPEC タグ必須チェックと Scenario/Spec ファイルの存在チェックを追加

### Changed

- Spec Pack のディレクトリ名を `spec-0001`（4 桁）へ統一（`spec-001` など 3 桁は非対応）
- Spec Pack は `.qfai/specs` 直下のディレクトリのみサポート（ネスト構成を廃止）
- Scenario/ID/Traceability の解析を AST ベースへ刷新

## [0.3.1] - 2025-12-30

### Added

- Spec Pack（spec.md / delta.md / Scenario ファイル）のテンプレートと規約を追加
- delta.md の変更区分検証を追加
- Scenario 単位のタグ検証（SC 1件必須、Feature タグ継承）を追加

### Changed

- config スキーマを刷新（paths.\* / output.validateJsonPath）
- Scenario ファイルの配置を `specs/spec-xxx/` に統一
- validate は常に `validate.json` を出力し、report は固定パスを入力に使用
- init テンプレート/README/verify-pack を新構成に整合

### Removed

- decisions/ADR のバリデーションを除外

## [0.3.0] - 2025-12-30

### Added

- parse 層（Spec/Scenario/ADR）を導入し、構造解析を集約
- BR Priority（P0〜P3）の検証を追加
- Scenario の Feature/Scenario/タグ必須チェックを追加
- ADR パーサ（parseAdr）ユーティリティを追加

### Changed

- Spec 必須セクション判定を H2 見出しベースへ変更
- traceability の Spec→BR を BR 定義（業務ルール内）に限定
- init テンプレ/README を現行仕様へ整合

## [0.2.9] - 2025-12-29

### Added

- ContractIndex を導入し、契約 ID を共通収集（パース失敗時はテキスト抽出）
- 契約パース失敗時のノイズ低減テストを追加

### Changed

- traceability/duplicate 検証の契約 ID 収集を共通化
- init テンプレの固定表現を削除
- API サンプルから `x-qfai-refs` を撤去

## [0.2.8] - 2025-12-29

### Added

- Contract パース失敗/ID 未定義の検出（UI/API）
- Spec → Contract 参照の実在性チェック

### Changed

- report から rules 指標を削除
- `paths.rulesDir` を削除（互換不要）

## [0.2.7] - 2025-12-29

### Added

- Scenario 参照 ID の実在性チェック（SPEC/BR/Contract）
- BR が参照 SPEC に属するかの検証
- 定義 ID の重複検知（Spec/Scenario/Contracts）
- unknown Contract 参照の severity 設定（warning|error）

### Changed

- ID 形式を `PREFIX-0001` に厳格化
- 命名規約/テンプレートの説明を整合

## [0.2.6] - 2025-12-28

### Added

- .qfai 配下の README 群とガイドを追加（spec/contracts/prompts/out）
- Spec/Scenario/Contracts の最小例を刷新

### Changed

- init の生成先を `.qfai/` に統一
- 既定の探索/設定パスを `.qfai` 前提に更新
- Scenario の既定配置を `.qfai/spec/scenarios` に変更

### Removed

- legacy の `spec.md` 探索互換を削除

## [0.2.5] - 2025-12-28

### Added

- 命名規約ドキュメントを追加（docs/rules/naming.md）
- overview / Business Flow 生成用プロンプトをテンプレートに同梱

### Changed

- init テンプレートの Spec/Contracts サンプルを ID+slug 命名に変更
- validate/report/traceability の Spec 探索を `spec-0001-*.md` に対応

### Behavior

- legacy の `spec.md` は引き続き探索対象（後方互換維持）

## [0.2.4] - 2025-12-26

### Added

- CHANGELOG.md を追加
- RELEASE.md を追加

### Changed

- README の Quick Start を現行 CLI 挙動に整合
- validate/report の入出力と GitHub Actions テンプレート導線を明記

### Behavior

- No behavior change（validate/report/CLI の挙動は維持）

## [0.2.3] - 2025-12-25

### Changed

- report: validate.json 欠損時の案内と exit code 2
- init: 既存ファイル衝突時の --force 案内
- build: import.meta 警告の解消と警告ゲート追加
