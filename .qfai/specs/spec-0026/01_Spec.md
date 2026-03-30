# 01 Spec

- Spec: spec-0026
- Parent: CAP-0026

## Consumer View

- Primary SSOT for execution: `spec-0026/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In: uiux/ サイドカー11ファイルテンプレート作成、SKILL.md UI-bearing 検出・完了条件・サイドカー生成フロー更新、ダイレクトテンプレート置換 (03_Story-Workshop, 04_Sources, 14_Review-Request)、バッチ A/B コアテンプレートへの UX intent クロスリファレンス追加、init アセットパッケージング
- Out: deterministic validators (v1.7.4)、reviewer prompts (v1.7.4)、render/browser evidence (v1.8.0)、external critique provider (v1.8.1)、migration tooling (v1.7.4)

## Applicable NFR

- NFR-0026-0001: SKILL.md の指示が十分に明確で、generic fallback を防止する (must)
- NFR-0026-0002: サイドカー YAML スキーマが将来のバリデータとの後方互換性を維持する (must)
- NFR-0026-0003: サイドカー追加によるディスカッションオーサリング時間の増加が 30% 以下 (should)
- NFR-0026-0004: 変更後の全 init アセットが verify-pack に合格する (must)
- NFR-0026-0005: コア15ファイルパックと uiux/ サイドカーの責務境界が明確であり、コンテンツ重複がない (must)

## Applicable Policy

- 既存15ファイルコアパック構造を維持し、サイドカーはアディティブ追加
- Surface classification は surface type ベース（DR-0057）
- サイドカー verbosity は minimal-but-complete（DR-0056）
- External DB/API/UI contracts are intentionally `0 items`; rationale is fixed in `_policies/05_Contracts.md`
- 非 UI プロジェクトのパスは影響を受けない

## Evidence Summary

- Discussion: discussion-20260328120000000
- Review: (to be created in SDD review cycle)
- Validate: `.qfai/report/validate.log` (target: `error=0`)
- Coverage: `.qfai/report/specs-coverage/spec-0026.md`

## Relevant Requirements

- REQ-0026-0001: 11ファイル uiux/ サイドカーアーティファクトファミリーを init アセットに追加する
- REQ-0026-0002: SKILL.md に UI-bearing 検出・フロー分岐・完了条件を追加する
- REQ-0026-0003: 03_Story-Workshop, 04_Sources, 14_Review-Request テンプレートを置換する
- REQ-0026-0004: バッチ A/B コアテンプレートに UX intent クロスリファレンスを追加する
- REQ-0026-0005: surface type ベースの UI-bearing 検出を実装する (REMEDIATION v1.7.6: UI/UX Implementation Strategy に selection_required, candidate_options, chosen_option, verification_expectations, none-as-legitimate-outcome の5フィールドを必須化する)
- REQ-0026-0006: YAML ベースの implementation strategy アーティファクトを作成する
- REQ-0026-0007: invariant, trend-derived, product-specific の3層スコアリング軸を定義する
- REQ-0026-0008: 3軸を統合した aggregate scoring rules を定義する
- REQ-0026-0009: 構造化 option comparison フォーマットを作成する
- REQ-0026-0010: screen contracts の最小構造を定義する
- REQ-0026-0011: 非 UI プロジェクトが変更の影響を受けないことを保証する
- REQ-0026-0012: HTML/CSS mock をテンプレート内でプライマリからフォールバックに降格する

## Entry points

- US range in this spec: US-0026-0001..US-0026-0005 (US-0026-0005 added in v1.7.6 remediation)
- Primary actors: QFAI ユーザー（qfai-discussion 実行者）、QFAI パッケージメンテナー
- Notes: This spec introduces UI/UX authoring capabilities to qfai-discussion as additive sidecar artifacts and template modifications

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: サイドカーアーティファクトとコアパックの責務境界が不明確な場合
- Conflict: UI-bearing 検出ロジックが既存の v1.7.0 DDS バリデータと矛盾する場合
- Missing: 特定の surface type の分類基準が未定義の場合
- Trade-off: オーサリング摩擦削減 vs サイドカー完全性

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/05_Contracts.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
