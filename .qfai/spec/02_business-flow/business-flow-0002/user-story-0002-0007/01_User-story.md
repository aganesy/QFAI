# US-0002-0007: 配布 workflow 所有権コントラクト

## User Story

- Parent: CAP-0003
- Goal: QFAI が adopter の workflows ディレクトリ配下で「自身が配布する `qfai-` prefix ファイルのみ」を所有することを、文書化かつテストされたコントラクトとして宣言する。write set は配布名リスト、prune set は過去配布名リストに由来し、provenance を overwrite / prune の前に参照することで adopter 作成ファイルと `declined` ファイルが構造的に守られる
- Non-goals: unconditional-overwrite refresh コマンドの動詞（上流 pack OQ-0021 で deferred、OQ-0003-0003 として mirror）、導入済みファイルの drift 検出（spec-0006 = `qfai doctor` が所有）、prefix glob による所有判定
- Notes: REQ-0030 を実装する。上流 pack REQ-0020 の shipped 半分 / OQ-0004, OQ-0020。`packages/qfai/src/cli/commands/init.ts` はルート asset を `force: false` かつ `conflictPolicy: "skip"` でハードコードして copy するため、`qfai init --force` は既に導入済みの workflow を決して更新しない。本 US は所有権の定義のみを与える

## Legacy Source Scope

- In: init コマンドの全機能（ディレクトリ生成、設定ファイル生成、symlink ベースのスキル/エージェント統合、旧ラッパー prune、git config 設定、copilot-instructions.md 生成、Copilot review instructions 配布、Codex サブエージェント TOML 統合、--force、--dry-run、レガシー退避、contracts/design/ ディレクトリ（v1.7.13 追加: design contracts 用）、ルート `.gitignore` の QFAI 管理ブロック追記と旧バージョンで追記されたレガシー行の自動移行（v1.7.18 追加））
- In (CHG-007 追加): 配布される GitHub Actions workflow テンプレート集 — `packages/qfai/assets/init/root/.github/workflows/**` の内容（hardening、action pin ポリシー、layer 分離、change detection、runner label 間接化、Node / package manager portability）と、`qfai init` が adopter の workflows ディレクトリに対して持つ所有権コントラクト（`qfai-` filename prefix、write set / prune set、provenance、`declined` 状態）、および配布 set に対する structural contract gate
- In (story tree): laying out `.qfai/spec/` and pointing the configured paths at it, leaving a spec-pack project to the migration skill, installing and linking `/qfai-migration-spec-to-story`, the `rule/ skill/ agent/ prompt/` assistant tree and its singular names, and the distributed-surface guards' story-tree ID shapes
- Out: validate/report/doctor/guardrails
- Out (CHG-007 境界): QFAI 自身の `.github/workflows/**`、ルート `scripts/**`、`packages/qfai/scripts/**`、`vitest.workspace.ts` は `toolchain` slice category（spec-0017 / CAP-0017）が所有する。境界は **配布されるか否か** であり、`package.json#files` に含まれないものは本 spec の対象外（\_policies/10_delta.md CHG-007 DR-0276）
- Out (CHG-007 境界): 導入済み配布 workflow の drift 検出（stale ファイルを名指しする advisory finding）は `qfai doctor` 側 = spec-0006 が所有する。本 spec は検出結果が依拠する所有権コントラクトの定義のみを持つ
- Out (CHG-007 境界): composite-action テンプレートの配布。`scripts/verify-pack.mjs` の `allowedRootGithubEntries` は配布 `.github/` の直下に `workflows` のみを許可し、`actions/` ディレクトリは hard pack failure になるため構造的に不可能

## Source Provenance

- Spec scope: `.qfai/evidence/migration-spec-to-story/retired/spec-0003/01_Spec.md#scope`
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0003/02_User-stories.md#us-0003-0027`
