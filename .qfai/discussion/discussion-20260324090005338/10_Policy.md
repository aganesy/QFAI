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
| POL-08 | Research Summary の知見は discussion 内に閉じさせず、contracts/design の BP/AP rule DB に変換して downstream 拘束条件にする | generic UI の自由推論余地を減らす |
| POL-09 | Story Workshop テンプレートは高忠実度を前提にし、単純な title/paragraph/button では完了としない | 上流入力の品質が下流の UI 品質上限を決めるため |
| POL-10 | UI/UX 品質に関する主要 warning は error に昇格し、低品質 UI を止める | presence-biased gate から quality-biased gate への転換 |
| POL-11 | primary screen は最低 2 案を提示し、比較に基づいて選定する | AI の最安解固定化を防ぐ |
| POL-12 | AI の validator 通過のための最小コスト戦略（label/marker を置くだけ）を anti-pattern として扱う | ChatGPT 分析レポートの構造的知見 |

## Work Orders Summary

| Step | Role (sub-agent) | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ---------- | ------------ | ------------- | -------------------- |
| 1 | researcher | ChatGPT レポートポリシー抽出 | SRC-0008 | 追加ポリシー候補 | PASS |
| 2 | orchestrator | Policy 統合 | Prior Policy + 追加候補 | `10_Policy.md` | PASS |
