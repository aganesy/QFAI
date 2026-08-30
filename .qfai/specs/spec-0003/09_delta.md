# 09 Delta

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-04-01
- Primary: spec-0003 新規作成（旧 spec-0001, spec-0017, spec-0018 の統合）
- Tags: init, symlink, instructions, codex, consolidation

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
- Implementation-phase 詳細 US/AC/BR/EX/TC は同じ v1.9.0 PR (#209) の per-spec SDD pass で append 済み — US-0003-0016..0020, AC-0003-0017..0024, BR-0003-0015..0020, EX-0003-0018..0023, TC-0003-0021..0026 すべて 02..06 に追加完了。
- Classifier routing contract (REQ-0020, `classifyLegacySteeringEntry`): the migration helper routes legacy entries using **exact basename (stem) Set membership** for catalog / manifest / constitution layers, and **top-segment matching** (`segments[0] === "process"` OR `segments[0] === "migrations"`) for the process layer. The `process/...` form strips its leading prefix on relocation; the `migrations/...` form is preserved as-is (lands at `.qfai/assistant/process/migrations/...`). Non-top-level `migrations` segments (e.g. `foo/migrations/bar.md`) explicitly fall through to the default `catalog/` layer so user docs are not pulled out from under their intended location. User docs whose filenames contain layer-relevant tokens (e.g. `agent-routing-notes.md`, `review-gate-overview.md`, `foo-migration-bar.md`, `quality-gate-summary.md`) are NOT mis-routed; previously the substring `.includes()` form would have pulled them into the canonical layers. This is a behavior change from the v1.9.0-alpha implementation; the unknown-stem fallback remains `catalog/` so unrouted user docs still land in a defensible default layer.
- Source: REQ-0001, REQ-0002, REQ-0008, REQ-0009, REQ-0011, REQ-0012, REQ-0013, REQ-0018, NFR-0001, NFR-0002

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
