# 02 User Stories

## US Catalog

- US-0003-0001: ワークスペース初期化 - qfai init で .qfai/ 構造を生成
- US-0003-0002: 冪等な初期化 - 2回目以降はスキップ + 新規のみ追加
- US-0003-0003: 強制更新 - --force でスキル上書き（skills.local/ 保護）
- US-0003-0004: ドライラン - --dry-run で変更プレビュー
- US-0003-0005: symlink ベースのスキル統合 - 4つの skills/ ディレクトリに directory symlink を配置
- US-0003-0006: Agent symlink 統合 - .claude/agents/ と .github/agents/ にファイル symlink を配置
- US-0003-0007: レガシーファイル退避 - 非推奨ファイル検出・削除
- US-0003-0008: 旧ラッパー prune - commands/prompts 廃止と stale skill ディレクトリの prune
- US-0003-0009: Git symlink 設定 + Windows 対応 - git config 自動設定とクロスプラットフォーム対応
- US-0003-0010: copilot-instructions.md 生成 - Copilot 向けリポジトリ指示ファイル生成
- US-0003-0011: Copilot review instructions 配布 - .github/instructions/ に create-only で配布
- US-0003-0012: instructions の force 更新 - --force で instructions を shipped テンプレートへ更新
- US-0003-0013: instructions アクティベーション案内 - 作成時にガイダンスメッセージ表示
- US-0003-0015: `.gitignore` managed block (v1.7.18) - `qfai init` ignores the artifacts QFAI generates (report, evidence, review, discussion) and keeps the governance records among them tracked
- US-0003-0016: 4-layer asset-tree + work-log surface seeding (v1.9.0) - `qfai init` が `.qfai/assistant/{constitution,manifest,catalog,process}/` の 4 層およびプロジェクトルートに `.qfai/steering/` を seed
- US-0003-0017: --upgrade-assistant-tree migration helper (v1.9.0) - 旧 `.qfai/assistant/steering/` レイアウトを 4-layer へ一括移行する flag。ユーザー編集を保全
- US-0003-0019: assistantPaths.ts SSOT module (v1.9.0) - assistant-tree のパス文字列を単一の TypeScript module から供給し、hard-coded literal を排除
- US-0003-0020: legacy layout past its sunset (v1.9.0) - the one-minor window for the legacy `.qfai/assistant/steering/` layout closed at v1.10.0; `qfai init` keeps the legacy files and reports them as a `D-DEPRECATED-PATH` error
- US-0003-0021: 配布 workflow の hardening (CHG-007) - 既存の配布 validate workflow が least privilege / cancellation 付き concurrency / checkout credential hygiene / bounding を備え、header の Node floor 主張を止め、既存の lockfile 検出 cache 式を保持する
- US-0003-0022: 配布 action pin ポリシーと trailer 解決 (CHG-007) - 配布 workflow の action 参照を SHA pin しつつ、可読 version を step name 側に置くことで comment-blind な leakage guard の breadth を落とさずに再現性を得る
- US-0003-0023: layer 分離された credential-free 配布 workflow set (CHG-007) - `qfai-` prefix の複数ファイル構成で layer 別 lane を提供し、adopter が対応スクリプトを宣言するまで全 lane が inert のままである
- US-0003-0024: 配布 change detection と green-on-skip verdict (CHG-007) - third-party action なしの diff ベース lane 選択が、diff 失敗時に fail open し、空 matrix でも verdict が green になる
- US-0003-0025: 配布 runner label 間接化 (CHG-007) - 配布 workflow の runner 選択を repository variable 経由にし、default を public label に保ち、誤値時の失敗モードを header table で明示する
- US-0003-0026: 配布 Node / package manager portability (CHG-007) - adopter の Node version ファイルを優先しつつ不在時は fail open、package manager 解決不能時は fail closed とし、lockfile 検出 install branch を全配布ファイルに拡張する
- US-0003-0027: 配布 workflow 所有権コントラクト (CHG-007) - QFAI が adopter の workflows ディレクトリで何を所有するかを文書化・テストし、adopter 作成ファイルと `declined` ファイルを構造的に守る
- US-0003-0028: 配布 set の structural contract gate (CHG-007) - 宣言された期待形状に対して配布 set を assert する gate が、pull request が実際に走らせる経路から semantic drift を落とす
- US-0003-0029: Story-tree seeding - `qfai init` lays out the `.qfai/spec/` tree create-only, points the configured paths at it, and leaves a project still on the spec-pack layout to the migration skill
- US-0003-0030: Migration skill shipped and linked - `qfai init` installs and links `/qfai-migration-spec-to-story`, whose scripts reuse init's own writers
- US-0003-0031: Guards learn the story-tree ID shapes - the distributed-surface guards reject the new internal ID shapes outside their sample band

## US-0003-0016: 4-layer asset-tree + work-log surface seeding

- Parent: CAP-0003
- Goal: `qfai init` seeds a new project with the four assistant-tree layers (`constitution/`, `manifest/`, `catalog/`, `process/`) and the project-root `.qfai/steering/` AI work-log surface, so one command realises the layout the CHG-003 discussion pack agreed. With the `rule/ skill/ agent/ prompt/` assistant tree, init seeds `.qfai/assistant/rule/`, `skill/` (each skill with its own `references/`), `agent/` and `prompt/` in place of the four layers
- Non-goals: validate-side enforcement (spec-0004 が担当)、frontmatter schema 検証 (spec-0004 担当)、Reviewer-Gate drift findings (spec-0015 担当)
- Notes: REQ-0018 / REQ-0019 を実装する。`assistantPaths.ts` (REQ-0022) を経由してパス文字列を解決すること

## US-0003-0017: --upgrade-assistant-tree migration helper

- Parent: CAP-0003
- Goal: a project on the legacy `.qfai/assistant/steering/` layout moves to the four-layer layout with one command, `qfai init --upgrade-assistant-tree`. A file carrying user edits is preserved, with a `W-USER-EDIT-PRESERVED` informational note. With the `rule/ skill/ agent/ prompt/` assistant tree, the same command copies each file the relocation table names to its destination in that tree instead
- Non-goals: rollback コマンドの提供、frontmatter schema validation
- Notes: REQ-0020 を実装する。migration は idempotent（既に upgrade 済みの project に対しては no-op で W-USER-EDIT-PRESERVED のみを出す）

## US-0003-0019: assistantPaths.ts SSOT module

- Parent: CAP-0003
- Goal: init / validate / skill body が読む assistant-tree のパス文字列を `packages/qfai/src/core/paths/assistantPaths.ts` の 1 module に集約し、hard-coded string literal を package 全体から排除する。NFR-0001 (consistency) の構造的保証
- Non-goals: 既存の `qfai.config.yaml#paths.*` フィールドの再設計
- Notes: REQ-0022 を実装する。lint rule が assistantPaths import を強制する

## US-0003-0020: legacy layout past its sunset

- Parent: CAP-0003
- Goal: the legacy `.qfai/assistant/steering/` layout stayed readable for exactly one minor release window (v1.9.x), and that window closed at v1.10.0. A project still carrying the legacy layout keeps its files: `qfai init` without a flag deletes nothing, and reports the layout as a `D-DEPRECATED-PATH` error on stderr that names the sunset release (v1.10.0) and the command that migrates it, `qfai init --upgrade-assistant-tree`
- Non-goals: write path で旧 layout に書き出すこと
- Notes: REQ-0023 を実装する。NFR-0002 (predictable migration window)

## US-0003-0001: ワークスペース初期化

- Parent: CAP-0003
- Goal: `npx qfai init` creates `.qfai/assistant/` and the configuration file `qfai.config.yaml` at the project root. It scaffolds none of the artifact directories: `specs/`, `contracts/`, `discussion/`, `evidence/`, `review/` and `report/` do not exist under `.qfai/` after init. Where init lays out the story tree it also creates `.qfai/spec/`, and those six directories still do not exist
- Non-goals: validate/report/doctor 等の他コマンド機能
- Notes: 空ディレクトリおよび既存プロジェクトの両方で動作すること

## US-0003-0002: 冪等な初期化

- Parent: CAP-0003
- Goal: 2回目以降の `qfai init` 実行時に、既存ファイルをスキップし、新規ファイルのみ追加する
- Non-goals: 既存ファイルの自動マージ・更新
- Notes: NFR-0012（冪等性）を満たすこと

## US-0003-0003: 強制更新

- Parent: CAP-0003
- Goal: `qfai init --force` overwrites the skill files under `skills/` with the shipped release and leaves `skills.local/` untouched. With the `rule/ skill/ agent/ prompt/` assistant tree, the two directories are `skill/` and `skill.local/`
- Non-goals: overwriting `skills.local/` (`skill.local/` with the `rule/ skill/ agent/ prompt/` assistant tree)
- Notes: 上書き対象と保護対象を明確にログ出力する

## US-0003-0004: ドライラン

- Parent: CAP-0003
- Goal: `qfai init --dry-run` で実行予定の変更内容をプレビュー表示し、実ファイル操作を行わない
- Non-goals: ドライランでのファイル書き込み

## US-0003-0005: symlink ベースのスキル統合

- Parent: CAP-0003
- Goal: `qfai init` creates directory symlinks in `.claude/skills/`, `.agents/skills/`, `.codex/skills/` and `.github/skills/` pointing at `.qfai/assistant/skills/qfai-*`. With the `rule/ skill/ agent/ prompt/` assistant tree they point at `.qfai/assistant/skill/qfai-*`
- Non-goals: QFAI 管理外のスキルの symlink 化
- Notes: symlink ターゲットは相対パスで指定し、リポジトリの絶対パスに依存しない

## US-0003-0006: Agent symlink 統合

- Parent: CAP-0003
- Goal: `qfai init` places `.claude/agents/<name>.md` and `.github/agents/<name>.agent.md` as file symlinks to `.qfai/assistant/agents/<name>.md`, or to `.qfai/assistant/agent/<name>.md` with the `rule/ skill/ agent/ prompt/` assistant tree. No `README.md` is written into `.agents/`, `.codex/`, `.claude/agents/` or `.github/agents/`
- Non-goals: agent 定義の自動変換

## US-0003-0007: レガシーファイル退避

- Parent: CAP-0003
- Goal: 非推奨ファイル（10_workflow.md 等）を検出し、`--force` 時に削除する
- Non-goals: レガシーファイルの自動変換

## US-0003-0008: 旧ラッパー prune

- Parent: CAP-0003
- Goal: `--force` 時に `.claude/commands/qfai-*.md`、`.github/prompts/qfai-*.prompt.md`、旧 skill ディレクトリ（symlink ではない qfai-\* ディレクトリ）を prune する
- Non-goals: 非 QFAI 管理のファイル削除

## US-0003-0009: Git symlink 設定 + Windows 対応

- Parent: CAP-0003
- Goal: `qfai init` 実行時に `git config core.symlinks true` を自動設定し、Windows では EPERM 時に Developer Mode 有効化の案内を表示する
- Non-goals: Windows Developer Mode の自動有効化

## US-0003-0010: copilot-instructions.md 生成

- Parent: CAP-0003
- Goal: `.github/copilot-instructions.md` を生成し、QFAI のリポジトリ指示を配置する
- Non-goals: copilot-instructions.md の全面書き換え

## US-0003-0011: Copilot review instructions 配布

- Parent: CAP-0003
- Goal: `qfai init` 時に `.github/instructions/code-review.instructions.md` と `.github/instructions/principles.instructions.md` を create-only で配布する
- Non-goals: 言語固有のルール追加（SDD skill の責務）

## US-0003-0012: instructions の force 更新

- Parent: CAP-0003
- Goal: `--force` を付けた場合、instructions ファイルを shipped テンプレートで再生成する
- Non-goals: `--force` なしでの自動更新

## US-0003-0013: instructions アクティベーション案内

- Parent: CAP-0003
- Goal: instructions ファイルが新規作成された場合にアクティベーションガイダンスを stdout に表示する
- Non-goals: 自動アクティベーション

## US-0003-0015: `.gitignore` 管理ブロック自動追記

- Parent: CAP-0003
- Goal: `qfai init` appends the QFAI managed block to the adopting project's root `.gitignore`: the marker line, ignore lines that include `.qfai/report/*`, `.qfai/evidence/*`, `.qfai/discussion/*` and `.qfai/review/*`, and then the governance negations that keep decision and evidence records tracked. The block carries no README negation and no `.qfai/discussion/discussion-*/`. A re-run strips every line an earlier release wrote and this one retired, the `review-*/` negations among them. With the `rule/ skill/ agent/ prompt/` assistant tree, decision records are kept tracked under the singular `.qfai/evidence/decision/`, and the plural negations become lines a re-run strips
- Non-goals: ユーザー独自の gitignore エントリの変更/削除、review-pack を追跡したい場合のプロジェクト固有 negation 追加（プロジェクト側で明示追加する）
- Notes: NFR-0012（冪等性）を満たす。`review-*/` directories are ignored by default; a project that wants to track one adds its own negation

## US-0003-0021: 配布 workflow の hardening

- Parent: CAP-0003
- Goal: `qfai init` が配布する `.github/workflows/qfai-validate.yml` が、job-reachable な least-privilege `permissions:` ブロック、cancellation 付きの ref-scoped `concurrency:` group、`persist-credentials: false`、job 単位の `timeout-minutes` と artifact hygiene を備え、header comment が package が `engines` で宣言していない Node floor を主張しなくなる。既存の lockfile 検出 `cache:` 式は置換されずに保持される
- Non-goals: QFAI 自身の `.github/workflows/**` の hardening（spec-0017 / CAP-0017 が所有）、リポジトリ自身が持つ配布 workflow 複製の廃止（spec-0017）
- Notes: REQ-0024 を実装する。上流 pack REQ-0014。cascade: `spec-0012/09_delta.md` が記録する配布 workflow の現行形状記述は本変更で stale になる（companion row は spec-0012 側 09_delta）

## US-0003-0022: 配布 action pin ポリシーと trailer 解決

- Parent: CAP-0003
- Goal: 配布 workflow の全 action 参照が 40-hex commit SHA に pin され、可読な version が step `name:` 側に leading `v` なしで記載されることで、pin の可読性と comment-blind な leakage guard の breadth が同時に成立する。third-party 参照は package-manager availability の最小限 1 件に closed sanctioned set として限定される
- Non-goals: leakage guard の pattern narrowing、pragma の新設、guard への allow-list entry 追加、QFAI 自身のツリーの pin（そちらは配布サーフェス外なので慣例的 trailer が合法 — spec-0017 が所有）
- Notes: REQ-0025 を実装する。上流 pack REQ-0015 / OQ-0003。`\bv[0-9]+\.[0-9]+(\.[0-9]+)?\b` は comment 行でも一致するため、慣例的な `# v<X.Y.Z>` trailer は配布ツリーで必ずビルドを落とす。leading `v` を落とした綴りは一致しないことが probe で確認済み。co-change 義務として `packages/qfai/tests/assets/assets.test.ts` の floating major 参照 assertion を同一変更で更新する

## US-0003-0023: layer 分離された credential-free 配布 workflow set

- Parent: CAP-0003
- Goal: `qfai init` が `qfai-` prefix の複数 workflow ファイルを配布し、layer 別 lane は orchestrator ファイル内の job として表現され、adopter が対応する layer 名スクリプトを宣言するまで各 lane が false 条件で skip される。set 全体で secret を宣言も参照もしない
- Non-goals: composite-action テンプレートの配布（配布 `.github/` の allow-list が `workflows` のみを許すため構造的に不可能）、secret を消費する配布テンプレート、ephemeral environment / browser backend を前提とする lane
- Notes: REQ-0026 を実装する。上流 pack REQ-0016 / OQ-0001, OQ-0002, OQ-0012。配布ファイルが他の配布ファイルを参照しないことが、部分 install を「単に不完全」に留める条件（参照先不在は参照側を parse error にし、create-only install に修復経路がない）。Independent checks inside one shipped file run as matrix legs, and each file keeps its existing external check name on a job that succeeds only when every leg result succeeds

## US-0003-0024: 配布 change detection と green-on-skip verdict

- Parent: CAP-0003
- Goal: 配布 orchestrator の detection job が third-party action を使わない name-only diff + JSON filtering で走る lane を決め、diff 失敗・shallow clone・認識外パスでは warning annotation を出して full superset に fail open し、同一ファイル内の verdict job が空 matrix でも exit 0 する
- Non-goals: 配布側で third-party change-detection action を使うこと（pin と trailer 問題を adopter 全員に押し付ける）、path filter だけで required check を満たそうとすること
- Notes: REQ-0027 を実装する。上流 pack REQ-0017 / OQ-0011。QFAI 自身の CI 側は third-party action を使う別実装（spec-0017）であり、surface による意図的な二重実装

## US-0003-0025: 配布 runner label 間接化

- Parent: CAP-0003
- Goal: 配布 set の全 runner selector が repository variable を読み、その default が public GitHub-hosted label であり、各配布ファイルの header table が variable 名 / default / 誤値時に GitHub が fail fast せず無期限 queue する失敗モードを明示する
- Non-goals: organization-private label の配布、`qfai.config.yaml` への CI キー追加、runner tier の二段階化（2 つ目の job class が実在してから）
- Notes: REQ-0028 を実装する。上流 pack REQ-0018 / OQ-0008。誤値が fail fast しないため、knob より default の方がリスクを負う

## US-0003-0026: 配布 Node / package manager portability

- Parent: CAP-0003
- Goal: 配布 workflow が adopter 自身の Node version ファイルを優先し、不在時は warning 付きで documented literal に fail open する。package manager が解決できない場合は修正方法を名指しする actionable annotation で fail closed する。既存の lockfile 検出 install branch（4 package manager + no-lockfile）は保持され新規配布ファイルにも拡張される
- Non-goals: 単一 package manager / 単一言語の前提、無条件のファイル由来 Node version 指定、leakage guard 対応を理由にした綴り変更（bare major literal は元々 guard に一致しない）
- Notes: REQ-0029 を実装する。上流 pack REQ-0019 / NFR-C0013。同じ setup-install 列の 2 つの前提条件が逆方向に degrade する点が load-bearing であり、どちらの節も他方を支配しない

## US-0003-0027: 配布 workflow 所有権コントラクト

- Parent: CAP-0003
- Goal: QFAI が adopter の workflows ディレクトリ配下で「自身が配布する `qfai-` prefix ファイルのみ」を所有することを、文書化かつテストされたコントラクトとして宣言する。write set は配布名リスト、prune set は過去配布名リストに由来し、provenance を overwrite / prune の前に参照することで adopter 作成ファイルと `declined` ファイルが構造的に守られる
- Non-goals: unconditional-overwrite refresh コマンドの動詞（上流 pack OQ-0021 で deferred、OQ-0003-0003 として mirror）、導入済みファイルの drift 検出（spec-0006 = `qfai doctor` が所有）、prefix glob による所有判定
- Notes: REQ-0030 を実装する。上流 pack REQ-0020 の shipped 半分 / OQ-0004, OQ-0020。`packages/qfai/src/cli/commands/init.ts` はルート asset を `force: false` かつ `conflictPolicy: "skip"` でハードコードして copy するため、`qfai init --force` は既に導入済みの workflow を決して更新しない。本 US は所有権の定義のみを与える

## US-0003-0028: 配布 set の structural contract gate

- Parent: CAP-0003
- Goal: テストスイート内に保持された 1 つの宣言された期待形状に対して配布 set を assert する gate が、lint aggregate または test matrix から実行され、profile 値や failure threshold といった load-bearing な semantic 値の drift で exit 1 する
- Non-goals: リポジトリ自身の複製との byte-identity 比較（比較対象は spec-0017 の上流 pack REQ-0025 で削除されるため operand が存在しない）、release 専用 gate aggregate への配置、numeric drift scoring
- Notes: REQ-0031 を実装する。上流 pack REQ-0021 / OQ-0016。ordering: spec-0017 の上流 pack REQ-0025 と同一変更またはそれ以前に着地させる。既存 asset test の ad-hoc string assertion を subsume する際、その test-case annotation は保持または再登録する。The declared shape also pins each aggregate lane's always-run condition and the exact `needs` list it names

## US-0003-0029: Story-tree seeding

- Parent: CAP-0003
- Goal: on a project that carries no spec-pack layout, `qfai init` lays out the story tree. It writes the `.qfai/spec/` singleton files and contract directories create-only, with no business-flow or user-story instance, and points `paths.specsDir` and `paths.contractsDir` at them. On a project still on the spec-pack layout it writes nothing under `.qfai/spec/` and names the migration skill instead
- Non-goals: writing a business-flow or user-story instance; migrating a spec-pack layout (the migration skill's work, owned by spec-0018)
- Notes: implements discussion-20260923063306456#REQ-0001, REQ-0002, REQ-0005 and REQ-0022. The contract is `.qfai/contracts/cli/qfai-init.md` § Story-tree layout

## US-0003-0030: Migration skill shipped and linked

- Parent: CAP-0003
- Goal: `qfai init` installs `/qfai-migration-spec-to-story` and links it into the host skill directories like every shipped skill, on a fresh project and on one still on the spec-pack layout. The migration's scripts reuse init's integration-directory and managed-block writers rather than copies of them
- Non-goals: the migration's steps, invocation and report (`.qfai/contracts/cli/qfai-migration-spec-to-story.md`, owned by spec-0018); a `qfai` subcommand for the migration
- Notes: implements discussion-20260923063306456#REQ-0019

## US-0003-0031: Distributed-surface guards learn the story-tree ID shapes

- Parent: CAP-0003
- Goal: the pre-build lint, the post-build guard and the smoke test reject the story-tree internal ID shapes in the shipped surface, so no such ID reaches an adopter through a template or a skill. An ID numbered in the sample band may appear, as `spec-0001` to `spec-0009` may today
- Non-goals: narrowing an existing pattern; a pragma or an allow-list entry in a guard
- Notes: implements discussion-20260923063306456#REQ-0024 and NFR-0004. The patterns land before any shipped template carries one of the shapes
