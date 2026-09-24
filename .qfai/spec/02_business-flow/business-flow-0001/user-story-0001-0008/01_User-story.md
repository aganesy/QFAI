# US-0001-0008: ID grammar

## User Story

- Parent: CAP-0001
- Goal: On the story tree, define the seven ID shapes, where each ID is declared, how a child ID carries its parent's number, and how the next ID is chosen
- Non-goals: An ID allocation tool; renumbering during migration
- Notes: discussion-20260923063306456#REQ-0004, discussion-20260923063306456#DUS-001

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
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0001/02_User-stories.md#us-0001-0013`
