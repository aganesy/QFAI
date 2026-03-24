# 08_Glossary

| Term                        | Definition                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Design Direction Pack       | UI-bearing artifact の最上位設計情報。visual thesis、content plan、interaction thesis、anti-goals、CTA hierarchy を含む。            |
| Visual Thesis               | ムード、素材感、温度感、エネルギーを 1 文で固定する要約。                                                                            |
| Content Plan                | hero / support / detail / CTA など、各 section の役割と順序。                                                                        |
| Interaction Thesis          | 画面の印象を変える 2-3 個のモーション方針。                                                                                          |
| Anti-goals                  | この UI がやってはいけない見た目・構成・雰囲気。                                                                                     |
| CTA Hierarchy               | primary / secondary / tertiary action の優先度と配置原則。                                                                           |
| Generic Pattern             | 量産型 card-grid、弱い hero、意味のない gradient、過剰 accent など、個性や可読性を損なう構成。                                       |
| Render Critique Loop        | first render を見て desktop/mobile で批評し、差分指示で改善する反復。                                                                |
| Fidelity Scorecard          | aesthetic / usability / accessibility / responsiveness を同時に記録するレビュー表。                                                  |
| Research-to-Constraint 変換 | Research Summary の知見を contracts/design の BP/AP rule DB へ変換し、downstream の拘束条件にするプロセス。                          |
| taskFidelity                | uiFidelity の拡張。DOM 充足だけでなく、タスク完遂に必要な CTA 可視性・step 数・状態表現を評価する指標。                              |
| 高忠実度テンプレート        | Story Workshop の Screen Mock テンプレートで、page objective、CTA hierarchy、states、情報密度 rationale 等を必須項目として含むもの。 |
| 体験仕様                    | UI Contract を要素台帳から拡張し、purpose / primary_user_task / states / max_primary_steps を含めた体験設計の SSOT。                 |
| Quality Profile             | qfai.config.yaml で宣言するプロジェクト固有の UI/UX 方針。b2b-dense / consumer / mobile-first 等のプリセット。                       |
| max_primary_steps           | primary task を完遂するための最大許容ステップ数。デフォルト 3。                                                                      |
| BP/AP Rule DB               | contracts/design 配下に配置するベストプラクティス/アンチパターンの実データ YAML。schema だけでなく実ルールを持つ。                   |

## Work Orders Summary

| Step | Role (sub-agent) | Task title               | Input (refs)              | Output (refs)    | Status (PASS/REVISE) |
| ---- | ---------------- | ------------------------ | ------------------------- | ---------------- | -------------------- |
| 1    | researcher       | ChatGPT レポート用語抽出 | SRC-0008                  | 追加用語候補     | PASS                 |
| 2    | orchestrator     | Glossary 統合            | Prior Glossary + 追加候補 | `08_Glossary.md` | PASS                 |
