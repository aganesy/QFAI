# 07 Decisions

## Decisions

- 13 decisions in this spec (all resolved at discussion gate).

---

## DEC-0013-0001: Design Token YAML 保存先

- Source OQ: OQ-0001
- Resolved: (2026-03-15)
- Decision: Case A — `.qfai/contracts/design/` に配置する
- Rationale: 既存 `contracts/` アーキテクチャ（ui/, api/, db/）と並列に配置することで SSOT を明確化する。discussion 段階では設計意図を `03_Story-Workshop.md` に記録し、SDD 以降で `contracts/design/` に正規化する。
- Alternatives rejected:
  - Case B (spec-XXXX/ 内同梱): spec 削除時に Token 定義が消失するリスク
  - Case C (ハイブリッド): SSOT が分散しトレーサビリティが低下する
  - Case D (discussion 中心): 下流 skill が参照する際の安定パスがない
- Impact: spec-0013 の実装はすべて `contracts/design/` を Design Token の正規保存先として前提とする

---

## DEC-0013-0002: ベストプラクティス/アンチパターン DB 保存方式

- Source OQ: OQ-0002
- Resolved: (2026-03-15)
- Decision: Case B — 永続保存しない。毎回の /qfai-discussion 実行時に最新情報を調査し、discussion-pack に記録する
- Rationale: UI/UX ベストプラクティスは時代とともに変化するため、固定的なルールセットに依存すると古い基準でレビューするリスクがある。都度調査することで常に最新の基準を適用できる。
- Alternatives rejected:
  - Case A (永続ファイル保存): 時代遅れのルールが蓄積するリスク
  - Case C (外部 DB 参照): ネットワーク依存・外部サービス依存が生じる
- Impact: BP/AP DB は discussion-pack スコープのみ有効。全プロジェクト共通の永続 BP/AP DB は構築しない

---

## DEC-0013-0003: HTML Mock 内の Design Token 参照方式

- Source OQ: OQ-0003
- Resolved: (2026-03-15)
- Decision: Case C — CSS custom property + コメントのデュアル方式
  - CSS custom property: `var(--token-name, fallback-value)` でブラウザ実行時の Token 参照
  - コメント: `/* token: {semantic.xxx} */` でトレーサビリティ確保
- Rationale: CSS custom property 単独ではコメントがないと Token 名とセマンティクスの対応が追いにくい。コメント単独では実際のブラウザレンダリングが壊れる。デュアル方式で両方の価値を実現する。
- Alternatives rejected:
  - Case A (CSS custom property のみ): トレーサビリティが低下する
  - Case B (プレースホルダコメントのみ): ブラウザでの直接プレビューが不可能
- Impact: BR-0013-0009, BR-0013-0010 の検証ルールとして反映

---

## DEC-0013-0004: UI/UX 調査のトリガータイミング

- Source OQ: OQ-0004
- Resolved: (2026-03-15)
- Decision: Case A — /qfai-discussion 実行時に自動トリガー
- Rationale: discussion 時点で対象プラットフォームと要件が明確になるため、このタイミングが最も適切。validate 実行時は頻度が高すぎて調査コストが上昇する。
- Alternatives rejected:
  - Case B (qfai validate 実行時): validate は頻繁に実行されるため過剰な調査コストが生じる
  - Case C (手動トリガーのみ): ユーザーが忘れるリスクがある
- Impact: AC-0013-0019, BR-0013-0036 として反映

---

## DEC-0013-0005: なぜ今作るか（Inception Deck）

- Source OQ: OQ-0005
- Resolved: (2026-03-15)
- Decision: Case D — 3 つの動機すべてを同等に重要とする
  - プロトタイプ品質向上
  - 包括性強化（ビジュアル・遷移・導線の定義体系）
  - 下流 skill 準備（prototyping / ATDD / TDD の消費プロトコル）
- Rationale: 3 つの動機は相互補完的であり、どれか 1 つだけを目的とすると残りの価値が損なわれる。
- Impact: 25 REQ の優先度付けと scope 設計に反映

---

## DEC-0013-0006: スコープ外項目

- Source OQ: OQ-0006
- Resolved: (2026-03-15)
- Decision: Figma/Sketch 連携とビジュアルリグレッションテストを v1.5.7 スコープ外とする
- Rationale: v1.5.7 は text-based・DOM-based のアプローチに集中する。画像比較が必要な施策は別バージョンで対応する。
- Impact: 05_Scope.md Out of Scope に反映。これらの機能に関する REQ/AC/BR は spec-0013 に含まれない

---

## DEC-0013-0007: トレードオフの優先順位

- Source OQ: OQ-0007
- Resolved: (2026-03-15)
- Decision: Case D — 正確性・柔軟性・整合性をトレードオフせず、すべて高水準で実現する
- Rationale: 実装コストは二の次。3 つの価値はすべて同等に重要であり、いずれか 1 つを犠牲にする設計は採用しない。
- Impact: NFR-0001（後方互換）、NFR-0002（拡張性）、NFR-0008（整合性）がすべて Must レベルで設定される根拠

---

## DEC-0013-0008: 対象プラットフォーム範囲

- Source OQ: OQ-0008
- Resolved: (2026-03-15)
- Decision: Case C — 固定せず、状況に応じて都度情報収集する設計。Web、Windows、Mobile、その他あらゆるプラットフォームに対応
- Rationale: 対象プロジェクトの技術スタックは事前に固定できない。都度調査する設計により将来の新プラットフォームにも対応可能。
- Impact: BR-0013-0007（platform 属性列挙値）で既知プラットフォームを列挙しつつ、未知プラットフォームは警告付きフォールバックで継続する設計に反映

---

## DEC-0013-0009: レビュー方式

- Source OQ: OQ-0009
- Resolved: (2026-03-15)
- Decision: Case B — 自動+手動ハイブリッド方式
  - 自動: qfai validate でルール化できる項目（Token 参照整合性、HTML 構文、コントラスト比等）
  - 手動: ui-ux-reviewer が主観的 UX 判断を担当
  - 矛盾時は手動レビューが優先
- Rationale: 効率性（自動）と網羅性（手動）を両立する。完全自動化では主観的 UX 判断が失われる。
- Impact: BR-0013-0028（auto_check フラグ）、BR-0013-0029（結果分離）、AC-0013-0013〜AC-0013-0014 に反映

---

## DEC-0013-0010: リスク識別

- Source OQ: OQ-0010
- Resolved: (2026-03-15)
- Decision: Case B — 既存体系との不整合を最大リスクとし、後方互換性を維持する拡張アプローチで対応
- Rationale: 既存 UI Contract YAML（CON-UI-XXXX）は多数の実プロジェクトで使用されているため、破壊的変更は即座に問題を引き起こす。
- Impact: NFR-0001（既存 UI Contract 後方互換性）が最優先 NFR として設定される。REQ-0016 は「拡張」のみ許可し「破壊的変更禁止」を明記

---

## DEC-0013-0011: 専門家サブエージェント責務境界

- Source OQ: OQ-0011
- Resolved: (2026-03-16)
- Decision: Case B — ゆるやかな分離。大枠で領域を分けるが重複する領域は複数の専門家が協調。統合レビュアーが最終調整
- Rationale: 4 専門家の領域（ユーザビリティ・デザイン・画面遷移・導線）は本質的に重複する部分がある（例: フォーム設計は UI/UX Expert とも Design Expert とも関連する）。完全分離は不自然な制約になる。
- Alternatives rejected:
  - Case A (明確分離): フォーム設計等の重複領域で専門家が孤立し品質低下
  - Case C (2 専門家に統合): 専門的観点の見落としリスクが増大
- Impact: BR-0013-0042（Collaboration Rules）、AC-0013-0024 に反映

---

## DEC-0013-0012: 専門家サブエージェント活動タイミング

- Source OQ: OQ-0012
- Resolved: (2026-03-16)
- Decision: Case C — 全フェーズ（discussion, SDD, prototyping, ATDD）で専門家が活動する
  - discussion: UI/UX 方針策定
  - SDD: 詳細定義
  - prototyping: 実装品質担保
  - ATDD: 検証品質担保
- Rationale: 早期フェーズのみの関与では後続フェーズでの品質担保ができない。全フェーズでの継続的な専門家関与が高品質な UI/UX を実現する。
- Impact: BR-0013-0041（Phase Activities 全フェーズ定義）、AC-0013-0023 に反映

---

## DEC-0013-0013: 統合レビュアーと review-roster の関係

- Source OQ: OQ-0013
- Resolved: (2026-03-16)
- Decision: Case B — review-roster に 13 番目として追加。既存レビュアーとは独立した統合評価を実施
- Rationale: 統合レビュアーは既存の ui-ux-reviewer（個別 UX 評価）とは異なる責務（4 専門家の成果物を統合的に評価・サービス全体の一貫性を評価）を持つ。既存体系を壊さず新機能として追加する。
- Alternatives rejected:
  - Case A (専門家フェーズ内二段階レビュー): 統合評価が内部化されて透明性が失われる
  - Case C (既存 ui-ux-reviewer を置き換え): NFR-0001 後方互換性違反
- Impact: BR-0013-0044（review-roster エントリ構造）、AC-0013-0026 に反映
