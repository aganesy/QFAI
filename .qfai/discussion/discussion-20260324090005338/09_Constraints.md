# 09_Constraints

| Constraint ID | Type | Constraint | Notes |
| ------------- | ---- | ---------- | ----- |
| TC-01 | Technical | QFAI は CLI 製品のまま進める | GUI 追加はスコープ外 |
| TC-02 | Technical | artifact は text-first / git-friendly で管理する | markdown / yaml / html / css / mermaid |
| TC-03 | Technical | Mermaid は ` ```mermaid ` フェンスのみ許可 | existing rule |
| TC-04 | Technical | Figma / Sketch など外部デザインツールは必須依存にしない | 3 ターゲット完結優先 |
| TC-05 | Technical | Research-to-Constraint 変換は contracts/design/*.yaml に出力する | BP/AP rule DB のフォーマット統一 |
| TC-06 | Technical | UI Contract schema 拡張は既存フィールドと後方互換を保つ | 新フィールドは optional start で段階的に required へ |
| TC-07 | Technical | Anti-pattern validator は静的・半静的検出のみ（runtime 不要） | v1.6.5 スコープ |
| OC-01 | Operational | review roster をフル実行する | append-only review pack |
| OC-02 | Operational | rendered UI critique は desktop/mobile の両方を扱う | code-only completion 不可 |
| OC-03 | Operational | 複数案比較は primary screen のみ必須とする | 全画面に強制しない |
| OC-04 | Operational | 競合/参考 UI は URL またはスクリーンショットで記録する | 入手不能な場合は理由を記載 |
| BC-01 | Business | v1.6.5 では design quality 向上を最優先する | aesthetics + usability |
| BC-02 | Business | breaking changes は delta と migration expectation を伴う | user approved envelope |
| BC-03 | Business | generic UI 排除を品質ゲートとして位置づける | presence gate から quality gate への転換 |
| LC-01 | Legal/quality | a11y baseline は WCAG 相当の考慮を含む | contrast / keyboard / focus |

## Work Orders Summary

| Step | Role (sub-agent) | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ---------- | ------------ | ------------- | -------------------- |
| 1 | researcher | ChatGPT レポート制約抽出 | SRC-0008 | 追加制約候補 | PASS |
| 2 | orchestrator | Constraints 統合 | Prior Constraints + 追加候補 | `09_Constraints.md` | PASS |
