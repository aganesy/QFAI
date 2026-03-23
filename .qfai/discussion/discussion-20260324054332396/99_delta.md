# 99_delta

## Adopted

| Date | Change Type | Summary | Reason | Affected |
| ---- | ----------- | ------- | ------ | -------- |
| 2026-03-24 | Add | `Design Direction Pack` を UI-bearing artifact の必須入力に採用 | theme と hierarchy を downstream へ渡すため | discussion/spec/prototyping/implement |
| 2026-03-24 | Add | `render critique loop` を required に採用 | code-only completion を防ぐため | prototyping/implement/review |
| 2026-03-24 | Add | `fidelity scorecard` を採用 | aesthetic/usability を再現可能に判定するため | review/evidence |
| 2026-03-24 | Drift | breaking envelope を internal artifacts 中心で許容 | user が破壊的変更を許容したため | templates/prompts/contracts/review |

## Rejected

| Date | Option | Reason | Recurrence Prevention |
| ---- | ------ | ------ | --------------------- |
| 2026-03-24 | Figma 必須化 | 3 ターゲット自己完結性を損なう | external tool は optional reference のみにする |
| 2026-03-24 | generic SaaS card-grid default | ユーザー要望と OpenAI guidance に反する | banned pattern として明記する |
| 2026-03-24 | code-only review completion | rendered UI を確認できない | critique loop を required にする |

## Deferred

| Date | Item | Reason | Follow-up |
| ---- | ---- | ------ | --------- |
| 2026-03-24 | full automated VRT/RUM hard gate | 価値は高いが別 capability として設計した方が安全 | `/qfai-sdd` で capability 分割時に再評価 |

## Work Orders Summary

| Step | Role (sub-agent) | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ---------- | ------------ | ------------- | -------------------- |
| 1 | orchestrator | Drift and delta capture | User request, OQ decisions | `99_delta.md` | PASS |
| 2 | reviewer | Drift protocol audit | Delta log | Reviewable delta record | PASS |
