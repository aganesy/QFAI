# 01 Spec

- Spec: spec-0002
- Parent: CAP-0002

## Consumer View

- Primary SSOT for execution: `spec-0002/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default
- 本 spec は discussion-pack 構造の定義仕様である。実装 SSOT は `packages/qfai/src/core/discussionPack.ts` および `packages/qfai/src/core/validators/discussionPack.ts`

## Scope

- In: 15 ファイル discussion-pack 構造、uiux/ サイドカー（11 ファイル; 3-layer canonical family）、UI-bearing 検出と DDS バリデータ、Review テンプレート、OQ Register、Deferred items、`/qfai-sdd` への handoff 用 upstream design intent
  discussion-to-SDD ハンドオフ、3-layer 評価モデル（canonical; 旧 4-axis 完全削除）、scoring-ready schema、strategy artifact、screen contract、
  prototyping.yaml 必須サイドアーティファクト、missingSideArtifacts readiness field
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
- REQ-0010: uiux/ サイドカー 12 ファイル構造（v1.7.13: 10_strategy.md → 10_implementation_strategy.md リネーム、3-layer canonical family）
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
- REQ-0021: DDS バリデータ canonical コード移行 — 旧 QFAI-DDP-019~025 を UIX-VAL-DDH-\* canonical コードに置換。sidecar-first 読み取り順序に変更
- REQ-0022: 明示的 UI 分類ブロック — 01_Context.md に `ui_bearing`/`primary_surface`/`secondary_surfaces`/`classification_rationale` の構造化ブロックを必須とする。`detection/surfaceType.ts` が分類ブロック優先ルールで surface type を判定
- REQ-0023: サイドカーファイルリネーム（v1.7.13）— 10_strategy.md → 10_implementation_strategy.md、30_comparison.md → 30_option_comparison.md、40_contracts.md → 40_screen_contracts.md。バリデータはリネーム後のファイル名のみを期待
- REQ-0024: Upstream-only posture — `uiux/*.md` は discussion / SDD 用 authoring artifact であり、`/qfai-sdd` 以降の downstream execution truth ではない
- REQ-0025: Contract normalization handoff — `/qfai-sdd` は `uiux/12`, `20/21/22/23`, `30/31`, `40` を `.qfai/contracts/design/**` と `.qfai/contracts/ui/**` に正規化する
- REQ-0024: Surface Classification 二分割 (v1.7.14, DR-0110) — isDiscussionUiBearingPrototypingSurface()（web/mobile/desktop/cli/mixed）と requiresVisualBrowserEvidenceSurface()（web/mobile/desktop/mixed、cli 除外）を独立した判定関数として提供。cli は discussion UI-bearing だが browser evidence 義務は免除
- REQ-0025: Strategy Decision Canonical Vocabulary (v1.7.14, DR-0114) — strategy artifact の decision/chosen_option/candidate_options フィールドに canonical enum（template, component-library, design-system, native-pattern, bespoke, none）を導入。selection_required=true/false に対応する状態機械を強制
- REQ-0026: "selected anchor" Wording 正規化 (v1.7.14) — 全アーティファクトで "selected direction" → "selected anchor" に統一。DDH-SELECTED-DIRECTION → DDH-SELECTED-ANCHOR にエラーコード変更
- REQ-0027: Score Scope Separation (v1.7.14) — 3-layer evaluation aggregate scores は design direction quality（option 比較・選定）を測定するものであり、prototyping implementation fidelity scores とは異なる評価対象。aggregate テンプレート（23_design_eval_aggregate.md）に Score Scope Limitation セクションを追加し、prototyping scoringTrace へのコピーを明示的に禁止

## Entry points

- US range in this spec: US-0002-0001..US-0002-0014
- Primary actors: Pack author, Reviewer, Skill maintainer, Discussion facilitator
- Notes: 旧 spec-0023（Discussion Design Hardening）、spec-0026（UIUX Authoring Foundation）、spec-0034（Discussion Canonical Architecture）を統合
- Notes: current downstream truth は spec/contracts であり、discussion pack は `/qfai-sdd` の入力専用

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
