# 14_Review-Request — レビュー依頼

## Scope

- scope: `discussion-20260417072340789`
- layer: `discussion`
- review-pack: `review-20260417072340789`

## Target Files

- `.qfai/discussion/discussion-20260417072340789/01_Context.md`
- `.qfai/discussion/discussion-20260417072340789/02_Inception-Deck.md`
- `.qfai/discussion/discussion-20260417072340789/03_Story-Workshop.md`
- `.qfai/discussion/discussion-20260417072340789/04_Sources.md`
- `.qfai/discussion/discussion-20260417072340789/05_Scope.md`
- `.qfai/discussion/discussion-20260417072340789/06_REQ.md`
- `.qfai/discussion/discussion-20260417072340789/07_NFR.md`
- `.qfai/discussion/discussion-20260417072340789/08_Glossary.md`
- `.qfai/discussion/discussion-20260417072340789/09_Constraints.md`
- `.qfai/discussion/discussion-20260417072340789/10_Policy.md`
- `.qfai/discussion/discussion-20260417072340789/11_OQ-Register.md`
- `.qfai/discussion/discussion-20260417072340789/12_OQ-Resolution-Log.md`
- `.qfai/discussion/discussion-20260417072340789/13_Deferred.md`
- `.qfai/discussion/discussion-20260417072340789/14_Review-Request.md`
- `.qfai/discussion/discussion-20260417072340789/99_delta.md`

## Review Focus

- Correctness against source requirements（rev11 設計書との整合性）
- Consistency with upstream/downstream artifacts（rev10 との連続性）
- Testability and acceptance clarity（REQ ↔ AC の明確性）
- Operational and security risks（fail-closed ポリシーの網羅性）
- Mermaid diagrams are sufficient for decision-making quality (not only presence)
  - `02_Inception-Deck.md` の graph TB が public/internal/predicate/specCoverage の 4 層変化を正確に示しているか
  - `03_Story-Workshop.md` の flowchart が実装順序と WS 依存関係を正確に示しているか
  - Mermaid diagrams use ` ```mermaid ` fences only
- OQ register exit condition (open count = 0)
- Deferred items have full metadata in `13_Deferred.md`
- Non-UI classification confirmed (`ui_bearing: false`, `primary_surface: non-ui`)

## Architecture Review Scope

<!-- architecture-reviewer required: WS-1/WS-2/WS-3 は public surface・semantic predicate・テスト全般に影響する architecture-affecting 変更 -->

- `runMeasurement` / `validatePanelScore` の public → internal 変更が traceability chain に与える影響
- `isSpecDeclarationRef()` の predicate consolidation (refSemantics.ts SSOT) が他モジュールへの影響なく機能するか
- `specCoverage.ts` の `01_Spec.md` 限定スキャンが既存 integration test を破壊しないか
- 実装順序（refSemantics → specCoverage → panelScore → measurement → index → tests → README）の依存関係が正しく記述されているか

## Required Reviewers

- Resolve reviewers from `.qfai/assistant/steering/agent-routing.yml` and `.qfai/assistant/steering/review-profiles.yml`.
- `review_profile: requirements-heavy` → `always_required`: `completion-reviewer`, `requirements-reviewer`
- Architecture-affecting decisions exist (WS-1/WS-2: public surface + semantic contract changes) → add `architecture-reviewer`
- UI-bearing: false → `product-surface-reviewer` は不要
- Allowed verdicts: `PASS`, `FAIL`.

## RCP Rules (Mandatory)

- Any feedback triggers immediate return (`changes_requested`).
- After fixes, rerun only failed reviewers and reviewers whose scope changed because of the fix.
- Set `overall_status: PASS` only when all routed blocking reviewers are `PASS`, and no unresolved `FAIL` remains.
