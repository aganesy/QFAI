# 02 User Stories

## US Catalog

- US-0023-0001: UI-bearing pack detection - UI artifact presence triggers DDS validation automatically
- US-0023-0002: DDS section mandatory - UI-bearing packs require Design Direction Summary
- US-0023-0003: Option comparison validation - At least 2 design options compared
- US-0023-0004: Anchor screen selection - Selected anchor screen explicitly stated
- US-0023-0005: Competitive reference validation - 3 mandatory fields per competitive reference
- US-0023-0006: Review-Request design direction capture - Design direction decisions recorded in 14_Review-Request
- US-0023-0007: Delta log rejected visual directions - Rejected visual directions recorded in 99_delta
- US-0023-0008: SKILL.md update - SKILL.md updated with UI-bearing authoring requirements
- US-0023-0009: Explicit surface classification as primary SSOT for UI-bearing detection [remediation v1.7.7]
- US-0023-0010: Discussion skill teaches 3-layer model, not 4-axis [v1.7.11 WS-A]

## US-0023-0001: UI-bearing pack detection

- Parent: CAP-0023
- Source: discussion-20260325120000000, REQ-0001
- Goal: Pack author として、UI アーティファクトが含まれるパックを自動検出し、DDS 関連検証が自動適用されるようにしたい。UI-bearing パックに対してのみ設計方向の検証を実行し、非 UI パックへの影響を排除するため。
- Non-goals: Keyword-only detection, heuristic/aesthetic checks
- Notes: REQ-0001 準拠。Detection uses artifact/section presence (DR-0042)。REQ-0014 により non-UI packs remain unchanged

## US-0023-0002: DDS section mandatory

- Parent: CAP-0023
- Source: discussion-20260325120000000, REQ-0002
- Goal: Pack author として、UI-bearing パックに Design Direction Summary セクションが必須であることを保証したい。設計方向が明文化されていないパックがレビューに進むことを防ぐため。
- Non-goals: DDS content quality assessment
- Notes: REQ-0002 準拠。DDS is located in 03_Story-Workshop.md (DR-0043)。Validator: QFAI-DDP-019

## US-0023-0003: Option comparison validation

- Parent: CAP-0023
- Source: discussion-20260325120000000, REQ-0003
- Goal: Pack author として、2 つ以上の設計オプション比較が必須であることを保証したい。単一案のみの検討を防ぎ、意思決定の透明性を確保するため。
- Non-goals: Option quality or feasibility evaluation
- Notes: REQ-0003 準拠。Validator: QFAI-DDP-020

## US-0023-0004: Anchor screen selection

- Parent: CAP-0023
- Source: discussion-20260325120000000, REQ-0004
- Goal: Pack author として、選択されたアンカースクリーンの明示が必須であることを保証したい。レビュアーと実装者がどの画面を基準とすべきか明確にするため。
- Non-goals: Anchor screen design quality evaluation
- Notes: REQ-0004 準拠。Validator: QFAI-DDP-021

## US-0023-0005: Competitive reference validation

- Parent: CAP-0023
- Source: discussion-20260325120000000, REQ-0005
- Goal: Pack author として、競合参考 UI に adopted_points, rejected_points, local_translation の 3 フィールドが必須であることを保証したい。競合分析が形式的にならず実践的な学びを含むため。
- Non-goals: Competitive analysis depth or accuracy evaluation
- Notes: REQ-0005 準拠。3 mandatory fields (DR-0044)。Validator: QFAI-DDP-022

## US-0023-0006: Review-Request design direction capture

- Parent: CAP-0023
- Source: discussion-20260325120000000, REQ-0010
- Goal: Reviewer として、14_Review-Request に設計方向の決定記録があることを保証したい。レビュー時に設計意図の根拠を確認できるようにするため。
- Non-goals: Review-Request content quality assessment
- Notes: REQ-0010 準拠

## US-0023-0007: Delta log rejected visual directions

- Parent: CAP-0023
- Source: discussion-20260325120000000, REQ-0011
- Goal: Reviewer として、99_delta に拒否されたビジュアル方向が記録されていることを保証したい。なぜ代替案が却下されたかの経緯を将来参照できるようにするため。
- Non-goals: Rejected direction re-evaluation
- Notes: REQ-0011 準拠

## US-0023-0008: SKILL.md update

- Parent: CAP-0023
- Source: discussion-20260325120000000, REQ-0012, REQ-0013
- Goal: Skill maintainer として、SKILL.md が UI-bearing オーサリング要件で更新され、テンプレートファイルが assets/init/ で同期されていることを保証したい。新しいバリデーション要件をオーサリングガイダンスに反映するため。
- Non-goals: SKILL.md format redesign
- Notes: REQ-0012, REQ-0013 準拠。Same-changeset requirement (NFR-0005)

## US-0023-0010: Discussion skill teaches 3-layer model, not 4-axis [v1.7.11 WS-A]

- Parent: CAP-0023
- Source: v1.7.11 completion release, REQ-0001, REQ-0002, REQ-0003
- Goal: As a skill maintainer, I want SKILL.md completion conditions to reference the canonical 3-layer model instead of the legacy 4-axis model, so that discussion skill guidance is aligned with the current canonical model and does not perpetuate obsolete terminology.
- Non-goals: Rewriting the entire SKILL.md; changing non-completion-condition sections
- Notes: REQ-0001 removes 4-axis completion conditions. REQ-0002 adds canonical 3-layer completion conditions for UI-bearing path. REQ-0003 maintains non-ui path exemption from UI-bearing conditions. v1.7.11 WS-A scope.

## US-0023-0009: Explicit surface classification as primary SSOT for UI-bearing detection [remediation v1.7.7]

- Parent: CAP-0023
- Source: discussion-20260329195516830, REQ-0007
- Goal: As a QFAI user running validation, I want UI-bearing detection to use explicit surface classification as the primary SSOT with content signals as fallback only, so that detection is deterministic and consistent regardless of content variations.
- Non-goals: Removing content-signal heuristics entirely; changing existing DDS validation behavior
- Notes: REQ-0007-REM 準拠。Explicit surface classification takes precedence over content-signal heuristics (DR-0082). Only maintainers can override explicit surface classification (permission boundary). Reclassification takes effect immediately on next validation run.
