# 02 User Stories

## US Catalog

- US-0014-0001: Unified Implementation Entry
- US-0014-0002: Execution Ledger
- US-0014-0003: Old Skill Removal
- US-0014-0004: Validator Phase 1
- US-0014-0005: Wrapper Synchronization

---

## US-0014-0001: Unified Implementation Entry

- Parent: CAP-0014
- Source: discussion-20260317102145554 Story 1
- Requirement: REQ-0001, REQ-0002, REQ-0006, REQ-0012, REQ-0013

**As a** QFAI user
**I want to** run a single `/qfai-implement` command that orchestrates the full TDD micro-cycle (Red/Green/Refactor)
**So that** I don't need to manually invoke separate `/qfai-tdd-red`, `/qfai-tdd-green`, and `/qfai-tdd-refactor` skills

- Goal: `/qfai-implement` が TDD マイクロサイクル（Red→Green→Refactor）を1テストずつ順次実行し、test-list.md の各アイテムを完了まで処理する
- Non-goals: 旧スキルとの互換レイヤー提供；GUI ベースの実行管理
- Notes: スキルボディに必須キーワード（"one test at a time", "failing test" 等）を含む。サブエージェント役割記述と並列化ポリシーを含む。

---

## US-0014-0002: Execution Ledger

- Parent: CAP-0014
- Source: discussion-20260317102145554 Story 2
- Requirement: REQ-0003, REQ-0009, REQ-0011

**As a** QFAI user
**I want to** have `test-list.md` under `.qfai/specs/spec-XXXX/tdd/test-list.md` that tracks my TDD progress per spec
**So that** I can see which items are done, which are in progress, and what remains to be implemented

- Goal: test-list.md を実行台帳として導入し、TDD-ID, TC-Refs, Layer, Test file, Selector, Status 等の必須列で進捗を管理する
- Non-goals: test-list.md のリアルタイム同期；Web ダッシュボードによる可視化
- Notes: `qfai init` がテンプレートから生成。`spec_required_files.json` に追加。ステータスライフサイクル: todo→red→green→refactor→done; any active→exception。

---

## US-0014-0003: Old Skill Removal

- Parent: CAP-0014
- Source: discussion-20260317102145554 Story 3
- Requirement: REQ-0001, REQ-0008, REQ-0010

**As a** QFAI maintainer
**I want to** completely remove the old `/qfai-tdd-red`, `/qfai-tdd-green`, and `/qfai-tdd-refactor` skills
**So that** there is no confusion about which workflow to use and no dead code remains

- Goal: 旧3スキルのボディ・ラッパー・参照をすべて削除し、grep ヒット = 0 を達成する
- Non-goals: 旧スキルの deprecation 期間提供（即時廃止）
- Notes: CHANGELOG やコードコメントの歴史的参照は非機能的参照として許容。Assets テストで再導入を検出。

---

## US-0014-0004: Validator Phase 1

- Parent: CAP-0014
- Source: discussion-20260317102145554 Story 4
- Requirement: REQ-0004, REQ-0005

**As a** QFAI maintainer
**I want to** validate `test-list.md` for structural integrity (file existence, table existence, required columns, valid status enum, TC reference existence)
**So that** malformed test-list.md files are caught early with clear error codes

- Goal: Phase 1 バリデータが5つの構造チェック（ファイル存在、テーブル存在、必須列、ステータス列挙値、TC参照存在）を実行し、明確なエラーコードを返す
- Non-goals: TC カバレッジチェック（Phase 2, v1.6.1）；Exception + DR-ID 整合性チェック（Phase 2, v1.6.1）
- Notes: バリデータ実行 < 5秒（NFR-0001）。エラーコード: TDDLIST_MISSING, TDDLIST_TABLE_MISSING, TDDLIST_REQUIRED_COLUMN_MISSING, TDDLIST_INVALID_STATUS, TDDLIST_UNKNOWN_REF。

---

## US-0014-0005: Wrapper Synchronization

- Parent: CAP-0014
- Source: discussion-20260317102145554 Story 5
- Requirement: REQ-0007, REQ-0008, REQ-0010

**As a** QFAI maintainer
**I want to** synchronize all wrapper configurations (`.agents`, `.claude`, `.codex`) to reflect the new skill structure
**So that** every tool entry point consistently references `/qfai-implement` and no longer references abolished skills

- Goal: 全ラッパーレイヤー（.agents, .claude, .codex）に qfai-implement エントリを追加し、旧スキルエントリを削除する
- Non-goals: ラッパー自動生成ツールの構築；新ラッパー形式への移行
- Notes: ラッパー同期はアトミックに実行。ワークフロードキュメント（workflow.md, .qfai/README.md, qfai-atdd ハンドオフ）も更新対象。
