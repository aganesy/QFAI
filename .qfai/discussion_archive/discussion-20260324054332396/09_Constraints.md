# 09_Constraints

| Constraint ID | Type          | Constraint                                                | Notes                                  |
| ------------- | ------------- | --------------------------------------------------------- | -------------------------------------- |
| TC-01         | Technical     | QFAI は CLI 製品のまま進める                              | GUI 追加はスコープ外                   |
| TC-02         | Technical     | artifact は text-first / git-friendly で管理する          | markdown / yaml / html / css / mermaid |
| TC-03         | Technical     | Mermaid は ` ```mermaid ` フェンスのみ許可                | existing rule                          |
| TC-04         | Technical     | Figma / Sketch など外部デザインツールは必須依存にしない   | 3 ターゲット完結優先                   |
| OC-01         | Operational   | review roster をフル実行する                              | append-only review pack                |
| OC-02         | Operational   | rendered UI critique は desktop/mobile の両方を扱う       | code-only completion 不可              |
| BC-01         | Business      | v1.6.5 では design quality 向上を最優先する               | aesthetics + usability                 |
| BC-02         | Business      | breaking changes は delta と migration expectation を伴う | user approved envelope                 |
| LC-01         | Legal/quality | a11y baseline は WCAG 相当の考慮を含む                    | contrast / keyboard / focus            |

## Work Orders Summary

| Step | Role (sub-agent) | Task title              | Input (refs)             | Output (refs)         | Status (PASS/REVISE) |
| ---- | ---------------- | ----------------------- | ------------------------ | --------------------- | -------------------- |
| 1    | researcher       | Constraint extraction   | User request, repo rules | Constraint candidates | PASS                 |
| 2    | orchestrator     | Constraint finalization | Candidates, SSOT         | `09_Constraints.md`   | PASS                 |
