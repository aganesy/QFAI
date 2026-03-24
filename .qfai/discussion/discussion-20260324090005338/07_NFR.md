# 07_NFR

| NFR-ID | Category | Title | Target | Measurement | Source | Priority |
| ------ | -------- | ----- | ------ | ----------- | ------ | -------- |
| NFR-0001 | usability | Direction completeness | UI-bearing artifact の DDP 必須項目充足率 100% | checklist | SRC-0001,SRC-0002 | must |
| NFR-0002 | maintainability | Traceability | theme -> mock -> flow -> review scorecard の追跡率 100% | traceability audit | SRC-0004,SRC-0006 | must |
| NFR-0003 | usability | Responsiveness | representative desktop/mobile viewport で major layout break 0 | rendered review | SRC-0002,SRC-0003 | must |
| NFR-0004 | accessibility | Core a11y baseline | contrast, keyboard path, focus visibility の必須項目 PASS | scorecard + validate | SRC-0003,SRC-0007 | must |
| NFR-0005 | quality | Generic pattern rejection | banned generic pattern violations 0 | reviewer finding count | SRC-0002 | must |
| NFR-0006 | portability | Agent portability | Claude Code / Codex / GitHub Copilot の 3 ターゲットで hard dependency 0 | artifact audit | SRC-0001,SRC-0003 | must |
| NFR-0007 | reproducibility | Review reproducibility | 同一 artifact に同一 rubric を適用した結果差分 0 | rerun review sample | SRC-0002,SRC-0007 | should |
| NFR-0008 | operability | Breaking change hygiene | breaking item 100% が delta / migration note を持つ | delta audit | SRC-0001,SRC-0005 | must |
| NFR-0009 | usability | Task completion efficiency | primary task の step count ≤ max_primary_steps（デフォルト 3） | taskFidelity evidence | SRC-0008 | must |
| NFR-0010 | quality | Anti-pattern detection coverage | critical anti-pattern の自動検出カバー率 100% | validator test suite | SRC-0008 | must |
| NFR-0011 | maintainability | Research-to-constraint conversion | 採用 BP/AP の contracts/design 反映率 100% | contract audit | SRC-0008 | must |
| NFR-0012 | usability | State matrix completeness | UI Contract で定義された states の実装率 100%（empty/loading/error/populated） | prototype evidence | SRC-0008 | must |
| NFR-0013 | quality | Template fidelity | Story Workshop Screen Mock が高忠実度テンプレ必須項目を 100% 充足 | template checklist | SRC-0008 | must |

## Work Orders Summary

| Step | Role (sub-agent) | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ---------- | ------------ | ------------- | -------------------- |
| 1 | researcher | ChatGPT レポート NFR 抽出 | SRC-0008 | 追加 NFR 候補 | PASS |
| 2 | orchestrator | NFR 統合 | Prior NFR + 追加候補 | `07_NFR.md` | PASS |
