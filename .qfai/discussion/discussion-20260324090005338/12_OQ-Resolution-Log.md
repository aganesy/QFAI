# 12_OQ-Resolution-Log

| Date       | OQ-ID   | Action   | Summary                                                            | Evidence          |
| ---------- | ------- | -------- | ------------------------------------------------------------------ | ----------------- |
| 2026-03-24 | OQ-0001 | resolved | Design Direction Pack を mandatory artifact に採用                 | SRC-0001,SRC-0002 |
| 2026-03-24 | OQ-0002 | resolved | Figma 非依存を原則化し、任意参照のみ許容                           | SRC-0001,SRC-0003 |
| 2026-03-24 | OQ-0003 | resolved | downstream reading order を DDP 先頭に更新                         | SRC-0002,SRC-0006 |
| 2026-03-24 | OQ-0004 | resolved | restrained / premium / cardless-by-default を既定とした            | SRC-0002          |
| 2026-03-24 | OQ-0005 | resolved | render critique loop を required にした                            | SRC-0002,SRC-0003 |
| 2026-03-24 | OQ-0006 | resolved | breaking envelope を internal artifacts 中心に許容                 | SRC-0001,SRC-0005 |
| 2026-03-24 | OQ-0007 | resolved | prose + scorecard の review evidence を採用                        | SRC-0003,SRC-0007 |
| 2026-03-24 | OQ-0008 | deferred | full automated VRT/RUM hard gate は次フェーズ検討に回した          | SRC-0003          |
| 2026-03-24 | OQ-0009 | resolved | Story Workshop + UI Contract 例 + init 展開物を同時刷新と決定      | SRC-0008          |
| 2026-03-24 | OQ-0010 | resolved | REQ-0017 の 6 項目を error 化、その他は config で段階的切替と決定  | SRC-0008          |
| 2026-03-24 | OQ-0011 | resolved | primary screen のみ複数案比較を必須化と決定                        | SRC-0008          |
| 2026-03-24 | OQ-0012 | resolved | v1.6.5 で schema + 手動評価、v1.6.6 で自動化と決定                 | SRC-0008          |
| 2026-03-24 | OQ-0013 | resolved | URL + 参考点/不採用点/翻訳方針を記述形式に採用                     | SRC-0008          |
| 2026-03-24 | OQ-0014 | resolved | uiux セクションは optional、存在時に validator/review が参照と決定 | SRC-0008          |
| 2026-03-24 | OQ-0015 | deferred | ChatGPT Phase 3 施策全件を v1.6.6 以降に deferred                  | SRC-0008          |

## Work Orders Summary

| Step | Role (sub-agent) | Task title          | Input (refs)          | Output (refs)             | Status (PASS/REVISE) |
| ---- | ---------------- | ------------------- | --------------------- | ------------------------- | -------------------- |
| 1    | orchestrator     | Resolution log 更新 | OQ register, SRC-0008 | `12_OQ-Resolution-Log.md` | PASS                 |
