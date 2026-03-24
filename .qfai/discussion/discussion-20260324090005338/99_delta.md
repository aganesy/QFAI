# 99_delta

## Adopted

| Date | Change Type | Summary | Reason | Affected |
| ---- | ----------- | ------- | ------ | -------- |
| 2026-03-24 | Add | `Design Direction Pack` を UI-bearing artifact の必須入力に採用 | theme と hierarchy を downstream へ渡すため | discussion/spec/prototyping/implement |
| 2026-03-24 | Add | `render critique loop` を required に採用 | code-only completion を防ぐため | prototyping/implement/review |
| 2026-03-24 | Add | `fidelity scorecard` を採用 | aesthetic/usability を再現可能に判定するため | review/evidence |
| 2026-03-24 | Drift | breaking envelope を internal artifacts 中心で許容 | user が破壊的変更を許容したため | templates/prompts/contracts/review |
| 2026-03-24 | Add | ChatGPT 分析レポート (SRC-0008) の知見を統合 | generic UI 発生の構造的原因を根本対策するため | REQ-0013..REQ-0021, NFR-0009..NFR-0013 |
| 2026-03-24 | Add | Research-to-Constraint 変換を必須化 (REQ-0013) | 調査結果が discussion に閉じる問題を解消 | discussion/contracts/design |
| 2026-03-24 | Add | Story Workshop テンプレート高忠実度化 (REQ-0014) | 上流テンプレートが下流 UI 品質の上限を決めるため | discussion/templates |
| 2026-03-24 | Add | UI Contract 体験仕様拡張 (REQ-0015) | 要素台帳から体験仕様への進化 | contracts/ui |
| 2026-03-24 | Add | taskFidelity 評価 (REQ-0016) | DOM 充足だけではタスク完遂評価ができないため | prototyping/evidence |
| 2026-03-24 | Add | Warning→Error ゲート昇格 (REQ-0017) | presence gate から quality gate への転換 | validators |
| 2026-03-24 | Add | Anti-pattern 検出バリデータ (REQ-0018) | generic UI pattern の自動検出 | validators |
| 2026-03-24 | Add | qfai.config.yaml uiux policy (REQ-0019) | プロジェクト固有の UI/UX 方針を宣言可能にする | config |
| 2026-03-24 | Add | 複数案比較の必須化 (REQ-0020) | AI の最安解固定化を防ぐ | discussion/prototyping |
| 2026-03-24 | Add | 競合/参考 UI の必須化 (REQ-0021) | 抽象的ベストプラクティスだけで generic UI を作るのを防ぐ | discussion |

## Rejected

| Date | Option | Reason | Recurrence Prevention |
| ---- | ------ | ------ | --------------------- |
| 2026-03-24 | Figma 必須化 | 3 ターゲット自己完結性を損なう | external tool は optional reference のみにする |
| 2026-03-24 | generic SaaS card-grid default | ユーザー要望と OpenAI guidance に反する | banned pattern として明記する |
| 2026-03-24 | code-only review completion | rendered UI を確認できない | critique loop を required にする |
| 2026-03-24 | 全 warning 一斉 error 化 | 既存プロジェクトが壊れるリスクが高い | 主要 6 項目のみ error 化し、その他は config で段階的切替 |
| 2026-03-24 | 全画面で複数案比較必須 | 工数が過大になる | primary screen のみ必須とし、その他は推奨 |

## Deferred

| Date | Item | Reason | Follow-up |
| ---- | ---- | ------ | --------- |
| 2026-03-24 | full automated VRT/RUM hard gate | 価値は高いが別 capability として設計した方が安全 | `/qfai-sdd` で capability 分割時に再評価 |
| 2026-03-24 | Phase 3 施策 (visual regression, click path metrics, scorecard 化, multi-proposal scoring) | v1.6.5 は Phase 1 + 2 に集中し、Phase 3 は設計安定後 | v1.6.6 planning 開始時に再評価 |

## Work Orders Summary

| Step | Role (sub-agent) | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ---------- | ------------ | ------------- | -------------------- |
| 1 | orchestrator | Delta 統合 | Prior delta, ChatGPT 統合判断 | `99_delta.md` | PASS |
