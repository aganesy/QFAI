# 08_Glossary

| Term                  | Definition                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Design Direction Pack | UI-bearing artifact の最上位設計情報。visual thesis、content plan、interaction thesis、anti-goals、CTA hierarchy を含む。 |
| Visual Thesis         | ムード、素材感、温度感、エネルギーを 1 文で固定する要約。                                                                 |
| Content Plan          | hero / support / detail / CTA など、各 section の役割と順序。                                                             |
| Interaction Thesis    | 画面の印象を変える 2-3 個のモーション方針。                                                                               |
| Anti-goals            | この UI がやってはいけない見た目・構成・雰囲気。                                                                          |
| CTA Hierarchy         | primary / secondary / tertiary action の優先度と配置原則。                                                                |
| Generic Pattern       | 量産型 card-grid、弱い hero、意味のない gradient、過剰 accent など、個性や可読性を損なう構成。                            |
| Render Critique Loop  | first render を見て desktop/mobile で批評し、差分指示で改善する反復。                                                     |
| Fidelity Scorecard    | aesthetic / usability / accessibility / responsiveness を同時に記録するレビュー表。                                       |

## Work Orders Summary

| Step | Role (sub-agent) | Task title             | Input (refs)                     | Output (refs)       | Status (PASS/REVISE) |
| ---- | ---------------- | ---------------------- | -------------------------------- | ------------------- | -------------------- |
| 1    | researcher       | Terminology extraction | `SRC-0002`,`SRC-0003`,`SRC-0004` | Glossary candidates | PASS                 |
| 2    | orchestrator     | Glossary normalization | Glossary candidates              | `08_Glossary.md`    | PASS                 |
