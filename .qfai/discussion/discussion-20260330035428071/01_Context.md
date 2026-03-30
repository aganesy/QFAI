# 01_Context

## Metadata

| Key           | Value                                    |
| ------------- | ---------------------------------------- |
| Discussion ID | discussion-20260330035428071             |
| Date          | 2026-03-30                               |
| Owner         | user                                     |
| Source        | v1.7.7 Gap Analysis / v1.7.8 Design Spec |

## Goal and Completion Criteria

- Goal: QFAI v1.7.8 correction-and-convergence release により、本セッションで確定した canonical architecture へリポジトリを完全収束させる。
- Measurable completion criteria:
  1. UI-bearing discussion が design taste interview を必須ステップとして実行すること。
  2. UI-bearing discussion が trend/reference research を必須ステップとして実行すること。
  3. 3-layer evaluation architecture (invariant / trend-derived / product-specific) が唯一の canonical model であること。
  4. scoring-ready schema が全評価軸に適用されていること。
  5. UI/UX Implementation Strategy artifact が強化された universal schema を使用すること。
  6. screen contract schema が machine-readable な multi-screen 対応に強化されていること。
  7. UI-bearing detection が単一の共有モジュールに統一されていること。
  8. `qfai-prototyping` skill body が static-first mode architecture と一致すること。
  9. full-harness が実際のユーザー向けエントリポイントを持つこと。
  10. render evidence が実際の CLI パスに接続されていること。
  11. browser QA が実際の findings を生成すること。
  12. reviewer assets が taste/trend reflection をカバーすること。
  13. migration story が old/intermediate/final の3段階を明示すること。
  14. docs / changelog / steering が一貫した feature maturity 表現を使用すること。

## Stakeholders

- Primary stakeholders: QFAI フレームワーク開発者、QFAI 利用プロジェクト
- Secondary stakeholders: CI/CD パイプライン、Claude Code / GitHub Copilot 統合ユーザー

## Background

- Business context: v1.7.7 は v1.7.6 から明確に改善したが、本セッションで最終合意した canonical architecture には未収束。特に discussion-side の design taste interview / live trend research / 3層動的評価軸、および prototyping-side の static-first contract / real render evidence / real browser QA / true full-harness entrypoint が不完全。v1.7.8 はこれらの gap を解消する correction-and-convergence release である。
- Technical context: v1.7.7 Gap Analysis (20 gap items: G-01 ~ G-20) により、残存する不整合が4類型に分類された: (A) Discussion-side canonical architecture 未収束、(B) User-facing prototyping workflow 不整合、(C) Foundation-only 実装、(D) Repo-internal SSOT split。これらを14の deliverable (D-01 ~ D-14) として設計。
- Historical context: v1.7.6 → v1.7.7 correction release で UIX-VAL/UIX-REV 追加、mode resolver、precedence resolver 等が改善されたが、中間設計 (DDS hardening + 4-axis UIUX sidecar) に固定されたまま、later session で確定した 3-layer model / taste interview / dynamic trend research / scoring-ready rigor への収束が未完了。

## Inputs

- Existing repository facts:
  - v1.7.7 codebase (`QFAI-2-v1.7.7.zip` 監査済み)
  - 20 gap items (G-01 ~ G-20) with severity P0/P1/P2
  - 14 deliverables (D-01 ~ D-14) with acceptance criteria
  - 14 overall acceptance criteria for v1.7.8 completion
- External references: v1.7.7 Gap Analysis and v1.7.8 Design Specification (SRC-0001)
- Assumptions:
  - v1.7.8 は新しい思想を追加するのではなく、既に確定していた仕様へ repo を収束させる
  - 互換性影響は UI-bearing project の discussion/prototyping completeness expectation の厳格化が主
  - stale-asset / migration guidance を前提に段階的移行をサポートする

## Key Issues

- Issue 1: 3-layer model と既存 4-axis model の共存期間と migration path の設計
- Issue 2: full-harness entrypoint の実装範囲（dedicated skill vs CLI subcommand vs both）
- Issue 3: browser QA の MVP 範囲（smoke + visual minimum vs full 4-phase）
- Issue 4: non-UI project での新 validator over-fire 防止
