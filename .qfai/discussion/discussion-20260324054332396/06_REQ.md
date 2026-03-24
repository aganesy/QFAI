# 06_REQ

| REQ-ID   | Title                                | Description                                                                                                                               | Source                     | Priority | Status |
| -------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | -------- | ------ |
| REQ-0001 | Design Direction Pack mandatory      | UI-bearing discussion/spec は `Design Direction Pack` を持ち、visual thesis / content plan / interaction thesis / anti-goals を必須とする | SRC-0001,SRC-0002,SRC-0003 | must     | draft  |
| REQ-0002 | Theme fields explicitness            | DDP は theme, mood, taste, material, energy, primary visual anchor を記録する                                                             | SRC-0001,SRC-0002          | must     | draft  |
| REQ-0003 | CTA hierarchy definition             | UI-bearing spec は primary / secondary / tertiary CTA の階層と section job を定義する                                                     | SRC-0001,SRC-0002          | must     | draft  |
| REQ-0004 | Navigation and flow specification    | 画面遷移、導線、error/recovery flow を Mermaid で記録する                                                                                 | SRC-0001,SRC-0004,SRC-0006 | must     | draft  |
| REQ-0005 | Screen mock with direction alignment | HTML+CSS mock は DDP と整合し、desktop/mobile 両方の意図を表現する                                                                        | SRC-0002,SRC-0004          | must     | draft  |
| REQ-0006 | Banned generic patterns              | generic hero card、card mosaic、weak hierarchy、multi-accent clutter 等の禁止パターンを定義する                                           | SRC-0001,SRC-0002          | must     | draft  |
| REQ-0007 | Downstream reading order update      | downstream skills は `Design Direction Pack -> Design Token -> UI Contract -> HTML Mock -> Flow/Navigation` の順で読む                    | SRC-0004,SRC-0006          | must     | draft  |
| REQ-0008 | Render critique loop                 | `/qfai-prototyping` と `/qfai-implement` は rendered UI を desktop/mobile で点検する critique loop を要求する                             | SRC-0001,SRC-0002,SRC-0003 | must     | draft  |
| REQ-0009 | Fidelity scorecard                   | review と evidence は design fidelity scorecard を持ち、visual hierarchy / navigation clarity / accessibility / responsiveness を採点する | SRC-0002,SRC-0003          | must     | draft  |
| REQ-0010 | Tool independence                    | Claude Code / Codex / GitHub Copilot の 3 ターゲットで、Figma 非依存で完結する設計を維持する                                              | SRC-0001,SRC-0003          | must     | draft  |
| REQ-0011 | Breaking change documentation        | 破壊的変更を許容する場合、delta と migration expectation を必ず記録する                                                                   | SRC-0001,SRC-0005          | must     | draft  |
| REQ-0012 | Review gate alignment                | review roster は design coherence と downstream actionability を検査し、FAIL 時は具体的代替案を返す                                       | SRC-0004,SRC-0007          | must     | draft  |

## Work Orders Summary

| Step | Role (sub-agent) | Task title                     | Input (refs)                  | Output (refs)          | Status (PASS/REVISE) |
| ---- | ---------------- | ------------------------------ | ----------------------------- | ---------------------- | -------------------- |
| 1    | researcher       | Requirement signals extraction | `SRC-0001`..`SRC-0007`        | Requirement candidates | PASS                 |
| 2    | orchestrator     | REQ table synthesis            | Requirement candidates, scope | `06_REQ.md`            | PASS                 |
