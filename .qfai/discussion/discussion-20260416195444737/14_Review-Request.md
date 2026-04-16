# 14_Review-Request — レビュー依頼 & ルーティング SSOT

---

## レビュー依頼概要

| 項目 | 内容 |
|---|---|
| Discussion ID | discussion-20260416195444737 |
| レビュープロファイル | `requirements-heavy` |
| 理由 | WS-1〜WS-4 がすべてコアアーキテクチャ（runtime / validator / test / docs）に影響するアーキテクチャ影響決定を含む |
| 依頼日 | 2026-04-16 |
| 有効期限 | SDD フェーズ開始前まで |

---

## レビュアールーティング SSOT 参照

- ルーティング定義: `.qfai/assistant/steering/agent-routing.yml` (`skill: qfai-discussion`, `phase: review`)
- プロファイル定義: `.qfai/assistant/steering/review-profiles.yml` (`profiles.requirements-heavy`)
- RCP フッタールール: `.qfai/assistant/skills/qfai-discussion/references/rcp_footer.md`

---

## レビュアールーティング

### 必須レビュアー

| レビュアーロール | 担当領域 | 確認項目 |
|---|---|---|
| **completion-reviewer** | WS 完了基準（DoD）の検証 | - REQ-0001〜REQ-0009 が DoD に対応しているか<br>- 各 WS の受け入れ基準が測定可能か<br>- `open` の OQ がゼロであることの確認<br>- DEF-0001 の暫定実装が REQ-0006, REQ-0007 を妨げないことの確認 |
| **requirements-reviewer** | REQ トレーサビリティの検証 | - REQ-0001〜REQ-0009 のすべてに SRC 参照があるか<br>- US（US-001〜US-005）と REQ のマッピングが完全か<br>- NFR-0001〜NFR-0004 が測定可能な目標を持つか<br>- OQ-0001〜OQ-0004 の解決内容が REQ と整合するか |

### 条件付きレビュアー

| レビュアーロール | 適用条件 | 担当領域 | 確認項目 |
|---|---|---|---|
| **architecture-reviewer** | **適用**: WS-1〜WS-4 がコアアーキテクチャに影響する決定を含むため必須 | アーキテクチャ整合性の検証 | - WS-1 の状態機械設計が既存の `fullHarness` 型定義と整合するか<br>- WS-2 の `readCanonicalScreenContracts()` → `buildScreenContractInputs()` の依存方向が正しいか<br>- WS-3 の `assertConcreteArtifactRefs()` の配置がモジュール境界を尊重しているか<br>- WS-4 の `declaredRef` 正規表現が `specCoverage.ts` と `execution.ts` で一元化されているか<br>- DEF-0001（`refSemantics.ts` 配置）の暫定インライン実装がアーキテクチャ上許容範囲か |

### 非適用レビュアー

| レビュアーロール | 非適用理由 |
|---|---|
| **product-surface-reviewer** | `ui_bearing: false`（non-UI パック）。ユーザー向け画面変更なし |

---

## レビュー対象ファイル一覧

| ファイル | 変更種別 | 主要レビュアー |
|---|---|---|
| `01_Context.md` | 新規 | completion-reviewer, requirements-reviewer |
| `02_Inception-Deck.md` | 新規 | completion-reviewer, architecture-reviewer |
| `03_Story-Workshop.md` | 新規 | requirements-reviewer |
| `04_Sources.md` | 新規 | requirements-reviewer |
| `05_Scope.md` | 新規 | completion-reviewer, requirements-reviewer |
| `06_REQ.md` | 新規 | requirements-reviewer, architecture-reviewer |
| `07_NFR.md` | 新規 | requirements-reviewer |
| `08_Glossary.md` | 新規 | requirements-reviewer |
| `09_Constraints.md` | 新規 | architecture-reviewer |
| `10_Policy.md` | 新規 | completion-reviewer |
| `11_OQ-Register.md` | 新規 | completion-reviewer, requirements-reviewer |
| `12_OQ-Resolution-Log.md` | 新規 | requirements-reviewer |
| `13_Deferred.md` | 新規 | architecture-reviewer |
| `14_Review-Request.md` | 新規 | completion-reviewer |
| `99_delta.md` | 新規 | completion-reviewer |

---

## 完了基準（レビュー承認条件）

1. completion-reviewer が REQ-0001〜REQ-0009 の DoD マッピングに承認を出した
2. requirements-reviewer が REQ / NFR / OQ のトレーサビリティを確認し承認を出した
3. architecture-reviewer が WS-1〜WS-4 のアーキテクチャ整合性を確認し承認を出した（または条件付き承認 + DEF-0001 の扱いを明示した）
4. `open` の OQ がゼロであることが確認された
5. 本ディスカッションパックのすべての 15 ファイルが存在することが確認された
