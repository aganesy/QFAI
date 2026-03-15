# 09 Delta

## Change Summary

- Change ID: DELTA-0013-0001
- Date: 2026-03-16
- Primary: CAP-0013 UI/UX 定義・レビュー体系 新規作成
- Tags: v1.5.7, UI/UX, Design Token, HTML Mock, Expert Sub-agents
- Summary: UI/UX definition framework with Design Token + HTML Mock + Mermaid Flow 3-set, best practice/anti-pattern system, expert sub-agents with Research-First Protocol

## Rationale

- discussion-20260315080059347 で全 13 OQ resolved
- 25 REQ, 12 NFR をカバーする spec-0013 を新規作成

## Candidates Considered

1. OQ-0001: Design Token SSOT 配置先 — contracts/design/ vs spec 内同梱 vs ハイブリッド vs discussion 中心
2. OQ-0002: ベストプラクティス/アンチパターン保存方針 — 永続ファイル保存 vs 毎回調査 vs 外部 DB 参照
3. OQ-0003: HTML Mock の Token 参照方式 — CSS custom property のみ vs コメントのみ vs デュアル方式
4. OQ-0004: UI/UX 調査トリガー — /qfai-discussion 実行時 vs validate 時 vs 手動のみ
5. OQ-0005: 3 つの動機の優先順位 — 同等 vs 個別優先付け
6. OQ-0006: Figma 連携・ビジュアルリグレッションの v1.5.7 IN/OUT — OUT vs 一部 IN vs すべて IN
7. OQ-0007: Design Token / HTML Mock / Mermaid Flow のトレードオフ — すべて高水準 vs 個別優先付け
8. OQ-0008: プラットフォーム対応範囲 — 非依存・都度調査 vs Web のみ vs Web+Mobile
9. OQ-0009: バリデーション自動化範囲 — 自動+手動ハイブリッド vs 完全自動 vs 手動中心
10. OQ-0010: 最大リスク特定 — 既存体系との不整合
11. OQ-0011: 専門家サブエージェント責務境界 — ゆるやかな分離 vs 明確分離 vs 2 専門家に統合
12. OQ-0012: 専門家サブエージェント活動フェーズ — 全フェーズ vs discussion のみ vs discussion+SDD
13. OQ-0013: 統合レビュアー統合方法 — review-roster 追加 vs 二段階レビュー vs ui-ux-reviewer 置き換え

## Adopted

- Adopted: Design Token SSOT を contracts/design/ に配置
- Why: 既存 contracts 体系（ui/api/db）との整合性。SSOT が明確。validate で自動検証可能。
- Evidence: discussion-20260315080059347 OQ-0001

- Adopted: ベストプラクティス/アンチパターンは永続保存しない（毎回調査）
- Why: 時代遅れの固定ルールに依存しない柔軟性。最新情報を常に反映。
- Evidence: discussion-20260315080059347 OQ-0002

- Adopted: HTML Mock の Token 参照はデュアル方式
- Why: CSS custom property でトレーサビリティ + コメントで可読性の両立。
- Evidence: discussion-20260315080059347 OQ-0003

- Adopted: UI/UX 調査は /qfai-discussion 実行時にトリガー
- Why: ディスカッション時点で最新情報が必要。プラットフォーム検出と連動。
- Evidence: discussion-20260315080059347 OQ-0004

- Adopted: 3 つの動機すべて同等に重要
- Why: 相互補完的な動機を優先順位付けする必要なし。
- Evidence: discussion-20260315080059347 OQ-0005

- Adopted: Figma 連携・ビジュアルリグレッション OUT
- Why: v1.5.7 は text-based・DOM-based に集中。
- Evidence: discussion-20260315080059347 OQ-0006

- Adopted: トレードオフせずすべて高水準
- Why: 実装コストは二の次。品質を妥協しない。
- Evidence: discussion-20260315080059347 OQ-0007

- Adopted: プラットフォーム非依存・都度調査設計
- Why: 柔軟性を最大化。固定ルールに依存しない。
- Evidence: discussion-20260315080059347 OQ-0008

- Adopted: 自動+手動ハイブリッドレビュー
- Why: 効率性と網羅性の両立。
- Evidence: discussion-20260315080059347 OQ-0009

- Adopted: 既存体系との不整合が最大リスク
- Why: 拡張のみ、破壊的変更禁止で対応。
- Evidence: discussion-20260315080059347 OQ-0010

- Adopted: 専門家サブエージェント: ゆるやかな責務分離
- Why: 完全分離より協調を重視。重複領域は複数専門家が協調。
- Evidence: discussion-20260315080059347 OQ-0011

- Adopted: 専門家サブエージェント: 全フェーズ活動
- Why: discussion〜ATDD の全フェーズで専門家の関与を最大化。
- Evidence: discussion-20260315080059347 OQ-0012

- Adopted: 統合レビュアー: review-roster 13 番目に追加
- Why: 既存レビュー体制への追加で最もシンプルに統合。
- Evidence: discussion-20260315080059347 OQ-0013

## Rejected

- Candidate: Design Token を spec 内に同梱
- Reason: SSOT が分散し、複数 spec 間で Token の一貫性が保てない。validate での参照が複雑化。
- DO NOT: Token を spec dir に置く。
- Temptation: 1 spec で完結させたい欲求

- Candidate: ベストプラクティスの永続ファイル保存
- Reason: 時代遅れのルールに依存するリスク。更新の運用コストが高い。
- DO NOT: 固定ルールファイルに依存する。
- Temptation: 毎回調査が面倒

- Candidate: ビジュアルリグレッションテスト（v1.5.7）
- Reason: スクリーンショット比較は別施策。DOM ベース検証に集中。
- DO NOT: v1.5.7 でスクリーンショット比較を実装する。
- Temptation: 視覚的な品質保証

- Candidate: 特定プラットフォーム限定対応
- Reason: 柔軟性が失われる。特定 FW/OS に最適化すると他への対応が困難になる。
- DO NOT: 特定 FW/OS に最適化する。
- Temptation: 特定 PF への最適化による短期成果

- Candidate: 専門家責務の明確分離
- Reason: 完全分離では重複領域（フォーム設計等）のカバーが困難。協調の方が柔軟。
- DO NOT: 4 専門家の責務を完全分離する。
- Temptation: 明確な責務境界による単純化

- Candidate: 専門家を 2 名に統合
- Reason: 4 専門領域はそれぞれ十分な深さを持つため、統合すると専門性が薄まる。
- DO NOT: 専門家の数を減らす。
- Temptation: 管理コスト削減

- Candidate: 専門家を discussion のみに限定
- Reason: SDD/prototyping/ATDD での品質担保が手薄になる。
- DO NOT: SDD/prototyping/ATDD で専門家を除外する。
- Temptation: 工数削減

- Candidate: 統合レビュアーで既存 reviewer を置き換え
- Reason: 既存レビュアーの専門性が失われる。統合評価と既存評価は補完的。
- DO NOT: frontend-reviewer を統合レビュアーに置き換える。
- Temptation: レビュアー数の削減

## Impact

- Affects: packages/qfai/src/core/validators/, .qfai/contracts/design/, .qfai/assistant/agents/
- Validation: qfai validate --fail-on error must pass

## Follow-ups

- spec-0013 全ファイルの実装完了確認
- Owner: aganesy
- Due: v1.5.7 release
