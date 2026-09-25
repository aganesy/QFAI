# 07 Decisions

## Decisions

32 items.

### DR-0003-0001: symlink ベースの統合方式

- 旧 commands/prompts のファイルコピー方式を廃止し、symlink ベースに移行した
- Why: skill 更新時にラッパー更新が不要（NFR-S0001）
- See also: ../\_policies/08_Decisions.md

### DR-0003-0002: instructions は create-only、`--force` のみ再生成

- Decision: `.github/instructions/` の 2 ファイルは `--force` なしでは create-only。`--force` 時は shipped テンプレートで再生成する
- Supersedes: 旧決定「`--force` でも上書きしない」（Source: 旧 spec-0017 DR-0022 through DR-0026）。当該記述は本決定により無効
- Context: これらは QFAI が著者のレビュー指針であり、テンプレート修正を導入済みプロジェクトへ届ける経路が存在しなかった
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

### DR-0003-0013: AC-0003-0039 cites a spec-local REQ-0032

- Status: superseded by DR-0003-0030
- Context: The AC Catalog's `Notes` column holds one spec-local REQ per criterion. The work-log removal answers three upstream requirements: `discussion-20260923060900824` REQ-0001, REQ-0006 and REQ-0010.
- Decision: Add REQ-0032 to `01_Spec.md` with the upstream ids in brackets, in the form REQ-0024..0031 use, and cite it from the catalog row. Record the upstream ids as the `# Source:` comment in the criterion's Gherkin block.
- Consequences: The catalog keeps one local id per row. The `# Source:` comment is the one provenance record, where the traceability reader looks for it.
- Related: AC-0003-0039, US-0003-0016

### DR-0003-0014: US-0003-0016 narrows to the four-layer seed

- Status: accepted
- Context: The story carried the assistant-tree seed (REQ-0018, AC-0003-0017) and the removed project-root seed. One of its non-goals named a frontmatter schema check that spec-0004 no longer has.
- Decision: Title the story "4-layer asset-tree seeding". The Goal names the four layers only, and the Notes cite REQ-0018 and REQ-0032. Drop the frontmatter-schema non-goal and keep the other two.
- Consequences: The E2E row TDD-0064 keeps `US-Refs: US-0003-0016`. It is still `todo`, so the narrower story owes it no reset.
- Related: US-0003-0016, TDD-0064
- Amended by: DR-0003-0030. The Notes cite REQ-0018 only, because REQ-0032 is removed.

### DR-0003-0015: AC-0003-0039 belongs to US-0003-0016

- Status: superseded by DR-0003-0030
- Context: The new criterion needs one parent story.
- Decision: Parent it on US-0003-0016. The criterion states the negative of the half that story lost, and the withdrawn schema sat in that story's `catalog/` layer.
- Consequences: No story is added, and the story range in `01_Spec.md` is unchanged.
- Related: AC-0003-0039

### DR-0003-0016: The absence criterion includes init's report

- Status: superseded by DR-0003-0030
- Context: Upstream REQ-0001 also names the `--force` NOTE wording, and REQ-0006 says a copy with no lock record stays.
- Decision: AC-0003-0039 and BR-0003-0049 require that init's report names no path under `.qfai/steering/`. The NOTE wording and the unrecorded copy get no criterion, because no upstream acceptance signal needs one.
- Consequences: The NOTE wording changes in the implementation without a spec row pinning it.
- Related: AC-0003-0039, BR-0003-0049

### DR-0003-0017: The withdrawn schema's retirement keeps its own rule and example

- Status: superseded by DR-0003-0030
- Context: `assistantAssetProvenance.test.ts` already tests the generic retire pass. It proves neither this file's withdrawal nor the edited-content note that upstream REQ-0006's acceptance names.
- Decision: Keep BR-0003-0050, EX-0003-0054 and TC-0003-0061. The rule states the general behaviour; the example is the concrete case of `catalog/worklog-entry.schema.md`.
- Consequences: Dropping them would change an approved APPEND row, which only the user can decide.
- Related: BR-0003-0050, EX-0003-0054, TC-0003-0061

### DR-0003-0018: TC-0003-0060 covers plain init and init --force

- Status: superseded by DR-0003-0030
- Context: Upstream REQ-0010's acceptance names `init --force`; its description says "with or without `--force`".
- Decision: TC-0003-0060 reads the directory after a plain run and after a `--force` run.
- Consequences: Each run has its own ledger row, so a regression on one path fails on its own.
- Related: TC-0003-0060, TDD-0096, TDD-0097

### DR-0003-0019: EX-0003-0053 uses a partial seed

- Status: superseded by DR-0003-0030
- Context: A fully seeded, unedited `.qfai/steering/` is left alone by create-only copying, so a test over it passes on the code that still seeds and could never fail first.
- Decision: The fixture holds an edited `README.md` and one adopter entry, with no `.gitkeep` and no `_templates/entry.md`.
- Consequences: The test fails while init still writes the two missing files, and passes once the seed is gone.
- Related: EX-0003-0053, TC-0003-0060

### DR-0003-0020: Six ledger rows for the three new test cases

- Status: superseded by DR-0003-0030
- Context: Each new test case has two parts that fail independently.
- Decision: Seed TDD-0094..TDD-0099, two rows per test case, each naming its part in `Boundary`.
- Consequences: A RED run observes each part, rather than stopping at the first failing assertion.
- Related: TC-0003-0059, TC-0003-0060, TC-0003-0061

### DR-0003-0021: Cells of the six new ledger rows

- Status: superseded by DR-0003-0030
- Context: The rows are ATDD-owned integration rows whose tests do not exist yet. They touch init's write set and the governed-asset lock.
- Decision: `Layer` Integration, `Tier` T2, `Test file` `-`, `Status` todo. `Owning module` is `packages/qfai/src/cli/commands/init.ts` for TDD-0094..0097 and `packages/qfai/src/core/governedAssistantManifest.ts` for TDD-0098..0099, as paths from the repository root.
- Consequences: `/qfai-atdd` writes the tests, and `/qfai-implement` fills `Test file` and `Selector` when it advances each row.
- Related: TDD-0094, TDD-0095, TDD-0096, TDD-0097, TDD-0098, TDD-0099

### DR-0003-0022: TDD-ID reservations sit after the ledger table

- Status: accepted
- Context: `validateTddList` reads the first table in the file as the ledger.
- Decision: Place `## TDD-ID reservations` after the ledger table and before the implementation notes, as a bullet list.
- Consequences: The ledger stays the first table in the file.
- Related: TDD-0022

### DR-0003-0023: Tier is seeded on new rows only

- Status: superseded by DR-0003-0030
- Context: Most rows in this ledger carry `-` in `Tier`. No Change Request asks for a re-derivation, and raising the tier of an untouched `done` row would reset it to `todo`.
- Decision: Seed `Tier` on TDD-0094..0099 only, and state the limit in the ledger notes of `09_delta.md`.
- Consequences: Rows seeded earlier keep `-`, which is read downstream as T1, until a Change Request re-derives them.
- Related: TDD-0094, TDD-0095, TDD-0096, TDD-0097, TDD-0098, TDD-0099

### DR-0003-0024: The TDD-0025 assertion on a removed symbol goes to /qfai-implement

- Status: accepted
- Context: Two tests of the `done` row TDD-0025 assert `joinProjectSteering`: `packages/qfai/tests/integration/initSpec0003.test.ts:256`, and `packages/qfai/tests/cli/init.test.ts:4120`, a string check on `init.ts`. Upstream REQ-0005 removes that symbol, and TC-0003-0025's obligation does not change.
- Decision: Name both lines as a `/qfai-implement` action in the ledger notes of `09_delta.md`. The row keeps its cells and is not reset; the ruling covers both tests.
- Consequences: Both assertions are removed in the implementation change that removes the symbol.
- Related: TDD-0025, TC-0003-0025

### DR-0003-0025: BR-0003-0050 cites CLI-INIT

- Status: superseded by DR-0003-0030
- Context: No contract describes the withdrawn-asset retire pass, and the contracts phase added no line for it.
- Decision: Set `Contract-Refs` to `CLI-INIT`, the contract of the command that runs the pass. The obligation-reconciliation phase records the lock hash as init's internal record of existing behaviour.
- Consequences: If that phase rules the hash must resolve to a contract field, the new line in `qfai-init.md` goes to the user.
- Related: BR-0003-0050

### DR-0003-0026: The recorded hash of BR-0003-0050 resolves through init's own record

- Status: superseded by DR-0003-0030
- Context: BR-0003-0050 deletes a withdrawn governed file under `--force` only while its content matches its recorded hash. No line of `qfai-init.md` names that record or the pass that retires withdrawn files. The contract speaks of a governed asset's receipt and its provenance classification (`qfai-init.md:150-152`, `:218-219`).
- Decision: Resolve the hash by a stated join, with no contract write. The receipt is the entry for the file in `.qfai/assistant/.assets.lock.json` (`ASSISTANT_ASSETS_LOCK_BASENAME` in `assistantAssetProvenance.ts`), which maps the file's path to the hash `init` last wrote. `retireWithdrawnGovernedAssets` in `init.ts` reads it, deletes a match, and emits the edited-content note for a mismatch. `catalog/worklog-entry.schema.md` is not in `ADOPTER_OWNED_ASSETS`, so the pass reaches it.
- Consequences: The rule is realized by existing behaviour of `qfai init`, and `qfai-init.md` gains no line. A line naming the lock would widen the approved contract edits, which is the user's decision.
- Related: BR-0003-0050, AC-0003-0039, CLI-INIT, DR-0003-0025. `09_delta.md` DL-0014.

### DR-0003-0027: BR-0003-0049 is realized by what init does not write

- Status: superseded by DR-0003-0030
- Context: BR-0003-0049 is a negative rule. `qfai init` creates, modifies and deletes nothing under `.qfai/steering/`, names nothing there in its report, and writes no work-log line into the instructions file. No contract line forbids those writes.
- Decision: Record the rule as realized by absence, with no contract write. The required outputs of `qfai-init.md` no longer name the directory. The report lists only what the run wrote (`written paths:`). The instructions text comes from `buildCopilotInstructions` in `init.ts`, whose lines the contract does not fix.
- Consequences: TC-0003-0059 and TC-0003-0060 hold the rule. Restoring a "must not touch" line in `qfai-init.md` would reverse an approved contract edit, which is the user's decision.
- Related: BR-0003-0049, AC-0003-0039, CLI-INIT. `09_delta.md` DL-0015.

### DR-0003-0028: The plan states the init part of the removal and cites spec-0004 for the order

- Status: accepted
- Context: The removal of `.qfai/steering/` spans six specs and lands as one change. Its order is driven by spec-0004's validators.
- Decision: `10_Plan.md` gets a subsection under `## Implementation approach` naming what leaves `init.ts` by symbol and what is reused unchanged, a subsection under `## Test approach`, and one risk row. It cites spec-0004's `10_Plan.md` for the order and does not restate it. Earlier sections of the plan are not re-audited or rewritten.
- Consequences: The change adds no architectural element, so the usage-reference check has nothing to count here. The init symbols are named, not given as line ranges, so the plan stays true as the file moves.
- Related: BR-0003-0049, BR-0003-0050, TC-0003-0059, TC-0003-0060, TC-0003-0061. `09_delta.md` DL-0016.
- Amended by: DR-0003-0030. The subsection under `## Test approach` now states that the removal adds no test.

### DR-0003-0029: The removal's tests build their own trees

- Status: superseded by DR-0003-0030
- Context: TC-0003-0060 needs a partly seeded `.qfai/steering/`. spec-0004's TC-0004-0074 and TC-0004-0076 need trees of their own under the same directory.
- Decision: Each test builds its own tree. No shared fixture or helper is planned.
- Consequences: The three trees differ, so there is no third identical caller for a shared fixture. Reusing a helper the suite already has is decided when the tests are written.
- Related: TC-0003-0060, TC-0004-0074, TC-0004-0076. `09_delta.md` DL-0017.

### DR-0003-0030: The work-log absence obligations are withdrawn

- Status: accepted
- Context: The user decided on 2026-09-25 that no test checks the work-log surface is gone, and that the withdrawn-asset mechanism stays generic with no exemption for the path. `CR-20260925-0010` records it, and its Triage group for this spec was approved at 2026-09-25T04:52:16Z. The production removal stays.
- Decision: Remove the spec-local REQ-0032, AC-0003-0039, BR-0003-0049, BR-0003-0050, EX-0003-0052..0054 and TC-0003-0059..0061. Delete ledger rows TDD-0094..TDD-0099 and tombstone each ID. US-0003-0016 cites REQ-0018 only. `01_Spec.md` therefore names none of the pack's REQ-0001, REQ-0006 and REQ-0010: REQ-0032 carried them, and the approved Triage group G1 withdraws it. They stay traceable through the 2026-09-23 Triage rows of `09_delta.md`. DR-0003-0013, DR-0003-0015..0021, DR-0003-0023, DR-0003-0025..0027 and DR-0003-0029 decided the withdrawn items and are superseded. DR-0003-0023 is in that set because every row it seeded is deleted.
- Consequences: `qfai init` writing nothing under `.qfai/steering/` is held by the code having no path to it (NFR-0006's search), not by a test. The generic retire pass keeps its tests in `packages/qfai/tests/core/assistantAssetProvenance.test.ts`. The two test files the rows named are deleted in the same change.
- Related: REQ-0032, US-0003-0016, AC-0003-0039, BR-0003-0049, BR-0003-0050, EX-0003-0052, EX-0003-0053, EX-0003-0054, TC-0003-0059, TC-0003-0060, TC-0003-0061, TDD-0094..TDD-0099, CR-20260925-0010. `09_delta.md` DL-0018.

### DR-0003-0031: [RE-OPEN] The withdrawn schema needs no rule of its own

- Status: re-open
- Context: DR-0003-0017 kept BR-0003-0050, EX-0003-0054 and TC-0003-0061 for `catalog/worklog-entry.schema.md`, and DL-0005 rejected relying on the generic retire-pass test "without the user's approval".
- Decision: What changed is the user's decision in `CR-20260925-0010`: the withdrawn schema is handled by the generic retire pass with no exemption, and its own tests go. The three items are removed, and `assistantAssetProvenance.test.ts` ("retires a governed file the installed release no longer ships") keeps the generic pass tested.
- Consequences: No test names the withdrawn schema.
- Related: BR-0003-0050, EX-0003-0054, TC-0003-0061, TDD-0098, TDD-0099, CR-20260925-0010. `09_delta.md` DL-0019.
- Re-opens: DR-0003-0017
- Approved by: user (Claude Code structured question)
- Approved at: 2026-09-25T04:52:16Z

### DR-0003-0032: [RE-OPEN] Neither init run is tested for the absent surface

- Status: re-open
- Context: DR-0003-0018 had TC-0003-0060 read `.qfai/steering/` after a plain run and after a `--force` run, and DL-0006 rejected leaving the plain run untested.
- Decision: What changed is the user's decision in `CR-20260925-0010`: no test asserts the surface is absent, for either run. TC-0003-0060 is removed with TDD-0096 and TDD-0097.
- Consequences: A regression that made init write under `.qfai/steering/` would have to add a path to `packages/qfai/src/**`, which NFR-0006's search reports.
- Related: TC-0003-0060, TDD-0096, TDD-0097, CR-20260925-0010. `09_delta.md` DL-0020.
- Re-opens: DR-0003-0018
- Approved by: user (Claude Code structured question)
- Approved at: 2026-09-25T04:52:16Z
