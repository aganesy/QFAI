# 09 Delta

## 2026-09-22 — US-0003-0014 retired (README file generation)

- Date: 2026-09-22
- Primary: retired US-0003-0014 and the end-to-end row that carried it
- Tags: init, agents, retirement

The story asked for a `README.md` as a regular file in `.agents/`, `.codex/`,
`.claude/agents/` and `.github/agents/`. Nothing wrote one, and nothing should:
those directories hold agent cards, and what a directory needs to say goes where
the reader already is — the entry point that routed them there, or the rule master
the card cites. `scripts/check-tracked-readmes.mjs` refuses a tracked README outside
the two this project publishes, so implementing the story would have made this
repository's own checks fail on the tree it produced.

| Op ID  | Op Type | Target                            | Summary                                   |
| ------ | ------- | --------------------------------- | ----------------------------------------- |
| OP-001 | DELETE  | 02_User-stories.md (US-0003-0014) | the story and its catalog entry           |
| OP-002 | DELETE  | tdd/test-list.md (TDD-0082)       | the end-to-end row that carried it        |
| OP-003 | DELETE  | tests/e2e/qfai-traceability.md    | the annotation that named the story       |
| OP-004 | UPDATE  | tests/e2e/initE2E.test.ts         | the case now asserts the files are absent |

The case that looked like the story's coverage guarded every assertion behind an
existence check and read two of the four directories, so it passed over the empty
set and would have passed over any tree. It now reads all four and asserts they
carry no README, which is what this change specifies.

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-04-01
- Primary: spec-0003 新規作成（旧 spec-0001, spec-0017, spec-0018 の統合）
- Tags: init, symlink, instructions, codex, consolidation

- Change ID: DELTA-0002
- Date: 2026-09-24
- Primary: `qfai init` for the story tree — seeds, path defaults, the migration skill, the recut assistant tree and the guards' new ID shapes
- Tags: init, story-tree, assistant-tree, guards, migration
- Summary: see `## 2026-09-24 — Spec-to-story restructure: what this run changed and where it lands`

## Migration Record

This spec consolidates the following archived specs:

| Old Spec  | Title                       | Key Changes                                                                 |
| --------- | --------------------------- | --------------------------------------------------------------------------- |
| spec-0001 | qfai init                   | Core init functionality retained as-is. IDs renumbered to 0003-XXXX         |
| spec-0017 | Copilot Review Instructions | Merged as US-0003-0011..US-0003-0013. create-only protection retained       |
| spec-0018 | Codex Sub-Agent TOML        | TOML files are static assets; init.ts does not auto-generate them (DR-0003) |

## Outdated Content Removed

- 旧 spec-0001 の US-0001-0011..US-0001-0014（マイグレーション/バージョン正規化/内部モジュールドキュメント/カノニカルテンプレート）は未実装のため除外
- 旧 spec-0018 の TOML ファイル生成詳細（39 ファイル仕様）は旧体系として残し、新体系では 19 consolidated agents の静的 TOML 配布に更新した
- REQ-0005 は旧「マルチツールラッパー生成」から「マルチツール symlink 統合」に更新（実装と一致）

## Adopted

- Adopted: 旧 3 スペックの統合（1 CAP = 1 spec directory 原則に準拠）
- Why: init コマンドは単一 CLI コマンドであり、CAP-0003 として統合管理する方が保守性が高い
- Evidence: `packages/qfai/src/cli/commands/init.ts` が全機能を単一ファイルで実装している

## Rejected

- Candidate: 旧スペックをそのまま維持（3 スペック体制）
- Reason: 1 CAP = 1 spec directory の原則に反し、init 関連の変更時に 3 スペック間の整合性管理が必要になる
- DO NOT: init コマンドの機能を複数スペックに分割しないこと
- Temptation: 「instructions 配布は独立機能」だが、実装上は init.ts の一部であり分離は不要

## v1.7.13 (2026-04-04) — Canonical Sidecar Convergence

- adopted: contracts/design/ ディレクトリを init 対象に追加（design contracts 格納用）
- rationale: v1.7.13 で assets/init/.qfai/contracts/design/README.md が追加された実装の反映

## v1.7.18 (2026-04-19) — Gitignore Managed Block Formalization and review-\*/ default-ignore

- adopted: REQ-0016（ルート `.gitignore` 管理ブロック追記）と REQ-0017（レガシー行自動移行）を spec-0003 に追加。US-0003-0015, AC-0003-0015/0016, BR-0003-0013/0014, EX-0003-0016/0017, TC-0003-0018/0019/0020, DR-0003-0007 を新規登録
- adopted: 管理ブロックから `!.qfai/review/review-*/` と `!.qfai/review/review-*/**` を除去し、`review-*/` 配下をデフォルトで gitignore 対象とする
- adopted: `QFAI_GITIGNORE_LEGACY_LINES` による旧ブロックからの自動 migration ロジックを追加（`removeManagedBlock` を set-based matching に変更し、冪等性の判定にレガシー行の不在も条件に追加）
- rationale: 従来 spec-0003 は `.gitignore` 追記挙動を明文化しておらず、実装と spec の traceability gap が存在した。今回の review-\*/ default-ignore 変更と合わせて REQ/AC/BR/EX/TC を一括登録し、spec-code 整合性を回復
- impact:
  - `_policies/07_Constraints.md` の OC-03 を `.qfai/evidence/` 単独から `.qfai/report/*` + `.qfai/evidence/*` + `.qfai/review/review-*/` + `.qfai/discussion/discussion-*/` を含む範囲に拡張
  - `_policies/06_Glossary.md` の Review Pack 定義に「default gitignore」の注記を追加
  - テストは `packages/qfai/tests/cli/init.test.ts` に 2 ケース追加済み（legacy migration, review-\*/ ignore）
- migration: v1.7.17 以前の managed block を持つプロジェクトは `qfai init` 再実行で自動的に新形式へ移行。既コミット済みの `review-*/` を untrack したい場合は `git rm -r --cached .qfai/review/review-*/` を別途実行

## Triage

| Source                                                                                                       | Subject                                                                                                                                                                                       | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-0001, REQ-0002, REQ-0008, REQ-0009, REQ-0011, REQ-0012, REQ-0013, REQ-0018, NFR-0001, NFR-0002 (CHG-003) | `qfai init` で新 layer tree を seed、project-root `.qfai/steering/` を seed、`--upgrade-assistant-tree` flag を実装、migration memo を author、`assistantPaths.ts` SSOT を参照                | spec-0003     | UPDATE    | APPEND | pin-implied | Primary capability owner (CAP-0003)。subject-token overlap (`init`, `seed`, `assistant`)。`packages/qfai/src/cli/commands/init.ts` が直接実装する。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| discussion-20260804173914356#REQ-0014                                                                        | 配布 workflow の hardening（permissions / concurrency+cancel / persist-credentials / bounding / header の Node floor 主張撤回 / lockfile 検出 cache 式の保持）                                | spec-0003     | UPDATE    | APPEND | -           | `qfai init` が既に `.github/workflows/qfai-validate.yml` を配布しており、`copyTemplateTree` を所有する。DR-0276 の境界は **distributed-or-not** であり、`packages/qfai/assets/init/root/.github/workflows/**` は本 spec、QFAI 自身の `.github/workflows/**` は spec-0017。**Size signal**: append 前 AC 24 / TC 26（閾値 30 AC / 50 TC）、append 後 AC 36 / TC 54 で **両方の閾値を超過**する。`11_Slice-Policy.md` step 4 は閾値超で SPLIT を示唆するが、`sdd-triage.md` の通り閾値超過は **signal であって operation ではない**。capability-ownership review の結果: spec-0003 は `CAP-0003` を exactly 1 つだけ所有するため SPLIT は違法（`validateSpecSplitByCapability` が `QFAI-SPLIT-102` / `QFAI-SPLIT-104` を error で raise し、合法な終状態が存在しない）。したがって operation は APPEND のまま変わらず、reasoned non-split をここに記録する。加えて本 spec 09_delta の Rejected 節が「init コマンドの機能を複数スペックに分割しないこと」を DO NOT として既に固定している |
| discussion-20260804173914356#REQ-0015                                                                        | 配布 action pin ポリシーと trailer 解決（40-hex SHA pin、可読 version は step name に leading `v` なし、closed sanctioned third-party allow-list）                                            | spec-0003     | UPDATE    | APPEND | -           | 配布ファイルの内容は本 spec の所有物。comment-blind な leakage guard（`\bv[0-9]+\.[0-9]+(\.[0-9]+)?\b` を配布サーフェス全体に再帰 grep）が慣例的 trailer を構造的に禁じるため、解決は配布側の綴り変更に限定し guard は触らない（DR-0003-0008）。pre-build 規則を置く `lint-shipping.ts` と guard script 自体は `toolchain` = spec-0017 の所有物なので、本 spec は配布ファイル側の observable のみを assert する。co-change: `packages/qfai/tests/assets/assets.test.ts` の floating major 参照 assertion                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| discussion-20260804173914356#REQ-0016                                                                        | layer 分離された credential-free 配布 workflow set（`qfai-` prefix、複数ファイル、layer 分離は orchestrator 内 job、declared-script による inertness、zero-secret）                           | spec-0003     | UPDATE    | APPEND | -           | 配布 asset ツリーの追加は `copyTemplateTree` の write-set 拡張であり、所有者は本 spec。composite-action テンプレートは `scripts/verify-pack.mjs` の `allowedRootGithubEntries` が `workflows` のみを許可するため構造的に不可能で、scope 外として DR-0003-0009 に記録した                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| discussion-20260804173914356#REQ-0017                                                                        | 配布 change detection（third-party action なしの name-only diff + JSON filter、fail-open、green-on-skip verdict）                                                                             | spec-0003     | UPDATE    | APPEND | -           | 配布 orchestrator ファイルの内容なので本 spec。QFAI 自身の CI 側 detection（上流 pack REQ-0007、third-party action 使用）は spec-0017 の別実装であり、surface による意図的な二重実装（上流 OQ-0011）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| discussion-20260804173914356#REQ-0018                                                                        | 配布 runner label 間接化（repository variable 経由、public default、header table に variable / default / 無期限 queue 失敗モード）                                                            | spec-0003     | UPDATE    | APPEND | -           | 配布ファイルの内容。`qfai.config.yaml` への CI キー追加は上流 OQ-0006 で reject 済みなので、tuning は GitHub repository variable のみを経由する（spec-0009 の adopter config 探索とは surface が異なる）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| discussion-20260804173914356#REQ-0019                                                                        | 配布 Node version / package manager portability（version ファイル優先 + fail open、package manager 解決不能で fail closed、lockfile 検出 install branch の保持と拡張）                        | spec-0003     | UPDATE    | APPEND | -           | 既存配布 workflow の install 分岐を保持・拡張する変更なので所有者は本 spec。同じ setup-install 列の 2 前提条件が逆方向に degrade する点（NFR-C0013 の substitution test）が load-bearing であり、1 つの AC に畳まず AC-0003-0033 の 2 clause として分けて記録した                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| discussion-20260804173914356#REQ-0020                                                                        | 配布 workflow 所有権コントラクト（shipped 半分）— `qfai-` prefix reservation、in-binary write / prune name list、provenance、closed 5-state enum、`declined` の copy 前除外、primitive 再利用 | spec-0003     | UPDATE    | APPEND | -           | 上流 REQ-0020 は `Surface: both`。本 spec の担当は所有権コントラクトの**定義**（`qfai init` が write / prune の主体であるため）。**overwrite 動詞は含まない** — unconditional-overwrite refresh は上流 OQ-0021 で deferred（OQ-0003-0003 に mirror）。detection 半分は spec-0006（`qfai doctor`）に allocate 済みで、その state vocabulary は CLI-WFSET §3 の enum をそのまま使う。`init.ts` はルート asset を `force: false` / `conflictPolicy: "skip"` でハードコード copy するため `--force` は既導入 workflow を更新しない（DR-0003-0010）                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| discussion-20260804173914356#REQ-0021                                                                        | 配布 set の structural contract gate（宣言形状に対する diff、load-bearing semantic 値、`pnpm ci:lint` 配置、既存 asset test assertion の subsume）                                            | spec-0003     | UPDATE    | APPEND | -           | 配布 set に対する gate なので所有者は本 spec。**Ordering**: spec-0017 が担う上流 pack REQ-0025（リポジトリ自身の配布 validate workflow 複製の廃止）と**同一変更またはそれ以前**に着地しなければならない — 当該複製は現時点で reviewer が目視できる唯一の cross-check であり、自動 check の不在下で削除すると弱い control を no control に置換することになる。gate は `pnpm ci:lint` に置き `pnpm ci:gate` には置かない（`ci:gate` は release workflow のみが invoke するため pull request を red にできない）。宣言形状の**値**は test suite 側 1 箇所が SSOT で、CLI-WFSET は dimension 集合のみを固定する                                                                                                                                                                                                                                                                                                                                                                            |
| discussion-20260804173914356#REQ-0014..0021                                                                  | `06_Test-Cases.md` に `Type` 列、`04_Business-Rules.md` に `Contract-Refs` 列を追加（schema conformance）                                                                                     | spec-0003     | UPDATE    | APPEND | -           | 追加は purely additive。既存 ID の renumber は 0 件、既存 `Title` / `Rule` テキストの書き換えも 0 件で、既存行には新列のセル値のみを埋めた。理由: quality gate が `06_Test-Cases.md` に `TC-ID` / `Level` / `EX-Ref` / `AC-Refs` / `Type` を要求し、traceability rules が `Contract-Refs` を要求する一方、spec-0003 の表にはどちらの列も無かった。`collectTestCaseIds` と TDD coverage report が `parseFirstMarkdownTable` を読むため、新 TC 行を第 2 の表に分離すると spec 全体で `TDDLIST_TC_NOT_COVERED` が無効化される — 列追加が唯一の合法な選択肢                                                                                                                                                                                                                                                                                                                                                                                                                                |

## CHG-003 (v1.9.0) — Assistant-layer Recut + Work-log Surface Seed

- Discussion pack: `.qfai/discussion/discussion-20260522081618995/`
- Contract: `.qfai/contracts/cli/qfai-init.md` (CLI-INIT、Contract Index)、`.qfai/contracts/cli/worklog-entry.schema.md` (CLI-WLOG)
- Operation: UPDATE:APPEND
- New REQs (to be appended to `01_Spec.md#Relevant Requirements` in this CHG):
  - REQ-0018: 4-layer asset-tree seeding (`constitution/`, `manifest/`, `catalog/`, `process/`)
  - REQ-0019: project-root `.qfai/steering/` seeding (`README.md` + `.gitkeep` + `_templates/entry.md`); user-authored entries preserved on reinit
  - REQ-0020: `qfai init --upgrade-assistant-tree` one-shot migration helper; user edits preserved via `W-USER-EDIT-PRESERVED`
  - REQ-0021: migration memo authored at `.qfai/assistant/process/migrations/v<X.Y.Z>-assistant-layer-recut.md` (immutable after commit per OC-53)
  - REQ-0022: `assistantPaths.ts` SSOT module is the sole producer of distributed assistant-tree path strings consumed by `init`; hard-coded literals lint-rejected (NFR-0001)
  - REQ-0023: backwards-compatibility — old-layout files remain readable for exactly one minor release window (NFR-0002); sunset version named in `D-DEPRECATED-PATH` warning text
- New US (CHG-003 v1.9.0 — fully landed in 02_User-stories.md):
  - US-0003-0016: 4-layer asset-tree seed + work-log surface seed (REQ-0018, REQ-0019)
  - US-0003-0017: `--upgrade-assistant-tree` migration helper (REQ-0020)
  - US-0003-0018: migration memo authoring (REQ-0021)
  - US-0003-0019: assistantPaths.ts SSOT module (REQ-0022)
  - US-0003-0020: legacy layout backwards-compatibility window (REQ-0023)
- Cascade:
  - spec-0004 references `assistantPaths.ts` for validate-side path strings (companion row in spec-0004 09_delta)
  - downstream skill specs (spec-0008/0010/0011/0012/0013/0014/0016) consume the new layer paths via `project_memory:` block (companion rows in each spec)
- Out-of-scope (this spec): validation of frontmatter schema (spec-0004); Reviewer-Gate findings (spec-0015); skill-side `project_memory:` block (each skill spec)
- Implementation-phase 詳細 US/AC/BR/EX/TC は同じ v1.9.0 の per-spec SDD pass で append 済み — US-0003-0016..0020, AC-0003-0017..0024, BR-0003-0015..0020, EX-0003-0018..0023, TC-0003-0021..0026 すべて 02..06 に追加完了。
- Classifier routing contract (REQ-0020, `classifyLegacySteeringEntry`): the migration helper routes legacy entries using **exact basename (stem) Set membership** for catalog / manifest / constitution layers, and **top-segment matching** (`segments[0] === "process"` OR `segments[0] === "migrations"`) for the process layer. The `process/...` form strips its leading prefix on relocation; the `migrations/...` form is preserved as-is (lands at `.qfai/assistant/process/migrations/...`). Non-top-level `migrations` segments (e.g. `foo/migrations/bar.md`) explicitly fall through to the default `catalog/` layer so user docs are not pulled out from under their intended location. User docs whose filenames contain layer-relevant tokens (e.g. `agent-routing-notes.md`, `review-gate-overview.md`, `foo-migration-bar.md`, `quality-gate-summary.md`) are NOT mis-routed; previously the substring `.includes()` form would have pulled them into the canonical layers. This is a behavior change from the v1.9.0-alpha implementation; the unknown-stem fallback remains `catalog/` so unrouted user docs still land in a defensible default layer.
- Source: REQ-0001, REQ-0002, REQ-0008, REQ-0009, REQ-0011, REQ-0012, REQ-0013, REQ-0018, NFR-0001, NFR-0002

## CHG-004 — Codex agent profile を init 生成へ (RE-OPEN DR-0003-0003 / DR-0030)

- Operation: UPDATE:APPEND
- Re-opened decisions: spec-0003 DR-0003-0003（Codex サブエージェントは静的配置）、`_policies/08_Decisions.md` DR-0030（静的配置方式）
- Superseded by: DR-0003-0012（Codex サブエージェント TOML を init で自動生成する）
- Trigger: 「静的配置 + 手動管理」は配布物が `.codex/agents/` を含むことを前提にしていたが、`packages/qfai/assets/init/` に当該ツリーは存在しない。`qfai init` を実行したプロジェクトには Claude / Copilot の agent wrapper だけが届き、`--force` を付けても Codex は空のままだった
- adopted: `qfai init` が canonical agent markdown + `agent-catalog.yml#agents[].kind` から `.codex/agents/<name>.toml` を生成する。plain run は create-only、`--force` で再生成、roster を外れた生成物は `--force` で prune
- adopted: 本リポジトリの `.codex/agents/*.toml` も生成物として扱い、generator 出力との byte 一致をテストで固定する
- rejected: 配布 asset へ TOML を静的同梱する（canonical markdown との二重管理を配布物へ持ち込むだけで、drift の構造は変わらない）
- Cascade:
  - AC-0003-0037 を `03_Acceptance-Criteria.md` に登録（US-0003-0006 / REQ-0009 配下）
  - TC-0003-0055 を `06_Test-Cases.md` に登録、`tdd/test-list.md` に TDD-0057 を追加
  - 実装: `packages/qfai/src/core/codexAgentToml.ts`（新規）、`packages/qfai/src/cli/commands/init.ts` step 6
  - テスト: `packages/qfai/tests/integration/codexAgentWrappers.test.ts`
  - ドキュメント: `README.md` / `packages/qfai/README.md` の Codex 統合記述
- impact: 既存プロジェクトが `qfai init` を再実行すると `.codex/agents/` が新規作成される。手書きの Codex profile は生成マーカー行を持たないため prune 対象外

## CHG-007 (2026-08-05) — Shipped GitHub Actions Workflow Set

- Discussion pack: `.qfai/discussion/discussion-20260804173914356/`
- Approval: `_policies/10_delta.md#2026-08-05 — CHG-007` (ApprovedBy: user@2026-08-05)
- Governing policy decisions: DR-0275 (spec-0017 / CAP-0017 reservation revoked), DR-0276 (`toolchain` slice category; the shipped-versus-distributed boundary)
- Contracts: `.qfai/contracts/cli/shipped-workflows.md` (CLI-WFSET, **new — the authoritative source for these requirements**), `.qfai/contracts/cli/qfai-init.md` (CLI-INIT, updated with `## Shipped GitHub Actions workflows`)
- Operation: UPDATE:APPEND — no existing ID renumbered, no accepted sentence rewritten

### Requirement mapping (upstream pack REQ -> spec-local REQ)

The pack's `REQ-0014..0021` collide with spec-local `REQ-0014..0021`, which are already in use
(instructions activation guidance, Windows symlink fallback, the `.gitignore` managed block, the
CHG-003 assistant-tree work). Spec-local IDs therefore continue from the current maximum, and the
pack IDs stay in the `Source` column of the Triage table above — the same convention CHG-003 used.

| Upstream pack REQ | Spec-local REQ | Subject                                              |
| ----------------- | -------------- | ---------------------------------------------------- |
| REQ-0014          | REQ-0024       | Shipped workflow hardening                           |
| REQ-0015          | REQ-0025       | Shipped action-pin policy and trailer resolution     |
| REQ-0016          | REQ-0026       | Layer-separated credential-free shipped set          |
| REQ-0017          | REQ-0027       | Shipped change detection, fail-open, green-on-skip   |
| REQ-0018          | REQ-0028       | Shipped runner-label indirection with public default |
| REQ-0019          | REQ-0029       | Shipped Node-version and package-manager portability |
| REQ-0020          | REQ-0030       | Shipped-workflow ownership contract (shipped half)   |
| REQ-0021          | REQ-0031       | Shipped-set structural contract gate                 |

### Appended items

| Artifact                    | Appended range                      | Count |
| --------------------------- | ----------------------------------- | ----- |
| `01_Spec.md`                | REQ-0024..REQ-0031                  | 8     |
| `02_User-stories.md`        | US-0003-0021..US-0003-0028          | 8     |
| `03_Acceptance-Criteria.md` | AC-0003-0025..AC-0003-0036          | 12    |
| `04_Business-Rules.md`      | BR-0003-0021..BR-0003-0046          | 26    |
| `05_Examples.md`            | EX-0003-0024..EX-0003-0049          | 26    |
| `06_Test-Cases.md`          | TC-0003-0027..TC-0003-0054          | 28    |
| `07_Decisions.md`           | DR-0003-0008..DR-0003-0011          | 4     |
| `08_Open-questions.md`      | OQ-0003-0003                        | 1     |
| `tdd/test-list.md`          | TDD-0027..TDD-0054 (`Status: todo`) | 28    |

### Size signal and reasoned non-split

- Before: 24 AC, 26 TC. After: 36 AC, 54 TC. Thresholds in `_policies/11_Slice-Policy.md` step 2 are `acCount <= 30 && tcCount <= 50`, so **both are breached**.
- Per `sdd-triage.md`, a threshold breach is a **signal, not an operation**. The signal triggered a capability-ownership review, recorded here.
- Review outcome: `spec-0003` declares `Parent: CAP-0003` and owns exactly that one capability. `validateSpecSplitByCapability` enforces one capability per spec and raises `QFAI-SPLIT-102` / `QFAI-SPLIT-104` at `error`, so a count-driven SPLIT of a single-capability spec has **no legal end state**. The operation already selected therefore stands: APPEND stays APPEND.
- Independently, this file's `## Rejected` section already fixes `DO NOT: init コマンドの機能を複数スペックに分割しないこと` as a recurrence-prevention rule from the 2026-04-01 consolidation. A split here would reverse an accepted decision.
- Residual: both counts now sit above the ceiling (AC 36 vs 30, TC 54 vs 50), so the next append to this spec re-runs the capability-ownership review rather than assuming APPEND. The reasoned non-split does not expire — `CAP-0003` remains one capability — but the review is owed each time, and a genuine second capability appearing inside `qfai init` is the only thing that would make SPLIT legal.

### Boundary held (what this append deliberately does not absorb)

| Subject                                                                                         | Owner     | Why not here                                                                                       |
| ----------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------- |
| QFAI's own `.github/workflows/**`, root `scripts/**`, `packages/qfai/scripts/**`, runner config | spec-0017 | DR-0276: the boundary is **distributed-or-not**; none of these are in `package.json#files`         |
| Workflow-hygiene lint rule set                                                                  | spec-0017 | The rule set and the script are `toolchain`; this spec asserts only the shipped file's observables |
| `pnpm ci:lint` lane registry                                                                    | spec-0004 | spec-0004 owns the lane inventory; the lane's rules and its shipped target live elsewhere          |
| Adopter drift detection (`workflows.integrity`)                                                 | spec-0006 | Upstream REQ-0022's detection half; `qfai doctor` already has an advisory bucket                   |
| Worker-scoped credential-reuse guidance                                                         | spec-0008 | ATDD-layer prose, backend-agnostic                                                                 |
| Layer-to-CI-lane mapping document                                                               | spec-0009 | Cascade only; the layer vocabulary must not grow (NFR-0015)                                        |
| Reviewer-gate ingestion of the new finding codes                                                | spec-0015 | Established precedent: one spec emits, spec-0015 defines ingestion                                 |

### Contract citation posture

CLI-WFSET is cited, not restated. In particular the **values** of REQ-0031's declared expected
shape (which subcommand, which profile, which failure threshold) are SSOT in exactly one place —
the test suite. Neither this spec nor CLI-WFSET carries a second copy, because a second copy
reproduces the drift class `DTC-5` records: the repository's own copy of the shipped validate
workflow diverged from the shipped one precisely because two copies existed with no gate between
them. What CLI-WFSET fixes is the closed set of **dimensions** the shape must pin (§5), so a shape
that silently omits one is a contract violation rather than a judgement call.

### Blocking constraints encoded (measured, not assumed)

1. `packages/qfai/scripts/check-no-internal-version-leakage.sh` is comment-blind: `INTERNAL_VERSION_RE` is `\bv[0-9]+\.[0-9]+(\.[0-9]+)?\b|\bv1\.x\b`, grepped recursively over every path in `package.json#files`. A conventional `# v<X.Y.Z>` pin trailer in a shipped file therefore fails the build. Encoded as BR-0003-0025 / BR-0003-0027 and DR-0003-0008: the version moves into the step `name:` spelled without the leading letter, and no pragma, allow-list entry or pattern narrowing is introduced.
2. `scripts/verify-pack.mjs#allowedRootGithubEntries` permits only `workflows` under the shipped `.github/` and throws on any other immediate child. A shipped `actions/` directory is a hard pack failure, so composite-action templates cannot ship. Recorded as out of scope in `01_Spec.md` and DR-0003-0009, with the asset-test / pack-verifier asymmetry (DTC-15) noted so "fix the test" is not mistaken for a path.
3. `packages/qfai/src/cli/commands/init.ts` copies root assets with `force: false` and `conflictPolicy: "skip"` hard-coded, so `qfai init --force` never refreshes an already-installed workflow. REQ-0030 specifies the ownership contract only; the unconditional-overwrite refresh verb is deferred on upstream `OQ-0021` (mirrored as OQ-0003-0003). Encoded as DR-0003-0010.

### Phase 0 alignment (contract-driven additions)

Two obligations were added after CLI-WFSET landed, because the contract made them separately
observable:

- **AC-0003-0036 / BR-0003-0045 / EX-0003-0048 / TC-0003-0051 — `declined`-name pre-copy exclusion.** Create-only behaviour alone does not satisfy "a declined file is never recreated": the file is absent, so create-only writes it. A test asserting only create-only would pass while init recreates a file the adopter deliberately deleted. TC-0003-0051 therefore observes the copy set itself and carries a control run with create-only disabled, which is what falsifies the weaker reading.
- **BR-0003-0046 / EX-0003-0049 / TC-0003-0052 — `pruneMatchingEntries` must become exported.** REQ-0030's "the refresh path contains no copy or removal call of its own" is structurally unsatisfiable while that helper is module-private, because the only alternative is re-implementing it. The named hazard is recorded in BR-0003-0039: `init.ts#pruneStaleQfaiWrappers` uses `entry.name.startsWith("qfai-")` at all three call sites, and passing that predicate to `pruneMatchingEntries` for the workflows directory is forbidden by CLI-WFSET §1.

### Cascade (companion rows live in the named spec's own delta)

- spec-0012: its delta records the shipped workflow's current shape (Node pin, lockfile-detection description); hardening makes that stale — UPDATE:MODIFY there
- spec-0004: the `pnpm ci:lint` lane registry gains the workflow-hygiene lane and the shipped-shape gate — UPDATE:MODIFY there
- spec-0006: `workflows.integrity` advisory finding, consuming CLI-WFSET §3's state enum — UPDATE:APPEND there
- spec-0015: reviewer-gate ingestion of `R-SHIPPED-WORKFLOW-SHAPE-DRIFT` and `R-WORKFLOW-HYGIENE-DRIFT` — UPDATE:APPEND there
- spec-0017: the own-CI surface, the hygiene rule set, the pre-build shipped-YAML version rule, and the retirement of the repository's duplicate — CREATE there

### Schema conformance (additive columns)

- `06_Test-Cases.md` gained a `Type` column (`normal` / `error` / `boundary` / `edge`) and `04_Business-Rules.md` gained a `Contract-Refs` column. Both are required by `sdd-quality-gate.md` and `spec-traceability-rules.md` respectively and were absent from this spec.
- The addition is purely additive: no ID was renumbered and no existing `Title` or `Rule` text was rewritten. Only the new cells were filled on pre-existing rows.
- A second table was not an option: `collectTestCaseIds` and the TDD coverage report both read `parseFirstMarkdownTable`, so splitting the new TC rows into a second table would find no `TC-ID` column there and silently disable `TDDLIST_TC_NOT_COVERED` for the whole spec.
- Pre-existing `Contract-Refs` values: BR-0003-0001..0014 are `-`; BR-0003-0015..0020 are `CLI-INIT`, which the Contract Index row for CLI-INIT names explicitly as the CHG-003 surface (assistant-tree seed, `--upgrade-assistant-tree`, work-log surface seed, deprecation window, path SSOT enforcement).

## Change Requests

| CR ID            | Upstream artifact                                                                                                                       | Mode      | Approved by                                                    | Applied at           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------- | -------------------- |
| CR-20260923-0003 | `spec-0003/04_Business-Rules.md`, `05_Examples.md`, `06_Test-Cases.md`, `tdd/test-list.md`                                              | re-derive | claude-code (the user's standing instruction for this session) | 2026-09-23T03:05:00Z |
| CR-20260923-0006 | `spec-0003/01_Spec.md`, `02_User-stories.md`, `03_Acceptance-Criteria.md`, `04_Business-Rules.md`, `05_Examples.md`, `06_Test-Cases.md` | re-derive | claude-code (the user's standing instruction for this session) | 2026-09-23T08:13:56Z |
| CR-20260923-0007 | `spec-0003/06_Test-Cases.md`, `tdd/test-list.md`                                                                                        | re-derive | claude-code (the user's standing instruction for this session) | 2026-09-23T08:26:35Z |
| CR-20260923-0011 | `spec-0003/01_Spec.md`, `02_User-stories.md`, `03_Acceptance-Criteria.md`, `05_Examples.md`, `06_Test-Cases.md`, `tdd/test-list.md`     | re-derive | claude-code (the user's standing instruction for this session) | 2026-09-23T11:15:07Z |
| CR-20260923-0013 | `spec-0003/tdd/test-list.md`                                                                                                            | re-derive | claude-code (the user's standing instruction for this session) | 2026-09-23T11:52:00Z |

## Triage (2026-09-15)

Source: the user's explicit instruction to parallelize independent work in both QFAI's own CI and its distributed workflows. These rows cover only the distributed workflows owned by CAP-0003.

| Source           | Subject                                                                                          | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------ | ------------- | --------- | ------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User instruction | Preserve validation coverage across independent profile jobs                                     | spec-0003     | UPDATE    | MODIFY | -           | Update REQ-0031, US-0003-0028, AC-0003-0035 and BR-0003-0043, and amend section 5 of `.qfai/contracts/cli/shipped-workflows.md` in the same change, since the spec cites that section rather than restating it. Replace the same-lane ordering requirement with the invocation set each lane carries, and widen the lane dimension to cover an aggregate lane. Preserve every subcommand, profile, failure threshold and trigger; no validation obligation is added or dropped. EX-0003-0046 and TC-0003-0049 retain their negative coverage.                                                                                                 |
| User instruction | Account for dependency installs after matrix expansion                                           | spec-0003     | UPDATE    | MODIFY | -           | Update NFR-C0016, AC-0003-0030, BR-0003-0031, EX-0003-0034 and TC-0003-0037. The one-install statement is stale because document checks and validation already install dependencies. Count executing job instances by event, including matrix expansion, and record the scheduling cost. Preserve zero secret references, zero unopted test lanes and install-free detection and aggregate jobs. Keep the existing TC and ledger IDs.                                                                                                                                                                                                         |
| User instruction | Require independent document checks and validation profiles to complete before aggregate success | spec-0003     | UPDATE    | APPEND | -           | Add narrowly scoped acceptance, rule, example and test coverage within the existing shipped-workflow capability, and extend the US-0003-0023 note that AC-0003-0038 hangs from. Independent checks are declared as legs of one job; aggregate success requires every required result to succeed. Failure, cancellation and unexpected skipping cannot produce aggregate success. Preserve create-only installation, declined files, existing check coverage and the prohibition on cross-file workflow references. CAP-0003 remains the sole capability: the existing AC/TC count threshold breach warrants review, not a count-driven SPLIT. |

The capability-ownership review keeps all three rows in spec-0003. The existing size signal does not identify a second capability. The own-CI implementation and hygiene lane remain owned by spec-0017; this scheduling change alters none of that spec's obligations and needs no companion edit there. The derived byte pins under `.github/` move with `scripts/dogfood-backlog.json` whenever its contents change, and carry no obligation of their own. No workflow refresh, overwrite, version change or publishing operation is introduced.

## Triage (2026-09-23 spec-to-story)

| Source                                                                                                                                                     | Subject                                                                                                                                                                                                                                                                                                                                                                   | Existing Spec | Operation | Sub-op | Approved By   | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Depends-On                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| discussion-20260923063306456#REQ-0001, discussion-20260923063306456#REQ-0002, discussion-20260923063306456#REQ-0005, discussion-20260923063306456#REQ-0022 | `qfai init` writes the `.qfai/spec/` tree and its templates, and `specsDir` defaults to `.qfai/spec`, `contractsDir` to `.qfai/spec/03_contract`; the singleton files are created only when absent and carry no BF, US, AC or EX instance. On an old layout init skips `.qfai/spec/`, still installs the migration skill, and prints the detected path and the skill name | spec-0003     | UPDATE    | APPEND | -             | Slice A. Adopted (N09); the code waits for spec-0004's layout and unlisted-contract rows. Conservation pairs with this spec's template REMOVE row. Co-change: `scripts/fresh-init-findings.json`, the verify:pack baseline of a fresh init tree, is re-derived when init switches layout. Size signal: 38 AC / 58 TC, over both thresholds; the spec owns exactly CAP-0003, so no SPLIT                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | discussion-20260923063306456#REQ-0024          |
| discussion-20260923063306456#REQ-0024, discussion-20260923063306456#NFR-0004                                                                               | Post-build guard and smoke-test pattern set learn the DEC, OQ, BF, US, AC, EX and BR shapes, each with a sample-ID band                                                                                                                                                                                                                                                   | spec-0003     | UPDATE    | MODIFY | -             | Slice A, additive. NFR-C0005: the three code sites and the rule document move in one PR with no template edit, so this lands before the P2 templates. REQ-0024 row 1 of 3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | -                                              |
| discussion-20260923063306456#REQ-0001, discussion-20260923063306456#REQ-0005                                                                               | Shipped rules `distributed-surface.md` and `temporary-files.md` cite `.qfai/spec/` in place of `.qfai/specs/` and `.qfai/contracts/`                                                                                                                                                                                                                                      | spec-0003     | UPDATE    | MODIFY | -             | Slice C. This repository's `.agents/rules` masters are symlinks to these files, so the new text governs here at once; it lands with the P7 repository migration                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | OQ-0170                                        |
| discussion-20260923063306456#REQ-0013                                                                                                                      | Remove the items for writing the spec-pack and `_policies` templates: 01_Spec, 06_Test-Cases, 10_Plan, 16_Traceability-ledger, test-list, 01_Spec-retired, 03_Capabilities and 11_Slice-Policy                                                                                                                                                                            | spec-0003     | UPDATE    | REMOVE | yusuke_senaga | Slice C. This repository's self-validation reads these templates and their mdschema entries, so the row lands at P7 with the tests annotating these TCs. Replacement: this spec's structure-write APPEND row                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | OQ-0170                                        |
| discussion-20260923063306456#REQ-0017                                                                                                                      | Remove `--upgrade-assistant-tree` writing the `process/migrations` memo, and the guard exception for the memo's file name                                                                                                                                                                                                                                                 | spec-0003     | UPDATE    | REMOVE | yusuke_senaga | Lands P6 with the removal of `process/`; only asset tests pin it, and they go in the same change. P6 co-change in this repository at `pnpm sync:ssot` time: `qfai.config.yaml` `skillsDir`; the 42 tracked links `.agents/skills/qfai-*`, `.claude/skills/*` and `.claude/agents/*.md`; and the `.qfai/assistant/{skills,agents,constitution,catalog,manifest}` citations in `AGENTS.md`, `.github/copilot-instructions.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.gitignore`, `README.md`, `.agents/rules/{distributed-surface.local,document-schema,instruction-tree,repository-language}.md`, `.instruction/02_project/agent-selection.md`, the generated `.codex/agents/*.toml`, `scripts/{check-prompt-scanner-pair,check-review-profile-consistency,gen-agent-catalog,gen-codex-agents,smoke-qfai-cli,verify-pack}.mjs` and `scripts/dogfood-backlog.json`. The P5 link-repoint script (migration step 9) runs on this repository first. | discussion-20260923063306456#REQ-0019, OQ-0177 |
| discussion-20260923063306456#REQ-0016                                                                                                                      | Remove the add-only merge of the shipped routing table into the project's routing file                                                                                                                                                                                                                                                                                    | spec-0003     | UPDATE    | REMOVE | yusuke_senaga | Lands P6 with the built-in defaults; its asset tests go in the same change. P6 co-change in this repository at `pnpm sync:ssot` time: `qfai.config.yaml` `skillsDir`; the 42 tracked links `.agents/skills/qfai-*`, `.claude/skills/*` and `.claude/agents/*.md`; and the `.qfai/assistant/{skills,agents,constitution,catalog,manifest}` citations in `AGENTS.md`, `.github/copilot-instructions.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.gitignore`, `README.md`, `.agents/rules/{distributed-surface.local,document-schema,instruction-tree,repository-language}.md`, `.instruction/02_project/agent-selection.md`, the generated `.codex/agents/*.toml`, `scripts/{check-prompt-scanner-pair,check-review-profile-consistency,gen-agent-catalog,gen-codex-agents,smoke-qfai-cli,verify-pack}.mjs` and `scripts/dogfood-backlog.json`. The P5 link-repoint script (migration step 9) runs on this repository first.                       | discussion-20260923063306456#REQ-0019, OQ-0177 |
| discussion-20260923063306456#REQ-0016, discussion-20260923063306456#REQ-0017                                                                               | Assistant sync writes `rule/` and skill `references/`; routing defaults are built in; `kind` is read from the card frontmatter                                                                                                                                                                                                                                            | spec-0003     | UPDATE    | MODIFY | -             | Slice B, lands P6. P6 co-change in this repository at `pnpm sync:ssot` time: `qfai.config.yaml` `skillsDir`; the 42 tracked links `.agents/skills/qfai-*`, `.claude/skills/*` and `.claude/agents/*.md`; and the `.qfai/assistant/{skills,agents,constitution,catalog,manifest}` citations in `AGENTS.md`, `.github/copilot-instructions.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.gitignore`, `README.md`, `.agents/rules/{distributed-surface.local,document-schema,instruction-tree,repository-language}.md`, `.instruction/02_project/agent-selection.md`, the generated `.codex/agents/*.toml`, `scripts/{check-prompt-scanner-pair,check-review-profile-consistency,gen-agent-catalog,gen-codex-agents,smoke-qfai-cli,verify-pack}.mjs` and `scripts/dogfood-backlog.json`. The P5 link-repoint script (migration step 9) runs on this repository first.                                                                                | discussion-20260923063306456#REQ-0019, OQ-0177 |
| discussion-20260923063306456#REQ-0018                                                                                                                      | `qfai init` writes singular names: `skill/`, `agent/`, `prompt/`, `steering/_template` and the integration link targets                                                                                                                                                                                                                                                   | spec-0003     | UPDATE    | MODIFY | -             | Slice B, lands P6. P6 co-change in this repository at `pnpm sync:ssot` time: `qfai.config.yaml` `skillsDir`; the 42 tracked links `.agents/skills/qfai-*`, `.claude/skills/*` and `.claude/agents/*.md`; and the `.qfai/assistant/{skills,agents,constitution,catalog,manifest}` citations in `AGENTS.md`, `.github/copilot-instructions.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.gitignore`, `README.md`, `.agents/rules/{distributed-surface.local,document-schema,instruction-tree,repository-language}.md`, `.instruction/02_project/agent-selection.md`, the generated `.codex/agents/*.toml`, `scripts/{check-prompt-scanner-pair,check-review-profile-consistency,gen-agent-catalog,gen-codex-agents,smoke-qfai-cli,verify-pack}.mjs` and `scripts/dogfood-backlog.json`. The P5 link-repoint script (migration step 9) runs on this repository first.                                                                                | discussion-20260923063306456#REQ-0019, OQ-0177 |
| discussion-20260923063306456#NFR-0010, discussion-20260923063306456#REQ-0018                                                                               | The managed `.gitignore` block negates `.qfai/evidence/decision/`                                                                                                                                                                                                                                                                                                         | spec-0003     | UPDATE    | MODIFY | -             | Slice B, lands P6. This repository's `.gitignore` gets the same negation from migration step 10, run on this repository first                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | discussion-20260923063306456#REQ-0019          |
| discussion-20260923063306456#REQ-0019                                                                                                                      | `qfai init` ships and links `/qfai-migration-spec-to-story`; the migration reuses init's integration-directory and managed-block writers                                                                                                                                                                                                                                  | spec-0003     | UPDATE    | APPEND | -             | Slice A; the code lands in P5                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | -                                              |
| discussion-20260923063306456#REQ-0017                                                                                                                      | `--upgrade-assistant-tree` is retargeted to the REQ-0017 destinations; files it does not recognise stay in place without a message                                                                                                                                                                                                                                        | spec-0003     | UPDATE    | MODIFY | -             | Slice B, lands P6. Adopted (N10); a solution-architect position to list unrecognised files was not taken                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | OQ-0177                                        |
| discussion-20260923063306456#REQ-0018                                                                                                                      | US-0003-0003: `--force` leaves `skill.local/` untouched                                                                                                                                                                                                                                                                                                                   | spec-0003     | UPDATE    | MODIFY | -             | Slice B, lands P6 with the rename. Adopted (N11): `skills.local` becomes `skill.local`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | -                                              |

## 2026-09-24 — Spec-to-story restructure: what this run changed and where it lands

The record of the `/qfai-sdd` batch run 20260923100952585, whose intake is the
discussion pack `discussion-20260923063306456`. Its Triage rows are under
`## Triage (2026-09-23 spec-to-story)` above. Every decision it rests on is in
`.qfai/evidence/sdd-batch-20260923100952585.md`, and the short IDs in
parentheses below (N09, X2, P3-C1 and so on) are that record's. No approved
change request ordered this run.

### What this run changed

Items that already existed keep their current text. Where the story tree
changes what an item says, a clause conditioned on the layout was added beside
the current one (X1). Existing test cases keep their text until their row lands
(X2).

| File                        | Added                                                                                | Changed in place                                       |
| --------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| `01_Spec.md`                | a story-tree Scope line; `CLI-MIGR` under Applicable Contracts; 12 pack requirements | the US range, now US-0003-0001..US-0003-0031           |
| `02_User-stories.md`        | US-0003-0029..0031                                                                   | US-0003-0001, 0003, 0005, 0006, 0015, 0016, 0017       |
| `03_Acceptance-Criteria.md` | AC-0003-0039..0046                                                                   | AC-0003-0017, 0018, 0019, 0022, 0028, 0037             |
| `04_Business-Rules.md`      | BR-0003-0049..0059                                                                   | BR-0003-0002, 0015, 0016, 0017                         |
| `05_Examples.md`            | EX-0003-0052..0069                                                                   | EX-0003-0003, 0005, 0016, 0018, 0019, 0020, 0022, 0030 |
| `06_Test-Cases.md`          | TC-0003-0059..0078                                                                   | none                                                   |
| `tdd/test-list.md`          | TDD-0094..0122 at `todo`; TDD-0119..0121 are the E2E rows of US-0003-0029..0031      | none; no Status moved                                  |
| `10_Plan.md`                | a `### Story-tree layout` subsection under each heading the change touches           | none                                                   |

### How it lands

Delivery is three pull requests (user answers P3-C1, P3-C2 and P3-C3):

1. **P1**, on its own and merged first. Its first commit removes the IDs of the
   new shapes that shipped files already hold outside the sample band. Its
   second commit changes the guard pattern sets and the shape table.
2. **P2 to P8**, in one pull request that also carries `/qfai-atdd` and
   `/qfai-implement` with their tests.
3. **The migration memo's guard exception**, removed in a pull request of its
   own after the second has merged, with no template edit.

Nothing is tombstoned, marked or deleted now (X3). Each row retires its items in
the change that lands it.

| Triage row                                                                   | Operation     | Lands                                                                    | Pull request | Items                                                                                                                          |
| ---------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `qfai init` writes the `.qfai/spec/` tree; path defaults; old layout         | UPDATE:APPEND | P3: seeds, path defaults, old-layout skip. P7: policy and contract files | 2            | US-0003-0001, 0029; AC-0003-0039..0043; BR-0003-0049..0053; EX-0003-0052..0059; TC-0003-0059..0067; TDD-0094..0103, 0119       |
| Guard pattern sets learn the DEC, OQ, BF, US, AC, EX and BR shapes           | UPDATE:MODIFY | P1                                                                       | 1            | US-0003-0031; AC-0003-0028, 0046; BR-0003-0056; EX-0003-0030, 0062, 0063; TC-0003-0070..0072; TDD-0107..0112, 0121             |
| Shipped `distributed-surface.md` and `temporary-files.md` cite `.qfai/spec/` | UPDATE:MODIFY | P7                                                                       | 2            | no item; the shipped rule text is the change                                                                                   |
| Remove the spec-pack and `_policies` template items                          | UPDATE:REMOVE | P7                                                                       | 2            | none of this spec's IDs; see below                                                                                             |
| Remove the migration memo and its guard exception                            | UPDATE:REMOVE | P6 for the memo; the exception after pull request 2                      | 2 and 3      | see below                                                                                                                      |
| Remove the add-only routing merge                                            | UPDATE:REMOVE | P6                                                                       | 2            | none of this spec's IDs; see below                                                                                             |
| Assistant sync writes `rule/` and `references/`; `kind` from the cards       | UPDATE:MODIFY | P6                                                                       | 2            | US-0003-0016; AC-0003-0017, 0022, 0037; BR-0003-0015, 0057; EX-0003-0018, 0022, 0064, 0069; TC-0003-0073, 0078; TDD-0113, 0122 |
| Singular names                                                               | UPDATE:MODIFY | P6                                                                       | 2            | US-0003-0005, 0006; AC-0003-0018; BR-0003-0016; EX-0003-0005, 0019                                                             |
| The managed `.gitignore` block negates `.qfai/evidence/decision/`            | UPDATE:MODIFY | P6                                                                       | 2            | US-0003-0015; BR-0003-0058; EX-0003-0016, 0065, 0066; TC-0003-0074, 0075; TDD-0114, 0115                                       |
| `qfai init` ships and links `/qfai-migration-spec-to-story`                  | UPDATE:APPEND | P5                                                                       | 2            | US-0003-0030; AC-0003-0044, 0045; BR-0003-0054, 0055; EX-0003-0060, 0061; TC-0003-0068, 0069; TDD-0104..0106, 0120             |
| `--upgrade-assistant-tree` retargeted                                        | UPDATE:MODIFY | P6                                                                       | 2            | US-0003-0017; AC-0003-0019; BR-0003-0017, 0059; EX-0003-0020, 0067, 0068; TC-0003-0076, 0077; TDD-0116..0118                   |
| `--force` leaves `skill.local/` untouched                                    | UPDATE:MODIFY | P6                                                                       | 2            | US-0003-0003; BR-0003-0002; EX-0003-0003                                                                                       |

At landing, three things happen to the items above:

- An item that carries a layout-conditioned clause drops its spec-pack clause in
  the P7 change. The list of those items is kept with OQ-0170.
- The existing test cases that cite a changed criterion or example take the
  target text in the change that lands their row: TC-0003-0003, 0005, 0018,
  0020, 0021, 0022, 0023, 0025, 0031, 0033 and 0055. Their ledger rows then
  follow the upstream-reset rule.
- TC-0003-0055's empty EX-Ref is set to EX-0003-0064 (G5-5).

### What the REMOVE rows retire

**The migration memo and its guard exception.** These are retired in the P6
change of pull request 2:

- `01_Spec.md`: REQ-0021
- US-0003-0018, with its catalog line in `02_User-stories.md`
- AC-0003-0021, with its row in the AC index table
- BR-0003-0018
- EX-0003-0021
- TC-0003-0024
- ledger rows to tombstone: TDD-0024, which carries TC-0003-0024, and TDD-0066,
  the E2E row of US-0003-0018

Pull request 3 removes the guard exception from the two guards that carry it,
`packages/qfai/scripts/check-no-internal-version-leakage.sh` and the smoke
test's scan, which sits in `packages/qfai/tests/helpers/distributedSurfaceScan.ts`
from P1. The third
exception in `.agents/rules/distributed-surface.local.md` and
`packages/qfai/tests/scripts/checkNoInternalVersionLeakage.test.ts` change with
them. No item of this spec states the exception, so none retires with it.

**The spec-pack and `_policies` template items.** No item or ledger row of this
spec describes these templates, so the row retires none of this spec's IDs. At
P7 it deletes the eight templates the row names and their entries in
`packages/qfai/assets/mdschema/manifest.yml`. The asset tests that read them,
`packages/qfai/tests/assets/mdschemaSchemas.test.ts` among them, change in the
same commit.

**The add-only routing merge.** No item of this spec states it. At P6 the row
deletes `packages/qfai/src/core/manifest/routingPhaseMerge.ts` and its call in
`packages/qfai/src/cli/commands/init.ts`. The same change deletes
`packages/qfai/tests/unit/core/manifest/routingPhaseMerge.test.ts` and the
file's entry in `packages/qfai/tests/scripts/typeCheckEnumeration.allowlist.ts`.

### Co-changes the landing carries

- `scripts/fresh-init-findings.json`, the verify:pack baseline of a fresh init
  tree, is re-derived in each commit that changes what a fresh init writes: the
  P3 seeding, the P6 assistant tree and the P7 seeds.
- The P3 commit gives every test fixture that writes `.qfai/specs/` without
  `paths.specsDir` an explicit `paths.specsDir` and `paths.contractsDir`.
- The P6 co-change list in the Triage rows applies to this repository: the
  `skillsDir` key, the 42 tracked links and the citations in the root documents,
  rules and scripts. `specPackSpec0001.test.ts` joins that list.
- The memo removal reaches `packages/qfai/tests/cli/init.test.ts`,
  `packages/qfai/tests/integration/initSpec0003.test.ts`,
  `packages/qfai/tests/scripts/assistantTreeLinks.test.ts`,
  `scripts/link-assistant-tree.mjs` and
  `packages/qfai/src/core/paths/assistantPaths.ts`.
- The P1 clean-up commit re-counts the out-of-band IDs with the guards' own
  patterns. The griller counted 54 in 25 shipped files, and the writers about
  55 in 24.
- The P6 rename commit repoints the ledger's `Owning module` cells that name
  `skills/` paths.

### Recorded drift

Found while drafting and recorded rather than fixed, because no row of this run
covers it (X11):

- EX-0003-0019 says `.qfai/steering/README.md` is seeded. AC-0003-0018 and
  `qfai-init.md` say no README is written. Open.
- AC-0003-0019's current clause says the legacy files are relocated, which
  reads as a move. Its story-tree clause and BR-0003-0059 say copied. Open until
  P7, when the current clause goes.
- Once TC-0003-0055 is re-pointed to EX-0003-0064 at landing, TC-0003-0073
  covers the same example. Open; the landing decides whether both stay.
- The CHG-007 records above say the leakage guard is not touched
  (DR-0003-0008) and belongs to spec-0017. P1 changes it by adding patterns
  only. It narrows no pattern and adds no pragma or allowlist entry, which is
  what DR-0003-0008 forbids. The guard scripts stay spec-0017's.
- NFR-C0009 says existing adopters are not broken by a template change. From P7,
  validate reports an old-layout error on a spec-pack tree. That error is read
  as the deliberate 2.0.0 break, which the migration skill answers.
- The griller's P3 check had no test case: `qfai init` and `qfai validate` on
  a project whose config has no `paths.specsDir` and which holds
  `.qfai/specs/spec-0001/`. Resolved by user answer U2: 2.x does not support an
  unmigrated tree, so the check is no longer wanted, and OQ-0185 is resolved by
  that answer. The plan's risk row now asks that the migration guide and the
  2.0.0 CHANGELOG entry tell a project on the spec-pack layout to pin a 1.x
  release or migrate before upgrading.
- `repairIntegrationWrappers` relinks only the links the link gate reports,
  with `force: false`, and `runInit` does not call it. Step 9 may therefore
  leave a link into `skills/` unrepointed. A risk row in the plan, tested by
  TC-0018-0067.
- The guard test cases are split as out-of-band and in-band, two rows per guard,
  not one per shape. Settled by ruling D1: the band rows stay, each shape is its
  own test (`it.each`) with one Selector entry per shape, and RED is recorded
  per entry. Dissent: the completion reviewer wanted one ledger row per shape
  on each side.
- TDD-0111 and TDD-0112 keep `-` as their owning module, because they span the
  three guards (P3-D12).

### Adoption and rejection

Adopted:

- Init seeds `.qfai/spec/` create-only. On an old layout it skips the tree and
  still installs the migration skill (N09). The skip lands at P3 with the
  seeding.
- The path defaults switch in the P3 seeding commit (P3-D02).
- The guards learn the new shapes by addition only, with the sample band on
  every numeric segment (X7).
- Migration steps 9 and 10 import init's two writers (BR-0003-0055).
- `--upgrade-assistant-tree` leaves files it does not recognise in place,
  without a message (N10).

Rejected:

- Seeding the story tree beside an old layout.
  - DO NOT: write `.qfai/spec/` into a project that still holds spec packs or
    `.qfai/contracts/`.
  - Temptation: a fresh tree looks harmless and saves the user a step. Migration
    step 1's rename of `.qfai/specs` would collide with it.
- Switching the path defaults at P1.
  - DO NOT: change the defaults in a commit that does not seed the tree.
  - Temptation: it is one line in `config.ts` and looks independent. Init would
    write a config for a tree it does not seed, and the verify:pack baseline
    would move for a tree that does not exist.
- Giving migration steps 9 and 10 their own link and `.gitignore` writes.
  - DO NOT: add a symlink or managed-block write under `src/migration/`.
  - Temptation: the exported writer may lack a capability step 9 needs. Add it
    to the exported writer, so init and the migration cannot write different
    links or blocks.
- Narrowing a guard pattern, or adding a pragma or allowlist entry, so that the
  shipped surface passes.
  - DO NOT: loosen a guard to avoid the P1 clean-up.
  - Temptation: the clean-up touches about 55 occurrences in 25 files.
- Changing the guard patterns in the pull request that edits templates.
  - DO NOT: put a pattern-set change and a template edit in one pull request
    (NFR-C0005).
  - Temptation: one pull request for every phase is simpler to review.
- Listing the files `--upgrade-assistant-tree` does not recognise.
  - DO NOT: print them.
  - Temptation: it looks helpful, but they are the adopter's files and stay
    where they are.
- Pinning the `QFAI-ATDD-111` and `QFAI-ATDD-112` errors that the new `todo`
  cases raise in the dogfood lanes.
  - DO NOT: add a dogfood pin for them.
  - Temptation: a pin turns the lanes green at once. Pull request 2 carries the
    ATDD and implementation tests, which clear the errors (P3-C1).

### Corrections from the Reviewer Gate (2026-09-24)

The gate of review pack `review-20260924014832174` returned REVISE. The
griller's rulings and the user's answers behind these corrections are in the
batch record.

| Ruling        | What changed                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1            | The plan's test approach states one case per guard, each band on its own ledger row, one `it.each` test per shape with one Selector entry each, and RED per entry. TC-0003-0068 stays one row, TDD-0104, with one Selector entry per layout. The open note on the guard split is closed, with the completion reviewer's per-shape position recorded as the dissent                                                                                       |
| D9            | The smoke test's scan moves at P1 into `packages/qfai/tests/helpers/distributedSurfaceScan.ts`, which exports `scanDistributedSurface(root)` and the pattern set. TDD-0109 and 0110 are owned by that helper. TC-0003-0071 calls the scan, and TC-0003-0072 reads the smoke set from the helper's export. The P1 row of the plan names the helper, and `.agents/rules/distributed-surface.local.md` names it in its guard table in the same pull request |
| D11           | TC-0003-0072 moves from `unit` to `integration`, and TDD-0111 and 0112 to Integration, because its oracle reads the shipped guard files                                                                                                                                                                                                                                                                                                                  |
| U2            | The plan's risk row on a config without `paths.specsDir` is accepted by the user's answer: 2.x does not support an unmigrated tree. The P3 probe case and its open-question step are dropped, and OQ-0185 is resolved by that answer. The trigger is now the migration guide or the 2.0.0 CHANGELOG entry lacking the statement at P8                                                                                                                    |
| R02 finding 8 | The plan's row for removing the migration memo's guard exception is labelled "After P8", the third pull request, instead of P6                                                                                                                                                                                                                                                                                                                           |

The second gate, review pack `review-20260924053652061`, returned REVISE. The
griller's ruling D15 is in the batch record.

| Ruling | What changed                                                                                                                                                                                                                                                                                                            |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D15    | TC-0003-0069 stays `unit`. The Level paragraph of `06_Test-Cases.md` states the convention it shares with TC-0003-0048: an oracle that scans a module's source text for calls reads the text as setup and asserts over the text alone. TC-0003-0069's Setup reads "the text of migration steps 9 and 10, read as input" |

## Triage (2026-09-24 P7 criterion split)

DR-0003-0013 separates the two story outcomes formerly combined in
AC-0003-0026. The P7 ID map retains one-to-many provenance.

| Source | Subject | Existing Spec | Operation | Sub-op | Approved By | Rationale | Depends-On |
| ------ | ------- | ------------- | --------- | ------ | ----------- | --------- | ---------- |
| P7 criterion review | Distributed install branch and Node header | spec-0003 | UPDATE | MODIFY | Existing US-0003-0021/0026 | Keep AC-0003-0026 under US-0003-0026 for lockfile/cache/install; add AC-0003-0047 under US-0003-0021 for the header Node floor. BR-0003-0036, EX-0003-0070 and TC-0003-0079 cover the added criterion. | P7 step 5 |
