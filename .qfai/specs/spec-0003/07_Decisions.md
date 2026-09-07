# 07 Decisions

## Decisions

12 items.

### DR-0003-0001: symlink ベースの統合方式

- 旧 commands/prompts のファイルコピー方式を廃止し、symlink ベースに移行した
- Why: skill 更新時にラッパー更新が不要（NFR-S0001）
- See also: ../\_policies/08_Decisions.md

### DR-0003-0002: instructions は create-only、`--force` のみ再生成

- Decision: `.github/instructions/` の 2 ファイルは `--force` なしでは create-only。`--force` 時は shipped テンプレートで再生成する
- Supersedes: 旧決定「`--force` でも上書きしない」（Source: 旧 spec-0017 DR-0022 through DR-0026）。当該記述は本決定により無効
- Context: これらは QFAI が著者のレビュー指針であり、テンプレート修正を導入済みプロジェクトへ届ける経路が存在しなかった（Issue #749）
- Rationale:
  - `--force` なしでは従来どおり create-only なので、ローカル編集が黙って失われることはない
  - 同関数内の `copilot-instructions.md` / 統合 README は既に `--force` で再生成される。同じ配布物カテゴリの契約を揃える
  - 既存エントリが symlink の場合はリンク先ではなくエントリ自体を置換し、祖先 symlink 等でプロジェクト外へ解決する既存エントリは `--force` でも上書きしない（プロジェクト外の破壊を防ぐ）
- Source: SSOT は `packages/qfai/src/cli/commands/init.ts`（`syncIntegrationWrappers` Step 3.5）

### DR-0003-0003: Codex サブエージェントは静的配置

- `.codex/agents/*.toml` は init.ts の自動生成ロジックには含めず、リポジトリに静的配置する
- Why: Codex TOML は手動管理とし、init.ts の複雑性を抑制する
- Source: 旧 spec-0018 DR-0030
- Status: RE-OPENED — DR-0003-0012 が本決定を置き換える。静的配置前提の実装・レビューは DR-0003-0012 を参照すること

### DR-0003-0004: Agent symlink の自動 prune 非対応

- Agent symlink は自動 prune 対象外とする（suffix が統合先ごとに異なるため stale 検出が困難）
- Why: 誤削除リスク回避のため手動削除を要求する

### DR-0003-0005: README.md は通常ファイル維持

- 統合ディレクトリの README.md は symlink 化せず通常ファイルとして配置する
- Why: README は統合先ごとに内容が異なるため

### DR-0003-0007: `.qfai/review/review-*/` を default gitignore に変更 (v1.7.18)

- Decision: `qfai init` が追記する管理ブロックから `!.qfai/review/review-*/` および `!.qfai/review/review-*/**` の negation を削除し、review-pack を default gitignore 対象とする
- Context: 従来は review-pack サブディレクトリのみ `.qfai/review/*` の ignore から除外し、レビュー履歴を git に追跡させていた。一方で `.qfai/evidence/` と `.qfai/report/` は従来から gitignore 対象で、evidence/report を review pack 内へコピー保全する運用（`.qfai/review/review-*/evidence/`）に前提の歪みがあった
- Rationale:
  - 生成成果物を横断的に gitignore する方針に統一することで、リポジトリ肥大と誤コミットを防ぐ（OC-03 参照）
  - review-pack を共有したい場合はプロジェクト側で明示的な negation を追加する二段構造とし、default は保守的（ignore）にする
  - レガシーブロック（v1.7.17 以前）を持つ既存プロジェクトでも再 init で自動的に新形式に移行する（`QFAI_GITIGNORE_LEGACY_LINES` による migration ロジック）
- Source: SSOT は `packages/qfai/src/core/gitignore.ts`（`QFAI_GITIGNORE_BLOCK`, `QFAI_GITIGNORE_REQUIRED_ENTRIES`, `QFAI_GITIGNORE_LEGACY_LINES`）

### DR-0003-0006: TDD Ledger Backfill from Migrated Coverage (v1.7.15)

- Decision: TDD-0001..0015 のテストは既存実装 (v1.7.x) に対する backfill として Exception パターンで確定する
- Context: test-list.md は 06_Test-Cases.md から auto-generate された skeleton ledger で、Test file=TBD/Selector=migrated のまま放置されていた
- Rationale: init コマンドは tests/cli/init.test.ts で既に広範にカバー済み（空ディレクトリ初期化、冪等性、--force、--dry-run、symlink生成、レガシー退避、instructions配置）。tests/codex/agents.test.ts も TC-0003-0001..0009 をカバー。one-shot GREEN で exception に確定する

### DR-0003-0008: 配布 pin の可読 version は step name に置く (CHG-007)

- Decision: 配布 workflow の action pin は 40-hex SHA とし、可読 version は step `name:` に leading `v` **なし** で記載する。comment trailer には置かない
- Context: `packages/qfai/scripts/check-no-internal-version-leakage.sh` の `INTERNAL_VERSION_RE` は `\bv[0-9]+\.[0-9]+(\.[0-9]+)?\b` であり、comment 行を区別せず配布サーフェス全体に再帰 grep する。probe により、慣例的な `# v6.1.0` trailer は一致し、leading `v` を落とした同一テキストは一致せず、bare major tag 参照も一致しないことを確認済み
- Rationale: 可読性のために security guard を narrow するのは誤ったトレードである — 読めない pin が失うのは可読性だが、narrow した guard が失うのは invariant そのもの。配布側の綴りを変える方が損失が小さく、guard の breadth を 100% 維持できる
- Rejected: guard の pattern を QFAI-context 形式に narrow する
  - DO NOT: comment の都合で leakage guard の pattern を狭めない。Temptation: 「third-party の version 言及は QFAI 内部 version ではないので除外して当然」に見える
- Rejected: shell guard に既存 pragma を教える / 配布ツリー用 allow-list entry を追加する
  - DO NOT: 配布 pin のために pragma / allow-list を新設しない。Temptation: 既に pragma 機構が存在するので安く見える（実際には layer 1 の version 規則が配布 YAML に bind していないため、抑止対象の規則が存在しない）
- Rejected: trailer を諦めて bare SHA のみにする
  - Reason: bump owner が居ない状態で読めない pin だけを残すと drift が不可視になる。step name への移動で可読性を保てるため、諦める必要がない
- Residual: enforcement は pre-build 側に配布 YAML 専用規則として置く必要がある。`packages/qfai/scripts/lint-shipping.ts` は shipped-runtime 規則の適用前に YAML comment 行を skip するため、その skip を継承した規則は own-line trailer を永久に見ない。当該 script は `toolchain` slice（spec-0017）の所有物なので、本 spec は配布ファイル側の observable のみを assert する
- Source: 上流 discussion pack OQ-0003 / REQ-0015、DTC-2 / DTC-22 / DTC-27、CLI-WFSET §6

### DR-0003-0009: composite-action テンプレートは配布しない (CHG-007)

- Decision: adopter 向け composite-action テンプレートは配布しない。配布 `.github/` の直下 child は `workflows` のみに保つ
- Context: `scripts/verify-pack.mjs` の `allowedRootGithubEntries` は `workflows` のみを許可し、それ以外の immediate child では throw する。加えて asset test は名指しリストの deny-list を existence check の内側で行うため、`actions/` は asset test を通過しても pack 検証で落ちる
- Rationale: 構造的に不可能なだけでなく、composite action が採算に乗るのは refresh channel と所有権コントラクトが両方存在してからであり、本 release 時点ではどちらも無い。「テストを直せば通る」と誤解されないよう、asymmetry ごと記録する
- Rejected: asset test の deny-list を緩めて composite action を解禁する
  - DO NOT: asset test を直して composite action を解禁しようとしない。Temptation: 失敗しているのが asset test だけに見えるが、pack 検証は独立に throw するので何も解禁されない
- Source: DTC-1 / DTC-15、CLI-WFSET §8、上流 pack `05_Scope.md#Out of Scope`

### DR-0003-0010: 所有権コントラクトのみを定義し overwrite 動詞は持たない (CHG-007)

- Decision: 本 spec は配布 workflow の所有権コントラクト（`qfai-` prefix の reservation、write / prune set の由来、provenance、5-state enum、`declined` の copy 前除外、primitive 再利用）のみを定義する。unconditional-overwrite refresh コマンドは定義しない
- Context: `packages/qfai/src/cli/commands/init.ts` はルート asset を `force: false` かつ `conflictPolicy: "skip"` でハードコードして copy するため、`qfai init --force` は既に導入済みの workflow を決して更新しない。`force` が届くのは assistant skills ツリーと生成 wrapper のみ
- Rationale: adopter の CI ディレクトリへ書き込む経路は、所有権コントラクトが書かれてテストされる前に出荷してはならない。conflict policy が未決なのは 1 状態ではなく 2 状態（意図的に手編集された install 済みファイルと、install 後に削除された `declined` ファイル）であり、別 capability として分離する
- Rejected: detection と同一 cycle で refresh コマンドを出荷する
  - DO NOT: 所有権コントラクトの着地前に overwrite 経路を出荷しない。Temptation: 「adopter にも届ける」という要求の半分が detection だけでは満たされないので、まとめたくなる
- Note: create-only からの逸脱は architecture review により **narrowing（reversal ではない）** と裁定済み。記録済み決定の locus に配布 workflows ツリーは含まれず、その do-not は「生成ロジックを分散させないこと」であるため、primitive 再利用が acceptance criterion になることで唯一の該当条項が満たされる
- Source: 上流 discussion pack OQ-0004 / OQ-0020 / OQ-0021、DTC-4 / DTC-6、CLI-WFSET §4 / §8

### DR-0003-0011: `pruneMatchingEntries` を export し prefix 述語を渡さない (CHG-007)

- Decision: `packages/qfai/src/cli/commands/init.ts` の `pruneMatchingEntries` を module-private から export に変更する。workflows ディレクトリ向けに渡す predicate は `RETIRED_WORKFLOW_NAMES` の name-set membership とする
- Context: `pruneStaleQfaiWrappers` は 3 箇所の call site で `entry.name.startsWith("qfai-")` を使っている。それらが対象とするのは `.claude/commands/`、`.github/prompts/`、skill 統合ディレクトリ — いずれも中身全体を QFAI が所有する生成 wrapper ディレクトリである。workflows ディレクトリはそうではなく、adopter が著したディレクトリに QFAI が少数の named file を書き込む先
- Rationale: helper が module-private のままだと「refresh 経路は自前の copy / removal 呼び出しを持たない」という acceptance criterion の唯一の代替が再実装になり、criterion が構造的に充足不可能になる。export はその不可能性を除去する最小の変更
- Rejected: prefix 述語をそのまま workflows ディレクトリに転用する
  - DO NOT: `startsWith("qfai-")` を workflows ディレクトリの prune predicate に渡さない。Temptation: 既存 pruner と同形なので最も安く見えるが、adopter が先に著した `qfai-` 名のファイルを奪う
- Rejected: workflows 用に別の removal helper を書く
  - DO NOT: 並行 filesystem 実装を作らない。Temptation: 既存 helper を export したくない場合の最短経路に見える
- Source: CLI-WFSET §1 / §4、上流 pack REQ-0020、DTC-6

### DR-0003-0012: Codex サブエージェント TOML を init で自動生成する (RE-OPEN of DR-0003-0003 / \_policies DR-0030)

- Decision: `.codex/agents/<name>.toml` を `qfai init` が canonical agent markdown + `assistant/manifest/agent-catalog.yml#agents[].kind` から生成する。生成規約は `assistant/agents/**` と同一 — plain run は create-only、`--force` で再生成し、roster を外れた生成物は `--force` で prune する
- Context: DR-0003-0003 / DR-0030 は「静的配置 + 手動管理」を採用したが、その前提は「配布物が `.codex/agents/` を含む」ことだった。実際には `packages/qfai/assets/init/` に `.codex/agents/` は存在せず、`qfai init` を実行したプロジェクトは Claude / Copilot の agent wrapper だけを受け取り Codex は空のままだった。canonical agent の修正は symlink 経由で 2 統合に即時到達し、3 つ目には永久に到達しない
- Rationale:
  - TOML は symlink にできない（body を `developer_instructions` 文字列へ escape する必要がある）ため、「静的配置」は「手動同期」と同義であり、リポジトリ外では同期する主体が存在しない
  - 生成側に寄せることで canonical markdown が唯一の SSOT になり、3 統合の drift が構造的に消える
  - DR-0030 が挙げた「変換ロジックの複雑度」は `packages/qfai/src/core/codexAgentToml.ts` に閉じ込め、init.ts 側は step 6 の呼び出しのみとする
- Rejected: 配布 asset に `.codex/agents/*.toml` を静的同梱する（DR-0030 の原案を配布物まで延長する）
  - DO NOT: canonical markdown と TOML の二重管理を配布物へ持ち込まない。Temptation: 生成ロジックを書かずに済ませたい
  - Why rejected: 同梱 TOML は canonical markdown の snapshot であり、プロジェクト側で agent を追加・改稿した瞬間に古くなる。`--force` が再生成しない限り Codex だけが取り残される構造は解消しない
- Scope: 本リポジトリの `.codex/agents/*.toml` も本決定以降は生成物として扱う（`packages/qfai/tests/integration/codexAgentWrappers.test.ts` が generator 出力との byte 一致を検証する）
- Coverage: AC-0003-0037 / TC-0003-0055 / TDD-0057
