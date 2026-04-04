# 01 Spec

- Spec: spec-0002
- Parent: CAP-0002

## Consumer View

- Primary SSOT for execution: `spec-0002/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default
- 本 spec は discussion-pack 構造の定義仕様である。実装 SSOT は `packages/qfai/src/core/discussionPack.ts` および `packages/qfai/src/core/validators/discussionPack.ts`

## Scope

- In: 15 ファイル discussion-pack 構造、uiux/ サイドカー（11 ファイル; 3-layer canonical family）、UI-bearing 検出と DDS バリデータ、Review テンプレート、OQ Register、Deferred items、discussion-to-SDD ハンドオフ、3-layer 評価モデル（canonical; 旧 4-axis 完全削除）、scoring-ready schema、strategy artifact、screen contract、prototyping.yaml 必須サイドアーティファクト、missingSideArtifacts readiness field
- Out: spec-pack 構造（spec-0001）、CLI コマンド実装、ブラウザ QA、レンダリング証跡、旧 4-axis テンプレート（20*eval_axis*\*.md は active path から完全排除）

## Applicable NFR

- NFR-0001: Performance <=500ms delta
- NFR-0002: Backward compatibility（非 UI パックへの影響ゼロ）
- NFR-0003: Actionable error messages（3-part: field, why, how to fix）
- NFR-0004: 100% branch coverage for new validators
- NFR-0005: SSOT convergence（全アーティファクトが同一 canonical model を参照）

## Applicable Policy

- 既存 15 ファイルコアパック構造を維持、サイドカーはアディティブ追加
- Surface classification は surface type ベース
- Validators are pure async、No new runtime deps
- 非 UI プロジェクトへの影響ゼロ

## Evidence Summary

- Discussion: discussion-20260325120000000, discussion-20260328120000000, discussion-20260330035428071
- Validate: `.qfai/report/validate.log` (target: `error=0`)

## Relevant Requirements

- REQ-0001: 15 ファイル discussion-pack 必須構造（01_Context ~ 99_delta）
- REQ-0002: discussion-pack 命名規則（discussion-YYYYMMDDhhmmssSSS）
- REQ-0003: 最小コンテンツ要件（100 文字以上、見出しだけ不可、TBD/TODO 不可）
- REQ-0004: OQ Register（open OQ がゼロで exit）
- REQ-0005: Deferred items（deferred OQ は 13_Deferred.md に記載）
- REQ-0006: Mermaid diagram 必須（03_Story-Workshop.md）
- REQ-0007: UI-bearing 検出（surface classification ベース）
- REQ-0008: DDS（Design Direction Summary）セクション必須（UI-bearing パック）
- REQ-0009: DDS バリデータ 7 件（QFAI-DDP-019~025）
- REQ-0010: uiux/ サイドカー 11 ファイル構造（v1.7.12: 3-layer canonical family に置換）
- REQ-0011: 3-layer 評価モデル（invariant / trend-derived / product-specific）— v1.7.12 で唯一の評価モデル
- REQ-0012: scoring-ready schema（16 fields per axis）
- REQ-0013: strategy artifact（8 fields strong schema）
- REQ-0014: screen contract（10 fields, multi-screen）
- REQ-0015: design taste interview artifact（10 sections）
- REQ-0016: trend/reference research 必須フロー
- REQ-0017: discussion-to-SDD ハンドオフ
- REQ-0018: 旧 4-axis テンプレートファイル（20*eval_axis*\*.md）を active sidecar path から完全削除（D-004）
- REQ-0019: 00_index.md を 3-layer canonical sidecar file family に準拠した内容に書き換え（D-001）
- REQ-0020: prototyping.yaml 必須サイドアーティファクト — discussion-pack は 15 markdown ファイルに加えて prototyping.yaml を必須とする。missingSideArtifacts フィールドで欠落を報告
- REQ-0021: DDS バリデータ canonical コード移行 — 旧 QFAI-DDP-019~025 を UIX-VAL-DDH-* canonical コードに置換。sidecar-first 読み取り順序に変更

## Entry points

- US range in this spec: US-0002-0001..US-0002-0014
- Primary actors: Pack author, Reviewer, Skill maintainer, Discussion facilitator
- Notes: 旧 spec-0023（Discussion Design Hardening）、spec-0026（UIUX Authoring Foundation）、spec-0034（Discussion Canonical Architecture）を統合

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: UI-bearing 検出ヒューリスティックが不確定な結果を返す場合
- Conflict: 後方互換性と新バリデータ要件が矛盾する場合
- Missing: 特定の surface type の分類基準が未定義の場合
- Trade-off: バリデーション厳密性 vs 採用摩擦

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/05_Contracts.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
