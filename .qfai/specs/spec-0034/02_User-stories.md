# 02 User Stories

## US Catalog

- US-0034-0001: Design Taste Interview 追加 (D-01)
- US-0034-0002: Trend/Reference Research 必須化 (D-02)
- US-0034-0003: 3-Layer Evaluation Architecture 収束 (D-03)
- US-0034-0004: Scoring-Ready Schema 強化 (D-04)
- US-0034-0005: Strategy Artifact 強化 (D-05)
- US-0034-0006: Screen Contract 強化 (D-06)

## US-0034-0001: Design Taste Interview 追加 (D-01)

- Parent: CAP-0034
- Goal: UI-bearing project の discussion で 9 セクションの design taste interview が必須ステップとして実行され、ユーザーの visual/emotional preference が artifact に明示的に記録される
- Non-goals: Non-UI project での taste interview 実行、taste interview の自動回答生成
- Notes: 9 sections: visual character, emotional tone, anti-preferences, admired/rejected references, novelty vs safety, density/hierarchy, motion/material, brand/tone, unresolved taste questions (REQ-0001, REQ-0002, REQ-0003)

## US-0034-0002: Trend/Reference Research 必須化 (D-02)

- Parent: CAP-0034
- Goal: UI-bearing project の discussion で trend/reference research が必須ステップとして実行され、session-specific な direction と freshness metadata が確保される
- Non-goals: Automated trend scanning via external APIs, trend data caching across sessions
- Notes: 04_Sources.md に trend scan summary, freshness metadata, reference confidence, source->translation mapping を含む (REQ-0004, REQ-0005)

## US-0034-0003: 3-Layer Evaluation Architecture 収束 (D-03)

- Parent: CAP-0034
- Goal: 評価軸モデルが invariant / trend-derived / product-specific の 3-layer に統一され、validators / reviewers / calibration / migration が一つの canonical model で動作する
- Non-goals: 4-axis model の即時削除 (migration window 内は共存)、新しい評価軸の追加
- Notes: Legacy 4-axis (usability/consistency/accessibility/delight) は deprecation path を経由 (REQ-0006, REQ-0007). Migration: v1.7.8 warning, v1.8.0 error (AD-003)

## US-0034-0004: Scoring-Ready Schema 強化 (D-04)

- Parent: CAP-0034
- Goal: 全評価軸が scoring-ready schema (16 fields) を持ち、reviewer interpretation drift を防ぎ、calibration が機能する
- Non-goals: Automated scoring execution, score-based gating in v1.7.8
- Notes: 16 fields enforced per axis. Aggregate scoring rules defined (REQ-0008, REQ-0009). NFR-0010 applies

## US-0034-0005: Strategy Artifact 強化 (D-05)

- Parent: CAP-0034
- Goal: UI/UX Implementation Strategy artifact が strong universal schema (8 fields) を使用し、explicit comparison / selection / verification expectations が保証される
- Non-goals: Automatic strategy selection, runtime strategy enforcement
- Notes: Weak schema (surface_type/approach/rationale) は migration window 内 warning (REQ-0010, REQ-0011). AD-004

## US-0034-0006: Screen Contract 強化 (D-06)

- Parent: CAP-0034
- Goal: Screen contract が machine-readable な multi-screen 対応 schema (10 fields) を持ち、multi-screen validation と structured evidence mapping が可能になる
- Non-goals: Runtime screen contract enforcement, screen rendering validation
- Notes: 10 fields per screen entry. Multi-screen as array of screen objects (REQ-0012, REQ-0013)
