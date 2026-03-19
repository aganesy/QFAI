# Changelog

この変更履歴は Keep a Changelog と Semantic Versioning に基づきます。

## [Unreleased]

### Added

- なし

## [1.6.1] - 2026-03-20

### Added

- validators: TDD list Phase 2 checks — TC coverage (TDDLIST_TC_NOT_COVERED), exception DR-ID (TDDLIST_EXCEPTION_MISSING_DR), test file existence (TDDLIST_TEST_FILE_MISSING), duplicate ID (TDDLIST_DUPLICATE_ID), invalid ID format (TDDLIST_INVALID_ID)
- report: TDD Coverage section per spec with unit/component coverage visualization
- report: Contract Coverage, SC Coverage, Hotspots promoted to top-level sections
- validators: discussion pack validation (QFAI-DPACK-001 through DPACK-005)
- helpers: shared `tddHelpers.ts` module with `isCoverageTargetLevel`, `splitTcRefs`, `resolveParentTcId`

### Changed

- validators: unknown Level values in 06_Test-Cases.md are conservatively included as coverage targets (avoids silent false negatives)
- validators: Level column fallback — when Level column is absent, all TCs are treated as coverage targets
- report: heading hierarchy flattened — SC Coverage, Hotspots, Duplicate SC IDs promoted from `###` to `##`
- validators: path traversal check uses `path.sep` for cross-platform correctness
- validators: `collectTestCaseIds` merges two separate I/O calls into one
- report: `collectTddCoverage` receives pre-scanned entries to avoid redundant directory scan
- specs: `_policies/07_Constraints.md` TC-22 updated from `fs.access` to `fs.promises.stat`

### Fixed

- parsers: `trimEdgePipes` now strips all consecutive edge pipes (`||`, `|||`) via regex
- helpers: `resolveParentTcId` no longer incorrectly strips parent-level TC IDs (e.g., `TC-0001` → `"TC"`)

## [1.6.0] - 2026-03-17

### Added

- skills: `/qfai-implement` — TDD micro-cycle (Red/Green/Refactor) を一括管理する統合実装スキルを追加
- validators: `tddList` — `test-list.md` の構造・ステータス・TC参照を検証する validator を追加
- specs: spec-0014 (CAP-0014) qfai-implement unification の SDD アーティファクトを追加
- assets: `spec-XXXX/tdd/test-list.md` テンプレートを init に追加

### Removed

- skills: `/qfai-tdd-red`, `/qfai-tdd-green`, `/qfai-tdd-refactor` を廃止（`/qfai-implement` に統合）

### Changed

- workflow: implementation stage の説明を `/qfai-implement` に統一
- integration: `.agents/.claude/.codex` の skill ラッパーを symlink に統一

## [1.5.7] - 2026-03-16

### Added

- specs: spec-0013 (CAP-0013) UI/UX 定義・レビュー基盤の validator 8系統を追加（QFAI-DT / QFAI-MOCK / QFAI-FLOW / QFAI-BPAP / QFAI-PLATFORM / QFAI-CONSISTENCY / QFAI-RESEARCH / QFAI-AGENT）
- cli: `--platform <web|windows|mobile-ios|mobile-android|cross-platform>` 引数を追加
- validators: Design Token 3層（primitive/semantic/component）検証を追加
- validators: HTML Mock の構造・参照・アクセシビリティ観点の検証を追加
- agents: UI/UX 専門エージェント定義と関連 steering ドキュメントを追加

### Changed

- validate: `qfai validate` の検証対象を UI/UX 領域へ拡張
- config: `qfai.config.yaml` に `uiux` 設定を追加

## [1.5.6] - 2026-03-15

### Added

- review: Devil's Advocate と Pattern Doubler をロースターに追加し、12-reviewer 運用を明確化

### Changed

- skills: 全レビュアーの FAIL 時に具体的代替案を必須化
- templates: discussion review テンプレートを 12-reviewer 前提に更新
- steering: review-agent enhancement を次期マイルストーンとして整理

## [1.5.5] - 2026-03-14

### Added

- specs: Spec Diff Protocol (SDP) の増分実行フローを定義し、差分実行の運用指針を明確化

### Changed

- skills: AskUserQuestion Protocol を MUST 運用として整理し、SSOT 手順を強化
- init/assets: skill integration の symlink 構成説明を最新アーキテクチャに整合
- docs: Minimal tutorial と examples の toolVersion を `1.5.5` に更新

## [1.5.4] - 2026-03-13

### Added

- skills: 全 9 SSOT スキルに `AskUserQuestion Protocol` セクションを追加
- tests: skill integration と `pr-merge` plan 生成まわりの回帰テストを追加・拡張

### Changed

- init: integration wrapper 配布をテキストコピーから symlink ベースへ移行
- ci: required build check context と matrix/needs の扱いを見直し、workflow の安定性を改善
- docs: release/skill/README の説明を symlink アーキテクチャと AskUserQuestion 運用に整合
- docs: Minimal tutorial と examples の toolVersion を `1.5.4` に更新

### Fixed

- assets/init: legacy wrapper cleanup と symlink error handling の挙動を修正
- skills: `pr-fix` / Copilot guidance の記述差分を吸収し、各 integration の整合を回復

## [1.5.3] - 2026-03-07

### Changed

- **BREAKING**: layered spec の shared policy directory を `.qfai/specs/_shared/` から `.qfai/specs/_policies/` へ変更
- assets: init scaffold / skill templates / specs README を `_policies` と Consumer View / Escalation Hook 方針へ更新
- validate: layered spec path checks と関連 error / guidance を `_policies` 前提へ更新
- tests: assets/core 回帰テストを `_policies` 期待値に更新
- docs/migrations: `docs/migrations/v1.5.3.md` を追加し、`_shared` → `_policies` の移行手順を明文化
- docs: Minimal tutorial と examples の toolVersion を `1.5.3` に更新

## [1.5.2] - 2026-03-04

### Added

- assets: `qfai-discussion` / `qfai-sdd` に skill-local な `references/rcp_footer.md` を追加

### Changed

- assets: `qfai-discussion` / `qfai-sdd` の RCP footer 参照先を `assistant/templates` から各 skill 配下へ移設
- tests: init assets テストを skill-local RCP footer 構成に更新
- docs: Minimal tutorial と examples の toolVersion を `1.5.2` に更新

### Removed

- assets: `.qfai/assistant/templates/rcp_footer.md` と空の `assistant/templates` ディレクトリを削除

## [1.5.1] - 2026-03-03

### Added

- validators: `validateDiscussionVisuals` を追加し、`QFAI-VIS-001` / `QFAI-VIS-002` を導入
- tests: discussion 統合に伴う validator/preflight の回帰テストを追加・更新

### Changed

- core/preflight: `11_OQ-Register.md` の `Disposition: open` を gate 非依存で blocking 判定するよう統一
- validators: review target kind を `discussion` / `spec` に統一し、legacy `require` 判定を廃止
- validators/discussMermaid: issue code を `QFAI-DPACK-009` / `QFAI-DPACK-010` に統一
- assets/docs: discussion 命名とテンプレート（Mermaid/HTML+CSS mock）を統一

### Removed

- core/validators: legacy `validateDiscussPack` / `validateRequirePackReadiness` を削除

## [1.5.0] - 2026-03-03

### Added

- core: `discussionPack.ts` — 15ファイル構成の統合 discussion pack インスペクタ
- core/packLocator: `"discussion"` PackKind（timestamp 命名 `discussion-YYYYMMDDhhmmssSSS`）
- validators: `validateDiscussionPackReadiness` — QFAI-DPACK-001..008 コード
- assets: `qfai-discussion` スキル（SKILL.md + 15 テンプレート + review テンプレート）
- assets: `.qfai/discussion/README.md`
- docs/migrations: `v1.5.0.md` 移行ガイド

### Changed

- **BREAKING**: config `requireDir` → `discussionDir`（QfaiPaths 型変更）
- core/sddPreflight: require-pack → discussion-pack ベースに切り替え
- core/doctor: `requireDir` → `discussionDir`
- core/runLog: `discuss_pack` / `require_pack` → `discussion_pack`
- validators/importLite: `requireDir` → `discussionDir`
- validators/requireIndex: `requireDir` → `discussionDir`
- validators/requirementsContext: 全参照を discussion ベースに移行
- validators/discussMermaid: `.qfai/discuss` → `.qfai/discussion`, `04_Business-flow.md` → `03_Story-Workshop.md`
- validators/mermaidEnforcement: `.qfai/discussion` を TARGETS に追加
- validators/repositoryHygiene: `discuss` / `require` → `discussion` legacy ルール追加
- validators/reviewArtifacts: `ALLOWED_TARGET_KINDS` に `"discussion"` 追加
- assets: `qfai.config.yaml` で `requireDir` → `discussionDir`

### Deprecated

- validators/requirePack: `validateRequirePackReadiness` は deprecated（`validateDiscussionPackReadiness` を使用）
- skills: `qfai-discuss` / `qfai-require` → `qfai-discussion` に統合

### Removed

- assets: `qfai-discuss` スキル
- assets: `qfai-require` スキル
- assets: `.qfai/discuss/` ディレクトリ
- assets: `.qfai/require/` ディレクトリ

## [1.4.38] - 2026-03-03

### Changed

- core/prototyping: `collectElements` を `ids` + `labels` 両方返却するよう拡張（`collectElementsDetailed` 相当）
- core/prototyping: `expectedMarkers` を `CONTRACT_ID:ELEMENT_ID` ベースに変更（旧: `CONTRACT_ID:ELEMENT_LABEL`）
- core/prototyping: `UiFidelityGeneratedScreen.expected` に `ids` フィールドを追加
- core/prototyping: `UiFidelityAutogenExpected` に `elementIds` フィールドを追加
- core/prototyping: `ContractScreenInput` に `elementIds` フィールドを追加
- validate/prototyping: `QFAI-PROT-242` を `expected.ids` 優先に変更し、旧形式（label ベース）も後方互換で許容
- validate/prototyping: `UiFidelityScreenEvidence.expected` に `ids?: string[]` を追加
- validate/prototyping: QFAI-PROT-242 の診断メッセージを `CONTRACT_ID:ELEMENT_ID` 形式に更新
- docs/migrations: `v1.4.37.md` のマーカー記述を `CONTRACT_ID:ELEMENT_ID` に修正
- docs/migrations: `v1.4.38.md` を追加
- docs: UI Contract README のマーカー推奨値を `CONTRACT_ID:ELEMENT_ID` に統一
- repo: パッケージバージョンを 1.4.38 に更新

## [1.4.37] - 2026-03-02

### Added

- validate/prototyping: `QFAI-PROT-241` (error) — `uiFidelity.screens[].missing.labels` が空でない場合のラベル欠落検出を追加（`expected.labels` 存在時のみ適用、後方互換）
- validate/prototyping: `QFAI-PROT-242` (error) — `uiFidelity.screens[].missing.markers` が空でない場合のマーカー欠落検出を追加（`expected.elements > 0` 時に適用）
- validate/prototyping: `QFAI-PROT-243` (warning) — placeholder/single-text ページ検知を追加（`expected.elements > 2` かつ `observed <= 1`）
- core/prototyping: `extractDomMarkers()` を追加し、`[data-qfai]` 属性からのマーカー抽出を実装
- docs/migrations: `docs/migrations/v1.4.37.md` を追加

### Changed

- cli/prototyping: `--autogen-only` かつ `--autogen-ui-fidelity` 未指定時に exit 2 を返すよう変更（no-op 事故防止）
- cli/prototyping: autogen 未有効時に `uiFidelityAutogen.status=skipped` を evidence に書き込むよう変更（検知可能性向上）
- cli/prototyping: 既存 evidence の `runtimeGate.ui[].route` および `specs[].missing.uiRoutes` から route hints を自動抽出するよう変更
- core/prototyping: `hasLabelMatch` を正規化完全一致に変更（部分一致によるチート防止）
- core/prototyping: body テキストトークン化をオプトイン化（`QFAI_AUTOGEN_BODY_TOKENS=1`、デフォルト無効）
- core/prototyping: crawl 結果に `markers` フィールドを追加し、`buildUiFidelityScreens` で `found.markers / missing.markers` を生成
- validate/prototyping: `UiFidelityScreenEvidence` 型に `expected.labels`, `found`, `missing`, `coverage` を任意フィールドとして追加（後方互換）
- repo: パッケージバージョンを 1.4.37 に更新

## [1.4.36] - 2026-02-28

### Added

- cli/prototyping: `qfai prototyping --autogen-ui-fidelity` コマンドを追加し、`contracts/ui/**` と DOM 巡回による `uiFidelity` 自動生成を実装
- core/prototyping: `uiFidelityAutogen` モジュールを追加（`collectExpectedFromContracts`, `crawlRoutesAndCollectFoundLabels`, `runMockPaths`, `emitUiFidelity`）
- dependencies: `jsdom` を追加（軽量 DOM 解析用）

### Changed

- cli: `--autogen-ui-fidelity`, `--autogen-only`, `--evidence-out`, `--base-url`（prototyping 用）オプションを args に追加
- env: `QFAI_PROTOTYPE_FIDELITY_AUTOGEN=1` / `QFAI_PROTOTYPE_BASE_URL` 環境変数をサポート
- docs: README に prototyping autogen の使用方法・CI 統合例・失敗時ハンドリングを追記
- repo: パッケージバージョンを 1.4.36 に更新

## [1.4.35] - 2026-02-28

### Added

- docs/migrations: `docs/migrations/v1.4.35.md` を追加し、v1.4.34 からの運用更新点（gate追加なし）を明文化
- docs/examples: UI Contract と `uiFidelity` の良い例を追加（`docs/examples/ui-contract.good.yaml`, `docs/examples/prototyping-ui-fidelity.good.json`）

### Changed

- validate/prototyping: `QFAI-PROT-232` の診断性を改善し、`refs` に `contract_id/route/contract_element_labels(_by_contract_route)/missing_labels(alias)/required_actions` を付与
- validate/prototyping: `QFAI-PROT-231/232/233` のメッセージを次アクション指向に更新（label描画・`data-qfai` マーカー・action配線）
- templates/contracts-ui: `contracts/ui/README.md` に `elements[].id` 命名/変更ポリシー、`elements[].label` 運用、L2 `actions[]` 最小セット、FAQ を追加
- templates/review: `assistant/templates/rcp_footer.md` と `review/README.md` に prototyping 失敗時の診断手順と「最初に見るファイル」順を追加
- tests/assets+core: 上記 docs/validator 変更に追従する回帰チェックを追加・更新
- repo: パッケージバージョンを 1.4.35 に更新

## [1.4.34] - 2026-02-27

### Added

- validate/prototyping: `uiFidelity` interactive hard gate を追加し、欠落を `QFAI-PROT-231`（error）として検出
- validate/prototyping: UI contract と `uiFidelity` の欠落整合検証を `QFAI-PROT-232`（error）として追加（contract参照/route/elements/actions）
- validate/prototyping: interactive 時の `mockPaths.status=pass` 欠落検知 `QFAI-PROT-233`（warning）を追加
- docs/migrations: `docs/migrations/v1.4.34.md` を追加し、v1.4.33 からの最小移行手順を明文化

### Changed

- tests/core: `prototypingEvidence` 回帰テストを拡張し、`QFAI-PROT-231/232/233` の最小セットを追加
- tests/core: `validate` fixture の `prototyping.json` を v1.4.34 hard gate 準拠に更新
- templates/evidence: `README.md` の `uiFidelity` 説明を optional から modeベース運用（interactive必須 / skeleton許容）へ更新
- docs/tests/validator: README・CIガイド・validator文言・回帰テスト期待値を v1.4.34 に更新
- repo: パッケージバージョンを 1.4.34 に更新

## [1.4.33] - 2026-02-27

### Added

- templates/contracts-ui: `contracts/ui/README.md` に mockable prototype（`prototype.mode/mockPaths/markers`）の規約と `elements/actions` フィールド詳細を追記し、copy-ready な sample/example を追加
- templates/evidence: `prototyping` 証跡テンプレートへ `uiFidelity`（optional, backward-compatible）を追記

### Changed

- templates/prototyping: `/qfai-prototyping` の DoD を L1/L2 二層で明文化し、既定 L2（interactive）+ `uiFidelity` 出力必須 + placeholder-only output を REVISE 規約に更新
- tests/assets+core: 上記テンプレート/skill追加に対する guardrail を追加し、v1.4.33 表記へ更新
- docs/tests/validator: README・CIガイド・validator文言・回帰テスト期待値を v1.4.33 に更新
- repo: パッケージバージョンを 1.4.33 に更新

## [1.4.32] - 2026-02-24

### Added

- wrappers: `.agents` / `.github/prompts` の `qfai-sdd` wrapper に no-arg all-specs batch reminder（Capabilities SSOT / parallel delegation / batch末尾validate+review）を追加

### Changed

- templates/docs: `.qfai/README.md` の deprecated wrappers 説明を「route」から「initでは非配布・`/qfai-sdd` を使用」へ修正
- tests/assets: `qfai-sdd` wrapper reminder の回帰guardrailを追加
- docs/tests/validator: v1.4.32 表記に合わせて README・CIガイド・validator文言・回帰テスト期待値を更新
- repo: パッケージバージョンを 1.4.32 に更新

## [1.4.31] - 2026-02-24

### Added

- tests/assets: `/qfai-sdd` の引数なし実行で「全spec対象 + 並列委任必須」ルールが維持されることを検知する guardrail を追加

### Changed

- templates/sdd: `/qfai-sdd` の引数解釈を更新し、引数なし時は `_shared/03_Capabilities.md` の順序に従って `spec-0001..N` を全件対象にするルールを明文化
- templates/sdd: 引数なしバッチ時は Contracts-first/Outline を1回、Slice/Plan/Delta を spec毎に並列委任、validate/review をバッチ末尾1回で実施する必須ルールを追加
- templates/instructions: `workflow.md` に `/qfai-sdd` の target policy（引数あり単一spec・引数なし全spec）を追記
- docs/tests/validator: v1.4.31 表記に合わせて README・CIガイド・validator文言・回帰テスト期待値を更新
- repo: パッケージバージョンを 1.4.31 に更新

## [1.4.30] - 2026-02-23

### Added

- validate/prototyping: `.qfai/evidence/prototyping.json` を検査する `validatePrototypingEvidence` を追加し、全spec網羅・declared/checked整合・API 404禁止（`QFAI-PROT-101/111/112/113/114`）を hard gate 化
- templates/agents: prototyping の coverage 欠落を検知して STOP する `prototyping-coverage-auditor` ロールカードを追加

### Changed

- templates/prototyping: `/qfai-prototyping` を `<spec-id>` 前提から **ALL specs** 前提へ更新し、Preflight/Execution/Runtime Gate v2 + `prototyping.md/json` 証跡を必須化
- templates/instructions: `workflow.md` / `constitution.md` の prototyping 完了条件を `evidence + qfai validate --fail-on error` に統一し、scope 縮小禁止を明文化
- tests/assets: prototyping guardrail（ALL specs/evidence必須/DONE禁止条件）の退行検知を追加
- docs/tests: v1.4.30 表記に合わせて README・CIガイド・validator文言・回帰テスト期待値を更新
- repo: パッケージバージョンを 1.4.30 に更新

## [1.4.29] - 2026-02-22

### Added

- tests/assets: init assets 内の禁止文字列（Coverage Ledger hard gate 残骸）・legacy spec 参照（`spec.md` / `delta.md`）・`qfai-sdd/templates/spec-pack` 再導入を検知する guardrail を追加

### Changed

- templates/skills+agents: `assistant/**` の完了ゲートを `qfai validate --fail-on error` + `assistant/steering/test-layers.md` に統一し、Coverage Ledger / `scenario.feature` 必須導線を除去
- templates/specs: spec 参照を layered v1.4.21 命名（`01_Spec.md` / `09_delta.md` / `_shared/10_delta.md`）へ統一
- templates/sdd: `qfai-sdd/templates/spec-pack/**` を配布対象から除去し、`templates/specs/**` のみを配布
- templates/skills: `qfai-sdd-planning` / `qfai-sdd-refinement` を init 配布対象から除外し、`qfai-tdd-red|green|refactor` を deprecated wrapper 運用へ更新
- docs/tests: v1.4.29 表記に合わせて README・CIガイド・validator文言・回帰テスト期待値を更新
- repo: パッケージバージョンを 1.4.29 に更新

## [1.4.28] - 2026-02-22

### Added

- tests/assets: 汎用 skills/agents に `Coverage Ledger 100%` ゲート残骸が再導入されないことを検査する guardrail を追加

### Changed

- templates/skills: `qfai-verify` / `qfai-sdd` / `qfai-configure` / `qfai-prototyping` から coverage ledger 完了ゲートを除去し、`qfai validate --fail-on error` + `assistant/steering/test-layers.md` を必須ゲートとして明記
- templates/skills: 上記4 skill で `scenario.feature` / coverage ledger を mandatory 入力から optional legacy 入力へ格下げ
- templates/agents: `orchestrator` / `test-engineer` / `qa-engineer` / `qa-reviewer` / `unit-test-scope-enforcer` / `backend-engineer` / `frontend-engineer` を SSOT（US/TC/CON-API + validate gate）に整合
- docs/tests: v1.4.28 表記に合わせて README・CIガイド・validator文言・回帰テスト期待値を更新
- repo: パッケージバージョンを 1.4.28 に更新

## [1.4.27] - 2026-02-22

### Added

- templates/migration: ATDD運用の v1.4.27 hard gate 整合を明記する `v1.4.27-atdd-alignment.md` を追加

### Changed

- templates/assistant: `test-layers` / `workflow` / `agent-selection` / `drift-protocol` を US/TC/CON-API 中心の運用へ更新
- templates/skills+agents: `/qfai-atdd` と atdd implementers・reviewer・coverage planning 系を ledger 必須から validate error gate 中心へ更新
- docs/tests: v1.4.27 表記に合わせて README・CIガイド・validator文言・回帰テスト期待値を更新
- repo: パッケージバージョンを 1.4.27 に更新

## [1.4.26] - 2026-02-21

### Added

- validate/atdd: spec→コード（ATDD注釈）の hard gate を追加し、Unknown参照（`QFAI-ATDD-101/102/103`）・Coverage欠落（`QFAI-ATDD-111/112/113`）・禁止参照（`QFAI-ATDD-121/122`）を error として検出
- report/atdd-traceability: `.qfai/report/atdd-traceability/summary.json` と `summary.md` の出力を追加（出力失敗は `QFAI-ATDD-901` warning）

### Changed

- templates/docs: test-layer運用とRCP観点を v1.4.26 の ATDD注釈運用に更新
- docs/tests: v1.4.26 表記に合わせて README・CIガイド・validator文言・回帰テスト期待値を更新
- repo: パッケージバージョンを 1.4.26 に更新

## [1.4.25] - 2026-02-21

### Added

- validate/layerCoverage: v1.4.21 layered specs 向けに構造完全性 hard gate（`QFAI-COV-204`/`QFAI-COV-205`/`QFAI-COV-206`）を追加し、空参照行を error として検出
- validate/layerCoverage: EX の複数 BR 参照を薄さシグナルとして警告する `QFAI-COV-207` を追加
- ci: `qfai validate --fail-on error --format github` 実行と report artifact upload を workflow に追加

### Changed

- templates/skills: `/qfai-sdd` に validate 実行（error=0）と evidence（`validate.log` / `specs-coverage`）必須の completion gate を追加
- templates/skills: `/qfai-discuss` に Example Mapping 観点（Happy/Negative/Edge/Permission/State/Idempotency）と Density Review 連携を追加
- templates/review+agents: RCP footer / review request / coverage-planner / test-case-owner / test-volume-estimator / qa-gatekeeper を v1.4.21 layered 入力と hard gate 運用に更新
- docs/tests: v1.4.25 運用に合わせて README・validator文言・回帰テスト期待値を更新
- repo: パッケージバージョンを 1.4.25 に更新

## [1.4.24] - 2026-02-20

### Added

- validate/contracts: `11_Contracts.md` と `_shared/05_Contracts.md` の契約参照IDを宣言済み契約へ照合する validator を追加（`QFAI-CONTRACT-030`、short ID 正規化対応）
- init/wrappers: `.agents/skills/**` と `.agents/README.md` の生成を追加し、`--force` 時の stale wrapper 削除に対応

### Changed

- templates/sdd: `/qfai-sdd` を contracts-first 必須フローへ更新し、`_shared/05_Contracts.md` の Contract Index（DB/API/UI short ID）規約を明記
- templates/specs: layered shared/spec の欠番対策として `_shared/08_Decisions.md` / `_shared/09_Open-questions.md` / `_shared/10_delta.md` を追加し、`07/08` 系の empty 時 `0 items` 明示を標準化
- templates/prototyping: `/qfai-prototyping` に「契約不足時STOP」「契約ファイル新規作成禁止」を追加
- docs/tests: `.agents` wrapper 追加・v1.4.24 運用に合わせて README と回帰テストを更新
- repo: パッケージバージョンを 1.4.24 に更新

## [1.4.23] - 2026-02-18

### Added

- validate/layered: v1.4.21 layered specs 向けに下位参照検知（`TRACE_DOWNSTREAM_REF`）と `_shared` 責務違反検知（`TRACE_SHARED_SCOPE_VIOLATION`）を追加
- validate/status: `.qfai/status` の legacy 検知 validator を追加（`LEGACY_STATUS_DIR` / `LEGACY_STATUS_DIR_NONEMPTY`）
- report/run-log: `qfai validate` 実行ごとに `.qfai/report/run-*/` を append-only 生成し、`run.json` / `validator.json` / `traceability.json` / `summary.md` を保存

### Changed

- validate/spec-pack: release gate の `release_candidate` 判定を specs Initiative レイヤーに統一し、`.qfai/status/*.json` 依存を廃止
- templates/docs: init scaffold と README 群の status 記述を run-log 運用（`.qfai/report/run-*`）へ更新
- tests: layered v1.4.21 traceability・legacy status warning・run-log 生成の回帰テストを追加/更新
- repo: パッケージバージョンを 1.4.23 に更新

## [1.4.22] - 2026-02-18

### Added

- core/pack-locator: discuss/require pack の命名判定・timestamp 解析・latest 選定を共通化し、生成系（preflight）と検証系（validator）で同一ルールを適用
- validate/hygiene: legacy directory（`discussions/`, `requirements/`, `spec/`, `specification/`）と legacy pack（`*-0001` 形式）検知を追加（v1.4.22 は warn 中心、危険命名は error）

### Changed

- templates/skills: `qfai-sdd-refinement` / `qfai-sdd-planning` を実処理なしの deprecated wrapper へ置換し、`/qfai-sdd` へ一本化
- templates/init: report ディレクトリに `.gitignore` を追加し、ログ/成果物の追記型運用を明確化
- docs/tests: v1.4.22 の skill 導線・衛生ルール・テンプレ構成へ README と回帰テスト期待値を更新
- repo: パッケージバージョンを 1.4.22 に更新

## [1.4.21] - 2026-02-18

### Added

- validate/layerCoverage: v1.4.21 向けの `AC->TC` / `BR->EX` / `EX->TC` 必須カバレッジ検証（error）を追加
- validate/layerCoverage: `.qfai/report/specs-coverage/spec-XXXX.md` のカバレッジレポート出力と signal 行を追加
- validate/layerCoverage: `specs/plan.md` 禁止・`10_Plan.md` の How-only 禁止項目検査を追加

### Changed

- templates/specs: layered canonical 名を v1.4.21 へ更新（`03_Acceptance-Criteria.md` / `04_Business-Rules.md` / `05_Examples.md` / `06_Test-Cases.md` / `_shared/04_Business-Flow.md`）
- core/spec-layout: layered 既定 required file set を v1.4.21 名へ更新し、`LayeredStyle=v1421` 判定を追加
- validate/business-flow/mermaid/review-gate: Business Flow の canonical 名を `04_Business-Flow.md` に統一し、旧名は warning で検出
- templates/docs/tests: v1.4.21 命名・Plan方針に合わせて manifest / skill / README / test expectation を更新
- repo: パッケージバージョンを 1.4.21 に更新

## [1.4.20] - 2026-02-18

### Added

- templates/discuss: `/qfai-discuss` の固定成果物を `01_Context.md`..`09_delta.md` の9ファイル構成へ更新
- templates/review: `review-roster.yml` と共通RCPフッター（`assistant/templates/rcp_footer.md`）のSSOTを追加
- validate/discuss: 最新 discuss pack の OQ 検査（`Disposition: open` 禁止、`deferred` 必須メタ検査）を追加

### Changed

- templates/skills: `/qfai-discuss` を Open OQ=0 ループ（`deferred` 許容）へ更新し、`/qfai-discuss` `/qfai-require` `/qfai-sdd` で総動員レビュー導線を統一
- docs/tests: v1.4.20 表記と discuss 固定テンプレート構成に合わせて回帰テストを更新
- repo: パッケージバージョンを 1.4.20 に更新

## [1.4.19] - 2026-02-17

### Added

- validate/require: `require-<timestamp>/` の固定9ファイル存在・最小内容・Blocking OQ（`Disposition: open` + `Gate: discuss|require|sdd`）検査を追加
- validate/review: `.qfai/review/.gitignore` と `review-*` 最小成果物（`review_request.md` / `R*_*.md` / `summary.json`）検査を追加
- core/preflight: `/qfai-sdd` 用 preflight に require-pack 必須停止ガード（不足時の次コマンド誘導）を追加
- core/spec-layout: layered spec 必須ファイル集合のSSOTを追加し、欠落・番号飛び検知を強化

### Changed

- templates/init: `.qfai/review/.gitignore` を常設し、review 生成物の追記型運用を固定化
- templates/require: `/qfai-require` の成果物を固定9ファイル（`01_Sources.md`..`09_delta.md`）へ更新
- templates/skills: `/qfai-require` `/qfai-sdd` `/qfai-sdd-refinement` `/qfai-sdd-planning` を require-pack 必須導線へ更新
- docs/tests: v1.4.19 表記と require-pack / preflight / review / layered spec 回帰テストを更新
- repo: パッケージバージョンを 1.4.19 に更新

## [1.4.18] - 2026-02-16

### Added

- validate/mermaid: `.qfai/specs|require|discuss`（`evidence` 除外）を対象に Mermaid 記法の fenced block 強制 + Business Flow 必須図を検証する validator を追加
- validate/layered: v1.4.17 layered spec の `US -> AC -> BR -> EX -> TC` に対して「親が最低1つの子を持つ」coverage validator を追加

### Changed

- templates/specs: `_shared/04_Business-flow.md` と `_shared/05_Contracts.md` の Mermaid 必須表現を強化
- templates/specs: `spec/05_Examples.feature` の `# Parent:` 必須ルールをテンプレートに明記
- templates/skills: `/qfai-discuss` `/qfai-require` `/qfai-sdd-refinement` `/qfai-sdd-planning` の FINAL CHECKLIST を v1.4.18 要件へ更新
- docs/tests: v1.4.18 表記と Mermaid/Coverage validator の回帰テストを更新
- repo: パッケージバージョンを 1.4.18 に更新

## [1.4.17] - 2026-02-16

### Added

- validate/layered: CAP単位のspec分割を検証する `validateSpecSplitByCapability` を追加
- validate/layered: Parent参照の方向（下位→上位のみ）を検証する `validateLayeredTraceability` を追加
- validate/layered: US/AC/BR/EX/TC の孤児禁止を検証する `validateOrphanProhibition` を追加
- templates/specs: `_shared/03_Capabilities.md` と `spec/01..09` の v1.4.17 テンプレート群を追加

### Changed

- core/spec-layout: layered spec の標準構成を `01_Spec.md + 02..06` へ対応しつつ旧構成との互換を維持
- templates/skills: `/qfai-sdd` `/qfai-sdd-refinement` の分割規約を CAP単位ループ・Parent必須ルールへ更新
- templates/review: review request / reviewer / summary テンプレートの layer 名を v1.4.17 スキーマへ更新
- docs/tests: v1.4.17 表記と layered traceability / orphan 検証の回帰テストを更新
- repo: パッケージバージョンを 1.4.17 に更新

## [1.4.16] - 2026-02-16

### Added

- templates/sdd: import-lite 用 evidence テンプレート（`templates/evidence/import-lite.md`）を追加
- templates/sdd: preflight 報告テンプレート（`templates/report/preflight_summary.md`）を追加
- validate/require: `02_requirement-index.md` の最小 shape（`REQ-` 件数、`Source refs` 欠落率）を検査する warning validator を追加
- validate/import-lite: specs が存在するのに require index と import-lite evidence の両方が無い場合の warning validator を追加
- core/preflight: SDD preflight 入力選択と `preflight_summary.md` 生成ユーティリティを追加

### Changed

- templates/require: `02_requirement-index.md` を索引専用（`REQ-ID / Statement / Priority / Source refs / Notes`）へ更新し、specs との重複禁止を明確化
- templates/skills: `/qfai-sdd` `/qfai-sdd-refinement` の preflight 手順を `require-index` 優先 + import-lite fallback + report 出力に整合
- templates/init: `.qfai/report/README.md` を追加し、preflight_summary の格納先を明確化
- docs/tests: v1.4.16 表記と import-lite/preflight テンプレート参照を更新
- repo: パッケージバージョンを 1.4.16 に更新

### Changed

- なし

## [1.4.15] - 2026-02-16

### Added

- templates/init: `.qfai/status/README.md` を追加し、status（運用状態）の保管場所を明確化
- validate/status: specs 配下の status 混入（`release_candidate` / `Status` / `Progress` / `Risk(s)`）を検知する warning validator を追加
- validate/density: BR/Examples/Test-cases の最低存在チェック（`BR-` / `Scenario` / `TC-` と Coverage Matrix）を warning validator として追加

### Changed

- templates/specs: Business Rules / Examples / Test-cases テンプレートを v1.4.15 の密度要件（Catalog/Rule Definitions/Matrix 等）へ強化
- templates/skills: `/qfai-sdd-refinement` `/qfai-sdd-planning` の review 観点に BR→Examples→Test-cases の分解品質チェックを追加
- docs/tests: v1.4.15 表記と status 分離・density validator の回帰テストを更新
- repo: パッケージバージョンを 1.4.15 に更新

## [1.4.14] - 2026-02-16

### Added

- validate/mermaid: Mermaid 記法が `mermaid` 以外の fenced code block に書かれた場合を検出する validator（error）を追加
- validate/business-flow: `.qfai/specs/_shared/04_Business-flow.md` の mermaid 必須チェック（flowchart または sequenceDiagram）を追加
- validate/compat: `.qfai/specs/_shared/*Business-flow*.feature` を deprecated warning として検出

### Changed

- templates/skills: `/qfai-discuss` `/qfai-require` `/qfai-sdd-refinement` の Mermaid ルールと review checklist を更新
- templates/specs: Business Flow のテンプレート/README を `Markdown + Mermaid` 前提へ更新
- docs/tests: v1.4.14 表記と Mermaid 関連の回帰テストを更新
- repo: パッケージバージョンを 1.4.14 に更新

## [1.4.13] - 2026-02-16

### Added

- なし

### Changed

- templates/discuss+require: discuss / require 出力ディレクトリ命名を timestamp (`discuss-*` / `require-*`) へ統一し、README・skill 定義を更新
- validate/discovery: discuss 探索を `discuss-*` 優先に変更し、旧形式 (`DISCUSS-####`) は後方互換 + warning として扱う
- docs/tests: v1.4.13 表記と成果物パス表記を更新
- repo: パッケージバージョンを 1.4.13 に更新

## [1.4.12] - 2026-02-16

### Added

- templates/review: `/qfai-discuss` / `/qfai-require` / `/qfai-sdd-refinement` / `/qfai-sdd-planning` に review artifacts 用テンプレート（`review_request.md` / `Rxx_reviewer.md` / `summary.json`）を追加
- templates/steering: `review-gate.rules.yml` を追加し、required/optional gate と default reviewers を定義
- validate/review-gate: `.qfai/review/**/summary.json` を検証する review gate validator（schema / fixed 条件 / attempt 連番 / fingerprint / required gate）を追加

### Changed

- templates/skills: discuss/require/sdd-refinement/sdd-planning に RCP 手順（attempt 採番・差戻しループ・fixed 判定）を明記
- tests: review gate validation と review template 配布の回帰テストを追加
- tests/docs: v1.4.12 表記へ更新
- repo: パッケージバージョンを 1.4.12 に更新

## [1.4.11] - 2026-02-16

### Added

- templates/skills: `/qfai-sdd-refinement` / `/qfai-sdd-planning` を追加し、SDD preflight の分割運用を再導入
- templates/sdd: import-lite 証跡テンプレート（`qfai-sdd-refinement/templates/import-lite-evidence.md`）を追加

### Changed

- templates/require: `/qfai-require` の成果物を `01_sources.md` / `02_requirement-index.md` / `03_open-questions.md` へ刷新
- docs/workflow: require・specs・README 導線を import-lite/preflight 前提へ更新
- validate: require context validator を `qfai validate` の実行対象から外し、旧 require 構造依存を解消
- tests/verify-pack: require index 新構造と SDD split skill に追従
- tests/docs: v1.4.11 表記へ更新
- repo: パッケージバージョンを 1.4.11 に更新

## [1.4.10] - 2026-02-16

### Added

- validate/layered: `_shared + spec-XXXX` レイアウト向け検証（CAP↔spec整合、US→AC→BR→SC→CASE の必須エッジ、namespace整合）を追加

### Changed

- validate/ids: `CAP` / `US` を ID 抽出・重複検知対象に追加
- validate/layout: `*_delta.md` を許容し、Layered layout を優先検出
- docs/skills: `.qfai/specs/README.md` と skill の Mandatory Outputs を v1.4.10 契約へ更新
- tests/docs: v1.4.10 表記へ更新
- repo: パッケージバージョンを 1.4.10 に更新

## [1.4.9] - 2026-02-14

### Added

- なし

### Changed

- init/integrations: `qfai init` で `.claude/commands`・`.github/prompts`・`.codex/skills` と agent wrapper（`.claude/agents`・`.github/agents`）を再生成するよう修正（対象は現行 canonical skills のみ）
- init/force: `qfai init --force` で canonical skills と integration wrappers を再同期する挙動へ更新
- verify-pack/tests/docs: wrapper 配布前提に検証・ドキュメントを更新
- tests/docs: v1.4.9 表記へ更新
- repo: パッケージバージョンを 1.4.9 に更新

## [1.4.8] - 2026-02-14

### Added

- なし

### Changed

- templates/init-root: `qfai init` 実行時に `features/spec-0001.feature` を生成しないよう、root サンプル feature を削除
- tests/docs: v1.4.8 表記へ更新
- repo: パッケージバージョンを 1.4.8 に更新

## [1.4.7] - 2026-02-14

### Added

- なし

### Changed

- templates/skills: 廃止対象 skill（`qfai-implement` / `qfai-pr` / `qfai-scenario-test` / `qfai-spec` / `qfai-unit-test`）を削除
- templates/wrappers: `.claude` / `.codex` / `.github` 配下の配布資産を撤廃
- templates/contracts: contracts サンプルを `qfai-sdd/templates/contracts/` へ移設し、参照を更新
- docs/tests/init: 廃止導線の参照を削除し、`qfai-sdd` 中心フローへ統一
- repo/ci: このリポジトリ自身の品質ゲートとして `build`（`pnpm ci:local`）を GitHub Actions で維持
- repo: パッケージバージョンを 1.4.7 に更新

## [1.4.6] - 2026-02-14

### Added

- templates/skills: 全 canonical skill (`.qfai/assistant/skills/*/SKILL.md`) に `Completion Checklist (MUST)` と `Completion Message & Next Actions (MUST)` を追加
- templates/skills: `qfai-discuss` に固定の完了メッセージ（`/qfai-require` 誘導）を必須化

### Changed

- templates/skills: 完了時に「次のユーザー行動」を列挙する導線を全 skill で標準化
- repo: パッケージバージョンを 1.4.6 に更新

## [1.4.5] - 2026-02-14

### Added

- templates/skills: contracts サンプルを `.qfai/assistant/skills/qfai-spec/templates/contracts/` に追加

### Changed

- templates/init: `qfai init` 初期資産を空スキャフォールド化（specs/discuss/require/contracts は README/.gitignore のみ）
- templates/init: legacy `.qfai/discussions/` を削除し、参照を `.qfai/discuss/` に統一
- tests: init 直後に sample pack が無い前提へ検証セットアップを更新
- repo: パッケージバージョンを 1.4.5 に更新

## [1.4.4] - 2026-02-13

### Added

- validate: release_candidate 判定（`03_Initiative.md` の `release_candidate: true`）と release gate（OQ open blocking）を追加
- validate: `18_delta.md` の required sections / Rejected の `DO NOT`・`Temptation` 必須チェックを追加

### Changed

- validate: Spec Pack/Ledger 系エラーの修正指示を強化し、error_code ベースで原因と対処を明確化
- cleanup/docs: 旧資産導線を整理し、v1.4.4 hardening 方針へ統一
- repo: パッケージバージョンを 1.4.4 に更新

## [1.4.3] - 2026-02-13

### Added

- templates/skills: 統合SDD skill `qfai-sdd` を追加し、`templates/spec-pack/01..18` を単一skill配下に集約
- templates/wrappers: `.codex` / `.claude` / `.github` 向け `qfai-sdd` wrapper を追加

### Changed

- templates/skills: `qfai-sdd-refinement` / `qfai-sdd-planning` を廃止し、`qfai-spec` は `qfai-sdd` への deprecated alias に更新
- templates/docs: README / `.qfai` ドキュメント導線を `qfai-sdd` 一本化へ更新
- repo: パッケージバージョンを 1.4.3 に更新

## [1.4.2] - 2026-02-13

### Added

- templates: `qfai-discuss` / `qfai-require` の v1.4.2 ヒアリングテンプレート（Core / Optional deep dive, `00..07`）を追加

### Changed

- templates/skills: `qfai-discuss` / `qfai-require` を「レイヤー型 Spec Pack 入力を揃える構造化ヒアリング」フローに刷新
- templates/docs: discuss / require 成果物フォーマットを v1.4.2 仕様へ更新
- repo: パッケージバージョンを 1.4.2 に更新

## [1.4.1] - 2026-02-12

### Added

- validate/report: 新Spec Pack（`01..18`）と Ledger SSOT を前提にした検証・レポート生成を追加

### Changed

- validate: 旧成果物（`spec.md` / `scenario.feature` / `case-catalogue.md` / `traceability-matrix.md`）前提の探索・検証を廃止
- repo: パッケージバージョンを 1.4.1 に更新

## [1.4.0] - 2026-02-12

### Added

- templates/spec-pack: `01_Spec.md` から `18_delta.md` までの新 Spec Pack テンプレートを `qfai-sdd-refinement` / `qfai-sdd-planning` の skills 配下に追加
- templates/specs/contracts: init 直後に参照できる `spec-0001` サンプルと `API-0001` / `DB-0001` / `UI-0001` サンプル契約を追加

### Changed

- templates/docs: `.qfai/specs/README.md` を Spec Pack 01..18 構成と参照方向ルール（下位→上位のみ）へ更新
- templates/skills: `qfai-sdd-refinement` / `qfai-sdd-planning` の作業フロー規約と Mandatory Outputs を新構成へ更新
- repo: パッケージバージョンを 1.4.0 に更新

## [1.3.19] - 2026-02-11

### Added

- validate: Drift Protocol / test-layer hardening 用の assistant assets validator を追加（`QFAI-ASSETS-001/002`, `QFAI-SKILLS-010/011/012`）
- validate: `.qfai/assistant/skills/**` と `.qfai/assistant/skills.local/**` の `SKILL.md` 必須 marker / Reviewer Gate 静的検証を追加

### Changed

- validate: `implementation-brief.md` 単独存在を warning から error へ変更（How SSOT を `plan.md` に完全統一）
- templates/docs: `implementation-brief.md` の互換期間説明を廃止し、`plan.md` 必須方針へ更新
- repo: パッケージバージョンを 1.3.19 に更新

## [1.3.18] - 2026-02-11

### Added

- templates: How SSOT の新テンプレート `.qfai/templates/spec/plan.md` を追加
- templates: Drift Protocol 規範 `.qfai/assistant/instructions/drift-protocol.md` とテストレイヤ規範 `.qfai/assistant/steering/test-layers.md` を追加
- validate: `plan.md` 検証と legacy `implementation-brief.md` 互換判定（`QFAI-HOW-001/002` 継続）を追加
- templates/agents: reviewer 系サブエージェントに Drift Protocol / test-layer policy 観点を追加

### Changed

- templates/specs/docs: How SSOT の標準ファイル名を `implementation-brief.md` から `plan.md` へ移行（legacy は互換期間で warning 扱い）
- templates/skills: Reviewer Gate と work order 制約を更新し、drift 承認制・test-layer 準拠を明文化
- templates/skills: ATDD のテストボリューム floors/倍率を「ゲート」ではなく「不足検知シグナル」として扱う方針に更新
- repo/docs: README・命名規約・関連説明を `plan.md` 前提へ整合
- repo: パッケージバージョンを 1.3.18 に更新

## [1.3.17] - 2026-02-10

### Added

- validate: case-catalogue の必須カラム表ヘッダ検証を追加（`QFAI-CASE-011`）
- validate: `.qfai/discussions/discuss-*.md` の Mermaid `sequenceDiagram` 検証を追加（`QFAI-DISCUSS-021`）

### Changed

- validate: CI 環境で `--phase refinement` 実行を禁止し、`QFAI-VALIDATE-017` で Fail 化
- validate: waiver を Warn/Info 用途に限定し、Error finding 対象 waiver を `QFAI-WAIVER-002` として Fail 化
- validate: waiver 期限切れの扱いを `QFAI-WAIVER-003` warning へ変更
- templates/docs: waiver 運用と refinement phase の注意事項（CI は full を使用）を更新
- repo: パッケージバージョンを 1.3.17 に更新

## [1.3.16] - 2026-02-10

### Added

- templates/skills: 全 Skill に `Sub-agent Delegation (MANDATORY)` セクションを追加し、Capability Probe / Simulation mode / Work Orders Summary / Reviewer Gate を明文化
- test/assets: skills 出荷アセットの委任要件整合を検査する静的チェックを追加

### Changed

- templates/skills: 主要工程（discuss/require/sdd/atdd/tdd/verify）の委任フローを Delegate → Integrate → Reviewer Gate に更新
- templates/wrappers: `.claude/.github/.codex` の wrapper skill へ同等の委任要件を反映
- repo: パッケージバージョンを 1.3.16 に更新

## [1.3.15] - 2026-02-10

### Added

- templates: `require/business-flows.md` と discussions の Business Flow 例で Mermaid `sequenceDiagram` を標準化
- validate: requirements context で `business-flows.md` の Mermaid 必須チェックを追加（`QFAI-REQCTX-020/021`）

### Changed

- templates: skills 構造を `SKILL.md` 単体完結（SSOT）へ移行し、`qfai-source` / `10_workflow.md` 依存を廃止
- templates: `assistant/instructions/workflow.md` と各工程 skill に steering 補完ルールを明記
- templates/docs: `specs/README.md` の `case-catalogue.md` テンプレを表形式へ更新
- repo: パッケージバージョンを 1.3.15 に更新

## [1.3.14] - 2026-02-09

### Added

- validate: `--phase refinement` を追加し、Refinement段階の専用検証プロファイルを導入
- validate: `implementation-brief.md` 検証を追加（`QFAI-HOW-001/002`）
- templates/skills: `qfai-sdd-refinement` / `qfai-sdd-planning` を追加し、How SSOT（`implementation-brief.md`）運用を導入
- templates: `.qfai/templates/spec/implementation-brief.md` を追加

### Changed

- validate: refinement phase では How必須チェックと SC→Test 強制（`QFAI-TRACE-010/013`）を緩和
- templates/docs: Spec Pack 必須ファイルに `implementation-brief.md` を追加し、SDDフローを refinement/planning に更新
- skills: `qfai-spec` を deprecated alias として `qfai-sdd-refinement` へ誘導
- repo: パッケージバージョンを 1.3.14 に更新

## [1.3.13] - 2026-02-08

### Added

- templates: skills-only 配布構成（`.claude/skills` / `.github/skills`）を追加
- validate/doctor: `skillsIntegrity` チェックを追加（`.qfai/assistant/skills/**` を検査）

### Changed

- templates: `prompts/commands` を廃止し、`.qfai/assistant/skills` を SSOT とする構成へ移行
- init: `--force` の上書き対象を `assistant/skills` と publish 先 skills（`.claude/.github/.codex`）へ変更
- config: `paths.skillsDir` を追加し、`paths.promptsDir` を deprecated 扱いへ変更
- tests/scripts/docs: assets テスト・verify-pack・README 群を skills-only 構成に更新
- repo: パッケージバージョンを 1.3.13 に更新

## [1.3.12] - 2026-02-08

### Added

- validate: delta.md の Verification Plan 検証を追加（VFY-001〜007）
- report: Verification findings（Error/Warn）の可視化を追加

### Changed

- templates: delta.md テンプレートに Verification セクションを追加
- templates: PR テンプレートに verification 確認項目を追加
- docs: verification 運用の最小ガイドを README と init docs に追記
- repo: パッケージバージョンを 1.3.12 に更新

## [1.3.11] - 2026-02-08

### Added

- validate: waiver 設定（`.qfai/waivers.yml`）と適用機構を追加（WAIVER-001〜006）
- report: Active Waivers / Suppressed Summary / Expired Waivers の表示を追加
- templates: `.qfai/waivers.yml` テンプレートを init 資産に追加

### Changed

- validate: findings に waiver マッチ用メタ（`dl_id` / `file`）を付与し、waiver 適用後の結果で fail 判定
- templates: PR テンプレートに Waivers 申告セクションを追加
- tests: waiver の unit/integration/assets 回帰テストを追加
- repo: パッケージバージョンを 1.3.11 に更新

## [1.3.10] - 2026-02-07

### Added

- validate: compat/scope 整合チェックを追加（COMPAT-001〜005, SCOPE-001/002）
- report: compat 観点と scope mismatch の表示を追加

### Changed

- templates: delta.md を v1.1（`#### Migration / Follow-ups`）へ更新し、PR テンプレートに compat セクションを追加
- tests: compat/scope ルールとテンプレート更新の回帰テストを追加
- repo: パッケージバージョンを 1.3.10 に更新

## [1.3.9] - 2026-02-07

### Added

- validate: delta.md フォーマット v1（Update History / Decision Log / Meta YAML / Rejected guardrails）検証を追加（DELTA-001/002/003）
- validate: Change Type の語彙検証と diff ベース矛盾検知を追加（CTYPE-001/002/003）
- report: Change Type（Primary/Tags/compat）集計と CTYPE-002 警告一覧を追加

### Changed

- templates: delta.md テンプレートを v1 構造に更新し、PR テンプレートに Change Type / Tags / delta 参照 / Review Focus を追加
- tests: delta/ctype 関連ユニットテストと assets ガードレールを更新
- repo: パッケージバージョンを 1.3.9 に更新

## [1.3.8] - 2026-02-06

### Changed

- templates: Claude Code slash commands（`.claude/commands/*.md`）が `.qfai/assistant/skills/<id>/SKILL.md` を参照するよう更新（skills -> prompts(SSOT)）
- docs: README の integration 説明を Claude commands の skills 優先に更新
- repo: パッケージバージョンを 1.3.8 に更新

## [1.3.7] - 2026-02-06

### Changed

- Codex skill wrappers now reference `.qfai/assistant/skills/<id>/SKILL.md` as the canonical entrypoint (instead of `.qfai/assistant/prompts/<id>.md`).
- Updated `.codex/README.md` to document the skills-first entrypoint for tool integrations.

## [1.3.6] - 2026-02-06

### Changed

- templates: GitHub Copilot prompt wrappers（`.github/prompts/*.prompt.md`）が `.qfai/assistant/skills/*/SKILL.md` を参照するよう更新（skills -> prompts(SSOT)）
- templates: `.github/copilot-instructions.md` のガイダンスを skills 優先に更新
- docs: README の integration 説明を skills 優先に更新
- repo: パッケージバージョンを 1.3.6 に更新

## [1.3.5] - 2026-02-06

### Added

- templates: `.qfai/assistant/skills/<skill-name>/SKILL.md` と `.qfai/assistant/skills.local/` を追加（experimental: prompt の thin wrapper）

### Changed

- init: `assistant/skills.local` を `qfai init --force` の上書き対象から保護
- verify-pack: `assistant/skills` / `assistant/skills.local` の生成を検証
- repo: パッケージバージョンを 1.3.5 に更新

## [1.3.4] - 2026-02-05

### Changed

- validate: requirements コンテキスト段階導入メッセージのバージョン表記を v1.3.4 に更新
- repo: パッケージバージョンを 1.3.4 に更新

## [1.3.3] - 2026-02-05

### Added

- templates: change classification（Primary/Tags）判断基準の SSOT を追加（`.qfai/assistant/instructions/change-classification.md`）

### Changed

- docs/templates: README と `.qfai/README.md` に change classification 参照を追加
- prompts: `qfai-spec` / `qfai-verify` に Primary/Tags の必須化を追加
- templates: `specs/README.md` に Primary/Tags メタデータとガイドを追加
- repo: PR テンプレに Primary/Tags のセクションを追加

## [1.3.2] - 2026-02-05

### Added

- validate: requirements コンテキスト（glossary/actors/business-flows）と Coverage Map の段階導入チェックを追加（QFAI-REQCTX-000/001/002/003/004/010）
- config: `paths.requireDir`（デフォルト `.qfai/require`）を追加
- tests: requirements コンテキスト検証のユニットテストを追加

### Changed

- templates: `qfai.config.yaml` に `paths.requireDir` を追記
- docs: README の config 例に `requireDir` を追記

## [1.3.1] - 2026-02-04

### Added

- prompts: legacy entrypoint 向け prompt（`qfai-scenario-test` / `qfai-unit-test` / `qfai-implement` / `qfai-pr`）を追加
- templates: legacy entrypoint 向け wrapper（`.github/prompts` / `.claude/commands` / `.codex/skills`）を追加
- templates: `.qfai/require/require.md` テンプレを追加
- templates: `.qfai/discussions/README.md` を追加
- templates: `require/glossary.md` / `require/actors.md` / `require/business-flows.md` を追加
- instructions: `assistant/instructions/requirements-decomposition.md` を追加

### Changed

- docs: README を npm EN v1.0.7 の内容に整合（root/package 同期）し、設定例を現行スキーマに整合
- templates: `.qfai/README.md` / `require/README.md` を要求分解と Coverage Map に整合
- prompts: `/qfai-discuss` / `/qfai-require` / `/qfai-spec` を ACT/BF/TERM と Coverage Map に整合

## [1.3.0] - 2026-02-04

### Added

- validate: delta.md の Change Type（primary/tags）と Decision Records の do_not/temptation 欠落警告を追加（QFAI-DELTA-201〜204）
- tests: Change Type 警告のユニットテストを追加

### Changed

- templates: delta.md の Change Log テンプレートに Change Type と rejected 補強（do_not/temptation）を追加
- prompts/instructions: 作業開始時に Change Type を宣言する運用を追加
- docs: PR テンプレに Change Type / Compatibility / delta.md 更新点を追加

## [1.2.14] - 2026-02-03

### Added

- prompts: /qfai-atdd の Coverage Ledger 必須化、sub-agent 必須、Stage Gates/DoD/差戻し条件を強化
- prompts: /qfai-prototyping・/qfai-tdd-green の Runtime Gate を必須化、/qfai-tdd-red の TDD Ledger を必須化
- prompts: /qfai-require・/qfai-spec の未定義/OQ 検知とユーザー質問を必須化、/qfai-discuss の事前調査を必須化
- agents: Orchestrator / ATDD Implementers / Reviewer / Runtime Gatekeeper / Doc Steward / Test Volume Estimator を追加
- templates: evidence の階層化パスと命名規則を追加、traceability matrix に status 列を追加
- validate: traceability-matrix の status 列検証を追加

### Changed

- docs: README の ATDD 説明と sub-agent 必須化を更新
- instructions: agent-selection の委譲マップを新ロールに整合

## [1.2.13] - 2026-02-01

### Added

- prompts: inputs の優先順位（instructions/steering/delta）と rejected ガード、DONE 宣言の必須情報を全プロンプトに追加
- agents: 全ロールに Preflight / rejected ガード / DR-ID 参照を追記
- validate: delta.md の最小構造検証（Change Log / Decision Records / 順序 / rejected）を追加
- tests: delta validator の新規検証に対応するユニットテストを追加

### Changed

- templates: `.qfai/specs/README.md` の delta.md 契約を Change Log + Decision Records + RE-OPEN へ更新
- prompts: qfai-spec の delta.md 要件を新契約に整合し、qfai-discuss/qfai-require に意思決定ログ前提を追記
- docs: README のワークフロー説明に delta 参照/RE-OPEN の前提を追記

## [1.2.12] - 2026-01-31

### Added

- prompts: 完了契約に OQ/placeholder スキャンと成果物の全量チェックを追加（全プロンプト共通）

### Changed

- なし

## [1.2.11] - 2026-01-31

### Added

- agents: OptionExplorer / OptionReviewer ロールを追加（delta の案出し/レビュー）
- agents: UI/UX Reviewer ロールを追加（UI レイアウト健全性のレビュー）
- templates: specs/README の delta.md テンプレートを拡張（Decision Summary / Considered Options / Selection Criteria / Chosen・Rejected / Contract Trace）

### Changed

- prompts: qfai-spec に OptionExplorer / OptionReviewer の作業順と必須セクションを追記
- prompts: qfai-prototyping に Runtime Interaction Gate と UI レイアウトガードレールを追加
- prompts: qfai-tdd-green の Runtime Interaction Gate と UI レイアウト健全性チェックを強化
- instructions: agent-selection の委譲マップを v1.2.11 の新ロールに整合

## [1.2.10] - 2026-01-31

### Added

- prompts: qfai-require/qfai-spec に OQ ハーベストと問診ループを追加
- agents: OQHarvester / OQReviewer ロールを追加
- templates: require に open-questions 台帳を追加

### Changed

- prompts: Open=0 をデフォルト完了条件にし、Deferred にはユーザー承認の証跡を必須化
- prompts: qfai-spec の未定義潰しを require 相当のヒアリングとして内包

## [1.2.9] - 2026-01-31

### Added

- prompts: qfai-discuss に事前知識収集フェーズ（Researcher 委任）を追加
- agents: Researcher ロールカードを追加

### Changed

- prompts: qfai-discuss の質問設計を「全量ドラフト→1問ずつ（総数/番号表示、3択+おまかせ）」に更新
- prompts: qfai-discuss の Evidence に収集メモ/質問設計根拠の記録を追加
- docs: qfai-discuss の説明と委任ルールを更新

## [1.2.8] - 2026-01-30

### Changed

- templates: `.qfai/**/README.md` の構成説明をツリー表記に統一

## [1.2.7] - 2026-01-30

### Added

- prompts: `/qfai-prototyping` を追加（契約からの最小実行可能スケルトン実装フェーズ）
- prompts: 全プロンプトに FORMAT SSOT (Mandatory) セクションを追加（README-as-SSOT for formatting）
- templates: `.qfai/**/README.md` に正規テンプレートとサンプルを追加
- templates: `specs/README.md` に spec.md/delta.md/scenario.feature/case-catalogue.md/traceability-matrix.md の完全テンプレートを追加

### Changed

- prompts: 全プロンプトで `.qfai/**/README.md` をフォーマットの単一の情報源として参照するよう更新
- templates: `.qfai/README.md` に推奨ワークフローシーケンス（prototyping フェーズ含む）を追加
- docs: README に `/qfai-prototyping` を推奨シーケンスに追加

## [1.2.6] - 2026-01-28

### Added

- prompts: 全プロンプトに Completion Contract（CRITICAL CONSTRAINTS/Evidence/FINAL CHECKLIST）を水平展開
- prompts: Evidence を `.qfai/evidence/` に統一し、Git 管理外（.gitignore 同梱）を明記
- agents: 全ロールカードに Mission/Inputs/Deliverables/Stop/Sign-off を追加
- init: `.qfai/evidence/.gitignore` を同梱し、Evidence を自動で追跡対象外に
- tests: assets guardrails で Evidence .gitignore を検査

## [1.2.5] - 2026-01-28

### Added

- prompts: 全プロンプトに Completion Contract（CRITICAL CONSTRAINTS/Evidence 要求）を追加
- prompts: qfai-tdd-green に契約→実装スコープ表、ステージゲート、Runtime Smoke を追加
- prompts: qfai-tdd-green に evidence テンプレートを追加
- init: `.qfai/evidence` をテンプレート構成に追加
- tests: prompts の必須セクションを assets guardrails でスモーク検証

### Changed

- prompts: qfai-tdd-green をオーケストレーター主導の完了分離フローに強化

## [1.2.4] - 2026-01-28

### Added

- traceability: .feature の @SC-XXXX-XXXX をテスト証跡として収集
- traceability: layer-aware enforcement と deferred info を追加
- config: traceability.testFileGlobs に `features/**/*.feature` を追加
- prompts: qfai-atdd / qfai-tdd-\* に Coverage Ledger と完了条件を追加
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
