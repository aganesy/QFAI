# 09 Delta

## Change Summary

- Change ID: DELTA-0038-0001
- Date: 2026-03-30
- Primary: spec-0038 initial creation
- Tags: spec-auto-discovery, traceability-integrity, validate-extension
- Summary: Spec Auto-Discovery Protocol + Traceability Integrity Validator の初期spec作成

## Rationale

- spec-0011のPreflight Diff Protocol（SKILL.mdプロンプト改修のみ）の範囲外であるTypeScript実装、validate拡張、トレーサビリティ検証を新specとして独立
- 全エージェント共通で「specの指定が無いから作業できない」停止問題を解消

## Candidates Considered

1. spec-0011の拡張（Scope変更）
2. 新規spec-0038として独立

## Adopted

- Adopted: 新規spec-0038として独立
- Why: spec-0011はSKILL.mdプロンプト改修のみ（NFR-0002: TypeScriptコード変更なし）と明示的にスコープ定義済み。TypeScript実装とvalidate拡張はスコープ外
- Evidence: spec-0011/01_Spec.md Scope Out, discussion-20260330183225659

## Rejected

- Candidate: spec-0011の拡張（Scope変更）
- Reason: spec-0011のNFR-0002（SKILL.mdのみの改修）に矛盾する。既存のSpec-0011を変更すると下流影響が大きい
- DO NOT: spec-0011のスコープを拡張してTypeScriptコード変更を含めない
- Temptation: 「同じPreflight Diff Protocol」というテーマで1つのspecに統合したくなるが、責務分離が重要

## Impact

- Affects: packages/qfai/src/core/ (新モジュール追加), SKILL.md (prototyping/implement), qfai.config.yaml
- Validation: `qfai validate --fail-on error` 通過が必要

## Follow-ups

- TypeScript specDiffDetector モジュール実装
- TypeScript traceabilityValidator モジュール実装
- SKILL.md Spec Auto-Discovery Protocolセクション追加
- qfai validate パイプライン拡張
- Owner: development team
- Due: TBD (post-SDD)
