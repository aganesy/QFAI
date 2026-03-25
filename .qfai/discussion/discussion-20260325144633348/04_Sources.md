# 04_Sources

## Source Registry

| SRC-ID | Title | Type | Location | Retrieved | Notes |
| --- | --- | --- | --- | --- | --- |
| SRC-0001 | qfai_v1.7.1_render_evidence_automation_design.md | primary | `C:\Users\YusukeSenaga\Downloads\qfai_v1.7.1_render_evidence_automation_design.md` | 2026-03-25 | v1.7.1 の design memo。render capture / validation / docs / tests の主根拠 |
| SRC-0002 | QFAI discussion pack format SSOT | primary | `.qfai/discussion/README.md` | 2026-03-25 | 15 ファイル固定構成、discussion pack の責務分離 |
| SRC-0003 | QFAI spec format SSOT | primary | `.qfai/specs/README.md` | 2026-03-25 | discussion から spec へ渡す前提構造の確認用 |
| SRC-0004 | QFAI evidence format SSOT | primary | `.qfai/evidence/README.md` | 2026-03-25 | evidence の命名、minimum content、uiFidelity 補足の確認用 |
| SRC-0005 | QFAI review roster SSOT | primary | `.qfai/assistant/steering/review-roster.yml` | 2026-03-25 | review cycle の固定 roster と can_be_na ルール |
| SRC-0006 | qfai-discussion RCP footer SSOT | primary | `.qfai/assistant/skills/qfai-discussion/references/rcp_footer.md` | 2026-03-25 | review cycle の固定運用ルール |
| SRC-0007 | Test layers policy | primary | `.qfai/assistant/steering/test-layers.md` | 2026-03-25 | reviewer が確認すべき test-layer 観点 |
| SRC-0008 | Existing discussion pack baseline | secondary | `.qfai/discussion/discussion-20260325120000000/` | 2026-03-25 | v1.7.0 pack の書式と review 成果物の参考 |

## Source Notes

- v1.7.1 の discussion は render capture を中心に、capture / skipped / failed の扱いを structured で定義する。
- design memo は browser QA の full audit を明確に out-of-scope としている。
- `04_Sources.md` は later phase で traceability の basis になるため、この段階では source traceability の骨格を固める。

## Competitive Reference Registry

### Existing prototypingEvidence.ts

- adopted_points: captured / skipped / failed の状態差分と file existence check の考え方
- rejected_points: markdown-only evidence を唯一の一次ソースにする前提
- local_translation: `renders[]` を追加し、既存の evidence validator に render bundle を自然接続する

### Existing renderCritique.ts

- adopted_points: legacy markdown critique を互換レイヤとして残す方針
- rejected_points: critique markdown を hard dependency にする方針
- local_translation: render evidence があるときだけ viewport existence の一次ソースに使い、markdown-only project は壊さない

### Vercel deployment/log UX

- adopted_points: operational state にだけ色を使う方針、status と next step の近接配置
- rejected_points: deploy dashboard 的な高密度メトリクス、装飾的 status chip の多用
- local_translation: render evidence summary では captured/skipped/failed を即読できるが、色数は増やしすぎない

## Work Orders Summary

| Step | Role (sub-agent) | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ---------- | ------------ | ------------- | -------------------- |
| 1 | worker | Source registry first draft | design memo, SSOT docs, baseline pack | `04_Sources.md` | PASS |
| 2 | orchestrator | Source integration | worker draft, required refs | `04_Sources.md` | PASS |
