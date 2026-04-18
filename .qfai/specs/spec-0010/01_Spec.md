# 01 Spec

- Spec: spec-0010
- Parent: CAP-0010

## Consumer View

- Primary SSOT for execution: `spec-0010/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In:
  - `/qfai-discussion` unified discuss + require workflow
  - 15-file discussion pack generation (`01_Context.md` .. `14_Review-Request.md`, `99_delta.md`)
  - Core interview process (product concept, scope, stakeholders, constraints)
  - Inception Deck (10 questions, Mermaid diagram required)
  - Story Workshop (user stories, user flows, Mermaid diagram, HTML+CSS screen mock for UI)
  - Example Mapping with 6 mandatory perspectives (happy, negative, edge, permission, state transition, idempotency)
  - Source traceability (`SRC-XXXX` in `04_Sources.md`)
  - Requirements capture (REQ-0001 in `06_REQ.md`, NFR-0001 in `07_NFR.md`)
  - OQ Register with mandatory 11-column data model and OQ-driven exit (zero open count)
  - Deferred metadata with mandatory 11-column data model
  - Design Direction Pack (DDP) for UI-bearing projects
  - UI-bearing detection and 11-file uiux/ sidecar generation
  - Competitive Reference Registry with adopted/rejected/local_translation fields
  - Review Cycle Protocol (RCP) with 12-reviewer roster (10 standard + devils-advocate + pattern-doubler)
  - Drift Protocol enforcement
  - prototyping.yaml 生成（prototyping mode recommendation の構造化キャプチャ）
  - (v1.7.16) Step 11.3 Brand→Aesthetic Mapping による DESIGN.md 自律生成 — Phase A (brand 選定) + Phase B (customization)、出力先 `uiux/12_design_system.md`
  - (v1.7.16) Step 11.5 Trend→Axis derivation — UI-bearing 時に `04_Sources.md` Trend Scan から `21_design_eval_trend_derived.md` 評価軸を導出、ビジュアル系最低1軸必須
  - (v1.7.16) Sidecar Generation Flow 依存順序明示 — Step 1c（04_Sources Trend Scan）→ Step 1d（21_design_eval_trend_derived）、並列禁止
  - (v1.7.16) `references/design-md-brand-catalog.md` — 8 アーキタイプ × 代表ブランド × 美的特性カタログ
  - (v1.7.16) `templates/uiux/12_design_system.md` — DESIGN.md 形式 8 セクションテンプレート
  - (v1.7.16) `templates/04_Sources.md` evaluation_connection フィールド追加（全6ビジュアルカテゴリ）
  - (v1.7.16) `templates/uiux/21_design_eval_trend_derived.md` ビジュアル軸例示 + source_refs ガイダンス追加
- Out:
  - Editing `.qfai/specs/**` directly (belongs to `/qfai-sdd`)
  - Writing implementation-level details
  - Leaving open blockers hidden in free text

## Applicable NFR

- NFR-0001: OQ completeness -- `Disposition: open` count is zero at completion
- NFR-0002: Pack completeness -- all 15 mandatory files exist and are populated
- NFR-0003: Diagram requirement -- `02_Inception-Deck.md` and `03_Story-Workshop.md` each include at least one Mermaid diagram
- NFR-0004: Example Mapping coverage -- 6 perspectives per BR/AC candidate
- NFR-0005: DDP completeness -- UI-bearing packs include Design Direction Summary with all 6 subsections
- NFR-0006: Competitive references -- 3+ references with adopted/rejected/local_translation fields (UI-bearing only)
- NFR-0007 (v1.7.16): Backward compatibility — 既存 12 ファイル discussion pack および既存 prototyping.json を破壊しない。新フィールド（evaluation_connection 等）は任意拡張として追加し、未使用時もパース可能。新ルールは原則 WARNING 導入、次バージョンで ERROR 昇格の段階的移行（ただし T01/T02 は既存パック非影響のため ERROR 直接導入可）
- NFR-0008 (v1.7.16): AI-only operability — Brand 選定 / DESIGN.md カスタマイズ / 評価 / 反復の全工程が AI 自律実行可能。人間介入ステップを必須フロー内に含めない
- NFR-0009 (v1.7.16): Package independence — 改善は QFAI パッケージ自体（`packages/qfai/src/`, `skills/`）に閉じる。`.qfai/` 運用ディレクトリへの変更を含めない
- NFR-0010 (v1.7.16): Validate-speed budget — 新ルール追加による `qfai validate` 実行時間増加は既存 validate 時間の 20% 以内
- NFR-0011 (v1.7.16): Online premise — awesome-design-md エコシステム（npx getdesign@latest）はオンライン前提。オフラインフォールバックは実装しない
- NFR-0012 (v1.7.17): Guideline flexibility — 固定ルール集の押し付けを避け、project-specific library guideline を research 対象に含められる
- NFR-0013 (v1.7.17): Non-UI safety — non-ui discussion pack では design guideline research を要求しない

## Applicable Policy

- Policy: Drift Protocol mandatory
- Discussion artifacts are logs/rationale and must not duplicate spec SSOT
- Reviewer routing is fixed by `agent-routing.yml` and `review-profiles.yml`

## Evidence Summary

- Evidence: SKILL.md at `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/SKILL.md`
- Consolidates: old spec-0019 (DDP), spec-0020 (Navigation), spec-0021 (Render Critique), spec-0022 (Fidelity), spec-0025 (Design Audit)

## Relevant Requirements

- REQ-0001: Unified discussion workflow -- merge discuss and require into single 15-file pack with OQ-driven exit
- REQ-0002: Core interview -- product concept, scope, stakeholders, constraints capture
- REQ-0003: Inception Deck -- 10-question ambiguity removal with Mermaid diagram
- REQ-0004: Story Workshop -- user stories, flows, Mermaid diagram, HTML+CSS mock for UI
- REQ-0005: Example Mapping -- 6 perspectives per BR/AC candidate with seed capture
- REQ-0006: OQ Register -- 11-column data model, OQ-driven exit (zero open count)
- REQ-0007: Deferred metadata -- 11-column data model with severity, impact, mitigation
- REQ-0008: DDP authoring -- Design Direction Pack for UI-bearing projects (theme, mood, CTA hierarchy, anti-goals)
- REQ-0009: UI-bearing detection -- surface type classification (web, mobile, desktop, mixed, non-ui)
- REQ-0010: uiux/ sidecar generation -- 11-file sidecar for UI-bearing packs
- REQ-0011: Competitive Reference Registry -- 3+ references with adopt/reject/translation fields
- REQ-0012: RCP execution -- 12-reviewer roster (10 standard + devils-advocate + pattern-doubler)
- REQ-0013: Source traceability -- SRC-XXXX identifiers in `04_Sources.md`
- REQ-0014: Functional requirements -- REQ-0001 format in `06_REQ.md`
- REQ-0015: Non-functional requirements -- NFR-0001 format in `07_NFR.md` with measurable targets
- REQ-0016: prototyping.yaml 生成 — discussion-pack 完了時に prototyping.yaml（recommended_mode, rationale, allowed_modes, surface）を生成する。15 markdown ファイルとともに必須サイドアーティファクトとして扱う
- REQ-0017: Classification-Aware prototyping.yaml Requiredness (v1.7.14, DR-0110) — prototyping.yaml の必須性を classification に基づいて判定。ui_bearing=true のパックのみ prototyping.yaml を必須とし、ui_bearing=false（non-UI）のパックは prototyping.yaml 不要
- REQ-0018: Namespaced-Only Schema Mandatory (v1.7.14, DR-0112) — prototyping.yaml 生成時は必ず `prototyping:` namespaced block を使用。legacy top-level keys（recommended_mode 等をルートに配置）は生成禁止
- REQ-0019: Score Scope Annotation (v1.7.14) — discussion 3-layer scores は design direction quality を測定する旨を SKILL.md に明記。prototyping.yaml 生成時に `recommended_mode: full-harness` の場合は `iteration_expectations` ブロック（min_iterations, evaluation_axes_source, score_scope, note）を追加し、スコア射程の違いを明示
- REQ-0027: Design Guideline Research Step (v1.7.17) — UI-bearing のとき、Trend Scan 内で design guideline research を mandatory step として要求する
- REQ-0028: Trend Scan Guideline Category (v1.7.17) — `04_Sources.md` template に `design_guideline_research` category を追加し、guide name / rule refs / local translation を保持する
- REQ-0029: Quantitative Score Anchors Guidance (v1.7.17) — `21_design_eval_trend_derived.md` は `score_anchors` に quantitative proxy 必須を明記する

## Entry points

- US range in this spec: US-0010-0001..US-0010-0025
- Primary actors: QFAI user (product owner/developer), AI Agent (discovery-analyst, requirements-analyst)
- Notes: This is the entry point for new projects. Output feeds `/qfai-sdd`.

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: multiple valid implementations exist.
- Conflict: NFR / Policy / AC conflict.
- Missing: required constraints or policy are unclear.
- Trade-off: discussion depth vs time must be decided.

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
