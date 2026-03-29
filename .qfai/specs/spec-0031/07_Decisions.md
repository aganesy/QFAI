# 07 Decisions

## Decisions

| DEC-ID      | Title                                     | Adopted Option                                            | Source  | Rationale                                                                                                                                                                               |
| ----------- | ----------------------------------------- | --------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SD-0031-001 | Premium path as separate skill, not flag  | Separate `/qfai-prototyping-full-harness` skill           | DR-0077 | Standard path と premium path の完全分離により NFR-0005 (<1% regression) を構造的に担保する。flag 方式は条件分岐の複雑化と標準 path への意図しない影響を招く                            |
| SD-0031-002 | Critique semantics excluded from validate | Critique は evaluator phase 内のみ; validate command 不変 | DR-0078 | Critique adapter (spec-0029) の fail-open semantics は validate の deterministic 検証と相容れない。critique は premium evaluator の scoring 補助であり、validate gate に混入させない    |
| SD-0031-003 | Default max 15 iterations                 | Configurable range 5-15, default 15                       | DR-0073 | 15 は convergence opportunity を最大化しつつ resource 消費に上限を設ける実用的バランス点。5 下限は最低限の refinement cycle を保証。range 制約は暴走ループと過小 iteration の両方を防止 |

## Rejected Options

| DEC-ID      | Rejected Option                           | Reason                                                                                             |
| ----------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| SD-0031-001 | Premium mode を `--premium` flag で有効化 | Standard path の条件分岐が増え NFR-0005 の regression risk が高まる。code review burden も増大する |
| SD-0031-001 | Configuration file で premium 有効化      | 暗黙的な有効化は REQ-0011 (explicit opt-in) に違反。意図しない premium 実行のリスクがある          |
| SD-0031-002 | Critique 結果を validate gate に統合      | Critique は non-deterministic (provider 依存, fail-open)。validate の deterministic 保証を破壊する |
| SD-0031-003 | Iteration cap なし (無制限)               | Resource 消費の上限がなくなり NFR-0001 違反。暴走ループのリスクが制御不能になる                    |
| SD-0031-003 | Fixed 10 iterations (非 configurable)     | プロジェクト特性による必要 iteration 数の差異に対応できない。柔軟性が不足する                      |
