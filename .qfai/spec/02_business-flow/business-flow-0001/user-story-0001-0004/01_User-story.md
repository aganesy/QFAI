# US-0001-0004: Steering & Governance フレームワーク定義

## User Story

- Parent: CAP-0001
- Goal: 現行の constitution（Article I〜XI）と workflow（Stage 0〜7）を、配布される assistant rule の設計仕様として定義する
- Non-goals: A verbatim copy of each document (the SSOT is `.qfai/assistant/rule/constitution.md` and `workflow.md`)
- Notes: REQ-0009 準拠。統合元由来

## Legacy Source Scope

- In: v1421 layered spec-pack 構造（9 spec files + 10 \_policies files）、レイアウト検出ロジック、必須ファイルセット、
  ID フォーマットルール（US-XXXX-YYYY, AC-XXXX-YYYY, BR-XXXX-YYYY, EX-XXXX-YYYY, TC-XXXX-YYYY）、
  トレーサビリティ連鎖（discussion → specs → tests → code → verification）、参照方向ルール（upper-to-lower 禁止）、
  Escalation Hook メカニズム、Drift Protocol、Skill オーケストレーション設計契約、Steering & Governance フレームワーク
- In (story tree): the `.qfai/spec/` layout (the two tables, the policy, business-flow and contract layers, flow and
  story directories), the ID grammar, the chain BF → US → AC → EX ← BR, the test annotation layers, the mdschema
  entries for the tree, and the `rule/ skill/ agent/ prompt/` assistant tree
- Out: 個別 spec-XXXX の実装詳細、discussion-pack 構造（spec-0002）、CLI コマンド仕様、テストランナー実装

## Source Provenance

- Spec scope: `.qfai/evidence/migration-spec-to-story/retired/spec-0001/01_Spec.md#scope`
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0001/02_User-stories.md#us-0001-0009`
