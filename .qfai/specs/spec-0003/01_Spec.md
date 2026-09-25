# 01 Spec

- Spec: spec-0003
- Parent: CAP-0003
- Status: active
- Consolidates: old spec-0001 (init), spec-0017 (Copilot Review Instructions), spec-0018 (Codex Sub-Agent TOML)

## Consumer View

- Primary SSOT for execution: `spec-0003/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In: init コマンドの全機能（ディレクトリ生成、設定ファイル生成、symlink ベースのスキル/エージェント統合、旧ラッパー prune、git config 設定、copilot-instructions.md 生成、Copilot review instructions 配布、Codex サブエージェント TOML 統合、--force、--dry-run、レガシー退避、contracts/design/ ディレクトリ（v1.7.13 追加: design contracts 用）、ルート `.gitignore` の QFAI 管理ブロック追記と旧バージョンで追記されたレガシー行の自動移行（v1.7.18 追加））
- In (CHG-007 追加): 配布される GitHub Actions workflow テンプレート集 — `packages/qfai/assets/init/root/.github/workflows/**` の内容（hardening、action pin ポリシー、layer 分離、change detection、runner label 間接化、Node / package manager portability）と、`qfai init` が adopter の workflows ディレクトリに対して持つ所有権コントラクト（`qfai-` filename prefix、write set / prune set、provenance、`declined` 状態）、および配布 set に対する structural contract gate
- Out: validate/report/doctor/guardrails
- Out (CHG-007 境界): QFAI 自身の `.github/workflows/**`、ルート `scripts/**`、`packages/qfai/scripts/**`、`vitest.workspace.ts` は `toolchain` slice category（spec-0017 / CAP-0017）が所有する。境界は **配布されるか否か** であり、`package.json#files` に含まれないものは本 spec の対象外（\_policies/10_delta.md CHG-007 DR-0276）
- Out (CHG-007 境界): 導入済み配布 workflow の drift 検出（stale ファイルを名指しする advisory finding）は `qfai doctor` 側 = spec-0006 が所有する。本 spec は検出結果が依拠する所有権コントラクトの定義のみを持つ
- Out (CHG-007 境界): composite-action テンプレートの配布。`scripts/verify-pack.mjs` の `allowedRootGithubEntries` は配布 `.github/` の直下に `workflows` のみを許可し、`actions/` ディレクトリは hard pack failure になるため構造的に不可能
- In (2026-09-24 intent-driven entry): the workflow entry that `qfai init` installs and upgrades — `qfai-run` and `qfai-maintain` with their host wrappers, each stage skill's `references/orchestrated-mode.md`, the built-in plans, the entry directive in `AGENTS.md` and `CLAUDE.md`, the mode line, the plans' provenance, the upgrade record and the upgrade conflict report (CLI-INIT `## Workflow entry`). Also the two managed ignore lines for run state and run evidence.
- Out (2026-09-24 intent-driven entry): the workflow core, `start`'s enforcement of the correspondence check, the plan contents, the shipped schemas, and the config issue `qfai validate` reports for an invalid `workflow.mode` — `spec-0018`.
- Out (2026-09-24 intent-driven entry): the routing and review manifest entries for `qfai-run` and `qfai-maintain`, and the record of the user's answer on what a plain upgrade does to them — `spec-0015`.
- Out (2026-09-24 intent-driven entry): the rule that no stage skill carries `disable-model-invocation` — `spec-0001`.
- Out (2026-09-24 intent-driven entry): the `windows-latest` CI job that runs the init and migration suites — `spec-0017`.

## Applicable NFR

- NFR-0012: 冪等性 - 同一入力に対して同一出力を保証
- NFR-0040: エラーメッセージ品質 - 各 Issue に code, message, suggested_action
- NFR-0042: CLI ヘルプ - 各コマンドに `--help` で使用方法表示
- NFR-S0001: ラッパー同期コスト排除 - skill 更新時にラッパー更新が不要
- NFR-S0002: クロスプラットフォーム互換性 - macOS, Linux, Windows (Developer Mode) で動作
- NFR-S0003: Git symlink 追跡の正確性 - `git ls-files -s` で mode `120000` として追跡
- NFR-S0004: エラーメッセージの明確性 - Windows fallback 時にユーザーが対処法を理解可能
- NFR-S0005: 後方互換性 - 旧ラッパー形式のプロジェクトが `--force` で移行可能
- NFR-S0006: init 実行時間 - symlink 生成は既存 writeFile と同等以下の速度
- NFR-C0003 (CHG-007 NFR-0003): credential-free layers structurally cannot require a secret - 配布 workflow に secret 宣言 / secret context 参照 / secret 式 / secret 継承がゼロ
- NFR-C0005 (CHG-007 NFR-0005): distributed-surface defence keeps its breadth - leakage guard は配布ツリーに対して exit 0、planted version marker / planted internal spec id で exit 1。pattern set の変更（narrowing でも additive でも）は 3 code site + 規約文書を 1 PR で動かし、同じ diff にテンプレート編集を含めない
- NFR-C0006 (CHG-007 NFR-0006): new assets are lint-clean - 配布 asset ツリーは Markdown-lint 対象外なので、formatter と shipping lint が実効ゲートになる。コピー元 YAML は boolean の引用符表記が混在するため「verbatim コピー」は成立しない
- NFR-C0007 (CHG-007 NFR-0007): every job is bounded and least-privileged - 配布 set の全 job が timeout と job-reachable permission block を持つ（100%、reachability ルール = workflow レベル block も可）
- NFR-C0008 (CHG-007 NFR-0008): install and any refresh are idempotent - 同一 temp dir に 2 回 init して byte-identical、2 回目は skipped 報告。refresh が出荷された場合も 2 回目は no-op
- NFR-C0009 (CHG-007 NFR-0009): existing adopters are not broken by a template change - 旧テンプレートのまま再 init していない adopter ツリーが新パッケージで validate を通過する。テンプレート変更は adopter の作業を要求しない
- NFR-C0011 (CHG-007 NFR-0011): shipped workflows are self-explanatory - 各配布 workflow が header block で repository variable と default、担当 layer、inert 化の条件、fail-open 挙動を明記する
- NFR-C0012 (CHG-007 NFR-0012): shipped supply-chain surface stays at the package-manager minimum - 配布 set の third-party action 参照は closed sanctioned set（現在 1 件）に限定し allow-list として assert する。sanctioned entry は SHA pin、他は first-party
- NFR-C0013 (CHG-007 NFR-0013): shipped steps degrade in the direction their input permits - degraded run が「確立していない結果を green と主張する」なら fail closed、そうでなければ warning annotation 付きで conservative superset を続行する（substitution test）
- NFR-C0014 (CHG-007 NFR-0014): gate placement is effective, not nominal - 本 spec が導入する gate は pull request で実行される。release 専用 aggregate には置かない
- NFR-C0016 (CHG-007 NFR-0016): adopter cost does not rise on install - an adopter that declares no optional test script executes zero test lanes. Three shipped jobs declare a dependency install: the document-check job, the test lane and the validation job. Every other job installs nothing: change detection, the document scope and each file's aggregate. All three installing jobs carry a matrix, so the count is of job instances per event at each matrix's bound: a pull request runs nine (two document checks, five test legs, two validation profiles) and a push runs eight (two document checks, five test legs, one validation profile). The five test legs are the bound of the layer-named scripts the detection probe looks for. A leg runs only for a script the adopter declared, so an adopter declaring none starts none of them. That repeated setup is the scheduling cost the parallel legs buy, in exchange for checks that run independently of each other
- `discussion-20260923171450572#NFR-0011`: init and upgrade behave the same on Windows as on Linux, CRLF checkouts and paths with spaces included. Held by BR-0003-0058 and its test cases, which the `windows-latest` job of `spec-0017` runs.

## Applicable Policy

- Policy: \_policies/01_Objective.md, \_policies/07_Constraints.md

## Applicable Contracts

Contract short IDs resolve through `_policies/05_Contracts.md#Contract Index`.

- CLI-INIT — `.qfai/contracts/cli/qfai-init.md`。CHG-007 で `## Shipped GitHub Actions workflows` セクションが追加され、create-only の `force: false` literal が所有権コントラクトの load-bearing 要素であること、`declined` name を copy **実行前**に copy set から除外すること、removal は `pruneMatchingEntries` + retired-name membership predicate のみであること（`startsWith("qfai-")` 禁止）、drift 報告は init の責務ではないことを固定する
- CLI-WLOG — `.qfai/contracts/cli/worklog-entry.schema.md`。`.qfai/steering/*.md` の frontmatter / body schema（CHG-003）
- CLI-WFSET — `.qfai/contracts/cli/shipped-workflows.md`。**CHG-007 で新設。REQ-0024..0031 の権威ソース。** 配布 `.github/workflows/**` に対する所有権境界と、gate が diff する宣言形状の dimension 集合を固定する。本 spec の BR / AC は CLI-WFSET を **cite** し、その内容を再記載しない — REQ-0031 の宣言形状の**値**は test suite 側の 1 箇所が SSOT であり、spec も contract も第二のコピーを持たない
  - §1 reserved filename prefix（prefix は reservation notice であり selector ではない）
  - §2 provenance record `.qfai/install-provenance.json`（tracked、`schemaVersion` なし）
  - §3 closed 5-state enum `absent` / `adopter-owned` / `installed` / `modified` / `declined`
  - §4 write-path obligations（create-only、`declined` の copy 前除外、並行 filesystem 実装の禁止、idempotence）
  - §5 the ten dimensions the declared shape must pin, and the gate placement (`pnpm ci:lint`, never `pnpm ci:gate`)
  - §6 配布ツリー固有の hygiene 規則と pin trailer 解決
  - §7 detection surface は `qfai doctor`（spec-0006 / CLI-DOC）が所有し、state vocabulary は §3 の enum をそのまま使う
- CLI-INIT `## Workflow entry` (2026-09-24) — what init installs for `npx qfai workflow`: the install set, the ignore entries, the mode line, the plans' provenance and the upgrade record, the upgrade conflicts and the entry directive. New rules name the section they realize in `04_Business-Rules.md` § `Contract Realization`.
- CLI-WF — `.qfai/contracts/cli/qfai-workflow.md`. Only triggers (b) and (c) of `## Fail-closed`, which init runs after the copy, and `## Modes`, which gives the mode an absent key means.
- CLI-WFFILE — `.qfai/contracts/cli/workflow-files.schema.md`. Only the plan files and the Operations table init installs.

## Evidence Summary

- Evidence: init コマンド実行結果のディレクトリ構造スナップショット

## Relevant Requirements

- REQ-0001: プロジェクト初期化 - `qfai init` で `.qfai/` ディレクトリ構造、設定ファイル、ラッパーを生成する
- REQ-0002: 初期化の冪等性 - 2回目以降の `qfai init` は既存ファイルをスキップし、新規ファイルのみ追加する
- REQ-0003: 強制更新 - `qfai init --force` でスキルファイルを最新版に上書き更新する（skills.local/ は保護）
- REQ-0004: ドライラン - `qfai init --dry-run` で変更内容をプレビューし、実際のファイル操作を行わない
- REQ-0005: マルチツール symlink 統合 - Claude Code, GitHub Copilot, Codex, Anthropic Agents 用の symlink を生成する
- REQ-0006: レガシーファイル退避 - 非推奨ファイル（10_workflow.md 等）の検出・削除を行う
- REQ-0007: commands/prompts ディレクトリ廃止 - `--force` 時に旧 `.claude/commands/qfai-*.md` および `.github/prompts/qfai-*.prompt.md` を prune する
- REQ-0008: Skill ディレクトリ symlink 生成 - `.claude/skills/`, `.agents/skills/`, `.codex/skills/`, `.github/skills/` に directory symlink を作成
- REQ-0009: Agent ファイル symlink 生成 - `.claude/agents/<name>.md` および `.github/agents/<name>.agent.md` をファイル symlink として作成
- REQ-0010: git config core.symlinks 自動設定 - Git リポジトリ内の場合に自動設定
- REQ-0011: copilot-instructions.md 生成 - `.github/copilot-instructions.md` を生成する
- REQ-0012: Copilot review instructions 配布 - `.github/instructions/code-review.instructions.md` と `principles.instructions.md` を create-only で配置する
- REQ-0013: instructions の --force 更新 - `--force` 時は shipped テンプレートで instructions ファイルを再生成する（`--force` なしは create-only）
- REQ-0014: instructions アクティベーション案内 - instructions 新規作成時にアクティベーションガイダンスを表示する
- REQ-0015: Windows symlink fallback - EPERM 時に Developer Mode 有効化の案内を含むエラーメッセージを表示する
- REQ-0016: root `.gitignore` managed block (v1.7.18) - `qfai init` appends the QFAI managed block to the adopting project's root `.gitignore`, idempotently, and leaves the project's own lines alone. The block is the marker line, then the ignore lines, which include `.qfai/report/*`, `.qfai/evidence/*`, `.qfai/discussion/*` and `.qfai/review/*`, then the governance negations. It carries no README negation and no `.qfai/discussion/discussion-*/`: both are retired lines, and migration strips them
- REQ-0017: レガシー管理ブロック移行 (v1.7.18) - 旧バージョンで追記されたレガシー行（`!.qfai/review/review-*/`, `!.qfai/review/review-*/**`）を再実行時に自動除去し、新ブロックで置換する
- REQ-0018: 4-layer asset-tree seeding (v1.9.0) - `qfai init` は `.qfai/assistant/{constitution,manifest,catalog,process}/` の 4 層を seed する（旧 `steering/` 単層から再構成）。layer 名以外は reject される
- REQ-0019: project-root `.qfai/steering/` seeding (v1.9.0) - `qfai init` seeds `.qfai/steering/` at the project root with `.gitkeep` and `_templates/entry.md`, and writes no `README.md`: the surface's contract is `.qfai/assistant/catalog/worklog-entry.schema.md`. Re-init preserves user edits
- REQ-0020: `qfai init --upgrade-assistant-tree` one-shot migration (v1.9.0) - 旧 `.qfai/assistant/steering/` レイアウトから 4-layer へ一括移行する flag。ユーザー編集は `W-USER-EDIT-PRESERVED` informational note 付きで保全
- REQ-0021: migration memo authoring (v1.9.0) - `qfai init --upgrade-assistant-tree` 実行時、`.qfai/assistant/process/migrations/v<X.Y.Z>-assistant-layer-recut.md` を生成。commit 後は immutable (OC-53 準拠)
- REQ-0022: `assistantPaths.ts` SSOT module (v1.9.0) - 配布される assistant-tree のパス文字列は `packages/qfai/src/core/paths/assistantPaths.ts` が唯一の producer。hard-coded literal は lint で reject (NFR-0001 系)
- REQ-0023: legacy layout window (v1.9.0) - the window for the legacy `.qfai/assistant/steering/` layout was exactly one minor release (NFR-0002), and it closed at v1.10.0. `D-DEPRECATED-PATH` names that release. `qfai init` without a flag keeps the legacy files and reports the finding as an error on stderr; `qfai init --upgrade-assistant-tree` still reads them to migrate
- REQ-0024 (CHG-007、上流 pack REQ-0014): 配布 workflow の hardening - 既存の配布 workflow が least-privilege `permissions:`、cancellation 付き `concurrency:` group、`persist-credentials: false`、timeout / artifact hygiene を持つ。header comment は package が `engines` で宣言していない Node floor を主張しない。既存の lockfile 検出 `cache:` 式（上流参照実装の単一 package manager 形式より優れている）は置換せず保持する
- REQ-0025 (CHG-007、上流 pack REQ-0015): 配布 action pin ポリシーと trailer 解決 - 配布 workflow の全 action 参照を 40-hex commit SHA に pin する。third-party 参照は package-manager availability の最小限（現在 1 件 = pnpm setup action）に closed sanctioned set として限定し、allow-list として assert する（count-of-zero では assert しない）。可読 version は step `name:` に leading `v` **なし** で記載し、comment trailer には置かない。`packages/qfai/scripts/check-no-internal-version-leakage.sh` は comment-blind で `\bv[0-9]+\.[0-9]+(\.[0-9]+)?\b` を配布ツリー全体に再帰 grep するため、慣例的な `# v<X.Y.Z>` trailer はビルドを落とす。guard の narrowing / pragma / allow-list による回避は採らない。enforcement は pre-build で行い、規則は配布 YAML の comment 行を意図的に検査する（`lint-shipping.ts` は comment 行を先に skip するため、その skip を継承した規則は own-line trailer を永久に見ない）。co-change 義務: `packages/qfai/tests/assets/assets.test.ts` は現在 checkout / setup-node の floating major 参照を assert しているため、同一変更で更新する
- REQ-0026 (CHG-007、上流 pack REQ-0016): layer 分離された credential-free 配布 workflow set - 配布 workflows ディレクトリ配下に `qfai-` prefix の追加ファイル群を置く。lane scope は adopter が宣言し得る layer 名テストスクリプト（unit / component / integration / api / e2e）に紐づけ、対応スクリプトが存在しない限り false 条件で skip される（inertness の全内容）。secret を宣言も参照もしない。composite action を使わず、adopter のリポジトリが宣言していないルートスクリプト経由ではなくコマンドを直接呼ぶ。topology は「配布 set は複数ファイル / 各ファイルは独立に valid / layer 分離は orchestrator ファイル**内の job**」で固定し、配布ファイルが他の配布ファイルを参照することを禁じる（不在ターゲットは参照側を parse error にし、create-only install に修復経路がないため）
- REQ-0027 (CHG-007, upstream pack REQ-0017): shipped change detection (fail-open + green-on-skip) - the detection job takes a name-only diff against the base commit and filters it as JSON, with no third-party action. Full history is requested only by the jobs that take a name-only diff — the orchestrator's detection job and the document scope job — and by the validation job on a pull request, where the drift profile compares the branch against its base. When the diff fails, the job emits an explicit warning annotation and falls back to the full superset. The safety valves are a QFAI-specific documentation-only exclusion list and running everything for an unrecognised path. The job is paired, in the same file, with a verdict job that has an empty permission map and an always-run condition, and that exits 0 on an empty matrix. A fan-out without that pairing is a rejected shape
- REQ-0028 (CHG-007, upstream pack REQ-0018): shipped runner-label indirection with a public default - every runner selector in the shipped set reads a repository variable and defaults to a public GitHub-hosted label. No organization-private label ships. The set reads two variables, one per runner class: a job that installs nothing and runs no test (change detection, the document scope and each aggregate) reads `QFAI_CI_LIGHT_RUNNER` first and falls back to `QFAI_CI_RUNNER`; every other job reads `QFAI_CI_RUNNER`. Each shipped file's header table names the variables, their defaults and the failure mode of a wrong value: GitHub does not fail fast, it queues the job indefinitely
- REQ-0029 (CHG-007、上流 pack REQ-0019): 配布 Node version と package manager の portability - 配布 workflow は adopter 自身の Node version ファイルが存在すればそれを優先し、無い場合は documented literal に fallback する（無条件のファイル由来指定は version ファイルを持たない adopter 全員で Node setup を fail closed させるため NFR-C0013 が禁じる）。単一 package manager / 単一言語を前提にしない: 既存の lockfile 検出 install branch（4 package manager + no-lockfile）を保持し新規ファイルにも拡張する。sanctioned な package-manager action を維持し、その action も corepack も adopter の manifest field なしには version を解決できないため、`packageManager` field を header table に前提条件として明記する。同一 setup-install 列の 2 つの前提条件は**逆方向**に degrade する: Node version ファイル不在は documented literal に degrade して fail **open**（superset の作業）、package-manager field 不在は何もインストールされないため fail **closed**（substituted input）
- REQ-0030 (CHG-007、上流 pack REQ-0020 の shipped 半分): 配布 workflow 所有権コントラクト - QFAI は adopter の workflows ディレクトリ配下で `qfai-` prefix の**自身が配布する**ファイルのみを所有すると、文書化かつテストされたコントラクト（CLI-WFSET）として宣言する。
  - prefix は **reservation notice であり selector ではない**: write set は in-binary `SHIPPED_WORKFLOW_NAMES`、prune set は in-binary `RETIRED_WORKFLOW_NAMES` に由来し、adopter のディスク上の `qfai-*` glob には決して由来しない。
  - 名指しの hazard: `init.ts#pruneStaleQfaiWrappers` は 3 箇所の call site で `entry.name.startsWith("qfai-")` を使っているが、この predicate を workflows ディレクトリの `pruneMatchingEntries` に渡すことは CLI-WFSET §1 が明示的に禁止する。
  - provenance は `.qfai/install-provenance.json`（adopter ツリー、tracked、`schemaVersion` なし）に QFAI が書いた bytes の sha256 を記録し、overwrite / prune の前に必ず参照する。reader は不在・キー不在・不正 JSON を empty として扱い throw しない。
  - file state は `absent` / `adopter-owned` / `installed` / `modified` / `declined` の closed 5-state enum。`declined` は後続 install で再作成されず、stale drift として報告されず、prune もされない（`absent` = never-installed とは別状態）。
  - `declined` name は **copy 実行前に** copy set から除外する — create-only に依存するだけでは不足であり、ファイルは absent なので create-only は書いてしまう。
  - write / removal は `copyTemplateTree` / `copyTemplatePaths` / `pruneMatchingEntries` のみを経由し、当該経路は自前の `copyFile` / `writeFile` / `rm` / `unlink` 呼び出しを持たない（preference ではなく acceptance criterion であり、create-only からの逸脱が reversal ではなく narrowing である条件）。そのために `pruneMatchingEntries` は現在の module-private から **export** に変更する — module-private のままでは唯一の代替が再実装になり、この criterion が構造的に充足不可能になる。
  - **overwrite 動詞そのものは本 spec の対象外** — unconditional-overwrite refresh コマンドは上流 pack の `OQ-0021` で deferred（OQ-0003-0003 として mirror）。drift の検出・報告は spec-0006（`qfai doctor` / CLI-DOC）が所有し、その state vocabulary は CLI-WFSET §3 の enum をそのまま使う。
- REQ-0031 (CHG-007, upstream pack REQ-0021): structural contract gate for the shipped set - a gate that diffs the shipped set against a **declared expected shape** kept in the test suite, and fails when a shipped file drifts from it. What REQ-0026's generic invariants leave over (a permission block is present, a timeout is present, no reference floats) is semantic: the load-bearing **values** — which subcommand each shipped lane calls, which profile, which failure threshold, which repository variable it reads, which lanes exist, and what makes each lane inert — are asserted against one approved expected shape. **The values have one source of truth, in the test suite.** Neither the spec nor CLI-WFSET restates them, because a second copy reproduces the drift class DTC-5 records. The contract fixes the **set of dimensions** the shape must pin (the ten items of CLI-WFSET §5), and a shape missing any one of them is a contract violation, not a judgement call.
  - The gate **subsumes and replaces** the existing asset tests' ad-hoc string assertions on the shipped validate workflow, so the test-case annotations they carry are kept or re-registered.
  - Placement is load-bearing: the gate runs from `pnpm ci:lint`, and not from `pnpm ci:gate`, which only the release workflow invokes.
  - The failure code is `R-SHIPPED-WORKFLOW-SHAPE-DRIFT`, in the bare `R-` lint namespace. Catalog membership follows the severity class, so this error-class code belongs in `JUSTIFICATION_CATALOG`, but its registration is deferred as a lockstep change (`spec-0015` `OQ-0015-0001`). Its absence is a temporary divergence, not a permanent property.
  - Ordering: the gate lands **in the same change as, or before,** spec-0017's upstream pack REQ-0025, which retires the repository's own copy of the shipped workflows
  - The lane dimension covers aggregate lanes as well: a job that declares an always-run condition together with a `needs` list, asserted against the exact list.

### discussion-20260923171450572 (2026-09-24)

The requirements of this spec's rows in `## Triage (2026-09-24 intent-driven entry)` of
`09_delta.md`. The IDs are the pack's and are written with the pack half: the local
`REQ-0024` above is CHG-007's and means something else.

| Requirement                             | Home                                                                                                                                                                             |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `discussion-20260923171450572#REQ-0024` | CLI-INIT `### Ignore entries`; BR-0003-0013                                                                                                                                      |
| `discussion-20260923171450572#REQ-0059` | CLI-INIT `### Mode line`; BR-0003-0052                                                                                                                                           |
| `discussion-20260923171450572#REQ-0064` | CLI-INIT `### What it installs`, `### Entry directive`; BR-0003-0049, BR-0003-0050, BR-0003-0051                                                                                 |
| `discussion-20260923171450572#REQ-0065` | CLI-INIT `### Plan provenance and the upgrade record`, `### Upgrade conflicts`; BR-0003-0053, BR-0003-0054, BR-0003-0055, BR-0003-0056, BR-0003-0057, BR-0003-0059, BR-0003-0060 |
| `discussion-20260923171450572#NFR-0011` | CLI-INIT `### Windows parity`; BR-0003-0058                                                                                                                                      |

## Entry points

- US range in this spec: US-0003-0001..US-0003-0029 (US-0003-0014 is retired and not reused)
- Primary actors: AI エージェント統合開発者
- Notes: `npx qfai init` でプロジェクトに QFAI ワークスペースを導入する

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: multiple valid implementations exist.
- Conflict: NFR / Policy / AC conflict.
- Missing: required constraints or policy are unclear.
- Trade-off: performance vs security vs DX must be decided.

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
