# 01_Context

## Metadata

| Key           | Value                                             |
| ------------- | ------------------------------------------------- |
| Discussion ID | discussion-20260313143000000                      |
| Date          | 2026-03-13                                        |
| Owner         | user                                              |
| Source        | Feature request / QFAI skill pipeline improvement |

## Goal and Completion Criteria

- Goal: QFAI の下流スキル（`/qfai-prototyping`, `/qfai-atdd`）に Spec Diff Protocol（SDP）を導入し、`/qfai-sdd` による spec 更新後にインクリメンタルな実装・テスト生成を可能にする。
- Measurable completion criteria:
  1. 共通 Preflight Diff Protocol が定義され、下流スキルの SKILL.md に組み込まれていること。
  2. `/qfai-atdd` が変更された spec の missing/stale obligations のみを処理できること。
  3. `/qfai-prototyping` が変更された spec のスケルトンのみを更新できること。
  4. `/qfai-verify` は常にフルスキャンを維持すること。
  5. 差分検出は git diff + timestamp + delta.md パースの複合判定であること。

## Stakeholders

- Primary stakeholders: QFAI フレームワーク開発者、QFAI 利用プロジェクトの開発チーム
- Secondary stakeholders: CI/CD パイプライン、品質管理チーム

## Background

- Business context: 現在の QFAI スキルパイプラインでは、`/qfai-discussion` → `/qfai-sdd` で spec を更新した後、下流スキル（prototyping, atdd）を実行すると、変更の有無にかかわらず全 spec を再処理する。大規模プロジェクトでは仕様変更が一部の spec に限定されることが多く、全 spec の再処理は非効率かつ既存実装の不要な変更リスクがある。
- Technical context: 現在の各スキルは `spec-XXXX/01_Spec.md` を SSOT として読み込み、US/AC/BR/EX/TC の obligation をフルスキャンする。`09_delta.md` に変更履歴は記録されるが、スキル実行時に自動で差分検出する仕組みがない。ATDD のアノテーション（`QFAI:SPEC-XXXX:US-YYYY`）により実装状態の追跡は部分的に可能。
- Historical context: v1.5.3 で layered spec 構造が確立。v1.5.4 で symlink ベースのラッパーアーキテクチャに移行。v1.5.5 でインクリメンタル実装対応が求められている。

## Inputs

- Existing repository facts:
  - `.qfai/specs/` に `_policies/`（共有層）と `spec-0001` ～ `spec-0010`（10 spec）が存在
  - `.qfai/evidence/` に各スキル実行の evidence ファイルが蓄積されている
  - `packages/qfai/src/core/deltaV1.ts`（447行）が delta ファイルのパース機能を提供
  - `packages/qfai/src/core/atddTraceability.ts`（14KB）が ATDD アノテーションの追跡機能を提供
  - 各 SKILL.md は `.qfai/assistant/skills/qfai-*/SKILL.md` に格納
- External references: Git diff 仕様、QFAI change-classification.md
- Assumptions:
  - スキル実行環境は git リポジトリ内であることが多いが、必須ではない
  - evidence ファイルは前回実行の基点情報を保持できる
  - SKILL.md の改修のみで TypeScript コード変更は行わない

## Key Issues

- Issue 1: 下流スキルが spec 変更の有無を自動検出できず、毎回フルスキャンになる
- Issue 2: 既存実装/テストの「stale」判定（spec 変更により要更新）の仕組みがない
- Issue 3: `_policies` 変更時の影響波及（どの spec が影響を受けるか）の自動判定がない
- Issue 4: evidence ファイルに前回実行の基点情報（commit SHA 等）が記録されていない
