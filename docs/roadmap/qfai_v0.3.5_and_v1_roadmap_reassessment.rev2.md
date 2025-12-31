# QFAI v0.3.5 計画再立案（rev2）＋ v1.0 までのロードマップ改訂案（rev2）

作成日: 2025-12-31 (JST)  
対象: QFAI v0.3.5 〜 v1.0  
入力（本セッション添付・既知の前提）:

- `qfai_v0.3.5_consistency_review_and_plan.rev1.md`（v0.3.5原案の整合性レビュー）
- `qfai_v0.3.4_design_and_plan_confirmed.md`（v0.3.4: “完全整合”パッチ方針）
- `qfai_v0.3.3_open_questions_remaining.rev2.md`（v0.3.3でOQ全解決宣言）
- `qfai_v0.3.2_open_questions_remaining.md`（v0.3.2時点の継続OQ）
- `qfai_v0.3.1_open_questions_decision_brief.md` / `qfai_v0.3.1_open_questions_resolution_proposals.rev1.md` / `qfai_v0.3.1_design_and_plan_confirmed.md`（OQ決定と確定計画）
- `qfai_v0.3.0_design_and_plan_confirmed.md`（v0.3.0確定計画）
- `qfai_handoff_04_roadmap_to_v1.0_updated.md`（v0.3〜v1.0ロードマップ最新版）

---

## 0. エグゼクティブサマリ（結論）

- v0.3.5（再立案）は、**PromptPack（カスタムプロンプト／役割定義／運用モード）のSSOT確立と運用手順の固定**にスコープを絞る。
- これにより、v0.3.1で決定済みの **OQ-018（doctor/sync/emitはロードマップ通りv0.9以降中心）** と矛盾しない。
- `emit / upgrade / doctor` を v0.3.5 に前倒しする案は、採用するなら **ロードマップ（v0.6/v0.9の定義）更新が必須**。現状は v0.4（Traceability最小チェーン検証）に集中するため、前倒しはしない。
- v0.3.3で **全OQは解決済み**であるため、v0.3.5以降の議論は「新規改善提案」として扱い、OQ番号の再導入（`OQ-xxx` 表記の混入）を避ける（v0.3.4方針と整合）。

---

## 1. v0.3系の意思決定（v0.3.5に影響する要点）

### 1.1 OQ-018（doctor/sync/emitの導入時期）

- v0.3.1で **案A（ロードマップ通り、v0.9以降中心）** を採用。
- v0.3.5で `emit / doctor` を実装する場合、計画の自己矛盾を避けるために **v0.9の定義変更**が必要。

**v0.3.5への反映**

- v0.3.5では CLI 追加（emit/doctor）は行わず、v0.9でのadapter/emit導入までの「SSOT整備」と「手順固定」を行う。

### 1.2 upgrade の位置づけ（v0.6の主要テーマ）

- ロードマップ上 `qfai upgrade` は v0.6 の主要テーマとして扱われている。
- v0.3.5で upgrade を導入するなら、v0.6の再定義（前倒し、またはv0.6を別テーマへ）が必要。

**v0.3.5への反映**

- v0.3.5は “アップグレード対象を明確にできるSSOT” を整備し、upgrade実装は v0.6に残す。

### 1.3 OQ-017（requirements→spec起こしの扱い）

- v0.3.xでは自動生成ツールは作らない（AI運用・プロンプト同梱へ寄せる）という整理が存在。
- v0.3.3時点でテンプレにプロンプト雛形等が同梱済み（validate対象外として運用）。

**v0.3.5への反映**

- PromptPackは require→spec を“自動化”せず、**運用の入口（プロンプト束の正本化）**として整備する。
- 既存の `.qfai/prompts/require-to-spec.md` 等は破壊的に移動せず、PromptPackから参照（リンク）する。

### 1.4 v0.3.4（完全整合パッチ）方針

- v0.3.4は挙動変更・検査強化を行わず、docs/テンプレ/メタの不整合を全撤去する。
- 代表例: PRテンプレ等から `OQ-*` の列挙を撤去し、現行仕様のチェックリストへ置換。`git grep "OQ-" == 0件` を推奨完了条件に含む。
  - ただし対象は「現行仕様として参照される場所」に限定する（例: `packages/qfai/assets/init/.qfai/`, `.github/PULL_REQUEST_TEMPLATE.md`, `README.md`, `packages/qfai/README.md`）。
  - 意思決定ログ/ロードマップ（例: `docs/roadmap/`）は対象外とし、履歴の削除を誘発しない。

**v0.3.5への反映**

- v0.3.5で追加する文書・テンプレにも `OQ-` 表記を混入させない（過去の議論が“現行仕様”に見えてしまう事故を防ぐ）。

---

## 2. v0.3.5 スコープ（改訂版）

### 2.1 v0.3.5 のゴール

- **PromptPack（SSOT）を init で同梱し、プロジェクト内で一貫管理できる状態**を作る。
- “AI実行環境の読む場所へ置く” は v0.9（emit/adapter）まで自動化しない代わりに、**手動反映手順をdocsで固定**する。
- v0.4以降で必要になる「互換維持 vs 変更」の判断、差分（delta）の残し方、トレーサビリティ運用を PromptPackの語彙で支える。

### 2.2 In scope（v0.3.5で実施）

1. **PromptPack v0.1 を init テンプレに追加**

- 生成先: `.qfai/promptpack/`
- 目的: 「AIに渡す入力束」の正本（SSOT）をプロジェクト内に確立

2. **運用ドキュメント `docs/promptpack.md` を追加**

- SSOT（PromptPack）概念
- カスタマイズ指針（どこまで変更してよいか）
- 手動配置（Copilot/Claude/Cursor等）手順（※自動化はしない）

3. **README/CHANGELOG の更新**

- “できること” に PromptPack（SSOT同梱）を追記（できないことは書かない方針を維持）
- v0.3.4の整合性方針と矛盾しない記述にする

4. **最小の回帰確認**

- initでPromptPackが生成されること
- 生成物が `qfai validate --fail-on error` をエラー0で通ること（既存ゲート維持）
- CI green（format/lint/type/test/verify-pack）

### 2.3 Out of scope（v0.3.5では実施しない）

- `qfai emit / upgrade / doctor` のCLI追加（ロードマップ通り v0.6 / v0.9へ）
- validate/traceabilityのルール強化（v0.4以降）
- requirements→spec の自動生成（OQ-017方針通り、運用とテンプレで支援）

---

## 3. PromptPack v0.1 仕様（v0.3.5で固定する最小契約）

### 3.1 ディレクトリ構造（提案・最小）

- `.qfai/promptpack/constitution.md`
- `.qfai/promptpack/steering/`
- `.qfai/promptpack/commands/`
- `.qfai/promptpack/roles/`（※ “agents” ではなく “roles” を正とする。将来の v0.9 emit/adapter で必要なら agent 表現へマッピングする）
- `.qfai/promptpack/modes/`
- （任意）`.qfai/promptpack/manifest.yaml`（構成と適用順の宣言。v0.9のemit実装で役に立つ）

### 3.2 内容（最小セットの要件）

**constitution.md（憲法）**

- 仕様・差分・トレーサビリティを最優先で読む（spec/scenario/delta/BR/SC）
- 変更は必ず delta へ記録し、互換維持/変更の分類を明示する
- validate を通すことを必須化する（“通らないなら仕様/運用が破綻している”と扱う）
- 不確実性（仮説/未確定/TODO）を残し方針を統一する

**steering（運用方針）**

- `compatibility-vs-change.md`（互換維持 vs 変更の運用ルール）
- `traceability.md`（参照の方向・粒度・禁止事項）
- `naming.md`（命名規約の要点・参照リンク）

**commands（作業コマンド）**

- `plan.md`（作業計画、確認観点）
- `implement.md`（実装の進め方：SDD×ATDD×TDDの順序）
- `review.md`（自己レビュー観点：Spec整合、テスト、影響範囲、差分の証跡）
- `release.md`（リリース時チェック：verify-pack/publish-dry-run 等）

**roles（役割定義）**

- `qa.md`（受入・逸脱検知）
- `spec.md`（仕様整合）
- `test.md`（テスト設計・回帰）
- ※ 実行環境の “サブエージェント機能” がなくても読める「観点の定義」として書く

**modes（状況モード）**

- `compatibility.md`（互換維持：最小変更、回帰最優先）
- `change.md`（仕様変更：delta必須、影響範囲整理とテストの増分設計）

### 3.3 既存資産との整合（v0.3.3同梱物を尊重）

- v0.3.3で同梱済みの `.qfai/prompts/require-to-spec.md` / `require/README.md` / `.qfai/rules/pnpm.md` は破壊的に移動しない。
- PromptPackから参照（リンク）し、「正本はどこか」「いつ使うか」を docs で明確化する。

---

## 4. v0.3.5 完了条件（DoD）

### 4.1 必須

- `qfai init` で `.qfai/promptpack/` が生成される
- PromptPack（constitution/steering/commands/roles/modes）が最小セットで揃う
- `docs/promptpack.md` が存在し、SSOT・カスタマイズ・手動配置手順が明文化されている
- CI green（format/lint/type/test/verify-pack）

### 4.2 推奨（ただし過剰な負荷増は避ける）

- initの生成物差分がレビューしやすい（ファイル数は必要最小）
- v0.3.4の整合性方針と矛盾しない（特に “OQ表記が混入しない”）

---

## 5. v1.0 までのロードマップ改訂（v0.3.5を反映）

> 原則方針: v0.3.5で “SSOT（PromptPack）を確立”、v0.6で “安全更新（upgrade）”、v0.9で “自動配置（emit/adapter）”。

リリース順序は **v0.3.4 → v0.3.5 → v0.4** を前提とする（v0.4へ進む前提の固定順序）。

### v0.3.4（並行）— v0.4前の“完全整合”パッチ

- docs/テンプレ/メタの不整合撤去（挙動変更なし）
- “読んでも迷わない” を最優先（`git grep "OQ-" == 0件` 等、適用範囲は現行仕様に限定）

### v0.3.5（本計画）— PromptPack SSOT確立（自動化なし）

- `.qfai/promptpack` 同梱 + docs整備（手動配置手順まで）
- v0.9のemit/adapterに繋がる “正本” を確立

### v0.4 — Traceability 検証（BR→SC→Test 最小チェーン）

狙い:

- 最小チェーンをCIで機械検証し、ドリフトを弾く（BR↔SC↔Test）
- `qfai report` で一覧（Markdown/JSON）を生成

設計論点（ロードマップ既存論点を維持）:

- “テストがSCを参照している” の判定方法（スキャン、メタ、命名、コメント埋め込み等）
- 言語/テストFW差分の扱い（v0.4で限定実装か、v0.9 adapterへ寄せるか）

**v0.4 Go/No-Go ゲート（標準判定ルール）**  
後述の「v0.4移行判定基準」を、以後の中間バージョンごとに必ず適用する。

### v0.5 — 契約（UI/API/DB）の厳密化（参照・孤立の検出）

狙い:

- 契約の孤立や、主要要素がBR/SCに紐づかない状態を検出し、仕様と実装の乖離を可視化する
- v0.4で確立した参照モデルと矛盾しない形で Contract の扱いを強化する

### v0.6 — アップグレード機構（安全更新）

狙い:

- テンプレ更新が前提の運用で “既存プロジェクトを壊さず更新” する導線を提供する

v0.3.5反映（ここで初めて機能実装として扱う）:

- 更新対象: `.qfai` 管理領域（rules/prompts/promptpack 等）
- **成果物（例: `.qfai/specs`）は絶対に上書きしない**（強制保護）
- `--dry-run` で差分可視化（必須）

### v0.7 — プロジェクトメモリ（steering）同期・更新

狙い:

- 複数プロジェクトで運用ルールがドリフトする問題を抑え、レビュー効率を上げる
- v0.3.5で導入した PromptPack（steering）を同期の中心に据える

### v0.8 — レポーティング強化（差分・監査向け出力）

狙い:

- 変更差分、欠けた参照、規約逸脱（delta未更新等）を中心とする監査向け出力を拡張する

### v0.9 — エージェント adapter / emit（カスタムプロンプトとサブエージェントの本格対応）

狙い:

- エージェント差分（Copilot/Codex/Claude等）を adapter で吸収
- `qfai emit --target <agent>` 等で、各エージェントが “読める場所/形式” に **PromptPack由来の資産**を出力
- 現状の `.qfai/prompts` 直置き問題の恒久解

### v1.0 — 安定版

到達条件（方向性）:

- フォーマット（spec/BR/SC/契約）標準化が安定し、CIで欠けが弾ける
- Traceabilityが監査可能に運用でき、アップグレード手順が確立
- adapter/emit により複数エージェントでも再現可能

---

## 6. v0.4移行判定基準（標準ゲート・最重要）

以後、各中間バージョン（v0.3.xパッチを含む）完了のたびに、必ずこのゲートで判定する。

1. **init生成物がデフォルトconfigで `qfai validate --fail-on error` をエラー0で通る**
2. **main/PRのCI（format/lint/type/test/verify-pack/publish-dry-run）が安定してグリーン**
3. **README/CHANGELOG/RELEASE/テンプレ/命名規約/スキーマが相互に矛盾せず、v0.3系フォーマット変更が不要（基盤凍結）と判断できる**
4. **既知の致命的不具合や高頻度誤検知が残っていない**
5. **v0.4スコープ（例: BR→SC→Test最小チェーン等）が現行の parse/ID モデル上に追加実装でき、v0.3基盤の作り直しを要しない**

いずれかが不成立の場合:

- v0.4へ進まず、**v0.3.x（パッチ）で“不成立要因のみ”を先に解消**してから再判定する。

---

## 7. 変更点（v0.3.5原案からの差分）

- **削除（v0.3.5ではやらない）**
  - `qfai emit / upgrade / doctor` の実装（ロードマップ整合のため v0.6 / v0.9へ戻す）
- **追加（v0.3.5で確実にやる）**
  - PromptPack（SSOT）の同梱と docs による運用手順固定（手動配置）
- **ロードマップ上の位置づけの明確化**
  - v0.6=安全更新（upgrade）
  - v0.9=自動配置（emit/adapter）
  - v0.3.5=それらの前提となるSSOT整備

---

## 8. 付録（将来の選択肢メモ: “emit-lite” を前倒しする場合）

- v0.3.5で emit を前倒し（たとえばCopilotのみ）することは可能だが、OQ-018とロードマップの再定義が必要。
- 現時点では v0.4の主題（Traceability最小チェーン）と優先度競合しやすいため、前倒しは採用しない。
