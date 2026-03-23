# 10_Policy

| Policy ID | Policy | Rationale |
| --------- | ------ | --------- |
| POL-01 | UI-bearing feature は Design Direction Pack なしに次工程へ進めない | design intent を推測させないため |
| POL-02 | 「何を作るか」だけでなく「何をやらないか」を anti-goals として記録する | generic UI 防止 |
| POL-03 | rendered UI review を実施し、コード読解のみで完了扱いにしない | 見た目品質は render でしか確認できない |
| POL-04 | aesthetic と usability を分離せず、scorecard で同時評価する | かっこよいが使いにくい状態を防ぐ |
| POL-05 | banned generic patterns を FAIL 可能な形で明文化する | 量産型 UI の拒否 |
| POL-06 | breaking changes を採る場合は採用理由・影響・migration note を残す | drift 管理 |
| POL-07 | 外部デザインツール利用は任意。QFAI の core flow は 3 ターゲットで自己完結する | portability |

## Work Orders Summary

| Step | Role (sub-agent) | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ---------- | ------------ | ------------- | -------------------- |
| 1 | researcher | Policy signal harvest | Official blog, local report | Policy candidates | PASS |
| 2 | orchestrator | Policy selection | Candidates, scope | `10_Policy.md` | PASS |
